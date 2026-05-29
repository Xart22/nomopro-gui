import {createBridgeCommandRegistry} from './bridge-command-registry';

const DEFAULT_WAIT_MS = 0;

// Queue for device read results that need to be sent back to the Python runner.
// The runner should call drainPendingDeviceResults() after each command batch.
const _pendingDeviceResults = [];

/**
 * Drain and return all pending device read results.
 * Used by the Python runner to forward results back to the Python process.
 * @returns {Array<{requestId: string, value: *}>}
 */
export const drainPendingDeviceResults = () => {
    const results = _pendingDeviceResults.slice();
    _pendingDeviceResults.length = 0;
    return results;
};

const toNumber = (value, fallback) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const sleep = ms =>
    new Promise(resolve => {
        setTimeout(resolve, Math.max(DEFAULT_WAIT_MS, ms));
    });

const findTargetByName = (runtime, targetName) => {
    if (!runtime || !targetName) return null;

    if (typeof runtime.getSpriteTargetByName === 'function') {
        const spriteTarget = runtime.getSpriteTargetByName(targetName);
        if (spriteTarget) return spriteTarget;
    }

    if (!Array.isArray(runtime.targets)) return null;
    return runtime.targets.find(target => {
        const name =
            typeof target.getName === 'function' ? target.getName() : '';
        return name === targetName;
    });
};

const resolveTarget = (vm, command, context) => {
    const runtime = vm && vm.runtime;
    if (!runtime) return null;

    if (
        command &&
        command.targetId &&
        typeof runtime.getTargetById === 'function'
    ) {
        const byId = runtime.getTargetById(command.targetId);
        if (byId) return byId;
    }

    if (command && command.targetName) {
        const byName = findTargetByName(runtime, command.targetName);
        if (byName) return byName;
    }

    if (
        context &&
        context.selectedTargetId &&
        typeof runtime.getTargetById === 'function'
    ) {
        const selected = runtime.getTargetById(context.selectedTargetId);
        if (selected) return selected;
    }

    if (vm.editingTarget) return vm.editingTarget;
    if (typeof runtime.getEditingTarget === 'function') {
        const editingTarget = runtime.getEditingTarget();
        if (editingTarget) return editingTarget;
    }
    if (typeof runtime.getTargetForStage === 'function') {
        return runtime.getTargetForStage();
    }
    return null;
};

const emitTargetsUpdate = vm => {
    if (typeof vm.emitTargetsUpdate === 'function') {
        vm.emitTargetsUpdate(false);
    }
};

