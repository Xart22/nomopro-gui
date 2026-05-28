import React, {useRef, useState, useEffect, useCallback} from 'react';
import PropTypes from 'prop-types';

const BAUD_RATES = [
    {key: '1200', value: 1200},
    {key: '2400', value: 2400},
    {key: '4800', value: 4800},
    {key: '9600', value: 9600},
    {key: '14400', value: 14400},
    {key: '19200', value: 19200},
    {key: '38400', value: 38400},
    {key: '57600', value: 57600},
    {key: '76800', value: 76800},
    {key: '115200', value: 115200},
    {key: '256000', value: 256000}
];

const EOL_OPTIONS = [
    {key: 'none', label: 'No terminator'},
    {key: 'lf', label: 'LF (\\n)'},
    {key: 'cr', label: 'CR (\\r)'},
    {key: 'lfAndCr', label: 'LF & CR (\\r\\n)'}
];

const MAX_BUFFER = 65536;

const SerialTerminal = ({
    deviceId,
    peripheralName,
    isConnected,
    onSend,
    onChangeBaudrate
}) => {
    const [buffer, setBuffer] = useState(new Uint8Array(0));
    const [inputText, setInputText] = useState('');
    const [baudrate, setBaudrate] = useState('9600');
    const [eol, setEol] = useState('lfAndCr');
    const [isHex, setIsHex] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [isAutoScroll, setIsAutoScroll] = useState(true);
    const [showSettings, setShowSettings] = useState(false);
    const [isTerminalActive, setIsTerminalActive] = useState(true);
    const outputRef = useRef(null);
    const inputRef = useRef(null);
    const pausedBufferRef = useRef(new Uint8Array(0));
    const isPausedRef = useRef(isPaused);
    isPausedRef.current = isPaused;
    const updateTimeoutRef = useRef(null);

    useEffect(() => {
        if (isAutoScroll && outputRef.current) {
            outputRef.current.scrollTop = outputRef.current.scrollHeight;
        }
    }, [buffer, isAutoScroll]);

    // Cleanup timeout on unmount
    useEffect(() => () => {
        if (updateTimeoutRef.current) {
            clearTimeout(updateTimeoutRef.current);
            updateTimeoutRef.current = null;
        }
    }, []);

    // On mount, consume any buffered data that arrived before this component mounted
    useEffect(() => {
        if (window.__serialTerminalBuffer && window.__serialTerminalBuffer.byteLength > 0) {
            pausedBufferRef.current = window.__serialTerminalBuffer;
            setBuffer(window.__serialTerminalBuffer);
            window.__serialTerminalBuffer = new Uint8Array(0);
        }
    }, []);

    const throttleUpdate = useCallback(() => {
        if (updateTimeoutRef.current) return;
        updateTimeoutRef.current = setTimeout(() => {
            updateTimeoutRef.current = null;
            if (!isPausedRef.current) {
                setBuffer(new Uint8Array(pausedBufferRef.current));
            }
        }, 50);
    }, []);

    const appendData = useCallback(data => {
        if (!isTerminalActive) return;
        // Accept Uint8Array or ArrayBuffer; convert Buffer/Uint8Array to plain copy.
        let bytes;
        if (data instanceof Uint8Array) {
            bytes = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
        } else if (data instanceof ArrayBuffer) {
            bytes = new Uint8Array(data);
        } else if (ArrayBuffer.isView(data)) {
            bytes = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
        } else {
            return;
        }
        pausedBufferRef.current = (() => {
            const buf = pausedBufferRef.current;
            const combined = new Uint8Array(buf.byteLength + bytes.byteLength);
            combined.set(buf, 0);
            combined.set(bytes, buf.byteLength);
            if (combined.byteLength > MAX_BUFFER) {
                return combined.slice(combined.byteLength - MAX_BUFFER);
            }
            return combined;
        })();
        if (!isPausedRef.current) {
            throttleUpdate();
        }
    }, [throttleUpdate, isTerminalActive]); // isPaused via ref to avoid stale closure & listener churn

    useEffect(() => {
        const handler = data => appendData(data);
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
    }, [appendData]);

    const sendData = () => {
        if (!inputText || !onSend) return;
        let data = inputText;
        if (eol === 'lf') data += '\n';
        else if (eol === 'cr') data += '\r';
        else if (eol === 'lfAndCr') data += '\r\n';
        onSend(data);
        setInputText('');
    };

    const handleKeyDown = e => {
        if (e.key === 'Enter') {
            e.preventDefault();
            sendData();
            return;
        }
        const ctrl = e.ctrlKey || e.metaKey;
        if (ctrl) {
            const map = {a: 1, b: 2, c: 3, d: 4};
            const code = map[e.key.toLowerCase()];
            if (code !== undefined && onSend) {
                e.preventDefault();
                onSend(String.fromCharCode(code));
            }
        }
    };

    const handlePauseToggle = () => {
        if (isPaused) {
            // Flush accumulated data immediately on resume
            setBuffer(new Uint8Array(pausedBufferRef.current));
            // Schedule next throttled update
            throttleUpdate();
        }
        setIsPaused(!isPaused);
    };

    const handleClear = () => {
        pausedBufferRef.current = new Uint8Array(0);
        setBuffer(new Uint8Array(0));
    };

    const handleBaudrateChange = e => {
        const val = e.target.value;
        setBaudrate(val);
        if (onChangeBaudrate) onChangeBaudrate(Number(val));
    };

    const displayText = isHex ?
        Array.from(buffer)
            .map(b => b.toString(16).toUpperCase()
                .padStart(2, '0'))
            .join(' ') :
        new TextDecoder('utf-8').decode(buffer);

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
                <span style={{flex: 1}}>
                    {isConnected ?
                        `Connected: ${peripheralName || deviceId || '—'}` :
                        (deviceId ? `Disconnected: ${deviceId}` : 'Not connected')}
                    {!isTerminalActive && <span style={{color: '#e67e22', marginLeft: 8}}>(Terminal off)</span>}
                </span>
                {isTerminalActive ? (
                    <button
                        onClick={() => {
                            setIsTerminalActive(false);
                            handleClear();
                        }}
                        title="Disconnect terminal"
                        style={{
                            ...btnStyle,
                            color: '#e74c3c',
                            borderColor: '#e74c3c',
                            fontSize: '0.7rem',
                            padding: '2px 8px'
                        }}
                    >
                        Disconnect
                    </button>
                ) : (
                    <button
                        onClick={() => setIsTerminalActive(true)}
                        title="Connect terminal"
                        style={{
                            ...btnStyle,
                            color: '#2ecc71',
                            borderColor: '#2ecc71',
                            fontSize: '0.7rem',
                            padding: '2px 8px'
                        }}
                    >
                        Connect
                    </button>
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
                    wordBreak: 'break-all',
                    userSelect: 'text',
                    lineHeight: 1.45,
                    background: '#fafafa'
                }}
            >
                {displayText || (
                    <span style={{color: '#aaa', fontStyle: 'italic'}}>
                        Waiting for serial data...
                    </span>
                )}
            </div>

            {/* Bottom toolbar */}
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 8px',
                    borderTop: '1px solid #e0e0e0',
                    background: '#f5f5f5',
                    flexWrap: 'wrap'
                }}
            >
                {/* Control buttons */}
                <button
                    onClick={handlePauseToggle}
                    title={isPaused ? 'Resume' : 'Pause'}
                    style={btnStyle}
                >
                    {isPaused ? '▶' : '⏸'}
                </button>
                <button
                    onClick={handleClear}
                    title="Clear"
                    style={btnStyle}
                >
                    🗑
                </button>

                {/* Input field */}
                <input
                    ref={inputRef}
                    type="text"
                    value={inputText}
                    onChange={e => setInputText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={
                        isConnected ?
                            'Type here and press Enter to send...' :
                            (isTerminalActive ? 'Connect a device to send data' : 'Terminal is off')
                    }
                    disabled={!isConnected || !isTerminalActive}
                    style={{
                        flex: 1,
                        minWidth: 100,
                        padding: '4px 8px',
                        border: '1px solid #ccc',
                        borderRadius: 4,
                        fontSize: '0.82rem',
                        fontFamily: 'monospace',
                        outline: 'none',
                        background: isConnected ? '#fff' : '#f0f0f0'
                    }}
                />
                <button
                    onClick={sendData}
                    disabled={!isConnected || !inputText}
                    style={{
                        ...btnStyle,
                        background: isConnected ? '#4a90d9' : '#ccc',
                        color: '#fff',
                        fontWeight: 600,
                        padding: '4px 12px'
                    }}
                >
                    Send
                </button>

                {/* Settings toggle */}
                <button
                    onClick={() => setShowSettings(!showSettings)}
                    title="Settings"
                    style={btnStyle}
                >
                    ⚙
                </button>
            </div>

            {/* Settings panel */}
            {showSettings && (
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '6px 10px',
                        borderTop: '1px solid #e0e0e0',
                        background: '#f0f0f0',
                        fontSize: '0.78rem',
                        flexWrap: 'wrap'
                    }}
                >
                    <label style={{display: 'flex', alignItems: 'center', gap: 4}}>
                        Baudrate:
                        <select
                            value={baudrate}
                            onChange={handleBaudrateChange}
                            style={selectStyle}
                        >
                            {BAUD_RATES.map(b => (
                                <option
                                    key={b.key}
                                    value={b.key}
                                >
                                    {b.value}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label style={{display: 'flex', alignItems: 'center', gap: 4}}>
                        EOL:
                        <select
                            value={eol}
                            onChange={e => setEol(e.target.value)}
                            style={selectStyle}
                        >
                            {EOL_OPTIONS.map(o => (
                                <option
                                    key={o.key}
                                    value={o.key}
                                >
                                    {o.label}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label style={{display: 'flex', alignItems: 'center', gap: 4}}>
                        <input
                            type="checkbox"
                            checked={isHex}
                            onChange={() => setIsHex(!isHex)}
                        />
                        Hex
                    </label>
                    <label style={{display: 'flex', alignItems: 'center', gap: 4}}>
                        <input
                            type="checkbox"
                            checked={isAutoScroll}
                            onChange={() => setIsAutoScroll(!isAutoScroll)}
                        />
                        Auto-scroll
                    </label>
                </div>
            )}
        </div>
    );
};

const btnStyle = {
    background: 'transparent',
    border: '1px solid #ccc',
    borderRadius: 4,
    cursor: 'pointer',
    padding: '4px 8px',
    fontSize: '0.8rem',
    lineHeight: 1,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center'
};

const selectStyle = {
    border: '1px solid #ccc',
    borderRadius: 3,
    padding: '2px 4px',
    fontSize: '0.78rem',
    background: '#fff'
};

SerialTerminal.propTypes = {
    deviceId: PropTypes.string,
    peripheralName: PropTypes.string,
    isConnected: PropTypes.bool,
    onSend: PropTypes.func,
    onChangeBaudrate: PropTypes.func
};

export default SerialTerminal;
