/**
 * Base64 encode string ke MicroPython compatible (pakai ubinascii.a2b_base64).
 * Selalu encode via TextEncoder → binary string → btoa().
 * btoa() cuma terima Latin1 (0-255), jadi kita harus convert UTF-8 bytes dulu.
 */
const toBase64 = (str) => {
    // Node.js: Buffer native
    if (typeof Buffer !== "undefined") {
        return Buffer.from(str, "utf-8").toString("base64");
    }
    // Browser / Web Worker: TextEncoder → uint8 → binary → btoa
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

    /**
     * Upload multiple files ke MicroPython dengan folder structure preserved.
     * Thonny-style: mkdir dulu, lalu write file via Base64.
     *
     * @param {Array<{path: string, name: string, content: string}>} files
     * @param {Array<string>} folders — daftar folder unik (sorted shortest first)
     * @param {function} onSend — (data) => void
     * @param {function} [onProgress] — (current, total, label) => void
     * @param {function} [onComplete] — ({success: boolean}) => void
     */
    uploadFiles(files, folders, onSend, onProgress, onComplete) {
        if (!files || files.length === 0) {
            if (onComplete)
                this._delay(() => onComplete({ success: false }), 100);
            return;
        }

        let step = 0;
        const totalSteps = (folders ? folders.length : 0) + files.length;
        this._cancelled = false;

        const next = () => {
            if (this._cancelled) {
                if (onComplete)
                    this._delay(() => onComplete({ success: false }), 100);
                return;
            }

            // Step 1: Buat folder dulu
            if (folders && step < folders.length) {
                const folder = folders[step];
                if (onProgress)
                    onProgress(step, totalSteps, `mkdir: ${folder}`);
                // Gunakan sendCode (sama seperti handleRunRepl) — sudah teruji
                // untuk multi-line Python via exec() dengan \\n escape
                const pyCode = `try:\n import uos; uos.mkdir('${folder}')\nexcept: pass`;
                this.sendCode(pyCode, onSend, () => {
                    step++;
                    this._delay(next, 300);
                });
                return;
            }

            // Step 2: Upload file
            const fileIdx = step - (folders ? folders.length : 0);
            if (fileIdx >= files.length) {
                // Semua selesai — cek main.py untuk auto-exec
                const hasMain = files.some(
                    (f) => f.path === "main.py" || f.name === "main.py",
                );
                if (hasMain) {
                    this._delay(() => {
                        const execLine = 'exec(open("main.py").read())';
                        this._sendLine(execLine, onSend, () => {
                            if (onComplete)
                                this._delay(
                                    () => onComplete({ success: true }),
                                    300,
                                );
                        });
                    }, 1000);
                } else if (onComplete) {
                    this._delay(() => onComplete({ success: true }), 300);
                }
                return;
            }

            const file = files[fileIdx];
            if (onProgress) onProgress(step, totalSteps, file.path);

            const b64 = toBase64(file.content);
            const writeLine = `import ubinascii;f=open('${file.path}','wb');f.write(ubinascii.a2b_base64('${b64}'));f.close()`;

            this._sendLine(writeLine, onSend, () => {
                step++;
                this._delay(next, 500);
            });
        };

        next();
    }

    /**
     * Cancel upload yang sedang berjalan.
     */
    cancelUpload() {
        this._cancelled = true;
    }
}

export default MicropythonRunner;