const normalizeCommand = rawCommand => {
    if (!rawCommand || typeof rawCommand !== 'object') return null;

    if (typeof rawCommand.cmd === 'string') {
        return {
            cmd: rawCommand.cmd,
            args: Array.isArray(rawCommand.args) ? rawCommand.args : [],
            targetId: rawCommand.targetId,
            targetName: rawCommand.targetName
        };
    }

    // Backward compatibility with older Python runner payloads.
    if (typeof rawCommand.action === 'string') {
        const action = rawCommand.action;
        const map = {
            green_flag: {cmd: 'greenFlag', args: []},
            key_pressed_event: {
                cmd: 'triggerKeyPressed',
                args: [rawCommand.value]
            },
            stage_clicked: {cmd: 'triggerStageClicked', args: []},
            sprite_clicked: {cmd: 'triggerSpriteClicked', args: []},
            backdrop_switched_to: {
                cmd: 'triggerBackdropSwitch',
                args: [rawCommand.value]
            },
            broadcast: {cmd: 'broadcast', args: [rawCommand.value]},
            broadcast_and_wait: {
                cmd: 'broadcastAndWait',
                args: [rawCommand.value]
            },
            move: {cmd: 'move', args: [rawCommand.value]},
            turn_right: {cmd: 'turn', args: [rawCommand.value]},
            turn_left: {cmd: 'turn', args: [-toNumber(rawCommand.value, 0)]},
            point: {cmd: 'point', args: [rawCommand.value]},
            point_direction: {cmd: 'point', args: [rawCommand.value]},
            point_in_direction: {cmd: 'point', args: [rawCommand.value]},
            say: {cmd: 'say', args: [rawCommand.value]},
            think: {cmd: 'think', args: [rawCommand.value]},
            goto: {cmd: 'gotoXY', args: [rawCommand.x, rawCommand.y]},
            go_to_xy: {cmd: 'gotoXY', args: [rawCommand.x, rawCommand.y]},
            set_x: {cmd: 'setX', args: [toNumber(rawCommand.value, 0)]},
            set_y: {cmd: 'setY', args: [toNumber(rawCommand.value, 0)]},
            change_x: {
                cmd: 'changeX',
                args: [toNumber(rawCommand.value, 0)]
            },
            change_y: {
                cmd: 'changeY',
                args: [toNumber(rawCommand.value, 0)]
            },
            show: {cmd: 'show', args: []},
            hide: {cmd: 'hide', args: []},
            set_size: {
                cmd: 'setSize',
                args: [toNumber(rawCommand.value, 100)]
            },
            change_size: {
                cmd: 'changeSize',
                args: [toNumber(rawCommand.value, 0)]
            },
            set_costume: {cmd: 'setCostume', args: [rawCommand.value]},
            set_backdrop: {cmd: 'setBackdrop', args: [rawCommand.value]},
            next_costume: {cmd: 'nextCostume', args: []},
            next_backdrop: {cmd: 'nextBackdrop', args: []},
            play_sound: {cmd: 'playSound', args: [rawCommand.value]},
            playSound: {cmd: 'playSound', args: [rawCommand.value]},
            play_sound_until_done: {cmd: 'playSound', args: [rawCommand.value]},
            setEffect: {cmd: 'setEffect', args: [rawCommand.effect, rawCommand.value]},
            set_effect: {cmd: 'setEffect', args: [rawCommand.effect, rawCommand.value]},
            changeEffect: {cmd: 'changeEffect', args: [rawCommand.effect, rawCommand.value]},
            change_effect: {cmd: 'changeEffect', args: [rawCommand.effect, rawCommand.value]},
            clearEffects: {cmd: 'clearEffects', args: []},
            clear_effects: {cmd: 'clearEffects', args: []},
            if_on_edge_bounce: {cmd: 'ifOnEdgeBounce', args: []},
            bounce_on_edge: {cmd: 'ifOnEdgeBounce', args: []},
            create_clone: {
                cmd: 'createClone',
                args: [rawCommand.value || '_myself_']
            },
            delete_clone: {cmd: 'deleteClone', args: []},
            wait: {cmd: 'wait', args: [rawCommand.value]}
        };
        const mapped = map[action];
        if (!mapped) return null;
        return {
            cmd: mapped.cmd,
            args: mapped.args,
            targetId: rawCommand.targetId,
            targetName: rawCommand.targetName
        };
    }

    return null;
};

const moveBySteps = (vm, target, steps) => {
    const runtimeSprite = vm && vm.runtime && vm.runtime.sprite;
    if (runtimeSprite && typeof runtimeSprite.moveSteps === 'function') {
        runtimeSprite.moveSteps(steps);
        return;
    }

    const direction = toNumber(target.direction, 90);
    const radians = ((90 - direction) * Math.PI) / 180;
    const dx = steps * Math.cos(radians);
    const dy = steps * Math.sin(radians);
    target.setXY(target.x + dx, target.y + dy);
};

