import {
    hasBlockModeContent,
    hasPythonModeContent
} from '../../../src/lib/modeState';

describe('modeState helpers', () => {
    test('treats blank and default python template as empty', () => {
        const defaultCode = [
            '# Python Mode default template',
            'from openblock import sprite'
        ].join('\n');

        expect(hasPythonModeContent({}, defaultCode)).toBe(false);
        expect(
            hasPythonModeContent(
                {
                    sprite: {code: defaultCode}
                },
                defaultCode,
            ),
        ).toBe(false);
        expect(
            hasPythonModeContent(
                {
                    sprite: {code: 'print("hello")'}
                },
                defaultCode,
            ),
        ).toBe(true);
    });

    test('detects block workspace content from runtime targets', () => {
        expect(hasBlockModeContent(null)).toBe(false);
        expect(
            hasBlockModeContent({
                runtime: {
                    targets: [{blocks: {_blocks: {}}}]
                }
            }),
        ).toBe(false);
        expect(
            hasBlockModeContent({
                runtime: {
                    targets: [
                        {
                            blocks: {
                                _blocks: {
                                    abc: {opcode: 'motion_movesteps'}
                                }
                            }
                        }
                    ]
                }
            }),
        ).toBe(true);
    });
});
