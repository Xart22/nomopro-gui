import json
import math
import random as _random
import sys
import threading as _threading
import time

try:
    import numpy as np
except ImportError:
    np = None


class NumpyEncoder(json.JSONEncoder):
    def default(self, obj):
        if np is not None:
            if isinstance(obj, (np.integer,)):
                return int(obj)
            if isinstance(obj, (np.floating,)):
                return float(obj)
            if isinstance(obj, (np.ndarray,)):
                return obj.tolist()
            if isinstance(obj, (np.bool_,)):
                return bool(obj)
        return super().default(obj)


def _json_dumps(obj, **kwargs):
    return json.dumps(obj, cls=NumpyEncoder, ensure_ascii=False, **kwargs)


__all__ = [
    "NumpyEncoder",
    "Sprite",
    "select_target",
    "move",
    "turn_right",
    "turn_left",
    "go_to_xy",
    "set_x",
    "set_y",
    "change_x",
    "change_y",
    "point_direction",
    "point_in_direction",
    "go_to",
    "x_position",
    "y_position",
    "direction",
    "if_on_edge_bounce",
    "bounce_on_edge",
    "say",
    "say_for_seconds",
    "think",
    "think_for_seconds",
    "set_effect",
    "change_effect",
    "clear_effects",
    "pen_clear",
    "pen_stamp",
    "pen_down",
    "pen_up",
    "set_pen_color",
    "change_pen_color_param",
    "set_pen_color_param",
    "change_pen_size",
    "set_pen_size",
    "speak",
    "set_voice",
    "set_speech_language",
    "video_toggle",
    "set_video_transparency",
    "play_drum",
    "rest",
    "play_note",
    "set_instrument",
    "set_tempo",
    "change_tempo",
    "get_tempo",
    "handpose_video",
    "handpose_set_transparency",
    "handpose_set_ratio",
    "handpose_get_x",
    "handpose_get_y",
    "handpose_get_z",
    "listen",
    "get_speech",
    "translate_text",
    "get_viewer_language",
    "ob2_analyse",
    "ob2_video",
    "ob2_show_bounding_boxes",
    "ob2_set_threshold",
    "ob2_get_counts",
    "ob2_is_detected",
    "ob2_get_count_of",
    "ob2_get_objects",
    "ml_add_example1",
    "ml_add_example2",
    "ml_add_example3",
    "ml_train",
    "ml_train_any",
    "ml_get_label",
    "ml_get_count",
    "ml_reset",
    "ml_reset_any",
    "ml_download",
    "ml_upload",
    "ml_toggle",
    "ml_set_interval",
    "ml_video",
    "ml_set_transparency",
    "ml_set_input",
    "tm2_set_input",
    "tm2_is_image_detected",
    "tm2_image_confidence",
    "tm2_set_image_model",
    "tm2_classify_image",
    "tm2_get_image_label",
    "tm2_is_sound_detected",
    "tm2_sound_confidence",
    "tm2_set_sound_model",
    "tm2_get_sound_label",
    "tm2_toggle",
    "tm2_set_interval",
    "tm2_set_threshold",
    "tm2_get_threshold",
    "tm2_video",
    "tmpose_is_detected",
    "tmpose_confidence",
    "tmpose_set_model",
    "tmpose_classify",
    "tmpose_get_label",
    "tmpose_toggle",
    "tmpose_set_interval",
    "tmpose_set_threshold",
    "tmpose_get_threshold",
    "tmpose_video",
    "load_device",
    "clear_device",
    "ArduinoDevice",
    "arduinoUno",
    "arduinoNano",
    "arduinoEsp32",
    "arduinoEsp32Gbot",
    "arduinoEsp32Nomobot",
    "arduinoMega2560",
    "arduinoELFUno",
    "use",
    "pinMode",
    "digitalWrite",
    "digitalRead",
    "analogWrite",
    "analogRead",
    "servoWrite",
    "serialPrint",
    "serialPrintln",
    "show",
    "hide",
    "switch_costume",
    "set_costume",
    "switch_backdrop_to",
    "set_backdrop",
    "next_costume",
    "next_backdrop",
    "set_size",
    "change_size",
    "play_sound",
    "playSound",
    "play_sound_until_done",
    "stop_all_sounds",
    "set_volume",
    "wait",
    "wait_until",
    "stop",
    "create_clone",
    "delete_clone",
    "when_i_start_as_a_clone",
    "ask",
    "touching",
    "touching_color",
    "key_pressed",
    "mouse_down",
    "mouse_x",
    "mouse_y",
    "timer",
    "reset_timer",
    "random",
    "show_variable",
    "hide_variable",
    "when_green_flag_clicked",
    "when_key_pressed",
    "when_this_sprite_clicked",
    "when_stage_clicked",
    "when_backdrop_switches_to",
    "when_i_receive",
    "broadcast",
    "broadcast_and_wait",
    "green_flag",
    "trigger_key_pressed",
    "trigger_sprite_clicked",
    "trigger_stage_clicked",
    "trigger_backdrop_switch",
    "variable",
    "set_variable",
    "change_variable_by",
    "list_value",
    "add_to_list",
    "delete_of_list",
    "delete_all_of_list",
    "insert_at_list",
    "replace_item_of_list",
    "item_of_list",
    "length_of_list",
    "list_contains_item",
    "answer",
]

