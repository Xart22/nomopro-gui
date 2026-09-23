import {createNomokitMlInferenceClient, PROTOCOL_VERSION} from '../../../src/lib/nomokit-ml-inference';
import {startNomokitMlRelay} from '../../../src/lib/nomokit-ml-relay';
import {nomokitMlOrigin, resolveApiBase} from '../../../src/lib/nomokit-ml-url';
import log from '../../../src/lib/log';

// minilog writes through console.log even for warn(), so spying on console.warn catches nothing.
jest.mock('../../../src/lib/log', () => ({warn: jest.fn(), info: jest.fn(), error: jest.fn()}));

// The jsdom pinned by this project predates MessageChannel, which every browser and Electron
// version the GUI actually ships on has had for years. Stand in with a minimal DOM-shaped pair:
// postMessage/onmessage/start/close, delivery deferred to a later task so ordering matches the
// real thing. Transfer lists are accepted and ignored -- nothing here asserts on detachment, and
// the one test that cares about buffer reuse checks the *source* array instead.
if (typeof global.MessageChannel === 'undefined') {
    class FakeMessagePort {
        constructor () {
            this.onmessage = null;
            this._peer = null;
            this._started = false;
            this._queue = [];
            this._closed = false;
        }
        start () {
            this._started = true;
            const queued = this._queue.splice(0);
            queued.forEach(data => this._deliver(data));
        }
        close () {
            this._closed = true;
        }
        postMessage (data) {
            if (this._closed || !this._peer) return;
            const peer = this._peer;
            setTimeout(() => peer._receive(data), 0);
        }
        _receive (data) {
            if (this._closed) return;
            // A port that has not been start()ed queues rather than drops, as the spec requires.
            if (!this._started && !this.onmessage) {
                this._queue.push(data);
                return;
            }
            this._deliver(data);
        }
        _deliver (data) {
            if (this.onmessage) this.onmessage({data});
        }
    }
    global.MessageChannel = class {
        constructor () {
            this.port1 = new FakeMessagePort();
            this.port2 = new FakeMessagePort();
            this.port1._peer = this.port2;
            this.port2._peer = this.port1;
        }
    };
}

// Same story as MessageChannel: this jsdom has no ImageData, which the client constructs when it
// copies a video frame. Only the three fields the client touches are needed.
if (typeof global.ImageData === 'undefined') {
    global.ImageData = class {
        constructor (data, width, height) {
            this.data = data;
            this.width = width;
            this.height = height;
        }
    };
}

// An absolute base sidesteps jsdom's `about:blank` document URL, against which every relative URL
// fails to resolve. Production always has a real base (the blade tag in web, an app-path file://
// URL in desktop), so pinning one here exercises the real code path rather than the throw.
const WEB_BASE = 'https://nomo-kit.com/assets/nomopro/nomokit-ml/';

const iframeWindow = {postMessage: jest.fn()};

const dispatchFromIframe = (data, source, origin) => {
    window.dispatchEvent(new MessageEvent('message', {
        data,
        source,
        origin: typeof origin === 'undefined' ? 'https://nomo-kit.com' : origin
    }));
};

// The relay hands port1 to the client and port2 to the iframe. In a real page the iframe is a
// separate document; here we keep port2 and drive it by hand to stand in for the inference host.
const connectRelay = ({source = iframeWindow} = {}) => {
    let clientPort = null;
    let meta = null;
    const stopRelay = startNomokitMlRelay({
        getHostWindow: () => iframeWindow,
        onInferencePort: (port, portMeta) => {
            clientPort = port;
            meta = portMeta;
        }
    });
    dispatchFromIframe(
        {type: 'nomokit-ml:inf-ready', protocolVersion: PROTOCOL_VERSION, modalities: ['image']},
        source
    );
    const call = iframeWindow.postMessage.mock.calls.find(
        c => c[0] && c[0].type === 'nomokit-ml:inf-connect'
    );
    return {stopRelay, clientPort, meta, connectCall: call, hostPort: call && call[2] && call[2][0]};
};

