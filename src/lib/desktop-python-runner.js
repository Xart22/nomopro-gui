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
        'import _thread as _threading',
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
        '',
        '# ---- Music ----',
        "def play_drum(drum, beats=0.25): emit('extMusicPlayDrumForBeats', drum, beats)",
        "def rest(beats=0.25): emit('extMusicRestForBeats', beats)",
        "def play_note(note, beats=0.25): emit('extMusicPlayNoteForBeats', note, beats)",
        "def set_instrument(inst=1): emit('extMusicSetInstrument', inst)",
        "def set_tempo(tempo=60): emit('extMusicSetTempo', tempo)",
        "def change_tempo(delta=20): emit('extMusicChangeTempo', delta)",
        "def get_tempo(): return _extension_rpc('extMusicGetTempo')",
        '',
        '# ---- Handpose ----',
        "def handpose_video(state='off'): emit('extHandposeVideoToggle', str(state))",
        "def handpose_set_transparency(v): emit('extHandposeSetVideoTransparency', v)",
        "def handpose_set_ratio(r): emit('extHandposeSetRatio', str(r))",
        "def handpose_get_x(lm='1'): return _extension_rpc('extHandposeGetX', [str(lm)])",
        "def handpose_get_y(lm='1'): return _extension_rpc('extHandposeGetY', [str(lm)])",
        "def handpose_get_z(lm='1'): return _extension_rpc('extHandposeGetZ', [str(lm)])",
        '',
        '# ---- Speech to Text ----',
        "def listen(): emit('extSpeechListenAndWait')",
        "def get_speech(): return _extension_rpc('extSpeechGetSpeech')",
        '',
        '# ---- Translate ----',
        "def translate_text(words, lang='en'): return _extension_rpc('extTranslateGetTranslate', [str(words), str(lang)])",
        "def get_viewer_language(): return _extension_rpc('extTranslateGetViewerLanguage')",
        '',
        '# ---- Object Detection ----',
        "def ob2_analyse(): emit('extOb2AnalyseImage')",
        "def ob2_video(state='on'): emit('extOb2VideoToggle', str(state))",
        "def ob2_show_bounding_boxes(show='show'): emit('extOb2ShowBoundingBoxes', str(show))",
        "def ob2_set_threshold(t=0.5): emit('extOb2SetDetectionThreshold', t)",
        "def ob2_get_counts(): return _extension_rpc('extOb2GetCounts')",
        "def ob2_is_detected(label='person'): return _extension_rpc('extOb2IsDetected', [str(label)])",
        "def ob2_get_count_of(label='person'): return _extension_rpc('extOb2GetCountOf', [str(label)])",
        "def ob2_get_objects(prop='label', idx=0): return _extension_rpc('extOb2GetObjects', [str(prop), idx])",
        '',
        '# ---- ML ----',
        "def ml_add_example1(): emit('extMlAddExample1')",
        "def ml_add_example2(): emit('extMlAddExample2')",
        "def ml_add_example3(): emit('extMlAddExample3')",
        "def ml_train(label='4'): emit('extMlTrain', str(label))",
        "def ml_train_any(label='11'): emit('extMlTrainAny', str(label))",
        "def ml_get_label(): return _extension_rpc('extMlGetLabel')",
        "def ml_get_count(label='11'): return _extension_rpc('extMlGetCountByLabel', [str(label)])",
        "def ml_reset(label='all'): emit('extMlReset', str(label))",
        "def ml_reset_any(label='11'): emit('extMlResetAny', str(label))",
        "def ml_download(): emit('extMlDownload')",
        "def ml_upload(): emit('extMlUpload')",
        "def ml_toggle(state='off'): emit('extMlToggleClassification', str(state))",
        "def ml_set_interval(interval='1'): emit('extMlSetClassificationInterval', str(interval))",
        "def ml_video(state='off'): emit('extMlVideoToggle', str(state))",
        "def ml_set_transparency(v): emit('extMlSetVideoTransparency', v)",
        "def ml_set_input(src='webcam'): emit('extMlSetInput', str(src))",
        '',
        '# ---- TM2Scratch ----',
        "def tm2_set_input(src='webcam'): emit('extTm2SetInput', str(src))",
        "def tm2_is_image_detected(label='any'): return _extension_rpc('extTm2IsImageLabelDetected', [str(label)])",
        "def tm2_image_confidence(label=''): return _extension_rpc('extTm2ImageLabelConfidence', [str(label)])",
        "def tm2_set_image_model(url): emit('extTm2SetImageClassificationModelURL', str(url))",
        "def tm2_classify_image(): emit('extTm2ClassifyVideoImage')",
        "def tm2_get_image_label(): return _extension_rpc('extTm2GetImageLabel')",
        "def tm2_is_sound_detected(label='any'): return _extension_rpc('extTm2IsSoundLabelDetected', [str(label)])",
        "def tm2_sound_confidence(label=''): return _extension_rpc('extTm2SoundLabelConfidence', [str(label)])",
        "def tm2_set_sound_model(url): emit('extTm2SetSoundClassificationModelURL', str(url))",
        "def tm2_get_sound_label(): return _extension_rpc('extTm2GetSoundLabel')",
        "def tm2_toggle(state='off'): emit('extTm2ToggleClassification', str(state))",
        "def tm2_set_interval(interval='1'): emit('extTm2SetClassificationInterval', str(interval))",
        "def tm2_set_threshold(t=0.5): emit('extTm2SetConfidenceThreshold', t)",
        "def tm2_get_threshold(): return _extension_rpc('extTm2GetConfidenceThreshold')",
        "def tm2_video(state='on'): emit('extTm2VideoToggle', str(state))",
        '',
        '# ---- TMPose2Scratch ----',
        "def tmpose_is_detected(label='any'): return _extension_rpc('extTmposeIsPoseLabelDetected', [str(label)])",
        "def tmpose_confidence(label=''): return _extension_rpc('extTmposePoseLabelConfidence', [str(label)])",
        "def tmpose_set_model(url): emit('extTmposeSetPoseClassificationModelURL', str(url))",
        "def tmpose_classify(): emit('extTmposeClassifyVideoPose')",
        "def tmpose_get_label(): return _extension_rpc('extTmposeGetPoseLabel')",
        "def tmpose_toggle(state='off'): emit('extTmposeToggleClassification', str(state))",
        "def tmpose_set_interval(interval='1'): emit('extTmposeSetClassificationInterval', str(interval))",
        "def tmpose_set_threshold(t=0.5): emit('extTmposeSetConfidenceThreshold', t)",
        "def tmpose_get_threshold(): return _extension_rpc('extTmposeGetConfidenceThreshold')",
        "def tmpose_video(state='off'): emit('extTmposeVideoToggle', str(state))",
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
        '    # Music',
        "    def playDrum(self, drum, beats): self._emit('extMusicPlayDrumForBeats', drum, beats)",
        "    def rest(self, beats): self._emit('extMusicRestForBeats', beats)",
        "    def playNote(self, note, beats): self._emit('extMusicPlayNoteForBeats', note, beats)",
        "    def setInstrument(self, inst): self._emit('extMusicSetInstrument', inst)",
        "    def setTempo(self, tempo): self._emit('extMusicSetTempo', tempo)",
        "    def changeTempo(self, delta): self._emit('extMusicChangeTempo', delta)",
        "    def getTempo(self): return _extension_rpc('extMusicGetTempo')",
        '',
        '    # Handpose',
        "    def handposeVideo(self, state='off'): self._emit('extHandposeVideoToggle', str(state))",
        "    def handposeSetTransparency(self, v): self._emit('extHandposeSetVideoTransparency', v)",
        "    def handposeSetRatio(self, r): self._emit('extHandposeSetRatio', str(r))",
        "    def handposeGetX(self, lm='1'): return _extension_rpc('extHandposeGetX', [str(lm)])",
        "    def handposeGetY(self, lm='1'): return _extension_rpc('extHandposeGetY', [str(lm)])",
        "    def handposeGetZ(self, lm='1'): return _extension_rpc('extHandposeGetZ', [str(lm)])",
        '',
        '    # Speech to Text',
        "    def listen(self): self._emit('extSpeechListenAndWait')",
        "    def getSpeech(self): return _extension_rpc('extSpeechGetSpeech')",
        '',
        '    # Translate',
        "    def translateText(self, words, lang): return _extension_rpc('extTranslateGetTranslate', [str(words), str(lang)])",
        "    def getViewerLanguage(self): return _extension_rpc('extTranslateGetViewerLanguage')",
        '',
        '    # Object Detection',
        "    def ob2Analyse(self): self._emit('extOb2AnalyseImage')",
        "    def ob2Video(self, state='on'): self._emit('extOb2VideoToggle', str(state))",
        "    def ob2ShowBoundingBoxes(self, show='show'): self._emit('extOb2ShowBoundingBoxes', str(show))",
        "    def ob2SetThreshold(self, t): self._emit('extOb2SetDetectionThreshold', t)",
        "    def ob2GetCounts(self): return _extension_rpc('extOb2GetCounts')",
        "    def ob2IsDetected(self, label='person'): return _extension_rpc('extOb2IsDetected', [str(label)])",
        "    def ob2GetCountOf(self, label='person'): return _extension_rpc('extOb2GetCountOf', [str(label)])",
        "    def ob2GetObjects(self, prop='label', idx=0): return _extension_rpc('extOb2GetObjects', [str(prop), idx])",
        '',
        '    # ML',
        "    def mlAddExample1(self): self._emit('extMlAddExample1')",
        "    def mlAddExample2(self): self._emit('extMlAddExample2')",
        "    def mlAddExample3(self): self._emit('extMlAddExample3')",
        "    def mlTrain(self, label='4'): self._emit('extMlTrain', str(label))",
        "    def mlTrainAny(self, label='11'): self._emit('extMlTrainAny', str(label))",
        "    def mlGetLabel(self): return _extension_rpc('extMlGetLabel')",
        "    def mlGetCount(self, label='11'): return _extension_rpc('extMlGetCountByLabel', [str(label)])",
        "    def mlReset(self, label='all'): self._emit('extMlReset', str(label))",
        "    def mlResetAny(self, label='11'): self._emit('extMlResetAny', str(label))",
        "    def mlDownload(self): self._emit('extMlDownload')",
        "    def mlUpload(self): self._emit('extMlUpload')",
        "    def mlToggle(self, state='off'): self._emit('extMlToggleClassification', str(state))",
        "    def mlSetInterval(self, interval='1'): self._emit('extMlSetClassificationInterval', str(interval))",
        "    def mlVideo(self, state='off'): self._emit('extMlVideoToggle', str(state))",
        "    def mlSetTransparency(self, v): self._emit('extMlSetVideoTransparency', v)",
        "    def mlSetInput(self, src='webcam'): self._emit('extMlSetInput', str(src))",
        '',
        '    # TM2Scratch',
        "    def tm2SetInput(self, src='webcam'): self._emit('extTm2SetInput', str(src))",
        "    def tm2IsImageDetected(self, label='any'): return _extension_rpc('extTm2IsImageLabelDetected', [str(label)])",
        "    def tm2ImageConfidence(self, label=''): return _extension_rpc('extTm2ImageLabelConfidence', [str(label)])",
        "    def tm2SetImageModel(self, url): self._emit('extTm2SetImageClassificationModelURL', str(url))",
        "    def tm2ClassifyImage(self): self._emit('extTm2ClassifyVideoImage')",
        "    def tm2GetImageLabel(self): return _extension_rpc('extTm2GetImageLabel')",
        "    def tm2IsSoundDetected(self, label='any'): return _extension_rpc('extTm2IsSoundLabelDetected', [str(label)])",
        "    def tm2SoundConfidence(self, label=''): return _extension_rpc('extTm2SoundLabelConfidence', [str(label)])",
        "    def tm2SetSoundModel(self, url): self._emit('extTm2SetSoundClassificationModelURL', str(url))",
        "    def tm2GetSoundLabel(self): return _extension_rpc('extTm2GetSoundLabel')",
        "    def tm2Toggle(self, state='off'): self._emit('extTm2ToggleClassification', str(state))",
        "    def tm2SetInterval(self, interval='1'): self._emit('extTm2SetClassificationInterval', str(interval))",
        "    def tm2SetThreshold(self, t): self._emit('extTm2SetConfidenceThreshold', t)",
        "    def tm2GetThreshold(self): return _extension_rpc('extTm2GetConfidenceThreshold')",
        "    def tm2Video(self, state='on'): self._emit('extTm2VideoToggle', str(state))",
        '',
        '    # TMPose2Scratch',
        "    def tmposeIsDetected(self, label='any'): return _extension_rpc('extTmposeIsPoseLabelDetected', [str(label)])",
        "    def tmposeConfidence(self, label=''): return _extension_rpc('extTmposePoseLabelConfidence', [str(label)])",
        "    def tmposeSetModel(self, url): self._emit('extTmposeSetPoseClassificationModelURL', str(url))",
        "    def tmposeClassify(self): self._emit('extTmposeClassifyVideoPose')",
        "    def tmposeGetLabel(self): return _extension_rpc('extTmposeGetPoseLabel')",
        "    def tmposeToggle(self, state='off'): self._emit('extTmposeToggleClassification', str(state))",
        "    def tmposeSetInterval(self, interval='1'): self._emit('extTmposeSetClassificationInterval', str(interval))",
        "    def tmposeSetThreshold(self, t): self._emit('extTmposeSetConfidenceThreshold', t)",
        "    def tmposeGetThreshold(self): return _extension_rpc('extTmposeGetConfidenceThreshold')",
        "    def tmposeVideo(self, state='off'): self._emit('extTmposeVideoToggle', str(state))",
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
        "''",
        '# ---- Extension RPC ----',
        '_extension_rpc_counter = 0',
        'def _extension_emit(cmd, args=None, request_id=None):',
        '    if args is None: args = []',
        "    payload = {'cmd': cmd, 'args': args}",
        '    if request_id is not None:',
        "        payload['_requestId'] = request_id",
        '    sys.stdout.write(json.dumps(payload) + chr(10))',
        '    sys.stdout.flush()',
        'def _extension_rpc(ext_cmd, args=None):',
        '    global _extension_rpc_counter',
        '    if args is None: args = []',
        '    _extension_rpc_counter += 1',
        '    request_id = _extension_rpc_counter',
        '    _extension_emit(ext_cmd, args, request_id)',
        '    result_container = [None]',
        '    done_event = _threading.Event()',
        '    def _read_stdin():',
        '        try:',
        '            line = sys.stdin.readline()',
        '            if line:',
        '                result_container[0] = json.loads(line.strip())',
        '        except Exception:',
        '            pass',
        '        done_event.set()',
        '    t = _threading.Thread(target=_read_stdin, daemon=True)',
        '    t.start()',
        '    done_event.wait(timeout=5.0)',
        '    if result_container[0]:',
        '        result = result_container[0]',
        "        if result.get('_requestId') == request_id:",
        "            return result.get('value')",
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
        "    'play_drum', 'rest', 'play_note', 'set_instrument',",
        "    'set_tempo', 'change_tempo', 'get_tempo',",
        "    'handpose_video', 'handpose_set_transparency', 'handpose_set_ratio',",
        "    'handpose_get_x', 'handpose_get_y', 'handpose_get_z',",
        "    'listen', 'get_speech',",
        "    'translate_text', 'get_viewer_language',",
        "    'ob2_analyse', 'ob2_video', 'ob2_show_bounding_boxes',",
        "    'ob2_set_threshold', 'ob2_get_counts', 'ob2_is_detected',",
        "    'ob2_get_count_of', 'ob2_get_objects',",
        "    'ml_add_example1', 'ml_add_example2', 'ml_add_example3',",
        "    'ml_train', 'ml_train_any', 'ml_get_label',",
        "    'ml_get_count', 'ml_reset', 'ml_reset_any',",
        "    'ml_download', 'ml_upload', 'ml_toggle',",
        "    'ml_set_interval', 'ml_video', 'ml_set_transparency', 'ml_set_input',",
        "    'tm2_set_input', 'tm2_is_image_detected', 'tm2_image_confidence',",
        "    'tm2_set_image_model', 'tm2_classify_image', 'tm2_get_image_label',",
        "    'tm2_is_sound_detected', 'tm2_sound_confidence',",
        "    'tm2_set_sound_model', 'tm2_get_sound_label',",
        "    'tm2_toggle', 'tm2_set_interval', 'tm2_set_threshold',",
        "    'tm2_get_threshold', 'tm2_video',",
        "    'tmpose_is_detected', 'tmpose_confidence',",
        "    'tmpose_set_model', 'tmpose_classify', 'tmpose_get_label',",
        "    'tmpose_toggle', 'tmpose_set_interval', 'tmpose_set_threshold',",
        "    'tmpose_get_threshold', 'tmpose_video',",
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
        const getRequestId = command => {
            if (typeof command._requestId !== 'undefined') return command._requestId;
            if (Array.isArray(command.args) && command.args.length >= 3) {
                return command.args[command.args.length - 1];
            }
            return null;
        };

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
                        // Commands with _requestId need result written back to Python stdin.
                        // Serialized through _deviceRpcQueue to preserve order.
                        if (options.onDeviceRpcResponse) {
                            const requestId = getRequestId(command);
                            if (requestId !== null) {
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