_timer_started_at = time.monotonic()
answer = ""
_variables = {}
_lists = {}
_broadcast_handlers = {}
_event_handlers = {
    "green_flag": [],
    "key_pressed": {},
    "sprite_clicked": [],
    "stage_clicked": [],
    "backdrop_switched": {},
}
_clone_handlers = []


class Sprite:
    def __init__(self, name=None):
        self._x = 0
        self._y = 0
        self._direction = 90
        self._size = 100
        self._visible = True
        self._name = name

    def _emit(self, cmd, args=None):
        if args is None:
            args = []
        payload = {"cmd": cmd, "args": args}
        if self._name is not None:
            payload["targetName"] = self._name
        sys.stdout.write(_json_dumps(payload) + "\n")
        sys.stdout.flush()

    def selectTarget(self, target_id=None, target_name=None):
        payload = {"cmd": "selectTarget", "args": []}
        if target_id is not None:
            payload["targetId"] = target_id
        if target_name is not None:
            payload["targetName"] = target_name
        sys.stdout.write(_json_dumps(payload) + "\n")
        sys.stdout.flush()

    def move(self, steps):
        radians = math.radians(90 - float(self._direction))
        self._x += float(steps) * math.cos(radians)
        self._y += float(steps) * math.sin(radians)
        self._emit("move", [steps])

    def turn(self, degrees):
        self._direction += float(degrees)
        self._emit("turn", [degrees])

    def point(self, direction):
        self._direction = float(direction)
        self._emit("point", [direction])

    def pointDirection(self, direction):
        self.point(direction)

    def say(self, text, sec=None):
        self._emit("say", [text])
        if sec is not None:
            self.wait(sec)

    def think(self, text, sec=None):
        self._emit("think", [text])
        if sec is not None:
            self.wait(sec)

    def gotoXY(self, x, y):
        self._x = float(x)
        self._y = float(y)
        self._emit("gotoXY", [x, y])

    def go_to_xy(self, x, y):
        self.gotoXY(x, y)

    def goToXY(self, x, y):
        self.gotoXY(x, y)

    def setX(self, x):
        self._x = float(x)
        self._emit("setX", [x])

    def setY(self, y):
        self._y = float(y)
        self._emit("setY", [y])

    def changeX(self, dx):
        self._x += float(dx)
        self._emit("changeX", [dx])

    def changeY(self, dy):
        self._y += float(dy)
        self._emit("changeY", [dy])

    def ifOnEdgeBounce(self):
        self._emit("ifOnEdgeBounce", [])

    def setCostume(self, name):
        self._emit("setCostume", [name])

    def setBackdrop(self, name):
        self._emit("setBackdrop", [name])

    def nextCostume(self):
        self._emit("nextCostume", [])

    def nextBackdrop(self):
        self._emit("nextBackdrop", [])

    def show(self):
        self._visible = True
        self._emit("show", [])

    def hide(self):
        self._visible = False
        self._emit("hide", [])

    def setSize(self, size):
        self._size = float(size)
        self._emit("setSize", [size])

    def changeSize(self, delta):
        self._size += float(delta)
        self._emit("changeSize", [delta])

    def playSound(self, name):
        self._emit("playSound", [name])

    def setEffect(self, effect, value):
        self._emit("setEffect", [str(effect), value])

    def changeEffect(self, effect, value):
        self._emit("changeEffect", [str(effect), value])

    def clearEffects(self):
        self._emit("clearEffects", [])

    def wait(self, sec):
        self._emit("wait", [sec])

    def penClear(self):
        self._emit("penClear", [])

    def penStamp(self):
        self._emit("penStamp", [])

    def penDown(self):
        self._emit("penDown", [])

    def penUp(self):
        self._emit("penUp", [])

    # Python-friendly snake_case aliases for pen APIs.
    def pen_down(self, *_args, **_kwargs):
        self.penDown()

    def pen_up(self, *_args, **_kwargs):
        self.penUp()

    def setPenColor(self, color):
        self._emit("setPenColor", [str(color)])

    def set_pen_color(self, color):
        self.setPenColor(color)

    def changePenColorParam(self, param, value):
        self._emit("changePenColorParam", [str(param), value])

    def change_pen_color_param(self, param, value):
        self.changePenColorParam(param, value)

    def setPenColorParam(self, param, value):
        self._emit("setPenColorParam", [str(param), value])

    def set_pen_color_param(self, param, value):
        self.setPenColorParam(param, value)

    def changePenSize(self, delta):
        self._emit("changePenSize", [delta])

    def change_pen_size(self, delta):
        self.changePenSize(delta)

    def setPenSize(self, size):
        self._emit("setPenSize", [size])

    def set_pen_size(self, size):
        self.setPenSize(size)

    def speak(self, text):
        self._emit("speakAndWait", [str(text)])

    def setVoice(self, voice):
        self._emit("setVoice", [str(voice)])

    def videoToggle(self, state="on"):
        self._emit("videoToggle", [str(state)])

    def setVideoTransparency(self, value):
        self._emit("setVideoTransparency", [value])

    # Music
    def playDrum(self, drum, beats):
        self._emit("extMusicPlayDrumForBeats", [drum, beats])

    def rest(self, beats):
        self._emit("extMusicRestForBeats", [beats])

    def playNote(self, note, beats):
        self._emit("extMusicPlayNoteForBeats", [note, beats])

    def setInstrument(self, instrument):
        self._emit("extMusicSetInstrument", [instrument])

    def setTempo(self, tempo):
        self._emit("extMusicSetTempo", [tempo])

    def changeTempo(self, delta):
        self._emit("extMusicChangeTempo", [delta])

    def getTempo(self):
        return _extension_rpc("extMusicGetTempo")

    # Handpose
    def handposeVideo(self, state="off"):
        self._emit("extHandposeVideoToggle", [str(state)])

    def handposeSetTransparency(self, value):
        self._emit("extHandposeSetVideoTransparency", [value])

    def handposeSetRatio(self, ratio):
        self._emit("extHandposeSetRatio", [str(ratio)])

    def handposeGetX(self, landmark="1"):
        return _extension_rpc("extHandposeGetX", [str(landmark)])

    def handposeGetY(self, landmark="1"):
        return _extension_rpc("extHandposeGetY", [str(landmark)])

    def handposeGetZ(self, landmark="1"):
        return _extension_rpc("extHandposeGetZ", [str(landmark)])

    # Speech to Text
    def listen(self):
        self._emit("extSpeechListenAndWait")

    def getSpeech(self):
        return _extension_rpc("extSpeechGetSpeech")

    # Translate
    def translateText(self, words, language):
        return _extension_rpc("extTranslateGetTranslate", [str(words), str(language)])

    def getViewerLanguage(self):
        return _extension_rpc("extTranslateGetViewerLanguage")

    # Object Detection
    def ob2Analyse(self):
        self._emit("extOb2AnalyseImage")

    def ob2Video(self, state="on"):
        self._emit("extOb2VideoToggle", [str(state)])

    def ob2ShowBoundingBoxes(self, show="show"):
        self._emit("extOb2ShowBoundingBoxes", [str(show)])

    def ob2SetThreshold(self, threshold):
        self._emit("extOb2SetDetectionThreshold", [threshold])

    def ob2GetCounts(self):
        return _extension_rpc("extOb2GetCounts")

    def ob2IsDetected(self, label="person"):
        return _extension_rpc("extOb2IsDetected", [str(label)])

    def ob2GetCountOf(self, label="person"):
        return _extension_rpc("extOb2GetCountOf", [str(label)])

    def ob2GetObjects(self, prop="label", index=0):
        return _extension_rpc("extOb2GetObjects", [str(prop), index])

    # ML
    def mlAddExample1(self):
        self._emit("extMlAddExample1")

    def mlAddExample2(self):
        self._emit("extMlAddExample2")

    def mlAddExample3(self):
        self._emit("extMlAddExample3")

    def mlTrain(self, label="4"):
        self._emit("extMlTrain", [str(label)])

    def mlTrainAny(self, label="11"):
        self._emit("extMlTrainAny", [str(label)])

    def mlGetLabel(self):
        return _extension_rpc("extMlGetLabel")

    def mlGetCount(self, label="11"):
        return _extension_rpc("extMlGetCountByLabel", [str(label)])

    def mlReset(self, label="all"):
        self._emit("extMlReset", [str(label)])

    def mlResetAny(self, label="11"):
        self._emit("extMlResetAny", [str(label)])

    def mlDownload(self):
        self._emit("extMlDownload")

    def mlUpload(self):
        self._emit("extMlUpload")

    def mlToggle(self, state="off"):
        self._emit("extMlToggleClassification", [str(state)])

    def mlSetInterval(self, interval="1"):
        self._emit("extMlSetClassificationInterval", [str(interval)])

    def mlVideo(self, state="off"):
        self._emit("extMlVideoToggle", [str(state)])

    def mlSetTransparency(self, value):
        self._emit("extMlSetVideoTransparency", [value])

    def mlSetInput(self, input_src="webcam"):
        self._emit("extMlSetInput", [str(input_src)])

    # TM2Scratch
    def tm2SetInput(self, input_src="webcam"):
        self._emit("extTm2SetInput", [str(input_src)])

    def tm2IsImageDetected(self, label="any"):
        return _extension_rpc("extTm2IsImageLabelDetected", [str(label)])

    def tm2ImageConfidence(self, label=""):
        return _extension_rpc("extTm2ImageLabelConfidence", [str(label)])

    def tm2SetImageModel(self, url):
        self._emit("extTm2SetImageClassificationModelURL", [str(url)])

    def tm2ClassifyImage(self):
        self._emit("extTm2ClassifyVideoImage")

    def tm2GetImageLabel(self):
        return _extension_rpc("extTm2GetImageLabel")

    def tm2IsSoundDetected(self, label="any"):
        return _extension_rpc("extTm2IsSoundLabelDetected", [str(label)])

    def tm2SoundConfidence(self, label=""):
        return _extension_rpc("extTm2SoundLabelConfidence", [str(label)])

    def tm2SetSoundModel(self, url):
        self._emit("extTm2SetSoundClassificationModelURL", [str(url)])

    def tm2GetSoundLabel(self):
        return _extension_rpc("extTm2GetSoundLabel")

    def tm2Toggle(self, state="off"):
        self._emit("extTm2ToggleClassification", [str(state)])

    def tm2SetInterval(self, interval="1"):
        self._emit("extTm2SetClassificationInterval", [str(interval)])

    def tm2SetThreshold(self, threshold):
        self._emit("extTm2SetConfidenceThreshold", [threshold])

    def tm2GetThreshold(self):
        return _extension_rpc("extTm2GetConfidenceThreshold")

    def tm2Video(self, state="on"):
        self._emit("extTm2VideoToggle", [str(state)])

    # TMPose2Scratch
    def tmposeIsDetected(self, label="any"):
        return _extension_rpc("extTmposeIsPoseLabelDetected", [str(label)])

    def tmposeConfidence(self, label=""):
        return _extension_rpc("extTmposePoseLabelConfidence", [str(label)])

    def tmposeSetModel(self, url):
        self._emit("extTmposeSetPoseClassificationModelURL", [str(url)])

    def tmposeClassify(self):
        self._emit("extTmposeClassifyVideoPose")

    def tmposeGetLabel(self):
        return _extension_rpc("extTmposeGetPoseLabel")

    def tmposeToggle(self, state="off"):
        self._emit("extTmposeToggleClassification", [str(state)])

    def tmposeSetInterval(self, interval="1"):
        self._emit("extTmposeSetClassificationInterval", [str(interval)])

    def tmposeSetThreshold(self, threshold):
        self._emit("extTmposeSetConfidenceThreshold", [threshold])

    def tmposeGetThreshold(self):
        return _extension_rpc("extTmposeGetConfidenceThreshold")

    def tmposeVideo(self, state="off"):
        self._emit("extTmposeVideoToggle", [str(state)])


