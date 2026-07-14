import {startNomokitMlRelay} from '../../../src/lib/nomokit-ml-relay';

// Minimal fake window.postMessage target standing in for the ML iframe's contentWindow.
const createFakeIframeWindow = () => ({
    postMessage: jest.fn()
});

const dispatchFromIframe = (data, source) => {
    window.dispatchEvent(new MessageEvent('message', {data, source}));
};

// The listener is async and may await several microtasks in a row (pip.list(), then
// safeInstall.classify()/pip.install() per missing package). Flush a generous number of
// microtask turns rather than guessing the exact count, mirroring how the hello tests
// above flush past `resolvePythonVersion`'s single await.
const flushPromises = async (turns = 10) => {
    for (let i = 0; i < turns; i++) {
        await Promise.resolve();
    }
};

describe('nomokit-ml-relay', () => {
    let stopRelay;

    afterEach(() => {
        if (stopRelay) stopRelay();
        stopRelay = null;
        delete window.nomoproDesktopPython;
        delete window.electronAPI;
        jest.clearAllMocks();
    });

    test('ignores messages that are not nomokit-ml:* envelopes', () => {
        stopRelay = startNomokitMlRelay();
        const iframeWindow = createFakeIframeWindow();

        dispatchFromIframe({type: 'some-other-message'}, iframeWindow);
        dispatchFromIframe('not-an-object', iframeWindow);
        dispatchFromIframe(null, iframeWindow);

        expect(iframeWindow.postMessage).not.toHaveBeenCalled();
    });

    test('replies to hello with unavailable capabilities in web mode (no desktop bridge)', async () => {
        delete window.nomoproDesktopPython;
        stopRelay = startNomokitMlRelay();
        const iframeWindow = createFakeIframeWindow();

        dispatchFromIframe({type: 'nomokit-ml:hello'}, iframeWindow);
        // the hello handler awaits resolvePythonVersion before replying
        await Promise.resolve();
        await Promise.resolve();

        expect(iframeWindow.postMessage).toHaveBeenCalledWith(
            {
                type: 'nomokit-ml:desktop-ready',
                capabilities: {
                    available: false,
                    pythonVersion: null,
                    engines: ['browser'],
                    canTrainYolo: false
                }
            },
            '*'
        );
    });

    test('replies to hello with available capabilities when the desktop bridge is present', async () => {
        window.nomoproDesktopPython = {};
        stopRelay = startNomokitMlRelay();
        const iframeWindow = createFakeIframeWindow();

        dispatchFromIframe({type: 'nomokit-ml:hello'}, iframeWindow);
        await Promise.resolve();
        await Promise.resolve();

        expect(iframeWindow.postMessage).toHaveBeenCalledWith(
            {
                type: 'nomokit-ml:desktop-ready',
                capabilities: {
                    available: true,
                    pythonVersion: null,
                    engines: ['browser', 'python'],
                    canTrainYolo: false
                }
            },
            '*'
        );
    });

    test('ignores py-start/py-send/py-stop in web mode (no desktop bridge)', () => {
        delete window.nomoproDesktopPython;
        stopRelay = startNomokitMlRelay();
        const iframeWindow = createFakeIframeWindow();

        dispatchFromIframe({type: 'nomokit-ml:py-start', id: 's1', source: 'print(1)', initPayload: {}}, iframeWindow);
        dispatchFromIframe({type: 'nomokit-ml:py-send', id: 's1', msg: {cmd: 'predict'}}, iframeWindow);
        dispatchFromIframe({type: 'nomokit-ml:py-stop', id: 's1'}, iframeWindow);

        expect(iframeWindow.postMessage).not.toHaveBeenCalled();
    });

    test('py-start starts a persistent session and forwards the init payload as the first stdin line', () => {
        const writeStdin = jest.fn();
        const startPersistent = jest.fn(() => ({writeStdin, stop: jest.fn()}));
        window.nomoproDesktopPython = {startPersistent};
        stopRelay = startNomokitMlRelay();
        const iframeWindow = createFakeIframeWindow();

        dispatchFromIframe(
            {type: 'nomokit-ml:py-start', id: 's1', source: 'print(1)', initPayload: {a: 1}},
            iframeWindow
        );

        expect(startPersistent).toHaveBeenCalledWith('print(1)', expect.objectContaining({
            onStdout: expect.any(Function),
            onStderr: expect.any(Function),
            onExit: expect.any(Function)
        }));
        expect(writeStdin).toHaveBeenCalledWith(`${JSON.stringify({a: 1})}\n`);
    });

    test('py-start relays onStdout/onStderr/onExit callbacks back to the iframe with the session id', () => {
        let handlers;
        const startPersistent = jest.fn((source, h) => {
            handlers = h;
            return {writeStdin: jest.fn(), stop: jest.fn()};
        });
        window.nomoproDesktopPython = {startPersistent};
        stopRelay = startNomokitMlRelay();
        const iframeWindow = createFakeIframeWindow();

        dispatchFromIframe(
            {type: 'nomokit-ml:py-start', id: 's1', source: 'print(1)', initPayload: {}},
            iframeWindow
        );

        handlers.onStdout(JSON.stringify({event: 'epoch', epoch: 1}));
        handlers.onStderr('warning: something');
        handlers.onExit(0);

        expect(iframeWindow.postMessage).toHaveBeenCalledWith(
            {type: 'nomokit-ml:py-message', id: 's1', msg: {event: 'epoch', epoch: 1}},
            '*'
        );
        expect(iframeWindow.postMessage).toHaveBeenCalledWith(
            {type: 'nomokit-ml:py-stderr', id: 's1', line: 'warning: something'},
            '*'
        );
        expect(iframeWindow.postMessage).toHaveBeenCalledWith(
            {type: 'nomokit-ml:py-exit', id: 's1', code: 0},
            '*'
        );
    });

    test('py-start degrades gracefully (py-stderr + py-exit) when startPersistent is unavailable', () => {
        // Mirrors today's real preload.js, which has no startPersistent wrapper yet.
        window.nomoproDesktopPython = {runPythonCode: jest.fn()};
        stopRelay = startNomokitMlRelay();
        const iframeWindow = createFakeIframeWindow();

        dispatchFromIframe(
            {type: 'nomokit-ml:py-start', id: 's1', source: 'print(1)', initPayload: {}},
            iframeWindow
        );

        expect(iframeWindow.postMessage).toHaveBeenCalledWith(
            expect.objectContaining({type: 'nomokit-ml:py-stderr', id: 's1'}),
            '*'
        );
        expect(iframeWindow.postMessage).toHaveBeenCalledWith(
            {type: 'nomokit-ml:py-exit', id: 's1', code: 1},
            '*'
        );
    });

    test('py-send writes to the matching session only; unknown ids are silently dropped', () => {
        const writeStdinA = jest.fn();
        const writeStdinB = jest.fn();
        let call = 0;
        const startPersistent = jest.fn(() => {
            call += 1;
            return {writeStdin: call === 1 ? writeStdinA : writeStdinB, stop: jest.fn()};
        });
        window.nomoproDesktopPython = {startPersistent};
        stopRelay = startNomokitMlRelay();
        const iframeWindow = createFakeIframeWindow();

        dispatchFromIframe({type: 'nomokit-ml:py-start', id: 'a', source: '', initPayload: {}}, iframeWindow);
        dispatchFromIframe({type: 'nomokit-ml:py-start', id: 'b', source: '', initPayload: {}}, iframeWindow);
        writeStdinA.mockClear();
        writeStdinB.mockClear();

        dispatchFromIframe({type: 'nomokit-ml:py-send', id: 'b', msg: {cmd: 'predict'}}, iframeWindow);
        dispatchFromIframe({type: 'nomokit-ml:py-send', id: 'unknown-session'}, iframeWindow);

        expect(writeStdinA).not.toHaveBeenCalled();
        expect(writeStdinB).toHaveBeenCalledWith(`${JSON.stringify({cmd: 'predict'})}\n`);
    });

    test('py-stop stops the session and removes it, so a later py-send is a no-op', () => {
        const stop = jest.fn();
        const writeStdin = jest.fn();
        const startPersistent = jest.fn(() => ({writeStdin, stop}));
        window.nomoproDesktopPython = {startPersistent};
        stopRelay = startNomokitMlRelay();
        const iframeWindow = createFakeIframeWindow();

        dispatchFromIframe({type: 'nomokit-ml:py-start', id: 's1', source: '', initPayload: {}}, iframeWindow);
        writeStdin.mockClear();

        dispatchFromIframe({type: 'nomokit-ml:py-stop', id: 's1'}, iframeWindow);
        expect(stop).toHaveBeenCalled();

        dispatchFromIframe({type: 'nomokit-ml:py-send', id: 's1', msg: {cmd: 'predict'}}, iframeWindow);
        expect(writeStdin).not.toHaveBeenCalled();
    });

    test('hello reports canTrainYolo true when ultralytics is already installed', async () => {
        window.electronAPI = {
            pip: {list: () => Promise.resolve({packages: [{name: 'ultralytics'}]})}
        };
        stopRelay = startNomokitMlRelay();
        const iframeWindow = createFakeIframeWindow();

        dispatchFromIframe({type: 'nomokit-ml:hello'}, iframeWindow);
        await flushPromises();

        expect(iframeWindow.postMessage).toHaveBeenCalledWith(
            expect.objectContaining({
                type: 'nomokit-ml:desktop-ready',
                capabilities: expect.objectContaining({canTrainYolo: true})
            }),
            '*'
        );
    });

    test('hello reports canTrainYolo false when the pip bridge lookup fails', async () => {
        window.electronAPI = {
            pip: {list: () => Promise.reject(new Error('boom'))}
        };
        stopRelay = startNomokitMlRelay();
        const iframeWindow = createFakeIframeWindow();

        dispatchFromIframe({type: 'nomokit-ml:hello'}, iframeWindow);
        await flushPromises();

        expect(iframeWindow.postMessage).toHaveBeenCalledWith(
            expect.objectContaining({
                capabilities: expect.objectContaining({canTrainYolo: false})
            }),
            '*'
        );
    });

    describe('pip-ensure', () => {
        test('installs only the missing packages and replies pip-done with ok: true', async () => {
            const install = jest.fn(() => Promise.resolve({success: true}));
            window.electronAPI = {
                pip: {list: () => Promise.resolve({packages: [{name: 'onnxruntime'}]}), install},
                safeInstall: {
                    classify: () => Promise.resolve({
                        success: true,
                        classification: {level: 'safe', reason: 'Known pure-Python package'}
                    })
                }
            };
            stopRelay = startNomokitMlRelay();
            const iframeWindow = createFakeIframeWindow();

            dispatchFromIframe(
                {type: 'nomokit-ml:pip-ensure', id: 'X', packages: ['onnxruntime', 'ultralytics']},
                iframeWindow
            );
            await flushPromises();

            expect(install).toHaveBeenCalledTimes(1);
            // The real preload's install(packageName, options) takes a bare STRING as its first
            // argument (nomopro-desktop/preload.js:152) -- not an object. Asserting the object
            // shape here would ratify the bug this test guards against.
            expect(install).toHaveBeenCalledWith('ultralytics');
            expect(iframeWindow.postMessage).toHaveBeenCalledWith(
                expect.objectContaining({type: 'nomokit-ml:pip-done', id: 'X', ok: true}),
                '*'
            );
        });

        test('replies pip-done ok: true with no installs when all packages are already present', async () => {
            const install = jest.fn();
            window.electronAPI = {
                pip: {list: () => Promise.resolve({packages: [{name: 'onnxruntime'}, {name: 'ultralytics'}]}), install}
            };
            stopRelay = startNomokitMlRelay();
            const iframeWindow = createFakeIframeWindow();

            dispatchFromIframe(
                {type: 'nomokit-ml:pip-ensure', id: 'X', packages: ['onnxruntime', 'ultralytics']},
                iframeWindow
            );
            await flushPromises();

            expect(install).not.toHaveBeenCalled();
            expect(iframeWindow.postMessage).toHaveBeenCalledWith(
                expect.objectContaining({type: 'nomokit-ml:pip-done', id: 'X', ok: true}),
                '*'
            );
        });

        test('emits a pip-progress line per package being installed, in order', async () => {
            const install = jest.fn(() => Promise.resolve({success: true}));
            window.electronAPI = {
                pip: {list: () => Promise.resolve({packages: []}), install}
            };
            stopRelay = startNomokitMlRelay();
            const iframeWindow = createFakeIframeWindow();

            dispatchFromIframe(
                {type: 'nomokit-ml:pip-ensure', id: 'X', packages: ['onnxruntime', 'ultralytics']},
                iframeWindow
            );
            await flushPromises();

            const progressCalls = iframeWindow.postMessage.mock.calls
                .map(call => call[0])
                .filter(msg => msg.type === 'nomokit-ml:pip-progress')
                .map(msg => msg.package);

            expect(progressCalls).toEqual(['onnxruntime', 'ultralytics']);
        });

        test('surfaces a risky classification as a pip-progress warning and still installs', async () => {
            const install = jest.fn(() => Promise.resolve({success: true}));
            const classify = jest.fn(() => Promise.resolve({
                success: true,
                classification: {level: 'risky', reason: 'Package requires native extension build (compiler/toolchain)'}
            }));
            window.electronAPI = {
                pip: {list: () => Promise.resolve({packages: []}), install},
                safeInstall: {classify}
            };
            stopRelay = startNomokitMlRelay();
            const iframeWindow = createFakeIframeWindow();

            dispatchFromIframe(
                {type: 'nomokit-ml:pip-ensure', id: 'X', packages: ['ultralytics']},
                iframeWindow
            );
            await flushPromises();

            expect(classify).toHaveBeenCalledWith('ultralytics');
            expect(iframeWindow.postMessage).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'nomokit-ml:pip-progress',
                    package: 'ultralytics',
                    line: expect.stringContaining('risky')
                }),
                '*'
            );
            expect(install).toHaveBeenCalledWith('ultralytics');
            expect(iframeWindow.postMessage).toHaveBeenCalledWith(
                expect.objectContaining({type: 'nomokit-ml:pip-done', id: 'X', ok: true}),
                '*'
            );
        });

        test('surfaces an unknown classification as a pip-progress warning and still installs', async () => {
            const install = jest.fn(() => Promise.resolve({success: true}));
            const classify = jest.fn(() => Promise.resolve({
                success: true,
                classification: {level: 'unknown', reason: 'Unknown package type - could require native build tools'}
            }));
            window.electronAPI = {
                pip: {list: () => Promise.resolve({packages: []}), install},
                safeInstall: {classify}
            };
            stopRelay = startNomokitMlRelay();
            const iframeWindow = createFakeIframeWindow();

            dispatchFromIframe(
                {type: 'nomokit-ml:pip-ensure', id: 'X', packages: ['ultralytics']},
                iframeWindow
            );
            await flushPromises();

            expect(iframeWindow.postMessage).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'nomokit-ml:pip-progress',
                    package: 'ultralytics',
                    line: expect.stringContaining('unknown')
                }),
                '*'
            );
            expect(install).toHaveBeenCalledWith('ultralytics');
        });

        test('a blocked classification is NOT installed; replies pip-done ok: false with the reason', async () => {
            const install = jest.fn();
            const blockedReason = "Package 'torch-nightly' is not compatible with embedded Python runtime";
            const classify = jest.fn(() => Promise.resolve({
                success: true,
                classification: {level: 'blocked', reason: blockedReason}
            }));
            window.electronAPI = {
                pip: {list: () => Promise.resolve({packages: []}), install},
                safeInstall: {classify}
            };
            stopRelay = startNomokitMlRelay();
            const iframeWindow = createFakeIframeWindow();

            dispatchFromIframe(
                {type: 'nomokit-ml:pip-ensure', id: 'X', packages: ['torch-nightly']},
                iframeWindow
            );
            await flushPromises();

            expect(install).not.toHaveBeenCalled();
            expect(iframeWindow.postMessage).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'nomokit-ml:pip-done',
                    id: 'X',
                    ok: false,
                    error: blockedReason
                }),
                '*'
            );
        });

        test('a failing classify call is best-effort and does not block the install', async () => {
            const install = jest.fn(() => Promise.resolve({success: true}));
            const classify = jest.fn(() => Promise.reject(new Error('classify unavailable')));
            window.electronAPI = {
                pip: {list: () => Promise.resolve({packages: []}), install},
                safeInstall: {classify}
            };
            stopRelay = startNomokitMlRelay();
            const iframeWindow = createFakeIframeWindow();

            dispatchFromIframe(
                {type: 'nomokit-ml:pip-ensure', id: 'X', packages: ['ultralytics']},
                iframeWindow
            );
            await flushPromises();

            expect(install).toHaveBeenCalledWith('ultralytics');
            expect(iframeWindow.postMessage).toHaveBeenCalledWith(
                expect.objectContaining({type: 'nomokit-ml:pip-done', id: 'X', ok: true}),
                '*'
            );
        });

        test('replies pip-done ok: false with the install error and stops at the first failure', async () => {
            const install = jest.fn(pkg => {
                if (pkg === 'onnxruntime') {
                    return Promise.resolve({success: false, error: 'disk full'});
                }
                return Promise.resolve({success: true});
            });
            window.electronAPI = {
                pip: {list: () => Promise.resolve({packages: []}), install}
            };
            stopRelay = startNomokitMlRelay();
            const iframeWindow = createFakeIframeWindow();

            dispatchFromIframe(
                {type: 'nomokit-ml:pip-ensure', id: 'X', packages: ['onnxruntime', 'ultralytics']},
                iframeWindow
            );
            await flushPromises();

            expect(install).toHaveBeenCalledTimes(1);
            expect(iframeWindow.postMessage).toHaveBeenCalledWith(
                {type: 'nomokit-ml:pip-done', id: 'X', ok: false, error: 'disk full'},
                '*'
            );
        });

        test('replies pip-done ok: false without throwing when electronAPI is unavailable (web mode)', async () => {
            delete window.electronAPI;
            stopRelay = startNomokitMlRelay();
            const iframeWindow = createFakeIframeWindow();

            dispatchFromIframe(
                {type: 'nomokit-ml:pip-ensure', id: 'X', packages: ['onnxruntime']},
                iframeWindow
            );
            await flushPromises();

            expect(iframeWindow.postMessage).toHaveBeenCalledWith(
                expect.objectContaining({type: 'nomokit-ml:pip-done', id: 'X', ok: false}),
                '*'
            );
        });

        test('replies pip-done ok: false when pip.list rejects', async () => {
            window.electronAPI = {
                pip: {
                    list: () => Promise.reject(new Error('ipc down')),
                    install: jest.fn()
                }
            };
            stopRelay = startNomokitMlRelay();
            const iframeWindow = createFakeIframeWindow();

            dispatchFromIframe(
                {type: 'nomokit-ml:pip-ensure', id: 'X', packages: ['onnxruntime']},
                iframeWindow
            );
            await flushPromises();

            expect(iframeWindow.postMessage).toHaveBeenCalledWith(
                {type: 'nomokit-ml:pip-done', id: 'X', ok: false, error: 'ipc down'},
                '*'
            );
        });

        test('pip-ensure works without the Python session bridge (nomoproDesktopPython absent)', async () => {
            delete window.nomoproDesktopPython;
            const install = jest.fn(() => Promise.resolve({success: true}));
            window.electronAPI = {
                pip: {list: () => Promise.resolve({packages: []}), install}
            };
            stopRelay = startNomokitMlRelay();
            const iframeWindow = createFakeIframeWindow();

            dispatchFromIframe(
                {type: 'nomokit-ml:pip-ensure', id: 'X', packages: ['onnxruntime']},
                iframeWindow
            );
            await flushPromises();

            expect(install).toHaveBeenCalledWith('onnxruntime');
            expect(iframeWindow.postMessage).toHaveBeenCalledWith(
                expect.objectContaining({type: 'nomokit-ml:pip-done', id: 'X', ok: true}),
                '*'
            );
        });
    });
});
