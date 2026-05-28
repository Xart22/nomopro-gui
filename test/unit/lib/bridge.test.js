import {
    executeBridgeCommand,
    getBridgeRegisteredCommands
} from '../../../src/lib/bridge';

const createTarget = () => {
    const target = {
        id: 'target-1',
        x: 0,
        y: 0,
        direction: 90,
        currentCostume: 0,
        size: 100,
        visible: true,
        sprite: {
            soundBank: {
                playSound: jest.fn()
            }
        },
        setXY: (x, y) => {
            target.x = x;
            target.y = y;
        },
        setDirection: direction => {
            target.direction = direction;
        },
        setVisible: jest.fn(visible => {
            target.visible = visible;
        }),
        setSize: jest.fn(size => {
            target.size = size;
        }),
        setCostume: jest.fn(index => {
            target.currentCostume = index;
        }),
        getBounds: () => ({left: -241, right: 241, top: 10, bottom: -10}),
        keepInFence: jest.fn((x, y) => [x, y]),
        getCostumes: () => [{name: 'A'}, {name: 'B'}],
        getSounds: () => [{name: 'pop', soundId: 'sound-1'}]
    };

    return target;
};

const createVm = target => {
    const runtime = {
        emit: jest.fn(),
        constructor: {
            STAGE_WIDTH: 480,
            STAGE_HEIGHT: 360
        },
        getTargetById: jest.fn(() => target),
        getTargetForStage: jest.fn(() => target),
        getEditingTarget: jest.fn(() => target),
        targets: [target]
    };

    return {
        runtime,
        editingTarget: target,
        emitTargetsUpdate: jest.fn()
    };
};

describe('bridge command registry', () => {
    test('returns registered command names', () => {
        const commands = getBridgeRegisteredCommands();
        expect(commands).toContain('move');
        expect(commands).toContain('selectTarget');
        expect(commands).toContain('wait');
    });

    test('executes move command and updates context', async () => {
        const target = createTarget();
        const vm = createVm(target);

        const context = await executeBridgeCommand(
            vm,
            {cmd: 'move', args: [10], targetId: 'target-1'},
            {},
        );

        expect(target.x).toBeCloseTo(10);
        expect(target.y).toBeCloseTo(0);
        expect(vm.emitTargetsUpdate).toHaveBeenCalledWith(false);
        expect(context.selectedTargetId).toBe('target-1');
    });

    test('executes say command via runtime event', async () => {
        const target = createTarget();
        const vm = createVm(target);

        await executeBridgeCommand(vm, {cmd: 'say', args: ['Hello']}, {});

        expect(vm.runtime.emit).toHaveBeenCalledWith(
            'SAY',
            target,
            'say',
            'Hello',
        );
    });

    test('selectTarget updates context without ui update emit', async () => {
        const target = createTarget();
        const vm = createVm(target);

        const context = await executeBridgeCommand(
            vm,
            {cmd: 'selectTarget', targetId: 'target-1'},
            {},
        );

        expect(context.selectedTargetId).toBe('target-1');
        expect(vm.emitTargetsUpdate).not.toHaveBeenCalled();
    });

    test('supports legacy action payload format', async () => {
        const target = createTarget();
        const vm = createVm(target);

        await executeBridgeCommand(
            vm,
            {action: 'turn_left', value: 15, targetId: 'target-1'},
            {},
        );

        expect(target.direction).toBe(75);
    });

    test('setCostume switches by costume name', async () => {
        const target = createTarget();
        const vm = createVm(target);

        await executeBridgeCommand(
            vm,
            {cmd: 'setCostume', args: ['B'], targetId: 'target-1'},
            {},
        );

        expect(target.setCostume).toHaveBeenCalledWith(1);
        expect(target.currentCostume).toBe(1);
    });

    test('nextCostume advances current costume index', async () => {
        const target = createTarget();
        const vm = createVm(target);
        target.currentCostume = 0;

        await executeBridgeCommand(
            vm,
            {cmd: 'nextCostume', args: [], targetId: 'target-1'},
            {},
        );

        expect(target.setCostume).toHaveBeenCalledWith(1);
        expect(target.currentCostume).toBe(1);
    });

    test('playSound uses sprite soundBank with matching sound name', async () => {
        const target = createTarget();
        const vm = createVm(target);

        await executeBridgeCommand(
            vm,
            {cmd: 'playSound', args: ['pop'], targetId: 'target-1'},
            {},
        );

        expect(target.sprite.soundBank.playSound).toHaveBeenCalledWith(
            'target-1',
            'sound-1',
        );
    });

    test('supports absolute position, visibility, size, and point commands', async () => {
        const target = createTarget();
        const vm = createVm(target);

        await executeBridgeCommand(vm, {cmd: 'setX', args: [42]}, {});
        await executeBridgeCommand(vm, {cmd: 'setY', args: [-18]}, {});
        await executeBridgeCommand(vm, {cmd: 'point', args: [135]}, {});
        await executeBridgeCommand(vm, {cmd: 'hide', args: []}, {});
        await executeBridgeCommand(vm, {cmd: 'show', args: []}, {});
        await executeBridgeCommand(vm, {cmd: 'setSize', args: [150]}, {});
        await executeBridgeCommand(vm, {cmd: 'changeSize', args: [-25]}, {});

        expect(target.x).toBe(42);
        expect(target.y).toBe(-18);
        expect(target.direction).toBe(135);
        expect(target.setVisible).toHaveBeenCalledWith(false);
        expect(target.setVisible).toHaveBeenCalledWith(true);
        expect(target.setSize).toHaveBeenCalledWith(150);
        expect(target.setSize).toHaveBeenCalledWith(125);
    });

    test('supports legacy absolute and looks action payloads', async () => {
        const target = createTarget();
        const vm = createVm(target);

        await executeBridgeCommand(vm, {action: 'set_x', value: 25}, {});
        await executeBridgeCommand(vm, {action: 'set_y', value: -12}, {});
        await executeBridgeCommand(vm, {action: 'set_size', value: 160}, {});
        await executeBridgeCommand(
            vm,
            {action: 'change_size', value: -10},
            {},
        );

        expect(target.x).toBe(25);
        expect(target.y).toBe(-12);
        expect(target.setSize).toHaveBeenCalledWith(160);
        expect(target.setSize).toHaveBeenCalledWith(150);
    });

    test('ifOnEdgeBounce updates direction and keeps target fenced', async () => {
        const target = createTarget();
        const vm = createVm(target);
        target.direction = 180;

        await executeBridgeCommand(vm, {cmd: 'ifOnEdgeBounce', args: []}, {});

        expect(target.keepInFence).toHaveBeenCalledWith(target.x, target.y);
        expect(target.direction).not.toBe(180);
    });

    test('wait command resolves and keeps selectedTargetId context', async () => {
        const target = createTarget();
        const vm = createVm(target);

        const context = await executeBridgeCommand(
            vm,
            {cmd: 'wait', args: [0], targetId: 'target-1'},
            {},
        );

        expect(context.selectedTargetId).toBe('target-1');
        expect(vm.emitTargetsUpdate).toHaveBeenCalledWith(false);
    });

    test('throws for unsupported command', async () => {
        const target = createTarget();
        const vm = createVm(target);

        let capturedError = null;
        try {
            await executeBridgeCommand(
                vm,
                {cmd: 'doesNotExist', args: []},
                {},
            );
        } catch (error) {
            capturedError = error;
        }

        expect(capturedError).toBeTruthy();
        expect(capturedError.message).toContain('Unsupported bridge command');
    });
});