sprite = Sprite()
stage = Sprite()


def select_target(target_id=None, target_name=None):
    sprite.selectTarget(target_id=target_id, target_name=target_name)


def move(steps):
    sprite.move(steps)


def turn_right(degrees):
    sprite.turn(degrees)


def turn_left(degrees):
    sprite.turn(-degrees)


def go_to_xy(x, y):
    sprite.gotoXY(x, y)


def set_x(x):
    sprite.setX(x)


def set_y(y):
    sprite.setY(y)


def change_x(dx):
    sprite.changeX(dx)


def change_y(dy):
    sprite.changeY(dy)


def point_direction(direction):
    sprite.point(direction)


def point_in_direction(direction):
    sprite.point(direction)


def go_to(target_name):
    select_target(target_name=target_name)


def x_position():
    return sprite._x


def y_position():
    return sprite._y


def direction():
    return sprite._direction


def if_on_edge_bounce():
    sprite.ifOnEdgeBounce()


def bounce_on_edge():
    sprite.ifOnEdgeBounce()


def say(text, sec=None):
    sprite.say(text, sec)


def say_for_seconds(text, sec):
    sprite.say(text, sec)


def think(text, sec=None):
    sprite.think(text, sec)


def think_for_seconds(text, sec):
    sprite.think(text, sec)


