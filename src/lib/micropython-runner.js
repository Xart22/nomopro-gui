/**
 * Base64 encode string ke MicroPython compatible (pakai binascii.a2b_base64).
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

/**
 * Potong base64 string per raw-byte chunk (bukan per karakter base64),
 * agar tiap potongan decode-nya tidak melewati batas heap MicroPython.
 * CHUNK_BYTES = 3000 raw bytes → ~4000 karakter base64 → ~3000 bytes hasil decode.
 */
const CHUNK_BYTES = 3000;

const chunkBase64 = (b64, chunkBytes) => {
    // base64 4 karakter = 3 raw bytes. Jaga alignment ke kelipatan 3.
    const charCount = Math.floor(chunkBytes / 3) * 4;
    const chunks = [];
    for (let i = 0; i < b64.length; i += charCount) {
        chunks.push(b64.slice(i, i + charCount));
    }
    return chunks;
};

const RAW_BANNER = "raw REPL";
const RAW_TERMINATOR = "\x04";

class MicropythonRunner {
    constructor() {
        this._outputBuffer = "";
        this._listener = null;
        this._timeoutIds = [];
        this._rxBuffer = "";
        this._rxWaiter = null;
        this._cancelled = false;
    }

    dispose() {
        this._timeoutIds.forEach(clearTimeout);
        this._timeoutIds = [];
        this._clearRxWaiter();
    }

    _delay(fn, ms) {
        const id = setTimeout(() => {
            this._timeoutIds = this._timeoutIds.filter((t) => t !== id);
            fn();
        }, ms);
        this._timeoutIds.push(id);
        return id;
    }

    _sleep(ms) {
        return new Promise((resolve) => {
            const id = setTimeout(() => {
                this._timeoutIds = this._timeoutIds.filter((t) => t !== id);
                resolve();
            }, ms);
            this._timeoutIds.push(id);
        });
    }

    _clearRxWaiter() {
        if (this._rxWaiter) {
            if (this._rxWaiter.timer) clearTimeout(this._rxWaiter.timer);
            this._rxWaiter.reject(new Error("cancelled"));
            this._rxWaiter = null;
        }
    }

    /**
     * Feed byte/string yang diterima dari stream PERIPHERAL_RECIVE_DATA.
     * Dipanggil container saat ada data masuk dari device.
     * @param {string} chunk
     */
    feedRx(chunk) {
        if (!chunk) return;
        this._rxBuffer += chunk;
        // Cap buffer agar output user yang membanjiri (loop print) tidak
        // membengkakkan memori renderer dan membebani jalur serial.
        if (this._rxBuffer.length > 65536) {
            this._rxBuffer = this._rxBuffer.slice(-32768);
        }

        const w = this._rxWaiter;
        if (!w) return;
        const idx = this._rxBuffer.indexOf(w.marker);
        if (idx < 0) return;

        this._rxBuffer = this._rxBuffer.substring(idx + w.marker.length);
        this._rxWaiter = null;
        if (w.timer) clearTimeout(w.timer);
        w.resolve();
    }

    /**
     * Tunggu marker muncul di stream RX.
     * @param {string} marker
     * @param {number} timeoutMs
     */
    waitForMarker(marker, timeoutMs = 10000) {
        return new Promise((resolve, reject) => {
            const idx = this._rxBuffer.indexOf(marker);
            if (idx >= 0) {
                this._rxBuffer = this._rxBuffer.substring(idx + marker.length);
                resolve();
                return;
            }
            const waiter = { marker, resolve, reject, timer: null };
            waiter.timer = setTimeout(() => {
                if (this._rxWaiter === waiter) this._rxWaiter = null;
                reject(
                    new Error(
                        `Timeout menunggu marker ${JSON.stringify(marker)}`,
                    ),
                );
            }, timeoutMs);
            this._rxWaiter = waiter;
        });
    }

    /**
     * Kirim command Python di raw REPL lalu tunggu terminator \x04.
     * Raw REPL menjamin response berakhir dengan \x04 setelah OK + output.
     */
    async execRaw(command, onSend, timeoutMs = 10000) {
        onSend(`${command}\x04`);
        await this.waitForMarker(RAW_TERMINATOR, timeoutMs);
    }

    /**
     * Masuk raw REPL: interrupt 2x + Ctrl+A, tunggu banner raw REPL.
     * Tunggu banner lengkap "raw REPL" — bukan cuma ">" — karena friendly
     * REPL banner ">>> " juga mengandung ">" dan membuat prompt ketemu
     * sebelum device benar-benar masuk raw mode (desync → incorrect padding).
     */
    async enterRawRepl(onSend) {
        this._rxBuffer = "";
        onSend("\r\x03");
        await this._sleep(200);
        onSend("\x03");
        await this._sleep(200);
        onSend("\x01");
        await this.waitForMarker("raw REPL", 3000);
    }

