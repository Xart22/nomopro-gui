import {FILE_EXTENSIONS, UPLOAD_CONFIG} from './python-ide-config';

export const getFileExt = fileName => {
    const value = String(fileName || '').toLowerCase();
    const dotIndex = value.lastIndexOf('.');
    return dotIndex < 0 ? '' : value.slice(dotIndex);
};

export const isFileAllowedForUploadType = (file, uploadType) => {
    if (!uploadType || uploadType === 'any') return true;
    const config = UPLOAD_CONFIG[uploadType];
    if (!config) return true;

    const ext = getFileExt(file?.name);
    const mime = String(file?.type || '').toLowerCase();

    const matchExt = config.extensions?.some(e => ext === e);
    const matchMime = config.mimeStartsWith?.some(p => mime.startsWith(p));
    const matchContains = config.mimeContains?.some(s => mime.includes(s));

    return Boolean(matchExt || matchMime || matchContains);
};

export const isImageFile = fileName =>
    FILE_EXTENSIONS.IMAGE.some(ext =>
        String(fileName || '').toLowerCase()
            .endsWith(ext),
    );

export const isTextReadableFile = file => {
    const fileName = String(file?.name || '').toLowerCase();
    const fileType = String(file?.type || '').toLowerCase();
    return (
        fileType.startsWith('text/') ||
        FILE_EXTENSIONS.READABLE.some(ext => fileName.endsWith(ext))
    );
};

export const isImageDataUrl = value =>
    /^data:image\//i.test(String(value || ''));

export const generateUniqueId = () =>
    `user_file_${Date.now()}_${Math.random().toString(36)
        .slice(2, 10)}`;
