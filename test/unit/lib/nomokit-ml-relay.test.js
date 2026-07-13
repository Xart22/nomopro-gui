import {startNomokitMlRelay} from '../../../src/lib/nomokit-ml-relay';

// Minimal fake window.postMessage target standing in for the ML iframe's contentWindow.
const createFakeIframeWindow = () => ({
    postMessage: jest.fn()
});

const dispatchFromIframe = (data, source) => {
    window.dispatchEvent(new MessageEvent('message', {data, source}));
};

describe('nomokit-ml-relay', () => {
    let stopRelay;

    afterEach(() => {
        if (stopRelay) stopRelay();
        stopRelay = null;
        delete window.nomoproDesktopPython;
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
});
