import {parseNdjsonCommandLine} from './ndjson-command-parser';

const normalizeText = value =>
    (typeof value === 'string' ? value : String(value || ''));

const getDesktopBridge = () => {
    if (typeof window === 'undefined') return null;
    if (window.nomoproDesktopPython) return window.nomoproDesktopPython;
    if (window.desktopPython) return window.desktopPython;
    return null;
};

const getNodeRequire = () => {
    if (typeof window === 'undefined') return null;
    if (typeof window.require === 'function') {
        return window.require;
    }
    return null;
};

const getPreludeLineCount = () => {
    const prelude = buildRuntimePrelude('');
    return prelude.split('\n').length - 1;
};

const adjustPythonErrorLines = (text, preludeCount) => {
    if (!text || !preludeCount) return text;
    return text.replace(/(line\s+)(\d+)/gi, (match, prefix, lineNum) => {
        const adjusted = Math.max(1, parseInt(lineNum, 10) - preludeCount);
        return `${prefix}${adjusted}`;
    });
};

const buildRuntimePrelude = userCode => {
    const script = normalizeText(userCode);
    return [
        'import builtins',
        'import json',
        'import math',
        'import random as _random',
        'import sys',
        'import time',
        'import types',
        'try:',
        '    import numpy as np',
        'except ImportError:',
        '    np = None',
        '',
        'class NumpyEncoder(json.JSONEncoder):',
        '    def default(self, obj):',
        '        if np is not None:',
        '            if isinstance(obj, (np.integer,)):',
        '                return int(obj)',
        '            if isinstance(obj, (np.floating,)):',
        '                return float(obj)',
        '            if isinstance(obj, (np.ndarray,)):',
        '                return obj.tolist()',
        '            if isinstance(obj, (np.bool_,)):',
        '                return bool(obj)',
        '        return super().default(obj)',
        '',
        '_ob_print = builtins.print',
        '_timer_started_at = time.monotonic()',
        "answer = ''",
        '_variables = {}',
        '_lists = {}',
        '_broadcast_handlers = {}',
        '_clone_handlers = []',
        "_event_handlers = {'green_flag': [], 'key_pressed': {},",
        "    'sprite_clicked': [], 'stage_clicked': [], 'backdrop_switched': {}}",
        '',
        'def _ob_emit(payload):',
        '    _ob_print(json.dumps(payload, ensure_ascii=False, cls=NumpyEncoder), flush=True)',
        '',
        'def print(*args, **kwargs):',
        '    converted = []',
        '    for arg in args:',
        "        if isinstance(arg, dict) and ('cmd' in arg or 'action' in arg):",
        '            converted.append(json.dumps(arg, ensure_ascii=False, cls=NumpyEncoder))',
        '        else:',
        '            converted.append(arg)',
        "    kwargs.setdefault('flush', True)",
        '    _ob_print(*converted, **kwargs)',
        '',
        'def emit(cmd, *args, **kwargs):',
        '    if kwargs:',
        "        payload = {'action': cmd}",
        '        payload.update(kwargs)',
        '        _ob_emit(payload)',
        '        return',
        "    _ob_emit({'cmd': cmd, 'args': list(args)})",
        '',
        'def select_target(target_id=None, target_name=None):',
        "    payload = {'cmd': 'selectTarget', 'args': []}",
        '    if target_id is not None:',
        "        payload['targetId'] = target_id",
        '    if target_name is not None:',
        "        payload['targetName'] = target_name",
        '    _ob_emit(payload)',
        '',
        "_state = {'x': 0.0, 'y': 0.0, 'direction': 90.0, 'size': 100.0, 'visible': True}",
        '',
        'def _move_state(value):',
        "    radians = math.radians(90 - float(_state['direction']))",
        "    _state['x'] += float(value) * math.cos(radians)",
        "    _state['y'] += float(value) * math.sin(radians)",
        "def move(value): _move_state(value); emit('move', value)",
        "def goto(x, y): emit('gotoXY', x, y)",
        "def go_to_xy(x, y): _state.update({'x': float(x), 'y': float(y)}); emit('gotoXY', x, y)",
        'def go_to(target_name): select_target(target_name=target_name)',
        "def set_x(value): _state['x'] = float(value); emit('setX', value)",
        "def set_y(value): _state['y'] = float(value); emit('setY', value)",
        "def change_x(value): _state['x'] += float(value); emit('changeX', value)",
        "def change_y(value): _state['y'] += float(value); emit('changeY', value)",
        "def turn_right(value): _state['direction'] += float(value); emit('turn', value)",
        "def turn_left(value): _state['direction'] -= float(value); emit('turn', -value)",
        "def point(direction): _state['direction'] = float(direction); emit('point', direction)",
        'def point_direction(direction): point(direction)',
        'def point_in_direction(direction): point(direction)',
        "def x_position(): return _state['x']",
        "def y_position(): return _state['y']",
        "def direction(): return _state['direction']",
        "def say(text, seconds=None): emit('say', text); wait(seconds) if seconds is not None else None",
        'def say_for_seconds(text, seconds): say(text, seconds)',
        "def think(text, seconds=None): emit('think', text); wait(seconds) if seconds is not None else None",
        'def think_for_seconds(text, seconds): think(text, seconds)',
        "def show(): _state['visible'] = True; emit('show')",
        "def hide(): _state['visible'] = False; emit('hide')",
        "def switch_costume(name): emit('setCostume', name)",
        'def set_costume(name): switch_costume(name)',
        "def switch_backdrop_to(name): emit('setBackdrop', name)",
        'def set_backdrop(name): switch_backdrop_to(name)',
        "def next_costume(): emit('nextCostume')",
        "def next_backdrop(): emit('nextBackdrop')",
        "def set_size(value): _state['size'] = float(value); emit('setSize', value)",
        "def change_size(value): _state['size'] += float(value); emit('changeSize', value)",
        "def play_sound(name): emit('playSound', name)",
        'def playSound(name): play_sound(name)',
        "def play_sound_until_done(name): emit('playSound', name)",
        "def if_on_edge_bounce(): emit('ifOnEdgeBounce')",
        'def bounce_on_edge(): if_on_edge_bounce()',
        "def set_effect(effect, value): emit('setEffect', effect=effect, value=value)",
        "def change_effect(effect, value): emit('changeEffect', effect=effect, value=value)",
        "def clear_effects(): emit('clearEffects')",
        "def pen_clear(): emit('penClear')",
        "def pen_stamp(): emit('penStamp')",
        "def pen_down(*_args, **_kwargs): emit('penDown')",
        "def pen_up(*_args, **_kwargs): emit('penUp')",
        "def set_pen_color(color): emit('setPenColor', str(color))",
        'def change_pen_color_param(param, value):',
        "    emit('changePenColorParam', str(param), value)",
        'def set_pen_color_param(param, value):',
        "    emit('setPenColorParam', str(param), value)",
        "def change_pen_size(delta): emit('changePenSize', delta)",
        "def set_pen_size(size): emit('setPenSize', size)",
        "def speak(text): emit('speakAndWait', str(text))",
        "def set_voice(voice): emit('setVoice', str(voice))",
        "def set_speech_language(language): emit('setSpeechLanguage', str(language))",
        "def video_toggle(state='on'): emit('videoToggle', str(state))",
        "def set_video_transparency(value): emit('setVideoTransparency', value)",
        "def load_device(device_id, device_type='', pnpid_list=None):",
        '    if pnpid_list is None: pnpid_list = []',
        "    emit('loadDevice', str(device_id), str(device_type), pnpid_list)",
        "def clear_device(): emit('clearDevice')",
        'def stop_all_sounds(): return None',
        'def set_volume(_value): return None',
        "def wait(seconds): emit('wait', seconds)",
        'def wait_until(_condition): return None',
        'def stop(_option): raise SystemExit()',
        "def create_clone(option='_myself_'):",
        "    payload = {'cmd': 'createClone', 'args': [str(option)]}",
        '    if sprite._name is not None:',
        "        payload['targetName'] = sprite._name",
        '    _ob_emit(payload)',
        '    _dispatch_local_clone_start()',
        'def delete_clone():',
        "    payload = {'cmd': 'deleteClone', 'args': []}",
        '    if sprite._name is not None:',
        "        payload['targetName'] = sprite._name",
        '    _ob_emit(payload)',
        'def when_i_start_as_a_clone(handler):',
        '    _clone_handlers.append(handler)',
        '    return handler',
        'def _dispatch_local_clone_start():',
        '    for handler in _clone_handlers: handler()',
        'def ask(_question):',
        '    global answer',
        "    answer = ''",
        '    return answer',
        'def touching(_target): return False',
        'def touching_color(_color): return False',
        'def key_pressed(_key): return False',
        'def mouse_down(): return False',
        'def mouse_x(): return 0',
        'def mouse_y(): return 0',
        'def timer(): return time.monotonic() - _timer_started_at',
        'def reset_timer():',
        '    global _timer_started_at',
        '    _timer_started_at = time.monotonic()',
        'def random(start, end): return _random.uniform(float(start), float(end))',
        'def show_variable(_name): return None',
        'def hide_variable(_name): return None',
        'def when_green_flag_clicked(handler):',
        "    _event_handlers['green_flag'].append(handler)",
        '    return handler',
        'def when_key_pressed(key):',
        '    def _decorator(handler):',
        '        k = str(key).lower()',
        "        if k not in _event_handlers['key_pressed']:",
        "            _event_handlers['key_pressed'][k] = []",
        "        _event_handlers['key_pressed'][k].append(handler)",
        '        return handler',
        '    return _decorator',
        'def when_this_sprite_clicked(handler):',
        "    _event_handlers['sprite_clicked'].append(handler)",
        '    return handler',
        'def when_stage_clicked(handler):',
        "    _event_handlers['stage_clicked'].append(handler)",
        '    return handler',
        'def when_backdrop_switches_to(backdrop_name):',
        '    def _decorator(handler):',
        '        key = str(backdrop_name)',
        "        if key not in _event_handlers['backdrop_switched']:",
        "            _event_handlers['backdrop_switched'][key] = []",
        "        _event_handlers['backdrop_switched'][key].append(handler)",
        '        return handler',
        '    return _decorator',
        'def _dispatch_local_event(event_name, value=None):',
        "    if event_name == 'green_flag':",
        "        for h in _event_handlers['green_flag']: h()",
        '        return',
        "    if event_name == 'key_pressed':",
        '        key = str(value).lower()',
        "        for h in _event_handlers['key_pressed'].get(key, []): h()",
        "        for h in _event_handlers['key_pressed'].get('any', []): h()",
        '        return',
        "    if event_name == 'sprite_clicked':",
        "        for h in _event_handlers['sprite_clicked']: h()",
        '        return',
        "    if event_name == 'stage_clicked':",
        "        for h in _event_handlers['stage_clicked']: h()",
        '        return',
        "    if event_name == 'backdrop_switched':",
        '        key = str(value)',
        "        for h in _event_handlers['backdrop_switched'].get(key, []): h()",
        '        return',
        'def when_i_receive(message):',
        '    def _decorator(handler):',
        '        key = str(message)',
        '        if key not in _broadcast_handlers: _broadcast_handlers[key] = []',
        '        _broadcast_handlers[key].append(handler)',
        '        return handler',
        '    return _decorator',
        'def _dispatch_local_broadcast(message):',
        '    key = str(message)',
        '    handlers = _broadcast_handlers.get(key, [])',
        '    for handler in handlers: handler()',
        'def broadcast(message):',
        "    emit('broadcast', str(message))",
        '    _dispatch_local_broadcast(message)',
        'def broadcast_and_wait(message):',
        "    emit('broadcastAndWait', str(message))",
        '    _dispatch_local_broadcast(message)',
        'def green_flag():',
        "    emit('greenFlag')",
        "    _dispatch_local_event('green_flag')",
        'def trigger_key_pressed(key):',
        "    emit('triggerKeyPressed', str(key))",
        "    _dispatch_local_event('key_pressed', key)",
        'def trigger_sprite_clicked():',
        "    emit('triggerSpriteClicked')",
        "    _dispatch_local_event('sprite_clicked')",
        'def trigger_stage_clicked():',
        "    emit('triggerStageClicked')",
        "    _dispatch_local_event('stage_clicked')",
        'def trigger_backdrop_switch(backdrop_name):',
        "    emit('triggerBackdropSwitch', str(backdrop_name))",
        "    _dispatch_local_event('backdrop_switched', backdrop_name)",
        'def variable(name, default=0):',
        '    if name not in _variables: _variables[name] = default',
        '    return _variables[name]',
        'def set_variable(name, value): _variables[name] = value; return value',
        'def change_variable_by(name, delta):',
        '    current = float(_variables.get(name, 0))',
        '    next_value = current + float(delta)',
        '    _variables[name] = next_value',
        '    return next_value',
        'def list_value(name):',
        '    if name not in _lists: _lists[name] = []',
        '    return _lists[name]',
        'def add_to_list(item, list_name): list_value(list_name).append(item)',
        'def delete_of_list(index, list_name):',
        '    items = list_value(list_name)',
        '    idx = int(index) - 1',
        '    if 0 <= idx < len(items): del items[idx]',
        'def delete_all_of_list(list_name): _lists[list_name] = []',
        'def insert_at_list(item, index, list_name):',
        '    items = list_value(list_name)',
        '    idx = max(0, int(index) - 1)',
        '    if idx > len(items): idx = len(items)',
        '    items.insert(idx, item)',
        'def replace_item_of_list(index, list_name, item):',
        '    items = list_value(list_name)',
        '    idx = int(index) - 1',
        '    if 0 <= idx < len(items): items[idx] = item',
        'def item_of_list(index, list_name):',
        '    items = list_value(list_name)',
        '    idx = int(index) - 1',
        '    if 0 <= idx < len(items): return items[idx]',
        '    return None',
        'def length_of_list(list_name): return len(list_value(list_name))',
        'def list_contains_item(list_name, item): return item in list_value(list_name)',
        '',
        'class Sprite:',
        '    def __init__(self, name=None):',
        '        self._name = name',
        '    def _emit(self, cmd, *args):',
        "        payload = {'cmd': cmd, 'args': list(args)}",
        '        if self._name is not None:',
        "            payload['targetName'] = self._name",
        '        _ob_emit(payload)',
        "    def move(self, value): _move_state(value); self._emit('move', value)",
        "    def turn(self, value): self._emit('turn', value)",
        "    def point(self, direction): self._emit('point', direction)",
        "    def gotoXY(self, x, y): self._emit('gotoXY', x, y)",
        "    def setX(self, value): self._emit('setX', value)",
        "    def setY(self, value): self._emit('setY', value)",
        "    def changeX(self, value): self._emit('changeX', value)",
        "    def changeY(self, value): self._emit('changeY', value)",
        "    def ifOnEdgeBounce(self): self._emit('ifOnEdgeBounce')",
        "    def say(self, text): self._emit('say', text)",
        "    def think(self, text): self._emit('think', text)",
        "    def setCostume(self, name): self._emit('setCostume', name)",
        "    def setBackdrop(self, name): self._emit('setBackdrop', name)",
        "    def nextCostume(self): self._emit('nextCostume')",
        "    def nextBackdrop(self): self._emit('nextBackdrop')",
        "    def show(self): self._emit('show')",
        "    def hide(self): self._emit('hide')",
        "    def setSize(self, value): self._emit('setSize', value)",
        "    def changeSize(self, value): self._emit('changeSize', value)",
        "    def playSound(self, name): self._emit('playSound', name)",
        "    def setEffect(self, effect, value): self._emit('setEffect', str(effect), value)",
        "    def changeEffect(self, effect, value): self._emit('changeEffect', str(effect), value)",
        "    def clearEffects(self): self._emit('clearEffects')",
        "    def wait(self, seconds): self._emit('wait', seconds)",
        "    def penClear(self): self._emit('penClear')",
        "    def penStamp(self): self._emit('penStamp')",
        "    def penDown(self): self._emit('penDown')",
        "    def penUp(self): self._emit('penUp')",
        '    def pen_down(self, *_args, **_kwargs): self.penDown()',
        '    def pen_up(self, *_args, **_kwargs): self.penUp()',
        "    def setPenColor(self, color): self._emit('setPenColor', str(color))",
        '    def changePenColorParam(self, param, value):',
        "        self._emit('changePenColorParam', str(param), value)",
        '    def setPenColorParam(self, param, value):',
        "        self._emit('setPenColorParam', str(param), value)",
        "    def changePenSize(self, delta): self._emit('changePenSize', delta)",
        "    def setPenSize(self, size): self._emit('setPenSize', size)",
        "    def speak(self, text): self._emit('speakAndWait', str(text))",
        "    def setVoice(self, voice): self._emit('setVoice', str(voice))",
        "    def videoToggle(self, state='on'): self._emit('videoToggle', str(state))",
        '    def setVideoTransparency(self, value):',
        "        self._emit('setVideoTransparency', value)",
        '',
        'sprite = Sprite()',
        'stage = Sprite()',

        '# ---- Device Realtime Control ----',
        '_device_rpc_counter = 0',
        'def _device_emit(device_id, cmd, args=None):',
        '    if args is None: args = []',
        "    payload = {'cmd': cmd, 'args': args}",
        '    sys.stdout.write(json.dumps(payload) + chr(10))',
        '    sys.stdout.flush()',
        'def _device_rpc(device_id, cmd, args=None):',
        '    global _device_rpc_counter',
        '    if args is None: args = []',
        '    _device_rpc_counter += 1',
        '    request_id = _device_rpc_counter',
        '    _device_emit(device_id, cmd, args + [request_id])',
        '    try:',
        '        line = sys.stdin.readline()',
        '        if line:',
        '            result = json.loads(line.strip())',
        "            if result.get('_requestId') == request_id:",
        "                return result.get('value')",
        '    except Exception:',
        '        pass',
        '    return None',
        'class ArduinoDevice:',
        '    """Base class for controlling Arduino-compatible boards via Firmata in realtime mode."""',
        "    def __init__(self, device_id, device_type='arduino', pnpid_list=None):",
        '        self._device_id = device_id',
        '        self._device_type = device_type',
        '        if pnpid_list is None: pnpid_list = []',
        "        _device_emit(device_id, 'loadDevice', [device_id, device_type, pnpid_list])",
        '    def pinMode(self, pin, mode):',
        "        _device_emit(self._device_id, 'devicePinMode', [self._device_id, pin, mode])",
        '    def digitalWrite(self, pin, value):',
        "        _device_emit(self._device_id, 'deviceDigitalWrite', [self._device_id, pin, bool(value)])",
        '    def digitalRead(self, pin):',
        "        return _device_rpc(self._device_id, 'deviceDigitalRead', [self._device_id, pin])",
        '    def analogWrite(self, pin, value):',
        "        _device_emit(self._device_id, 'deviceAnalogWrite', [self._device_id, pin, int(value)])",
        '    def analogRead(self, pin):',
        "        return _device_rpc(self._device_id, 'deviceAnalogRead', [self._device_id, pin])",
        '    def servoWrite(self, pin, angle):',
        "        _device_emit(self._device_id, 'deviceServoWrite', [self._device_id, pin, int(angle)])",
        '    def serialPrint(self, text):',
        "        _device_emit(self._device_id, 'deviceSerialWrite', [self._device_id, str(text)])",
        '    def serialPrintln(self, text):',
        "        _device_emit(self._device_id, 'deviceSerialWriteLn', [self._device_id, str(text)])",
        '',
        "def arduinoUno(): return ArduinoDevice('arduinoUno', 'arduino')",
        "def arduinoNano(): return ArduinoDevice('arduinoNano', 'arduino')",
        "def arduinoNano2(): return ArduinoDevice('arduinoNano2', 'arduino')",
        "def arduinoEsp32(): return ArduinoDevice('arduinoEsp32', 'arduino')",
        "def arduinoEsp32Gbot(): return ArduinoDevice('arduinoEsp32Gbot', 'arduino')",
        "def arduinoEsp32Nomobot(): return ArduinoDevice('arduinoEsp32Nomobot', 'arduino')",
        "def arduinoMega2560(): return ArduinoDevice('arduinoMega2560', 'arduino')",
        "def arduinoELFUno(): return ArduinoDevice('arduinoELFUno', 'arduino')",
        '',
        '_current_device = None',
        'def use(device):',
        '    global _current_device',
        '    _current_device = device',
        'def pinMode(pin, mode):',
        '    if _current_device is not None: _current_device.pinMode(pin, mode)',
        'def digitalWrite(pin, value):',
        '    if _current_device is not None: _current_device.digitalWrite(pin, value)',
        'def digitalRead(pin):',
        '    if _current_device is not None: return _current_device.digitalRead(pin)',
        '    return None',
        'def analogWrite(pin, value):',
        '    if _current_device is not None: _current_device.analogWrite(pin, value)',
        'def analogRead(pin):',
        '    if _current_device is not None: return _current_device.analogRead(pin)',
        '    return None',
        'def servoWrite(pin, angle):',
        '    if _current_device is not None: _current_device.servoWrite(pin, angle)',
        'def serialPrint(text):',
        '    if _current_device is not None: _current_device.serialPrint(text)',
        'def serialPrintln(text):',
        '    if _current_device is not None: _current_device.serialPrintln(text)',

        "nomoproSDKPython = types.ModuleType('nomoproSDKPython')",
        'nomoproSDKPython.sprite = sprite',
        'nomoproSDKPython.stage = stage',
        'for _name in [',
        "    'answer', 'select_target', 'move', 'goto', 'go_to_xy', 'go_to',",
        "    'set_x', 'set_y', 'change_x', 'change_y', 'turn_right', 'turn_left',",
        "    'point', 'point_direction', 'point_in_direction',",
        "    'x_position', 'y_position', 'direction',",
        "    'say', 'say_for_seconds', 'think', 'think_for_seconds', 'show', 'hide',",
        "    'switch_costume', 'set_costume', 'switch_backdrop_to', 'set_backdrop',",
        "    'next_costume', 'next_backdrop',",
        "    'set_size', 'change_size', 'play_sound', 'playSound',",
        "    'play_sound_until_done', 'if_on_edge_bounce', 'set_effect', 'change_effect', 'clear_effects',",
        "    'pen_clear', 'pen_stamp', 'pen_down', 'pen_up',",
        "    'set_pen_color', 'change_pen_color_param', 'set_pen_color_param',",
        "    'change_pen_size', 'set_pen_size',",
        "    'speak', 'set_voice', 'set_speech_language',",
        "    'video_toggle', 'set_video_transparency',",
        "    'load_device', 'clear_device',",
        "    'bounce_on_edge',",
        "    'change_effect', 'clear_effects', 'stop_all_sounds', 'set_volume', 'wait', 'wait_until',",
        "    'stop', 'create_clone', 'delete_clone', 'when_i_start_as_a_clone',",
        "    'ask', 'touching',",
        "    'touching_color', 'key_pressed', 'mouse_down', 'mouse_x', 'mouse_y',",
        "    'timer', 'reset_timer', 'random', 'show_variable', 'hide_variable',",
        "    'when_i_receive', 'broadcast', 'broadcast_and_wait',",
        "    'when_green_flag_clicked', 'when_key_pressed',",
        "    'when_this_sprite_clicked', 'when_stage_clicked',",
        "    'when_backdrop_switches_to',",
        "    'green_flag', 'trigger_key_pressed', 'trigger_sprite_clicked',",
        "    'trigger_stage_clicked', 'trigger_backdrop_switch',",
        "    'variable', 'set_variable', 'change_variable_by', 'list_value',",
        "    'add_to_list', 'delete_of_list', 'delete_all_of_list', 'insert_at_list',",
        "    'replace_item_of_list', 'item_of_list', 'length_of_list',",
        "    'list_contains_item',",
        "    'use', 'pinMode', 'digitalWrite', 'digitalRead',",
        "    'analogWrite', 'analogRead', 'servoWrite',",
        "    'serialPrint', 'serialPrintln',",
        "    'arduinoUno', 'arduinoNano', 'arduinoNano2', 'arduinoEsp32',",
        "    'arduinoEsp32Gbot', 'arduinoEsp32Nomobot', 'arduinoMega2560', 'arduinoELFUno'",
        ']:',
        '    setattr(nomoproSDKPython, _name, globals()[_name])',
        'nomoproSDKPython.Sprite = Sprite',
        'nomoproSDKPython.ArduinoDevice = ArduinoDevice',
        "sys.modules['nomoproSDKPython'] = nomoproSDKPython",
        '',
        '# ---- user code starts here ----',
        script
    ].join('\n');
};