    /**
     * Keluar raw REPL: Ctrl+B (soft reset ke friendly REPL).
     */
    exitRawRepl(onSend) {
        onSend("\x02");
    }

    /**
     * Kirim code ke REPL, dijalankan langsung (tidak permanen).
     * Gunakan base64 + raw REPL agar bebas echo/prompt dan aman semua karakter.
     */
    async sendCode(code, onSend, onComplete) {
        try {
            await this.enterRawRepl(onSend);
            const b64 = toBase64(code);
            const command = `import binascii;exec(binascii.a2b_base64('${b64}').decode())`;
            await this.execRaw(command, onSend, 15000);
            this.exitRawRepl(onSend);
            if (onComplete) onComplete({ success: true });
        } catch (e) {
            this.exitRawRepl(onSend);
            if (onComplete) onComplete({ success: false, error: e.message });
        }
    }

    /**
     * Upload multiple files ke MicroPython dengan folder structure preserved.
     * Thonny-style: raw REPL + base64 chunked + flow control per chunk.
     *
     * @param {Array<{path: string, name: string, content: string}>} files
     * @param {Array<string>} folders — daftar folder unik (sorted shortest first)
     * @param {function} onSend — (data) => void
     * @param {function} [onProgress] — (current, total, label) => void
     * @param {function} [onComplete] — ({success: boolean}) => void
     */
    async uploadFiles(files, folders, onSend, onProgress, onComplete) {
        if (!files || files.length === 0) {
            if (onComplete) onComplete({ success: false, error: "no files" });
            return;
        }

        this._cancelled = false;
        const folderList = folders || [];
        const totalSteps = folderList.length + files.length;

        try {
            await this.enterRawRepl(onSend);
            // Import sekali di awal raw REPL. sendCode memakai import inline,
            // tapi uploadFiles menulis chunk dengan binascii.a2b_base64()
            // tanpa import — tanpa ini tiap chunk melempar NameError.
            await this.execRaw("import binascii", onSend, 10000);

            for (let i = 0; i < folderList.length; i++) {
                if (this._cancelled) {
                    this.exitRawRepl(onSend);
                    if (onComplete)
                        onComplete({ success: false, error: "cancelled" });
                    return;
                }
                const folder = folderList[i];
                if (onProgress) onProgress(i, totalSteps, `mkdir: ${folder}`);
                await this.execRaw(
                    `try:\n import os; os.mkdir('${folder}')\nexcept: pass`,
                    onSend,
                    10000,
                );
            }

            for (let i = 0; i < files.length; i++) {
                if (this._cancelled) {
                    this.exitRawRepl(onSend);
                    if (onComplete)
                        onComplete({ success: false, error: "cancelled" });
                    return;
                }
                const file = files[i];
                const stepIdx = folderList.length + i;
                if (onProgress) onProgress(stepIdx, totalSteps, file.path);

                await this.execRaw(
                    `f=open('${file.path}','wb')`,
                    onSend,
                    10000,
                );

                const b64 = toBase64(file.content);
                const chunks = chunkBase64(b64, CHUNK_BYTES);
                for (let c = 0; c < chunks.length; c++) {
                    if (this._cancelled) break;
                    await this.execRaw(
                        `f.write(binascii.a2b_base64('${chunks[c]}'))`,
                        onSend,
                        15000,
                    );
                    // Jeda kecil antar chunk: jaga sustained burst write tidak
                    // menjenuhkan driver USB-serial Windows (WDF_VIOLATION).
                    await this._sleep(10);
                    if ((c + 1) % 10 === 0) {
                        await this.execRaw(
                            "import gc;gc.collect()",
                            onSend,
                            10000,
                        );
                    }
                }

                await this.execRaw("f.close()", onSend, 10000);
            }

            // exitRawRepl kirim \x02 = soft reset. MicroPython soft reset
            // otomatis menjalankan boot.py lalu main.py. Jangan tambah
            // exec(open("main.py").read()) lagi — itu menyebabkan main.py
            // dieksekusi berkali-kali dan membanjiri jalur serial.
            this.exitRawRepl(onSend);

            if (onComplete) onComplete({ success: true });
        } catch (e) {
            this.exitRawRepl(onSend);
            if (onComplete) onComplete({ success: false, error: e.message });
        }
    }

    /**
     * Cancel upload yang sedang berjalan.
     */
    cancelUpload() {
        this._cancelled = true;
        this._clearRxWaiter();
    }
}

export default MicropythonRunner;
