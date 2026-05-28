// Monaco completion provider for the Nomopro Python SDK.
// Registers once per monaco instance; subsequent calls are no-ops.

let disposable = null;

const SPRITE_METHODS = [
    {
        label: 'move',
        insertText: 'move(${1:steps})',
        detail: 'move(steps: number)',
        doc: 'Move sprite forward by steps in the current direction.'
    },
    {
        label: 'turn',
        insertText: 'turn(${1:degrees})',
        detail: 'turn(degrees: number)',
        doc: 'Turn sprite clockwise by degrees.'
    },
    {
        label: 'gotoXY',
        insertText: 'gotoXY(${1:x}, ${2:y})',
        detail: 'gotoXY(x: number, y: number)',
        doc: 'Move sprite to absolute position (x, y).'
    },
    {
        label: 'setX',
        insertText: 'setX(${1:x})',
        detail: 'setX(x: number)',
        doc: 'Set sprite X position.'
    },
    {
        label: 'setY',
        insertText: 'setY(${1:y})',
        detail: 'setY(y: number)',
        doc: 'Set sprite Y position.'
    },
    {
        label: 'changeX',
        insertText: 'changeX(${1:dx})',
        detail: 'changeX(dx: number)',
        doc: 'Change X position by dx.'
    },
    {
        label: 'changeY',
        insertText: 'changeY(${1:dy})',
        detail: 'changeY(dy: number)',
        doc: 'Change Y position by dy.'
    },
    {
        label: 'say',
        insertText: 'say(${1:"text"})',
        detail: 'say(text: str, sec=None)',
        doc: 'Show a speech bubble with text.'
    },
    {
        label: 'think',
        insertText: 'think(${1:"text"})',
        detail: 'think(text: str, sec=None)',
        doc: 'Show a thought bubble with text.'
    },
    {
        label: 'show',
        insertText: 'show()',
        detail: 'show()',
        doc: 'Make sprite visible.'
    },
    {
        label: 'hide',
        insertText: 'hide()',
        detail: 'hide()',
        doc: 'Make sprite invisible.'
    },
    {
        label: 'setCostume',
        insertText: 'setCostume(${1:"name"})',
        detail: 'setCostume(name: str)',
        doc: 'Switch to costume by name.'
    },
    {
        label: 'nextCostume',
        insertText: 'nextCostume()',
        detail: 'nextCostume()',
        doc: 'Switch to next costume.'
    },
    {
        label: 'setBackdrop',
        insertText: 'setBackdrop(${1:"name"})',
        detail: 'setBackdrop(name: str)',
        doc: 'Switch stage backdrop by name.'
    },
    {
        label: 'nextBackdrop',
        insertText: 'nextBackdrop()',
        detail: 'nextBackdrop()',
        doc: 'Switch to next stage backdrop.'
    },
    {
        label: 'setSize',
        insertText: 'setSize(${1:100})',
        detail: 'setSize(size: number)',
        doc: 'Set sprite size (100 = normal).'
    },
    {
        label: 'changeSize',
        insertText: 'changeSize(${1:delta})',
        detail: 'changeSize(delta: number)',
        doc: 'Change sprite size by delta.'
    },
    {
        label: 'playSound',
        insertText: 'playSound(${1:"name"})',
        detail: 'playSound(name: str)',
        doc: 'Play a sound by name.'
    },
    {
        label: 'wait',
        insertText: 'wait(${1:1})',
        detail: 'wait(sec: number)',
        doc: 'Wait for sec seconds.'
    },
    {
        label: 'ifOnEdgeBounce',
        insertText: 'ifOnEdgeBounce()',
        detail: 'ifOnEdgeBounce()',
        doc: 'Bounce off the edge if touching it.'
    },
    {
        label: 'point',
        insertText: 'point(${1:90})',
        detail: 'point(direction: number)',
        doc: 'Point sprite in direction (90 = right, 0 = up, -90 = left, 180 = down).'
    },
    {
        label: 'selectTarget',
        insertText: 'selectTarget(target_name="${1:name}")',
        detail: 'selectTarget(target_id=None, target_name=None)',
        doc: 'Switch this sprite controller to a different target.'
    }
];

