# 🐍 Panduan Lengkap Python IDE (Nomopro GUI)

## 📚 Daftar Isi

1. [Pengenalan Python IDE](#1-pengenalan-python-ide)
2. [Sprite Mode (Scratch-like)](#2-sprite-mode-scratch-like)
3. [Pure Python Mode](#3-pure-python-mode)
4. [Upload Mode (MicroPython)](#4-upload-mode-micropython)
5. [REPL Mode (Interactive Shell)](#5-repl-mode-interactive-shell)
6. [Built-in Functions Reference](#-built-in-functions-reference)
7. [Tips & Tricks](#7-tips--tricks)
8. [Troubleshooting](#8-troubleshooting)
9. [Quick Reference Card](#-quick-reference-card-printable)

---

## 1. 🎯 Pengenalan Python IDE

### Apa itu Python IDE?

Python IDE (Integrated Development Environment) di Nomopro GUI adalah editor untuk menulis dan menjalankan kode Python. Semua fungsi built-in (`move()`, `say()`, `wait()`, `@when_green_flag_clicked`, dll) **sudah auto-import** — tidak perlu `from nomoproSDKPython import ...`.

### Dua Mode Eksekusi

| Mode            | Deskripsi                                    | Event Decorator?           |
| --------------- | -------------------------------------------- | -------------------------- |
| **Run (biasa)** | Jalankan kode sekali, langsung selesai       | ❌ Tidak support decorator |
| **Run (event)** | Pakai `@when_*` decorator → kode hidup terus | ✅ Support penuh           |

### 🌐 Web vs Desktop

Python IDE bisa di **Web (browser/Pyodide)** atau **Desktop (Electron)**.

| Fitur                               | Web (Pyodide)     | Desktop (Native Python) |
| ----------------------------------- | ----------------- | ----------------------- |
| Sprite control (`move`, `say`, dll) | ✅                | ✅                      |
| Event decorator (`@when_*`)         | ✅                | ✅                      |
| Pen drawing                         | ✅                | ✅                      |
| Music & TTS                         | ✅                | ✅                      |
| Extension (ML, TM2, OB2, Handpose)  | ✅ (COMMAND only) | ✅ (COMMAND + REPORTER) |
| Device Control (realtime)           | ❌                | ✅ Arduino Nano/Uno     |
| REPORTER (return value)             | ❌ Return `None`  | ✅ Return nilai asli    |

> **Rekomendasi**: Web mode cukup untuk belajar sprite, event, dan basic Python. Desktop mode untuk device control atau REPORTER blocks.

---

## 2. 🎮 Sprite Mode (Scratch-like)

Sprite mode adalah mode utama — kontrol sprite di stage seperti Scratch, tapi pakai Python.

### Membuat Sprite

```python
sprite = Sprite('NamaSprite')
```

Setiap file `.py` = satu sprite. Nama file jadi nama sprite (`# Sprite1.py` di header file).

### Contoh Dasar

```python
sprite = Sprite('Sprite1')

@when_green_flag_clicked
def run():
    sprite.say("Hello!")
    sprite.move(50)
    sprite.turn_right(90)
    sprite.wait(0.5)
    sprite.think("Done!")
```

Klik **Run** lalu klik **Green Flag** 🟢 untuk menjalankan.

### Event Decorator

| Decorator                            | Trigger                 |
| ------------------------------------ | ----------------------- |
| `@when_green_flag_clicked`           | Klik green flag         |
| `@when_key_pressed("key")`           | Tombol keyboard ditekan |
| `@when_this_sprite_clicked`          | Sprite ini diklik       |
| `@when_stage_clicked`                | Stage diklik            |
| `@when_backdrop_switches_to("name")` | Backdrop berubah        |
| `@when_i_receive("message")`         | Broadcast diterima      |

#### Nama Key untuk `@when_key_pressed`

Gunakan nama Scratch convention:

```python
# ✅ Benar
@when_key_pressed("space")
@when_key_pressed("up arrow")
@when_key_pressed("down arrow")
@when_key_pressed("left arrow")
@when_key_pressed("right arrow")
@when_key_pressed("a")
@when_key_pressed("enter")

# ❌ Salah — " " atau "ArrowUp" (browser convention) tidak dikenali
@when_key_pressed("ArrowUp")
```

### Sprite Methods (via `sprite.`)

```python
sprite = Sprite('Cat')

# Movement
sprite.move(10)            # Maju 10 langkah
sprite.turn_right(15)      # Putar kanan 15°
sprite.turn_left(15)       # Putar kiri 15°
sprite.gotoXY(100, 50)     # Pindah ke (x, y)
sprite.setX(0)             # Set posisi X
sprite.setY(0)             # Set posisi Y
sprite.changeX(10)         # Geser X relatif
sprite.changeY(10)         # Geser Y relatif
sprite.point(90)           # Arahkan ke 90° (kanan)

# Looks
sprite.say("Hello!")       # Bubble bicara
sprite.think("Hmm...")     # Bubble berpikir
sprite.show()              # Tampilkan
sprite.hide()              # Sembunyikan
sprite.setSize(80)         # Ukuran 80%
sprite.changeSize(10)      # Tambah ukuran 10%

# Costume & Backdrop
sprite.setCostume("run1")  # Ganti costume
sprite.nextCostume()       # Costume berikutnya
sprite.setBackdrop("bg2")  # Ganti backdrop
sprite.nextBackdrop()      # Backdrop berikutnya

# Sound & Effects
sprite.playSound("meow")   # Putar suara
sprite.setEffect("color", 50)
sprite.clearEffects()

# Pen
sprite.penDown()
sprite.penUp()
sprite.setPenColor("blue")
sprite.setPenSize(5)
sprite.changePenSize(2)
sprite.penClear()
sprite.penStamp()

# Time
sprite.wait(1.5)           # Tunggu 1.5 detik

# Other
sprite.speak("Hello")      # Text-to-speech
sprite.ifOnEdgeBounce()    # Pantul di tepi
```

### Contoh Lengkap: Kotak dengan Pen

```python
sprite = Sprite('Artist')

@when_green_flag_clicked
def draw():
    sprite.penDown()
    sprite.setPenColor("red")
    for i in range(4):
        sprite.move(100)
        sprite.turn_right(90)
    sprite.penUp()
```

### Contoh Lengkap: Key Control

```python
sprite = Sprite('Player')

@when_key_pressed("right arrow")
def move_right():
    sprite.changeX(20)

@when_key_pressed("left arrow")
def move_left():
    sprite.changeX(-20)

@when_key_pressed("up arrow")
def move_up():
    sprite.changeY(20)

@when_key_pressed("down arrow")
def move_down():
    sprite.changeY(-20)
```

### Contoh Lengkap: Broadcast

```python
sprite = Sprite('Sender')

@when_green_flag_clicked
def start():
    sprite.say("Mulai!")
    broadcast("mulai_game")

@when_i_receive("mulai_game")
def on_start():
    sprite.move(50)
    sprite.say("Game dimulai!")
```

### Stage Control

```python
# stage adalah singleton Sprite tanpa nama untuk stage
stage.setBackdrop("backdrop1")
stage.nextBackdrop()
```

### Fungsi Global

Semua fungsi sprite API juga tersedia sebagai fungsi global (pakai sprite default):

```python
@when_green_flag_clicked
def run():
    move(50)        # sama dengan sprite.move(50) — pakai sprite saat ini
    say("Hello!")
    turn_right(90)
```

---

## 3. 🐍 Pure Python Mode

Mode untuk kode Python murni (tanpa sprite/event). Bisa `print()`, `input()`, loop, matematika, dll.

### Contoh

```python
# Hitung faktorial
def faktorial(n):
    if n <= 1:
        return 1
    return n * faktorial(n - 1)

print("Faktorial 5 =", faktorial(5))

# List & loop
buah = ["apel", "jeruk", "mangga"]
for b in buah:
    print(f"Saya suka {b}")
```

### Library Standar Tersedia

```python
import math
import random
import time

print(math.sqrt(16))           # 4.0
print(random.randint(1, 100))  # Angka acak
```

---

## 4. 📤 Upload Mode (MicroPython)

Upload firmware MicroPython ke board hardware.

### Device Support

- ✅ ESP32
- ✅ Micro:bit V2
- ✅ Raspberry Pi Pico

### Cara Menggunakan

1. Hubungkan board via USB
2. Buka tab **µPy Upload**
3. Pilih device → Connect
4. Klik **Flash Firmware** (sekali saja)
5. Setelah **MicroPython Ready**, klik **Upload & Run**

### Contoh Kode ESP32

```python
from machine import Pin
import time

led = Pin(2, Pin.OUT)

while True:
    led.value(1)
    time.sleep(1)
    led.value(0)
    time.sleep(1)
```

---

## 5. 💬 REPL Mode (Interactive Shell)

Terminal interaktif langsung ke board MicroPython. Butuh **MicroPython firmware** sudah ter-flash.

### Shortcut REPL

| Shortcut   | Fungsi        |
| ---------- | ------------- |
| **Enter**  | Jalankan kode |
| **Ctrl+C** | Interrupt     |
| **Ctrl+D** | Soft reboot   |
| **Ctrl+E** | Paste mode    |

---

## 7. 🎓 Tips & Tricks

### Mulai Belajar

1. **Sprite mode dulu** — seru, visual, langsung lihat hasil
2. Copy-paste contoh, ubah angka
3. Tambah `print()` untuk debugging
4. Eksperimen dengan event decorator

### Proyek Sederhana

**1. Animasi Sprite:**

```python
sprite = Sprite('Cat')

@when_green_flag_clicked
def animate():
    for i in range(10):
        sprite.move(10)
        sprite.nextCostume()
        sprite.wait(0.1)
```

**2. Game Keyboard:**

```python
sprite = Sprite('Player')

@when_key_pressed("right arrow")
def right():
    sprite.changeX(10)

@when_key_pressed("left arrow")
def left():
    sprite.changeX(-10)

@when_key_pressed("space")
def jump():
    sprite.changeY(30)
    sprite.wait(0.2)
    sprite.changeY(-30)
```

**3. Gambar Spiral:**

```python
sprite = Sprite('Artist')

@when_green_flag_clicked
def spiral():
    sprite.penDown()
    sprite.setPenColor("purple")
    for i in range(50):
        sprite.move(i * 2)
        sprite.turn_right(91)
    sprite.penUp()
```

**4. Kontrol LED (Desktop - Arduino Nano):**

```python
from nomoproSDKPython import use, pinMode, digitalWrite, arduinoNano
import time

use(arduinoNano())
pinMode(13, "OUTPUT")

for i in range(5):
    digitalWrite(13, True)
    time.sleep(0.5)
    digitalWrite(13, False)
    time.sleep(0.5)
```

**5. Event Handler - Semua Tombol:**

```python
sprite = Sprite('Player')

@when_key_pressed("up arrow")
def up():
    sprite.changeY(10)

@when_key_pressed("down arrow")
def down():
    sprite.changeY(-10)

@when_key_pressed("right arrow")
def right():
    sprite.changeX(10)

@when_key_pressed("left arrow")
def left():
    sprite.changeX(-10)

@when_key_pressed("space")
def space():
    sprite.say("Jump!")
    sprite.changeY(30)
```

---

## 8. 🔧 Troubleshooting

### Sprite tidak bergerak saat green flag

1. Pastikan kode punya `@when_green_flag_clicked` decorator
2. Klik **Run** dulu, baru klik **Green Flag**
3. Cek console (F12) — ada error?

### `wait()` atau `sprite.wait()` tidak delay

Pastikan pakai **nomor** (bukan string): `wait(1)` atau `sprite.wait(0.5)`

### Key pressed tidak jalan untuk spasi

Pakai `@when_key_pressed("space")` — bukan `" "` atau `"Space"`.

### Syntax error / indent error

- Python wajib indentasi 4 spasi setelah `def`, `if`, `for`, dll
- Jangan campur tab dan spasi

### "NameError: name 'Sprite' is not defined"

`Sprite` auto-import — pastikan ejaan benar (kapital S).

---

## 📚 Appendix A: Built-in Functions Reference

### 🎯 Sprite Control

| Fungsi                        | Deskripsi            |
| ----------------------------- | -------------------- |
| `move(value)`                 | Maju `value` langkah |
| `gotoXY(x, y)` / `goto(x, y)` | Pindah ke koordinat  |
| `turn_right(value)`           | Putar kanan derajat  |
| `turn_left(value)`            | Putar kiri derajat   |
| `point(direction)`            | Arahkan ke sudut     |
| `x_position()`                | Posisi X             |
| `y_position()`                | Posisi Y             |
| `direction()`                 | Arah (0-360°)        |

### 🎨 Looks

| Fungsi              | Deskripsi           |
| ------------------- | ------------------- |
| `say(text)`         | Bubble bicara       |
| `think(text)`       | Bubble berpikir     |
| `show()`            | Tampilkan           |
| `hide()`            | Sembunyikan         |
| `setSize(value)`    | Ukuran %            |
| `changeSize(delta)` | Ubah ukuran relatif |
| `setCostume(name)`  | Ganti costume       |
| `nextCostume()`     | Costume berikutnya  |
| `setBackdrop(name)` | Ganti backdrop      |
| `nextBackdrop()`    | Backdrop berikutnya |

### ✏️ Pen

| Fungsi                 | Deskripsi           |
| ---------------------- | ------------------- |
| `penDown()`            | Mulai menggambar    |
| `penUp()`              | Berhenti menggambar |
| `setPenColor(color)`   | Warna pensil        |
| `setPenSize(size)`     | Ukuran pensil       |
| `changePenSize(delta)` | Ubah ukuran pensil  |
| `penClear()`           | Hapus semua         |
| `penStamp()`           | Cap sprite          |

### ⏱️ Time

| Fungsi          | Deskripsi     |
| --------------- | ------------- |
| `wait(seconds)` | Delay detik   |
| `timer()`       | Waktu (detik) |
| `reset_timer()` | Reset timer   |

### 🎭 Events

| Decorator                            | Trigger            |
| ------------------------------------ | ------------------ |
| `@when_green_flag_clicked`           | Green flag         |
| `@when_key_pressed("key")`           | Key ditekan        |
| `@when_this_sprite_clicked`          | Sprite diklik      |
| `@when_stage_clicked`                | Stage diklik       |
| `@when_backdrop_switches_to("name")` | Backdrop ganti     |
| `@when_i_receive("msg")`             | Broadcast diterima |

### 📢 Broadcast & Clone

| Fungsi                    | Deskripsi       |
| ------------------------- | --------------- |
| `broadcast(msg)`          | Kirim broadcast |
| `broadcast_and_wait(msg)` | Kirim + tunggu  |
| `create_clone()`          | Clone sprite    |
| `delete_clone()`          | Hapus clone     |

### 📋 Variables & Lists

| Fungsi                            | Deskripsi        |
| --------------------------------- | ---------------- |
| `variable(name, default=0)`       | Ambil variable   |
| `set_variable(name, value)`       | Set variable     |
| `change_variable_by(name, delta)` | Tambah variable  |
| `add_to_list(item, name)`         | Tambah ke list   |
| `item_of_list(index, name)`       | Ambil item ke-n  |
| `length_of_list(name)`            | Panjang list     |
| `delete_of_list(index, name)`     | Hapus item ke-n  |
| `delete_all_of_list(name)`        | Hapus semua list |

### 📡 Device Control (Desktop only)

| Fungsi                   | Deskripsi        |
| ------------------------ | ---------------- |
| `use(device)`            | Set device       |
| `pinMode(pin, mode)`     | Pin INPUT/OUTPUT |
| `digitalWrite(pin, val)` | Set pin HIGH/LOW |
| `digitalRead(pin)`       | Baca pin digital |
| `analogWrite(pin, val)`  | PWM 0-255        |
| `analogRead(pin)`        | Baca analog      |
| `servoWrite(pin, angle)` | Servo 0-180°     |
| `serialPrint(text)`      | Kirim serial     |

Device factory: `arduinoNano()`, `arduinoUno()`, `arduinoEsp32()`, `arduinoEsp32Gbot()`, `arduinoEsp32Nomobot()`, `arduinoMega2560()`, `arduinoELFUno()`

### 🎵 Music

| Fungsi                  | Deskripsi      |
| ----------------------- | -------------- |
| `playDrum(drum, beats)` | Main drum      |
| `playNote(note, beats)` | Main note      |
| `rest(beats)`           | Diam           |
| `setInstrument(inst)`   | Instrumen 0-20 |
| `setTempo(bpm)`         | Tempo BPM      |
| `changeTempo(delta)`    | Ubah tempo     |
| `getTempo()`            | Ambil tempo    |

### 🔊 TTS

| Fungsi                      | Deskripsi    |
| --------------------------- | ------------ |
| `speak(text)`               | Ucapkan teks |
| `setVoice(voice)`           | Pilih suara  |
| `set_speech_language(lang)` | Bahasa TTS   |

### 🖐️ Handpose / 🎤 Speech / 🌐 Translate / 🤖 AI

Lihat referensi lengkap di code completion editor (Ctrl+Space).

---

## 📋 Quick Reference Card

### Mode Eksekusi

| Klik                    | Mode                   |
| ----------------------- | ---------------------- |
| **Run**                 | Eksekusi langsung      |
| **Run + 🟢 Green Flag** | Mode event (decorator) |

### Key Names (Scratch convention)

| Keyboard | Nama key        |
| -------- | --------------- |
| Space    | `"space"`       |
| ↑        | `"up arrow"`    |
| ↓        | `"down arrow"`  |
| ←        | `"left arrow"`  |
| →        | `"right arrow"` |
| A-Z      | `"a"` ... `"z"` |
| 0-9      | `"0"` ... `"9"` |
| Enter    | `"enter"`       |

### Common Errors

| Error                           | Fix                          |
| ------------------------------- | ---------------------------- |
| Sprite tidak gerak setelah Run  | Klik **Green Flag**          |
| Key space tidak jalan           | Pakai `"space"` bukan `" "`  |
| `NameError: Sprite not defined` | Eja `Sprite` (kapital S)     |
| `SyntaxError: invalid indent`   | Pakai 4 spasi setelah `def:` |

---

## 🎉 Selamat Coding!

Python IDE untuk belajar coding dengan cara visual dan menyenangkan. Mulai dari sprite mode, eksplorasi event, lalu lanjut ke hardware!

**Ingat:** Error = belajar. Konsisten > cepat. Bertanya itu bagus. 🚀
