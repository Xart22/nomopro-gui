import React, {useEffect, useRef, useState} from 'react';
import PropTypes from 'prop-types';
import {connect} from 'react-redux';

import PythonIdeComponent from '../components/python-ide/python-ide.jsx';
import {
    initTargetFile,
    setActiveTarget,
    updateTargetCode,
    createDefaultCode,
    createFolder,
    createFile,
    toggleFolderExpand,
    renameTreeItem,
    deleteTreeItem,
    moveTreeItem,
    duplicateTreeItem,
    setModuleLibraryItems
} from '../reducers/python-ide';
import {openExtensionLibrary} from '../reducers/modals';
import {setFirmwareMode} from '../reducers/device';
import {createDesktopPythonRunner} from '../lib/desktop-python-runner';
import getCostumeUrl from '../lib/get-costume-url';
import {createPyodideRunner} from '../lib/pyodide-runner';
import MicropythonRunner from '../lib/micropython-runner';
import deviceData from '../lib/libraries/devices/index.jsx';
import {executeBridgeCommand, drainPendingDeviceResults} from '../lib/bridge';
import {parseNdjsonCommandLine} from '../lib/ndjson-command-parser';
import {backend as pythonBackend} from '../shared/env';

const resolveFileNameByTarget = (targetId, stage, sprites) => {
    if (!targetId) return '';
    if (stage && stage.id === targetId) return 'Stage.py';
    const sprite = sprites && sprites[targetId];
    const spriteName = sprite && sprite.name ? sprite.name : 'Sprite';
    return `${spriteName}.py`;
};

const buildFileList = (stage, sprites) => {
    const fileList = [];

    // Add Stage.py first
    if (stage && stage.id) {
        fileList.push({
            targetId: stage.id,
            fileName: 'Stage.py'
        });
    }

    // Add all sprite files, sorted by name
    if (sprites) {
        const spriteIds = Object.keys(sprites).sort((a, b) => {
            const nameA = (sprites[a].name || 'Sprite').toLowerCase();
            const nameB = (sprites[b].name || 'Sprite').toLowerCase();
            return nameA.localeCompare(nameB);
        });

        spriteIds.forEach(spriteId => {
            const sprite = sprites[spriteId];
            const fileName = `${sprite.name || 'Sprite'}.py`;
            fileList.push({
                targetId: spriteId,
                fileName
            });
        });
    }

    return fileList;
};

const createStandalonePythonCode = (fileName = 'script.py') => {
    const baseName = String(fileName || 'script.py').replace(/\.py$/i, '');
    return [`# ${fileName}`, '', `print(\"Hello from ${baseName}\")`].join(
        '\n',
    );
};

const normalizeRunnerCode = value => String(value || '');

