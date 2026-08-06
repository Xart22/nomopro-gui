import { parseNdjsonCommandLine } from "./ndjson-command-parser";
import { setPythonEventTarget } from "./bridge";

const PYODIDE_VERSION = "0.26.4";
const PYODIDE_INDEX_URL = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;
const PYODIDE_CDN_SCRIPT = `${PYODIDE_INDEX_URL}pyodide.js`;
const SDK_DEFAULT_URL = "/static/python/nomoproSDKPython.py";
const DEFAULT_EXECUTION_TIMEOUT_MS = 5000;

let pyodideInstance = null;
let initPromise = null;

const normalizeText = (value) =>
    typeof value === "string" ? value : String(value || "");

const resolveSdkUrl = (sdkUrl) => {
    const candidate = sdkUrl || SDK_DEFAULT_URL;

    if (typeof window === "undefined") return candidate;

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

        // Import the SDK immediately so event dispatch can use it
        // even before the user's runPythonAsync starts.
        pyodide.runPython("import nomoproSDKPython");

        // Store ref BEFORE running user code so dispatchEventInPyodide
        // can call _push_event / _start_event_loop while script is alive.
        _pyodideForEvents = pyodide;
        console.log("[Worker] runJob: _pyodideForEvents SET:", !!_pyodideForEvents);

        // Process any events that arrived before Pyodide was ready
        while (_pendingEvents.length > 0) {
            const ev = _pendingEvents.shift();
            console.log("[Worker] processing pending event:", ev.name);
            dispatchEventInPyodide(ev);
        }

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

let _pyodideForEvents = null;
let _pendingEvents = [];

const dispatchEventInPyodide = (event) => {
    console.log("[Worker] dispatchEventInPyodide called, pyodide:", !!_pyodideForEvents, "event:", event);
    if (!_pyodideForEvents) {
        _pendingEvents.push(event);
        console.log("[Worker] event queued (pending), total:", _pendingEvents.length);
        return;
    }
    try {
        if (event.name === "_stop_") {
            _pyodideForEvents.runPython(
                "import nomoproSDKPython\\n" +
                "nomoproSDKPython._event_loop_started = False"
            );
            console.log("[Worker] _stop_ dispatched, event loop halted");
            return;
        }
        const name = JSON.stringify(event.name);
        const val = event.value != null ? JSON.stringify(event.value) : "None";
        // IMPORTANT: Dispatch directly via _dispatch_local_event instead of
        // going through the _event_queue / background-daemon-thread path.
        // Pyodide's threading emulation requires SharedArrayBuffer + COOP/COEP
        // headers which we cannot guarantee in all deployment environments.
        //
        // We also capture any stdout / stderr that the handler produces and
        // post it back to the main thread so the UI can react (say bubble,
        // move, etc.).  Plain pyodide.runPython() does trigger the stdout
        // callback that was installed at loadPyodide time, but only for
        // the *main* pyodideInstance — not for _pyodideForEvents if they
        // happen to be different objects.  Here they are always the same
        // object, so stdout *should* be forwarded automatically.  We keep
        // the explicit capture below for extra safety.
        const handlerCount = _pyodideForEvents.runPython(
            "len(nomoproSDKPython._event_handlers.get(" + name + ", []))"
        );
        console.log("[Worker] handler count for", event.name, ":", handlerCount);
        const dispatchCode =
            "import sys, io, nomoproSDKPython\\n" +
            "_capture_stdout = io.StringIO()\\n" +
            "_old_stdout = sys.stdout\\n" +
            "sys.stdout = _capture_stdout\\n" +
            "try:\\n" +
            "    nomoproSDKPython._dispatch_local_event(" +
            name + ", " + val + ")\\n" +
            "finally:\\n" +
            "    sys.stdout = _old_stdout\\n" +
            "    nomoproSDKPython._last_event_output = _capture_stdout.getvalue()\\n";
        _pyodideForEvents.runPython(dispatchCode);
        let captured = "";
        try {
            captured = _pyodideForEvents.runPython("nomoproSDKPython._last_event_output");
        } catch (_e) { /* variable may not exist yet */ }
        console.log("[Worker] captured stdout from event handler:", JSON.stringify(captured));
        if (captured) {
            self.postMessage({type: "stdout", chunk: String(captured)});
        }
        console.log("[Worker] event dispatched directly to handler:", event.name);
    } catch (e) {
        console.warn("[Worker] dispatch error:", e);
    }
};

const runJobSync = (payload) => {
    runJob(payload);
    return;
};

self.onmessage = (event) => {
    const data = event.data || {};
    console.log("[Worker] self.onmessage received:", data.type, data);
    if (data.type === 'run') {
        runJob(data.payload);
        return;
    }
    if (data.type === 'dispatch_event') {
        console.log("[Worker] dispatch_event received:", data.name);
        dispatchEventInPyodide({name: data.name, value: data.value});
        return;
    }
};
`;

function loadScript() {
    return new Promise((resolve, reject) => {
        if (typeof window.loadPyodide === "function") {
            resolve();
            return;
        }
        const existing = document.querySelector(
            `script[src="${PYODIDE_CDN_SCRIPT}"]`,
        );
        if (existing) {
            existing.addEventListener("load", resolve);
            existing.addEventListener("error", reject);
            return;
        }
        const script = document.createElement("script");
        script.src = PYODIDE_CDN_SCRIPT;
        script.onload = resolve;
        script.onerror = () =>
            reject(new Error("Failed to load Pyodide from CDN."));
        document.head.appendChild(script);
    });
}

export async function getPyodide() {
    if (pyodideInstance) return pyodideInstance;
    if (initPromise) return initPromise;

    initPromise = loadScript()
        .then(() => window.loadPyodide({ indexURL: PYODIDE_INDEX_URL }))
        .then((pyodide) => {
            pyodideInstance = pyodide;
            return pyodide;
        });

    return initPromise;
}

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

/**
 * Yield one browser animation frame so movement commands render smoothly
 * instead of all landing in a single paint cycle.
 */
const yieldFrame = () =>
    new Promise((resolve) => requestAnimationFrame(resolve));

const runInMainThread = async ({
    code,
    sdkUrl,
    onStdoutLine,
    onStderr,
    onCommand,
}) => {
    const pyodide = await getPyodide();
    const response = await fetch(sdkUrl, { cache: "no-store" });
    if (!response.ok) {
        throw new Error(
            `Failed to load SDK from ${sdkUrl} (status ${response.status}).`,
        );
    }
    const sdkCode = await response.text();

    pyodide.FS.writeFile("nomoproSDKPython.py", sdkCode, { encoding: "utf8" });

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

    const stdout = normalizeText(pyodide.runPython("sys.stdout.getvalue()"));
    const stderr = normalizeText(pyodide.runPython("sys.stderr.getvalue()"));

    const commands = [];
    const lines = stdout.split(/\r?\n/).filter((line) => line.length > 0);
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (onStdoutLine) onStdoutLine(line);
        const parsed = parseNdjsonCommandLine(line);
        if (!parsed.length || !onCommand) continue;
        for (let j = 0; j < parsed.length; j++) {
            const command = parsed[j];
            commands.push(command);
            await onCommand(command);
            // Yield one frame (~16ms at 60fps) so movement commands render
            // smoothly instead of all landing in a single frame.
            await yieldFrame();
        }
    }

    if (stderr && onStderr) onStderr(stderr);
    if (error && onStderr) onStderr(error);

    return {
        exitCode,
        signal: null,
        stdout,
        stderr: error ? `${stderr}\n${error}`.trim() : stderr,
        commands,
        error,
    };
};

export const createPyodideRunner = (options = {}) => {
    const sdkUrl = resolveSdkUrl(options.sdkUrl);
    const onStdoutLine = options.onStdoutLine;
    const onStderr = options.onStderr;
    const onCommand = options.onCommand;
    const executionTimeoutMs =
        typeof options.executionTimeoutMs === "number"
            ? options.executionTimeoutMs
            : DEFAULT_EXECUTION_TIMEOUT_MS;

    const state = {
        activeWorker: null,
        activeReject: null,
        stdoutBuffer: "",
        activeTimeoutId: null,
        /** Worker ref kept alive for event bridge even after cleanup. */
        eventBridgeWorker: null,
    };

    const clearActiveTimeout = () => {
        if (state.activeTimeoutId) {
            clearTimeout(state.activeTimeoutId);
            state.activeTimeoutId = null;
        }
    };

    const stop = () => {
        clearActiveTimeout();
        // Clear the bridge event target so UI events don't get forwarded
        // to a worker that's about to be terminated.
        setPythonEventTarget(null);
        if (state.activeWorker) {
            // Send graceful stop signal so keep-alive loop sees
            // _event_loop_running = False and exits cleanly.
            state.activeWorker.postMessage({
                type: "dispatch_event",
                name: "_stop_",
            });
            // Brief delay to let the worker process the stop signal
            // before the terminate() call nukes it.
            setTimeout(() => {
                if (state.activeWorker) {
                    state.activeWorker.terminate();
                    state.activeWorker = null;
                }
            }, 200);
        }
        if (state.activeReject) {
            state.activeReject(new Error("Pyodide execution stopped."));
            state.activeReject = null;
        }
    };

    const runWithWorker = (code, execTimeoutMs) =>
        new Promise((resolve, reject) => {
            const commands = [];
            const stdoutChunks = [];
            const stderrChunks = [];
            /** @type {Array<object>} queue of commands waiting to be processed */
            const commandQueue = [];
            /** @type {boolean} whether the async command processor is active */
            let commandProcessorActive = false;
            state.stdoutBuffer = "";

            /**
             * Process commands one at a time, yielding a browser animation
             * frame after each command so movement appears smooth.
             */
            const processCommandQueue = async () => {
                if (commandProcessorActive) return;
                commandProcessorActive = true;
                try {
                    while (commandQueue.length > 0) {
                        const command = commandQueue.shift();
                        await onCommand(command);
                        // Yield one frame so the renderer can paint
                        await yieldFrame();
                    }
                } finally {
                    commandProcessorActive = false;
                }
            };

            /**
             * Enqueue commands from parsed NDJSON lines.
             * Commands are processed asynchronously with frame gaps.
             */
            const enqueueCommands = (parsedCommands) => {
                for (const cmd of parsedCommands) {
                    commands.push(cmd);
                    commandQueue.push(cmd);
                }
                processCommandQueue();
            };

            const workerSource = buildWorkerScript();
            const workerBlob = new Blob([workerSource], {
                type: "application/javascript",
            });
            const workerUrl = URL.createObjectURL(workerBlob);
            const worker = new Worker(workerUrl);

            state.activeWorker = worker;
            state.activeReject = reject;

            // Keep event bridge reference so UI events can reach the worker
            // even after cleanup nulls state.activeWorker (real-time mode).
            state.eventBridgeWorker = worker;

            const isEventMode = execTimeoutMs === 0;

            const cleanup = () => {
                clearActiveTimeout();
                if (state.activeWorker === worker) {
                    state.activeWorker = null;
                }
                if (state.activeReject === reject) {
                    state.activeReject = null;
                }
                // In event/realtime mode the keep-alive loop holds the
                // worker alive — do NOT terminate or revoke the blob URL.
                // Only stop() may kill the worker via eventBridgeWorker.
                if (!isEventMode) {
                    if (state.eventBridgeWorker === worker) {
                        state.eventBridgeWorker = null;
                    }
                    URL.revokeObjectURL(workerUrl);
                    worker.terminate();
                }
            };

            /**
             * Parse a single line of stdout. If it contains NDJSON commands,
             * enqueue them for async processing instead of calling onCommand
             * synchronously.
             */
            const processLine = (line) => {
                if (onStdoutLine) onStdoutLine(line);
                const parsed = parseNdjsonCommandLine(line);
                if (parsed.length > 0 && onCommand) {
                    enqueueCommands(parsed);
                }
            };

            worker.onmessage = (event) => {
                const data = event.data || {};

                if (data.type === "stdout") {
                    const chunk = normalizeText(data.chunk);
                    stdoutChunks.push(chunk);
                    state.stdoutBuffer += chunk;
                    const lines = state.stdoutBuffer.split(/\r?\n/);
                    state.stdoutBuffer = lines.pop() || "";

                    for (const line of lines) {
                        processLine(line);
                    }
                    return;
                }

                if (data.type === "event") {
                    // UI event forwarded from main thread (green flag,
                    // key press, sprite click). Dispatch inside Pyodide
                    // via nomoproSDKPython._push_event().
                    console.log(
                        "[PyodideRunner] main thread received event:",
                        data,
                    );
                    if (state.activeWorker) {
                        console.log(
                            "[PyodideRunner] forwarding dispatch_event to worker",
                        );
                        state.activeWorker.postMessage({
                            type: "dispatch_event",
                            name: data.name,
                            value: data.value,
                        });
                    } else {
                        console.log(
                            "[PyodideRunner] no active worker for event dispatch",
                        );
                    }
                    return;
                }

                if (data.type === "stderr") {
                    const chunk = normalizeText(data.chunk);
                    stderrChunks.push(chunk);
                    if (onStderr) onStderr(chunk);
                    return;
                }

                if (data.type === "done") {
                    // Flush any remaining partial line
                    if (state.stdoutBuffer) {
                        processLine(state.stdoutBuffer);
                        state.stdoutBuffer = "";
                    }

                    // In event (real-time) mode the keep-alive loop runs
                    // forever — do NOT resolve the promise or cleanup the
                    // worker. The runner stays alive until stop() is called.
                    if (execTimeoutMs === 0) {
                        return;
                    }

                    // Wait for all queued commands to be processed before
                    // resolving the promise.
                    const waitForCommands = async () => {
                        // Give the processor a tick to start if needed
                        await new Promise((r) => setTimeout(r, 0));
                        while (
                            commandQueue.length > 0 ||
                            commandProcessorActive
                        ) {
                            await new Promise((r) => setTimeout(r, 5));
                        }

                        const result = {
                            exitCode:
                                typeof data.exitCode === "number"
                                    ? data.exitCode
                                    : data.error
                                      ? 1
                                      : 0,
                            signal: null,
                            stdout: stdoutChunks.join(""),
                            stderr: stderrChunks.join(""),
                            commands,
                            error: data.error || null,
                        };

                        cleanup();

                        if (data.error) {
                            reject(new Error(data.error));
                            return;
                        }
                        resolve(result);
                    };
                    waitForCommands();
                }
            };

            worker.onerror = (err) => {
                cleanup();
                reject(new Error(err.message || "Pyodide worker error."));
            };

            if (execTimeoutMs > 0) {
                state.activeTimeoutId = setTimeout(() => {
                    cleanup();
                    reject(
                        new Error(
                            `Pyodide execution timed out after ${execTimeoutMs}ms.`,
                        ),
                    );
                }, execTimeoutMs);
            }

            worker.postMessage({
                type: "run",
                payload: {
                    code,
                    sdkUrl,
                    pyodideIndexUrl: PYODIDE_INDEX_URL,
                    pyodideScriptUrl: PYODIDE_CDN_SCRIPT,
                },
            });
        });

    const run = async (code) => {
        // Allow re-entry when the previous run is in event (real-time) mode
        // and only the keep-alive worker is still alive.
        const active = state.activeWorker || state.eventBridgeWorker;
        if (active) {
            setPythonEventTarget(null);
            stop();
            // Brief delay to let the worker fully terminate
            await new Promise((r) => setTimeout(r, 100));
        }

        // Always make Sprite, sprite, and all helpers available without
        // requiring the user to write an explicit import statement.
        const _hasEventDecorators = /@when_\w+/i.test(code);

        // Event mode must run indefinitely — disable timeout so the
        // keep-alive loop is not killed after 5s.
        const effectiveExecTimeoutMs = _hasEventDecorators
            ? 0
            : executionTimeoutMs;

        const eventModePrefix = _hasEventDecorators
            ? "import time\nnomoproSDKPython._event_loop_started = True\n"
            : "";
        // Keep-alive moved to JavaScript side — Python time.sleep() blocks
        // the wasm thread so worker.onmessage can't dispatch events.
        const fullCode = `from nomoproSDKPython import *\n${eventModePrefix}${code}`;

        const onEventFromBridge = (event) => {
            const w = state.eventBridgeWorker || state.activeWorker;
            console.log(
                "[PyodideRunner] onEventFromBridge called, event:",
                event,
                "bridgeWorker:",
                !!w,
            );
            if (w) {
                w.postMessage({
                    type: "dispatch_event",
                    name: event.name,
                    value: event.value,
                });
            } else {
                console.log(
                    "[PyodideRunner] onEventFromBridge: no worker available!",
                );
            }
        };

        console.log("[PyodideRunner] about to setPythonEventTarget");
        setPythonEventTarget(onEventFromBridge);

        // cleanup is now handled by stop() and by worker done/error in
        // runWithWorker — we do NOT clear the target in .finally() because
        // the realtime keep-alive loop keeps the worker alive indefinitely.
        // Clearing the target prematurely breaks UI event forwarding
        // (green flag, key press, etc.) while Python is still running.
        const cleanup = () => {
            console.log(
                "[PyodideRunner] cleanup called - clearing pythonEventTarget",
            );
            setPythonEventTarget(null);
        };

        if (typeof Worker === "function") {
            return runWithWorker(fullCode, effectiveExecTimeoutMs);
        }

        return withTimeout(
            runInMainThread({
                code: fullCode,
                sdkUrl,
                onStdoutLine,
                onStderr,
                onCommand,
            }),
            effectiveExecTimeoutMs,
            `Pyodide execution timed out after ${effectiveExecTimeoutMs}ms.`,
        );
    };

    return {
        isAvailable: () => typeof window !== "undefined",
        stop,
        run,
    };
};

export async function runPython(code) {
    const runner = createPyodideRunner();
    return runner.run(code);
}
