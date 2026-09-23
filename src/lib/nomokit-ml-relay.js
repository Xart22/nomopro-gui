// Bridges the nested nomokit-ml iframe's postMessage protocol to the desktop
// bundled-Python IPC (window.nomoproDesktopPython) and the desktop pip IPC
// (window.electronAPI.pip). The python/pip half is a no-op if not in desktop;
// the inference handshake below works in web and desktop alike.
//
// Message envelope contract (owned by nomokit-ml -- do not rename these):
//   iframe -> parent: nomokit-ml:hello, nomokit-ml:py-start, nomokit-ml:py-send, nomokit-ml:py-stop,
//                      nomokit-ml:pip-ensure, nomokit-ml:pip-check, nomokit-ml:inf-ready
//   parent -> iframe: nomokit-ml:desktop-ready, nomokit-ml:py-message, nomokit-ml:py-stderr,
//                      nomokit-ml:py-exit, nomokit-ml:pip-progress, nomokit-ml:pip-done,
//                      nomokit-ml:pip-check-result, nomokit-ml:inf-connect
import log from './log';
import {nomokitMlOrigin, resolveApiBase} from './nomokit-ml-url';
import {PROTOCOL_VERSION} from './nomokit-ml-inference';

const NS = 'nomokit-ml:';

const resolvePythonVersion = async py => {
    if (!py || typeof py.getVersion !== 'function') return null;
    try {
        return await py.getVersion();
    } catch (_) {
        return null;
    }
};

// True iff `ultralytics` (the YOLO training package, which drags in a large torch
// download) is already installed. Informational only -- it tells the UI an install
// step will be needed before training; it must never block training from starting.
const isYoloInstalled = async () => {
    const api = window.electronAPI;
    if (!api || !api.pip || typeof api.pip.list !== 'function') return false;
    try {
        const res = await api.pip.list();
        return (res.packages || []).some(p => p.name === 'ultralytics');
    } catch (_) {
        return false;
    }
};