const PythonIde = props => {
    const {
        editingTarget,
        stage,
        sprites,
        vm,
        filesByTargetId,
        fileTree,
        activeTargetId,
        onSetActiveTarget,
        onInitTargetFile,
        onCodeChange
    } = props;

    const deviceId = props.deviceId;
    const peripheralName = props.peripheralName;
    const isDeviceConnected = Boolean(peripheralName);
    // Check if current device supports MicroPython
    const currentDevice = deviceData.find(d => d.deviceId === deviceId);
    const supportsMicroPython = currentDevice ?
        (currentDevice.supportsMicroPython ||
           currentDevice.tags?.includes('microPython')) &&
          currentDevice.programLanguage?.some(
              lang => lang === 'python' || lang === 'microPython'
          ) :
        false;

    const isMicroPythonDevice =
        supportsMicroPython &&
        (props.firmwareMode === 'microPython' ||
            deviceId === 'microbitV2' ||
            deviceId === 'microbit');

    // MicroPython upload mode state
    const [runtimeTarget, setRuntimeTarget] = useState('vm');
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState({
        stage: '',
        percent: 0
    });
    const [firmwareStatus, setFirmwareStatus] = useState('unknown');
    const [uploadLog, setUploadLog] = useState([]);

    // Sync firmwareStatus with Redux firmwareMode (set after flash in connection modal)
    useEffect(() => {
        setFirmwareStatus(
            props.firmwareMode === 'microPython' ? 'micropython' : 'unknown',
        );
    }, [props.firmwareMode]);

    // Wire VM serial data events to the serial terminal component
    useEffect(() => {
        if (!vm || typeof vm.addListener !== 'function') return;

        const handleSerialData = data => {
            // Ensure data is a proper Uint8Array.
            // VM emits Buffer (Node.js) in upload mode, which extends Uint8Array.
            let uint8;
            if (data instanceof Uint8Array) {
                // Buffer.byteLength is reliable; use it directly if small,
                // but copy to a plain Uint8Array to avoid holding a ref
                // to a mutable Buffer.
                uint8 = new Uint8Array(
                    data.buffer,
                    data.byteOffset,
                    data.byteLength,
                );
            } else if (ArrayBuffer.isView(data)) {
                uint8 = new Uint8Array(
                    data.buffer,
                    data.byteOffset,
                    data.byteLength,
                );
            } else if (data instanceof ArrayBuffer) {
                uint8 = new Uint8Array(data);
            } else if (typeof data === 'string') {
                uint8 = new TextEncoder().encode(data);
            } else {
                try {
                    uint8 = new Uint8Array(data);
                } catch (e) {
                    return; // unsupported data type, skip
                }
            }

            // Always buffer to global buffer so data is not lost
            // even when SerialTerminal is not mounted yet.
            if (window.__serialTerminalBuffer) {
                const buf = window.__serialTerminalBuffer;
                const combined = new Uint8Array(
                    buf.byteLength + uint8.byteLength,
                );
                combined.set(buf, 0);
                combined.set(uint8, buf.byteLength);
                if (combined.byteLength > 65536) {
                    window.__serialTerminalBuffer = combined.slice(
                        combined.byteLength - 65536,
                    );
                } else {
                    window.__serialTerminalBuffer = combined;
                }
            } else {
                window.__serialTerminalBuffer = uint8;
            }

            // Forward to SerialTerminal via global listener array if mounted
            if (
                Array.isArray(window.__serialTerminalListeners) &&
                window.__serialTerminalListeners.length > 0
            ) {
                window.__serialTerminalListeners.forEach(fn => fn(uint8));
            }
        };

        vm.addListener('PERIPHERAL_RECIVE_DATA', handleSerialData);

        return () => {
            if (vm && typeof vm.removeListener === 'function') {
                vm.removeListener('PERIPHERAL_RECIVE_DATA', handleSerialData);
            }
        };
    }, [vm]);

    // Listen for MicroPython upload/flash progress events from Link server
    useEffect(() => {
        if (!vm || typeof vm.addListener !== 'function') return;

        const handleStdout = data => {
            const text = data?.message || data?.text || String(data || '');
            if (text) {
                const cleaned = text
                    .replace(/\x1b\[[0-9;]*m/g, '')
                    .replace(/\r\n?/g, '')
                    .trim();
                if (/^\.{1,}$/.test(cleaned)) return; // skip esptool connection dots
                const pctMatch = text.match(/[[(](\d+)\s*%[\])]/);
                const percent = pctMatch ?
                    parseInt(pctMatch[1], 10) :
                    undefined;
                setUploadProgress(prev => ({
                    ...prev,
                    text: text,
                    percent: percent !== undefined ? percent : prev.percent
                }));
                setUploadLog(prev => [...prev, text]);
            }
        };
        const handleSuccess = () => {
            setIsUploading(false);
            setUploadProgress({stage: '', percent: 0, text: ''});
            setUploadLog([]);
            setFirmwareStatus('micropython');
            props.onSetFirmwareMode('microPython');
        };
        const handleError = data => {
            setIsUploading(false);
            setUploadProgress({stage: '', percent: 0, text: ''});
            setFirmwareStatus('error');
            const msg =
                data?.message || data?.params?.message || 'Unknown error';
            setUploadLog(prev => [...prev, `Error: ${msg}`]);
            setRunError(prev => `${prev}Error: ${msg}\n`);
        };

        vm.addListener('PERIPHERAL_UPLOAD_STDOUT', handleStdout);
        vm.addListener('PERIPHERAL_UPLOAD_SUCCESS', handleSuccess);
        vm.addListener('PERIPHERAL_UPLOAD_ERROR', handleError);

        return () => {
            vm.removeListener('PERIPHERAL_UPLOAD_STDOUT', handleStdout);
            vm.removeListener('PERIPHERAL_UPLOAD_SUCCESS', handleSuccess);
            vm.removeListener('PERIPHERAL_UPLOAD_ERROR', handleError);
        };
    }, [vm]);

    // Build sprite name list for the completion provider
    const spriteNames = sprites ?
        Object.values(sprites)
            .map(s => s.name)
            .filter(Boolean) :
        [];

    const [runOutput, setRunOutput] = useState([]);
    const [runError, setRunError] = useState('');
    const [isRunning, setIsRunning] = useState(false);
    const [realtimeMode, setRealtimeMode] = useState(false);
    const runnerRef = useRef(null);
    const currentRunSpriteRef = useRef(null);
    const commandContextRef = useRef({});
    const commandQueueRef = useRef(Promise.resolve());
    const runIdRef = useRef(0);
    const commandCountRef = useRef(0);

    const isBridgeCommandLine = line => {
        const parsed = parseNdjsonCommandLine(line);
        return Array.isArray(parsed) && parsed.length > 0;
    };

    const appendOutputLine = line => {
        if (isBridgeCommandLine(line)) {
            console.log('[RAW_STDOUT_JSON]', line);
            return;
        }
        setRunOutput(prev => {
            const text = String(line || '');
            if (!text) return prev;
            const sprite = currentRunSpriteRef.current;
            if (sprite) {
                return [
                    ...prev,
                    {
                        type: 'line',
                        spriteUrl: sprite.url,
                        spriteName: sprite.name,
                        text
                    }
                ];
            }
            return [...prev, {type: 'text', text}];
        });
    };

    const appendErrorLine = line => {
        setRunError(prev => {
            const normalized = String(line || '');
            return normalized ? `${prev}${normalized}\n` : prev;
        });
    };

    const fallbackTargetId =
        (stage && stage.id) ||
        (sprites && Object.keys(sprites).length > 0 ?
            Object.keys(sprites)[0] :
            null);
    const resolvedTargetId = editingTarget || fallbackTargetId;

    const resolveSpriteName = targetId => {
        if (!targetId) return 'Sprite';
        if (stage && stage.id === targetId) return 'Stage';
        return (
            (sprites && sprites[targetId] && sprites[targetId].name) || 'Sprite'
        );
    };

    const resolveTargetType = targetId =>
        (stage && stage.id === targetId ? 'stage' : 'sprite');

    const resolveFileTreeItemByTargetId = targetId =>
        (Array.isArray(fileTree) ?
            fileTree.find(
                item =>
                    item &&
                      item.type === 'file' &&
                      item.targetId === targetId,
            ) :
            null);

    // If running in desktop/native backend, wire IPC stdout/stderr events from preload
    useEffect(() => {
        try {
            if (pythonBackend === 'native' && typeof window !== 'undefined') {
                const api = window.electronAPI;
                if (api && typeof api.on === 'function') {
                    api.on('nomopro-python-stdout', async (event, line) => {
                        const parsed = parseNdjsonCommandLine(line);
                        if (parsed.length) {
                            for (const cmd of parsed) {
                                await queueVmCommand(cmd);
                                const requestId = cmd._requestId;
                                if (typeof requestId !== 'undefined') {
                                    try {
                                        const bridge = window.nomoproDesktopPython;
                                        if (bridge && typeof bridge.writeStdin === 'function') {
                                            const value = await deviceRpcResponse(requestId);
                                            bridge.writeStdin(JSON.stringify({_requestId: requestId, value}));
                                        }
                                    } catch (e) {
                                        appendErrorLine(`[RPC] ${e.message}\n`);
                                    }
                                }
                            }
                        } else {
                            appendOutputLine(line);
                        }
                    });
                    api.on('nomopro-python-stderr', (event, text) => {
                        appendErrorLine(text);
                    });
                }
            }
        } catch (e) {
            // ignore - running in web environment
        }
    }, []);

    const ensureTargetFile = (
        targetId,
        fileNameOverride,
        initialCodeOverride,
    ) => {
        if (!targetId) return;
        const fileName =
            fileNameOverride ||
            resolveFileNameByTarget(targetId, stage, sprites) ||
            'script.py';
        const targetName = resolveSpriteName(targetId);
        const targetType = resolveTargetType(targetId);
        onInitTargetFile(
            targetId,
            fileName,
            initialCodeOverride || createDefaultCode(targetName, targetType),
        );
    };

    // Only run when resolvedTargetId changes (Scratch editing target changes).
    // Do NOT add activeTargetId to deps — it would override user's manual file selection.
    useEffect(() => {
        if (!resolvedTargetId) return;

        ensureTargetFile(resolvedTargetId);

        // Set active target only on initial load (no active target yet)
        if (!activeTargetId) {
            onSetActiveTarget(resolvedTargetId);
        }
    }, [resolvedTargetId]); // eslint-disable-line react-hooks/exhaustive-deps

    // Keep Python target files in sync with the project target list so newly
    // created sprites/backdrops flow like Block mode (no manual refresh needed).
    useEffect(() => {
        const targets = buildFileList(stage, sprites);
        targets.forEach(target => ensureTargetFile(target.targetId));
    }, [stage, sprites]); // eslint-disable-line react-hooks/exhaustive-deps

    const selectedTargetId = activeTargetId || resolvedTargetId;
    const activeFile = selectedTargetId ?
        filesByTargetId[selectedTargetId] :
        null;

    const code = activeFile ? activeFile.code : '';
    const activeFileName = activeFile ?
        activeFile.fileName :
        resolveFileNameByTarget(selectedTargetId, stage, sprites);

    const fileList = buildFileList(stage, sprites);

    const handleCodeChange = newCode =>
        onCodeChange(selectedTargetId, newCode);
    const handleSelectFile = targetId => {
        // Init file entry if not yet present (first time clicking this target)
        if (!filesByTargetId[targetId]) {
            const treeFile = resolveFileTreeItemByTargetId(targetId);
            if (treeFile && /\.py$/i.test(treeFile.name)) {
                ensureTargetFile(
                    targetId,
                    treeFile.name,
                    createStandalonePythonCode(treeFile.name),
                );
            } else {
                ensureTargetFile(
                    targetId,
                    treeFile ? treeFile.name : undefined,
                );
            }
        }
        onSetActiveTarget(targetId);
    };

    const queueVmCommand = command => {
        const cmd = command && command.cmd;
        if (!cmd) return;

        const devId = command && command.args && String(command.args[0] || '');
        if (devId && vm && vm.runtime) {
            const periph = vm.runtime.peripheralExtensions?.[devId];
            if (periph) {
                const ready =
                    typeof periph.isReady === 'function' ?
                        periph.isReady() :
                        '?';
                const connected =
                    typeof periph.isConnected === 'function' ?
                        periph.isConnected() :
                        '?';
                console.log(
                    '[QUEUE_CMD]',
                    cmd,
                    'isReady=',
                    ready,
                    'isConnected=',
                    connected,
                );
            } else {
                console.log('[QUEUE_CMD]', cmd, 'peripheral NOT FOUND');
            }
        }

        // Execute bridge command. The caller (desktop runner) awaits onCommand()
        // for REPORTER blocks, so the returned promise must resolve after bridge
        // execution to ensure _pendingDeviceResults are available.
        return executeBridgeCommand(vm, command, commandContextRef.current)
            .then(result => {
                if (result) commandContextRef.current = result;
            })
            .catch(error => {
                const msg = (error && error.message) || String(error);
                if (/soundEffects/i.test(msg)) return;
                appendOutputLine(`[Bridge] ${msg}`);
                appendErrorLine(`[Bridge] ${msg}\n`);
            });
    };

    const deviceRpcResponse = async requestId => {
        for (let i = 0; i < 50; i++) {
            const results = drainPendingDeviceResults();
            const match = results.find(r => r.requestId === requestId);
            if (match) return match.value;
            await new Promise(r => setTimeout(r, 100));
        }
        throw new Error(`Device RPC timeout: requestId ${requestId}`);
    };

    const createRunner = async () => {
        let candidates;
        if (
            pythonBackend !== 'pyodide' &&
            typeof window !== 'undefined' &&
            window.electronAPI?.getPythonCandidates
        ) {
            try {
                candidates = await window.electronAPI.getPythonCandidates();
            } catch (e) {
                console.warn('[PythonIDE] Failed to get python candidates:', e);
            }
        }
        return (
            pythonBackend === 'pyodide' ?
                createPyodideRunner :
                createDesktopPythonRunner
        )({
            onStdoutLine: appendOutputLine,
            onStderr: text => appendErrorLine(text),
            onCommand: queueVmCommand,
            onDeviceRpcResponse: deviceRpcResponse,
            executionTimeoutMs: realtimeMode ? 0 : undefined,
            pythonCandidates: candidates
        });
    };

    const runTargetCode = async (targetId, scriptCode, label = '') => {
        commandContextRef.current = {
            selectedTargetId: targetId
        };
        commandQueueRef.current = Promise.resolve();
        commandCountRef.current = 0;

        const runId = ++runIdRef.current;
        const runner = await createRunner();
        if (!runner.isAvailable()) {
            throw new Error(
                pythonBackend === 'pyodide' ?
                    'Pyodide runner is unavailable in this browser environment.' :
                    'Desktop Python runner is unavailable. Provide a preload bridge (window.nomoproDesktopPython.runPythonCode) or enable Node integration in Electron.',
            );
        }

        const target =
            stage && stage.id === targetId ? stage : sprites?.[targetId];
        const spriteUrl = target?.costume?.asset ?
            getCostumeUrl(target.costume.asset) :
            null;
        currentRunSpriteRef.current = spriteUrl ?
            {url: spriteUrl, name: label || target?.name || 'script'} :
            null;

        runnerRef.current = runner;

        const codeToRun = normalizeRunnerCode(scriptCode);
        const runLabel = label || 'script';
        appendOutputLine(runLabel);
        const result = await runner.run(codeToRun);
        await commandQueueRef.current;
        currentRunSpriteRef.current = null;
        if (result.stderr) {
            appendErrorLine(result.stderr);
        }
        return result;
    };

    const handleRun = async () => {
        if (isRunning) return;

        setRunOutput([]);
        setRunError('');
        setIsRunning(true);
        try {
            const result = await runTargetCode(
                selectedTargetId,
                code,
                activeFileName || 'script.py',
            );
            if (result.exitCode !== 0) {
                appendOutputLine(
                    `Process finished (exitCode=${result.exitCode}).`,
                );
            }
        } catch (error) {
            const msg = error.message || String(error);
            if (/^Pyodide execution (stopped|timed out)/i.test(msg)) {
                appendOutputLine(`[System] ${msg}`);
            } else {
                appendErrorLine(msg);
            }
        } finally {
            runnerRef.current = null;
            setIsRunning(false);
        }
    };

    const handleRunAll = async () => {
        if (isRunning) return;

        setRunOutput([]);
        setRunError('');
        setIsRunning(true);

        const targetsMap = new Map();

        buildFileList(stage, sprites).forEach(target => {
            targetsMap.set(target.targetId, target);
        });

        if (Array.isArray(fileTree)) {
            fileTree
                .filter(
                    item =>
                        item &&
                        item.type === 'file' &&
                        item.targetId &&
                        /\.py$/i.test(item.name),
                )
                .forEach(item => {
                    if (!targetsMap.has(item.targetId)) {
                        targetsMap.set(item.targetId, {
                            targetId: item.targetId,
                            fileName: item.name
                        });
                    }
                });
        }

        const targets = Array.from(targetsMap.values());

        try {
            for (let index = 0; index < targets.length; index++) {
                const target = targets[index];
                const targetId = target.targetId;
                const targetFile = filesByTargetId[targetId];
                const scriptCode = targetFile ?
                    targetFile.code :
                    /\.py$/i.test(target.fileName) ?
                        createStandalonePythonCode(target.fileName) :
                        createDefaultCode(
                            resolveSpriteName(targetId),
                            resolveTargetType(targetId),
                        );

                const result = await runTargetCode(
                    targetId,
                    scriptCode,
                    target.fileName,
                );

                if (result.exitCode !== 0) {
                    appendOutputLine(
                        `[Done] ${target.fileName} (exitCode=${result.exitCode})`,
                    );
                }
            }

            appendOutputLine('--- Run all finished ---');
        } catch (error) {
            const msg = error.message || String(error);
            if (/^Pyodide execution (stopped|timed out)/i.test(msg)) {
                appendOutputLine(`[System] ${msg}`);
            } else {
                appendErrorLine(msg);
            }
        } finally {
            runnerRef.current = null;
            setIsRunning(false);
        }
    };

    const handleStop = () => {
        if (runnerRef.current) {
            runnerRef.current.stop();
            appendOutputLine('Stop requested.');
        }
        setIsRunning(false);
    };

    const handleClear = () => {
        setRunOutput([]);
        setRunError('');
    };

    // Serial terminal handlers
    const handleSerialSend = data => {
        if (vm && deviceId && typeof vm.writeToPeripheral === 'function') {
            vm.writeToPeripheral(deviceId, data);
        }
    };

    const handleSerialBaudrate = baudrate => {
        if (vm && deviceId && typeof vm.setPeripheralBaudrate === 'function') {
            vm.setPeripheralBaudrate(deviceId, baudrate);
        }
    };

    // REPL send handler (same as serial send)
    const handleReplSend = handleSerialSend;

    // MicroPython upload runner
    const micropythonRunnerRef = useRef(null);
    if (!micropythonRunnerRef.current) {
        micropythonRunnerRef.current = new MicropythonRunner();
    }

    const isMicrobit = deviceId === 'microbitV2' || deviceId === 'microbit';

    const handleUploadToDevice = async code => {
        if (!isDeviceConnected || !deviceId || !vm) {
            throw new Error('Device not connected');
        }
        if (isMicrobit) {
            // Micro:bit uses the same VM upload path as C++/Blocks mode
            // (WebSocket -> Link server -> microbit.js / uflash)
            setIsUploading(true);
            setUploadProgress({
                stage: 'upload',
                percent: 0,
                text: 'Uploading...'
            });
            vm.uploadToPeripheral(deviceId, code);
            return;
        }
        if (typeof vm.writeToPeripheral !== 'function') {
            throw new Error('Device not connected');
        }
        const onSend = data => vm.writeToPeripheral(deviceId, data);
        micropythonRunnerRef.current.sendCode(code, onSend);
    };

    const handleUploadAsMain = async code => {
        if (!isDeviceConnected || !deviceId || !vm) {
            throw new Error('Device not connected');
        }
        if (isMicrobit) {
            // Micro:bit does not have a separate "main.py" concept;
            // VM upload always writes to main.py via microfs.
            setIsUploading(true);
            setUploadProgress({
                stage: 'upload',
                percent: 0,
                text: 'Uploading...'
            });
            vm.uploadToPeripheral(deviceId, code);
            return;
        }
        if (typeof vm.writeToPeripheral !== 'function') {
            throw new Error('Device not connected');
        }
        const onSend = data => vm.writeToPeripheral(deviceId, data);
        micropythonRunnerRef.current.uploadMain(code, onSend);
    };

    // MicroPython Upload Mode handlers (VM peripheral path)
    const getPeripheral = () =>
        (vm && vm.runtime && vm.runtime.peripheralExtensions ?
            vm.runtime.peripheralExtensions[deviceId] :
            null);

    const handleDetectFirmware = () => {
        if (!peripheralName || !deviceId || !vm) return;
        setUploadLog([]);
        setFirmwareStatus('checking');

        const peripheral = getPeripheral();
        if (peripheral && typeof peripheral.micropythonUpload === 'function') {
            try {
                peripheral.micropythonUpload('', {
                    detectOnly: true,
                    board: deviceId
                });
            } catch (e) {
                setFirmwareStatus('error');
            }
            return;
        }

        // Fallback: VM path via _micropythonMode
        try {
            vm.runtime._micropythonMode = 'detect';
            vm.uploadToPeripheral(deviceId, '');
        } catch (e) {
            setFirmwareStatus('error');
        }
    };

    const handleFlashFirmware = () => {
        if (!peripheralName || !deviceId || !vm) return;
        setUploadLog([]);
        setIsUploading(true);
        setUploadProgress({
            stage: 'flash',
            percent: 0,
            text: 'Starting flash...'
        });

        const BOARD_MAP = {
            arduinoEsp32: 'esp32',
            arduinoEsp8266NodeMCU: 'esp8266',
            arduinoRaspberryPiPico: 'rpi_pico',
            microbitV2: 'microbit'
        };
        const board = BOARD_MAP[deviceId] || deviceId || 'esp32';

        const peripheral = getPeripheral();
        if (peripheral && typeof peripheral.micropythonUpload === 'function') {
            try {
                peripheral.micropythonUpload('', {flashOnly: true, board});
                // Progress/completion handled by VM listeners (PERIPHERAL_UPLOAD_STDOUT/SUCCESS/ERROR)
                return;
            } catch (e) {
                setIsUploading(false);
                setRunError(prev => `${prev}Flash error: ${e.message}\n`);
            }
            return;
        }

        // Fallback: VM path via _micropythonMode
        try {
            vm.runtime._micropythonMode = 'flash';
            vm.uploadToPeripheral(deviceId, '');
        } catch (e) {
            setIsUploading(false);
            setRunError(prev => `${prev}Flash error: ${e.message}\n`);
        }
    };

    // Auto-detect firmware when switching to MicroPython upload mode
    useEffect(() => {
        if (
            runtimeTarget === 'micropython' &&
            isDeviceConnected &&
            supportsMicroPython
        ) {
            if (firmwareStatus === 'unknown' || firmwareStatus === 'error') {
                handleDetectFirmware();
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [runtimeTarget]);

    // Upload via existing REPL connection (no disconnect!)
    const handleUploadRun = () => {
        if (!code || !isDeviceConnected || !deviceId || !vm) return;
        setUploadLog([]);
        const onSend = data => vm.writeToPeripheral(deviceId, data);
        micropythonRunnerRef.current.uploadMain(code, onSend, {
            shouldReset: true
        });
    };

    const handleUploadOnly = () => {
        if (!code || !isDeviceConnected || !deviceId || !vm) return;
        setUploadLog([]);
        const onSend = data => vm.writeToPeripheral(deviceId, data);
        micropythonRunnerRef.current.uploadMain(code, onSend, {
            shouldReset: false
        });
    };

    const handleStopBoard = () => {
        if (vm && deviceId && typeof vm.writeToPeripheral === 'function') {
            vm.writeToPeripheral(deviceId, '\x04');
        }
    };

    // Auto-detect firmware when switching to MicroPython mode

    // Handler: Restore project from loaded JSON
    const handleLoadProject = data => {
        if (!data || !Array.isArray(data.fileList)) {
            alert('Invalid project file: missing fileList');
            return;
        }
        // Inisialisasi semua file
        data.fileList.forEach(file => {
            const code =
                data.code && file.fileName === data.activeFile ? data.code : '';
            // Fallback: jika data.code hanya untuk activeFile, file lain kosong
            props.onInitTargetFile(file.targetId, file.fileName, code);
        });
        // Set file aktif
        if (data.fileList.length > 0) {
            const active =
                data.fileList.find(f => f.fileName === data.activeFile) ||
                data.fileList[0];
            props.onSetActiveTarget(active.targetId);
        }
    };

    return (
        <PythonIdeComponent
            code={code}
            activeFile={activeFileName}
            activeTargetId={selectedTargetId}
            fileList={fileList}
            fileTree={props.fileTree}
            expandedFolderIds={props.expandedFolderIds}
            isRunning={isRunning}
            runOutput={runOutput}
            runError={runError}
            spriteNames={spriteNames}
            deviceId={deviceId}
            peripheralName={peripheralName}
            isDeviceConnected={isDeviceConnected}
            isMicroPythonDevice={isMicroPythonDevice}
            onSerialSend={handleSerialSend}
            onSerialBaudrate={handleSerialBaudrate}
            onReplSend={handleReplSend}
            onUploadToDevice={handleUploadToDevice}
            onUploadAsMain={handleUploadAsMain}
            onCodeChange={handleCodeChange}
            onRun={handleRun}
            onRunAll={handleRunAll}
            onStop={handleStop}
            onClear={handleClear}
            onSelectFile={handleSelectFile}
            onLoadProject={handleLoadProject}
            onCreateFolder={props.onCreateFolder}
            onCreateFile={props.onCreateFile}
            onToggleFolderExpand={props.onToggleFolderExpand}
            onRenameTreeItem={props.onRenameTreeItem}
            onDeleteTreeItem={props.onDeleteTreeItem}
            onMoveTreeItem={props.onMoveTreeItem}
            onDuplicateTreeItem={props.onDuplicateTreeItem}
            onOpenExtensionLibrary={props.onOpenExtensionLibrary}
            filesByTargetId={filesByTargetId}
            realtimeMode={realtimeMode}
            onRealtimeModeChange={setRealtimeMode}
            moduleLibraryItems={props.moduleLibraryItems}
            onSetModuleLibraryItems={props.onSetModuleLibraryItems}
            // MicroPython upload mode props
            supportsMicroPython={supportsMicroPython}
            runtimeTarget={runtimeTarget}
            onRuntimeTargetChange={setRuntimeTarget}
            firmwareStatus={firmwareStatus}
            mpIsUploading={isUploading}
            mpUploadProgress={uploadProgress}
            mpUploadLog={uploadLog}
            onFlashFirmware={handleFlashFirmware}
            onDetectFirmware={handleDetectFirmware}
            onUploadRun={handleUploadRun}
            onUploadOnly={handleUploadOnly}
            onStopBoard={handleStopBoard}
            stageSizeMode={props.stageSizeMode}
        />
    );
};

PythonIde.propTypes = {
    activeTargetId: PropTypes.string,
    editingTarget: PropTypes.string,
    filesByTargetId: PropTypes.objectOf(PropTypes.object),
    fileTree: PropTypes.array,
    expandedFolderIds: PropTypes.object,
    onInitTargetFile: PropTypes.func,
    onSetActiveTarget: PropTypes.func,
    onCodeChange: PropTypes.func,
    onCreateFolder: PropTypes.func,
    onCreateFile: PropTypes.func,
    onToggleFolderExpand: PropTypes.func,
    onRenameTreeItem: PropTypes.func,
    onDeleteTreeItem: PropTypes.func,
    onMoveTreeItem: PropTypes.func,
    onDuplicateTreeItem: PropTypes.func,
    onOpenExtensionLibrary: PropTypes.func,
    sprites: PropTypes.shape({}),
    stage: PropTypes.shape({}),
    vm: PropTypes.shape({
        runtime: PropTypes.shape({
            getTargetById: PropTypes.func
        })
    }).isRequired,
    deviceId: PropTypes.string,
    peripheralName: PropTypes.string,
    deviceType: PropTypes.string,
    firmwareMode: PropTypes.string,
    stageSizeMode: PropTypes.string,
    moduleLibraryItems: PropTypes.array,
    onSetModuleLibraryItems: PropTypes.func
};

const mapStateToProps = state => ({
    activeTargetId: state.scratchGui.pythonIde.activeTargetId,
    filesByTargetId: state.scratchGui.pythonIde.filesByTargetId,
    fileTree: state.scratchGui.pythonIde.fileTree,
    expandedFolderIds: state.scratchGui.pythonIde.expandedFolderIds,
    editingTarget: state.scratchGui.targets.editingTarget,
    stage: state.scratchGui.targets.stage,
    sprites: state.scratchGui.targets.sprites,
    vm: state.scratchGui.vm,
    deviceId: state.scratchGui.device.deviceId,
    deviceType: state.scratchGui.device.deviceType,
    firmwareMode: state.scratchGui.device.firmwareMode,
    stageSizeMode: state.scratchGui.stageSize.stageSize,
    peripheralName: state.scratchGui.connectionModal.peripheralName,
    moduleLibraryItems: state.scratchGui.pythonIde.moduleLibraryItems
});

const mapDispatchToProps = dispatch => ({
    onSetActiveTarget: targetId => dispatch(setActiveTarget(targetId)),
    onInitTargetFile: (targetId, fileName, initialCode) =>
        dispatch(initTargetFile(targetId, fileName, initialCode)),
    onCodeChange: (targetId, code) =>
        dispatch(updateTargetCode(targetId, code)),
    onCreateFolder: (folderName, parentId) =>
        dispatch(createFolder(folderName, parentId)),
    onCreateFile: (fileName, parentId, targetId, initialCode) =>
        dispatch(createFile(fileName, parentId, targetId, initialCode)),
    onToggleFolderExpand: folderId => dispatch(toggleFolderExpand(folderId)),
    onRenameTreeItem: (itemId, newName) =>
        dispatch(renameTreeItem(itemId, newName)),
    onDeleteTreeItem: itemId => dispatch(deleteTreeItem(itemId)),
    onMoveTreeItem: (itemId, newParentId) =>
        dispatch(moveTreeItem(itemId, newParentId)),
    onDuplicateTreeItem: (itemId, newParentId) =>
        dispatch(duplicateTreeItem(itemId, newParentId)),
    onOpenExtensionLibrary: () => {
        dispatch(openExtensionLibrary());
    },
    onSetModuleLibraryItems: items => dispatch(setModuleLibraryItems(items)),
    onSetFirmwareMode: mode => dispatch(setFirmwareMode(mode))
});

export default connect(mapStateToProps, mapDispatchToProps)(PythonIde);
