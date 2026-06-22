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
    },

    // ─── Music Extension ─────────────────────────────────────────────────────────

    extMusicPlayDrumForBeats: {
        resolveTarget: false,
        emitTargetsUpdate: false,
        execute: async ({vm, runtime, args}) => {
            await executeExtensionOpcode(vm, runtime, null, 'music', 'playDrumForBeats', {
                DRUM: toNumber(args[0], 1),
                BEATS: toNumber(args[1], 0.25)
            });
        }
    },
    extMusicRestForBeats: {
        resolveTarget: false,
        emitTargetsUpdate: false,
        execute: async ({vm, runtime, args}) => {
            await executeExtensionOpcode(vm, runtime, null, 'music', 'restForBeats', {
                BEATS: toNumber(args[0], 0.25)
            });
        }
    },
    extMusicPlayNoteForBeats: {
        resolveTarget: false,
        emitTargetsUpdate: false,
        execute: async ({vm, runtime, args}) => {
            await executeExtensionOpcode(vm, runtime, null, 'music', 'playNoteForBeats', {
                NOTE: toNumber(args[0], 60),
                BEATS: toNumber(args[1], 0.25)
            });
        }
    },
    extMusicSetInstrument: {
        resolveTarget: false,
        emitTargetsUpdate: false,
        execute: async ({vm, runtime, args}) => {
            await executeExtensionOpcode(vm, runtime, null, 'music', 'setInstrument', {
                INSTRUMENT: toNumber(args[0], 1)
            });
        }
    },
    extMusicSetTempo: {
        resolveTarget: false,
        emitTargetsUpdate: false,
        execute: async ({vm, runtime, args}) => {
            await executeExtensionOpcode(vm, runtime, null, 'music', 'setTempo', {
                TEMPO: toNumber(args[0], 60)
            });
        }
    },
    extMusicChangeTempo: {
        resolveTarget: false,
        emitTargetsUpdate: false,
        execute: async ({vm, runtime, args}) => {
            await executeExtensionOpcode(vm, runtime, null, 'music', 'changeTempo', {
                TEMPO: toNumber(args[0], 20)
            });
        }
    },
    extMusicGetTempo: {
        resolveTarget: false,
        emitTargetsUpdate: false,
        execute: async ({vm, runtime, command}) => {
            const result = await executeExtensionOpcode(vm, runtime, null, 'music', 'getTempo');
            if (command && typeof command._requestId !== 'undefined') {
                return {_deviceResult: {requestId: command._requestId, value: result}};
            }
            return result;
        }
    },

    // ─── Handpose Extension ──────────────────────────────────────────────────────

    extHandposeVideoToggle: {
        resolveTarget: false,
        emitTargetsUpdate: false,
        execute: async ({vm, runtime, args}) => {
            await executeExtensionOpcode(vm, runtime, null, 'handpose2scratch', 'videoToggle', {
                VIDEO_STATE: String(args[0] || 'off')
            });
        }
    },
    extHandposeSetVideoTransparency: {
        resolveTarget: false,
        emitTargetsUpdate: false,
        execute: async ({vm, runtime, args}) => {
            await executeExtensionOpcode(vm, runtime, null, 'handpose2scratch', 'setVideoTransparency', {
                TRANSPARENCY: toNumber(args[0], 50)
            });
        }
    },
    extHandposeSetRatio: {
        resolveTarget: false,
        emitTargetsUpdate: false,
        execute: async ({vm, runtime, args}) => {
            await executeExtensionOpcode(vm, runtime, null, 'handpose2scratch', 'setRatio', {
                RATIO: String(args[0] || '0.75')
            });
        }
    },
    extHandposeGetX: {
        resolveTarget: false,
        emitTargetsUpdate: false,
        execute: async ({vm, runtime, command, args}) => {
            const result = await executeExtensionOpcode(vm, runtime, null, 'handpose2scratch', 'getX', {
                LANDMARK: String(args[0] || '1')
            });
            if (command && typeof command._requestId !== 'undefined') {
                return {_deviceResult: {requestId: command._requestId, value: result}};
            }
            return result;
        }
    },
    extHandposeGetY: {
        resolveTarget: false,
        emitTargetsUpdate: false,
        execute: async ({vm, runtime, command, args}) => {
            const result = await executeExtensionOpcode(vm, runtime, null, 'handpose2scratch', 'getY', {
                LANDMARK: String(args[0] || '1')
            });
            if (command && typeof command._requestId !== 'undefined') {
                return {_deviceResult: {requestId: command._requestId, value: result}};
            }
            return result;
        }
    },
    extHandposeGetZ: {
        resolveTarget: false,
        emitTargetsUpdate: false,
        execute: async ({vm, runtime, command, args}) => {
            const result = await executeExtensionOpcode(vm, runtime, null, 'handpose2scratch', 'getZ', {
                LANDMARK: String(args[0] || '1')
            });
            if (command && typeof command._requestId !== 'undefined') {
                return {_deviceResult: {requestId: command._requestId, value: result}};
            }
            return result;
        }
    },

    // ─── Speech to Text Extension ────────────────────────────────────────────────

    extSpeechListenAndWait: {
        resolveTarget: false,
        emitTargetsUpdate: false,
        execute: async ({vm, runtime}) => {
            await executeExtensionOpcode(vm, runtime, null, 'speech2text', 'listenAndWait');
        }
    },
    extSpeechGetSpeech: {
        resolveTarget: false,
        emitTargetsUpdate: false,
        execute: async ({vm, runtime, command}) => {
            const result = await executeExtensionOpcode(vm, runtime, null, 'speech2text', 'getSpeech');
            if (command && typeof command._requestId !== 'undefined') {
                return {_deviceResult: {requestId: command._requestId, value: result}};
            }
            return result;
        }
    },

    // ─── Translate Extension ─────────────────────────────────────────────────────

    extTranslateGetTranslate: {
        resolveTarget: false,
        emitTargetsUpdate: false,
        execute: async ({vm, runtime, command, args}) => {
            const result = await executeExtensionOpcode(vm, runtime, null, 'translate', 'getTranslate', {
                WORDS: String(args[0] || 'hello'),
                LANGUAGE: String(args[1] || 'en')
            });
            if (command && typeof command._requestId !== 'undefined') {
                return {_deviceResult: {requestId: command._requestId, value: result}};
            }
            return result;
        }
    },
    extTranslateGetViewerLanguage: {
        resolveTarget: false,
        emitTargetsUpdate: false,
        execute: async ({vm, runtime, command}) => {
            const result = await executeExtensionOpcode(vm, runtime, null, 'translate', 'getViewerLanguage');
            if (command && typeof command._requestId !== 'undefined') {
                return {_deviceResult: {requestId: command._requestId, value: result}};
            }
            return result;
        }
    },

    // ─── Object Detection (OB2Scratch) Extension ─────────────────────────────────

    extOb2AnalyseImage: {
        resolveTarget: false,
        emitTargetsUpdate: false,
        execute: async ({vm, runtime, command}) => {
            const result = await executeExtensionOpcode(vm, runtime, null, 'ob2scratch', 'analyseImageFrom');
            if (command && typeof command._requestId !== 'undefined') {
                return {_deviceResult: {requestId: command._requestId, value: result}};
            }
            return result;
        }
    },
    extOb2VideoToggle: {
        resolveTarget: false,
        emitTargetsUpdate: false,
        execute: async ({vm, runtime, args}) => {
            await executeExtensionOpcode(vm, runtime, null, 'ob2scratch', 'videoToggle', {
                VIDEO_STATE: String(args[0] || 'on'),
                TRANSPARENCY: toNumber(args[1], 0)
            });
        }
    },
    extOb2ShowBoundingBoxes: {
        resolveTarget: false,
        emitTargetsUpdate: false,
        execute: async ({vm, runtime, args}) => {
            await executeExtensionOpcode(vm, runtime, null, 'ob2scratch', 'showBoundingBoxes', {
                SHOW_BOUNDING_BOXES: String(args[0] || 'show')
            });
        }
    },
    extOb2SetDetectionThreshold: {
        resolveTarget: false,
        emitTargetsUpdate: false,
        execute: async ({vm, runtime, args}) => {
            await executeExtensionOpcode(vm, runtime, null, 'ob2scratch', 'setDetectionThreshold', {
                DETECTION_THRESHOLD: toNumber(args[0], 0.5)
            });
        }
    },
    extOb2GetCounts: {
        resolveTarget: false,
        emitTargetsUpdate: false,
        execute: async ({vm, runtime, command}) => {
            const result = await executeExtensionOpcode(vm, runtime, null, 'ob2scratch', 'getCounts');
            if (command && typeof command._requestId !== 'undefined') {
                return {_deviceResult: {requestId: command._requestId, value: result}};
            }
            return result;
        }
    },
    extOb2IsDetected: {
        resolveTarget: false,
        emitTargetsUpdate: false,
        execute: async ({vm, runtime, command, args}) => {
            const result = await executeExtensionOpcode(vm, runtime, null, 'ob2scratch', 'isDetected', {
                LABEL: String(args[0] || 'person')
            });
            if (command && typeof command._requestId !== 'undefined') {
                return {_deviceResult: {requestId: command._requestId, value: result}};
            }
            return result;
        }
    },
    extOb2GetCountOf: {
        resolveTarget: false,
        emitTargetsUpdate: false,
        execute: async ({vm, runtime, command, args}) => {
            const result = await executeExtensionOpcode(vm, runtime, null, 'ob2scratch', 'getCountOf', {
                LABEL: String(args[0] || 'person')
            });
            if (command && typeof command._requestId !== 'undefined') {
                return {_deviceResult: {requestId: command._requestId, value: result}};
            }
            return result;
        }
    },
    extOb2GetObjects: {
        resolveTarget: false,
        emitTargetsUpdate: false,
        execute: async ({vm, runtime, command, args}) => {
            const result = await executeExtensionOpcode(vm, runtime, null, 'ob2scratch', 'getObjects', {
                PROPERTY: String(args[0] || 'label'),
                INDEX: toNumber(args[1], 0)
            });
            if (command && typeof command._requestId !== 'undefined') {
                return {_deviceResult: {requestId: command._requestId, value: result}};
            }
            return result;
        }
    },

    // ─── ML Extension ────────────────────────────────────────────────────────────

    extMlAddExample1: {
        resolveTarget: false,
        emitTargetsUpdate: false,
        execute: async ({vm, runtime}) => {
            await executeExtensionOpcode(vm, runtime, null, 'ml', 'addExample1');
        }
    },
    extMlAddExample2: {
        resolveTarget: false,
        emitTargetsUpdate: false,
        execute: async ({vm, runtime}) => {
            await executeExtensionOpcode(vm, runtime, null, 'ml', 'addExample2');
        }
    },
    extMlAddExample3: {
        resolveTarget: false,
        emitTargetsUpdate: false,
        execute: async ({vm, runtime}) => {
            await executeExtensionOpcode(vm, runtime, null, 'ml', 'addExample3');
        }
    },
    extMlTrain: {
        resolveTarget: false,
        emitTargetsUpdate: false,
        execute: async ({vm, runtime, args}) => {
            await executeExtensionOpcode(vm, runtime, null, 'ml', 'train', {
                LABEL: String(args[0] || '4')
            });
        }
    },
    extMlTrainAny: {
        resolveTarget: false,
        emitTargetsUpdate: false,
        execute: async ({vm, runtime, args}) => {
            await executeExtensionOpcode(vm, runtime, null, 'ml', 'trainAny', {
                LABEL: String(args[0] || '11')
            });
        }
    },
    extMlGetLabel: {
        resolveTarget: false,
        emitTargetsUpdate: false,
        execute: async ({vm, runtime, command}) => {
            const result = await executeExtensionOpcode(vm, runtime, null, 'ml', 'getLabel');
            if (command && typeof command._requestId !== 'undefined') {
                return {_deviceResult: {requestId: command._requestId, value: result}};
            }
            return result;
        }
    },
    extMlGetCountByLabel: {
        resolveTarget: false,
        emitTargetsUpdate: false,
        execute: async ({vm, runtime, command, args}) => {
            const result = await executeExtensionOpcode(vm, runtime, null, 'ml', 'getCountByLabel', {
                LABEL: String(args[0] || '11')
            });
            if (command && typeof command._requestId !== 'undefined') {
                return {_deviceResult: {requestId: command._requestId, value: result}};
            }
            return result;
        }
    },
    extMlGetCountByLabel1: {
        resolveTarget: false,
        emitTargetsUpdate: false,
        execute: async ({vm, runtime, command}) => {
            const result = await executeExtensionOpcode(vm, runtime, null, 'ml', 'getCountByLabel1');
            if (command && typeof command._requestId !== 'undefined') {
                return {_deviceResult: {requestId: command._requestId, value: result}};
            }
            return result;
        }
    },
    extMlGetCountByLabel2: {
        resolveTarget: false,
        emitTargetsUpdate: false,
        execute: async ({vm, runtime, command}) => {
            const result = await executeExtensionOpcode(vm, runtime, null, 'ml', 'getCountByLabel2');
            if (command && typeof command._requestId !== 'undefined') {
                return {_deviceResult: {requestId: command._requestId, value: result}};
            }
            return result;
        }
    },
    extMlGetCountByLabel3: {
        resolveTarget: false,
        emitTargetsUpdate: false,
        execute: async ({vm, runtime, command}) => {
            const result = await executeExtensionOpcode(vm, runtime, null, 'ml', 'getCountByLabel3');
            if (command && typeof command._requestId !== 'undefined') {
                return {_deviceResult: {requestId: command._requestId, value: result}};
            }
            return result;
        }
    },
    extMlGetCountByLabel4: {
        resolveTarget: false,
        emitTargetsUpdate: false,
        execute: async ({vm, runtime, command}) => {
            const result = await executeExtensionOpcode(vm, runtime, null, 'ml', 'getCountByLabel4');
            if (command && typeof command._requestId !== 'undefined') {
                return {_deviceResult: {requestId: command._requestId, value: result}};
            }
            return result;
        }
    },
    extMlGetCountByLabel5: {
        resolveTarget: false,
        emitTargetsUpdate: false,
        execute: async ({vm, runtime, command}) => {
            const result = await executeExtensionOpcode(vm, runtime, null, 'ml', 'getCountByLabel5');
            if (command && typeof command._requestId !== 'undefined') {
                return {_deviceResult: {requestId: command._requestId, value: result}};
            }
            return result;
        }
    },
    extMlGetCountByLabel6: {
        resolveTarget: false,
        emitTargetsUpdate: false,
        execute: async ({vm, runtime, command}) => {
            const result = await executeExtensionOpcode(vm, runtime, null, 'ml', 'getCountByLabel6');
            if (command && typeof command._requestId !== 'undefined') {
                return {_deviceResult: {requestId: command._requestId, value: result}};
            }
            return result;
        }
    },
    extMlGetCountByLabel7: {
        resolveTarget: false,
        emitTargetsUpdate: false,
        execute: async ({vm, runtime, command}) => {
            const result = await executeExtensionOpcode(vm, runtime, null, 'ml', 'getCountByLabel7');
            if (command && typeof command._requestId !== 'undefined') {
                return {_deviceResult: {requestId: command._requestId, value: result}};
            }
            return result;
        }
    },
    extMlGetCountByLabel8: {
        resolveTarget: false,
        emitTargetsUpdate: false,
        execute: async ({vm, runtime, command}) => {
            const result = await executeExtensionOpcode(vm, runtime, null, 'ml', 'getCountByLabel8');
            if (command && typeof command._requestId !== 'undefined') {
                return {_deviceResult: {requestId: command._requestId, value: result}};
            }
            return result;
        }
    },
    extMlGetCountByLabel9: {
        resolveTarget: false,
        emitTargetsUpdate: false,
        execute: async ({vm, runtime, command}) => {
            const result = await executeExtensionOpcode(vm, runtime, null, 'ml', 'getCountByLabel9');
            if (command && typeof command._requestId !== 'undefined') {
                return {_deviceResult: {requestId: command._requestId, value: result}};
            }
            return result;
        }
    },
    extMlGetCountByLabel10: {
        resolveTarget: false,
        emitTargetsUpdate: false,
        execute: async ({vm, runtime, command}) => {
            const result = await executeExtensionOpcode(vm, runtime, null, 'ml', 'getCountByLabel10');
            if (command && typeof command._requestId !== 'undefined') {
                return {_deviceResult: {requestId: command._requestId, value: result}};
            }
            return result;
        }
    },
    extMlReset: {
        resolveTarget: false,
        emitTargetsUpdate: false,
        execute: async ({vm, runtime, args}) => {
            await executeExtensionOpcode(vm, runtime, null, 'ml', 'reset', {
                LABEL: String(args[0] || 'all')
            });
        }
    },
    extMlResetAny: {
        resolveTarget: false,
        emitTargetsUpdate: false,
        execute: async ({vm, runtime, args}) => {
            await executeExtensionOpcode(vm, runtime, null, 'ml', 'resetAny', {
                LABEL: String(args[0] || '11')
            });
        }
    },
    extMlDownload: {
        resolveTarget: false,
        emitTargetsUpdate: false,
        execute: async ({vm, runtime}) => {
            await executeExtensionOpcode(vm, runtime, null, 'ml', 'download');
        }
    },
    extMlUpload: {
        resolveTarget: false,
        emitTargetsUpdate: false,
        execute: async ({vm, runtime}) => {
            await executeExtensionOpcode(vm, runtime, null, 'ml', 'upload');
        }
    },
    extMlToggleClassification: {
        resolveTarget: false,
        emitTargetsUpdate: false,
        execute: async ({vm, runtime, args}) => {
            await executeExtensionOpcode(vm, runtime, null, 'ml', 'toggleClassification', {
                CLASSIFICATION_STATE: String(args[0] || 'off')
            });
        }
    },
    extMlSetClassificationInterval: {
        resolveTarget: false,
        emitTargetsUpdate: false,
        execute: async ({vm, runtime, args}) => {
            await executeExtensionOpcode(vm, runtime, null, 'ml', 'setClassificationInterval', {
                CLASSIFICATION_INTERVAL: String(args[0] || '1')
            });
        }
    },
    extMlVideoToggle: {
        resolveTarget: false,
        emitTargetsUpdate: false,
        execute: async ({vm, runtime, args}) => {
            await executeExtensionOpcode(vm, runtime, null, 'ml', 'videoToggle', {
                VIDEO_STATE: String(args[0] || 'off')
            });
        }
    },
    extMlSetVideoTransparency: {
        resolveTarget: false,
        emitTargetsUpdate: false,
        execute: async ({vm, runtime, args}) => {
            await executeExtensionOpcode(vm, runtime, null, 'ml', 'setVideoTransparency', {
                TRANSPARENCY: toNumber(args[0], 50)
            });
        }
    },
    extMlSetInput: {
        resolveTarget: false,
        emitTargetsUpdate: false,
        execute: async ({vm, runtime, args}) => {
            await executeExtensionOpcode(vm, runtime, null, 'ml', 'setInput', {
                INPUT: String(args[0] || 'webcam')
            });
        }
    },

    // ─── TM2Scratch Extension ────────────────────────────────────────────────────

    extTm2SetInput: {
        resolveTarget: false,
        emitTargetsUpdate: false,
        execute: async ({vm, runtime, args}) => {
            await executeExtensionOpcode(vm, runtime, null, 'tm2scratch', 'setInput', {
                INPUT: String(args[0] || 'webcam')
            });
        }
    },
    extTm2IsImageLabelDetected: {
        resolveTarget: false,
        emitTargetsUpdate: false,
        execute: async ({vm, runtime, command, args}) => {
            const result = await executeExtensionOpcode(vm, runtime, null, 'tm2scratch', 'isImageLabelDetected', {
                LABEL: String(args[0] || 'any')
            });
            if (command && typeof command._requestId !== 'undefined') {
                return {_deviceResult: {requestId: command._requestId, value: result}};
            }
            return result;
        }
    },
    extTm2ImageLabelConfidence: {
        resolveTarget: false,
        emitTargetsUpdate: false,
        execute: async ({vm, runtime, command, args}) => {
            const result = await executeExtensionOpcode(vm, runtime, null, 'tm2scratch', 'imageLabelConfidence', {
                LABEL: String(args[0] || '')
            });
            if (command && typeof command._requestId !== 'undefined') {
                return {_deviceResult: {requestId: command._requestId, value: result}};
            }
            return result;
        }
    },
    extTm2SetImageClassificationModelURL: {
        resolveTarget: false,
        emitTargetsUpdate: false,
        execute: async ({vm, runtime, args}) => {
            await executeExtensionOpcode(vm, runtime, null, 'tm2scratch', 'setImageClassificationModelURL', {
                URL: String(args[0] || ' ')
            });
        }
    },
    extTm2ClassifyVideoImage: {
        resolveTarget: false,
        emitTargetsUpdate: false,
        execute: async ({vm, runtime}) => {
            await executeExtensionOpcode(vm, runtime, null, 'tm2scratch', 'classifyVideoImageBlock');
        }
    },
    extTm2GetImageLabel: {
        resolveTarget: false,
        emitTargetsUpdate: false,
        execute: async ({vm, runtime, command}) => {
            const result = await executeExtensionOpcode(vm, runtime, null, 'tm2scratch', 'getImageLabel');
            if (command && typeof command._requestId !== 'undefined') {
                return {_deviceResult: {requestId: command._requestId, value: result}};
            }
            return result;
        }
    },
    extTm2IsSoundLabelDetected: {
        resolveTarget: false,
        emitTargetsUpdate: false,
        execute: async ({vm, runtime, command, args}) => {
            const result = await executeExtensionOpcode(vm, runtime, null, 'tm2scratch', 'isSoundLabelDetected', {
                LABEL: String(args[0] || 'any')
            });
            if (command && typeof command._requestId !== 'undefined') {
                return {_deviceResult: {requestId: command._requestId, value: result}};
            }
            return result;
        }
    },
    extTm2SoundLabelConfidence: {
        resolveTarget: false,
        emitTargetsUpdate: false,
        execute: async ({vm, runtime, command, args}) => {
            const result = await executeExtensionOpcode(vm, runtime, null, 'tm2scratch', 'soundLabelConfidence', {
                LABEL: String(args[0] || '')
            });
            if (command && typeof command._requestId !== 'undefined') {
                return {_deviceResult: {requestId: command._requestId, value: result}};
            }
            return result;
        }
    },
    extTm2SetSoundClassificationModelURL: {
        resolveTarget: false,
        emitTargetsUpdate: false,
        execute: async ({vm, runtime, args}) => {
            await executeExtensionOpcode(vm, runtime, null, 'tm2scratch', 'setSoundClassificationModelURL', {
                URL: String(args[0] || ' ')
            });
        }
    },
    extTm2GetSoundLabel: {
        resolveTarget: false,
        emitTargetsUpdate: false,
        execute: async ({vm, runtime, command}) => {
            const result = await executeExtensionOpcode(vm, runtime, null, 'tm2scratch', 'getSoundLabel');
            if (command && typeof command._requestId !== 'undefined') {
                return {_deviceResult: {requestId: command._requestId, value: result}};
            }
            return result;
        }
    },
    extTm2ToggleClassification: {
        resolveTarget: false,
        emitTargetsUpdate: false,
        execute: async ({vm, runtime, args}) => {
            await executeExtensionOpcode(vm, runtime, null, 'tm2scratch', 'toggleClassification', {
                CLASSIFICATION_STATE: String(args[0] || 'off')
            });
        }
    },
    extTm2SetClassificationInterval: {
        resolveTarget: false,
        emitTargetsUpdate: false,
        execute: async ({vm, runtime, args}) => {
            await executeExtensionOpcode(vm, runtime, null, 'tm2scratch', 'setClassificationInterval', {
                CLASSIFICATION_INTERVAL: String(args[0] || '1')
            });
        }
    },
    extTm2SetConfidenceThreshold: {
        resolveTarget: false,
        emitTargetsUpdate: false,
        execute: async ({vm, runtime, args}) => {
            await executeExtensionOpcode(vm, runtime, null, 'tm2scratch', 'setConfidenceThreshold', {
                CONFIDENCE_THRESHOLD: toNumber(args[0], 0.5)
            });
        }
    },
    extTm2GetConfidenceThreshold: {
        resolveTarget: false,
        emitTargetsUpdate: false,
        execute: async ({vm, runtime, command}) => {
            const result = await executeExtensionOpcode(vm, runtime, null, 'tm2scratch', 'getConfidenceThreshold');
            if (command && typeof command._requestId !== 'undefined') {
                return {_deviceResult: {requestId: command._requestId, value: result}};
            }
            return result;
        }
    },
    extTm2VideoToggle: {
        resolveTarget: false,
        emitTargetsUpdate: false,
        execute: async ({vm, runtime, args}) => {
            await executeExtensionOpcode(vm, runtime, null, 'tm2scratch', 'videoToggle', {
                VIDEO_STATE: String(args[0] || 'on'),
                TRANSPARENCY: toNumber(args[1], 0)
            });
        }
    },

    // ─── TMPose2Scratch Extension ────────────────────────────────────────────────

    extTmposeIsPoseLabelDetected: {
        resolveTarget: false,
        emitTargetsUpdate: false,
        execute: async ({vm, runtime, command, args}) => {
            const result = await executeExtensionOpcode(vm, runtime, null, 'tmpose2scratch', 'isPoseLabelDetected', {
                LABEL: String(args[0] || 'any')
            });
            if (command && typeof command._requestId !== 'undefined') {
                return {_deviceResult: {requestId: command._requestId, value: result}};
            }
            return result;
        }
    },
    extTmposePoseLabelConfidence: {
        resolveTarget: false,
        emitTargetsUpdate: false,
        execute: async ({vm, runtime, command, args}) => {
            const result = await executeExtensionOpcode(vm, runtime, null, 'tmpose2scratch', 'poseLabelConfidence', {
                LABEL: String(args[0] || '')
            });
            if (command && typeof command._requestId !== 'undefined') {
                return {_deviceResult: {requestId: command._requestId, value: result}};
            }
            return result;
        }
    },
    extTmposeSetPoseClassificationModelURL: {
        resolveTarget: false,
        emitTargetsUpdate: false,
        execute: async ({vm, runtime, args}) => {
            await executeExtensionOpcode(vm, runtime, null, 'tmpose2scratch', 'setPoseClassificationModelURL', {
                URL: String(args[0] || ' ')
            });
        }
    },
    extTmposeClassifyVideoPose: {
        resolveTarget: false,
        emitTargetsUpdate: false,
        execute: async ({vm, runtime}) => {
            await executeExtensionOpcode(vm, runtime, null, 'tmpose2scratch', 'classifyVideoPoseBlock');
        }
    },
    extTmposeGetPoseLabel: {
        resolveTarget: false,
        emitTargetsUpdate: false,
        execute: async ({vm, runtime, command}) => {
            const result = await executeExtensionOpcode(vm, runtime, null, 'tmpose2scratch', 'getPoseLabel');
            if (command && typeof command._requestId !== 'undefined') {
                return {_deviceResult: {requestId: command._requestId, value: result}};
            }
            return result;
        }
    },
    extTmposeToggleClassification: {
        resolveTarget: false,
        emitTargetsUpdate: false,
        execute: async ({vm, runtime, args}) => {
            await executeExtensionOpcode(vm, runtime, null, 'tmpose2scratch', 'toggleClassification', {
                CLASSIFICATION_STATE: String(args[0] || 'off')
            });
        }
    },
    extTmposeSetClassificationInterval: {
        resolveTarget: false,
        emitTargetsUpdate: false,
        execute: async ({vm, runtime, args}) => {
            await executeExtensionOpcode(vm, runtime, null, 'tmpose2scratch', 'setClassificationInterval', {
                CLASSIFICATION_INTERVAL: String(args[0] || '1')
            });
        }
    },
    extTmposeSetConfidenceThreshold: {
        resolveTarget: false,
        emitTargetsUpdate: false,
        execute: async ({vm, runtime, args}) => {
            await executeExtensionOpcode(vm, runtime, null, 'tmpose2scratch', 'setConfidenceThreshold', {
                CONFIDENCE_THRESHOLD: toNumber(args[0], 0.5)
            });
        }
    },
    extTmposeGetConfidenceThreshold: {
        resolveTarget: false,
        emitTargetsUpdate: false,
        execute: async ({vm, runtime, command}) => {
            const result = await executeExtensionOpcode(vm, runtime, null, 'tmpose2scratch', 'getConfidenceThreshold');
            if (command && typeof command._requestId !== 'undefined') {
                return {_deviceResult: {requestId: command._requestId, value: result}};
            }
            return result;
        }
    },
    extTmposeVideoToggle: {
        resolveTarget: false,
        emitTargetsUpdate: false,
        execute: async ({vm, runtime, args}) => {
            await executeExtensionOpcode(vm, runtime, null, 'tmpose2scratch', 'videoToggle', {
                VIDEO_STATE: String(args[0] || 'off')
            });
        }
    }
});
