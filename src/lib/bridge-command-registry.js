export const createBridgeCommandRegistry = ({
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
}) => ({
    greenFlag: {
        resolveTarget: false,
        emitTargetsUpdate: false,
        execute: async ({runtime}) => {
            runtime.greenFlag();
        }
    },
    triggerKeyPressed: {
        resolveTarget: false,
        emitTargetsUpdate: false,
        execute: async ({runtime, args}) => {
            const key = String(args[0] || 'any').toLowerCase();
            runtime.startHats('event_whenkeypressed', {
                KEY_OPTION: key
            });
            if (key !== 'any') {
                runtime.startHats('event_whenkeypressed', {
                    KEY_OPTION: 'any'
                });
            }
        }
    },
    triggerStageClicked: {
        resolveTarget: false,
        emitTargetsUpdate: false,
        execute: async ({runtime}) => {
            runtime.startHats('event_whenstageclicked');
        }
    },
    triggerSpriteClicked: {
        resolveTarget: true,
        emitTargetsUpdate: false,
        execute: async ({runtime, target}) => {
            runtime.startHats('event_whenthisspriteclicked', null, target);
        }
    },
    triggerBackdropSwitch: {
        resolveTarget: false,
        emitTargetsUpdate: false,
        execute: async ({runtime, args}) => {
            const backdropName = String(args[0] || '');
            runtime.startHats('event_whenbackdropswitchesto', {
                BACKDROP: backdropName
            });
        }
    },
    createClone: {
        resolveTarget: true,
        emitTargetsUpdate: false,
        execute: async ({runtime, target, args}) => {
            const option = String(args[0] || '_myself_');
            const cloneTarget =
                option === '_myself_' ?
                    target :
                    runtime.getSpriteTargetByName(option);

            if (!cloneTarget || typeof cloneTarget.makeClone !== 'function') {
                return;
            }

            const newClone = cloneTarget.makeClone();
            if (!newClone) {
                return;
            }

            runtime.addTarget(newClone);
            if (typeof newClone.goBehindOther === 'function') {
                newClone.goBehindOther(cloneTarget);
            }
        }
    },
    deleteClone: {
        resolveTarget: true,
        emitTargetsUpdate: false,
        execute: async ({runtime, target}) => {
            if (!target || target.isOriginal) {
                return;
            }

            runtime.disposeTarget(target);
            runtime.stopForTarget(target);
        }
    },
    broadcast: {
        resolveTarget: false,
        emitTargetsUpdate: false,
        execute: async ({runtime, args}) => {
            const message = String(args[0] || '').trim();
            if (!message) return;
            runtime.startHats('event_whenbroadcastreceived', {
                BROADCAST_OPTION: message
            });
        }
    },
    broadcastAndWait: {
        resolveTarget: false,
        emitTargetsUpdate: false,
        execute: async ({runtime, args}) => {
            const message = String(args[0] || '').trim();
            if (!message) return;

            const startedThreads = runtime.startHats(
                'event_whenbroadcastreceived',
                {
                    BROADCAST_OPTION: message
                },
            );

            if (!Array.isArray(startedThreads) || startedThreads.length === 0) {
                return;
            }

            // Keep polling runtime thread list until all spawned threads finish.
            for (let i = 0; i < 500; i++) {
                const activeThreads = runtime.threads || [];
                const stillRunning = startedThreads.some(thread =>
                    activeThreads.includes(thread),
                );
                if (!stillRunning) return;
                await sleep(0);
            }
        }
    },
    selectTarget: {
        resolveTarget: true,
        emitTargetsUpdate: false,
        execute: async ({target, context}) =>
            buildCommandResultContext(context, target)
    },
    move: {
        resolveTarget: true,
        execute: async ({vm, target, args}) => {
            moveBySteps(vm, target, toNumber(args[0], 0));
        }
    },
    turn: {
        resolveTarget: true,
        execute: async ({target, args}) => {
            target.setDirection(target.direction + toNumber(args[0], 0));
        }
    },
    point: {
        resolveTarget: true,
        execute: async ({target, args}) => {
            target.setDirection(toNumber(args[0], target.direction));
        }
    },
    say: {
        resolveTarget: true,
        execute: async ({runtime, target, args}) => {
            runtime.emit('SAY', target, 'say', String(args[0] || ''));
        }
    },
    think: {
        resolveTarget: true,
        execute: async ({runtime, target, args}) => {
            runtime.emit('SAY', target, 'think', String(args[0] || ''));
        }
    },
    gotoXY: {
        resolveTarget: true,
        execute: async ({target, args}) => {
            target.setXY(
                toNumber(args[0], target.x),
                toNumber(args[1], target.y),
            );
        }
    },
    setX: {
        resolveTarget: true,
        execute: async ({target, args}) => {
            target.setXY(toNumber(args[0], target.x), target.y);
        }
    },
    setY: {
        resolveTarget: true,
        execute: async ({target, args}) => {
            target.setXY(target.x, toNumber(args[0], target.y));
        }
    },
    changeX: {
        resolveTarget: true,
        execute: async ({target, args}) => {
            target.setXY(target.x + toNumber(args[0], 0), target.y);
        }
    },
    changeY: {
        resolveTarget: true,
        execute: async ({target, args}) => {
            target.setXY(target.x, target.y + toNumber(args[0], 0));
        }
    },
    ifOnEdgeBounce: {
        resolveTarget: true,
        execute: async ({runtime, target}) => {
            bounceOnEdge(runtime, target);
        }
    },
    setCostume: {
        resolveTarget: true,
        execute: async ({target, args}) => {
            const applied = setCostumeByName(target, String(args[0] || ''));
            if (!applied) {
                throw new Error(`Costume not found: ${String(args[0] || '')}`);
            }
        }
    },
    setBackdrop: {
        resolveTarget: true,
        execute: async ({target, args}) => {
            const applied = setCostumeByName(target, String(args[0] || ''));
            if (!applied) {
                throw new Error(`Backdrop not found: ${String(args[0] || '')}`);
            }
        }
    },
    nextCostume: {
        resolveTarget: true,
        execute: async ({target}) => {
            const applied = nextCostume(target);
            if (!applied) {
                throw new Error(
                    'Unable to switch to next costume for current target.',
                );
            }
        }
    },
    nextBackdrop: {
        resolveTarget: true,
        execute: async ({target}) => {
            const applied = nextCostume(target);
            if (!applied) {
                throw new Error(
                    'Unable to switch to next backdrop for current target.',
                );
            }
        }
    },
    show: {
        resolveTarget: true,
        execute: async ({target}) => {
            setTargetVisible(target, true);
        }
    },
    hide: {
        resolveTarget: true,
        execute: async ({target}) => {
            setTargetVisible(target, false);
        }
    },
    setSize: {
        resolveTarget: true,
        execute: async ({target, args}) => {
            setTargetSize(target, toNumber(args[0], target.size));
        }
    },
    changeSize: {
        resolveTarget: true,
        execute: async ({target, args}) => {
            setTargetSize(
                target,
                toNumber(target.size, 100) + toNumber(args[0], 0),
            );
        }
    },
    playSound: {
        resolveTarget: true,
        execute: async ({target, args}) => {
            const played = playSoundByName(target, String(args[0] || ''));
            if (!played) {
                throw new Error(
                    `Sound not found or cannot be played: ${String(args[0] || '')}`,
                );
            }
        }
    },
    setEffect: {
        resolveTarget: true,
        execute: async ({target, args}) => {
            setSoundEffect(target, String(args[0] || 'pitch'), toNumber(args[1], 0));
        }
    },
    changeEffect: {
        resolveTarget: true,
        execute: async ({target, args}) => {
            changeSoundEffect(target, String(args[0] || 'pitch'), toNumber(args[1], 0));
        }
    },
    clearEffects: {
        resolveTarget: true,
        execute: async ({target}) => {
            clearSoundEffects(target);
        }
    },
    penClear: {
        resolveTarget: false,
        emitTargetsUpdate: false,
        execute: async ({vm, runtime}) => {
            await executeExtensionOpcode(vm, runtime, null, 'pen', 'clear');
        }
    },
    penStamp: {
        resolveTarget: true,
        emitTargetsUpdate: false,
        execute: async ({vm, runtime, target}) => {
            await executeExtensionOpcode(vm, runtime, target, 'pen', 'stamp');
        }
    },
    penDown: {
        resolveTarget: true,
        emitTargetsUpdate: false,
        execute: async ({vm, runtime, target}) => {
            await executeExtensionOpcode(vm, runtime, target, 'pen', 'penDown');
        }
    },
    penUp: {
        resolveTarget: true,
        emitTargetsUpdate: false,
        execute: async ({vm, runtime, target}) => {
            await executeExtensionOpcode(vm, runtime, target, 'pen', 'penUp');
        }
    },
    setPenColor: {
        resolveTarget: true,
        emitTargetsUpdate: false,
        execute: async ({vm, runtime, target, args}) => {
            await executeExtensionOpcode(
                vm,
                runtime,
                target,
                'pen',
                'setPenColorToColor',
                {
                    COLOR: String(args[0] || '#000000')
                },
            );
        }
    },
    changePenColorParam: {
        resolveTarget: true,
        emitTargetsUpdate: false,
        execute: async ({vm, runtime, target, args}) => {
            await executeExtensionOpcode(
                vm,
                runtime,
                target,
                'pen',
                'changePenColorParamBy',
                {
                    COLOR_PARAM: String(args[0] || 'color'),
                    VALUE: toNumber(args[1], 0)
                },
            );
        }
    },
    setPenColorParam: {
        resolveTarget: true,
        emitTargetsUpdate: false,
        execute: async ({vm, runtime, target, args}) => {
            await executeExtensionOpcode(
                vm,
                runtime,
                target,
                'pen',
                'setPenColorParamTo',
                {
                    COLOR_PARAM: String(args[0] || 'color'),
                    VALUE: toNumber(args[1], 50)
                },
            );
        }
    },
    changePenSize: {
        resolveTarget: true,
        emitTargetsUpdate: false,
        execute: async ({vm, runtime, target, args}) => {
            await executeExtensionOpcode(
                vm,
                runtime,
                target,
                'pen',
                'changePenSizeBy',
                {
                    SIZE: toNumber(args[0], 1)
                },
            );
        }
    },
    setPenSize: {
        resolveTarget: true,
        emitTargetsUpdate: false,
        execute: async ({vm, runtime, target, args}) => {
            await executeExtensionOpcode(
                vm,
                runtime,
                target,
                'pen',
                'setPenSizeTo',
                {
                    SIZE: toNumber(args[0], 1)
                },
            );
        }
    },
    videoToggle: {
        resolveTarget: false,
        emitTargetsUpdate: false,
        execute: async ({vm, runtime, args}) => {
            await executeExtensionOpcode(
                vm,
                runtime,
                null,
                'videoSensing',
                'videoToggle',
                {
                    VIDEO_STATE: String(args[0] || 'on')
                },
            );
        }
    },
    setVideoTransparency: {
        resolveTarget: false,
        emitTargetsUpdate: false,
        execute: async ({vm, runtime, args}) => {
            await executeExtensionOpcode(
                vm,
                runtime,
                null,
                'videoSensing',
                'setVideoTransparency',
                {
                    TRANSPARENCY: toNumber(args[0], 50)
                },
            );
        }
    },
    speakAndWait: {
        resolveTarget: true,
        emitTargetsUpdate: false,
        execute: async ({vm, runtime, target, args}) => {
            const words = String(args[0] || '');
            try {
                await executeExtensionOpcode(
                    vm,
                    runtime,
                    target,
                    'text2speech',
                    'speakAndWait',
                    {
                        WORDS: words
                    },
                );
            } catch (_error) {
                // Fallback so user still gets immediate feedback when TTS provider is unavailable.
                runtime.emit('SAY', target, 'say', words);
            }
        }
    },
    setVoice: {
        resolveTarget: true,
        emitTargetsUpdate: false,
        execute: async ({vm, runtime, target, args}) => {
            await executeExtensionOpcode(
                vm,
                runtime,
                target,
                'text2speech',
                'setVoice',
                {
                    VOICE: String(args[0] || 'ALTO')
                },
            );
        }
    },
    setSpeechLanguage: {
        resolveTarget: false,
        emitTargetsUpdate: false,
        execute: async ({vm, runtime, args}) => {
            await executeExtensionOpcode(
                vm,
                runtime,
                null,
                'text2speech',
                'setLanguage',
                {
                    LANGUAGE: String(args[0] || 'en')
                },
            );
        }
    },
    loadDevice: {
        resolveTarget: false,
        emitTargetsUpdate: false,
        execute: async ({vm, args}) => {
            if (!vm || !vm.extensionManager) {
                return;
            }

            const deviceId = String(args[0] || 'null');
            const deviceType = String(args[1] || '');
            const pnpidList = Array.isArray(args[2]) ? args[2] : [];

            if (typeof vm.extensionManager.loadDeviceURL === 'function') {
                await vm.extensionManager.loadDeviceURL(
                    deviceId,
                    deviceType,
                    pnpidList,
                );
            }
        }
    },
    clearDevice: {
        resolveTarget: false,
        emitTargetsUpdate: false,
        execute: async ({vm}) => {
            if (
                vm &&
                vm.extensionManager &&
                typeof vm.extensionManager.clearDevice === 'function'
            ) {
                vm.extensionManager.clearDevice();
            }
        }
    },

    // ─── Device Realtime Control Commands ────────────────────────────────────────
    // These call peripheral extension methods directly via runtime.peripheralExtensions.
    // Requires the device extension to be loaded AND connected (Firmata ready).

    devicePinMode: {
        resolveTarget: false,
        emitTargetsUpdate: false,
        execute: async ({runtime, args}) => {
            const deviceId = String(args[0] || '');
            const pin = String(args[1] || '');
            const mode = String(args[2] || 'OUTPUT').toUpperCase();
            if (!deviceId || !pin) return;
            const peripheral =
                runtime.peripheralExtensions &&
                runtime.peripheralExtensions[deviceId];
            if (!peripheral || typeof peripheral.setPinMode !== 'function') {
                throw new Error(
                    `Device '${deviceId}' not connected or does not support pinMode`,
                );
            }
            peripheral.setPinMode(pin, mode);
        }
    },

    deviceDigitalWrite: {
        resolveTarget: false,
        emitTargetsUpdate: false,
        execute: async ({runtime, args}) => {
            const deviceId = String(args[0] || '');
            const pin = String(args[1] || '');
            const rawValue = args[2];
            if (!deviceId || !pin || rawValue === undefined) return;
            const peripheral =
                runtime.peripheralExtensions &&
                runtime.peripheralExtensions[deviceId];
            if (
                !peripheral ||
                typeof peripheral.setDigitalOutput !== 'function'
            ) {
                throw new Error(
                    `Device '${deviceId}' not connected or does not support digitalWrite`,
                );
            }
            const level =
                rawValue === true ||
                rawValue === 1 ||
                String(rawValue).toUpperCase() === 'HIGH' ?
                    'HIGH' :
                    'LOW';
            peripheral.setDigitalOutput(pin, level);
        }
    },

    deviceDigitalRead: {
        resolveTarget: false,
        emitTargetsUpdate: false,
        execute: async ({runtime, args}) => {
            const deviceId = String(args[0] || '');
            const pin = String(args[1] || '');
            if (!deviceId || !pin) return null;
            const peripheral =
                runtime.peripheralExtensions &&
                runtime.peripheralExtensions[deviceId];
            if (
                !peripheral ||
                typeof peripheral.readDigitalPin !== 'function'
            ) {
                throw new Error(
                    `Device '${deviceId}' not connected or does not support digitalRead`,
                );
            }
            const value = await peripheral.readDigitalPin(pin);
            return {_deviceResult: {requestId: args[2], value}};
        }
    },

    deviceAnalogWrite: {
        resolveTarget: false,
        emitTargetsUpdate: false,
        execute: async ({runtime, args}) => {
            const deviceId = String(args[0] || '');
            const pin = String(args[1] || '');
            const rawValue = Number(args[2]);
            if (!deviceId || !pin || isNaN(rawValue)) return;
            const peripheral =
                runtime.peripheralExtensions &&
                runtime.peripheralExtensions[deviceId];
            if (!peripheral || typeof peripheral.setPwmOutput !== 'function') {
                throw new Error(
                    `Device '${deviceId}' not connected or does not support analogWrite`,
                );
            }
            const clamped = Math.max(0, Math.min(255, Math.round(rawValue)));
            peripheral.setPwmOutput(pin, clamped);
        }
    },

    deviceAnalogRead: {
        resolveTarget: false,
        emitTargetsUpdate: false,
        execute: async ({runtime, args}) => {
            const deviceId = String(args[0] || '');
            const pin = String(args[1] || '');
            if (!deviceId || !pin) return null;
            const peripheral =
                runtime.peripheralExtensions &&
                runtime.peripheralExtensions[deviceId];
            if (!peripheral || typeof peripheral.readAnalogPin !== 'function') {
                throw new Error(
                    `Device '${deviceId}' not connected or does not support analogRead`,
                );
            }
            const value = await peripheral.readAnalogPin(pin);
            return {_deviceResult: {requestId: args[2], value}};
        }
    },

    deviceServoWrite: {
        resolveTarget: false,
        emitTargetsUpdate: false,
        execute: async ({runtime, args}) => {
            const deviceId = String(args[0] || '');
            const pin = String(args[1] || '');
            const rawAngle = Number(args[2]);
            if (!deviceId || !pin || isNaN(rawAngle)) return;
            const peripheral =
                runtime.peripheralExtensions &&
                runtime.peripheralExtensions[deviceId];
            if (
                !peripheral ||
                typeof peripheral.setServoOutput !== 'function'
            ) {
                throw new Error(
                    `Device '${deviceId}' not connected or does not support servoWrite`,
                );
            }
            const clamped = Math.max(0, Math.min(180, Math.round(rawAngle)));
            peripheral.setServoOutput(pin, clamped);
        }
    },

    deviceSerialWrite: {
        resolveTarget: false,
        emitTargetsUpdate: false,
        execute: async ({vm, args}) => {
            const deviceId = String(args[0] || '');
            const text = String(args[1] || '');
            if (!deviceId || !vm || typeof vm.writeToPeripheral !== 'function') {
                return;
            }
            vm.writeToPeripheral(deviceId, text);
        }
    },

    deviceSerialWriteLn: {
        resolveTarget: false,
        emitTargetsUpdate: false,
        execute: async ({vm, args}) => {
            const deviceId = String(args[0] || '');
            const text = String(args[1] || '');
            if (!deviceId || !vm || typeof vm.writeToPeripheral !== 'function') {
                return;
            }
            vm.writeToPeripheral(deviceId, `${text}\n`);
        }
    },

    // ─── End Device Realtime Control Commands ────────────────────────────────────

    wait: {
        resolveTarget: true,
        execute: async ({args}) => {
            await sleep(toNumber(args[0], 0) * 1000);
        }
    }
});
