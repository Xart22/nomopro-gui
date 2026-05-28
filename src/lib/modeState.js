const MODE_BLOCK = 'block';
const MODE_PYTHON = 'python';

const isValidMode = mode => mode === MODE_BLOCK || mode === MODE_PYTHON;

const normalizeMode = mode =>
    (mode === MODE_PYTHON ? MODE_PYTHON : MODE_BLOCK);

const modeFromTab = (tabIndex, pythonTabIndex) =>
    (tabIndex === pythonTabIndex ? MODE_PYTHON : MODE_BLOCK);

const tabFromMode = (mode, blockTabIndex, pythonTabIndex) =>
    (mode === MODE_PYTHON ? pythonTabIndex : blockTabIndex);

const normalizeCode = code =>
    String(code || '')
        .replace(/\r\n/g, '\n')
        .trim();

const hasPythonModeContent = (filesByTargetId, defaultCode = '') => {
    const normalizedDefaultCode = normalizeCode(defaultCode);

    return Object.keys(filesByTargetId || {}).some(targetId => {
        const targetFile = filesByTargetId[targetId];
        const normalizedCode = normalizeCode(targetFile && targetFile.code);

        if (!normalizedCode) return false;
        if (normalizedDefaultCode && normalizedCode === normalizedDefaultCode) {
            return false;
        }
        return true;
    });
};

const hasBlockModeContent = vm => {
    const runtime = vm && vm.runtime;
    if (!runtime || !Array.isArray(runtime.targets)) return false;

    return runtime.targets.some(target => {
        const blocks = target && target.blocks && target.blocks._blocks;
        return blocks && Object.keys(blocks).length > 0;
    });
};

export {
    MODE_BLOCK,
    MODE_PYTHON,
    hasBlockModeContent,
    hasPythonModeContent,
    isValidMode,
    normalizeMode,
    modeFromTab,
    tabFromMode
};