const createProcessRunner = options => {
    const nodeRequire = getNodeRequire();
    if (!nodeRequire) {
        throw new Error('Node integration is unavailable in renderer process.');
    }

    const childProcess = nodeRequire('child_process');
    const processModule = nodeRequire('process');

    const pythonCandidates =
        options.pythonCandidates ||
        (processModule.platform === 'win32' ?
            ['python', 'py'] :
            ['python3', 'python']);

    let currentProcess = null;
    let stdoutBuffer = '';
    let _deviceRpcQueue = Promise.resolve();

    const writeStdin = data => {
        if (currentProcess && currentProcess.stdin && currentProcess.stdin.writable) {
            currentProcess.stdin.write(`${data}\n`);
        }
    };

    const kill = () => {
        if (currentProcess && !currentProcess.killed) {
            currentProcess.kill();
        }
    };

    const startWithCommand = (
        pythonCommand,
        script,
        preludeCount,
        resolve,
        reject,
        nextTry,
    ) => {
        const args =
            pythonCommand === 'py' ?
                ['-3', '-u', '-c', script] :
                ['-u', '-c', script];

        const proc = childProcess.spawn(pythonCommand, args, {
            windowsHide: true,
            stdio: ['pipe', 'pipe', 'pipe']
        });
        currentProcess = proc;

        let stdout = '';
        let stderr = '';
        const commands = [];
        const DEVICE_READ_COMMANDS = ['deviceDigitalRead', 'deviceAnalogRead'];

        proc.stdout.on('data', async chunk => {
            const text = normalizeText(chunk);
            stdout += text;
            stdoutBuffer += text;

            const lines = stdoutBuffer.split(/\r?\n/);
            stdoutBuffer = lines.pop() || '';

            for (const line of lines) {
                const parsed = parseNdjsonCommandLine(line);
                if (parsed.length) {
                    for (const command of parsed) {
                        commands.push(command);
                        if (options.onCommand) {
                            await options.onCommand(command);
                            // Yield to event loop so WebSocket messages can be processed
                            await new Promise(r => setImmediate(r));
                        }
                        // Device read commands need result written back to Python stdin.
                        // Serialized through _deviceRpcQueue to preserve order.
                        if (DEVICE_READ_COMMANDS.includes(command.cmd) && options.onDeviceRpcResponse) {
                            const requestId = Array.isArray(command.args) && command.args[2];
                            if (requestId) {
                                _deviceRpcQueue = _deviceRpcQueue.then(async () => {
                                    try {
                                        const value = await options.onDeviceRpcResponse(requestId);
                                        writeStdin(JSON.stringify({_requestId: requestId, value}));
                                    } catch (e) {
                                        writeStdin(JSON.stringify({_requestId: requestId, error: e.message}));
                                    }
                                });
                            }
                        }
                    }
                }
                if (options.onStdoutLine) {
                    options.onStdoutLine(line);
                }
            }
        });
        proc.stderr.on('data', chunk => {
            const text = normalizeText(chunk);
            const adjusted = adjustPythonErrorLines(text, preludeCount);
            stderr += adjusted;
            if (options.onStderr) {
                options.onStderr(adjusted);
            }
        });

        proc.on('error', error => {
            if (error && error.code === 'ENOENT' && nextTry) {
                nextTry();
                return;
            }
            reject(error);
        });

        proc.on('close', (exitCode, signal) => {
            if (stdoutBuffer) {
                if (options.onStdoutLine) {
                    options.onStdoutLine(stdoutBuffer);
                }
                const parsed = parseNdjsonCommandLine(stdoutBuffer);
                if (parsed.length) {
                    commands.push(...parsed);
                    if (options.onCommand) {
                        parsed.forEach(command => options.onCommand(command));
                    }
                }
                stdoutBuffer = '';
            }

            resolve({
                exitCode,
                signal,
                stdout,
                stderr: adjustPythonErrorLines(stderr, preludeCount),
                commands
            });
        });
    };

    const run = script =>
        new Promise((resolve, reject) => {
            let index = 0;
            const preludeCount = getPreludeLineCount();
            const tryNext = () => {
                const candidate = pythonCandidates[index++];
                if (!candidate) {
                    reject(
                        new Error(
                            `Python executable not found. Tried: ${pythonCandidates.join(
                                ', ',
                            )}`,
                        ),
                    );
                    return;
                }
                startWithCommand(candidate, script, preludeCount, resolve, reject, tryNext);
            };
            tryNext();
        });

    return {
        run,
        stop: kill,
        writeStdin
    };
};

