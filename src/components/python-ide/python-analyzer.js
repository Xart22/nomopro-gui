import {PYODIDE_CONFIG} from './python-ide-config';

const createSemanticAnalyzer = async (pyodide, code) => {
    if (!pyodide) {
        console.log('[Analyzer] Pyodide not available');
        return [];
    }
    try {
        console.log('[Analyzer] Running semantic analysis on code:');
        console.log(code);
        await pyodide.globals.set('SRC_CODE', code);

        const result = await pyodide.runPythonAsync(`
import ast, json, builtins
code = SRC_CODE
errors = []
try:
    tree = ast.parse(code)
    builtins_names = set(dir(builtins))
    nomopro_builtins = {
        'Sprite', 'sprite', 'stage',
        'move', 'goto', 'go_to_xy', 'go_to',
        'set_x', 'set_y', 'change_x', 'change_y',
        'turn_right', 'turn_left',
        'point', 'point_direction', 'point_in_direction',
        'x_position', 'y_position', 'direction',
        'say', 'say_for_seconds', 'think', 'think_for_seconds',
        'show', 'hide',
        'switch_costume', 'set_costume',
        'switch_backdrop_to', 'set_backdrop',
        'next_costume', 'next_backdrop',
        'set_size', 'change_size',
        'play_sound', 'playSound', 'play_sound_until_done',
        'if_on_edge_bounce', 'bounce_on_edge',
        'set_effect', 'change_effect',
        'pen_clear', 'pen_stamp', 'pen_down', 'pen_up',
        'set_pen_color', 'change_pen_color_param',
        'set_pen_color_param', 'change_pen_size', 'set_pen_size',
        'speak', 'set_voice', 'set_speech_language',
        'video_toggle', 'set_video_transparency',
        'load_device', 'clear_device',
        'stop_all_sounds', 'set_volume',
        'wait', 'wait_until', 'stop',
        'create_clone', 'delete_clone', 'when_i_start_as_a_clone',
        'ask', 'answer', 'touching', 'touching_color',
        'key_pressed', 'mouse_down', 'mouse_x', 'mouse_y',
        'timer', 'reset_timer', 'random',
        'select_target',
        'show_variable', 'hide_variable',
        'variable', 'set_variable', 'change_variable_by',
        'list_value', 'add_to_list', 'delete_of_list',
        'delete_all_of_list', 'insert_at_list',
        'replace_item_of_list', 'item_of_list',
        'length_of_list', 'list_contains_item',
        'when_i_receive', 'broadcast', 'broadcast_and_wait',
        'green_flag', 'trigger_key_pressed',
        'trigger_sprite_clicked', 'trigger_stage_clicked',
        'trigger_backdrop_switch',
        'emit',
    }
    all_builtins = builtins_names | nomopro_builtins
    
    class Analyzer(ast.NodeVisitor):
        def __init__(self):
            self.scopes = [set()]
            self.errors = []
            self.defined_names = set()
        def _add_name(self, name):
            if name:
                self.scopes[-1].add(name)
                self.defined_names.add(name)
        def visit_FunctionDef(self, node):
            self._add_name(node.name)
            self.scopes.append(set())
            for arg in getattr(node.args, 'args', []):
                self._add_name(getattr(arg, 'arg', None))
            self.generic_visit(node)
            self.scopes.pop()
        def visit_AsyncFunctionDef(self, node):
            self.visit_FunctionDef(node)
        def visit_ClassDef(self, node):
            self._add_name(node.name)
            self.scopes.append(set())
            self.generic_visit(node)
            self.scopes.pop()
        def visit_Import(self, node):
            for n in node.names:
                self._add_name(n.asname or n.name.split('.')[0])
        def visit_ImportFrom(self, node):
            for n in node.names:
                self._add_name(n.asname or n.name)
        def visit_Assign(self, node):
            for t in node.targets:
                if isinstance(t, ast.Name):
                    self._add_name(t.id)
            self.generic_visit(node)
        def visit_For(self, node):
            if isinstance(node.target, ast.Name):
                self._add_name(node.target.id)
            self.generic_visit(node)
        def visit_With(self, node):
            for item in getattr(node, 'items', []):
                if hasattr(item, 'optional_vars') and isinstance(item.optional_vars, ast.Name):
                    self._add_name(item.optional_vars.id)
            self.generic_visit(node)
        def visit_ExceptHandler(self, node):
            if node.name:
                self._add_name(node.name)
            self.generic_visit(node)
        def visit_Name(self, node):
            if isinstance(node.ctx, ast.Load):
                name = node.id
                if name in ('True','False','None'):
                    return
                if any(name in s for s in self.scopes):
                    return
                if name in all_builtins:
                    return
                self.errors.append({'lineno': node.lineno, 'col': node.col_offset, 'msg': f"Undefined variable '{name}'"})
            elif isinstance(node.ctx, ast.Store):
                self._add_name(node.id)
    
    analyzer = Analyzer()
    analyzer.visit(tree)
    errors = analyzer.errors
except SyntaxError as se:
    errors = [{'lineno': se.lineno or 1, 'col': se.offset or 0, 'msg': str(se)}]
except Exception as e:
    errors = [{'lineno': 1, 'col': 0, 'msg': f"Analysis error: {str(e)}"}]
json.dumps(errors)
`);
        console.log('[Analyzer] Raw result from Pyodide:', result);
        const parsed = JSON.parse(result || '[]');
        console.log('[Analyzer] Parsed errors:', parsed);
        return parsed;
    } catch (e) {
        console.error('[Analyzer] Error during analysis:', e);
        return [];
    }
};