def set_effect(effect, value):
    sprite.setEffect(effect, value)


def change_effect(effect, value):
    sprite.changeEffect(effect, value)


def clear_effects():
    sprite.clearEffects()


def pen_clear():
    payload = {"cmd": "penClear", "args": []}
    sys.stdout.write(_json_dumps(payload) + "\n")
    sys.stdout.flush()


def pen_stamp():
    payload = {"cmd": "penStamp", "args": []}
    if sprite._name is not None:
        payload["targetName"] = sprite._name
    sys.stdout.write(_json_dumps(payload) + "\n")
    sys.stdout.flush()


def pen_down(*_args, **_kwargs):
    payload = {"cmd": "penDown", "args": []}
    if sprite._name is not None:
        payload["targetName"] = sprite._name
    sys.stdout.write(_json_dumps(payload) + "\n")
    sys.stdout.flush()


def pen_up(*_args, **_kwargs):
    payload = {"cmd": "penUp", "args": []}
    if sprite._name is not None:
        payload["targetName"] = sprite._name
    sys.stdout.write(_json_dumps(payload) + "\n")
    sys.stdout.flush()


def set_pen_color(color):
    payload = {"cmd": "setPenColor", "args": [str(color)]}
    if sprite._name is not None:
        payload["targetName"] = sprite._name
    sys.stdout.write(_json_dumps(payload) + "\n")
    sys.stdout.flush()


def change_pen_color_param(param, value):
    payload = {"cmd": "changePenColorParam", "args": [str(param), value]}
    if sprite._name is not None:
        payload["targetName"] = sprite._name
    sys.stdout.write(_json_dumps(payload) + "\n")
    sys.stdout.flush()


def set_pen_color_param(param, value):
    payload = {"cmd": "setPenColorParam", "args": [str(param), value]}
    if sprite._name is not None:
        payload["targetName"] = sprite._name
    sys.stdout.write(_json_dumps(payload) + "\n")
    sys.stdout.flush()


def change_pen_size(delta):
    payload = {"cmd": "changePenSize", "args": [delta]}
    if sprite._name is not None:
        payload["targetName"] = sprite._name
    sys.stdout.write(_json_dumps(payload) + "\n")
    sys.stdout.flush()


def set_pen_size(size):
    payload = {"cmd": "setPenSize", "args": [size]}
    if sprite._name is not None:
        payload["targetName"] = sprite._name
    sys.stdout.write(_json_dumps(payload) + "\n")
    sys.stdout.flush()


def speak(text):
    payload = {"cmd": "speakAndWait", "args": [str(text)]}
    if sprite._name is not None:
        payload["targetName"] = sprite._name
    sys.stdout.write(_json_dumps(payload) + "\n")
    sys.stdout.flush()


