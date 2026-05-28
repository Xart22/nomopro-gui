const SET_ACTIVE_TARGET = 'scratch-gui/python-ide/SET_ACTIVE_TARGET';
const INIT_TARGET_FILE = 'scratch-gui/python-ide/INIT_TARGET_FILE';
const UPDATE_TARGET_CODE = 'scratch-gui/python-ide/UPDATE_TARGET_CODE';
const CREATE_FOLDER = 'scratch-gui/python-ide/CREATE_FOLDER';
const CREATE_FILE = 'scratch-gui/python-ide/CREATE_FILE';
const TOGGLE_FOLDER_EXPAND = 'scratch-gui/python-ide/TOGGLE_FOLDER_EXPAND';
const RESET_PYTHON_IDE_STATE = 'scratch-gui/python-ide/RESET_PYTHON_IDE_STATE';
const RENAME_TREE_ITEM = 'scratch-gui/python-ide/RENAME_TREE_ITEM';
const DELETE_TREE_ITEM = 'scratch-gui/python-ide/DELETE_TREE_ITEM';
const MOVE_TREE_ITEM = 'scratch-gui/python-ide/MOVE_TREE_ITEM';
const DUPLICATE_TREE_ITEM = 'scratch-gui/python-ide/DUPLICATE_TREE_ITEM';
const RESTORE_PYTHON_IDE_STATE =
    'scratch-gui/python-ide/RESTORE_PYTHON_IDE_STATE';
const SET_MODULE_LIBRARY_ITEMS =
    'scratch-gui/python-ide/SET_MODULE_LIBRARY_ITEMS';

const createUniqueId = prefix => `${prefix}_${Date.now()}_${Math.random()}`;

const getDescendantIds = (fileTree, rootId) => {
    const descendants = [];
    const queue = [rootId];

    while (queue.length > 0) {
        const currentId = queue.shift();
        const children = (fileTree || []).filter(
            item => item.parentId === currentId,
        );
        children.forEach(child => {
            descendants.push(child.id);
            queue.push(child.id);
        });
    }

    return descendants;
};

const toCopyName = name => {
    const value = String(name || 'item');
    const extIndex = value.lastIndexOf('.');
    if (extIndex > 0) {
        return `${value.slice(0, extIndex)}-copy${value.slice(extIndex)}`;
    }
    return `${value}-copy`;
};

const createDefaultCode = (targetName, targetType = 'sprite') => {
    const name = targetName || (targetType === 'stage' ? 'Stage' : 'Sprite');

    if (targetType === 'stage') {
        return [
            '# Stage.py',
            'stage = Sprite()',
            '',
            '# Stage-friendly template',
            'stage.say("Stage ready!")',
            'stage.wait(0.3)',
            'stage.think("Edit this Stage script")'
        ].join('\n');
    }

    return [
        `# ${name}.py`,
        `sprite = Sprite('${name}')`,
        '',
        '# Try basic commands below, then click Run',
        'sprite.say("Hello!")',
        'sprite.move(20)',
        'sprite.changeX(15)',
        'sprite.wait(0.3)',
        `sprite.think("Hello, I am ${name}")`
    ].join('\n');
};

const createTargetFile = (targetId, fileName, initialCode) => ({
    targetId,
    fileName,
    code: initialCode || createDefaultCode(),
    mode: 'manual',
    dirty: false,
    generatedFromBlocksAt: 0,
    editedAt: 0,
    generatorName: 'Python'
});

const initialState = {
    filesByTargetId: {},
    activeTargetId: null,
    fileTree: [], // Array of { id, type: 'file'|'folder', name, parentId, targetId (for files) }
    expandedFolderIds: new Set(),
    moduleLibraryItems: [
        {name: 'Sprite', core: true},
        {name: 'Table', core: true}
    ],
    runState: {
        status: 'idle',
        lastOutput: '',
        lastError: ''
    }
};