const TOP_LEVEL_COMPLETIONS = [
    {
        label: 'Sprite',
        kind: 'Class',
        insertText: "Sprite('${1:name}')",
        detail: 'Sprite(name: str)',
        doc:
            'Create a Sprite controller for the named sprite.\n' +
            "Example: sprite = Sprite('Cat')"
    },
    {
        label: 'sprite',
        kind: 'Variable',
        insertText: 'sprite',
        detail: 'Sprite instance',
        doc: "Pre-created Sprite controller for the current file's target."
    },
    {
        label: 'stage',
        kind: 'Variable',
        insertText: 'stage',
        detail: 'Stage Sprite-like instance',
        doc: 'Pre-created controller for stage scripts.'
    },
    // Convenience module-level aliases
    {
        label: 'move',
        kind: 'Function',
        insertText: 'move(${1:steps})',
        detail: 'move(steps: number)',
        doc: 'Move the default sprite forward by steps.'
    },
    {
        label: 'turn_right',
        kind: 'Function',
        insertText: 'turn_right(${1:degrees})',
        detail: 'turn_right(degrees: number)',
        doc: 'Turn the default sprite right by degrees.'
    },
    {
        label: 'turn_left',
        kind: 'Function',
        insertText: 'turn_left(${1:degrees})',
        detail: 'turn_left(degrees: number)',
        doc: 'Turn the default sprite left by degrees.'
    },
    {
        label: 'go_to_xy',
        kind: 'Function',
        insertText: 'go_to_xy(${1:x}, ${2:y})',
        detail: 'go_to_xy(x, y)',
        doc: 'Move the default sprite to (x, y).'
    },
    {
        label: 'say',
        kind: 'Function',
        insertText: 'say(${1:"text"})',
        detail: 'say(text, sec=None)',
        doc: 'Show a speech bubble on the default sprite.'
    },
    {
        label: 'think',
        kind: 'Function',
        insertText: 'think(${1:"text"})',
        detail: 'think(text, sec=None)',
        doc: 'Show a thought bubble on the default sprite.'
    },
    {
        label: 'show',
        kind: 'Function',
        insertText: 'show()',
        detail: 'show()',
        doc: 'Show the default sprite.'
    },
    {
        label: 'hide',
        kind: 'Function',
        insertText: 'hide()',
        detail: 'hide()',
        doc: 'Hide the default sprite.'
    },
    {
        label: 'set_x',
        kind: 'Function',
        insertText: 'set_x(${1:x})',
        detail: 'set_x(x)',
        doc: 'Set X position of the default sprite.'
    },
    {
        label: 'set_y',
        kind: 'Function',
        insertText: 'set_y(${1:y})',
        detail: 'set_y(y)',
        doc: 'Set Y position of the default sprite.'
    },
    {
        label: 'change_x',
        kind: 'Function',
        insertText: 'change_x(${1:dx})',
        detail: 'change_x(dx)',
        doc: 'Change X of the default sprite.'
    },
    {
        label: 'change_y',
        kind: 'Function',
        insertText: 'change_y(${1:dy})',
        detail: 'change_y(dy)',
        doc: 'Change Y of the default sprite.'
    },
    {
        label: 'wait',
        kind: 'Function',
        insertText: 'wait(${1:1})',
        detail: 'wait(sec)',
        doc: 'Wait for sec seconds.'
    },
    {
        label: 'switch_backdrop_to',
        kind: 'Function',
        insertText: 'switch_backdrop_to(${1:"backdrop"})',
        detail: 'switch_backdrop_to(name)',
        doc: 'Switch stage backdrop to the specified name.'
    },
    {
        label: 'set_backdrop',
        kind: 'Function',
        insertText: 'set_backdrop(${1:"backdrop"})',
        detail: 'set_backdrop(name)',
        doc: 'Alias of switch_backdrop_to(name).'
    },
    {
        label: 'next_backdrop',
        kind: 'Function',
        insertText: 'next_backdrop()',
        detail: 'next_backdrop()',
        doc: 'Switch stage to next backdrop.'
    },
    {
        label: 'set_costume',
        kind: 'Function',
        insertText: 'set_costume(${1:"costume"})',
        detail: 'set_costume(name)',
        doc: 'Alias of switch_costume(name).'
    },
    {
        label: 'bounce_on_edge',
        kind: 'Function',
        insertText: 'bounce_on_edge()',
        detail: 'bounce_on_edge()',
        doc: 'Alias of if_on_edge_bounce().'
    },
    {
        label: 'if_on_edge_bounce',
        kind: 'Function',
        insertText: 'if_on_edge_bounce()',
        detail: 'if_on_edge_bounce()',
        doc: 'Bounce the default sprite off the edge.'
    },
    {
        label: 'point_direction',
        kind: 'Function',
        insertText: 'point_direction(${1:90})',
        detail: 'point_direction(direction)',
        doc: 'Point the default sprite in a direction.'
    },
    {
        label: 'point_in_direction',
        kind: 'Function',
        insertText: 'point_in_direction(${1:90})',
        detail: 'point_in_direction(direction)',
        doc: 'Alias of point_direction(direction).'
    },
    {
        label: 'playSound',
        kind: 'Function',
        insertText: 'playSound(${1:"sound"})',
        detail: 'playSound(name)',
        doc: 'Alias of play_sound(name).'
    }
];