const startNomokitMlRelay = ({getHostWindow = null, onInferencePort = null} = {}) => {
    const py = window.nomoproDesktopPython;
    const sessions = new Map(); // id -> run handle
    let warnedAboutOrigin = false;

    // Identity, not origin, is the load-bearing check. Under file:// -- which is how
    // nomopro-desktop loads the GUI -- every document has an opaque origin that serializes to the
    // string "null", so comparing origins there rejects nothing and would break every desktop
    // python session if enforced. Comparing event.source against the iframe we actually mounted is
    // both stronger and protocol-agnostic. Callers that cannot supply the handle (tests, older
    // call sites) get the previous permissive behaviour.
    const isFromHost = event => {
        if (!getHostWindow) return true;
        const host = getHostWindow();
        return !host || event.source === host;
    };

    // Warn-only for now. Flipping this to a reject is Phase 6, once we have a release of field
    // data confirming no legitimate host trips it.
    const checkOrigin = event => {
        const expected = nomokitMlOrigin();
        if (!expected || event.origin === expected || event.origin === 'null') return;
        if (!warnedAboutOrigin) {
            warnedAboutOrigin = true;
            log.warn(`[nomokit-ml-relay] unexpected origin ${event.origin}, expected ${expected}`);
        }
    };

    const listener = async event => {
        const data = event.data;
        if (!data || typeof data.type !== 'string' || !data.type.startsWith(NS)) return;
        if (!isFromHost(event)) return;
        checkOrigin(event);
        const source = event.source; // the iframe's contentWindow
        const replyOrigin = nomokitMlOrigin() || '*';
        const reply = msg => source && source.postMessage(msg, replyOrigin);

        // Inference handshake. Deliberately separate from `hello`: that one is posted at module-eval
        // time in nomokit-ml and its reply is merged into a capabilities store, so attaching a
        // transferable to it would change an existing contract and break older iframe builds. This
        // pair is purely additive -- an old relay ignores inf-ready and the iframe stays inert, and
        // a new relay that never sees one simply has no inference client.
        if (data.type === `${NS}inf-ready`) {
            if (!onInferencePort) return;
            const channel = new MessageChannel();
            onInferencePort(channel.port1, {
                protocolVersion: data.protocolVersion,
                modalities: data.modalities || []
            });
            if (source) {
                source.postMessage(
                    {type: `${NS}inf-connect`, protocolVersion: PROTOCOL_VERSION, apiBase: resolveApiBase()},
                    replyOrigin,
                    [channel.port2]
                );
            }
            return;
        }

        if (data.type === `${NS}hello`) {
            // Answer immediately. `available` and `engines` are knowable synchronously,
            // and the iframe abandons the handshake after a fixed deadline (see
            // initDesktopBridge in nomokit-ml's src/lib/desktop/bridge.js). Awaiting the
            // probes below before replying -- getVersion() and pip.list() each spawn a
            // blocking subprocess in the desktop main process -- loses that race on slow
            // hardware, and the iframe then reports "not desktop" and disables every
            // desktop-only adapter. pythonVersion/canTrainYolo are informational, so they
            // must never gate `available`.
            const available = Boolean(py);
            const engines = py ? ['browser', 'python'] : ['browser'];
            reply({
                type: `${NS}desktop-ready`,
                capabilities: {available, pythonVersion: null, engines, canTrainYolo: false}
            });
            // Refine with the slow fields once they resolve; the iframe merges any later
            // desktop-ready over the first. Both probes swallow their own errors, so this
            // chain settles even when the desktop bridges are missing or broken.
            Promise.all([resolvePythonVersion(py), isYoloInstalled()])
                .then(([pythonVersion, canTrainYolo]) => {
                    reply({
                        type: `${NS}desktop-ready`,
                        capabilities: {available, pythonVersion, engines, canTrainYolo}
                    });
                })
                .catch(() => {
                    // Nothing to refine -- the immediate reply above already stands.
                });
            return;
        }

        if (data.type === `${NS}pip-check`) {
            const api = window.electronAPI;
            const requested = data.packages || [];
            const replyResult = (packages) => reply({type: `${NS}pip-check-result`, id: data.id, packages});
            if (!api || !api.pip || typeof api.pip.list !== 'function') {
                replyResult(requested.map(name => ({name, installed: false})));
                return;
            }
            try {
                const listRes = await api.pip.list();
                const installed = new Set((listRes.packages || []).map(p => p.name));
                replyResult(requested.map(name => ({name, installed: installed.has(name)})));
            } catch (_) {
                replyResult(requested.map(name => ({name, installed: false})));
            }
            return;
        }

        if (data.type === `${NS}pip-ensure`) {
            const api = window.electronAPI;
            const done = (ok, error) => reply({type: `${NS}pip-done`, id: data.id, ok, error});
            if (!api || !api.pip || typeof api.pip.list !== 'function' || typeof api.pip.install !== 'function') {
                done(false, 'Desktop pip bridge unavailable.');
                return;
            }
            let unsubscribeProgress = null;
            if (typeof api.pip.onProgress === 'function') {
                unsubscribeProgress = api.pip.onProgress(evt => {
                    if (evt && evt.type === 'install-output' && evt.data) {
                        reply({type: `${NS}pip-progress`, id: data.id, package: null, line: String(evt.data).trim()});
                    }
                });
            }
            try {
                const listRes = await api.pip.list();
                const installed = new Set((listRes.packages || []).map(p => p.name));
                const missing = (data.packages || []).filter(pkg => !installed.has(pkg));
                for (const pkg of missing) {
                    // classify() returns {success, classification: {level, reason}} -- see
                    // nomopro-desktop's src/main/safe-install.js. `level` is one of
                    // safe | risky | blocked | unknown. This step is best-effort: if classify
                    // itself throws, log/ignore and proceed with the install -- a classify
                    // outage must not block a legitimate install.
                    let level = null;
                    let reason = null;
                    if (api.safeInstall && typeof api.safeInstall.classify === 'function') {
                        try {
                            const classifyRes = await api.safeInstall.classify(pkg);
                            if (classifyRes && classifyRes.classification) {
                                level = classifyRes.classification.level;
                                reason = classifyRes.classification.reason;
                            }
                        } catch (_) {
                            // classify is best-effort: a failure here must not block the install.
                        }
                    }
                    if (level === 'blocked') {
                        done(false, reason || `${pkg} is blocked and cannot be installed.`);
                        return;
                    }
                    if (level === 'risky' || level === 'unknown') {
                        reply({
                            type: `${NS}pip-progress`,
                            id: data.id,
                            package: pkg,
                            line: `Warning: ${pkg} is classified as ${level} risk.`
                        });
                    }
                    reply({type: `${NS}pip-progress`, id: data.id, package: pkg, line: `Installing ${pkg}...`});
                    const res = await api.pip.install(pkg);
                    if (!res || res.success === false) {
                        done(false, (res && res.error) || `Failed to install ${pkg}`);
                        return;
                    }
                }
                done(true);
            } catch (err) {
                done(false, err && err.message ? err.message : String(err));
            } finally {
                if (unsubscribeProgress) unsubscribeProgress();
            }
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
