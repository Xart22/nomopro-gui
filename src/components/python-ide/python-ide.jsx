import React, {useRef, useState, useEffect} from 'react';
import PropTypes from 'prop-types';

import Box from '../box/box.jsx';
import CodeEditor from '../../containers/code-editor.jsx';
import {registerPythonCompletionProvider} from '../../lib/python-completion-provider';
import {STORAGE, UPLOAD_CONFIG} from './python-ide-config';
import {
    isFileAllowedForUploadType,
    isImageFile,
    isTextReadableFile,
    isImageDataUrl,
    generateUniqueId
} from './python-ide-utils';
import {createSyntaxValidator} from './python-analyzer';
import ContextMenu from './python-ide-context-menu.jsx';
import ModuleRow from './python-ide-module-row.jsx';
import InputModal from './input-modal.jsx';
import DesktopTools from './desktop-tools.jsx';
import TutorialOverlay, {TUTORIAL_STEPS} from './tutorial-overlay.jsx';
import SerialTerminal from './serial-terminal.jsx';
import ReplTerminal from './repl-terminal.jsx';
import FileTreeView from './file-tree-view.jsx';
import FloatingToolbar from './floating-toolbar.jsx';
import UploadToolbar from './upload-toolbar.jsx';

import useTerminalAutoScroll from './use-terminal-auto-scroll';
import usePyodideLoader from './use-pyodide-loader';
import pythonIcon from './python-logo.svg';
import {formatPythonError} from './python-error-formatter.js';

import styles from './python-ide.css';

const UPLOAD_ICONS = {
    video: '🎬',
    image: '🖼',
    csv: '📊',
    text: '📄',
    audio: '🎵',
    python: <img
        src={pythonIcon}
        className={styles.pythonIcon}
        alt=""
    />
};