const BASIC_PYTHON_COMPLETIONS = [
    {
        label: 'if',
        kind: 'Keyword',
        insertText: 'if ${1:condition}:\n    ${2:pass}',
        detail: 'if statement',
        doc: 'Conditional execution.'
    },
    {
        label: 'ifelse',
        kind: 'Snippet',
        insertText: 'if ${1:condition}:\n    ${2:pass}\nelse:\n    ${3:pass}',
        detail: 'if / else',
        doc: 'Conditional with fallback branch.'
    },
    {
        label: 'for',
        kind: 'Keyword',
        insertText: 'for ${1:item} in ${2:iterable}:\n    ${3:pass}',
        detail: 'for loop',
        doc: 'Iterate over an iterable.'
    },
    {
        label: 'while',
        kind: 'Keyword',
        insertText: 'while ${1:condition}:\n    ${2:pass}',
        detail: 'while loop',
        doc: 'Loop while condition is true.'
    },
    {
        label: 'def',
        kind: 'Snippet',
        insertText: 'def ${1:function_name}(${2:args}):\n    ${3:pass}',
        detail: 'function definition',
        doc: 'Define a function.'
    },
    {
        label: 'class',
        kind: 'Snippet',
        insertText:
            'class ${1:ClassName}:\n    def __init__(self${2:, args}):\n        ${3:pass}',
        detail: 'class definition',
        doc: 'Define a class.'
    },
    {
        label: 'try',
        kind: 'Snippet',
        insertText:
            'try:\n    ${1:pass}\nexcept ${2:Exception} as ${3:e}:\n    ${4:pass}',
        detail: 'try / except',
        doc: 'Handle exceptions.'
    },
    {
        label: 'with',
        kind: 'Snippet',
        insertText: 'with ${1:expr} as ${2:name}:\n    ${3:pass}',
        detail: 'with statement',
        doc: 'Context manager statement.'
    },
    {
        label: 'import',
        kind: 'Keyword',
        insertText: 'import ${1:module}',
        detail: 'import module',
        doc: 'Import a module.'
    },
    {
        label: 'from',
        kind: 'Keyword',
        insertText: 'from ${1:module} import ${2:name}',
        detail: 'from import',
        doc: 'Import names from a module.'
    },
    {
        label: 'print',
        kind: 'Function',
        insertText: 'print(${1:value})',
        detail: 'print(value)',
        doc: 'Print to standard output.'
    },
    {
        label: 'range',
        kind: 'Function',
        insertText: 'range(${1:stop})',
        detail: 'range(stop)',
        doc: 'Generate integer sequence.'
    },
    {
        label: 'len',
        kind: 'Function',
        insertText: 'len(${1:value})',
        detail: 'len(value)',
        doc: 'Get length of a sequence or collection.'
    },
    {
        label: 'list',
        kind: 'Snippet',
        insertText: '[${1:item} for ${2:item} in ${3:iterable}]',
        detail: 'list comprehension',
        doc: 'Create list using comprehension.'
    },
    {
        label: 'dict',
        kind: 'Snippet',
        insertText: '{${1:key}: ${2:value}}',
        detail: 'dict literal',
        doc: 'Create a dictionary.'
    },
    {
        label: 'fstring',
        kind: 'Snippet',
        insertText: 'f"${1:text} {${2:expr}}"',
        detail: 'f-string',
        doc: 'Formatted string literal.'
    },
    {
        label: 'main',
        kind: 'Snippet',
        insertText: "if __name__ == '__main__':\n    ${1:print('run main')}",
        detail: 'main guard',
        doc: 'Entry point guard.'
    }
];

