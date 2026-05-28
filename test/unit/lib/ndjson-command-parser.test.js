import {parseNdjsonCommandLine} from '../../../src/lib/ndjson-command-parser';

describe('parseNdjsonCommandLine', () => {
    test('parses cmd/args NDJSON object', () => {
        const line = '{"cmd":"move","args":[10]}';
        const result = parseNdjsonCommandLine(line);

        expect(result).toHaveLength(1);
        expect(result[0]).toEqual({cmd: 'move', args: [10]});
    });

    test('parses legacy action payload for backward compatibility', () => {
        const line = '{"action":"say","value":"Hello"}';
        const result = parseNdjsonCommandLine(line);

        expect(result).toHaveLength(1);
        expect(result[0]).toEqual({action: 'say', value: 'Hello'});
    });

    test('parses array payload and filters non-command objects', () => {
        const line =
            '[{"cmd":"move","args":[3]},{"foo":"bar"},{"action":"wait","value":1}]';
        const result = parseNdjsonCommandLine(line);

        expect(result).toHaveLength(2);
        expect(result[0]).toEqual({cmd: 'move', args: [3]});
        expect(result[1]).toEqual({action: 'wait', value: 1});
    });

    test('returns empty array for non-json lines', () => {
        const result = parseNdjsonCommandLine('just stdout text');
        expect(result).toEqual([]);
    });

    test('returns empty array for invalid json line', () => {
        const result = parseNdjsonCommandLine('{"cmd":');
        expect(result).toEqual([]);
    });

    test('returns empty array for valid json but not command object', () => {
        const result = parseNdjsonCommandLine('{"foo":"bar"}');
        expect(result).toEqual([]);
    });
});
