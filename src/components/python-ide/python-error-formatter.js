export function formatPythonError (raw) {
    if (!raw) return '';

    const msg = raw.replace(/^\[(Python run failed|VM command error)\]\s*/i, '').trim();

    const lines = msg.split('\n').map(l => l.trim())
        .filter(Boolean);
    const lastLine = lines[lines.length - 1] || msg;

    const errorMatch = lastLine.match(/^(\w+Error|SyntaxError|IndentationError|TabError|EOFError|OSError):\s*(.*)/);
    let errorLine = errorMatch ? lastLine : null;

    if (!errorMatch) {
        const m = lastLine.match(/^(SyntaxError):\s*(.*)/i);
        if (m) errorLine = lastLine;
    }

    let lineNumber = null;
    for (const l of lines) {
        const m = l.match(/<exec>.*line\s+(\d+)/i);
        if (m) lineNumber = String(parseInt(m[1], 10) - 1);
    }
    if (!lineNumber) {
        for (const l of lines) {
            const m = l.match(/line\s+(\d+)/i);
            if (m) lineNumber = m[1];
        }
    }

    if (errorLine) {
        return lineNumber ?
            `${errorLine}\nThe above error occurred on line ${lineNumber}` :
            errorLine;
    }

    if (/^Traceback/i.test(lastLine) || /^File\s+"[^"]*",\s*line\s+\d+/i.test(lastLine) || /^\s+(File|from|in)/i.test(lastLine)) {
        return raw;
    }

    return lineNumber ?
        `${lastLine}\nThe above error occurred on line ${lineNumber}` :
        lastLine;
}
