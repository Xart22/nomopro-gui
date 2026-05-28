import {parseNdjsonCommandLine} from './ndjson-command-parser';

const PYODIDE_VERSION = '0.26.4';
const PYODIDE_INDEX_URL = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;
const PYODIDE_CDN_SCRIPT = `${PYODIDE_INDEX_URL}pyodide.js`;
const SDK_DEFAULT_URL = '/static/python/nomoproSDKPython.py';
const DEFAULT_EXECUTION_TIMEOUT_MS = 5000;

let pyodideInstance = null;
let initPromise = null;

const normalizeText = value =>
    (typeof value === 'string' ? value : String(value || ''));

const resolveSdkUrl = sdkUrl => {
    const candidate = sdkUrl || SDK_DEFAULT_URL;

    if (typeof window === 'undefined') return candidate;

    try {
        return new URL(candidate, window.location.href).toString();
    } catch (error) {
        return candidate;
    }
};

const buildWorkerScript = () => `
let pyodideInstance = null;
let initPromise = null;

const loadPyodideRuntime = async (scriptUrl, indexUrl) => {
    if (pyodideInstance) return pyodideInstance;
    if (initPromise) return initPromise;

    initPromise = (async () => {
        if (typeof self.loadPyodide !== 'function') {
            self.importScripts(scriptUrl);
        }
        const pyodide = await self.loadPyodide({
            indexURL: indexUrl,
            stdout: (text) => self.postMessage({type: 'stdout', chunk: String(text) + '\\n'}),
            stderr: (text) => self.postMessage({type: 'stderr', chunk: String(text)})
        });
        pyodideInstance = pyodide;
        return pyodide;
    })();

    return initPromise;
};

const runJob = async (payload) => {
    try {
        const pyodide = await loadPyodideRuntime(payload.pyodideScriptUrl, payload.pyodideIndexUrl);
        const response = await fetch(payload.sdkUrl, {cache: 'no-store'});
        if (!response.ok) {
            throw new Error('Failed to load SDK from ' + payload.sdkUrl + ' (status ' + response.status + ')');
        }
        const sdkCode = await response.text();

        pyodide.FS.writeFile('nomoproSDKPython.py', sdkCode, {encoding: 'utf8'});

        await pyodide.runPythonAsync(payload.code);
        self.postMessage({type: 'done', exitCode: 0, error: null});
    } catch (error) {
        self.postMessage({
            type: 'done',
            exitCode: 1,
            error: error && error.message ? error.message : String(error)
        });
    }
};

self.onmessage = (event) => {
    const data = event.data || {};
    if (data.type === 'run') {
        runJob(data.payload);
    }
};
`;

function loadScript () {
    return new Promise((resolve, reject) => {
        if (typeof window.loadPyodide === 'function') {
            resolve();
            return;
        }
        const existing = document.querySelector(
            `script[src="${PYODIDE_CDN_SCRIPT}"]`,
        );
        if (existing) {
            existing.addEventListener('load', resolve);
            existing.addEventListener('error', reject);
            return;
        }
        const script = document.createElement('script');
        script.src = PYODIDE_CDN_SCRIPT;
        script.onload = resolve;
        script.onerror = () =>
            reject(new Error('Failed to load Pyodide from CDN.'));
        document.head.appendChild(script);
    });
}

export async function getPyodide () {
    if (pyodideInstance) return pyodideInstance;
    if (initPromise) return initPromise;

    initPromise = loadScript()
        .then(() => window.loadPyodide({indexURL: PYODIDE_INDEX_URL}))
        .then(pyodide => {
            pyodideInstance = pyodide;
            return pyodide;
        });

    return initPromise;
}

const processStdoutChunk = ({
    chunk,
    state,
    onStdoutLine,
    onCommand,
    commands
}) => {
    state.stdoutBuffer += normalizeText(chunk);
    const lines = state.stdoutBuffer.split(/\r?\n/);
    state.stdoutBuffer = lines.pop() || '';

    lines.forEach(line => {
        if (onStdoutLine) onStdoutLine(line);
        const parsed = parseNdjsonCommandLine(line);
        if (!parsed.length || !onCommand) return;
        parsed.forEach(command => {
            commands.push(command);
            onCommand(command);
        });
    });
};

const flushStdoutRemainder = ({state, onStdoutLine, onCommand, commands}) => {
    if (!state.stdoutBuffer) return;
    const line = state.stdoutBuffer;
    state.stdoutBuffer = '';

    if (onStdoutLine) onStdoutLine(line);
    const parsed = parseNdjsonCommandLine(line);
    if (!parsed.length || !onCommand) return;
    parsed.forEach(command => {
        commands.push(command);
        onCommand(command);
    });
};

const withTimeout = (promise, timeoutMs, timeoutMessage) => {
    if (!(timeoutMs > 0)) return promise;

    let timeoutId;
    const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
            reject(new Error(timeoutMessage));
        }, timeoutMs);
    });

    return Promise.race([promise, timeoutPromise]).finally(() => {
        clearTimeout(timeoutId);
    });
};