const PythonIdeComponent = props => {
    const {
        activeFile,
        activeTargetId,
        fileList = [],
        fileTree = [],
        expandedFolderIds = new Set(),
        code = '',
        isRunning = false,
        runOutput,
        runError,
        spriteNames = [],
        deviceId = null,
        peripheralName,
        isMicroPythonDevice = false,
        isDeviceConnected = false,
        onSerialSend,
        onSerialBaudrate,
        onReplSend,
        onUploadToDevice,
        onUploadAsMain,
        onCodeChange,
        onRun,
        onRunAll,
        onStop,
        onClear,
        realtimeMode,
        onRealtimeModeChange,
        onSelectFile,
        onRenameTreeItem,
        onDeleteTreeItem,
        onMoveTreeItem,
        onDuplicateTreeItem,
        onCreateFolder,
        onCreateFile,
        onToggleFolderExpand,
        onOpenExtensionLibrary,
        moduleLibraryItems = [],
        onSetModuleLibraryItems,
        // MicroPython upload mode props
        supportsMicroPython = false,
        runtimeTarget = 'vm',
        onRuntimeTargetChange,
        firmwareStatus = 'unknown',
        mpIsUploading = false,
        mpUploadProgress = {stage: '', percent: 0},
        mpUploadLog = [],
        onFlashFirmware,
        onDetectFirmware,
        onUploadRun,
        onUploadOnly,
        onStopBoard
    } = props;

    const [isTerminalExpanded, setIsTerminalExpanded] = useState(false);
    const [activeBottomTab, setActiveBottomTab] = useState('output');
    const [showSearch, setShowSearch] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const terminalRef = useRef(null);
    const {isAutoScroll, setIsAutoScroll} = useTerminalAutoScroll(terminalRef, activeBottomTab);
    const [contextMenu, setContextMenu] = useState(null);
    const [contextTarget, setContextTarget] = useState(null);
    const [inputModal, setInputModal] = useState({
        isOpen: false,
        title: '',
        placeholder: '',
        callback: null
    });
    const [clipboardItem, setClipboardItem] = useState(null);
    const [uploadConfig, setUploadConfig] = useState('any');
    const [selectedFolderId, setSelectedFolderId] = useState(null);
    const [isDesktopToolsOpen, setIsDesktopToolsOpen] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [syntaxStatus, setSyntaxStatus] = useState('');
    const [, setPyodideLoading] = useState(false);
    usePyodideLoader();
    const [cursorPos, setCursorPos] = useState({line: 1, column: 1});
    const [zoomLevel, setZoomLevel] = useState(100);

    const [showTutorial, setShowTutorial] = useState(false);
    const [tutorialStep, setTutorialStep] = useState(0);
    const [tutorialDontShow, setTutorialDontShow] = useState(false);
    const tutorialSteps = TUTORIAL_STEPS.length;

    useEffect(() => {
        const dismissed = localStorage.getItem('python-ide-tutorial-dismissed');
        if (!dismissed) setShowTutorial(true);
    }, []);

    const handleTutorialFinish = () => {
        if (tutorialDontShow) {
            try {
                localStorage.setItem('python-ide-tutorial-dismissed', '1');
            } catch (e) {}
        }
        setShowTutorial(false);
        setTutorialStep(0);
    };
    const handleTutorialNext = () => {
        if (tutorialStep < tutorialSteps - 1) {
            setTutorialStep(s => s + 1);
        } else {
            handleTutorialFinish();
        }
    };
    const handleTutorialPrev = () => {
        if (tutorialStep > 0) setTutorialStep(s => s - 1);
    };
    const handleTutorialSkip = () => {
        setShowTutorial(false);
        setTutorialStep(0);
    };

    const handleUploadToDevice = async () => {
        if (isUploading || !onUploadToDevice) return;
        setIsUploading(true);
        try {
            await onUploadToDevice(code);
            setActiveBottomTab('repl');
        } catch (e) {
            console.error('Upload to device failed:', e);
        } finally {
            setIsUploading(false);
        }
    };

    const handleUploadAsMain = async () => {
        if (isUploading || !onUploadAsMain) return;
        setIsUploading(true);
        try {
            await onUploadAsMain(code);
            setActiveBottomTab('repl');
        } catch (e) {
            console.error('Upload as main.py failed:', e);
        } finally {
            setIsUploading(false);
        }
    };

    const editorRef = useRef(null);
    const monacoRef = useRef(null);
    const validateTimerRef = useRef(null);
    const uploadInputRef = useRef();
    const pendingUploadRef = useRef({type: 'any', parentId: null});
    const spriteNamesRef = useRef(spriteNames);
    spriteNamesRef.current = spriteNames;
    const deviceIdRef = useRef(deviceId);
    deviceIdRef.current = deviceId;

    useEffect(() => {
        // On mount: if localStorage has module entries and Redux prop only
        // has the default core items, migrate from localStorage to Redux.
        try {
            const stored = localStorage.getItem(STORAGE.MODULES);
            if (stored) {
                const parsed = JSON.parse(stored);
                if (
                    Array.isArray(parsed) &&
                    parsed.length > moduleLibraryItems.length
                ) {
                    onSetModuleLibraryItems?.(parsed);
                }
            }
        } catch (e) {}
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        const handleAddExtension = e => {
            const name = e && e.detail && e.detail.name;
            if (!name) return;
            if (
                moduleLibraryItems.some(
                    m => m.name.toLowerCase() === name.toLowerCase(),
                )
            ) {
                return;
            }
            const next = [...moduleLibraryItems, {name, core: false}];
            onSetModuleLibraryItems?.(next);
        };
        window.addEventListener('python-ide-add-extension', handleAddExtension);
        return () => {
            window.removeEventListener('python-ide-add-extension', handleAddExtension);
        };
    }, [moduleLibraryItems, onSetModuleLibraryItems]);

    useEffect(() => {
        try {
            localStorage.setItem(
                STORAGE.MODULES,
                JSON.stringify(moduleLibraryItems),
            );
        } catch (e) {}
    }, [moduleLibraryItems]);

    useEffect(() => {
        if (monacoRef.current) {
            registerPythonCompletionProvider(
                monacoRef.current,
                spriteNamesRef.current,
                deviceId,
            );
        }
    }, [deviceId]);

    const handleEditorWillMount = monaco => {
        registerPythonCompletionProvider(
            monaco,
            spriteNamesRef.current,
            deviceIdRef.current,
        );
    };

    const handleEditorDidMount = (editor, monaco) => {
        editorRef.current = editor;
        monacoRef.current = monaco;

        const glyphClass = styles['error-glyph'] || 'error-glyph';
        const validator = createSyntaxValidator(
            monaco,
            editor,
            setPyodideLoading,
            glyphClass,
        );

        const runValidation = async () => {
            let retries = 0;
            while (!window.pyodide && retries < 20) {
                await new Promise(r => setTimeout(r, 500));
                retries++;
            }
            validator(editor.getValue(), setSyntaxStatus);
        };
        runValidation().catch(err => {
            console.error('[PythonIDE] Initial validation error:', err);
        });

        editor.onDidChangeModelContent(() => {
            if (validateTimerRef.current) {
                clearTimeout(validateTimerRef.current);
            }
            validateTimerRef.current = setTimeout(() => {
                try {
                    validator(editor.getValue(), setSyntaxStatus);
                } catch (err) {}
            }, 250);
        });

        try {
            editor.onDidChangeCursorPosition(e => {
                const pos = e?.position || editor.getPosition();
                if (pos) {
                    setCursorPos({line: pos.lineNumber, column: pos.column});
                }
            });
        } catch (err) {}

        try {
            monaco.languages.registerHoverProvider('python', {
                provideHover (model, position) {
                    const word = model.getWordAtPosition(position);
                    if (!word) return null;
                    const line = model.getLineContent(position.lineNumber);
                    const isDefined =
                        /\b(def|class|import|=)\s+\w*/.test(line) ||
                        /\b(Sprite|Table|Stage|pen_down|pen_up|print)\b/.test(
                            word.word,
                        );
                    if (!isDefined) return null;
                    return {
                        contents: [
                            {language: 'python', value: word.word},
                            'Variable, function, or class defined in scope'
                        ]
                    };
                }
            });
        } catch (err) {}
    };

    const closeModal = () => {
        setInputModal({
            isOpen: false,
            title: '',
            placeholder: '',
            callback: null
        });
    };

    const createFileWithName = (
        title,
        placeholder,
        fileName,
        parentId = null,
    ) => {
        setInputModal({
            isOpen: true,
            title,
            placeholder,
            callback: input => {
                if (input?.trim() && onCreateFile) {
                    const cleanName = fileName ?
                        input
                            .trim()
                            .replace(new RegExp(`\\${fileName}$`, 'i'), '') +
                          fileName :
                        input.trim();
                    onCreateFile(
                        cleanName,
                        parentId || selectedFolderId || null,
                        generateUniqueId(),
                        '',
                    );
                }
                closeModal();
            }
        });
    };

    const startUpload = type => {
        const config = UPLOAD_CONFIG[type] || UPLOAD_CONFIG.any;
        pendingUploadRef.current = {type, parentId: selectedFolderId};
        setUploadConfig(config.accept);
        if (uploadInputRef.current) {
            uploadInputRef.current.accept = config.accept;
            uploadInputRef.current.value = '';
            uploadInputRef.current.click();
        }
    };

    const handleUploadedFile = event => {
        const file = event.target.files?.[0];
        if (!file || !onCreateFile) return;

        const {type, parentId} = pendingUploadRef.current;
        if (!isFileAllowedForUploadType(file, type)) {
            alert(`File type not allowed for ${type} upload.`);
            event.target.value = '';
            return;
        }

        const targetId = generateUniqueId();

        if (type === 'image') {
            const reader = new FileReader();
            reader.onload = e =>
                onCreateFile(
                    file.name,
                    parentId,
                    targetId,
                    String(e.target?.result || ''),
                );
            reader.readAsDataURL(file);
            event.target.value = '';
            return;
        }

        if (!isTextReadableFile(file)) {
            onCreateFile(
                file.name,
                parentId,
                targetId,
                [
                    `# Uploaded: ${file.name}`,
                    `# Type: ${file.type || 'unknown'}`,
                    `# Size: ${file.size} bytes`,
                    '',
                    '# Binary asset reference.'
                ].join('\n'),
            );
            event.target.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = e =>
            onCreateFile(
                file.name,
                parentId,
                targetId,
                String(e.target?.result || ''),
            );
        reader.readAsText(file);
        event.target.value = '';
    };

    const openContextMenuAt = (event, target) => {
        event.preventDefault();
        event.stopPropagation();
        setContextTarget(target || {scope: 'project'});
        setContextMenu({x: event.clientX, y: event.clientY});
    };

    const getContextMenuItems = () => {
        const target = contextTarget || {scope: 'project'};
        const parentId =
            target.scope === 'project' ?
                null :
                target.type === 'folder' ?
                    target.id :
                    target.parentId;
        const item =
            target.scope === 'project' ?
                null :
                fileTree?.find(i => i.id === target.id);
        const canPaste = Boolean(clipboardItem);

        return [
            {
                label: 'New folder',
                onClick: () =>
                    setInputModal({
                        isOpen: true,
                        title: 'New Folder',
                        placeholder: 'Folder name',
                        callback: input => {
                            if (input?.trim() && onCreateFolder) {
                                onCreateFolder(input.trim(), parentId);
                            }
                            closeModal();
                        }
                    })
            },
            {
                label: 'Create Python file',
                onClick: () =>
                    createFileWithName(
                        'Create Python File',
                        'Filename (without .py)',
                        '.py',
                        parentId,
                    )
            },
            {
                label: 'Create text file',
                onClick: () =>
                    createFileWithName(
                        'Create Text File',
                        'Filename (without .txt)',
                        '.txt',
                        parentId,
                    )
            },
            {label: 'Upload file', onClick: () => startUpload('any')},
            {type: 'separator'},
            {
                label: 'Cut',
                disabled: !item,
                onClick: () =>
                    item && setClipboardItem({mode: 'cut', itemId: item.id})
            },
            {
                label: 'Copy',
                disabled: !item,
                onClick: () =>
                    item && setClipboardItem({mode: 'copy', itemId: item.id})
            },
            {
                label: 'Paste',
                disabled: !canPaste || !onMoveTreeItem || !onDuplicateTreeItem,
                onClick: () => {
                    if (!canPaste) return;
                    const destParentId =
                        target.scope === 'project' ?
                            null :
                            target.type === 'folder' ?
                                target.id :
                                target.parentId;
                    if (clipboardItem.mode === 'cut') {
                        onMoveTreeItem?.(clipboardItem.itemId, destParentId);
                        setClipboardItem(null);
                    } else {
                        onDuplicateTreeItem?.(
                            clipboardItem.itemId,
                            destParentId,
                        );
                    }
                }
            },
            {
                label: 'Rename',
                disabled: !item,
                onClick: () =>
                    item &&
                    setInputModal({
                        isOpen: true,
                        title: 'Rename',
                        placeholder: 'New name',
                        callback: newName => {
                            if (newName?.trim()) {
 onRenameTreeItem?.(item.id, newName.trim());
                            }
                            closeModal();
                        }
                    })
            },
            {type: 'separator'},
            {
                label: 'Delete',
                disabled: !item,
                onClick: () => item && onDeleteTreeItem?.(item.id)
            }
        ];
    };

    const handleFileContext = (e, item) => openContextMenuAt(e, item);

    const customFileTargetIds = new Set(
        (fileTree || [])
            .filter(i => i.type === 'file' && i.targetId)
            .map(i => i.targetId),
    );
    const spriteScripts = (fileList || []).filter(
        f => !customFileTargetIds.has(f.targetId),
    );

    const isImagePreviewActive = isImageFile(activeFile);
    const imagePreviewSrc = isImageDataUrl(code) ? code : null;

    return (
        <Box className={styles.pythonIdeWrapper}>
            <Box className={styles.workspaceArea}>
                <Box
                    className={styles.sidebar}
                    data-tutorial="sidebar"
                >
                    <Box
                        className={`${styles.sidebarSection} ${styles.projectExplorerSection}`}
                    >
                        <Box className={styles.sidebarTitleContainer}>
                            <Box className={styles.sidebarTitle}>
                                Project Explorer
                            </Box>
                            <button
                                className={styles.sidebarMenuButton}
                                onClick={e =>
                                    openContextMenuAt(e, {scope: 'project'})
                                }
                                type="button"
                                title="Project menu"
                            >
                                ⋮
                            </button>
                        </Box>
                        <Box
                            className={styles.fileListContainer}
                            onContextMenu={e =>
                                openContextMenuAt(e, {scope: 'project'})
                            }
                        >
                            <Box className={styles.fileGroup}>
                                <Box className={styles.groupLabel}>
                                    Custom Files & Folders
                                </Box>
                                {fileTree?.length > 0 ? (
                                    <FileTreeView
                                        fileTree={fileTree}
                                        expandedFolderIds={expandedFolderIds}
                                        selectedFolderId={selectedFolderId}
                                        activeTargetId={activeTargetId}
                                        onToggleFolderExpand={onToggleFolderExpand}
                                        onSelectFolder={setSelectedFolderId}
                                        onSelectFile={onSelectFile}
                                        onContextMenu={handleFileContext}
                                    />
                                ) : (
                                    <Box className={styles.emptyHint}>
                                        No custom files yet.
                                    </Box>
                                )}
                            </Box>
                            <Box className={styles.fileGroup}>
                                <Box className={styles.groupLabel}>
                                    Sprite / Stage Scripts
                                </Box>
                                {spriteScripts.length > 0 ? (
                                    spriteScripts.map(file => (
                                        <button
                                            key={file.targetId}
                                            className={
                                                activeTargetId === file.targetId ?
                                                    styles.fileItemActive :
                                                    styles.fileItem
                                            }
                                            onClick={() =>
                                                onSelectFile?.(file.targetId)
                                            }
                                            type="button"
                                        >
                                            <span
                                                className={styles.treeItemIcon}
                                            >
                                                <img
                                                    src={pythonIcon}
                                                    className={
                                                        styles.pythonIcon
                                                    }
                                                    alt=""
                                                />
                                            </span>
                                            <span>{file.fileName}</span>
                                        </button>
                                    ))
                                ) : (
                                    <Box className={styles.emptyHint}>
                                        No sprite scripts found.
                                    </Box>
                                )}
                            </Box>
                        </Box>
                    </Box>

                    <Box className={styles.quickUploadFloatingZone}>
                        <button
                            className={styles.quickUploadFab}
                            type="button"
                            title="Quick upload"
                        >
                            ⤴
                        </button>
                        <Box className={styles.quickUploadFloatingMenu}>
                            {[
                                'video',
                                'image',
                                'csv',
                                'text',
                                'audio',
                                'python'
                            ].map(type => (
                                <button
                                    key={type}
                                    className={styles.quickUploadItem}
                                    onClick={() => startUpload(type)}
                                    type="button"
                                >
                                    <span className={styles.quickUploadIcon}>
                                        {UPLOAD_ICONS[type]}
                                    </span>
                                    <span>Upload {type}</span>
                                </button>
                            ))}
                        </Box>
                    </Box>

                    <Box className={styles.modulesQuickMenuZone}>
                        <button
                            className={styles.quickUploadFab}
                            type="button"
                            title="Modules actions"
                        >
                            +
                        </button>
                        <Box className={styles.quickUploadFloatingMenu}>
                            <button
                                className={styles.quickUploadItem}
                                onClick={() => onOpenExtensionLibrary?.()}
                                type="button"
                            >
                                <span className={styles.quickUploadIcon}>
                                    🧩
                                </span>
                                <span>Add extension</span>
                            </button>
                            <button
                                className={styles.quickUploadItem}
                                onClick={() => setIsDesktopToolsOpen(true)}
                                type="button"
                            >
                                <span className={styles.quickUploadIcon}>
                                    🛠️
                                </span>
                                <span>Desktop Tools</span>
                            </button>
                        </Box>
                    </Box>

                    <Box
                        className={`${styles.sidebarSection} ${styles.modulesSection}`}
                        data-tutorial="modules-section"
                    >
                        <Box className={styles.sidebarTitle}>
                            Modules Libraries
                        </Box>
                        {moduleLibraryItems.map(module => (
                            <ModuleRow
                                key={module.name}
                                module={module}
                                onRemove={name => {
                                    onSetModuleLibraryItems?.(
                                        moduleLibraryItems.filter(
                                            m => m.core || m.name !== name,
                                        ),
                                    );
                                    window.dispatchEvent(
                                        new CustomEvent(
                                            'python-ide-remove-extension',
                                            {detail: {name}},
                                        ),
                                    );
                                }}
                            />
                        ))}
                    </Box>
                </Box>

                <Box
                    className={styles.editorArea}
                    data-tutorial="editor-area"
                >
                    <Box className={styles.pythonIdeToolbar}>
                        <span>{activeFile}</span>
                        <span style={{flex: 1}} />
                        <Box className={styles.zoomControls}>
                            <button
                                className={styles.zoomBtn}
                                onClick={() => {
                                    editorRef.current
                                        ?.getAction('editor.action.fontZoomOut')
                                        ?.run();
                                    setZoomLevel(v => Math.max(v - 10, 50));
                                }}
                                title="Zoom out"
                                type="button"
                            >
                                <svg
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2.5"
                                >
                                    <circle
                                        cx="11"
                                        cy="11"
                                        r="8"
                                    />
                                    <line
                                        x1="21"
                                        y1="21"
                                        x2="16.65"
                                        y2="16.65"
                                    />
                                    <line
                                        x1="8"
                                        y1="11"
                                        x2="14"
                                        y2="11"
                                    />
                                </svg>
                            </button>
                            <span className={styles.zoomLevel}>
                                {zoomLevel}%
                            </span>
                            <button
                                className={styles.zoomBtn}
                                onClick={() => {
                                    editorRef.current
                                        ?.getAction('editor.action.fontZoomIn')
                                        ?.run();
                                    setZoomLevel(v => Math.min(v + 10, 200));
                                }}
                                title="Zoom in"
                                type="button"
                            >
                                <svg
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2.5"
                                >
                                    <circle
                                        cx="11"
                                        cy="11"
                                        r="8"
                                    />
                                    <line
                                        x1="21"
                                        y1="21"
                                        x2="16.65"
                                        y2="16.65"
                                    />
                                    <line
                                        x1="8"
                                        y1="11"
                                        x2="14"
                                        y2="11"
                                    />
                                    <line
                                        x1="11"
                                        y1="8"
                                        x2="11"
                                        y2="14"
                                    />
                                </svg>
                            </button>
                            <button
                                className={styles.zoomBtn}
                                onClick={() => {
                                    editorRef.current
                                        ?.getAction(
                                            'editor.action.fontZoomReset',
                                        )
                                        ?.run();
                                    setZoomLevel(100);
                                }}
                                title="Reset zoom"
                                type="button"
                            >
                                <svg
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                >
                                    <circle
                                        cx="12"
                                        cy="12"
                                        r="10"
                                    />
                                    <line
                                        x1="12"
                                        y1="8"
                                        x2="12"
                                        y2="16"
                                    />
                                    <line
                                        x1="8"
                                        y1="12"
                                        x2="16"
                                        y2="12"
                                    />
                                </svg>
                            </button>
                        </Box>
                    </Box>

                    {isImagePreviewActive ? (
                        <Box className={styles.pythonIdeEditorWrapper}>
                            {imagePreviewSrc ? (
                                <img
                                    src={imagePreviewSrc}
                                    alt={activeFile || 'uploaded image'}
                                    className={styles.imagePreview}
                                />
                            ) : (
                                <Box className={styles.imagePreviewEmpty}>
                                    Image preview unavailable.
                                </Box>
                            )}
                        </Box>
                    ) : (
                        <CodeEditor
                            language="python"
                            value={code}
                            theme="vs"
                            options={{
                                readOnly: false,
                                contextmenu: true,
                                minimap: {enabled: false},
                                lineNumbers: 'on',
                                glyphMargin: true,
                                suggestOnTriggerCharacters: true,
                                quickSuggestions: true,
                                wordBasedSuggestions: false
                            }}
                            onChange={onCodeChange}
                            editorWillMount={handleEditorWillMount}
                            editorDidMount={handleEditorDidMount}
                        />
                    )}

                    <Box className={styles.editorStatusBar}>
                        {syntaxStatus || 'Syntax: unknown'} — Ln{' '}
                        {cursorPos.line}, Col {cursorPos.column}
                    </Box>

                    <Box
                        className={
                            isTerminalExpanded ?
                                styles.terminalAreaExpanded :
                                styles.terminalArea
                        }
                        data-tutorial="terminal-area"
                    >
                        <Box
                            className={styles.terminalToolbar}
                            data-tutorial="terminal-toolbar"
                        >
                            <Box className={styles.tabList}>
                                <button
                                    className={
                                        activeBottomTab === 'output' ?
                                            `${styles.tab} ${styles.tabSelected}` :
                                            styles.tab
                                    }
                                    onClick={() => setActiveBottomTab('output')}
                                    type="button"
                                >
                                    <svg
                                        width="16"
                                        height="16"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                    >
                                        <polyline points="16 18 22 12 16 6" />
                                        <polyline points="8 6 2 12 8 18" />
                                    </svg>
                                    Output
                                </button>
                                <button
                                    className={
                                        activeBottomTab === 'error' ?
                                            `${styles.tab} ${styles.tabSelected}` :
                                            styles.tab
                                    }
                                    onClick={() => setActiveBottomTab('error')}
                                    type="button"
                                >
                                    <svg
                                        width="16"
                                        height="16"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                    >
                                        <circle
                                            cx="12"
                                            cy="12"
                                            r="10"
                                        />
                                        <line
                                            x1="12"
                                            y1="8"
                                            x2="12"
                                            y2="12"
                                        />
                                        <line
                                            x1="12"
                                            y1="16"
                                            x2="12.01"
                                            y2="16"
                                        />
                                    </svg>
                                    Error
                                </button>
                                <button
                                    className={
                                        activeBottomTab === 'serial' ?
                                            `${styles.tab} ${styles.tabSelected}` :
                                            styles.tab
                                    }
                                    onClick={() => setActiveBottomTab('serial')}
                                    title={
                                        isDeviceConnected ?
                                            `Serial: ${peripheralName || deviceId || 'Connected'}` :
                                            'Serial terminal'
                                    }
                                    type="button"
                                >
                                    <svg
                                        width="16"
                                        height="16"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                    >
                                        <rect
                                            x="2"
                                            y="2"
                                            width="20"
                                            height="8"
                                            rx="2"
                                            ry="2"
                                        />
                                        <rect
                                            x="2"
                                            y="14"
                                            width="20"
                                            height="8"
                                            rx="2"
                                            ry="2"
                                        />
                                        <line
                                            x1="6"
                                            y1="6"
                                            x2="6.01"
                                            y2="6"
                                        />
                                        <line
                                            x1="6"
                                            y1="18"
                                            x2="6.01"
                                            y2="18"
                                        />
                                    </svg>
                                    Serial{isDeviceConnected ? ' ●' : ''}
                                </button>
                                {isMicroPythonDevice && (
                                    <button
                                        className={
                                            activeBottomTab === 'repl' ?
                                                `${styles.tab} ${styles.tabSelected}` :
                                                styles.tab
                                        }
                                        onClick={() => setActiveBottomTab('repl')}
                                        title="MicroPython REPL"
                                        type="button"
                                    >
                                        <svg
                                            width="16"
                                            height="16"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                        >
                                            <polyline points="4 17 10 11 4 5" />
                                            <polyline points="12 19 20 19" />
                                        </svg>
                                        REPL
                                    </button>
                                )}
                                {supportsMicroPython && runtimeTarget === 'micropython' && (
                                    <button
                                        className={
                                            activeBottomTab === 'upload' ?
                                                `${styles.tab} ${styles.tabSelected}` :
                                                styles.tab
                                        }
                                        onClick={() => setActiveBottomTab('upload')}
                                        title="MicroPython Upload Controls"
                                        type="button"
                                    >
                                        <svg
                                            width="16"
                                            height="16"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                        >
                                            <line
                                                x1="12"
                                                y1="2"
                                                x2="12"
                                                y2="13"
                                            />
                                            <polyline points="6 9 12 15 18 9" />
                                        </svg>
                                        Upload
                                    </button>
                                )}
                            </Box>
                            <Box className={styles.terminalActions}>
                                <button
                                    className={`${styles.actionButton} ${styles.runButton}`}
                                    disabled={isRunning}
                                    onClick={() => onRun?.()}
                                    type="button"
                                    title="Run current block"
                                >
                                    <svg
                                        width="16"
                                        height="16"
                                        viewBox="0 0 24 24"
                                        fill="currentColor"
                                    >
                                        <polygon points="5,3 19,12 5,21" />
                                    </svg>
                                    Run
                                </button>
                                <button
                                    className={`${styles.actionButton} ${styles.runAllButton}`}
                                    disabled={isRunning}
                                    onClick={() => onRunAll?.()}
                                    type="button"
                                    title="Run all blocks"
                                >
                                    <svg
                                        width="16"
                                        height="16"
                                        viewBox="0 0 24 24"
                                        fill="currentColor"
                                    >
                                        <polygon points="3,3 15,12 3,21" />
                                        <polygon points="11,3 23,12 11,21" />
                                    </svg>
                                    Run All
                                </button>
                                <button
                                    className={`${styles.actionButton} ${styles.stopButton}`}
                                    disabled={!isRunning}
                                    onClick={() => onStop?.()}
                                    type="button"
                                    title="Stop execution"
                                >
                                    <svg
                                        width="16"
                                        height="16"
                                        viewBox="0 0 24 24"
                                        fill="currentColor"
                                    >
                                        <rect
                                            x="6"
                                            y="6"
                                            width="12"
                                            height="12"
                                            rx="1"
                                        />
                                    </svg>
                                    Stop
                                </button>
                                {isMicroPythonDevice && (
                                    <>
                                        <button
                                            className={`${styles.actionButton} ${styles.runAllButton}`}
                                            disabled={isUploading || !isDeviceConnected}
                                            onClick={handleUploadToDevice}
                                            type="button"
                                            title="Run code on device via REPL"
                                        >
                                            <svg
                                                width="16"
                                                height="16"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="2"
                                            >
                                                <polyline points="4 17 10 11 4 5" />
                                                <polyline points="12 19 20 19" />
                                            </svg>
                                            {isUploading ? '...' : 'µPython Run'}
                                        </button>
                                        <button
                                            className={`${styles.actionButton} ${styles.runAllButton}`}
                                            disabled={isUploading || !isDeviceConnected}
                                            onClick={handleUploadAsMain}
                                            type="button"
                                            title="Upload as main.py and auto-run on boot"
                                        >
                                            <svg
                                                width="16"
                                                height="16"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="2"
                                            >
                                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                                <polyline points="14 2 14 8 20 8" />
                                                <line
                                                    x1="16"
                                                    y1="13"
                                                    x2="8"
                                                    y2="13"
                                                />
                                                <line
                                                    x1="16"
                                                    y1="17"
                                                    x2="8"
                                                    y2="17"
                                                />
                                            </svg>
                                            {isUploading ? '...' : 'Upload main.py'}
                                        </button>
                                    </>
                                )}
                                <label
                                    className={styles.realtimeToggle}
                                    title={
                                        realtimeMode ?
                                            'Realtime mode: no timeout' :
                                            'Normal mode: 5s timeout'
                                    }
                                >
                                    <input
                                        type="checkbox"
                                        checked={realtimeMode}
                                        onChange={e =>
                                            onRealtimeModeChange?.(
                                                e.target.checked,
                                            )
                                        }
                                    />
                                    <span>Realtime</span>
                                </label>
                                <button
                                    className={`${styles.actionButton} ${styles.expandButton}`}
                                    onClick={() =>
                                        setIsTerminalExpanded(
                                            !isTerminalExpanded,
                                        )
                                    }
                                    title={
                                        isTerminalExpanded ?
                                            'Collapse terminal' :
                                            'Expand terminal'
                                    }
                                    type="button"
                                >
                                    <svg
                                        width="16"
                                        height="16"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                    >
                                        {isTerminalExpanded ? (
                                            <>
                                                <polyline points="4 14 10 14 10 20" />
                                                <polyline points="20 10 14 10 14 4" />
                                            </>
                                        ) : (
                                            <>
                                                <polyline points="4 10 10 10 10 4" />
                                                <polyline points="20 14 14 14 14 20" />
                                            </>
                                        )}
                                    </svg>
                                    {isTerminalExpanded ? 'Collapse' : 'Expand'}
                                </button>
                                {supportsMicroPython && runtimeTarget === 'vm' && (
                                    <button
                                        className={`${styles.actionButton} ${styles.uploadOnlyBtn}`}
                                        onClick={() => {
                                            onRuntimeTargetChange?.('micropython');
                                            setActiveBottomTab('upload');
                                        }}
                                        type="button"
                                        title="Switch to MicroPython upload mode"
                                        style={{marginLeft: '4px'}}
                                    >
                                        µPy Upload
                                    </button>
                                )}
                            </Box>
                        </Box>
                        <Box
                            className={styles.terminalOutput}
                            componentRef={terminalRef}
                        >
                            {showSearch && (
                                <Box
                                    style={{
                                        position: 'sticky',
                                        top: 0,
                                        zIndex: 20,
                                        background: '#fff',
                                        borderBottom: '1px solid #ddd',
                                        padding: '4px 8px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 4
                                    }}
                                >
                                    <input
                                        type="text"
                                        placeholder="Search output..."
                                        value={searchQuery}
                                        onChange={e =>
                                            setSearchQuery(e.target.value)
                                        }
                                        onKeyDown={e => {
                                            if (e.key === 'Escape') {
                                                setShowSearch(false);
                                                setSearchQuery('');
                                            }
                                        }}
                                        style={{
                                            flex: 1,
                                            border: '1px solid #ccc',
                                            borderRadius: 3,
                                            padding: '3px 6px',
                                            fontSize: '0.82rem',
                                            outline: 'none'
                                        }}
                                        autoFocus
                                    />
                                    <button
                                        onClick={() => {
                                            setShowSearch(false);
                                            setSearchQuery('');
                                        }}
                                        className={styles.terminalActionBtn}
                                        title="Close search"
                                    >
                                        <svg
                                            width="12"
                                            height="12"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                        >
                                            <line
                                                x1="18"
                                                y1="6"
                                                x2="6"
                                                y2="18"
                                            />
                                            <line
                                                x1="6"
                                                y1="6"
                                                x2="18"
                                                y2="18"
                                            />
                                        </svg>
                                    </button>
                                </Box>
                            )}
                            {activeBottomTab === 'upload' ? (
                                <UploadToolbar
                                    firmwareStatus={firmwareStatus}
                                    isUploading={mpIsUploading}
                                    uploadProgress={mpUploadProgress}
                                    uploadLog={mpUploadLog}
                                    onSwitchToVM={() => {
                                        onRuntimeTargetChange('vm');
                                        setActiveBottomTab('output');
                                    }}
                                    onFlashFirmware={onFlashFirmware}
                                    onDetectFirmware={onDetectFirmware}
                                    onUploadRun={onUploadRun}
                                    onUploadOnly={onUploadOnly}
                                    onStopBoard={onStopBoard}
                                />
                            ) : activeBottomTab === 'serial' ? (
                                <SerialTerminal
                                    deviceId={deviceId}
                                    peripheralName={peripheralName}
                                    isConnected={isDeviceConnected}
                                    onSend={onSerialSend}
                                    onChangeBaudrate={onSerialBaudrate}
                                />
                            ) : activeBottomTab === 'repl' && isMicroPythonDevice ? (
                                <ReplTerminal
                                    deviceId={deviceId}
                                    peripheralName={peripheralName}
                                    isConnected={isDeviceConnected}
                                    onSend={onReplSend}
                                />
                            ) : (
                                <pre
                                    style={{
                                        margin: 0,
                                        whiteSpace: 'pre-wrap',
                                        wordBreak: 'break-word',
                                        flex: 1,
                                        minHeight: 0
                                    }}
                                >
                                    {activeBottomTab === 'output' ? (
                                        Array.isArray(runOutput) ? (
                                            (() => {
                                                const items = searchQuery ?
                                                    runOutput.filter(item =>
                                                        (item.type === 'line' ?
                                                            item.text :
                                                            item.text
                                                        )
                                                            .toLowerCase()
                                                            .includes(
                                                                searchQuery.toLowerCase(),
                                                            ),
                                                    ) :
                                                    runOutput;
                                                return items.length === 0 ?
                                                    searchQuery ?
                                                        'No results found.' :
                                                        'Output will appear here.' :
                                                    items.map((item, i) =>
                                                        (item.type ===
                                                          'line' ? (
                                                                <span
                                                                  key={i}
                                                                  style={{
                                                                        display:
                                                                          'block',
                                                                        lineHeight:
                                                                          '22px'
                                                                    }}
                                                              >
                                                                  {item.spriteUrl ? (
                                                                        <img
                                                                          src={
                                                                                item.spriteUrl
                                                                            }
                                                                          style={{
                                                                                width: 18,
                                                                                height: 18,
                                                                                objectFit:
                                                                                  'contain',
                                                                                verticalAlign:
                                                                                  'middle',
                                                                                marginRight: 4
                                                                            }}
                                                                      />
                                                                    ) : null}
                                                                  <span>{`> ${item.text}`}</span>
                                                              </span>
                                                            ) : (
                                                                <span
                                                                    key={i}
                                                                    style={{
                                                                        display:
                                                                          'block'
                                                                    }}
                                                                >
                                                                    {item.text}
                                                                </span>
                                                            )),
                                                    );
                                            })()
                                        ) : (
                                            runOutput ||
                                            'Output will appear here.'
                                        )
                                    ) : runError ? (
                                        <div
                                            style={{
                                                background: '#fff0f0',
                                                border: '1px solid #fcc',
                                                borderRadius: 8,
                                                padding: '0.75rem 1rem',
                                                color: '#b33030',
                                                fontWeight: 500,
                                                lineHeight: 1.6,
                                                whiteSpace: 'pre-wrap',
                                                wordBreak: 'break-word'
                                            }}
                                        >
                                            {formatPythonError(runError)}
                                        </div>
                                    ) : (
                                        'Errors will appear here.'
                                    )}
                                </pre>
                            )}
                        </Box>
                    </Box>
                    {activeBottomTab !== 'serial' && activeBottomTab !== 'upload' && activeBottomTab !== 'repl' && (
                        <FloatingToolbar
                            isAutoScroll={isAutoScroll}
                            onToggleAutoScroll={() => setIsAutoScroll(v => !v)}
                            onSearch={() => setShowSearch(v => !v)}
                            onCopy={() => {
                                const text = Array.isArray(runOutput) ?
                                    runOutput
                                        .map(i =>
                                            (i.type === 'line' ?
                                                i.text :
                                                i.text),
                                        )
                                        .join('\n') :
                                    runOutput;
                                navigator.clipboard?.writeText(text);
                            }}
                            onScrollBottom={() =>
                                terminalRef.current?.scrollTo({
                                    top: terminalRef.current.scrollHeight,
                                    behavior: 'smooth'
                                })
                            }
                            onClear={() => onClear?.()}
                        />
                    )}
                </Box>
            </Box>

            {contextMenu && (
                <ContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    items={getContextMenuItems()}
                    onClose={() => setContextMenu(null)}
                />
            )}

            <input
                type="file"
                ref={uploadInputRef}
                accept={uploadConfig}
                style={{display: 'none'}}
                onChange={handleUploadedFile}
            />

            <InputModal
                isOpen={inputModal.isOpen}
                title={inputModal.title}
                placeholder={inputModal.placeholder}
                onConfirm={inputModal.callback}
                onCancel={closeModal}
            />

            <DesktopTools
                isOpen={isDesktopToolsOpen}
                onClose={() => setIsDesktopToolsOpen(false)}
            />

            {showTutorial && (
                <TutorialOverlay
                    currentStep={tutorialStep}
                    totalSteps={tutorialSteps}
                    onNext={handleTutorialNext}
                    onPrev={handleTutorialPrev}
                    onSkip={handleTutorialSkip}
                    dontShowAgain={tutorialDontShow}
                    onDontShowAgainChange={setTutorialDontShow}
                />
            )}
        </Box>
    );
};

PythonIdeComponent.propTypes = {
    activeFile: PropTypes.string,
    activeTargetId: PropTypes.string,
    fileList: PropTypes.arrayOf(
        PropTypes.shape({
            targetId: PropTypes.string.isRequired,
            fileName: PropTypes.string.isRequired
        }),
    ),
    fileTree: PropTypes.arrayOf(PropTypes.object),
    expandedFolderIds: PropTypes.instanceOf(Set),
    filesByTargetId: PropTypes.objectOf(PropTypes.object),
    code: PropTypes.string,
    isRunning: PropTypes.bool,
    runOutput: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.arrayOf(PropTypes.object)
    ]),
    runError: PropTypes.string,
    spriteNames: PropTypes.arrayOf(PropTypes.string),
    deviceId: PropTypes.string,
    peripheralName: PropTypes.string,
    isMicroPythonDevice: PropTypes.bool,
    onSerialSend: PropTypes.func,
    onSerialBaudrate: PropTypes.func,
    onReplSend: PropTypes.func,
    onUploadToDevice: PropTypes.func,
    onUploadAsMain: PropTypes.func,
    realtimeMode: PropTypes.bool,
    onRealtimeModeChange: PropTypes.func,
    onCodeChange: PropTypes.func,
    onRun: PropTypes.func,
    onRunAll: PropTypes.func,
    onStop: PropTypes.func,
    onClear: PropTypes.func,
    onSelectFile: PropTypes.func,
    onCreateFolder: PropTypes.func,
    onCreateFile: PropTypes.func,
    onToggleFolderExpand: PropTypes.func,
    onRenameTreeItem: PropTypes.func,
    onDeleteTreeItem: PropTypes.func,
    onMoveTreeItem: PropTypes.func,
    onDuplicateTreeItem: PropTypes.func,
    onOpenExtensionLibrary: PropTypes.func,
    moduleLibraryItems: PropTypes.array,
    onSetModuleLibraryItems: PropTypes.func,
    // MicroPython upload mode props
    supportsMicroPython: PropTypes.bool,
    runtimeTarget: PropTypes.string,
    onRuntimeTargetChange: PropTypes.func,
    firmwareStatus: PropTypes.string,
    mpIsUploading: PropTypes.bool,
    mpUploadProgress: PropTypes.shape({
        stage: PropTypes.string,
        percent: PropTypes.number
    }),
    mpUploadLog: PropTypes.arrayOf(PropTypes.string),
    onFlashFirmware: PropTypes.func,
    onDetectFirmware: PropTypes.func,
    onUploadRun: PropTypes.func,
    onUploadOnly: PropTypes.func,
    onStopBoard: PropTypes.func
};

export default PythonIdeComponent;
