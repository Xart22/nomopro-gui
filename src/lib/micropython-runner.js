/**
 * Base64 encode string ke URL-safe base64 (MicroPython compatible).
 */
const toBase64 = (str) => {
    // Gunakan btoa() kalau di browser, atau Buffer kalau di Node
    if (typeof btoa === "function") {
        return btoa(str);
    }
    if (typeof Buffer !== "undefined") {
        return Buffer.from(str, "utf-8").toString("base64");
    }
    // Fallback: manual encode via TextEncoder
    const bytes = new TextEncoder().encode(str);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
};

class MicropythonRunner {
    constructor() {
        this._outputBuffer = "";
        this._listener = null;
        this._timeoutIds = [];
    }

    dispose() {
        this._timeoutIds.forEach(clearTimeout);
        this._timeoutIds = [];
    }

    _delay(fn, ms) {
        const id = setTimeout(() => {
            this._timeoutIds = this._timeoutIds.filter((t) => t !== id);
            fn();
        }, ms);
        this._timeoutIds.push(id);
        return id;
    }

    /**
     * Kirim 1 baris Python ke REPL.
     * \r\n dan command DIPISAH waktu — biar gak ada framing error.
     */
    _sendLine(line, onSend, onComplete) {
        onSend("\r\n");
        this._delay(() => {
            onSend(line);
            this._delay(() => {
                onSend("\r\n");
                if (onComplete) this._delay(onComplete, 300);
            }, 150);
        }, 150);
    }

    /**
     * Kirim code ke REPL, dijalankan langsung (tidak permanen).
     * Gunakan exec() — newline di dalam string Python via \n escape.
     */
    sendCode(code, onSend, onComplete) {
        // Escape: backslash, double-quote, lalu newlines jadi \n
        let escaped = code.replace(/\\/g, "\\\\");
        escaped = escaped.replace(/"/g, '\\"');
        escaped = escaped.replace(/\r\n/g, "\\n");
        escaped = escaped.replace(/\n/g, "\\n");
        escaped = escaped.replace(/\r/g, "\\r");
        const line = `exec("${escaped}")`;
        this._sendLine(line, onSend, onComplete);
    }

    /**
     * Upload code sebagai main.py (permanen) + jalanin.
     *
     * ALUR — BASE64:
     *   import base64;f=open('main.py','wb');f.write(base64.b64decode('...'));f.close()
     *
     * Base64 aman: cuma [A-Za-z0-9+/=] — zero escape issues.
     *
     * Step 2: exec(open('main.py').read())
     *
     * @param {string} code
     * @param {function} onSend
     * @param {function} [onComplete]
     */
    uploadMain(code, onSend, onComplete) {
        const b64 = toBase64(code);
        // MicroPython pake ubinascii, bukan base64.
        // a2b_base64 decode string base64 jadi bytes.
        const writeLine = `import ubinascii;f=open('main.py','wb');f.write(ubinascii.a2b_base64('${b64}'));f.close()`;
        this._sendLine(writeLine, onSend, () => {
            this._delay(() => {
                const execLine = 'exec(open("main.py").read())';
                this._sendLine(execLine, onSend, () => {
                    if (onComplete)
                        this._delay(() => onComplete({ success: true }), 300);
                });
            }, 2000);
        });
    }
}

export default MicropythonRunner;