const bounceOnEdge = (runtime, target) => {
    if (
        !target ||
        typeof target.getBounds !== 'function' ||
        typeof target.keepInFence !== 'function'
    ) {
        return;
    }

    const bounds = target.getBounds();
    if (!bounds) return;

    const stageWidth =
        runtime && runtime.constructor && runtime.constructor.STAGE_WIDTH ?
            runtime.constructor.STAGE_WIDTH :
            480;
    const stageHeight =
        runtime && runtime.constructor && runtime.constructor.STAGE_HEIGHT ?
            runtime.constructor.STAGE_HEIGHT :
            360;

    const distLeft = Math.max(0, stageWidth / 2 + bounds.left);
    const distTop = Math.max(0, stageHeight / 2 - bounds.top);
    const distRight = Math.max(0, stageWidth / 2 - bounds.right);
    const distBottom = Math.max(0, stageHeight / 2 + bounds.bottom);

    let nearestEdge = '';
    let minDist = Infinity;
    if (distLeft < minDist) {
        minDist = distLeft;
        nearestEdge = 'left';
    }
    if (distTop < minDist) {
        minDist = distTop;
        nearestEdge = 'top';
    }
    if (distRight < minDist) {
        minDist = distRight;
        nearestEdge = 'right';
    }
    if (distBottom < minDist) {
        minDist = distBottom;
        nearestEdge = 'bottom';
    }
    if (minDist > 0) return;

    const radians = ((90 - toNumber(target.direction, 90)) * Math.PI) / 180;
    let dx = Math.cos(radians);
    let dy = -Math.sin(radians);

    if (nearestEdge === 'left') {
        dx = Math.max(0.2, Math.abs(dx));
    } else if (nearestEdge === 'top') {
        dy = Math.max(0.2, Math.abs(dy));
    } else if (nearestEdge === 'right') {
        dx = 0 - Math.max(0.2, Math.abs(dx));
    } else if (nearestEdge === 'bottom') {
        dy = 0 - Math.max(0.2, Math.abs(dy));
    }

    const newDirection = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
    target.setDirection(newDirection);
    const fencedPosition = target.keepInFence(target.x, target.y);
    target.setXY(fencedPosition[0], fencedPosition[1]);
};

const setCostumeByName = (target, costumeName) => {
    if (typeof target.getCostumes !== 'function' || !costumeName) return false;
    const costumes = target.getCostumes();
    const index = costumes.findIndex(costume => costume.name === costumeName);
    if (index < 0 || typeof target.setCostume !== 'function') return false;
    target.setCostume(index);
    return true;
};

const nextCostume = target => {
    if (typeof target.getCostumes !== 'function') return false;
    if (typeof target.setCostume !== 'function') return false;

    const costumes = target.getCostumes();
    if (!costumes || costumes.length === 0) return false;

    const current = toNumber(target.currentCostume, 0);
    target.setCostume((current + 1) % costumes.length);
    return true;
};

const playSoundByName = (target, soundName) => {
    if (!soundName) return false;

    if (
        typeof target.getSounds === 'function' &&
        target.sprite &&
        target.sprite.soundBank &&
        typeof target.sprite.soundBank.playSound === 'function'
    ) {
        const sounds = target.getSounds();
        const sound = sounds.find(item => item.name === soundName);
        if (!sound) return false;
        target.sprite.soundBank.playSound(target.id, sound.soundId);
        return true;
    }

    return false;
};

const SOUND_STATE_KEY = 'Scratch.sound';

const getSoundState = target => {
    if (typeof target.getCustomState !== 'function') return null;
    let state = target.getCustomState(SOUND_STATE_KEY);
    if (!state) {
        state = {effects: {pitch: 0, pan: 0}};
        if (typeof target.setCustomState === 'function') {
            target.setCustomState(SOUND_STATE_KEY, state);
        }
    }
    return state;
};

const syncSoundEffects = target => {
    const state = getSoundState(target);
    if (!state) return;
    target.soundEffects = state.effects;
    if (target.sprite && target.sprite.soundBank &&
        typeof target.sprite.soundBank.setEffects === 'function') {
        target.sprite.soundBank.setEffects(target);
    }
};

const setSoundEffect = (target, effect, value) => {
    const state = getSoundState(target);
    if (!state) return;
    const validEffects = {pitch: true, pan: true};
    const key = String(effect || '').toLowerCase();
    if (!validEffects[key]) return;
    state.effects[key] = value;
    syncSoundEffects(target);
};

const changeSoundEffect = (target, effect, value) => {
    const state = getSoundState(target);
    if (!state) return;
    const validEffects = {pitch: true, pan: true};
    const key = String(effect || '').toLowerCase();
    if (!validEffects[key]) return;
    state.effects[key] += value;
    syncSoundEffects(target);
};

const clearSoundEffects = target => {
    const state = getSoundState(target);
    if (!state) return;
    for (const key of Object.keys(state.effects)) {
        state.effects[key] = 0;
    }
    syncSoundEffects(target);
};

const setTargetVisible = (target, visible) => {
    if (!target) return;
    if (typeof target.setVisible === 'function') {
        target.setVisible(visible);
        return;
    }
    target.visible = !!visible;
};

