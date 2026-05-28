import React, {useRef, useState, useEffect, useCallback} from 'react';
import PropTypes from 'prop-types';
import MicropythonRepl from '../../lib/micropython-repl';

const MAX_HISTORY = 100;
const MAX_BUFFER = 65536;

const ReplTerminal = ({
    deviceId,
    peripheralName,
    isConnected,
    onSend
}) => {
    const [lines, setLines] = useState([]);
    const [inputText, setInputText] = useState('');
    const [history, setHistory] = useState([]);
    const [historyIdx, setHistoryIdx] = useState(-1);
    const [isExecuting, setIsExecuting] = useState(false);
    const outputRef = useRef(null);
    const inputRef = useRef(null);
    const replRef = useRef(new MicropythonRepl());
    const dataBufferRef = useRef('');
    const isExecutingRef = useRef(false);
    const linesRef = useRef([]);

    useEffect(() => {
        if (outputRef.current) {
            outputRef.current.scrollTop = outputRef.current.scrollHeight;
        }
    }, [lines]);

    const appendLine = useCallback((text, type = 'output') => {
        linesRef.current = [...linesRef.current, {text, type}];
        if (linesRef.current.length > 500) {
            linesRef.current = linesRef.current.slice(-500);
        }
        setLines(linesRef.current);
    }, []);

    const appendReplOutput = useCallback(text => {
        if (!text) return;
        const parts = text.split('\n');
        for (const part of parts) {
            if (part.trim()) {
                appendLine(part, 'output');
            }
        }
    }, [appendLine]);

    useEffect(() => {
        if (isConnected) {
            appendLine(`MicroPython REPL ready - ${peripheralName || deviceId}`, 'system');
            appendLine('Type Python code and press Enter to execute.', 'system');
        } else {
            appendLine('Disconnected', 'system');
            replRef.current.reset();
        }
    }, [isConnected, peripheralName, deviceId, appendLine]);

    useEffect(() => {
        const handler = data => {
            let text;
            if (data instanceof Uint8Array || data instanceof ArrayBuffer || ArrayBuffer.isView(data)) {
                text = new TextDecoder('utf-8').decode(
                    data instanceof Uint8Array ? data : new Uint8Array(data)
                );
            } else {
                return;
            }

            dataBufferRef.current += text;
            if (dataBufferRef.current.length > MAX_BUFFER) {
                dataBufferRef.current = dataBufferRef.current.slice(-MAX_BUFFER);
            }

            const repl = replRef.current;
            const result = repl.processChunk(text);

            if (result) {
                if (result.prompt) {
                    if (result.output) appendReplOutput(result.output);
                    isExecutingRef.current = false;
                    setIsExecuting(false);
                    if (inputRef.current) inputRef.current.focus();
                } else if (result.rawReady) {
                    if (result.output) appendReplOutput(result.output);
                } else if (result.pasteMode) {
                    if (result.output) appendReplOutput(result.output);
                }
            }

            // Display raw data if no prompt detected and buffer has content
            if (!result && text.trim()) {
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
        };
    }, [appendReplOutput]);

    const executeLine = useCallback(line => {
        if (!line || !onSend) return;

        // Add to history
        setHistory(prev => {
            const next = [line, ...prev.filter(h => h !== line)].slice(0, MAX_HISTORY);
            return next;
        });
        setHistoryIdx(-1);

        appendLine(`>>> ${line}`, 'input');
        isExecutingRef.current = true;
        setIsExecuting(true);

        replRef.current.sendLine(line, onSend);
    }, [onSend, appendLine]);

    const handleKeyDown = e => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (isExecutingRef.current) return;
            executeLine(inputText);
            setInputText('');
            return;
        }

        if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (history.length === 0) return;
            const newIdx = historyIdx === -1 ? 0 : Math.min(historyIdx + 1, history.length - 1);
            setHistoryIdx(newIdx);
            setInputText(history[newIdx]);
            return;
        }

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (historyIdx <= 0) {
                setHistoryIdx(-1);
                setInputText('');
                return;
            }
            const newIdx = historyIdx - 1;
            setHistoryIdx(newIdx);
            setInputText(history[newIdx]);
            return;
        }

        const ctrl = e.ctrlKey || e.metaKey;
        if (ctrl) {
            const key = e.key.toLowerCase();
            if (key === 'c') {
                e.preventDefault();
                appendLine('[Interrupt]', 'system');
                replRef.current.sendInterrupt(onSend);
                isExecutingRef.current = false;
                setIsExecuting(false);
                return;
            }
            if (key === 'd') {
                e.preventDefault();
                appendLine('[Soft reboot]', 'system');
                replRef.current.sendSoftReset(onSend);
                return;
            }
            if (key === 'e') {
                e.preventDefault();
                appendLine('[Paste mode on]', 'system');
                replRef.current.sendEnterPasteMode(onSend);
                return;
            }
        }
    };

    const handleClear = () => {
        linesRef.current = [];
        setLines([]);
        dataBufferRef.current = '';
        replRef.current.reset();
    };

    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                fontFamily: 'monospace',
                fontSize: '0.82rem'
            }}
        >
            {/* Connection status */}
            <div
                style={{
                    padding: '4px 8px',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    borderBottom: '1px solid #e0e0e0',
                    background: '#f8f8f8'
                }}
            >
                <span
                    style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: isConnected ? '#2ecc71' : '#ccc',
                        display: 'inline-block'
                    }}
                />
                <span>
                    {isConnected ?
                        `REPL: ${peripheralName || deviceId || 'MicroPython'}` :
                        'Not connected'}
                </span>
                {isExecuting && (
                    <span style={{color: '#4a90d9', marginLeft: 8, fontSize: '0.72rem'}}>
                        Executing...
                    </span>
                )}
            </div>

            {/* Output area */}
            <div
                ref={outputRef}
                style={{
                    flex: 1,
                    overflow: 'auto',
                    padding: '8px 10px',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    userSelect: 'text',
                    lineHeight: 1.5,
                    background: '#1e1e2e',
                    color: '#cdd6f4'
                }}
            >
                {lines.length === 0 ? (
                    <span style={{color: '#585b70', fontStyle: 'italic'}}>
                        {isConnected ?
                            '>>> Type Python code below...' :
                            'Connect a MicroPython device to start the REPL'}
                    </span>
                ) : (
                    lines.map((line, i) => {
                        if (line.type === 'input') {
                            return (
                                <div
                                    key={i}
                                    style={{color: '#89b4fa'}}
                                >
                                    <span style={{color: '#a6e3a1'}}>&gt;&gt;&gt; </span>
                                    {line.text.replace(/^>>> /, '')}
                                </div>
                            );
                        }
                        if (line.type === 'system') {
                            return (
                                <div
                                    key={i}
                                    style={{
                                        color: '#6c7086',
                                        fontStyle: 'italic',
                                        fontSize: '0.75rem'
                                    }}
                                >
                                    # {line.text}
                                </div>
                            );
                        }
                        return (<div
                            key={i}
                            style={{color: '#cdd6f4'}}
                        >{line.text}</div>);
                    })
                )}
            </div>

            {/* Input area */}
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '6px 8px',
                    borderTop: '1px solid #313244',
                    background: '#181825'
                }}
            >
                <span
                    style={{
                        color: '#a6e3a1',
                        fontFamily: 'monospace',
                        fontWeight: 600,
                        fontSize: '0.82rem',
                        userSelect: 'none'
                    }}
                >
                    {'>>>'}
                </span>
                <input
                    ref={inputRef}
                    type="text"
                    value={inputText}
                    onChange={e => setInputText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={
                        isConnected ?
                            isExecuting ? 'Waiting...' : 'Type code here...' :
                            'Connect a device first'
                    }
                    disabled={!isConnected || isExecuting}
                    style={{
                        flex: 1,
                        minWidth: 60,
                        padding: '4px 8px',
                        border: '1px solid #45475a',
                        borderRadius: 4,
                        fontSize: '0.82rem',
                        fontFamily: 'monospace',
                        outline: 'none',
                        background: isConnected && !isExecuting ? '#1e1e2e' : '#11111b',
                        color: '#cdd6f4'
                    }}
                    autoFocus
                />
                <button
                    onClick={() => {
                        if (inputText && !isExecutingRef.current) {
                            executeLine(inputText);
                            setInputText('');
                        }
                    }}
                    disabled={!isConnected || isExecuting || !inputText}
                    style={{
                        padding: '4px 12px',
                        border: '1px solid #45475a',
                        borderRadius: 4,
                        cursor: 'pointer',
                        background: isConnected && !isExecuting ? '#89b4fa' : '#45475a',
                        color: isConnected && !isExecuting ? '#1e1e2e' : '#6c7086',
                        fontWeight: 600,
                        fontSize: '0.8rem',
                        lineHeight: 1
                    }}
                >
                    Enter
                </button>
                <button
                    onClick={handleClear}
                    title="Clear"
                    style={{
                        padding: '4px 8px',
                        border: '1px solid #45475a',
                        borderRadius: 4,
                        cursor: 'pointer',
                        background: 'transparent',
                        color: '#6c7086',
                        fontSize: '0.8rem',
                        lineHeight: 1
                    }}
                >
                    Clear
                </button>
            </div>

            {/* Help bar */}
            <div
                style={{
                    padding: '3px 8px',
                    fontSize: '0.7rem',
                    color: '#585b70',
                    borderTop: '1px solid #313244',
                    background: '#11111b',
                    display: 'flex',
                    gap: 12
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
    onSend: PropTypes.func
};

export default ReplTerminal;
