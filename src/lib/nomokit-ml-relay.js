// Bridges the nested nomokit-ml iframe's postMessage protocol to the desktop
// bundled-Python IPC (window.nomoproDesktopPython). No-op if not in desktop.
//
// Message envelope contract (owned by nomokit-ml -- do not rename these):
//   iframe -> parent: nomokit-ml:hello, nomokit-ml:py-start, nomokit-ml:py-send, nomokit-ml:py-stop
//   parent -> iframe: nomokit-ml:desktop-ready, nomokit-ml:py-message, nomokit-ml:py-stderr, nomokit-ml:py-exit
//
// NOTE on the desktop API surface: `window.nomoproDesktopPython.startPersistent(source, handlers)`
// (returning a run handle with `.writeStdin()`/`.stop()`) and `.getVersion()` are the *intended*
// preload shape this relay targets. As of writing, the real `nomopro-desktop/preload.js` instead
// exposes a single-process `runPythonCode`/`writeStdin`/`stopPythonCode` triple with no per-session
// run handle, no run ids, and no `getVersion`. A separate task normalizes the preload to add a
// `startPersistent`-style wrapper -- once that lands, re-check the method names below still match.
// Until then this relay degrades gracefully (see the `startPersistent` guard in `py-start` below and
// the `getVersion` guard in `resolvePythonVersion`) instead of throwing when running against today's
// real preload.
const NS = 'nomokit-ml:';

const resolvePythonVersion = async py => {
    if (!py || typeof py.getVersion !== 'function') return null;
    try {
        return await py.getVersion();
    } catch (_) {
        return null;
    }
};

const startNomokitMlRelay = () => {
    const py = window.nomoproDesktopPython;
    const sessions = new Map(); // id -> run handle

    const listener = async event => {
        const data = event.data;
        if (!data || typeof data.type !== 'string' || !data.type.startsWith(NS)) return;
        const source = event.source; // the iframe's contentWindow
        const reply = msg => source && source.postMessage(msg, '*');

        if (data.type === `${NS}hello`) {
            reply({
                type: `${NS}desktop-ready`,
                capabilities: {
                    available: Boolean(py),
                    pythonVersion: await resolvePythonVersion(py),
                    engines: py ? ['browser', 'python'] : ['browser'],
                    canTrainYolo: false // Phase 2
                }
            });
            return;
        }

        if (!py) return; // web mode: ignore py-* messages, there is no desktop bridge to relay to

        if (data.type === `${NS}py-start`) {
            if (typeof py.startPersistent !== 'function') {
                // The real preload doesn't have a persistent-session wrapper yet -- fail the
                // session explicitly instead of throwing, so the iframe's onExit fires.
                reply({
                    type: `${NS}py-stderr`,
                    id: data.id,
                    line: 'Desktop Python bridge does not support persistent sessions yet.'
                });
                reply({type: `${NS}py-exit`, id: data.id, code: 1});
                return;
            }
            const run = py.startPersistent(data.source, {
                onStdout: line => {
                    try {
                        reply({type: `${NS}py-message`, id: data.id, msg: JSON.parse(line)});
                    } catch (_) {
                        // Non-JSON stdout line: nothing in the ML protocol is waiting on it.
                    }
                },
                onStderr: line => reply({type: `${NS}py-stderr`, id: data.id, line}),
                onExit: code => {
                    sessions.delete(data.id);
                    reply({type: `${NS}py-exit`, id: data.id, code});
                }
            });
            sessions.set(data.id, run);
            // Send the init payload as the first stdin line.
            run.writeStdin(`${JSON.stringify(data.initPayload)}\n`);
        } else if (data.type === `${NS}py-send`) {
            const run = sessions.get(data.id);
            if (run) run.writeStdin(`${JSON.stringify(data.msg)}\n`);
        } else if (data.type === `${NS}py-stop`) {
            const run = sessions.get(data.id);
            if (run) run.stop();
            sessions.delete(data.id);
        }
    };

    window.addEventListener('message', listener);

    // Returned so callers (and tests) can tear the relay down; GUI mounts it once for the app's
    // lifetime today and doesn't call this, but exposing it costs nothing and avoids leaking a
    // listener if that ever changes.
    return () => window.removeEventListener('message', listener);
};

export {startNomokitMlRelay};
