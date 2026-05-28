import {createDesktopPythonRunner} from '../../../src/lib/desktop-python-runner';

const createEventEmitter = () => {
    const handlers = {};
    return {
        on: jest.fn((event, handler) => {
            handlers[event] = handler;
        }),
        emit: (event, ...args) => {
            if (handlers[event]) {
                handlers[event](...args);
            }
        }
    };
};

const createMockProc = () => {
    const stdout = createEventEmitter();
    const stderr = createEventEmitter();
    const proc = createEventEmitter();
    proc.stdout = stdout;
    proc.stderr = stderr;
    proc.killed = false;
    proc.kill = jest.fn(() => {
        proc.killed = true;
    });
    return proc;
};

describe('desktop python runner', () => {
    const clearWindowMocks = () => {
        if (typeof window === 'undefined') return;
        delete window.openblockDesktopPython;
        delete window.desktopPython;
        delete window.require;
    };

    afterEach(() => {
        clearWindowMocks();
        jest.clearAllMocks();
    });

    test('uses preload desktop bridge when available', async () => {
        const bridge = {
            runPythonCode: jest.fn(async () => ({
                exitCode: 0,
                commands: [{cmd: 'say', args: ['hello']}]
            })),
            stopPythonCode: jest.fn()
        };

        window.openblockDesktopPython = bridge;

        const runner = createDesktopPythonRunner();
        const result = await runner.run('print("x")');

        expect(runner.isAvailable()).toBe(true);
        expect(bridge.runPythonCode).toHaveBeenCalledWith('print("x")');
        expect(result).toEqual({
            exitCode: 0,
            signal: null,
            stdout: '',
            stderr: '',
            commands: [{cmd: 'say', args: ['hello']}]
        });

        runner.stop();
        expect(bridge.stopPythonCode).toHaveBeenCalled();
    });

    test('returns unavailable runner when no bridge and no node integration', async () => {
        clearWindowMocks();

        const runner = createDesktopPythonRunner();

        expect(runner.isAvailable()).toBe(false);

        let thrownError = null;
        try {
            await runner.run("print('x')");
        } catch (error) {
            thrownError = error;
        }

        expect(thrownError).toBeTruthy();
        expect(thrownError.message).toContain(
            'Desktop Python runner is unavailable',
        );
    });

    test('falls back to process runner, retries python candidates, and parses commands', async () => {
        const firstProc = createMockProc();
        const secondProc = createMockProc();

        const spawn = jest
            .fn()
            .mockImplementationOnce(() => {
                setTimeout(() => {
                    firstProc.emit('error', {code: 'ENOENT'});
                }, 0);
                return firstProc;
            })
            .mockImplementationOnce(() => {
                setTimeout(() => {
                    secondProc.stdout.emit(
                        'data',
                        '{"cmd":"move","args":[10]}\nregular log line\n',
                    );
                    secondProc.stdout.emit(
                        'data',
                        '{"action":"say","value":"hello"}',
                    );
                    secondProc.stderr.emit('data', 'warn');
                    secondProc.emit('close', 0, null);
                }, 0);
                return secondProc;
            });

        const onCommand = jest.fn();
        const onStdoutLine = jest.fn();
        const onStderr = jest.fn();

        window.require = jest.fn(moduleName => {
            if (moduleName === 'child_process') {
                return {spawn};
            }
            if (moduleName === 'process') {
                return {platform: 'win32'};
            }
            return null;
        });

        const runner = createDesktopPythonRunner({
            onCommand,
            onStdoutLine,
            onStderr
        });
        const result = await runner.run('move(10)');

        expect(spawn).toHaveBeenCalledTimes(2);
        expect(spawn.mock.calls[0][0]).toBe('python');
        expect(spawn.mock.calls[1][0]).toBe('py');
        expect(spawn.mock.calls[1][1]).toEqual(
            expect.arrayContaining(['-3', '-u', '-c']),
        );

        expect(onCommand).toHaveBeenCalledWith({cmd: 'move', args: [10]});
        expect(onCommand).toHaveBeenCalledWith({
            action: 'say',
            value: 'hello'
        });
        expect(onStdoutLine).toHaveBeenCalledWith('regular log line');
        expect(onStderr).toHaveBeenCalledWith('warn');

        expect(result.exitCode).toBe(0);
        expect(result.stderr).toBe('warn');
        expect(result.commands).toEqual([
            {cmd: 'move', args: [10]},
            {action: 'say', value: 'hello'}
        ]);
    });

    test('stop kills active spawned process', async () => {
        const proc = createMockProc();
        const spawn = jest.fn(() => proc);

        window.require = jest.fn(moduleName => {
            if (moduleName === 'child_process') {
                return {spawn};
            }
            if (moduleName === 'process') {
                return {platform: 'win32'};
            }
            return null;
        });

        const runner = createDesktopPythonRunner();
        const runPromise = runner.run("print('x')");

        runner.stop();
        expect(proc.kill).toHaveBeenCalled();

        proc.emit('close', 0, null);
        await runPromise;
    });
});
