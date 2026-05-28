const normalizeText = value =>
    (typeof value === 'string' ? value : String(value || ''));

const isCommandObject = value => {
    if (!value || typeof value !== 'object') return false;
    return typeof value.cmd === 'string' || typeof value.action === 'string';
};

export const parseNdjsonCommandLine = line => {
    const trimmed = normalizeText(line).trim();
    if (!trimmed || (trimmed[0] !== '{' && trimmed[0] !== '[')) return [];

    try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
            return parsed.filter(isCommandObject);
        }
        if (isCommandObject(parsed)) {
            return [parsed];
        }
        return [];
    } catch (e) {
        return [];
    }
};
