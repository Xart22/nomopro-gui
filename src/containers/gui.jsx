import PropTypes from 'prop-types';
import React from 'react';
import extensionLibraryContent from '../lib/libraries/extensions/index.jsx';
import {compose} from 'redux';
import {connect} from 'react-redux';
import ReactModal from 'react-modal';
import VM from 'openblock-vm';
import {injectIntl, intlShape} from 'react-intl';

import ErrorBoundaryHOC from '../lib/error-boundary-hoc.jsx';
import {getIsError, getIsShowingProject} from '../reducers/project-state';
import {
    activateTab,
    BLOCKS_TAB_INDEX,
    COSTUMES_TAB_INDEX,
    SOUNDS_TAB_INDEX,
    PYTHON_TAB_INDEX
} from '../reducers/editor-tab';
import {setBlockMode, setPythonMode} from '../reducers/input-mode';
import {
    MODE_BLOCK,
    MODE_PYTHON,
    hasBlockModeContent,
    hasPythonModeContent,
    modeFromTab
} from '../lib/modeState';
import {createDefaultCode} from '../reducers/python-ide';
import {resetPythonIdeState} from '../reducers/python-ide';

import {
    closeCostumeLibrary,
    closeBackdropLibrary,
    closeTelemetryModal,
    openExtensionLibrary
} from '../reducers/modals';

import FontLoaderHOC from '../lib/font-loader-hoc.jsx';
import LocalizationHOC from '../lib/localization-hoc.jsx';
import SBFileUploaderHOC from '../lib/sb-file-uploader-hoc.jsx';
import ProjectFetcherHOC from '../lib/project-fetcher-hoc.jsx';
import TitledHOC from '../lib/titled-hoc.jsx';
import ProjectSaverHOC from '../lib/project-saver-hoc.jsx';
import QueryParserHOC from '../lib/query-parser-hoc.jsx';
import storage from '../lib/storage';
import vmListenerHOC from '../lib/vm-listener-hoc.jsx';
import vmManagerHOC from '../lib/vm-manager-hoc.jsx';
import cloudManagerHOC from '../lib/cloud-manager-hoc.jsx';

import GUIComponent from '../components/gui/gui.jsx';
import {setIsScratchDesktop} from '../lib/isScratchDesktop.js';

class GUI extends React.Component {
    state = {
        showSwitchModeDialog: false,
        pendingTabIndex: null,
        switchFromMode: MODE_BLOCK,
        switchToMode: MODE_BLOCK,
        showLandingPage: true,
        showJuniorContent: false
    };

    isNeutralEditorTab = tabIndex =>
        tabIndex === COSTUMES_TAB_INDEX || tabIndex === SOUNDS_TAB_INDEX;

    clearAllExtensions = () => {
        const manager = this.props.vm && this.props.vm.extensionManager;
        if (!manager) return;

        // Collect loaded extension IDs from internal state
        let loadedIds = [];
        try {
            if (typeof manager.getExtensionURLs === 'function') {
                const urls = manager.getExtensionURLs();
                if (Array.isArray(urls)) loadedIds = urls;
            }
        } catch (_) { /* ignore */ }

        if (loadedIds.length === 0) {
            try {
                if (manager._loadedExtensions &&
                    typeof manager._loadedExtensions.keys === 'function') {
                    loadedIds = Array.from(manager._loadedExtensions.keys());
                } else if (manager._loadedExtensions &&
                    typeof manager._loadedExtensions === 'object') {
                    loadedIds = Object.keys(manager._loadedExtensions);
                }
            } catch (_) { /* ignore */ }
        }

        if (loadedIds.length === 0) return;

        // Filter out core extensions that should always remain
        const coreExtensions = ['pen'];
        const toUnload = loadedIds.filter(
            id => !coreExtensions.includes(id),
        );

        toUnload.forEach(id => {
            try {
                if (typeof manager.unloadExtension === 'function') {
                    manager.unloadExtension(id);
                }
            } catch (e) {
                console.warn('Failed to unload extension:', id, e);
            }
        });

        // Force workspace/toolbox update after cleanup
        try {
            if (typeof this.props.vm.emitWorkspaceUpdate === 'function') {
                this.props.vm.emitWorkspaceUpdate();
            }
            if (typeof this.props.vm.refreshWorkspace === 'function') {
                this.props.vm.refreshWorkspace();
            }
        } catch (_) { /* ignore */ }
    };

