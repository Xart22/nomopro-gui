import {generatePythonFromWorkspace} from '../../../src/lib/block-to-python';

describe('block-to-python', () => {
    test('adds Python mode prelude for Blockly generator output', () => {
        const workspace = {
            Blockly_: {
                Python: {
                    workspaceToCode: () => 'move(10)'
                }
            }
        };

        const code = generatePythonFromWorkspace(workspace, 'Sprite1');

        expect(code).toContain('# === Sprite1 ===');
        expect(code).toContain('from openblock import *');
        expect(code).toContain('import math');
        expect(code).toContain('move(10)');
    });

    test('adds Python mode prelude for manual fallback output', () => {
        const workspace = {
            getTopBlocks: () => []
        };

        const code = generatePythonFromWorkspace(workspace, 'Stage');

        expect(code).toContain('# === Stage ===');
        expect(code).toContain('from openblock import *');
        expect(code).toContain('import math');
        expect(code).toContain('# (no blocks)');
    });
});
