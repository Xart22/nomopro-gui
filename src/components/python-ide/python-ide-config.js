import extensionLibraryContent from '../../lib/libraries/extensions/index.jsx';

export const STORAGE = {
    MODULES: 'python-ide-modules-v1',
    PRELOAD: 'python-ide-preload-pyodide'
};

export const UPLOAD_CONFIG = {
    any: {accept: '*/*'},
    python: {
        accept: '.py,text/x-python,text/plain',
        extensions: ['.py'],
        mimeStartsWith: ['text/x-python', 'application/x-python-code']
    },
    text: {
        accept: '.txt,text/plain',
        extensions: ['.txt', '.log', '.md', '.json']
    },
    csv: {
        accept: '.csv,text/csv',
        extensions: ['.csv'],
        mimeContains: ['csv']
    },
    audio: {
        accept: 'audio/*,.mp3,.wav,.ogg,.m4a,.aac',
        extensions: ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac'],
        mimeStartsWith: ['audio/']
    },
    video: {
        accept: 'video/*,.mp4,.webm,.mov,.avi,.mkv',
        extensions: ['.mp4', '.webm', '.mov', '.avi', '.mkv', '.mpeg'],
        mimeStartsWith: ['video/']
    },
    image: {
        accept: 'image/*,.png,.jpg,.jpeg,.gif,.webp,.bmp,.svg',
        extensions: ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.svg'],
        mimeStartsWith: ['image/']
    }
};

export const PYODIDE_CONFIG = {
    VERSION: 'v0.26.4',
    CDN: 'https://cdn.jsdelivr.net/pyodide'
};

export const FILE_EXTENSIONS = {
    IMAGE: ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.svg'],
    TEXT: ['.py', '.txt', '.csv', '.json', '.md', '.log'],
    READABLE: ['.py', '.txt', '.csv', '.json', '.md', '.log']
};

export const getPythonExtensions = () =>
    (extensionLibraryContent || [])
        .filter(ext => !ext.disabled)
        .map(ext => ({
            id: String(ext.extensionId || 'Extension'),
            name:
                ext.name?.props?.defaultMessage ||
                String(ext.extensionId || 'Extension')
        }));
