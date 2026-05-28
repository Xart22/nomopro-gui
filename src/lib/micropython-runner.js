class MicropythonRunner {
    constructor () {
        this._outputBuffer = '';
        this._listener = null;
    }

    sendCode (code, onSend) {
        const lines = code.split('\n');
        onSend('\x05');
        setTimeout(() => {
            for (const line of lines) {
                onSend(`${line}\r\n`);
            }
            setTimeout(() => {
                onSend('\x04');
            }, (lines.length * 10) + 50);
        }, 150);
    }

    uploadMain (code, onSend, {shouldReset} = {}) {
        const escaped = code
            .replace(/\\/g, '\\\\')
            .replace(/'/g, "\\'")
            .replace(/\n/g, '\\n')
            .replace(/\r/g, '\\r');
        const resetCmd = shouldReset ? ';machine.soft_reset()' : '';
        const script = `import machine;f=open('main.py','w');f.write('${escaped}');f.close()${resetCmd}\r\n`;
        onSend('\x02');
        setTimeout(() => {
            onSend(`${script}\x04`);
        }, 200);
    }
}

export default MicropythonRunner;
