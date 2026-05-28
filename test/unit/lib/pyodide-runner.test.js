import {createPyodideRunner} from '../../../src/lib/pyodide-runner';

const flushTimers = () =>
    new Promise(resolve => {
        setTimeout(resolve, 0);
    });

describe('pyodide runner', () => {
    let originalWorker;
    let originalCreateObjectURL;
    let originalRevokeObjectURL;

    beforeEach(() => {
        originalWorker = global.Worker;
        originalCreateObjectURL = URL.createObjectURL;
        originalRevokeObjectURL = URL.revokeObjectURL;

        URL.createObjectURL = jest.fn(() => 'blob:pyodide-worker');
        URL.revokeObjectURL = jest.fn();
    });

    afterEach(() => {
        global.Worker = originalWorker;
        URL.createObjectURL = originalCreateObjectURL;
        URL.revokeObjectURL = originalRevokeObjectURL;
        jest.clearAllMocks();
    });

    test('runs with worker and parses stdout NDJSON commands', async () => {
        const createdWorkers = [];

        global.Worker = class MockWorker {
            constructor () {
                this.onmessage = null;
                this.onerror = null;
                this.terminated = false;
                createdWorkers.push(this);
            }

            postMessage (payload) {
                setTimeout(() => {
                    this.onmessage({
                        data: {
                            type: 'stdout',
                            chunk: '{"cmd":"move","args":[5]}\nplain text\n'
                        }
                    });
                    this.onmessage({
                        data: {
                            type: 'stdout',
                            chunk: '{"action":"say","value":"Hi"}\n'
                        }
                    });
                    this.onmessage({
                        data: {
                            type: 'stderr',
                            chunk: 'warn'
                        }
                    });
                    this.onmessage({
                        data: {
                            type: 'done',
                            exitCode: 0
                        }
                    });
                }, 0);

                expect(payload.type).toBe('run');
                expect(payload.payload.code).toContain(
                    'from openblock import *',
                );
            }

            terminate () {
                this.terminated = true;
            }
        };

        const onCommand = jest.fn();
        const onStdoutLine = jest.fn();
        const onStderr = jest.fn();
        const runner = createPyodideRunner({
            onCommand,
            onStdoutLine,
            onStderr
        });

        const result = await runner.run('move(5)');

        expect(createdWorkers).toHaveLength(1);
        expect(createdWorkers[0].terminated).toBe(true);
        expect(onCommand).toHaveBeenCalledWith({cmd: 'move', args: [5]});
        expect(onCommand).toHaveBeenCalledWith({action: 'say', value: 'Hi'});
        expect(onStdoutLine).toHaveBeenCalledWith('plain text');
        expect(onStderr).toHaveBeenCalledWith('warn');

        expect(result.exitCode).toBe(0);
        expect(result.stderr).toBe('warn');
        expect(result.commands).toEqual([
            {cmd: 'move', args: [5]},
            {action: 'say', value: 'Hi'}
        ]);
    });

    test('rejects second run while previous execution is active', async () => {
        global.Worker = class MockWorker {
            constructor () {
                this.onmessage = null;
                this.onerror = null;
            }

            postMessage () {
                // Keep execution pending.
            }

            terminate () {}
        };

        const runner = createPyodideRunner();
        const firstRun = runner.run("print('first')").then(
            () => null,
            error => error,
        );

        let thrownError = null;
        try {
            await runner.run("print('second')");
        } catch (error) {
            thrownError = error;
        }

        expect(thrownError).toBeTruthy();
        expect(thrownError.message).toBe(
            'Pyodide runner is already executing code.',
        );

        runner.stop();
        await flushTimers();
        const firstRunError = await firstRun;
        expect(firstRunError).toBeTruthy();
        expect(firstRunError.message).toBe('Pyodide execution stopped.');
    });

    test('stop aborts active worker run', async () => {
        let workerInstance = null;

        global.Worker = class MockWorker {
            constructor () {
                this.onmessage = null;
                this.onerror = null;
                this.terminated = false;
                workerInstance = this;
            }

            postMessage () {
                // Keep execution pending.
            }

            terminate () {
                this.terminated = true;
            }
        };

        const runner = createPyodideRunner();
        const runPromise = runner.run("print('x')").then(
            () => null,
            error => error,
        );

        runner.stop();
        await flushTimers();

        expect(workerInstance.terminated).toBe(true);
        const runError = await runPromise;
        expect(runError).toBeTruthy();
        expect(runError.message).toBe('Pyodide execution stopped.');
    });
});
