class MicropythonFlasher {
    constructor () {
        this._cleanup = null;
        this._flashing = false;
    }

    isAvailable () {
        return typeof window !== 'undefined' &&
      window.electronAPI &&
      typeof window.electronAPI.micropython?.flash === 'function';
    }

    async flashFirmware ({portPath, board} = {}, {onProgress} = {}) {
        if (this._flashing) {
            throw new Error('Already flashing');
        }
        if (!this.isAvailable()) {
            throw new Error('MicroPython flasher unavailable (desktop only)');
        }

        this._flashing = true;

        if (onProgress) {
            this._cleanup = window.electronAPI.micropython.onProgress(onProgress);
        }

        try {
            const result = await window.electronAPI.micropython.flash({
                portPath,
                board: board || 'esp32'
            });
            return result;
        } finally {
            this._flashing = false;
            if (this._cleanup) {
                this._cleanup();
                this._cleanup = null;
            }
        }
    }
}

export default MicropythonFlasher;
