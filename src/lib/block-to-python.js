/**
 * Konversi workspace Blockly aktif → Python string per target.
 *
 * Prioritas:
 * 1. Jika Blockly.Python generator tersedia (dari openblock-blocks) → pakai
 * 2. Fallback: traversal manual top-level blocks
 */

export function generatePythonFromWorkspace (workspace, targetName) {
    const label = targetName || 'Script';

    // ── Prioritas 1: Blockly.Python generator ──────────────────────────
    const Blockly = window.Blockly || (workspace && workspace.Blockly_);
    if (Blockly && Blockly.Python) {
        try {
            const raw = Blockly.Python.workspaceToCode(workspace);
            if (raw && raw.trim().length > 0) {
                return [
                    `# === ${label} ===`,
                    'from openblock import *',
                    'import math',
                    '',
                    raw
                ].join('\n');
            }
        } catch (e) {
            console.warn(
                '[block-to-python] Blockly.Python error, fallback ke manual:',
                e,
            );
        }
    }

    // ── Prioritas 2: Fallback manual ───────────────────────────────────
    return generateManual(workspace, label);
}

// ── Manual generator ────────────────────────────────────────────────────

const IND = '    '; // 4-space indent

function generateManual (workspace, label) {
    const lines = [
        `# === ${label} ===`,
        'from openblock import *',
        'import math',
        '',
        '# (auto-generated from blocks)\n'
    ];

    const topBlocks = workspace.getTopBlocks(true);
    if (topBlocks.length === 0) {
        lines.push('# (no blocks)');
        return lines.join('\n');
    }

    topBlocks.forEach((block, i) => {
        lines.push(blockStack(block, 0));
        if (i < topBlocks.length - 1) lines.push('');
    });

    return lines.join('\n');
}

function blockStack (block, depth) {
    if (!block) return '';
    const parts = [];

    parts.push(blockLine(block, depth));

    // Inner stack (body of if / loop)
    const inner =
        block.getInputTargetBlock &&
        (block.getInputTargetBlock('SUBSTACK') ||
            block.getInputTargetBlock('SUBSTACK2'));
    if (inner) parts.push(blockStack(inner, depth + 1));

    // Next block in linear stack
    const next = block.getNextBlock && block.getNextBlock();
    if (next) parts.push(blockStack(next, depth));

    return parts.filter(Boolean).join('\n');
}

function field (block, name) {
    try {
        return String(block.getFieldValue(name) || '');
    } catch {
        return '';
    }
}

function inputBlock (block, name, depth) {
    try {
        const b = block.getInputTargetBlock(name);
        return b ? blockLine(b, 0) : '0';
    } catch {
        return '0';
    }
}

