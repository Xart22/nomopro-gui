/**
 * Bridge for MicroPython upload mode.
 * Communicates with the Desktop backend via window.electronAPI.micropython.*
 * Desktop-only — upload mode is disabled in web (Pyodide only).
 */
class UploadBridge {
    constructor () {
        this._cleanupFns = [];
        this._backend = 'none';

        try {
            if (
                typeof window !== 'undefined' &&
                window.electronAPI &&
                window.electronAPI.micropython
            ) {
                this._backend = 'electron';
            }
        } catch (e) {
            // ignore
        }
    }

    isAvailable () {
        return this._backend === 'electron';
    }

    get backend () {
        return this._backend;
    }

    // =================================================================
    // FLASH FIRMWARE
    // =================================================================

    flashFirmware ({portPath, board} = {}) {
        if (!this.isAvailable()) throw new Error('Desktop only');
        return window.electronAPI.micropython.flash({
            portPath: portPath,
            board: board || 'esp32'
        });
    }

    // =================================================================
    // UPLOAD CODE
    // =================================================================

    uploadCode ({portPath, code, fileName, board, baudRate} = {}) {
        if (!this.isAvailable()) throw new Error('Desktop only');
        return window.electronAPI.micropython.upload({
            portPath: portPath,
            code: code,
            fileName: fileName || 'main.py',
            board: board || 'esp32',
            baudRate: baudRate || 115200
        });
    }

    // =================================================================
    // DETECT FIRMWARE
    // =================================================================

    detectFirmware ({portPath, baudRate} = {}) {
        if (!this.isAvailable()) throw new Error('Desktop only');
        return window.electronAPI.micropython.detect({
            portPath: portPath,
            baudRate: baudRate || 115200
        });
    }

    // =================================================================
    // SEND SERIAL INPUT (e.g., Ctrl+D to soft reboot)
    // =================================================================

    sendInput ({portPath, text} = {}) {
        if (!this.isAvailable()) return;
        window.electronAPI.micropython.sendInput({
            portPath: portPath,
            text: text
        });
    }

    softReset (portPath) {
        this.sendInput({portPath, text: '\x04'});
    }

    // =================================================================
    // PROGRESS EVENTS
    // =================================================================

    onProgress (callback) {
        if (!this.isAvailable()) return () => {};
        const cleanup = window.electronAPI.micropython.onProgress(callback);
        this._cleanupFns.push(cleanup);
        return cleanup;
    }

    onSerialOutput (callback) {
        if (!this.isAvailable()) return () => {};
        const cleanup = window.electronAPI.micropython.onSerialOutput(callback);
        this._cleanupFns.push(cleanup);
        return cleanup;
    }

    // =================================================================
    // CLEANUP
    // =================================================================

    dispose () {
        this._cleanupFns.forEach(fn => {
            try {
                fn();
            } catch (e) {
                // cleanup may fail silently
            }
        });
        this._cleanupFns = [];
    }
}

export default UploadBridge;