    clearAllBlockScripts = () => {
        const runtime = this.props.vm && this.props.vm.runtime;
        if (!runtime || !Array.isArray(runtime.targets)) return;

        runtime.targets.forEach(target => {
            const blocks = target && target.blocks && target.blocks._blocks;
            if (!blocks) return;

            const blockIds = Object.keys(blocks);
            const topLevelIds = blockIds.filter(
                id => blocks[id] && blocks[id].topLevel,
            );
            const idsToDelete = topLevelIds.length > 0 ? topLevelIds : blockIds;

            idsToDelete.forEach(id => {
                if (
                    target.blocks &&
                    typeof target.blocks.deleteBlock === 'function'
                ) {
                    target.blocks.deleteBlock(id);
                }
            });

            if (target.comments && typeof target.comments === 'object') {
                target.comments = {};
            }
        });

        if (typeof this.props.vm.emitWorkspaceUpdate === 'function') {
            this.props.vm.emitWorkspaceUpdate();
        }
        if (typeof this.props.vm.emitTargetsUpdate === 'function') {
            this.props.vm.emitTargetsUpdate(false);
        }
        if (typeof this.props.vm.refreshWorkspace === 'function') {
            this.props.vm.refreshWorkspace();
        }
    };

    handleConfirmSwitchMode = () => {
        const nextTab = this.state.pendingTabIndex;
        const currentMode = this.state.switchFromMode;
        this.setState(
            {
                showSwitchModeDialog: false,
                pendingTabIndex: null
            },
            () => {
                if (currentMode === MODE_BLOCK) {
                    this.clearAllBlockScripts();
                }

                if (currentMode === MODE_PYTHON) {
                    this.props.onResetPythonIdeState();
                }

                if (typeof nextTab === 'number') {
                    const nextMode = this.isNeutralEditorTab(nextTab) ?
                        this.props.inputMode :
                        modeFromTab(nextTab, PYTHON_TAB_INDEX);
                    if (nextMode !== this.props.inputMode) {
                        this.clearAllExtensions();
                    }
                    this.props.onActivateTab(nextTab);
                }
            },
        );
    };

    handleCancelSwitchMode = () => {
        this.setState({
            showSwitchModeDialog: false,
            pendingTabIndex: null
        });
    };

    shouldConfirmModeSwitch = nextMode => {
        if (nextMode === this.props.inputMode) {
            return false;
        }

        if (this.props.inputMode === MODE_PYTHON) {
            return hasPythonModeContent(
                this.props.filesByTargetId,
                createDefaultCode(),
            );
        }

        return nextMode === MODE_PYTHON && hasBlockModeContent(this.props.vm);
    };

    handleActivateTab = tab => {
        const nextMode = this.isNeutralEditorTab(tab) ?
            this.props.inputMode :
            modeFromTab(tab, PYTHON_TAB_INDEX);

        if (this.shouldConfirmModeSwitch(nextMode)) {
            this.setState({
                showSwitchModeDialog: true,
                pendingTabIndex: tab,
                switchFromMode: this.props.inputMode,
                switchToMode: nextMode
            });
            return false;
        }

        if (nextMode !== this.props.inputMode) {
            this.clearAllExtensions();
        }

        this.props.onActivateTab(tab);
        return true;
    };

    handleMessage = event => {
        if (event.data && event.data.type === 'closeJuniorContent') {
            this.handleCloseJuniorContent();
        }
    };
    handleSelectJuniorCode = () => {
        this.setState({showJuniorContent: true});
    };
    handleCloseJuniorContent = () => {
        this.setState({showJuniorContent: false});
    };

    handleShowLandingPage = () => {
        this.setState({showLandingPage: true});
    };

    handleSelectBlockCode = () => {
        this.setState({showLandingPage: false});
    };

    handleSelectPythonIDE = () => {
        this.setState({showLandingPage: false}, () => {
            this.props.onActivateTab(PYTHON_TAB_INDEX);
        });
    };

    handleActivateCostumesTab = () =>
        this.handleActivateTab(COSTUMES_TAB_INDEX);

    handleActivateSoundsTab = () => this.handleActivateTab(SOUNDS_TAB_INDEX);