const reducer = function (state, action) {
    if (typeof state === 'undefined') state = initialState;
    switch (action.type) {
    case SET_ACTIVE_TARGET:
        return Object.assign({}, state, {
            activeTargetId: action.targetId
        });
    case INIT_TARGET_FILE: {
        const existingTargetFile = state.filesByTargetId[action.targetId];
        if (existingTargetFile) {
            if (
                !action.fileName ||
                    existingTargetFile.fileName === action.fileName
            ) {
                return state;
            }

            const nextTargetFile = Object.assign({}, existingTargetFile, {
                fileName: action.fileName
            });

            // Keep template aligned with sprite/stage rename only for
            // untouched files. Once user edits manually (dirty=true),
            // preserve code as-is.
            if (!existingTargetFile.dirty && action.initialCode) {
                nextTargetFile.code = action.initialCode;
            }

            return Object.assign({}, state, {
                filesByTargetId: Object.assign({}, state.filesByTargetId, {
                    [action.targetId]: nextTargetFile
                })
            });
        }

        return Object.assign({}, state, {
            filesByTargetId: Object.assign({}, state.filesByTargetId, {
                [action.targetId]: createTargetFile(
                    action.targetId,
                    action.fileName,
                    action.initialCode,
                )
            })
        });
    }
    case UPDATE_TARGET_CODE: {
        const targetId = action.targetId || state.activeTargetId;
        if (!targetId) return state;

        const existingTargetFile =
                state.filesByTargetId[targetId] || createTargetFile(targetId);

        return Object.assign({}, state, {
            filesByTargetId: Object.assign({}, state.filesByTargetId, {
                [targetId]: Object.assign({}, existingTargetFile, {
                    code: action.code,
                    mode: 'manual',
                    dirty: true,
                    editedAt: Date.now()
                })
            })
        });
    }
    case CREATE_FOLDER: {
        const newFolderId = createUniqueId('folder');
        const newFolder = {
            id: newFolderId,
            type: 'folder',
            name: action.folderName,
            parentId: action.parentId || null
        };
        const updatedFileTree = [...state.fileTree, newFolder];
        return Object.assign({}, state, {
            fileTree: updatedFileTree,
            expandedFolderIds: new Set([
                ...state.expandedFolderIds,
                newFolderId
            ])
        });
    }
    case CREATE_FILE: {
        const newFileId = createUniqueId('file');
        const newFile = {
            id: newFileId,
            type: 'file',
            name: action.fileName,
            parentId: action.parentId || null,
            targetId: action.targetId
        };

        const nextFilesByTargetId = Object.assign(
            {},
            state.filesByTargetId,
        );
        if (action.targetId && action.initialCode) {
            nextFilesByTargetId[action.targetId] = createTargetFile(
                action.targetId,
                action.fileName,
                action.initialCode,
            );
        }

        const nextExpandedFolderIds = new Set(state.expandedFolderIds);
        if (action.parentId) {
            nextExpandedFolderIds.add(action.parentId);
        }

        return Object.assign({}, state, {
            fileTree: [...state.fileTree, newFile],
            filesByTargetId: nextFilesByTargetId,
            expandedFolderIds: nextExpandedFolderIds
        });
    }
    case TOGGLE_FOLDER_EXPAND: {
        const newExpandedIds = new Set(state.expandedFolderIds);
        if (newExpandedIds.has(action.folderId)) {
            newExpandedIds.delete(action.folderId);
        } else {
            newExpandedIds.add(action.folderId);
        }
        return Object.assign({}, state, {
            expandedFolderIds: newExpandedIds
        });
    }
    case RENAME_TREE_ITEM: {
        const updatedTree = state.fileTree.map(item =>
            (item.id === action.itemId ?
                Object.assign({}, item, {name: action.newName}) :
                item),
        );
        const renamedItem = state.fileTree.find(
            item => item.id === action.itemId,
        );

        if (
            renamedItem &&
                renamedItem.type === 'file' &&
                renamedItem.targetId &&
                state.filesByTargetId[renamedItem.targetId]
        ) {
            return Object.assign({}, state, {
                fileTree: updatedTree,
                filesByTargetId: Object.assign({}, state.filesByTargetId, {
                    [renamedItem.targetId]: Object.assign(
                        {},
                        state.filesByTargetId[renamedItem.targetId],
                        {
                            fileName: action.newName
                        },
                    )
                })
            });
        }

        return Object.assign({}, state, {
            fileTree: updatedTree
        });
    }
    case DELETE_TREE_ITEM: {
        const rootItem = state.fileTree.find(
            item => item.id === action.itemId,
        );
        if (!rootItem) return state;

        const descendantIds = getDescendantIds(
            state.fileTree,
            action.itemId,
        );
        const allRemovedIds = [action.itemId, ...descendantIds];
        const removedItems = state.fileTree.filter(item =>
            allRemovedIds.includes(item.id),
        );

        const removedTargetIds = removedItems
            .filter(item => item.type === 'file' && item.targetId)
            .map(item => item.targetId);

        const nextFilesByTargetId = Object.assign(
            {},
            state.filesByTargetId,
        );
        removedTargetIds.forEach(targetId => {
            delete nextFilesByTargetId[targetId];
        });

        const nextExpandedFolderIds = new Set(state.expandedFolderIds);
        allRemovedIds.forEach(id => nextExpandedFolderIds.delete(id));

        const nextActiveTargetId = removedTargetIds.includes(
            state.activeTargetId,
        ) ?
            null :
            state.activeTargetId;

        return Object.assign({}, state, {
            fileTree: state.fileTree.filter(
                item => !allRemovedIds.includes(item.id),
            ),
            filesByTargetId: nextFilesByTargetId,
            expandedFolderIds: nextExpandedFolderIds,
            activeTargetId: nextActiveTargetId
        });
    }
    case MOVE_TREE_ITEM: {
        const movingItem = state.fileTree.find(
            item => item.id === action.itemId,
        );
        if (!movingItem) return state;

        const isFolder = movingItem.type === 'folder';
        if (isFolder && action.newParentId) {
            const descendantIds = getDescendantIds(
                state.fileTree,
                movingItem.id,
            );
            if (descendantIds.includes(action.newParentId)) {
                return state;
            }
        }

        return Object.assign({}, state, {
            fileTree: state.fileTree.map(item =>
                (item.id === action.itemId ?
                    Object.assign({}, item, {
                        parentId: action.newParentId || null
                    }) :
                    item),
            )
        });
    }
    case DUPLICATE_TREE_ITEM: {
        const sourceRoot = state.fileTree.find(
            item => item.id === action.itemId,
        );
        if (!sourceRoot) return state;

        const descendants = getDescendantIds(state.fileTree, sourceRoot.id)
            .map(id => state.fileTree.find(item => item.id === id))
            .filter(Boolean);
        const sourceItems = [sourceRoot, ...descendants];
        const cloneIdMap = {};
        const clonedTreeItems = [];
        const nextFilesByTargetId = Object.assign(
            {},
            state.filesByTargetId,
        );

        sourceItems.forEach(item => {
            cloneIdMap[item.id] = createUniqueId(item.type);
        });

        sourceItems.forEach(item => {
            if (item.type === 'folder') {
                clonedTreeItems.push({
                    id: cloneIdMap[item.id],
                    type: 'folder',
                    name:
                            item.id === sourceRoot.id ?
                                toCopyName(item.name) :
                                item.name,
                    parentId:
                            item.id === sourceRoot.id ?
                                action.newParentId || null :
                                cloneIdMap[item.parentId] || null
                });
                return;
            }

            const nextTargetId = createUniqueId('user_file');
            const sourceFile = item.targetId ?
                state.filesByTargetId[item.targetId] :
                null;
            const nextFileName =
                    item.id === sourceRoot.id ?
                        toCopyName(item.name) :
                        item.name;

            clonedTreeItems.push({
                id: cloneIdMap[item.id],
                type: 'file',
                name: nextFileName,
                parentId:
                        item.id === sourceRoot.id ?
                            action.newParentId || null :
                            cloneIdMap[item.parentId] || null,
                targetId: nextTargetId
            });

            nextFilesByTargetId[nextTargetId] = createTargetFile(
                nextTargetId,
                nextFileName,
                sourceFile ? sourceFile.code : '',
            );
        });

        return Object.assign({}, state, {
            fileTree: [...state.fileTree, ...clonedTreeItems],
            filesByTargetId: nextFilesByTargetId
        });
    }
    case SET_MODULE_LIBRARY_ITEMS:
        return Object.assign({}, state, {
            moduleLibraryItems: Array.isArray(action.items) ?
                action.items :
                state.moduleLibraryItems
        });
    case RESET_PYTHON_IDE_STATE:
        return Object.assign({}, state, {
            filesByTargetId: {},
            activeTargetId: null,
            fileTree: [],
            expandedFolderIds: new Set(),
            moduleLibraryItems: initialState.moduleLibraryItems
        });
    case RESTORE_PYTHON_IDE_STATE: {
        const snapshot = action.snapshot || {};
        const nextFilesByTargetId =
                snapshot.filesByTargetId &&
                typeof snapshot.filesByTargetId === 'object' ?
                    snapshot.filesByTargetId :
                    {};
        const nextFileTree = Array.isArray(snapshot.fileTree) ?
            snapshot.fileTree :
            [];
        const nextExpandedFolderIds = Array.isArray(
            snapshot.expandedFolderIds,
        ) ?
            new Set(snapshot.expandedFolderIds) :
            new Set();
        const nextActiveTargetId =
                typeof snapshot.activeTargetId === 'string' ?
                    snapshot.activeTargetId :
                    null;

        const nextModuleLibraryItems =
                Array.isArray(snapshot.moduleLibraryItems) ?
                    snapshot.moduleLibraryItems :
                    state.moduleLibraryItems;

        return Object.assign({}, state, {
            filesByTargetId: nextFilesByTargetId,
            fileTree: nextFileTree,
            expandedFolderIds: nextExpandedFolderIds,
            activeTargetId: nextActiveTargetId,
            moduleLibraryItems: nextModuleLibraryItems
        });
    }
    default:
        return state;
    }
};

