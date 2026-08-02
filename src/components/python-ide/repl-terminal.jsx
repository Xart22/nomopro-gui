import React, { useRef, useState, useEffect, useCallback } from "react";
import PropTypes from "prop-types";
import MicropythonRepl from "../../lib/micropython-repl";

const MAX_HISTORY = 100;
const MAX_BUFFER = 65536;
const CONNECT_BOOTSTRAP_MS = 900;

const normalizeTerminalText = (input) => {
    if (!input) return "";
    // Remove common ANSI CSI escapes first (e.g. ESC[K line erase)
    // so only visible characters remain for UI rendering.
    const text = input
        .replace(/\r/g, "")
        .replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, "");
    let out = "";

    for (let i = 0; i < text.length; i += 1) {
        const ch = text[i];

        if (ch === "\b") {
            out = out.slice(0, -1);
            continue;
        }

        const code = ch.charCodeAt(0);
        if (code < 32 && ch !== "\n" && ch !== "\t") {
            continue;
        }

        out += ch;
    }

    return out;
};

const ReplTerminal = ({ deviceId, peripheralName, isConnected, onSend }) => {
    const [lines, setLines] = useState([]);
    const [inputText, setInputText] = useState("");
    const [history, setHistory] = useState([]);
    const [historyIdx, setHistoryIdx] = useState(-1);
    const [isExecuting, setIsExecuting] = useState(false);
    const outputRef = useRef(null);
    const inputRef = useRef(null);
    const replRef = useRef(new MicropythonRepl());
    const dataBufferRef = useRef("");
    const isExecutingRef = useRef(false);
    const linesRef = useRef([]);
    const safetyTimeoutRef = useRef(null);
    const initTimeoutRef = useRef(null);
    const hasSentCommandRef = useRef(false);
    const lastSentLineRef = useRef("");
    const onSendRef = useRef(onSend);
    const connectedOnceRef = useRef(false);

    useEffect(() => {
        if (outputRef.current) {
            outputRef.current.scrollTop = outputRef.current.scrollHeight;
        }
    }, [lines]);

    const appendLine = useCallback((text, type = "output") => {
        linesRef.current = [...linesRef.current, { text, type }];
        if (linesRef.current.length > 500) {
            linesRef.current = linesRef.current.slice(-500);
        }
        setLines(linesRef.current);
    }, []);

    const appendReplOutput = useCallback(
        (text) => {
            if (!text) return;
            const cleanText = normalizeTerminalText(text);
            const parts = cleanText.split("\n");
            for (const part of parts) {
                const trimmed = part.trim();
                if (!trimmed) continue;

                // Suppress pre-command noise from stale UART bytes (common case: single "y").
                if (!hasSentCommandRef.current && trimmed.length === 1) {
                    continue;
                }

                // Device echoes typed command; UI already renders it as input line.
                if (
                    lastSentLineRef.current &&
                    trimmed === lastSentLineRef.current
                ) {
                    continue;
                }

                if (trimmed) {
                    appendLine(part, "output");
                }
            }
        },
        [appendLine],
    );

    // Update onSendRef every render — stabil, tidak trigger re-run effect
    useEffect(() => {
        onSendRef.current = onSend;
    });

    useEffect(() => {
        if (isConnected) {
            // Soft reset + clear buffers — sekali per connect session
            if (!connectedOnceRef.current) {
                connectedOnceRef.current = true;
                // Clear local state agar garbage boot message tidak tampil
                replRef.current.reset();
                dataBufferRef.current = "";
                setInputText("");
                hasSentCommandRef.current = false;
                lastSentLineRef.current = "";
                isExecutingRef.current = true;
                setIsExecuting(true);

                if (initTimeoutRef.current) {
                    clearTimeout(initTimeoutRef.current);
                    initTimeoutRef.current = null;
                }

                const send = onSendRef.current;
                if (send) {
                    // Cegah bootstrap dobel saat remount cepat (mis. StrictMode dev).
                    const bootstrapMap =
                        window.__replBootstrapStamp ||
                        (window.__replBootstrapStamp = {});
                    const bootstrapKey =
                        peripheralName || deviceId || "default";
                    const now = Date.now();
                    const lastStamp = bootstrapMap[bootstrapKey] || 0;

                    if (now - lastStamp > 1500) {
                        // Jangan kirim CRLF saat bootstrap agar karakter stale tidak ikut dieksekusi.
                        // Kirim bertahap: interrupt dua kali lalu soft reset.
                        send("\x03");
                        setTimeout(() => send("\x03"), 80);
                        setTimeout(() => send("\x04"), 160);
                        bootstrapMap[bootstrapKey] = now;
                    }
                }

                initTimeoutRef.current = setTimeout(() => {
                    isExecutingRef.current = false;
                    setIsExecuting(false);
                    initTimeoutRef.current = null;
                    if (inputRef.current) inputRef.current.focus();
                }, CONNECT_BOOTSTRAP_MS);
            }
            appendLine(
                `MicroPython REPL ready - ${peripheralName || deviceId}`,
                "system",
            );
            appendLine(
                "Type Python code and press Enter to execute.",
                "system",
            );
        } else {
            connectedOnceRef.current = false;
            hasSentCommandRef.current = false;
            lastSentLineRef.current = "";
            if (initTimeoutRef.current) {
                clearTimeout(initTimeoutRef.current);
                initTimeoutRef.current = null;
            }
            isExecutingRef.current = false;
            setIsExecuting(false);
            appendLine("Disconnected", "system");
            replRef.current.reset();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isConnected, peripheralName, deviceId, appendLine]);

    useEffect(() => {
        const handler = (data) => {
            let text;
            if (
                data instanceof Uint8Array ||
                data instanceof ArrayBuffer ||
                ArrayBuffer.isView(data)
            ) {
                text = new TextDecoder("utf-8").decode(
                    data instanceof Uint8Array ? data : new Uint8Array(data),
                );
            } else {
                return;
            }

            dataBufferRef.current += text;
            if (dataBufferRef.current.length > MAX_BUFFER) {
                dataBufferRef.current =
                    dataBufferRef.current.slice(-MAX_BUFFER);
            }

            const repl = replRef.current;
            const result = repl.processChunk(text);

            if (result) {
                if (result.prompt) {
                    if (result.output) appendReplOutput(result.output);
                    if (safetyTimeoutRef.current) {
                        clearTimeout(safetyTimeoutRef.current);
                        safetyTimeoutRef.current = null;
                    }
                    isExecutingRef.current = false;
                    setIsExecuting(false);
                    if (inputRef.current) inputRef.current.focus();
                } else if (result.rawReady) {
                    if (result.output) appendReplOutput(result.output);
                } else if (result.pasteMode) {
                    if (result.output) appendReplOutput(result.output);
                }
            }

            // Display raw data only when idle (not executing) — selama
            // eksekusi, semua output seharusnya sudah ditangkap oleh
            // deteksi prompt di processChunk.
            if (!result && text.trim() && !isExecutingRef.current) {
                appendReplOutput(text);
            }
        };

        if (window.__serialTerminalListeners) {
            window.__serialTerminalListeners.push(handler);
        } else {
            window.__serialTerminalListeners = [handler];
        }

        return () => {
            if (window.__serialTerminalListeners) {
                const idx = window.__serialTerminalListeners.indexOf(handler);
                if (idx >= 0) window.__serialTerminalListeners.splice(idx, 1);
            }

            if (safetyTimeoutRef.current) {
                clearTimeout(safetyTimeoutRef.current);
                safetyTimeoutRef.current = null;
            }

            if (initTimeoutRef.current) {
                clearTimeout(initTimeoutRef.current);
                initTimeoutRef.current = null;
            }
        };
    }, [appendReplOutput]);

    // Global keyboard listener — tetap jalan walau input disabled (Ctrl+C/D/E)
    useEffect(() => {
        if (!isConnected) return;

        const handleGlobalKeyDown = (e) => {
            const ctrl = e.ctrlKey || e.metaKey;
            if (!ctrl) return;

            const key = e.key.toLowerCase();
            if (key === "c") {
                // Jika ada text selection, biarkan browser handle copy
                const selection = window.getSelection();
                if (selection && selection.toString().trim().length > 0) {
                    return;
                }
                e.preventDefault();
                appendLine("[Interrupt]", "system");
                replRef.current.sendInterrupt(onSend);
                if (safetyTimeoutRef.current) {
                    clearTimeout(safetyTimeoutRef.current);
                    safetyTimeoutRef.current = null;
                }
                isExecutingRef.current = false;
                setIsExecuting(false);
                setInputText("");
                if (inputRef.current) inputRef.current.focus();
            } else if (key === "d") {
                e.preventDefault();
                appendLine("[Soft reboot]", "system");
                replRef.current.sendSoftReset(onSend);
                if (safetyTimeoutRef.current) {
                    clearTimeout(safetyTimeoutRef.current);
                    safetyTimeoutRef.current = null;
                }
                isExecutingRef.current = false;
                setIsExecuting(false);
                setInputText("");
                if (inputRef.current) inputRef.current.focus();
            } else if (key === "e") {
                e.preventDefault();
                appendLine("[Paste mode on]", "system");
                replRef.current.sendEnterPasteMode(onSend);
            }
        };

        window.addEventListener("keydown", handleGlobalKeyDown);
        return () => {
            window.removeEventListener("keydown", handleGlobalKeyDown);
        };
    }, [isConnected, onSend, appendLine]);

    const executeLine = useCallback(
        (line) => {
            if (!line || !onSend) return;

            // Add to history
            setHistory((prev) => {
                const next = [line, ...prev.filter((h) => h !== line)].slice(
                    0,
                    MAX_HISTORY,
                );
                return next;
            });
            setHistoryIdx(-1);

            appendLine(`>>> ${line}`, "input");
            isExecutingRef.current = true;
            setIsExecuting(true);
            hasSentCommandRef.current = true;
            lastSentLineRef.current = line;

            // Always clear current REPL line to prevent stale UART chars
            // from prefixing the next command (e.g. intermittent leading "y").
            onSend("\x15");
            setTimeout(() => {
                replRef.current.sendLine(line, onSend);
            }, 20);

            // Safety timeout — auto-reset setelah 15 detik kalau prompt tidak kembali
            if (safetyTimeoutRef.current) {
                clearTimeout(safetyTimeoutRef.current);
            }
            safetyTimeoutRef.current = setTimeout(() => {
                if (isExecutingRef.current) {
                    appendLine("[Timeout] No response from device", "system");
                    isExecutingRef.current = false;
                    setIsExecuting(false);
                    safetyTimeoutRef.current = null;
                    if (inputRef.current) inputRef.current.focus();
                }
            }, 15000);
        },
        [onSend, appendLine],
    );

    const handleKeyDown = (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            if (isExecutingRef.current) return;
            executeLine(inputText);
            setInputText("");
            return;
        }

        if (e.key === "ArrowUp") {
            e.preventDefault();
            if (history.length === 0) return;
            const newIdx =
                historyIdx === -1
                    ? 0
                    : Math.min(historyIdx + 1, history.length - 1);
            setHistoryIdx(newIdx);
            setInputText(history[newIdx]);
            return;
        }

        if (e.key === "ArrowDown") {
            e.preventDefault();
            if (historyIdx <= 0) {
                setHistoryIdx(-1);
                setInputText("");
                return;
            }
            const newIdx = historyIdx - 1;
            setHistoryIdx(newIdx);
            setInputText(history[newIdx]);
            return;
        }
    };

    const handleClear = () => {
        linesRef.current = [];
        setLines([]);
        dataBufferRef.current = "";
        replRef.current.reset();
    };

    return (
        <div
            style={{
                display: "flex",
                flexDirection: "column",
                height: "100%",
                width: "100%",
                minWidth: 0,
                fontFamily: "monospace",
                fontSize: "0.82rem",
            }}
        >
            {/* Connection status */}
            <div
                style={{
                    padding: "4px 8px",
                    fontSize: "0.72rem",
                    fontWeight: 600,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    borderBottom: "1px solid #e0e0e0",
                    background: "#f8f8f8",
                }}
            >
                <span
                    style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: isConnected ? "#2ecc71" : "#ccc",
                        display: "inline-block",
                    }}
                />
                <span>
                    {isConnected
                        ? `REPL: ${peripheralName || deviceId || "MicroPython"}`
                        : "Not connected"}
                </span>
                {isExecuting && (
                    <span
                        style={{
                            color: "#4a90d9",
                            marginLeft: 8,
                            fontSize: "0.72rem",
                        }}
                    >
                        Executing...
                    </span>
                )}
            </div>

            {/* Output area */}
            <div
                ref={outputRef}
                style={{
                    flex: 1,
                    overflow: "auto",
                    padding: "8px 10px",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    userSelect: "text",
                    lineHeight: 1.5,
                    background: "#1e1e2e",
                    color: "#cdd6f4",
                }}
            >
                {lines.length === 0 ? (
                    <span style={{ color: "#585b70", fontStyle: "italic" }}>
                        {isConnected
                            ? ">>> Type Python code below..."
                            : "Connect a MicroPython device to start the REPL"}
                    </span>
                ) : (
                    lines.map((line, i) => {
                        if (line.type === "input") {
                            return (
                                <div key={i} style={{ color: "#89b4fa" }}>
                                    <span style={{ color: "#a6e3a1" }}>
                                        &gt;&gt;&gt;{" "}
                                    </span>
                                    {line.text.replace(/^>>> /, "")}
                                </div>
                            );
                        }
                        if (line.type === "system") {
                            return (
                                <div
                                    key={i}
                                    style={{
                                        color: "#6c7086",
                                        fontStyle: "italic",
                                        fontSize: "0.75rem",
                                    }}
                                >
                                    # {line.text}
                                </div>
                            );
                        }
                        return (
                            <div key={i} style={{ color: "#cdd6f4" }}>
                                {line.text}
                            </div>
                        );
                    })
                )}
            </div>

            {/* Input area */}
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "6px 8px",
                    borderTop: "1px solid #313244",
                    background: "#181825",
                }}
            >
                <span
                    style={{
                        color: "#a6e3a1",
                        fontFamily: "monospace",
                        fontWeight: 600,
                        fontSize: "0.82rem",
                        userSelect: "none",
                    }}
                >
                    {">>>"}
                </span>
                <input
                    ref={inputRef}
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={
                        isConnected
                            ? isExecuting
                                ? "Waiting..."
                                : "Type code here..."
                            : "Connect a device first"
                    }
                    disabled={!isConnected || isExecuting}
                    style={{
                        flex: 1,
                        minWidth: 60,
                        padding: "4px 8px",
                        border: "1px solid #45475a",
                        borderRadius: 4,
                        fontSize: "0.82rem",
                        fontFamily: "monospace",
                        outline: "none",
                        background:
                            isConnected && !isExecuting ? "#1e1e2e" : "#11111b",
                        color: "#cdd6f4",
                    }}
                    autoFocus
                />
                <button
                    onClick={() => {
                        if (inputText && !isExecutingRef.current) {
                            executeLine(inputText);
                            setInputText("");
                        }
                    }}
                    disabled={!isConnected || isExecuting || !inputText}
                    style={{
                        padding: "4px 12px",
                        border: "1px solid #45475a",
                        borderRadius: 4,
                        cursor: "pointer",
                        background:
                            isConnected && !isExecuting ? "#89b4fa" : "#45475a",
                        color:
                            isConnected && !isExecuting ? "#1e1e2e" : "#6c7086",
                        fontWeight: 600,
                        fontSize: "0.8rem",
                        lineHeight: 1,
                    }}
                >
                    Enter
                </button>
                <button
                    onClick={handleClear}
                    title="Clear"
                    style={{
                        padding: "4px 8px",
                        border: "1px solid #45475a",
                        borderRadius: 4,
                        cursor: "pointer",
                        background: "transparent",
                        color: "#6c7086",
                        fontSize: "0.8rem",
                        lineHeight: 1,
                    }}
                >
                    Clear
                </button>
            </div>

            {/* Help bar */}
            <div
                style={{
                    padding: "3px 8px",
                    fontSize: "0.7rem",
                    color: "#585b70",
                    borderTop: "1px solid #313244",
                    background: "#11111b",
                    display: "flex",
                    gap: 12,
                }}
            >
                <span>Ctrl+C: Interrupt</span>
                <span>Ctrl+D: Soft reboot</span>
                <span>Ctrl+E: Paste mode</span>
                <span>↑↓: History</span>
            </div>
        </div>
    );
};

ReplTerminal.propTypes = {
    deviceId: PropTypes.string,
    peripheralName: PropTypes.string,
    isConnected: PropTypes.bool,
    onSend: PropTypes.func,
};

export default ReplTerminal;