    componentDidMount () {
        setIsScratchDesktop(this.props.isScratchDesktop);
        this.props.onStorageInit(storage);
        this.props.onVmInit(this.props.vm);
        // Listen for extension add/remove events from the Python IDE UI
        this._onPythonIdeAdd = async evt => {
            const name = evt && evt.detail && evt.detail.name;
            if (!name) return;
            // map name to extensionId by trying both id and localized defaultMessage
            const match = (extensionLibraryContent || []).find(ext => {
                const extId = String(ext.extensionId || '');
                const localized =
                    ext &&
                    ext.name &&
                    ext.name.props &&
                    ext.name.props.defaultMessage;
                return (
                    extId.toLowerCase() === String(name).toLowerCase() ||
                    (localized &&
                        String(localized).toLowerCase() ===
                            String(name).toLowerCase())
                );
            });
            const extensionId = match ? match.extensionId : null;
            if (!extensionId) return;
            try {
                const manager = this.props.vm && this.props.vm.extensionManager;
                if (!manager) return;
                const isLoaded = typeof manager.isExtensionLoaded === 'function' ?
                    manager.isExtensionLoaded(extensionId) :
                    false;
                if (isLoaded) {
                    // Extension already loaded (e.g. via ExtensionLibrary in Python tab)
                    this.setState(prevState => {
                        const items = prevState.moduleLibraryItems || [];
                        if (items.some(m => m.name === name)) {
                            return {moduleLibraryItems: items};
                        }
                        return {
                            moduleLibraryItems: [...items, {name, core: false}]
                        };
                    });
                    return;
                }
                if (typeof manager.loadExtensionIdSync === 'function') {
                    manager.loadExtensionIdSync(extensionId);
                } else if (typeof manager.loadExtensionURL === 'function') {
                    await manager.loadExtensionURL(extensionId);
                }
            } catch (e) {
                // ignore load errors for now
                console.warn('Failed to load extension', extensionId, e);
            }
        };

        this._onPythonIdeRemove = evt => {
            const name = evt && evt.detail && evt.detail.name;
            if (!name) return;
            // Unloading extensions is not universally supported; attempt if available
            const match = (extensionLibraryContent || []).find(ext => {
                const extId = String(ext.extensionId || '');
                const localized =
                    ext &&
                    ext.name &&
                    ext.name.props &&
                    ext.name.props.defaultMessage;
                return (
                    extId.toLowerCase() === String(name).toLowerCase() ||
                    (localized &&
                        String(localized).toLowerCase() ===
                            String(name).toLowerCase())
                );
            });
            const extensionId = match ? match.extensionId : null;
            if (!extensionId) return;
            try {
                const manager = this.props.vm && this.props.vm.extensionManager;
                if (!manager) return;
                if (typeof manager.unloadExtension === 'function') {
                    manager.unloadExtension(extensionId);
                } else {
                    // no-op; some runtimes don't support unloading
                    console.info(
                        'Runtime does not support unloading extension:',
                        extensionId,
                    );
                }
            } catch (e) {
                console.warn('Failed to unload extension', extensionId, e);
            }
        };

        window.addEventListener(
            'python-ide-add-extension',
            this._onPythonIdeAdd,
        );
        window.addEventListener(
            'python-ide-remove-extension',
            this._onPythonIdeRemove,
        );

        // Preload Pyodide if user previously enabled it in Python IDE
        try {
            const p = localStorage.getItem('python-ide-preload-pyodide');
            if (p === '1') {
                // load pyodide script
                const script = document.createElement('script');
                script.src =
                    'https://cdn.jsdelivr.net/pyodide/v0.23.4/full/pyodide.js';
                script.crossOrigin = 'anonymous';
                script.onload = async () => {
                    try {
                        await loadPyodide({
                            indexURL:
                                'https://cdn.jsdelivr.net/pyodide/v0.23.4/full/'
                        });
                    } catch (e) {
                        // ignore
                    }
                };
                script.onerror = () => {};
                document.head.appendChild(script);
            }
        } catch (e) {}

        window.addEventListener('message', this.handleMessage);
    }