def set_voice(voice):
    payload = {"cmd": "setVoice", "args": [str(voice)]}
    if sprite._name is not None:
        payload["targetName"] = sprite._name
    sys.stdout.write(_json_dumps(payload) + "\n")
    sys.stdout.flush()


def set_speech_language(language):
    payload = {"cmd": "setSpeechLanguage", "args": [str(language)]}
    sys.stdout.write(_json_dumps(payload) + "\n")
    sys.stdout.flush()


def video_toggle(state="on"):
    payload = {"cmd": "videoToggle", "args": [str(state)]}
    sys.stdout.write(_json_dumps(payload) + "\n")
    sys.stdout.flush()


def set_video_transparency(value):
    payload = {"cmd": "setVideoTransparency", "args": [value]}
    sys.stdout.write(_json_dumps(payload) + "\n")
    sys.stdout.flush()


# ─── Music Extension ─────────────────────────────────────────────────────────


def play_drum(drum, beats=0.25):
    sprite.playDrum(drum, beats)


def rest(beats=0.25):
    sprite.rest(beats)


def play_note(note, beats=0.25):
    sprite.playNote(note, beats)


def set_instrument(instrument=1):
    sprite.setInstrument(instrument)


def set_tempo(tempo=60):
    sprite.setTempo(tempo)


def change_tempo(delta=20):
    sprite.changeTempo(delta)


def get_tempo():
    return sprite.getTempo()


# ─── Handpose Extension ──────────────────────────────────────────────────────


def handpose_video(state="off"):
    sprite.handposeVideo(state)


def handpose_set_transparency(value):
    sprite.handposeSetTransparency(value)


def handpose_set_ratio(ratio):
    sprite.handposeSetRatio(ratio)


def handpose_get_x(landmark="1"):
    return sprite.handposeGetX(landmark)


def handpose_get_y(landmark="1"):
    return sprite.handposeGetY(landmark)


def handpose_get_z(landmark="1"):
    return sprite.handposeGetZ(landmark)


# ─── Speech to Text Extension ────────────────────────────────────────────────


def listen():
    sprite.listen()


def get_speech():
    return sprite.getSpeech()


# ─── Translate Extension ─────────────────────────────────────────────────────


def translate_text(words, language="en"):
    return sprite.translateText(words, language)


def get_viewer_language():
    return sprite.getViewerLanguage()


# ─── Object Detection Extension ──────────────────────────────────────────────


def ob2_analyse():
    sprite.ob2Analyse()


def ob2_video(state="on"):
    sprite.ob2Video(state)


def ob2_show_bounding_boxes(show="show"):
    sprite.ob2ShowBoundingBoxes(show)


def ob2_set_threshold(threshold=0.5):
    sprite.ob2SetThreshold(threshold)


def ob2_get_counts():
    return sprite.ob2GetCounts()


def ob2_is_detected(label="person"):
    return sprite.ob2IsDetected(label)


def ob2_get_count_of(label="person"):
    return sprite.ob2GetCountOf(label)


def ob2_get_objects(prop="label", index=0):
    return sprite.ob2GetObjects(prop, index)


# ─── ML Extension ────────────────────────────────────────────────────────────


def ml_add_example1():
    sprite.mlAddExample1()


def ml_add_example2():
    sprite.mlAddExample2()


def ml_add_example3():
    sprite.mlAddExample3()


def ml_train(label="4"):
    sprite.mlTrain(label)


def ml_train_any(label="11"):
    sprite.mlTrainAny(label)


def ml_get_label():
    return sprite.mlGetLabel()


def ml_get_count(label="11"):
    return sprite.mlGetCount(label)


def ml_reset(label="all"):
    sprite.mlReset(label)


def ml_reset_any(label="11"):
    sprite.mlResetAny(label)


def ml_download():
    sprite.mlDownload()


def ml_upload():
    sprite.mlUpload()


def ml_toggle(state="off"):
    sprite.mlToggle(state)


def ml_set_interval(interval="1"):
    sprite.mlSetInterval(interval)


def ml_video(state="off"):
    sprite.mlVideo(state)


def ml_set_transparency(value):
    sprite.mlSetTransparency(value)


def ml_set_input(input_src="webcam"):
    sprite.mlSetInput(input_src)


# ─── TM2Scratch Extension ────────────────────────────────────────────────────


def tm2_set_input(input_src="webcam"):
    sprite.tm2SetInput(input_src)


def tm2_is_image_detected(label="any"):
    return sprite.tm2IsImageDetected(label)


def tm2_image_confidence(label=""):
    return sprite.tm2ImageConfidence(label)


def tm2_set_image_model(url):
    sprite.tm2SetImageModel(url)


def tm2_classify_image():
    sprite.tm2ClassifyImage()


def tm2_get_image_label():
    return sprite.tm2GetImageLabel()


def tm2_is_sound_detected(label="any"):
    return sprite.tm2IsSoundDetected(label)


def tm2_sound_confidence(label=""):
    return sprite.tm2SoundConfidence(label)


def tm2_set_sound_model(url):
    sprite.tm2SetSoundModel(url)


def tm2_get_sound_label():
    return sprite.tm2GetSoundLabel()


def tm2_toggle(state="off"):
    sprite.tm2Toggle(state)


def tm2_set_interval(interval="1"):
    sprite.tm2SetInterval(interval)


def tm2_set_threshold(threshold=0.5):
    sprite.tm2SetThreshold(threshold)


def tm2_get_threshold():
    return sprite.tm2GetThreshold()