export const createDesktopPythonRunner = (options = {}) => {
    // Prefer direct spawn path when Node integration is available:
    // it provides full stdio pipe support (stdin for device RPC reads,
    // stdout/stderr for streaming command processing).
    const nodeRequire = getNodeRequire();
    if (nodeRequire) {
        const processRunner = createProcessRunner(options);
        return {
            isAvailable: () => true,
            stop: () => processRunner.stop(),
            writeStdin: data => processRunner.writeStdin(data),
            run: async userCode => {
                const script = buildRuntimePrelude(userCode);
                return processRunner.run(script);
            }
        };
    }

    const desktopBridge = getDesktopBridge();

    if (desktopBridge && typeof desktopBridge.runPythonCode === 'function') {
        return {
            isAvailable: () => true,
            stop: () => {
                if (typeof desktopBridge.stopPythonCode === 'function') {
                    desktopBridge.stopPythonCode();
                }
            },
            run: async code => {
                const script = buildRuntimePrelude(code);
                const preludeCount = getPreludeLineCount();
                const result = await desktopBridge.runPythonCode(script);
                const commands = Array.isArray(result.commands) ?
                    result.commands :
                    [];
                if (options.onCommand && commands.length > 0) {
                    commands.forEach(cmd => options.onCommand(cmd));
                }
                return {
                    exitCode: result.exitCode,
                    signal: result.signal || null,
                    stdout: result.stdout || '',
                    stderr: adjustPythonErrorLines(result.stderr || '', preludeCount),
                    commands
                };
            }
        };
    }

    return {
        isAvailable: () => false,
        stop: () => {},
        run: async () => {
            throw new Error(
                'Desktop Python runner is unavailable. Expose a preload bridge or enable Node integration in Electron.',
            );
        }
    };
};