    componentWillUnmount () {
        window.removeEventListener('message', this.handleMessage);
        if (this._onPythonIdeAdd) {
            window.removeEventListener(
                'python-ide-add-extension',
                this._onPythonIdeAdd,
            );
        }
        if (this._onPythonIdeRemove) {
            window.removeEventListener(
                'python-ide-remove-extension',
                this._onPythonIdeRemove,
            );
        }
    }
    componentDidUpdate (prevProps) {
        if (
            this.props.projectId !== prevProps.projectId &&
            this.props.projectId !== null
        ) {
            this.props.onUpdateProjectId(this.props.projectId);
        }
        if (this.props.isShowingProject && !prevProps.isShowingProject) {
            // this only notifies container when a project changes from not yet loaded to loaded
            // At this time the project view in www doesn't need to know when a project is unloaded
            this.props.onProjectLoaded();
        }
        if (
            this.props.isRealtimeMode !== true &&
            this.props.activeTabIndex !== BLOCKS_TAB_INDEX
        ) {
            this.props.onActivateBlocksTab();
        }

        const expectedMode = this.isNeutralEditorTab(this.props.activeTabIndex) ?
            this.props.inputMode :
            modeFromTab(this.props.activeTabIndex, PYTHON_TAB_INDEX);
        if (
            this.props.inputMode === MODE_PYTHON &&
            expectedMode !== MODE_PYTHON
        ) {
            this.props.onActivateTab(PYTHON_TAB_INDEX);
            return;
        }

        if (
            this.props.inputMode !== MODE_PYTHON &&
            this.props.activeTabIndex === PYTHON_TAB_INDEX
        ) {
            this.props.onActivateBlocksTab();
        }
    }
    render () {
        if (this.props.isError) {
            throw new Error(
                `Error in Scratch GUI [location=${window.location}]: ${this.props.error}`,
            );
        }
        const {
            /* eslint-disable no-unused-vars */
            assetHost,
            cloudHost,
            error,
            filesByTargetId,
            isError,
            isScratchDesktop,
            isShowingProject,
            onActivateBlocksTab,
            onActivateCostumesTab,
            onActivateSoundsTab,
            onActivateTab,
            onProjectLoaded,
            onShowMessageBox,
            onStorageInit,
            onUpdateProjectId,
            onVmInit,
            projectHost,
            projectId,
            /* eslint-enable no-unused-vars */
            children,
            fetchingProject,
            isLoading,
            loadingStateVisible,
            ...componentProps
        } = this.props;
        return (
            <GUIComponent
                loading={fetchingProject || isLoading || loadingStateVisible}
                showLandingPage={this.state.showLandingPage}
                showJuniorContent={this.state.showJuniorContent}
                onSelectJuniorCode={this.handleSelectJuniorCode}
                onSelectBlockCode={this.handleSelectBlockCode}
                onSelectPythonIDE={this.handleSelectPythonIDE}
                onCloseJuniorContent={this.handleCloseJuniorContent}
                onShowLandingPage={this.handleShowLandingPage}
                onActivateCostumesTab={this.handleActivateCostumesTab}
                onActivateSoundsTab={this.handleActivateSoundsTab}
                onActivateTab={this.handleActivateTab}
                showSwitchModeDialog={this.state.showSwitchModeDialog}
                switchFromMode={this.state.switchFromMode}
                switchToMode={this.state.switchToMode}
                onConfirmSwitchMode={this.handleConfirmSwitchMode}
                onCancelSwitchMode={this.handleCancelSwitchMode}
                {...componentProps}
            >
                {children}
            </GUIComponent>
        );
    }
}

GUI.propTypes = {
    assetHost: PropTypes.string,
    children: PropTypes.node,
    cloudHost: PropTypes.string,
    error: PropTypes.oneOfType([PropTypes.object, PropTypes.string]),
    fetchingProject: PropTypes.bool,
    filesByTargetId: PropTypes.objectOf(PropTypes.object),
    intl: intlShape,
    isError: PropTypes.bool,
    isLoading: PropTypes.bool,
    isScratchDesktop: PropTypes.bool,
    isShowingProject: PropTypes.bool,
    loadingStateVisible: PropTypes.bool,
    onActivateBlocksTab: PropTypes.func,
    onProjectLoaded: PropTypes.func,
    onSeeCommunity: PropTypes.func,
    onShowMessageBox: PropTypes.func,
    onStorageInit: PropTypes.func,
    onUpdateProjectId: PropTypes.func,
    onVmInit: PropTypes.func,
    onResetPythonIdeState: PropTypes.func,
    projectHost: PropTypes.string,
    projectId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    telemetryModalVisible: PropTypes.bool,
    vm: PropTypes.instanceOf(VM).isRequired,
    isRealtimeMode: PropTypes.bool,
    inputMode: PropTypes.string
};

