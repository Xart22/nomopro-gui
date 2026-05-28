import {createPyodideRunner} from '../../src/lib/pyodide-runner';

describe('Pyodide runner timeout', () => {
    let originalWorker;
    let originalCreateObjectURL;
    let originalRevokeObjectURL;

    beforeEach(() => {
        originalWorker = global.Worker;
        originalCreateObjectURL = URL.createObjectURL;
        originalRevokeObjectURL = URL.revokeObjectURL;

        URL.createObjectURL = jest.fn(() => 'blob:mock-worker');
        URL.revokeObjectURL = jest.fn();

        global.Worker = class MockWorker {
            constructor () {
                this.onmessage = null;
                this.onerror = null;
            }

            postMessage () {
                // Simulate a stuck execution with no completion message.
            }

            terminate () {}
        };
    });

    afterEach(() => {
        global.Worker = originalWorker;
        URL.createObjectURL = originalCreateObjectURL;
        URL.revokeObjectURL = originalRevokeObjectURL;
    });

    test('rejects when execution exceeds timeout', async () => {
        const runner = createPyodideRunner({executionTimeoutMs: 10});
        let thrownError;

        try {
            await runner.run('print("hello")');
        } catch (error) {
            thrownError = error;
        }

        expect(thrownError).toBeTruthy();
        expect(thrownError.message).toBe(
            'Pyodide execution timed out after 10ms.',
        );
    });
});