const NOMOPRO_SENSING_COMPLETIONS = [
    {
        label: 'ask',
        kind: 'Function',
        insertText: 'ask(${1:"question"})',
        detail: 'ask(question)',
        doc: 'Show ask prompt and update answer.'
    },
    {
        label: 'answer',
        kind: 'Variable',
        insertText: 'answer',
        detail: 'last answer',
        doc: 'Last answer from ask().'
    },
    {
        label: 'touching',
        kind: 'Function',
        insertText: 'touching(${1:"target"})',
        detail: 'touching(target)',
        doc: 'Return whether touching target.'
    },
    {
        label: 'touching_color',
        kind: 'Function',
        insertText: 'touching_color(${1:"#ff0000"})',
        detail: 'touching_color(color)',
        doc: 'Return whether touching color.'
    },
    {
        label: 'key_pressed',
        kind: 'Function',
        insertText: 'key_pressed(${1:"space"})',
        detail: 'key_pressed(key)',
        doc: 'Return whether key is pressed.'
    },
    {
        label: 'mouse_down',
        kind: 'Function',
        insertText: 'mouse_down()',
        detail: 'mouse_down()',
        doc: 'Return whether mouse button is down.'
    },
    {
        label: 'mouse_x',
        kind: 'Function',
        insertText: 'mouse_x()',
        detail: 'mouse_x()',
        doc: 'Get mouse X position.'
    },
    {
        label: 'mouse_y',
        kind: 'Function',
        insertText: 'mouse_y()',
        detail: 'mouse_y()',
        doc: 'Get mouse Y position.'
    },
    {
        label: 'timer',
        kind: 'Function',
        insertText: 'timer()',
        detail: 'timer()',
        doc: 'Seconds since timer reset.'
    },
    {
        label: 'reset_timer',
        kind: 'Function',
        insertText: 'reset_timer()',
        detail: 'reset_timer()',
        doc: 'Reset timer to zero.'
    },
    {
        label: 'random',
        kind: 'Function',
        insertText: 'random(${1:1}, ${2:10})',
        detail: 'random(start, end)',
        doc: 'Random float between start and end.'
    },
    {
        label: 'x_position',
        kind: 'Function',
        insertText: 'x_position()',
        detail: 'x_position()',
        doc: 'Get current sprite x position.'
    },
    {
        label: 'y_position',
        kind: 'Function',
        insertText: 'y_position()',
        detail: 'y_position()',
        doc: 'Get current sprite y position.'
    },
    {
        label: 'direction',
        kind: 'Function',
        insertText: 'direction()',
        detail: 'direction()',
        doc: 'Get current sprite direction.'
    },
    {
        label: 'show_variable',
        kind: 'Function',
        insertText: 'show_variable(${1:"name"})',
        detail: 'show_variable(name)',
        doc: 'Show variable monitor.'
    },
    {
        label: 'hide_variable',
        kind: 'Function',
        insertText: 'hide_variable(${1:"name"})',
        detail: 'hide_variable(name)',
        doc: 'Hide variable monitor.'
    }
];

const NOMOPRO_DATA_COMPLETIONS = [
    {
        label: 'variable',
        kind: 'Function',
        insertText: 'variable(${1:"score"}, ${2:0})',
        detail: 'variable(name, default=0)',
        doc: 'Get variable value, creating it with default if missing.'
    },
    {
        label: 'set_variable',
        kind: 'Function',
        insertText: 'set_variable(${1:"score"}, ${2:10})',
        detail: 'set_variable(name, value)',
        doc: 'Set variable value.'
    },
    {
        label: 'change_variable_by',
        kind: 'Function',
        insertText: 'change_variable_by(${1:"score"}, ${2:1})',
        detail: 'change_variable_by(name, delta)',
        doc: 'Increase/decrease numeric variable.'
    },
    {
        label: 'list_value',
        kind: 'Function',
        insertText: 'list_value(${1:"items"})',
        detail: 'list_value(name)',
        doc: 'Get list object by name, creating if missing.'
    },
    {
        label: 'add_to_list',
        kind: 'Function',
        insertText: 'add_to_list(${1:item}, ${2:"items"})',
        detail: 'add_to_list(item, list_name)',
        doc: 'Append item to list.'
    },
    {
        label: 'delete_of_list',
        kind: 'Function',
        insertText: 'delete_of_list(${1:1}, ${2:"items"})',
        detail: 'delete_of_list(index, list_name)',
        doc: 'Delete item at 1-based index from list.'
    },
    {
        label: 'delete_all_of_list',
        kind: 'Function',
        insertText: 'delete_all_of_list(${1:"items"})',
        detail: 'delete_all_of_list(list_name)',
        doc: 'Clear all items in list.'
    },
    {
        label: 'insert_at_list',
        kind: 'Function',
        insertText: 'insert_at_list(${1:item}, ${2:1}, ${3:"items"})',
        detail: 'insert_at_list(item, index, list_name)',
        doc: 'Insert item at 1-based index.'
    },
    {
        label: 'replace_item_of_list',
        kind: 'Function',
        insertText: 'replace_item_of_list(${1:1}, ${2:"items"}, ${3:item})',
        detail: 'replace_item_of_list(index, list_name, item)',
        doc: 'Replace item at 1-based index.'
    },
    {
        label: 'item_of_list',
        kind: 'Function',
        insertText: 'item_of_list(${1:1}, ${2:"items"})',
        detail: 'item_of_list(index, list_name)',
        doc: 'Get item at 1-based index.'
    },
    {
        label: 'length_of_list',
        kind: 'Function',
        insertText: 'length_of_list(${1:"items"})',
        detail: 'length_of_list(list_name)',
        doc: 'Get list length.'
    },
    {
        label: 'list_contains_item',
        kind: 'Function',
        insertText: 'list_contains_item(${1:"items"}, ${2:item})',
        detail: 'list_contains_item(list_name, item)',
        doc: 'Check if item exists in list.'
    }
];