GUI.defaultProps = {
    isScratchDesktop: false,
    onShowMessageBox: () => {},
    onStorageInit: storageInstance =>
        storageInstance.addOfficialScratchWebStores(),
    onProjectLoaded: () => {},
    onUpdateProjectId: () => {},
    onVmInit: (/* vm */) => {},
    onResetPythonIdeState: () => {},
    juniorCodeUrl: '/junior-block-code/'
};

const mapStateToProps = state => {
    const loadingState = state.scratchGui.projectState.loadingState;
    return {
        activeTabIndex: state.scratchGui.editorTab.activeTabIndex,
        alertsVisible: state.scratchGui.alerts.visible,
        backdropLibraryVisible: state.scratchGui.modals.backdropLibrary,
        blocksTabVisible:
            state.scratchGui.editorTab.activeTabIndex === BLOCKS_TAB_INDEX,
        cardsVisible: state.scratchGui.cards.visible,
        connectionModalVisible: state.scratchGui.modals.connectionModal,
        uploadProgressVisible: state.scratchGui.modals.uploadProgress,
        updateModalVisible: state.scratchGui.modals.updateModal,
        costumeLibraryVisible: state.scratchGui.modals.costumeLibrary,
        costumesTabVisible:
            state.scratchGui.editorTab.activeTabIndex === COSTUMES_TAB_INDEX,
        error: state.scratchGui.projectState.error,
        filesByTargetId: state.scratchGui.pythonIde.filesByTargetId,
        isError: getIsError(loadingState),
        isFullScreen: state.scratchGui.mode.isFullScreen,
        isPlayerOnly: state.scratchGui.mode.isPlayerOnly,
        isRtl: state.locales.isRtl,
        isShowingProject: getIsShowingProject(loadingState),
        loadingStateVisible: state.scratchGui.modals.loadingProject,
        projectId: state.scratchGui.projectState.projectId,
        soundsTabVisible:
            state.scratchGui.editorTab.activeTabIndex === SOUNDS_TAB_INDEX,
        pythonTabVisible:
            state.scratchGui.editorTab.activeTabIndex === PYTHON_TAB_INDEX,
        targetIsStage:
            state.scratchGui.targets.stage &&
            state.scratchGui.targets.stage.id ===
                state.scratchGui.targets.editingTarget,
        telemetryModalVisible: state.scratchGui.modals.telemetryModal,
        tipsLibraryVisible: state.scratchGui.modals.tipsLibrary,
        vm: state.scratchGui.vm,
        isRealtimeMode: state.scratchGui.programMode.isRealtimeMode,
        realtimeConnection: state.scratchGui.connectionModal.realtimeConnection,
        inputMode: state.scratchGui.inputMode.mode
    };
};

const mapDispatchToProps = dispatch => ({
    onExtensionButtonClick: () => dispatch(openExtensionLibrary()),
    onActivateTab: tab => {
        dispatch(activateTab(tab));
        if (modeFromTab(tab, PYTHON_TAB_INDEX) === MODE_PYTHON) {
            dispatch(setPythonMode());
        } else {
            dispatch(setBlockMode());
        }
    },
    onActivateBlocksTab: () => {
        dispatch(activateTab(BLOCKS_TAB_INDEX));
        dispatch(setBlockMode());
    },
    onActivateCostumesTab: () => dispatch(activateTab(COSTUMES_TAB_INDEX)),
    onActivateSoundsTab: () => dispatch(activateTab(SOUNDS_TAB_INDEX)),
    onRequestCloseBackdropLibrary: () => dispatch(closeBackdropLibrary()),
    onRequestCloseCostumeLibrary: () => dispatch(closeCostumeLibrary()),
    onRequestCloseTelemetryModal: () => dispatch(closeTelemetryModal()),
    onResetPythonIdeState: () => dispatch(resetPythonIdeState())
});

const ConnectedGUI = injectIntl(
    connect(mapStateToProps, mapDispatchToProps)(GUI),
);

// note that redux's 'compose' function is just being used as a general utility to make
// the hierarchy of HOC constructor calls clearer here; it has nothing to do with redux's
// ability to compose reducers.
const WrappedGui = compose(
    LocalizationHOC,
    ErrorBoundaryHOC('Top Level App'),
    FontLoaderHOC,
    QueryParserHOC,
    ProjectFetcherHOC,
    TitledHOC,
    ProjectSaverHOC,
    vmListenerHOC,
    vmManagerHOC,
    SBFileUploaderHOC,
    cloudManagerHOC,
)(ConnectedGUI);

WrappedGui.setAppElement = ReactModal.setAppElement;
export default WrappedGui;