const runInMainThread = async ({
    code,
    sdkUrl,
    onStdoutLine,
    onStderr,
    onCommand
}) => {
    const pyodide = await getPyodide();
    const response = await fetch(sdkUrl, {cache: 'no-store'});
    if (!response.ok) {
        throw new Error(
            `Failed to load SDK from ${sdkUrl} (status ${response.status}).`,
        );
    }
    const sdkCode = await response.text();

    pyodide.FS.writeFile('nomoproSDKPython.py', sdkCode, {encoding: 'utf8'});

    pyodide.runPython(`
import sys, io
sys.stdout = io.StringIO()
sys.stderr = io.StringIO()
`);

    let exitCode = 0;
    let error = null;

    try {
        await pyodide.runPythonAsync(code);
    } catch (err) {
        exitCode = 1;
        error = err && err.message ? err.message : String(err);
    }

    const stdout = normalizeText(pyodide.runPython('sys.stdout.getvalue()'));
    const stderr = normalizeText(pyodide.runPython('sys.stderr.getvalue()'));

    const commands = [];
    const lines = stdout.split(/\r?\n/).filter(line => line.length > 0);
    lines.forEach(line => {
        if (onStdoutLine) onStdoutLine(line);
        const parsed = parseNdjsonCommandLine(line);
        if (!parsed.length || !onCommand) return;
        parsed.forEach(command => {
            commands.push(command);
            onCommand(command);
        });
    });

    if (stderr && onStderr) onStderr(stderr);
    if (error && onStderr) onStderr(error);

    return {
        exitCode,
        signal: null,
        stdout,
        stderr: error ? `${stderr}\n${error}`.trim() : stderr,
        commands,
        error
    };
};

export const createPyodideRunner = (options = {}) => {
    const sdkUrl = resolveSdkUrl(options.sdkUrl);
    const onStdoutLine = options.onStdoutLine;
    const onStderr = options.onStderr;
    const onCommand = options.onCommand;
    const executionTimeoutMs =
        typeof options.executionTimeoutMs === 'number' ?
            options.executionTimeoutMs :
            DEFAULT_EXECUTION_TIMEOUT_MS;

    const state = {
        activeWorker: null,
        activeReject: null,
        stdoutBuffer: '',
        activeTimeoutId: null
    };

    const clearActiveTimeout = () => {
        if (state.activeTimeoutId) {
            clearTimeout(state.activeTimeoutId);
            state.activeTimeoutId = null;
        }
    };

    const stop = () => {
        clearActiveTimeout();
        if (state.activeWorker) {
            state.activeWorker.terminate();
            state.activeWorker = null;
        }
        if (state.activeReject) {
            state.activeReject(new Error('Pyodide execution stopped.'));
            state.activeReject = null;
        }
    };

    const runWithWorker = code =>
        new Promise((resolve, reject) => {
            const commands = [];
            const stdoutChunks = [];
            const stderrChunks = [];
            state.stdoutBuffer = '';

            const workerSource = buildWorkerScript();
            const workerBlob = new Blob([workerSource], {
                type: 'application/javascript'
            });
            const workerUrl = URL.createObjectURL(workerBlob);
            const worker = new Worker(workerUrl);

            state.activeWorker = worker;
            state.activeReject = reject;

            const cleanup = () => {
                clearActiveTimeout();
                if (state.activeWorker === worker) {
                    state.activeWorker = null;
                }
                if (state.activeReject === reject) {
                    state.activeReject = null;
                }
                URL.revokeObjectURL(workerUrl);
                worker.terminate();
            };

            worker.onmessage = event => {
                const data = event.data || {};

                if (data.type === 'stdout') {
                    const chunk = normalizeText(data.chunk);
                    stdoutChunks.push(chunk);
                    processStdoutChunk({
                        chunk,
                        state,
                        onStdoutLine,
                        onCommand,
                        commands
                    });
                    return;
                }

                if (data.type === 'stderr') {
                    const chunk = normalizeText(data.chunk);
                    stderrChunks.push(chunk);
                    if (onStderr) onStderr(chunk);
                    return;
                }

                if (data.type === 'done') {
                    flushStdoutRemainder({
                        state,
                        onStdoutLine,
                        onCommand,
                        commands
                    });
                    const result = {
                        exitCode:
                            typeof data.exitCode === 'number' ?
                                data.exitCode :
                                data.error ?
                                    1 :
                                    0,
                        signal: null,
                        stdout: stdoutChunks.join(''),
                        stderr: stderrChunks.join(''),
                        commands,
                        error: data.error || null
                    };

                    cleanup();

                    if (data.error) {
                        reject(new Error(data.error));
                        return;
                    }
                    resolve(result);
                }
            };

            worker.onerror = err => {
                cleanup();
                reject(new Error(err.message || 'Pyodide worker error.'));
            };

            if (executionTimeoutMs > 0) {
                state.activeTimeoutId = setTimeout(() => {
                    cleanup();
                    reject(
                        new Error(
                            `Pyodide execution timed out after ${executionTimeoutMs}ms.`,
                        ),
                    );
                }, executionTimeoutMs);
            }

            worker.postMessage({
                type: 'run',
                payload: {
                    code,
                    sdkUrl,
                    pyodideIndexUrl: PYODIDE_INDEX_URL,
                    pyodideScriptUrl: PYODIDE_CDN_SCRIPT
                }
            });
        });

    const run = async code => {
        if (state.activeWorker) {
            throw new Error('Pyodide runner is already executing code.');
        }

        // Always make Sprite, sprite, and all helpers available without
        // requiring the user to write an explicit import statement.
        const fullCode = `from nomoproSDKPython import *\n${code}`;

        if (typeof Worker === 'function') {
            return runWithWorker(fullCode);
        }

        return withTimeout(
            runInMainThread({
                code: fullCode,
                sdkUrl,
                onStdoutLine,
                onStderr,
                onCommand
            }),
            executionTimeoutMs,
            `Pyodide execution timed out after ${executionTimeoutMs}ms.`,
        );
    };

    return {
        isAvailable: () => typeof window !== 'undefined',
        stop,
        run
    };
};

export async function runPython (code) {
    const runner = createPyodideRunner();
    return runner.run(code);
}