const NOMOPRO_EVENT_COMPLETIONS = [
    {
        label: 'broadcast',
        kind: 'Function',
        insertText: 'broadcast(${1:"message1"})',
        detail: 'broadcast(message)',
        doc: 'Send a broadcast message to all listeners.'
    },
    {
        label: 'broadcast_and_wait',
        kind: 'Function',
        insertText: 'broadcast_and_wait(${1:"message1"})',
        detail: 'broadcast_and_wait(message)',
        doc: 'Send broadcast message and wait for listeners to finish.'
    },
    {
        label: 'when_i_receive',
        kind: 'Snippet',
        insertText:
            '@when_i_receive(${1:"message1"})\ndef ${2:on_message}():\n    ${3:pass}',
        detail: '@when_i_receive(message)',
        doc: 'Register a local Python handler for a broadcast message.'
    },
    {
        label: 'green_flag',
        kind: 'Function',
        insertText: 'green_flag()',
        detail: 'green_flag()',
        doc: 'Trigger green-flag hats in VM and local handlers.'
    },
    {
        label: 'when_green_flag_clicked',
        kind: 'Snippet',
        insertText:
            '@when_green_flag_clicked\ndef ${1:on_green_flag}():\n    ${2:pass}',
        detail: '@when_green_flag_clicked',
        doc: 'Register local Python handler for green flag trigger.'
    },
    {
        label: 'trigger_key_pressed',
        kind: 'Function',
        insertText: 'trigger_key_pressed(${1:"space"})',
        detail: 'trigger_key_pressed(key)',
        doc: 'Trigger key-pressed hats in VM and local handlers.'
    },
    {
        label: 'when_key_pressed',
        kind: 'Snippet',
        insertText:
            '@when_key_pressed(${1:"space"})\ndef ${2:on_key}():\n    ${3:pass}',
        detail: '@when_key_pressed(key)',
        doc: 'Register local handler for key-pressed event.'
    },
    {
        label: 'trigger_sprite_clicked',
        kind: 'Function',
        insertText: 'trigger_sprite_clicked()',
        detail: 'trigger_sprite_clicked()',
        doc: 'Trigger this-sprite-clicked hats and local handlers.'
    },
    {
        label: 'when_this_sprite_clicked',
        kind: 'Snippet',
        insertText:
            '@when_this_sprite_clicked\ndef ${1:on_sprite_clicked}():\n    ${2:pass}',
        detail: '@when_this_sprite_clicked',
        doc: 'Register local handler for sprite-click event.'
    },
    {
        label: 'trigger_stage_clicked',
        kind: 'Function',
        insertText: 'trigger_stage_clicked()',
        detail: 'trigger_stage_clicked()',
        doc: 'Trigger stage-clicked hats and local handlers.'
    },
    {
        label: 'when_stage_clicked',
        kind: 'Snippet',
        insertText:
            '@when_stage_clicked\ndef ${1:on_stage_clicked}():\n    ${2:pass}',
        detail: '@when_stage_clicked',
        doc: 'Register local handler for stage-click event.'
    },
    {
        label: 'trigger_backdrop_switch',
        kind: 'Function',
        insertText: 'trigger_backdrop_switch(${1:"backdrop1"})',
        detail: 'trigger_backdrop_switch(backdrop_name)',
        doc: 'Trigger backdrop-switched hats and local handlers.'
    },
    {
        label: 'when_backdrop_switches_to',
        kind: 'Snippet',
        insertText:
            '@when_backdrop_switches_to(${1:"backdrop1"})\ndef ${2:on_backdrop}():\n    ${3:pass}',
        detail: '@when_backdrop_switches_to(backdrop_name)',
        doc: 'Register local handler for backdrop-switch event.'
    },
    {
        label: 'create_clone',
        kind: 'Function',
        insertText: 'create_clone(${1:"_myself_"})',
        detail: "create_clone(clone_option='_myself_')",
        doc: 'Create clone of the selected sprite or named sprite.'
    },
    {
        label: 'delete_clone',
        kind: 'Function',
        insertText: 'delete_clone()',
        detail: 'delete_clone()',
        doc: 'Delete current clone (no-op for original sprite).'
    },
    {
        label: 'when_i_start_as_a_clone',
        kind: 'Snippet',
        insertText:
            '@when_i_start_as_a_clone\ndef ${1:on_clone_start}():\n    ${2:pass}',
        detail: '@when_i_start_as_a_clone',
        doc: 'Register local handler for clone-start event.'
    }
];

