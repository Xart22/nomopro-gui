const PYTHON_IDE_STATE_VARIABLE_NAME = '__nomopro_python_ide_state__';

const createVariableId = () =>
    `pyide_${Date.now()}_${Math.random().toString(36)
        .slice(2, 10)}`;

const findStateVariable = stageTarget => {
    if (!stageTarget || !stageTarget.variables) return null;
    const variableIds = Object.keys(stageTarget.variables);
    for (let i = 0; i < variableIds.length; i += 1) {
        const variable = stageTarget.variables[variableIds[i]];
        if (variable && variable.name === PYTHON_IDE_STATE_VARIABLE_NAME) {
            return variable;
        }
    }
    return null;
};

const normalizeExpandedFolderIds = expandedFolderIds => {
    if (expandedFolderIds instanceof Set) {
        return Array.from(expandedFolderIds);
    }
    if (Array.isArray(expandedFolderIds)) {
        return expandedFolderIds.filter(id => typeof id === 'string');
    }
    return [];
};

const sanitizeSnapshot = snapshot => {
    if (!snapshot || typeof snapshot !== 'object') return null;

    const filesByTargetId =
        snapshot.filesByTargetId && typeof snapshot.filesByTargetId === 'object' ?
            snapshot.filesByTargetId :
            {};

    const fileTree = Array.isArray(snapshot.fileTree) ? snapshot.fileTree : [];

    const expandedFolderIds = normalizeExpandedFolderIds(
        snapshot.expandedFolderIds,
    );

    const activeTargetId =
        typeof snapshot.activeTargetId === 'string' ?
            snapshot.activeTargetId :
            null;

    const moduleLibraryItems =
        Array.isArray(snapshot.moduleLibraryItems) ?
            snapshot.moduleLibraryItems :
            null;

    return {
        filesByTargetId,
        fileTree,
        expandedFolderIds,
        activeTargetId,
        moduleLibraryItems
    };
};

const serializePythonIdeSnapshot = pythonIdeState => {
    const snapshot = sanitizeSnapshot(pythonIdeState);
    if (!snapshot) return '';
    return JSON.stringify(snapshot);
};

const savePythonIdeStateToVm = (vm, pythonIdeState) => {
    const runtime = vm && vm.runtime;
    const stageTarget =
        runtime && typeof runtime.getTargetForStage === 'function' ?
            runtime.getTargetForStage() :
            null;
    if (!stageTarget) return false;

    const serialized = serializePythonIdeSnapshot(pythonIdeState);
    if (!serialized) return false;

    let variable = findStateVariable(stageTarget);
    if (!variable) {
        const id = createVariableId();
        variable = {
            id,
            name: PYTHON_IDE_STATE_VARIABLE_NAME,
            type: '',
            value: '',
            isCloud: false
        };
        if (!stageTarget.variables) stageTarget.variables = {};
        stageTarget.variables[id] = variable;
    }

    variable.value = serialized;
    return true;
};

const loadPythonIdeStateFromVm = vm => {
    const runtime = vm && vm.runtime;
    const stageTarget =
        runtime && typeof runtime.getTargetForStage === 'function' ?
            runtime.getTargetForStage() :
            null;
    if (!stageTarget) return null;

    const variable = findStateVariable(stageTarget);
    if (!variable || typeof variable.value !== 'string') return null;

    try {
        const parsed = JSON.parse(variable.value);
        return sanitizeSnapshot(parsed);
    } catch (error) {
        return null;
    }
};

const hasPythonIdeContent = snapshot => {
    if (!snapshot) return false;
    const hasFiles =
        snapshot.filesByTargetId &&
        typeof snapshot.filesByTargetId === 'object' &&
        Object.keys(snapshot.filesByTargetId).length > 0;
    const hasTree =
        Array.isArray(snapshot.fileTree) && snapshot.fileTree.length > 0;
    return Boolean(hasFiles || hasTree);
};

export {
    savePythonIdeStateToVm,
    loadPythonIdeStateFromVm,
    hasPythonIdeContent
};