const setTargetSize = (target, size) => {
    if (!target) return;
    if (typeof target.setSize === 'function') {
        target.setSize(size);
        return;
    }
    target.size = size;
};

const ensureExtensionLoaded = async (vm, extensionId) => {
    if (!vm || !vm.extensionManager || !extensionId) return false;

    const {extensionManager} = vm;
    if (extensionManager.isExtensionLoaded(extensionId)) {
        return true;
    }

    if (typeof extensionManager.loadExtensionIdSync === 'function') {
        extensionManager.loadExtensionIdSync(extensionId);
        return extensionManager.isExtensionLoaded(extensionId);
    }

    if (typeof extensionManager.loadExtensionURL === 'function') {
        await extensionManager.loadExtensionURL(extensionId);
        return extensionManager.isExtensionLoaded(extensionId);
    }

    return false;
};

const executeExtensionOpcode = async (
    vm,
    runtime,
    target,
    extensionId,
    opcode,
    args = {},
) => {
    const loaded = await ensureExtensionLoaded(vm, extensionId);
    if (!loaded) {
        throw new Error(
            `Extension '${extensionId}' is not available in current runtime.`,
        );
    }

    if (typeof runtime.getOpcodeFunction !== 'function') {
        throw new Error('Runtime opcode registry is unavailable.');
    }

    const primitive = runtime.getOpcodeFunction(`${extensionId}_${opcode}`);
    if (typeof primitive !== 'function') {
        throw new Error(
            `Extension opcode '${extensionId}_${opcode}' is not available.`,
        );
    }

    let result = primitive(args, {target});
    if (result && typeof result.then === 'function') {
        result = await result;
    }

    return result;
};

const buildCommandResultContext = (context, target) => {
    if (!target) return context;
    return {
        ...context,
        selectedTargetId: target.id
    };
};

const commandRegistry = createBridgeCommandRegistry({
    toNumber,
    sleep,
    moveBySteps,
    bounceOnEdge,
    setCostumeByName,
    nextCostume,
    playSoundByName,
    setSoundEffect,
    changeSoundEffect,
    clearSoundEffects,
    setTargetSize,
    setTargetVisible,
    buildCommandResultContext,
    executeExtensionOpcode
});

export const getBridgeRegisteredCommands = () => Object.keys(commandRegistry);

export const executeBridgeCommand = async (vm, rawCommand, context = {}) => {
    const command = normalizeCommand(rawCommand);
    if (!command) return context;

    const {cmd, args} = command;
    const runtime = vm && vm.runtime;
    if (!runtime) {
        throw new Error('VM runtime is not available.');
    }

    const commandHandler = commandRegistry[cmd];
    if (!commandHandler) {
        throw new Error(`Unsupported bridge command: ${cmd}`);
    }

    const target = commandHandler.resolveTarget ?
        resolveTarget(vm, command, context) :
        null;

    if (commandHandler.resolveTarget && !target) {
        throw new Error(`No target available for command '${cmd}'.`);
    }

    const handlerResult = await commandHandler.execute({
        vm,
        runtime,
        command,
        args,
        target,
        context
    });

    // Capture device read results (from deviceDigitalRead, deviceAnalogRead, etc.)
    // These are forwarded to the Python runner via drainPendingDeviceResults()
    if (handlerResult && handlerResult._deviceResult) {
        _pendingDeviceResults.push(handlerResult._deviceResult);
    }

    if (commandHandler.emitTargetsUpdate !== false) {
        emitTargetsUpdate(vm);
    }

    if (handlerResult) {
        // If the result was a device read, don't use it as the context
        if (handlerResult._deviceResult) {
            return buildCommandResultContext(context, target);
        }
        return handlerResult;
    }

    return buildCommandResultContext(context, target);
};

export const executeBridgeBatch = async (
    vm,
    commands,
    initialContext = {},
    onCommandResult,
) => {
    if (!Array.isArray(commands) || commands.length === 0) {
        return initialContext;
    }

    let context = initialContext;
    for (let index = 0; index < commands.length; index++) {
        const command = commands[index];
        context = await executeBridgeCommand(vm, command, context);
        if (onCommandResult) {
            onCommandResult({
                command,
                index,
                context
            });
        }
    }

    return context;
};