const setActiveTarget = targetId => ({
    type: SET_ACTIVE_TARGET,
    targetId
});

const initTargetFile = (targetId, fileName, initialCode) => ({
    type: INIT_TARGET_FILE,
    targetId,
    fileName,
    initialCode
});

const updateTargetCode = (targetId, code) => ({
    type: UPDATE_TARGET_CODE,
    targetId,
    code
});

// Backward-compatible alias for older call sites.
const setPythonIdeCode = code => ({
    type: UPDATE_TARGET_CODE,
    code
});

const createFolder = (folderName, parentId) => ({
    type: CREATE_FOLDER,
    folderName,
    parentId
});

const createFile = (fileName, parentId, targetId, initialCode) => ({
    type: CREATE_FILE,
    fileName,
    parentId,
    targetId,
    initialCode
});

const toggleFolderExpand = folderId => ({
    type: TOGGLE_FOLDER_EXPAND,
    folderId
});

const resetPythonIdeState = () => ({
    type: RESET_PYTHON_IDE_STATE
});

const restorePythonIdeState = snapshot => ({
    type: RESTORE_PYTHON_IDE_STATE,
    snapshot
});

const setModuleLibraryItems = items => ({
    type: SET_MODULE_LIBRARY_ITEMS,
    items
});

const renameTreeItem = (itemId, newName) => ({
    type: RENAME_TREE_ITEM,
    itemId,
    newName
});

const deleteTreeItem = itemId => ({
    type: DELETE_TREE_ITEM,
    itemId
});

const moveTreeItem = (itemId, newParentId) => ({
    type: MOVE_TREE_ITEM,
    itemId,
    newParentId
});

const duplicateTreeItem = (itemId, newParentId) => ({
    type: DUPLICATE_TREE_ITEM,
    itemId,
    newParentId
});

export {
    reducer as default,
    initialState as pythonIdeInitialState,
    createDefaultCode,
    setPythonIdeCode,
    setActiveTarget,
    initTargetFile,
    updateTargetCode,
    createFolder,
    createFile,
    toggleFolderExpand,
    resetPythonIdeState,
    restorePythonIdeState,
    setModuleLibraryItems,
    renameTreeItem,
    deleteTreeItem,
    moveTreeItem,
    duplicateTreeItem
};
