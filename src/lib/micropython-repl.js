const PROMPT = ">>> ";
const CONTINUE_PROMPT = "... ";
const RAW_REPL_READY = ">";
const PASTE_MODE_MSG = "paste mode";

// Base64 encode UTF-8 dengan aman untuk browser (btoa hanya Latin1).
const toBase64 = (str) => {
    const bytes = new TextEncoder().encode(str);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
};

class MicropythonRepl {
    constructor() {
        this._buffer = "";
        this._expecting = null;
        this._responseResolve = null;
        this._responseTimeout = null;
    }

    static isPrompt(text) {
        return text.endsWith(PROMPT) || text.endsWith(CONTINUE_PROMPT);
    }

    static stripPrompt(text) {
        return text
            .replace(new RegExp(`${PROMPT.replace(/\s/g, "\\s")}$`), "")
            .replace(
                new RegExp(`${CONTINUE_PROMPT.replace(/\s/g, "\\s")}$`),
                "",
            );
    }

    sendSoftReset(onSend) {
        onSend("\x04");
    }

    sendInterrupt(onSend) {
        onSend("\x03");
    }

    sendEnterRawRepl(onSend) {
        // MicroPython: enter raw REPL = Ctrl+A (0x01). Ctrl+B (0x02)
        // adalah soft reset/normal boot, bukan enter raw REPL.
        onSend("\x01");
    }

    sendExitRawRepl(onSend) {
        onSend("\x02");
    }

    sendEnterPasteMode(onSend) {
        onSend("\x05");
    }

    sendExecutePaste(onSend) {
        onSend("\x04");
    }

    sendLine(line, onSend) {
        onSend(`${line}\r\n`);
    }

    sendCode(code, onSend) {
        this.sendEnterPasteMode(onSend);
        setTimeout(() => {
            const lines = code.split("\n");
            for (const line of lines) {
                onSend(`${line}\r\n`);
            }
            setTimeout(() => {
                this.sendExecutePaste(onSend);
            }, 50);
        }, 100);
    }

    sendFile(name, content, onSend) {
        // MicroPython raw REPL file write via Base64 (aman semua karakter).
        const b64 = toBase64(content);
        const script =
            `import ubinascii;f=open('${name}','wb');` +
            `f.write(ubinascii.a2b_base64('${b64}'));f.close()\r\n`;
        this.sendEnterRawRepl(onSend);
        setTimeout(() => {
            onSend(`${script}\x04`);
        }, 100);
    }

    processChunk(chunk) {
        this._buffer += chunk;

        // Deteksi prompt sinkron — selalu cek, tidak bergantung _expecting
        const promptIdx = this._buffer.lastIndexOf(PROMPT);
        if (promptIdx >= 0) {
            const output = this._buffer.substring(0, promptIdx);
            this._buffer = this._buffer.substring(promptIdx + PROMPT.length);
            return { output, prompt: true };
        }

        const contIdx = this._buffer.lastIndexOf(CONTINUE_PROMPT);
        if (contIdx >= 0) {
            const output = this._buffer.substring(0, contIdx);
            this._buffer = this._buffer.substring(
                contIdx + CONTINUE_PROMPT.length,
            );
            return { output, prompt: true };
        }

        if (this._responseResolve) {
            const result = this._checkForResponse();
            if (result !== null) {
                return result;
            }
        }

        return null;
    }

    _checkForResponse() {
        const buffer = this._buffer;
        const expecting = this._expecting;

        if (expecting === "prompt") {
            if (buffer.includes(PROMPT)) {
                const idx = buffer.lastIndexOf(PROMPT) + PROMPT.length;
                const output = buffer.substring(0, idx - PROMPT.length);
                this._buffer = buffer.substring(idx);
                this._expecting = null;
                this._clearTimeout();
                this._responseResolve({ output, prompt: true });
                this._responseResolve = null;
                return { output, prompt: true };
            }
        } else if (expecting === "raw_reply") {
            const readyIdx = buffer.lastIndexOf(RAW_REPL_READY);
            if (readyIdx >= 0) {
                const output = buffer.substring(0, readyIdx);
                this._buffer = buffer.substring(readyIdx + 1);
                this._expecting = null;
                this._clearTimeout();
                this._responseResolve({ output, rawReady: true });
                this._responseResolve = null;
                return { output, rawReady: true };
            }
        } else if (expecting === "paste_ok") {
            if (buffer.includes(PASTE_MODE_MSG)) {
                this._expecting = "prompt";
                const output = this._buffer.substring(
                    0,
                    this._buffer.indexOf(PASTE_MODE_MSG) +
                        PASTE_MODE_MSG.length,
                );
                this._buffer = "";
                return { output, pasteMode: true };
            }
        }

        return null;
    }

    waitForPrompt(timeout = 5000) {
        return new Promise((resolve, reject) => {
            this._expecting = "prompt";
            this._responseResolve = resolve;
            this._responseTimeout = setTimeout(() => {
                this._expecting = null;
                this._responseResolve = null;
                reject(new Error("Timeout waiting for MicroPython prompt"));
            }, timeout);
        });
    }

    _clearTimeout() {
        if (this._responseTimeout) {
            clearTimeout(this._responseTimeout);
            this._responseTimeout = null;
        }
    }

    reset() {
        this._buffer = "";
        this._expecting = null;
        this._responseResolve = null;
        this._clearTimeout();
    }
}

export default MicropythonRepl;