def tm2_video(state="on"):
    sprite.tm2Video(state)


# ─── TMPose2Scratch Extension ────────────────────────────────────────────────


def tmpose_is_detected(label="any"):
    return sprite.tmposeIsDetected(label)


def tmpose_confidence(label=""):
    return sprite.tmposeConfidence(label)


def tmpose_set_model(url):
    sprite.tmposeSetModel(url)


def tmpose_classify():
    sprite.tmposeClassify()


def tmpose_get_label():
    return sprite.tmposeGetLabel()


def tmpose_toggle(state="off"):
    sprite.tmposeToggle(state)


def tmpose_set_interval(interval="1"):
    sprite.tmposeSetInterval(interval)


def tmpose_set_threshold(threshold=0.5):
    sprite.tmposeSetThreshold(threshold)


def tmpose_get_threshold():
    return sprite.tmposeGetThreshold()


def tmpose_video(state="off"):
    sprite.tmposeVideo(state)


def load_device(device_id, device_type="", pnpid_list=None):
    if pnpid_list is None:
        pnpid_list = []
    payload = {
        "cmd": "loadDevice",
        "args": [str(device_id), str(device_type), pnpid_list],
    }
    sys.stdout.write(_json_dumps(payload) + "\n")
    sys.stdout.flush()


def clear_device():
    payload = {"cmd": "clearDevice", "args": []}
    sys.stdout.write(_json_dumps(payload) + "\n")
    sys.stdout.flush()


# ─── Device Realtime Control ──────────────────────────────────────────────────

_device_rpc_counter = 0


def _device_emit(device_id, cmd, args=None):
    if args is None:
        args = []
    payload = {"cmd": cmd, "args": args}
    sys.stdout.write(_json_dumps(payload) + "\n")
    sys.stdout.flush()


def _device_rpc(device_id, cmd, args=None):
    """Send a read command and wait for the result via stdin (desktop only).
    On web (Pyodide), stdin is unavailable and this returns None.
    Falls back after 5s timeout if no response is received.
    """
    global _device_rpc_counter
    if args is None:
        args = []
    _device_rpc_counter += 1
    request_id = _device_rpc_counter
    _device_emit(device_id, cmd, args + [request_id])

    result_container = [None]
    done_event = _threading.Event()

    def _read_stdin():
        try:
            line = sys.stdin.readline()
            if line:
                result_container[0] = json.loads(line.strip())
        except Exception:
            pass
        done_event.set()

    t = _threading.Thread(target=_read_stdin, daemon=True)
    t.start()
    done_event.wait(timeout=5.0)

    if result_container[0]:
        result = result_container[0]
        if result.get("_requestId") == request_id:
            return result.get("value")
    return None


# ─── Extension RPC (for REPORTER-type extension opcodes) ─────────────────────

_extension_rpc_counter = 0


def _extension_emit(cmd, args=None, request_id=None):
    if args is None:
        args = []
    payload = {"cmd": cmd, "args": args}
    if request_id is not None:
        payload["_requestId"] = request_id
    sys.stdout.write(_json_dumps(payload) + "\n")
    sys.stdout.flush()


def _extension_rpc(ext_cmd, args=None):
    global _extension_rpc_counter
    if args is None:
        args = []
    _extension_rpc_counter += 1
    request_id = _extension_rpc_counter
    _extension_emit(ext_cmd, args, request_id)

    result_container = [None]
    done_event = _threading.Event()

    def _read_stdin():
        try:
            line = sys.stdin.readline()
            if line:
                result_container[0] = json.loads(line.strip())
        except Exception:
            pass
        done_event.set()

    t = _threading.Thread(target=_read_stdin, daemon=True)
    t.start()
    done_event.wait(timeout=5.0)

    if result_container[0]:
        result = result_container[0]
        if result.get("_requestId") == request_id:
            return result.get("value")
    return None


class ArduinoDevice:
    """Base class for controlling Arduino-compatible boards via Firmata in realtime mode.

    Usage:
        uno = ArduinoDevice("arduinoUno", "arduino")
        uno.pinMode(13, "OUTPUT")
        uno.digitalWrite(13, True)
    """

    def __init__(self, device_id, device_type="arduino", pnpid_list=None):
        self._device_id = device_id
        self._device_type = device_type
        if pnpid_list is None:
            pnpid_list = []
        # Load the device extension in the VM
        _device_emit(device_id, "loadDevice", [device_id, device_type, pnpid_list])

    def pinMode(self, pin, mode):
        """Set pin mode: 'OUTPUT', 'INPUT', or 'INPUT_PULLUP'."""
        _device_emit(self._device_id, "devicePinMode", [self._device_id, pin, mode])

    def digitalWrite(self, pin, value):
        """Write HIGH (True/1) or LOW (False/0) to a digital pin."""
        _device_emit(
            self._device_id, "deviceDigitalWrite", [self._device_id, pin, bool(value)]
        )

    def digitalRead(self, pin):
        """Read digital value (0 or 1) from a pin.
        Desktop: returns actual value via RPC.
        Web: returns None (cached reads not yet supported).
        """
        return _device_rpc(self._device_id, "deviceDigitalRead", [self._device_id, pin])

    def analogWrite(self, pin, value):
        """Write PWM value (0–255) to a PWM-capable pin."""
        _device_emit(
            self._device_id, "deviceAnalogWrite", [self._device_id, pin, int(value)]
        )

    def analogRead(self, pin):
        """Read analog value (0–1023) from an analog pin.
        Desktop: returns actual value via RPC.
        Web: returns None.
        """
        return _device_rpc(self._device_id, "deviceAnalogRead", [self._device_id, pin])

    def servoWrite(self, pin, angle):
        """Set servo angle (0–180 degrees)."""
        _device_emit(
            self._device_id, "deviceServoWrite", [self._device_id, pin, int(angle)]
        )

    def serialPrint(self, text):
        """Print text to the serial port (no newline)."""
        _device_emit(self._device_id, "deviceSerialWrite", [self._device_id, str(text)])

    def serialPrintln(self, text):
        """Print text followed by a newline to the serial port."""
        _device_emit(
            self._device_id, "deviceSerialWriteLn", [self._device_id, str(text)]
        )