const NOMOPRO_EXTENSION_COMPLETIONS = [
    {
        label: 'pen_clear',
        kind: 'Function',
        insertText: 'pen_clear()',
        detail: 'pen_clear()',
        doc: 'Erase all pen trails and stamps.'
    },
    {
        label: 'pen_stamp',
        kind: 'Function',
        insertText: 'pen_stamp()',
        detail: 'pen_stamp()',
        doc: 'Stamp current sprite costume to pen layer.'
    },
    {
        label: 'pen_down',
        kind: 'Function',
        insertText: 'pen_down()',
        detail: 'pen_down()',
        doc: 'Start drawing with pen while sprite moves.'
    },
    {
        label: 'pen_up',
        kind: 'Function',
        insertText: 'pen_up()',
        detail: 'pen_up()',
        doc: 'Stop drawing with pen.'
    },
    {
        label: 'set_pen_color',
        kind: 'Function',
        insertText: 'set_pen_color(${1:"#00AAFF"})',
        detail: 'set_pen_color(color)',
        doc: 'Set pen color (hex or color value).'
    },
    {
        label: 'change_pen_color_param',
        kind: 'Function',
        insertText: 'change_pen_color_param(${1:"color"}, ${2:10})',
        detail: 'change_pen_color_param(param, value)',
        doc: 'Change pen color parameter by value.'
    },
    {
        label: 'set_pen_color_param',
        kind: 'Function',
        insertText: 'set_pen_color_param(${1:"brightness"}, ${2:50})',
        detail: 'set_pen_color_param(param, value)',
        doc: 'Set pen color parameter to value.'
    },
    {
        label: 'change_pen_size',
        kind: 'Function',
        insertText: 'change_pen_size(${1:1})',
        detail: 'change_pen_size(delta)',
        doc: 'Increase or decrease pen size.'
    },
    {
        label: 'set_pen_size',
        kind: 'Function',
        insertText: 'set_pen_size(${1:3})',
        detail: 'set_pen_size(size)',
        doc: 'Set pen size.'
    },
    {
        label: 'speak',
        kind: 'Function',
        insertText: 'speak(${1:"hello"})',
        detail: 'speak(text)',
        doc: 'Speak text using Text-to-Speech extension.'
    },
    {
        label: 'set_voice',
        kind: 'Function',
        insertText: 'set_voice(${1:"ALTO"})',
        detail: 'set_voice(voice)',
        doc: 'Set text-to-speech voice (e.g. ALTO, TENOR, SQUEAK, GIANT).'
    },
    {
        label: 'set_speech_language',
        kind: 'Function',
        insertText: 'set_speech_language(${1:"en"})',
        detail: 'set_speech_language(language)',
        doc: 'Set text-to-speech language code.'
    },
    {
        label: 'video_toggle',
        kind: 'Function',
        insertText: 'video_toggle(${1:"on"})',
        detail: "video_toggle(state='on')",
        doc: 'Control video sensing preview: on, off, or on-flipped.'
    },
    {
        label: 'set_video_transparency',
        kind: 'Function',
        insertText: 'set_video_transparency(${1:50})',
        detail: 'set_video_transparency(value)',
        doc: 'Set video preview transparency (0-100).'
    },
    {
        label: 'load_device',
        kind: 'Function',
        insertText: 'load_device(${1:"arduinoUno"}, ${2:""}, ${3:[]})',
        detail: "load_device(device_id, device_type='', pnpid_list=None)",
        doc: 'Load and connect a supported device profile.'
    },
    {
        label: 'clear_device',
        kind: 'Function',
        insertText: 'clear_device()',
        detail: 'clear_device()',
        doc: 'Disconnect and clear the currently active device.'
    },
    {
        label: 'pinMode',
        kind: 'Function',
        insertText: "pinMode(${1:device}, ${2:pin}, ${3:'OUTPUT'})",
        detail: 'pinMode(device, pin, mode)',
        doc: "Set pin mode. mode: 'OUTPUT', 'INPUT', or 'INPUT_PULLUP'."
    },
    {
        label: 'digitalWrite',
        kind: 'Function',
        insertText: 'digitalWrite(${1:device}, ${2:pin}, ${3:True})',
        detail: 'digitalWrite(device, pin, value)',
        doc: 'Write HIGH (True/1) or LOW (False/0) to a digital pin.'
    },
    {
        label: 'digitalRead',
        kind: 'Function',
        insertText: 'digitalRead(${1:device}, ${2:pin})',
        detail: 'digitalRead(device, pin) → int',
        doc: 'Read digital value (0 or 1) from a pin.'
    },
    {
        label: 'analogWrite',
        kind: 'Function',
        insertText: 'analogWrite(${1:device}, ${2:pin}, ${3:128})',
        detail: 'analogWrite(device, pin, value)',
        doc: 'Write PWM value (0–255) to a PWM-capable pin.'
    },
    {
        label: 'analogRead',
        kind: 'Function',
        insertText: 'analogRead(${1:device}, ${2:pin})',
        detail: 'analogRead(device, pin) → int',
        doc: 'Read analog value (0–1023) from an analog pin.'
    },
    {
        label: 'servoWrite',
        kind: 'Function',
        insertText: 'servoWrite(${1:device}, ${2:pin}, ${3:90})',
        detail: 'servoWrite(device, pin, angle)',
        doc: 'Set servo angle (0–180 degrees) on a pin.'
    },
    {
        label: 'serialPrint',
        kind: 'Function',
        insertText: 'serialPrint(${1:device}, ${2:value})',
        detail: 'serialPrint(device, value)',
        doc: 'Print a value to the serial monitor (no newline).'
    },
    {
        label: 'serialPrintln',
        kind: 'Function',
        insertText: 'serialPrintln(${1:device}, ${2:value})',
        detail: 'serialPrintln(device, value)',
        doc: 'Print a value followed by a newline to the serial monitor.'
    },
    {
        label: 'use',
        kind: 'Function',
        insertText: 'use(${1:device})',
        detail: 'use(device) → device',
        doc: 'Set the active device for module-level convenience functions.'
    }
];

