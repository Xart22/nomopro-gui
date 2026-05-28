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
        _device_emit(self._device_id, "deviceDigitalWrite", [self._device_id, pin, bool(value)])

    def digitalRead(self, pin):
        """Read digital value (0 or 1) from a pin.
        Desktop: returns actual value via RPC.
        Web: returns None (cached reads not yet supported).
        """
        return _device_rpc(self._device_id, "deviceDigitalRead", [self._device_id, pin])

    def analogWrite(self, pin, value):
        """Write PWM value (0–255) to a PWM-capable pin."""
        _device_emit(self._device_id, "deviceAnalogWrite", [self._device_id, pin, int(value)])

    def analogRead(self, pin):
        """Read analog value (0–1023) from an analog pin.
        Desktop: returns actual value via RPC.
        Web: returns None.
        """
        return _device_rpc(self._device_id, "deviceAnalogRead", [self._device_id, pin])

    def servoWrite(self, pin, angle):
        """Set servo angle (0–180 degrees)."""
        _device_emit(self._device_id, "deviceServoWrite", [self._device_id, pin, int(angle)])

    def serialPrint(self, text):
        """Print text to the serial port (no newline)."""
        _device_emit(self._device_id, "deviceSerialWrite", [self._device_id, str(text)])

    def serialPrintln(self, text):
        """Print text followed by a newline to the serial port."""
        _device_emit(self._device_id, "deviceSerialWriteLn", [self._device_id, str(text)])


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