# ─── Device Factory Functions ─────────────────────────────────────────────────


def arduinoUno():
    """Create an Arduino Uno device instance for realtime control."""
    return ArduinoDevice("arduinoUno", "arduino")


def arduinoNano():
    """Create an Arduino Nano device instance for realtime control."""
    return ArduinoDevice("arduinoNano", "arduino")


def arduinoEsp32():
    """Create an ESP32 device instance for realtime control."""
    return ArduinoDevice("arduinoEsp32", "arduino")


def arduinoEsp32Gbot():
    """Create a G-Bot Nomo (ESP32) device instance for realtime control."""
    return ArduinoDevice("arduinoEsp32Gbot", "arduino")


def arduinoEsp32Nomobot():
    """Create a Nomobot (ESP32) device instance for realtime control."""
    return ArduinoDevice("arduinoEsp32Nomobot", "arduino")


def arduinoMega2560():
    """Create an Arduino Mega 2560 device instance for realtime control."""
    return ArduinoDevice("arduinoMega2560", "arduino")


def arduinoELFUno():
    """Create a G-Bot Nomo (ELF Uno) device instance for realtime control."""
    return ArduinoDevice("arduinoELFUno", "arduino")


# ─── Module-level Convenience Functions ───────────────────────────────────────

_current_device = None


def use(device):
    """Set the active device for subsequent module-level function calls."""
    global _current_device
    _current_device = device


def pinMode(pin, mode):
    """Set pin mode on the current device."""
    if _current_device is not None:
        _current_device.pinMode(pin, mode)


def digitalWrite(pin, value):
    """Write digital value on the current device."""
    if _current_device is not None:
        _current_device.digitalWrite(pin, value)


def digitalRead(pin):
    """Read digital value from the current device."""
    if _current_device is not None:
        return _current_device.digitalRead(pin)
    return None


def analogWrite(pin, value):
    """Write PWM value on the current device."""
    if _current_device is not None:
        _current_device.analogWrite(pin, value)


def analogRead(pin):
    """Read analog value from the current device."""
    if _current_device is not None:
        return _current_device.analogRead(pin)
    return None


def servoWrite(pin, angle):
    """Set servo angle on the current device."""
    if _current_device is not None:
        _current_device.servoWrite(pin, angle)


def serialPrint(text):
    """Print text to the serial port of the current device."""
    if _current_device is not None:
        _current_device.serialPrint(text)


def serialPrintln(text):
    """Print text + newline to the serial port of the current device."""
    if _current_device is not None:
        _current_device.serialPrintln(text)


def show():
    sprite.show()


def hide():
    sprite.hide()


def switch_costume(name):
    sprite.setCostume(name)


def set_costume(name):
    sprite.setCostume(name)


def switch_backdrop_to(name):
    stage.setBackdrop(name)


def set_backdrop(name):
    stage.setBackdrop(name)


def next_costume():
    sprite.nextCostume()


def next_backdrop():
    stage.nextBackdrop()


def set_size(size):
    sprite.setSize(size)


def change_size(delta):
    sprite.changeSize(delta)


def play_sound(name):
    sprite.playSound(name)


def playSound(name):
    sprite.playSound(name)


def play_sound_until_done(name):
    sprite.playSound(name)


def stop_all_sounds():
    return None


def set_volume(_volume):
    return None


def wait(sec):
    sprite.wait(sec)


def wait_until(_condition):
    return None


def stop(_option):
    raise SystemExit()


def create_clone(clone_option="_myself_"):
    payload = {"cmd": "createClone", "args": [str(clone_option)]}
    if sprite._name is not None:
        payload["targetName"] = sprite._name
    sys.stdout.write(_json_dumps(payload) + "\n")
    sys.stdout.flush()
    _dispatch_local_clone_start()


def delete_clone():
    payload = {"cmd": "deleteClone", "args": []}
    if sprite._name is not None:
        payload["targetName"] = sprite._name
    sys.stdout.write(_json_dumps(payload) + "\n")
    sys.stdout.flush()


def when_i_start_as_a_clone(handler):
    _clone_handlers.append(handler)
    return handler


def _dispatch_local_clone_start():
    for handler in _clone_handlers:
        handler()


def ask(_question):
    global answer
    answer = ""
    return ""


def touching(_target):
    return False


def touching_color(_color):
    return False


def key_pressed(_key):
    return False


def mouse_down():
    return False


def mouse_x():
    return 0


def mouse_y():
    return 0


def timer():
    return time.monotonic() - _timer_started_at


def reset_timer():
    global _timer_started_at
    _timer_started_at = time.monotonic()