function blockLine (block, depth) {
    if (!block) return '';
    const ind = IND.repeat(depth);
    const type = block.type || '';
    const f = name => field(block, name);
    const inp = name => inputBlock(block, name, depth);

    switch (type) {
    // Events
    case 'event_whenflagclicked':
        return `${ind}def when_flag_clicked():`;
    case 'event_whenkeypressed':
        return `${ind}def when_key_pressed('${f('KEY_OPTION')}'):`;
    case 'event_whenbroadcastreceived':
        return `${ind}def when_receive('${f('BROADCAST_OPTION')}'):`;
    case 'event_broadcast':
        return `${ind}broadcast('${inp('BROADCAST_INPUT')}')`;

        // Motion
    case 'motion_movesteps':
        return `${ind}move(${inp('STEPS')})`;
    case 'motion_turnright':
        return `${ind}turn_right(${inp('DEGREES')})`;
    case 'motion_turnleft':
        return `${ind}turn_left(${inp('DEGREES')})`;
    case 'motion_gotoxy':
        return `${ind}go_to_xy(${inp('X')}, ${inp('Y')})`;
    case 'motion_goto':
        return `${ind}go_to('${f('TO')}')`;
    case 'motion_setx':
        return `${ind}set_x(${inp('X')})`;
    case 'motion_sety':
        return `${ind}set_y(${inp('Y')})`;
    case 'motion_changexby':
        return `${ind}change_x(${inp('DX')})`;
    case 'motion_changeyby':
        return `${ind}change_y(${inp('DY')})`;
    case 'motion_pointindirection':
        return `${ind}point_direction(${inp('DIRECTION')})`;
    case 'motion_ifonedgebounce':
        return `${ind}if_on_edge_bounce()`;
    case 'motion_xposition':
        return `x_position()`;
    case 'motion_yposition':
        return `y_position()`;
    case 'motion_direction':
        return `direction()`;

        // Looks
    case 'looks_say':
        return `${ind}say(${inp('MESSAGE')})`;
    case 'looks_sayforsecs':
        return `${ind}say(${inp('MESSAGE')}, ${inp('SECS')})`;
    case 'looks_think':
        return `${ind}think(${inp('MESSAGE')})`;
    case 'looks_thinkforsecs':
        return `${ind}think(${inp('MESSAGE')}, ${inp('SECS')})`;
    case 'looks_show':
        return `${ind}show()`;
    case 'looks_hide':
        return `${ind}hide()`;
    case 'looks_switchcostumeto':
        return `${ind}switch_costume('${f('COSTUME')}')`;
    case 'looks_nextcostume':
        return `${ind}next_costume()`;
    case 'looks_setsizeto':
        return `${ind}set_size(${inp('SIZE')})`;
    case 'looks_changesizeby':
        return `${ind}change_size(${inp('CHANGE')})`;
    case 'looks_seteffectto':
        return `${ind}set_effect('${f('EFFECT')}', ${inp('VALUE')})`;
    case 'looks_changeeffectby':
        return `${ind}change_effect('${f('EFFECT')}', ${inp('CHANGE')})`;

        // Sound
    case 'sound_play':
        return `${ind}play_sound('${f('SOUND_MENU')}')`;
    case 'sound_playuntildone':
        return `${ind}play_sound_until_done('${f('SOUND_MENU')}')`;
    case 'sound_stopallsounds':
        return `${ind}stop_all_sounds()`;
    case 'sound_setvolumeto':
        return `${ind}set_volume(${inp('VOLUME')})`;

        // Control
    case 'control_wait':
        return `${ind}wait(${inp('DURATION')})`;
    case 'control_repeat':
        return `${ind}for _ in range(${inp('TIMES')}):`;
    case 'control_forever':
        return `${ind}while True:`;
    case 'control_if':
        return `${ind}if ${inp('CONDITION')}:`;
    case 'control_if_else':
        return `${ind}if ${inp('CONDITION')}:`;
    case 'control_wait_until':
        return `${ind}wait_until(${inp('CONDITION')})`;
    case 'control_repeat_until':
        return `${ind}while not (${inp('CONDITION')}):`;
    case 'control_stop':
        return `${ind}stop('${f('STOP_OPTION')}')`;
    case 'control_create_clone_of':
        return `${ind}create_clone('${f('CLONE_OPTION')}')`;
    case 'control_delete_this_clone':
        return `${ind}delete_clone()`;

        // Sensing
    case 'sensing_askandwait':
        return `${ind}${inp('ANSWER') || 'answer'} = ask(${inp('QUESTION')})`;
    case 'sensing_answer':
        return `answer`;
    case 'sensing_touchingobject':
        return `touching('${f('TOUCHINGOBJECTMENU')}')`;
    case 'sensing_touchingcolor':
        return `touching_color('${inp('COLOR')}')`;
    case 'sensing_keypressed':
        return `key_pressed('${f('KEY_OPTION')}')`;
    case 'sensing_mousedown':
        return `mouse_down()`;
    case 'sensing_mousex':
        return `mouse_x()`;
    case 'sensing_mousey':
        return `mouse_y()`;
    case 'sensing_timer':
        return `timer()`;
    case 'sensing_resettimer':
        return `${ind}reset_timer()`;

        // Operators
    case 'operator_add':
        return `(${inp('NUM1')} + ${inp('NUM2')})`;
    case 'operator_subtract':
        return `(${inp('NUM1')} - ${inp('NUM2')})`;
    case 'operator_multiply':
        return `(${inp('NUM1')} * ${inp('NUM2')})`;
    case 'operator_divide':
        return `(${inp('NUM1')} / ${inp('NUM2')})`;
    case 'operator_mod':
        return `(${inp('NUM1')} % ${inp('NUM2')})`;
    case 'operator_round':
        return `round(${inp('NUM')})`;
    case 'operator_equals':
        return `(${inp('OPERAND1')} == ${inp('OPERAND2')})`;
    case 'operator_gt':
        return `(${inp('OPERAND1')} > ${inp('OPERAND2')})`;
    case 'operator_lt':
        return `(${inp('OPERAND1')} < ${inp('OPERAND2')})`;
    case 'operator_and':
        return `(${inp('OPERAND1')} and ${inp('OPERAND2')})`;
    case 'operator_or':
        return `(${inp('OPERAND1')} or ${inp('OPERAND2')})`;
    case 'operator_not':
        return `(not ${inp('OPERAND')})`;
    case 'operator_join':
        return `(str(${inp('STRING1')}) + str(${inp('STRING2')}))`;
    case 'operator_letter_of':
        return `${inp('STRING')}[${inp('LETTER')} - 1]`;
    case 'operator_length':
        return `len(${inp('STRING')})`;
    case 'operator_contains':
        return `(${inp('STRING2')} in ${inp('STRING1')})`;
    case 'operator_random':
        return `random(${inp('FROM')}, ${inp('TO')})`;
    case 'operator_mathop': {
        const op = f('OPERATOR');
        const opMap = {
            'abs': 'abs',
            'floor': 'math.floor',
            'ceiling': 'math.ceil',
            'sqrt': 'math.sqrt',
            'sin': 'math.sin',
            'cos': 'math.cos',
            'tan': 'math.tan',
            'asin': 'math.asin',
            'acos': 'math.acos',
            'atan': 'math.atan',
            'ln': 'math.log',
            'log': 'math.log10',
            'e ^': 'math.exp',
            '10 ^': '10 **'
        };
        return `${opMap[op] || op}(${inp('NUM')})`;
    }

    // Variables
    case 'data_setvariableto':
        return `${ind}${f('VARIABLE')} = ${inp('VALUE')}`;
    case 'data_changevariableby':
        return `${ind}${f('VARIABLE')} += ${inp('VALUE')}`;
    case 'data_showvariable':
        return `${ind}show_variable('${f('VARIABLE')}')`;
    case 'data_hidevariable':
        return `${ind}hide_variable('${f('VARIABLE')}')`;
    case 'data_variable':
        return f('VARIABLE');

        // Lists
    case 'data_addtolist':
        return `${ind}${f('LIST')}.append(${inp('ITEM')})`;
    case 'data_deleteoflist':
        return `${ind}${f('LIST')}.pop(${inp('INDEX')} - 1)`;
    case 'data_deletealloflist':
        return `${ind}${f('LIST')}.clear()`;
    case 'data_insertatlist':
        return `${ind}${f('LIST')}.insert(${inp('INDEX')} - 1, ${inp('ITEM')})`;
    case 'data_replaceitemoflist':
        return `${ind}${f('LIST')}[${inp('INDEX')} - 1] = ${inp('ITEM')}`;
    case 'data_itemoflist':
        return `${f('LIST')}[${inp('INDEX')} - 1]`;
    case 'data_lengthoflist':
        return `len(${f('LIST')})`;
    case 'data_listcontainsitem':
        return `(${inp('ITEM')} in ${f('LIST')})`;

        // Literals
    case 'math_number':
    case 'math_integer':
    case 'math_positive_number':
        return f('NUM');
    case 'math_angle':
        return f('NUM');
    case 'text':
        return `"${f('TEXT')}"`;
    case 'colour_picker':
        return `"${f('COLOUR')}"`;

        // Fallback
    default:
        return type.startsWith('operator_') || type.startsWith('sensing_') ?
            `${type}()` :
            `${ind}# [${type}]`;
    }
}