// Device-specific constructor completions keyed by deviceId.
const DEVICE_CONSTRUCTORS = {
    arduinoUno: {
        label: 'arduinoUno',
        kind: 'Class',
        insertText: 'arduinoUno()',
        detail: 'arduinoUno() → ArduinoUno',
        doc: 'Create an Arduino Uno device instance for realtime control.'
    },
    arduinoNano: {
        label: 'arduinoNano',
        kind: 'Class',
        insertText: 'arduinoNano()',
        detail: 'arduinoNano() → ArduinoNano',
        doc: 'Create an Arduino Nano device instance for realtime control.'
    },
    arduinoNano2: {
        label: 'arduinoNano2',
        kind: 'Class',
        insertText: 'arduinoNano2()',
        detail: 'arduinoNano2() → ArduinoNano2',
        doc: 'Create an Arduino Nano 2 device instance for realtime control.'
    },
    arduinoEsp32: {
        label: 'arduinoEsp32',
        kind: 'Class',
        insertText: 'arduinoEsp32()',
        detail: 'arduinoEsp32() → ArduinoEsp32',
        doc: 'Create an ESP32 device instance for realtime control.'
    },
    arduinoEsp32Gbot: {
        label: 'arduinoEsp32Gbot',
        kind: 'Class',
        insertText: 'arduinoEsp32Gbot()',
        detail: 'arduinoEsp32Gbot() → GBotNomo',
        doc: 'Create a G-Bot Nomo (ESP32) device instance for realtime control.'
    },
    arduinoEsp32Nomobot: {
        label: 'arduinoEsp32Nomobot',
        kind: 'Class',
        insertText: 'arduinoEsp32Nomobot()',
        detail: 'arduinoEsp32Nomobot() → NomoBot',
        doc: 'Create a Nomobot (ESP32) device instance for realtime control.'
    },
    arduinoMega2560: {
        label: 'arduinoMega2560',
        kind: 'Class',
        insertText: 'arduinoMega2560()',
        detail: 'arduinoMega2560() → ArduinoMega2560',
        doc: 'Create an Arduino Mega 2560 device instance for realtime control.'
    },
    arduinoELFUno: {
        label: 'arduinoELFUno',
        kind: 'Class',
        insertText: 'arduinoELFUno()',
        detail: 'arduinoELFUno() → GBotNomo',
        doc: 'Create a G-Bot Nomo (ELF Uno) device instance for realtime control.'
    }
};

// Device instance methods shown after a dot (e.g. uno.).
const DEVICE_METHODS = [
    {
        label: 'pinMode',
        insertText: "pinMode(${1:pin}, ${2:'OUTPUT'})",
        detail: 'pinMode(pin, mode)',
        doc: "Set pin mode. mode: 'OUTPUT', 'INPUT', or 'INPUT_PULLUP'."
    },
    {
        label: 'digitalWrite',
        insertText: 'digitalWrite(${1:pin}, ${2:True})',
        detail: 'digitalWrite(pin, value)',
        doc: 'Write HIGH (True/1) or LOW (False/0) to a digital pin.'
    },
    {
        label: 'digitalRead',
        insertText: 'digitalRead(${1:pin})',
        detail: 'digitalRead(pin) → int',
        doc: 'Read digital value (0 or 1) from a pin.'
    },
    {
        label: 'analogRead',
        insertText: 'analogRead(${1:pin})',
        detail: 'analogRead(pin) → int',
        doc: 'Read analog value (0–1023) from an analog pin.'
    },
    {
        label: 'analogWrite',
        insertText: 'analogWrite(${1:pin}, ${2:128})',
        detail: 'analogWrite(pin, value)',
        doc: 'Write PWM value (0–255) to a PWM-capable pin.'
    },
    {
        label: 'delay',
        insertText: 'delay(${1:1000})',
        detail: 'delay(ms)',
        doc: 'Pause execution for the specified number of milliseconds.'
    },
    {
        label: 'millis',
        insertText: 'millis()',
        detail: 'millis() → int',
        doc: 'Return milliseconds elapsed since program start.'
    },
    {
        label: 'tone',
        insertText: 'tone(${1:pin}, ${2:440}, ${3:500})',
        detail: 'tone(pin, frequency, duration)',
        doc: 'Play a tone on a buzzer pin at the given frequency (Hz) for duration (ms).'
    },
    {
        label: 'noTone',
        insertText: 'noTone(${1:pin})',
        detail: 'noTone(pin)',
        doc: 'Stop tone playback on a pin.'
    },
    {
        label: 'servoWrite',
        insertText: 'servoWrite(${1:pin}, ${2:90})',
        detail: 'servoWrite(pin, angle)',
        doc: 'Set servo angle (0–180 degrees) on a pin.'
    },
    {
        label: 'serialPrint',
        insertText: 'serialPrint(${1:value})',
        detail: 'serialPrint(value)',
        doc: 'Print a value to the serial monitor (no newline).'
    },
    {
        label: 'serialPrintln',
        insertText: 'serialPrintln(${1:value})',
        detail: 'serialPrintln(value)',
        doc: 'Print a value followed by a newline to the serial monitor.'
    },
    {
        label: 'serialRead',
        insertText: 'serialRead()',
        detail: 'serialRead() → str',
        doc: 'Read a string from the serial input buffer.'
    },
    {
        label: 'serialAvailable',
        insertText: 'serialAvailable()',
        detail: 'serialAvailable() → int',
        doc: 'Return number of bytes available in the serial input buffer.'
    }
];