def random(start, end):
    return _random.uniform(float(start), float(end))


def show_variable(_name):
    return None


def hide_variable(_name):
    return None


def when_green_flag_clicked(handler):
    _event_handlers["green_flag"].append(handler)
    return handler


def when_key_pressed(key):
    def _decorator(handler):
        k = str(key).lower()
        if k not in _event_handlers["key_pressed"]:
            _event_handlers["key_pressed"][k] = []
        _event_handlers["key_pressed"][k].append(handler)
        return handler

    return _decorator


def when_this_sprite_clicked(handler):
    _event_handlers["sprite_clicked"].append(handler)
    return handler


def when_stage_clicked(handler):
    _event_handlers["stage_clicked"].append(handler)
    return handler


def when_backdrop_switches_to(backdrop_name):
    def _decorator(handler):
        key = str(backdrop_name)
        if key not in _event_handlers["backdrop_switched"]:
            _event_handlers["backdrop_switched"][key] = []
        _event_handlers["backdrop_switched"][key].append(handler)
        return handler

    return _decorator


def _dispatch_local_event(event_name, value=None):
    if event_name == "green_flag":
        for handler in _event_handlers["green_flag"]:
            handler()
        return

    if event_name == "key_pressed":
        key = str(value).lower()
        for handler in _event_handlers["key_pressed"].get(key, []):
            handler()
        for handler in _event_handlers["key_pressed"].get("any", []):
            handler()
        return

    if event_name == "sprite_clicked":
        for handler in _event_handlers["sprite_clicked"]:
            handler()
        return

    if event_name == "stage_clicked":
        for handler in _event_handlers["stage_clicked"]:
            handler()
        return

    if event_name == "backdrop_switched":
        key = str(value)
        for handler in _event_handlers["backdrop_switched"].get(key, []):
            handler()
        return


def when_i_receive(message):
    def _decorator(handler):
        key = str(message)
        if key not in _broadcast_handlers:
            _broadcast_handlers[key] = []
        _broadcast_handlers[key].append(handler)
        return handler

    return _decorator


def _dispatch_local_broadcast(message):
    key = str(message)
    handlers = _broadcast_handlers.get(key, [])
    for handler in handlers:
        handler()


def broadcast(message):
    payload = {"cmd": "broadcast", "args": [str(message)]}
    sys.stdout.write(_json_dumps(payload) + "\n")
    sys.stdout.flush()
    _dispatch_local_broadcast(message)


def broadcast_and_wait(message):
    payload = {"cmd": "broadcastAndWait", "args": [str(message)]}
    sys.stdout.write(_json_dumps(payload) + "\n")
    sys.stdout.flush()
    _dispatch_local_broadcast(message)


def green_flag():
    payload = {"cmd": "greenFlag", "args": []}
    sys.stdout.write(_json_dumps(payload) + "\n")
    sys.stdout.flush()
    _dispatch_local_event("green_flag")


def trigger_key_pressed(key):
    payload = {"cmd": "triggerKeyPressed", "args": [str(key)]}
    sys.stdout.write(_json_dumps(payload) + "\n")
    sys.stdout.flush()
    _dispatch_local_event("key_pressed", key)


def trigger_sprite_clicked():
    payload = {"cmd": "triggerSpriteClicked", "args": []}
    if sprite._name is not None:
        payload["targetName"] = sprite._name
    sys.stdout.write(_json_dumps(payload) + "\n")
    sys.stdout.flush()
    _dispatch_local_event("sprite_clicked")


def trigger_stage_clicked():
    payload = {"cmd": "triggerStageClicked", "args": []}
    sys.stdout.write(_json_dumps(payload) + "\n")
    sys.stdout.flush()
    _dispatch_local_event("stage_clicked")


def trigger_backdrop_switch(backdrop_name):
    payload = {"cmd": "triggerBackdropSwitch", "args": [str(backdrop_name)]}
    sys.stdout.write(_json_dumps(payload) + "\n")
    sys.stdout.flush()
    _dispatch_local_event("backdrop_switched", backdrop_name)


def variable(name, default=0):
    if name not in _variables:
        _variables[name] = default
    return _variables[name]


def set_variable(name, value):
    _variables[name] = value
    return value


def change_variable_by(name, delta):
    current = float(_variables.get(name, 0))
    next_value = current + float(delta)
    _variables[name] = next_value
    return next_value


def list_value(name):
    if name not in _lists:
        _lists[name] = []
    return _lists[name]


def add_to_list(item, list_name):
    list_value(list_name).append(item)


def delete_of_list(index, list_name):
    items = list_value(list_name)
    idx = int(index) - 1
    if 0 <= idx < len(items):
        del items[idx]


def delete_all_of_list(list_name):
    _lists[list_name] = []


def insert_at_list(item, index, list_name):
    items = list_value(list_name)
    idx = max(0, int(index) - 1)
    if idx > len(items):
        idx = len(items)
    items.insert(idx, item)


def replace_item_of_list(index, list_name, item):
    items = list_value(list_name)
    idx = int(index) - 1
    if 0 <= idx < len(items):
        items[idx] = item


def item_of_list(index, list_name):
    items = list_value(list_name)
    idx = int(index) - 1
    if 0 <= idx < len(items):
        return items[idx]
    return None


def length_of_list(list_name):
    return len(list_value(list_name))


def list_contains_item(list_name, item):
    return item in list_value(list_name)