describe('nomokit-ml inference channel', () => {
    let stopRelay = null;

    beforeEach(() => {
        iframeWindow.postMessage.mockReset();
        log.warn.mockReset();
        window.__NOMOKIT_ML_BASE__ = WEB_BASE;
        delete window.__NOMOKIT_API_BASE__;
    });

    afterEach(() => {
        if (stopRelay) stopRelay();
        stopRelay = null;
        delete window.__NOMOKIT_ML_BASE__;
    });

    describe('url resolution', () => {
        test('derives the iframe origin from the configured base', () => {
            expect(nomokitMlOrigin()).toBe('https://nomo-kit.com');
        });

        test('reports no knowable origin under file://, where every document is opaque', () => {
            window.__NOMOKIT_ML_BASE__ = 'file:///Applications/NomoPro.app/src/gui/nomokit-ml/';
            // null means "cannot check the origin" -- callers must fall back to source identity.
            expect(nomokitMlOrigin()).toBeNull();
        });

        test('api base stays relative on a same-origin host', () => {
            expect(resolveApiBase()).toBe('');
        });
    });

    describe('handshake', () => {
        test('answers inf-ready with inf-connect, a port, and the protocol version', () => {
            const connected = connectRelay();
            stopRelay = connected.stopRelay;

            expect(connected.connectCall).toBeDefined();
            expect(connected.connectCall[0]).toEqual(expect.objectContaining({
                type: 'nomokit-ml:inf-connect',
                protocolVersion: PROTOCOL_VERSION
            }));
            // Replied to the real origin, not '*', now that one is knowable.
            expect(connected.connectCall[1]).toBe('https://nomo-kit.com');
            expect(connected.connectCall[2]).toHaveLength(1);
            expect(connected.clientPort).not.toBeNull();
            expect(connected.meta.protocolVersion).toBe(PROTOCOL_VERSION);
        });

        test('ignores an inf-ready from a window that is not the ML iframe', () => {
            const impostor = {postMessage: jest.fn()};
            const connected = connectRelay({source: impostor});
            stopRelay = connected.stopRelay;

            expect(connected.clientPort).toBeNull();
            expect(impostor.postMessage).not.toHaveBeenCalled();
            expect(iframeWindow.postMessage).not.toHaveBeenCalled();
        });

        test('does not disturb the python/pip path', () => {
            const connected = connectRelay();
            stopRelay = connected.stopRelay;
            iframeWindow.postMessage.mockReset();

            dispatchFromIframe({type: 'nomokit-ml:hello'}, iframeWindow);

            const helloReply = iframeWindow.postMessage.mock.calls.find(
                c => c[0] && c[0].type === 'nomokit-ml:desktop-ready'
            );
            expect(helloReply).toBeDefined();
        });
    });

    describe('client', () => {
        test('reports not-ready, rather than throwing, before a port arrives', async () => {
            const client = createNomokitMlInferenceClient();
            expect(client.isReady()).toBe(false);

            const res = await client.ping();
            expect(res.ok).toBe(false);
            expect(res.error.code).toBe('not-connected');
        });

        test('round-trips a request over the port', async () => {
            const client = createNomokitMlInferenceClient();
            const channel = new MessageChannel();
            client.attach(channel.port1, {protocolVersion: PROTOCOL_VERSION});

            channel.port2.onmessage = event => {
                channel.port2.postMessage({id: event.data.id, ok: true, result: {pong: true}});
            };
            channel.port2.start();

            const res = await client.ping();
            expect(res).toEqual({ok: true, result: {pong: true}});
            client.dispose();
        });

        test('surfaces a host-reported failure as ok:false rather than rejecting', async () => {
            const client = createNomokitMlInferenceClient();
            const channel = new MessageChannel();
            client.attach(channel.port1, {protocolVersion: PROTOCOL_VERSION});
            channel.port2.onmessage = event => {
                channel.port2.postMessage({
                    id: event.data.id,
                    ok: false,
                    error: {code: 'no-model', message: 'nope'}
                });
            };
            channel.port2.start();

            const res = await client.loadModel({kind: 'handoff'});
            expect(res.ok).toBe(false);
            expect(res.error.code).toBe('no-model');
            client.dispose();
        });

        test('copies the frame so the video provider\'s reused buffer is never detached', async () => {
            const client = createNomokitMlInferenceClient();
            const channel = new MessageChannel();
            client.attach(channel.port1, {protocolVersion: PROTOCOL_VERSION});

            let received = null;
            channel.port2.onmessage = event => {
                received = event.data;
                channel.port2.postMessage({id: event.data.id, ok: true, result: {predictions: []}});
            };
            channel.port2.start();

            // getFrame hands back an ImageData it caches and reuses; transferring its buffer
            // directly would detach the array the provider still intends to draw into.
            const shared = new ImageData(new Uint8ClampedArray(2 * 2 * 4), 2, 2);
            shared.data[0] = 42;

            await client.classify('s1', shared);

            expect(shared.data.length).toBe(16); // still usable: not detached
            expect(shared.data[0]).toBe(42);
            expect(received.frame.width).toBe(2);
            client.dispose();
        });

        test('fails in-flight requests when the iframe reloads and reattaches', async () => {
            const client = createNomokitMlInferenceClient();
            const first = new MessageChannel();
            client.attach(first.port1, {protocolVersion: PROTOCOL_VERSION});
            // Nothing answers on `first`, standing in for a document that went away mid-request.
            const pending = client.ping();

            const second = new MessageChannel();
            client.attach(second.port1, {protocolVersion: PROTOCOL_VERSION});

            const res = await pending;
            expect(res.ok).toBe(false);
            expect(res.error.code).toBe('reconnected');
            client.dispose();
        });

        // The stale-bundle case: openblock-gui bakes a copy of nomokit-ml's dist into its own
        // build, so redeploying one without the other is easy, and the only symptom is every block
        // silently doing nothing. This warning is the thread back to the cause.
        test('warns when the embedded build speaks a different protocol version', () => {
            const client = createNomokitMlInferenceClient();
            const channel = new MessageChannel();

            client.attach(channel.port1, {protocolVersion: PROTOCOL_VERSION + 1});

            expect(log.warn).toHaveBeenCalled();
            expect(log.warn.mock.calls.map(c => c.join(' ')).join('\n')).toMatch(/protocol mismatch/i);
            client.dispose();
        });

        test('delivers unsolicited pushes to subscribers', () => {
            const client = createNomokitMlInferenceClient();
            const channel = new MessageChannel();
            client.attach(channel.port1, {protocolVersion: PROTOCOL_VERSION});

            const seen = [];
            const unsubscribe = client.onPush(msg => seen.push(msg));

            return new Promise(resolve => {
                channel.port2.postMessage({
                    type: 'push',
                    sessionId: 's1',
                    kind: 'audio',
                    predictions: [{classId: 'c1', name: 'clap', confidence: 0.9}]
                });
                setTimeout(() => {
                    expect(seen).toHaveLength(1);
                    expect(seen[0].predictions[0].name).toBe('clap');
                    unsubscribe();
                    client.dispose();
                    resolve();
                }, 0);
            });
        });

        test('is inert after dispose', async () => {
            const client = createNomokitMlInferenceClient();
            const channel = new MessageChannel();
            client.attach(channel.port1, {protocolVersion: PROTOCOL_VERSION});
            client.dispose();

            expect(client.isReady()).toBe(false);
            const res = await client.ping();
            expect(res.error.code).toBe('disposed');
        });
    });
});