const kindMap = (kindStr, monaco) => {
    const k = monaco.languages.CompletionItemKind;
    const map = {
        Class: k.Class,
        Variable: k.Variable,
        Function: k.Function,
        Method: k.Method,
        Keyword: k.Keyword,
        Snippet: k.Snippet
    };
    return map[kindStr] || k.Text;
};

export const registerPythonCompletionProvider = (
    monaco,
    spriteNames,
    deviceId,
) => {
    // Re-register when sprite list or device changes
    if (disposable) {
        disposable.dispose();
        disposable = null;
    }

    const names = Array.isArray(spriteNames) ? spriteNames : [];
    const deviceConstructor =
        deviceId && DEVICE_CONSTRUCTORS[deviceId] ?
            DEVICE_CONSTRUCTORS[deviceId] :
            null;
    const SnippetRule =
        monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet;

    disposable = monaco.languages.registerCompletionItemProvider('python', {
        triggerCharacters: ['.', '(', "'", '"'],

        provideCompletionItems (model, position) {
            const word = model.getWordUntilPosition(position);
            const range = {
                startLineNumber: position.lineNumber,
                endLineNumber: position.lineNumber,
                startColumn: word.startColumn,
                endColumn: word.endColumn
            };

            const lineContent = model.getLineContent(position.lineNumber);
            const beforeCursor = lineContent.substring(0, position.column - 1);

            // --- Dot completions: sprite.| or device.| ---
            if (beforeCursor.endsWith('.')) {
                const spriteMethods = SPRITE_METHODS.map(m => ({
                    label: m.label,
                    kind: monaco.languages.CompletionItemKind.Method,
                    insertText: m.insertText,
                    insertTextRules: SnippetRule,
                    detail: m.detail,
                    documentation: m.doc,
                    range
                }));
                const deviceMethods = deviceConstructor ?
                    DEVICE_METHODS.map(m => ({
                        label: m.label,
                        kind: monaco.languages.CompletionItemKind.Method,
                        insertText: m.insertText,
                        insertTextRules: SnippetRule,
                        detail: m.detail,
                        documentation: m.doc,
                        range
                    })) :
                    [];
                return {suggestions: spriteMethods.concat(deviceMethods)};
            }

            // --- Sprite('| completions: suggest sprite names ---
            const spriteCtorMatch = beforeCursor.match(/Sprite\(['"]/);
            if (spriteCtorMatch && names.length > 0) {
                return {
                    suggestions: names.map(n => ({
                        label: n,
                        kind: monaco.languages.CompletionItemKind.Value,
                        insertText: n,
                        detail: `Sprite name: ${n}`,
                        range
                    }))
                };
            }

            // --- Top-level completions ---
            const baseItems = TOP_LEVEL_COMPLETIONS.concat(
                BASIC_PYTHON_COMPLETIONS,
                NOMOPRO_SENSING_COMPLETIONS,
                NOMOPRO_DATA_COMPLETIONS,
                NOMOPRO_EVENT_COMPLETIONS,
                NOMOPRO_EXTENSION_COMPLETIONS,
            );
            if (deviceConstructor) {
                baseItems.push(deviceConstructor);
            }
            const suggestions = baseItems.map(item => ({
                label: item.label,
                kind: kindMap(item.kind, monaco),
                insertText: item.insertText,
                insertTextRules: SnippetRule,
                detail: item.detail,
                documentation: item.doc,
                range
            }));

            return {suggestions};
        }
    });

    return disposable;
};