const createSyntaxValidator = (
    monaco,
    editor,
    setPyodideLoading,
    glyphClass,
) => {
    let errorGlyphDecorations = [];

    const ensurePyodideLoaded = () => {
        if (window.pyodide) return Promise.resolve(window.pyodide);
        if (window.loadingPyodidePromise) return window.loadingPyodidePromise;

        setPyodideLoading(true);
        window.loadingPyodidePromise = new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = `${PYODIDE_CONFIG.CDN}/${PYODIDE_CONFIG.VERSION}/full/pyodide.js`;
            script.crossOrigin = 'anonymous';
            script.onload = async () => {
                try {
                    const pyodide = await loadPyodide({
                        indexURL: `${PYODIDE_CONFIG.CDN}/${PYODIDE_CONFIG.VERSION}/full/`
                    });
                    window.pyodide = pyodide;
                    setPyodideLoading(false);
                    resolve(pyodide);
                } catch (err) {
                    reject(err);
                }
            };
            script.onerror = err => {
                setPyodideLoading(false);
                reject(err || new Error('Failed to load pyodide script'));
            };
            document.head.appendChild(script);
        });
        return window.loadingPyodidePromise;
    };

    const extractSyntaxError = raw => {
        const fileLineMatch = raw.match(/File\s+".*?",\s*line\s*(\d+)/i);
        const lineMatch = raw.match(/line\s*(\d+)/i);
        const lineno = fileLineMatch ?
            parseInt(fileLineMatch[1], 10) :
            lineMatch ?
                parseInt(lineMatch[1], 10) :
                null;
        const parts = raw
            .split(/\n/)
            .map(s => s.trim())
            .filter(Boolean);
        const message = parts.length ?
            parts[parts.length - 1].replace(
                /^Traceback.*:|^SyntaxError:\s*/i,
                '',
            ) :
            raw;
        return {lineno: lineno || 1, message: message || raw};
    };

    const validateBrackets = code => {
        const markers = [];
        const stack = [];
        const openFor = {'(': ')', '[': ']', '{': '}'};
        const closeFor = {')': '(', ']': '[', '}': '{'};
        const lines = String(code || '').split(/\r?\n/);

        for (let i = 0; i < lines.length; i += 1) {
            const line = lines[i];
            for (let j = 0; j < line.length; j += 1) {
                const ch = line[j];
                if (openFor[ch]) stack.push({ch, line: i + 1});
                if (closeFor[ch]) {
                    if (
                        stack.length === 0 ||
                        stack[stack.length - 1].ch !== closeFor[ch]
                    ) {
                        markers.push({
                            severity: 8,
                            startLineNumber: i + 1,
                            startColumn: j + 1,
                            endLineNumber: i + 1,
                            endColumn: j + 2,
                            message: `Unmatched '${ch}'`
                        });
                        return markers;
                    }
                    stack.pop();
                }
            }
            if (markers.length) break;
        }

        if (stack.length) {
            const last = stack[stack.length - 1];
            markers.push({
                severity: 8,
                startLineNumber: last.line,
                startColumn: 1,
                endLineNumber: last.line,
                endColumn: 1,
                message: `Unclosed '${last.ch}'`
            });
        }
        return markers;
    };

    return async (code, setSyntaxStatus) => {
        const model = editor.getModel();
        if (!model) return;

        const markers = [];

        try {
            if (!window.pyodide) {
                console.log('[PythonIDE] Waiting for Pyodide to load...');
                await ensurePyodideLoaded();
            }

            if (window.pyodide?.runPythonAsync) {
                try {
                    console.log('[PythonIDE] Running compile check...');
                    await window.pyodide.runPythonAsync(
                        `compile(${JSON.stringify(code)}, '<input>', 'exec')`,
                    );

                    console.log('[PythonIDE] Running semantic analysis...');
                    const semErrors = await createSemanticAnalyzer(
                        window.pyodide,
                        code,
                    );
                    console.log(
                        '[PythonIDE] Semantic errors found:',
                        semErrors,
                    );
                    semErrors.forEach(se => {
                        if (se?.lineno) {
                            markers.push({
                                severity: 8,
                                startLineNumber: se.lineno,
                                startColumn: (se.col || 1) + 1,
                                endLineNumber: se.lineno,
                                endColumn: Math.max(
                                    (se.col || 1) + 2,
                                    (se.col || 1) + 20,
                                ),
                                message: se.msg || 'Possible issue'
                            });
                        }
                    });
                } catch (pyErr) {
                    const {lineno, message} = extractSyntaxError(
                        String(pyErr?.message || pyErr),
                    );
                    markers.push({
                        severity: 8,
                        startLineNumber: lineno,
                        startColumn: 1,
                        endLineNumber: lineno,
                        endColumn: 1,
                        message
                    });
                }
            } else {
                markers.push(...validateBrackets(code));
            }
        } catch (e) {
            setSyntaxStatus('Validator error');
            return;
        }

        console.log(
            `[PythonIDE] Validation complete: ${markers.length} error(s)`,
            markers,
        );
        monaco.editor.setModelMarkers(model, 'python-syntax', markers);

        const uniqueErrorLines = [
            ...new Set(markers.map(m => m.startLineNumber))
        ];
        const glyphDecorations = uniqueErrorLines.map(line => ({
            range: new monaco.Range(line, 1, line, 1),
            options: {
                isWholeLine: true,
                glyphMarginClassName: glyphClass,
                glyphMarginHoverMessage: {value: 'Error on this line'}
            }
        }));
        errorGlyphDecorations = editor.deltaDecorations(
            errorGlyphDecorations,
            glyphDecorations,
        );

        if (markers.length) setSyntaxStatus(`${markers.length} error(s)`);
        else setSyntaxStatus('Syntax OK');
    };
};

export {createSemanticAnalyzer, createSyntaxValidator};
