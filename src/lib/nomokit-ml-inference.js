import log from './log';

// Client for the nomokit-ml inference host. The trained model never leaves the nomokit-ml iframe:
// that document owns tfjs, the backbone weights and the head model, so inference runs there and
// this side only ships frames in and reads labels out. See the "why the iframe" notes in
// nomokit-ml-relay.js for the reasoning.
//
// Traffic rides a MessagePort rather than the window message bus that the python/pip relay uses.
// The port is a capability: it is handed to exactly one frame during the handshake and cannot be
// observed by any other frame on the page, so webcam frames are never broadcast and never need a
// '*' targetOrigin.

const PROTOCOL_VERSION = 1;

const DEFAULT_TIMEOUT_MS = 15 * 1000;
// A cold load pulls a backbone off disk or the network -- MobileNet alone is ~17MB -- so this has
// to be generous. It still has to be finite: a wedged iframe must surface as a failed block rather
// than a promise that never settles and a request map that grows forever.
const LOAD_MODEL_TIMEOUT_MS = 60 * 1000;

const timeoutFor = type => (type === 'load-model' ? LOAD_MODEL_TIMEOUT_MS : DEFAULT_TIMEOUT_MS);

const err = (code, message) => ({ok: false, error: {code, message}});

const createNomokitMlInferenceClient = () => {
    let port = null;
    let nextId = 1;
    let disposed = false;
    const pending = new Map(); // id -> {resolve, timer}
    const pushHandlers = new Set();
    const eventHandlers = new Set();

    const settle = (id, value) => {
        const entry = pending.get(id);
        if (!entry) return;
        pending.delete(id);
        clearTimeout(entry.timer);
        entry.resolve(value);
    };

    const failAllPending = (code, message) => {
        for (const id of Array.from(pending.keys())) {
            settle(id, err(code, message));
        }
    };

    const onPortMessage = event => {
        const data = event.data;
        if (!data) return;
        if (typeof data.id !== 'undefined' && pending.has(data.id)) {
            settle(data.id, data.ok ?
                {ok: true, result: data.result} :
                {ok: false, error: data.error || {code: 'unknown', message: 'Inference host reported a failure.'}});
            return;
        }
        if (data.type === 'push') {
            for (const fn of pushHandlers) {
                try {
                    fn(data);
                } catch (e) {
                    log.warn('[nomokit-ml] push handler threw', e);
                }
            }
            return;
        }
        if (data.type === 'event') {
            for (const fn of eventHandlers) {
                try {
                    fn(data);
                } catch (e) {
                    log.warn('[nomokit-ml] event handler threw', e);
                }
            }
        }
    };

    // Requests never reject. Every caller here is a Scratch block, and the VM convention (see
    // tm2scratch) is that a model operation logs and carries on rather than throwing into the
    // sequencer. Callers branch on `ok` instead.
    const request = (type, payload = {}, transfer) => {
        if (disposed) return Promise.resolve(err('disposed', 'Inference client was disposed.'));
        if (!port) return Promise.resolve(err('not-connected', 'NomoKit ML is not ready yet.'));
        const id = nextId++;
        return new Promise(resolve => {
            const timer = setTimeout(() => {
                pending.delete(id);
                resolve(err('timeout', `NomoKit ML did not answer "${type}" in time.`));
            }, timeoutFor(type));
            pending.set(id, {resolve, timer});
            try {
                port.postMessage(Object.assign({id, type}, payload), transfer || []);
            } catch (e) {
                pending.delete(id);
                clearTimeout(timer);
                resolve(err('post-failed', e && e.message ? e.message : String(e)));
            }
        });
    };

    return {
        // Called by the relay once the iframe announces itself. Anything still in flight belonged
        // to the previous document (an iframe reload, or a src change) and can never be answered,
        // so fail it rather than leave those promises hanging.
        attach (newPort, meta) {
            if (disposed) return;
            if (port) {
                failAllPending('reconnected', 'The NomoKit ML window reloaded.');
                try {
                    port.close();
                } catch (_) {
                    // Already closed with the old document; nothing to do.
                }
            }
            if (meta && meta.protocolVersion !== PROTOCOL_VERSION) {
                // Almost always a stale bundle: openblock-gui's build bakes a copy of nomokit-ml's
                // dist into its output, so refreshing one without the other leaves a GUI talking to
                // an iframe that does not understand it. The symptom is every block silently doing
                // nothing, which is near-impossible to diagnose without this line.
                log.warn(
                    `[nomokit-ml] protocol mismatch: GUI speaks v${PROTOCOL_VERSION}, ` +
                    `the embedded nomokit-ml build speaks v${meta.protocolVersion}. ` +
                    'Rebuild and redeploy nomokit-ml into this GUI.'
                );
            }
            port = newPort;
            port.onmessage = onPortMessage;
            port.start();
        },
        detach () {
            failAllPending('disconnected', 'The NomoKit ML window went away.');
            if (port) {
                port.onmessage = null;
                try {
                    port.close();
                } catch (_) {
                    // Nothing to do.
                }
            }
            port = null;
        },
        dispose () {
            this.detach();
            disposed = true;
            pushHandlers.clear();
            eventHandlers.clear();
        },
        isReady: () => Boolean(port) && !disposed,
        ping: () => request('ping'),
        loadModel: source => request('load-model', {source}),
        unloadModel: sessionId => request('unload-model', {sessionId}),
        listModels: () => request('list-models'),
        audioStart: sessionId => request('audio-start', {sessionId}),
        audioStop: sessionId => request('audio-stop', {sessionId}),

        // `frame` comes from runtime.ioDevices.video.getFrame, which hands back an ImageData it
        // caches and reuses for subsequent calls. Transferring its buffer would detach the array
        // the video provider still intends to reuse, so copy first and transfer the copy -- that
        // keeps the hop zero-copy without corrupting the provider's cache.
        classify (sessionId, frame) {
            if (!frame || !frame.data) {
                return Promise.resolve(err('no-frame', 'No video frame available.'));
            }
            let copy;
            try {
                copy = new ImageData(new Uint8ClampedArray(frame.data), frame.width, frame.height);
            } catch (e) {
                return Promise.resolve(err('frame-copy-failed', e && e.message ? e.message : String(e)));
            }
            return request('classify', {sessionId, frame: copy}, [copy.data.buffer]);
        },

        // Fire-and-forget: tells the host the trainer UI is on screen so it can release the mic and
        // camera the student is about to use for recording samples.
        setActive (visible) {
            if (!port || disposed) return;
            try {
                port.postMessage({type: 'set-active', visible: Boolean(visible)});
            } catch (_) {
                // A dead port just means nothing is listening; there is nothing to recover.
            }
        },

        onPush (fn) {
            pushHandlers.add(fn);
            return () => pushHandlers.delete(fn);
        },
        onEvent (fn) {
            eventHandlers.add(fn);
            return () => eventHandlers.delete(fn);
        }
    };
};

export {createNomokitMlInferenceClient, PROTOCOL_VERSION};
