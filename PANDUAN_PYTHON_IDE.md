# 🐍 Panduan Lengkap Python IDE for Kids & Students

## 📚 Daftar Isi
1. [Pengenalan Python IDE](#1-pengenalan-python-ide)
2. [Mode 1: Upload (Flash Firmware)](#2-mode-1-upload-flash-firmware)
3. [Mode 2: Realtime (Live Coding)](#3-mode-2-realtime-live-coding)
4. [Mode 3: REPL (Interactive Shell)](#4-mode-3-repl-interactive-shell)
5. [Built-in Functions Reference](#-built-in-functions-reference)
6. [Tips & Tricks](#5-tips--tricks)
7. [Troubleshooting](#6-troubleshooting)
8. [Quick Reference Card](#-quick-reference-card-printable)

---

## 1. 🎯 Pengenalan Python IDE

### Apa itu Python IDE?
Python IDE (Integrated Development Environment) adalah aplikasi untuk menulis dan menjalankan kode Python. IDE ini bisa bekerja dengan berbagai perangkat keras seperti:
- 🟦 **Arduino** (Arduino Uno, Nano, Mega, dll)
- 🟩 **ESP32** (ESP32, ESP8266, ESP32-CAM)
- 🟨 **Micro:bit** (Micro:bit V1 & V2)
- 🟪 **Raspberry Pi Pico**
- 🤖 **NomoBot** (NomoBot, NomoBot AI, NomoBot Basic Kit)

### Tiga Mode Utama

| Mode | Fungsi | Kapan Digunakan |
|------|--------|-----------------|
| **Upload Mode** | Flash firmware MicroPython ke board | Saat pertama kali menggunakan board baru |
| **Realtime Mode** | Jalankan kode Python secara langsung di VM | Untuk simulasi dan testing cepat |
| **REPL Mode** | Interaksi langsung dengan board via serial | Untuk debugging dan testing kode |

### 🎁 Built-in Functions yang Tersedia

Python IDE ini dilengkapi dengan **200+ built-in functions** yang terbagi dalam 15 kategori:

1. **Movement** - `move()`, `goto()`, `turn_right()`, `turn_left()`, `point()`
2. **Appearance** - `switch_costume()`, `next_costume()`, `show()`, `hide()`
3. **Pen Drawing** - `pen_down()`, `pen_up()`, `set_pen_color()`, `pen_clear()`
4. **Sound & Effects** - `play_sound()`, `set_effect()`, `clear_effects()`
5. **Time & Waiting** - `wait()`, `timer()`, `reset_timer()`
6. **Events** - `@when_green_flag_clicked`, `@when_key_pressed`, `@when_i_receive()`
7. **Variables & Lists** - `variable()`, `list_value()`, `add_to_list()`, `item_of_list()`
8. **Device Control** - `pinMode()`, `digitalWrite()`, `analogRead()`, `servoWrite()`
9. **Music** - `play_drum()`, `play_note()`, `set_instrument()`, `set_tempo()`, `get_tempo()`
10. **Hand Pose** - `handpose_get_x()`, `handpose_get_y()`, `handpose_get_z()`, `handpose_video()`
11. **Speech to Text** - `listen()`, `get_speech()`
12. **Translate** - `translate_text()`, `get_viewer_language()`
13. **Video Sensing** - `video_toggle()`, `set_video_transparency()`
14. **Text to Speech** - `speak()`, `set_voice()`, `set_speech_language()`
15. **ML/AI** - `ml_add_example1()`, `ob2_analyse()`, `tm2_classify_image()`, `tmpose_classify()`

**Semua fungsi sudah terintegrasi** dan bisa langsung digunakan tanpa install tambahan!

---

### 🌐 Web vs Desktop: Perbedaan Kemampuan

Python IDE dapat berjalan di **Web (browser)** maupun **Desktop (Electron app)**. Beberapa fitur hanya tersedia di Desktop karena membutuhkan akses ke sistem file dan proses Python native.

| Fitur | Web (Browser/Pyodide) | Desktop (Electron) |
|-------|-----------------------|-------------------|
| **Eksekusi Python** | ✅ Pyodide (di browser) | ✅ Native Python (subprocess) |
| **Sprite Control** | ✅ `move()`, `say()`, dll | ✅ Sama |
| **Pen Drawing** | ✅ `pen_down()`, `pen_up()`, dll | ✅ Sama |
| **Text to Speech** | ✅ `speak()`, `set_voice()` | ✅ Sama |
| **Video Sensing** | ✅ `video_toggle()`, `set_video_transparency()` | ✅ Sama |
| **Music** | ✅ COMMAND blocks (`play_drum`, `play_note`, dll) | ✅ Sama |
| **Handpose** | ✅ COMMAND blocks (`handpose_video`, dll) | ✅ Sama |
| **Speech to Text** | ✅ `listen()` | ✅ Sama |
| **ML/AI (COMMANDs)** | ✅ `ml_add_example1()`, `ml_train()`, dll | ✅ Sama |
| **OB2/TM2/TMPose (COMMANDs)** | ✅ `ob2_analyse()`, `tm2_classify_image()`, dll | ✅ Sama |
| | | |
| **REPORTER (return value)** | ❌ **Return `None`** | ✅ **Return value asli** |
| **Device Control (realtime)** | ❌ **Return `None`** | ✅ `digitalRead()`, `analogRead()` |
| **Translate** | ❌ **Return `None`** | ✅ `translate_text()`, `get_viewer_language()` |
| **get_tempo()** | ❌ **Return `None`** | ✅ Return BPM |
| **handpose_get_x/y/z()** | ❌ **Return `None`** | ✅ Return koordinat |
| **get_speech()** | ❌ **Return `None`** | ✅ Return text |
| **ob2_get_counts/is_detected()** | ❌ **Return `None`** | ✅ Return nilai |
| **ml_get_label/get_count()** | ❌ **Return `None`** | ✅ Return nilai |
| **tm2/tmpose confidence/threshold** | ❌ **Return `None`** | ✅ Return nilai |

> **Mengapa REPORTER tidak work di Web?** Di Web (Pyodide), Python berjalan di dalam browser worker tanpa akses stdin/stdout pipe yang diperlukan untuk komunikasi dua arah (request-response). Desktop mode menggunakan native Python subprocess dengan stdin/stdout pipe penuh.

**Rekomendasi:**
- Gunakan **Web mode** untuk belajar, testing, dan COMMAND blocks
- Gunakan **Desktop mode** jika perlu REPORTER blocks (return value) atau device control

---

## 2. 📤 Mode 1: Upload (Flash Firmware)

### Kapan Menggunakan Upload Mode?
Upload mode digunakan untuk **memasang firmware MicroPython** ke board yang belum memiliki MicroPython.

**Contoh:**
- ESP32 yang baru dibeli
- Arduino yang ingin diubah ke MicroPython
- Micro:bit V2 yang perlu diupdate

### Cara Menggunakan Upload Mode

#### Langkah 1: Hubungkan Perangkat
1. Hubungkan board ke komputer via USB
2. Buka Python IDE
3. Pilih device di menu Connection
4. Klik **Connect** untuk menghubungkan

#### Langkah 2: Pilih Upload Mode
1. Di Python IDE, klik tab **Upload** (ikon ⬆️)
2. Anda akan melihat status firmware:
   - 🔵 **Unknown** = Belum terdeteksi
   - 🟢 **MicroPython Ready** = Sudah punya MicroPython
   - 🟡 **Arduino Firmware** = Perlu di-flash

#### Langkah 3: Flash Firmware
Jika firmware belum ada atau perlu diupdate:

1. Klik tombol **Flash Firmware**
2. Tunggu proses flash (bisa 1-5 menit)
3. Lihat progress bar dan log di bawah
4. Setelah selesai, status akan berubah jadi **MicroPython Ready** ✅

#### Langkah 4: Upload Kode
Setelah firmware terflash:

1. Tulis kode Python di editor
2. Klik **Upload & Run** untuk upload dan jalankan sekaligus
3. Atau klik **Upload Only** untuk upload tanpa reset

#### Contoh Kode untuk ESP32

```python
# Contoh: LED berkedip di ESP32
import machine
import time

# Setup LED di pin 2
led = machine.Pin(2, machine.Pin.OUT)

while True:
    led.value(1)   # Nyalakan LED
    time.sleep(1)  # Tunggu 1 detik
    led.value(0)   # Matikan LED
    time.sleep(1)  # Tunggu 1 detik
```

### Tips Upload Mode
- ✅ Pastikan board terhubung dengan baik
- ✅ Gunakan kabel USB yang bagus
- ⚠️ Jangan cabut kabel saat sedang flash
- ⚠️ Untuk ESP32, perlu driver CH340/CP2102
- ⚠️ Untuk Micro:bit V2, gunakan kabel USB-C

---

## 3. ⚡ Mode 2: Realtime (Live Coding)

### Kapan Menggunakan Realtime Mode?
Realtime mode untuk **menjalankan kode Python secara langsung** di Virtual Machine (VM) browser. Mode ini **tidak** memerlukan koneksi ke board.

**Cocok untuk:**
- ✅ Testing kode dengan cepat
- ✅ Debugging tanpa board
- ✅ Belajar dasar-dasar Python
- ⚠️ **Tidak** cocok untuk hardware testing

### Cara Menggunakan Realtime Mode

#### Langkah 1: Pilih Unselect Device
1. Di menu Connection, pilih **Unselect Device**
2. Ini akan kembali ke mode Scratch murni (tanpa hardware)

#### Langkah 2: Tulis Kode Python
1. Buka Python IDE
2. Tulis kode Python di editor
3. Kode akan dijalankan di VM browser

#### Langkah 3: Jalankan Kode
1. Klik tombol **▶ Run** untuk menjalankan kode saat ini
2. Klik **▶▶ Run All** untuk menjalankan semua file
3. Lihat output di tab **Output**

#### Contoh Kode Realtime

```python
# Contoh: Print hello world
print("Hello from Python!")
print("Realtime mode tidak butuh hardware!")

# Contoh: Loop sederhana
for i in range(5):
    print(f"Iterasi ke-{i+1}")

# Contoh: Matematika
angka = 10 + 5 * 2
print(f"Hasil: {angka}")  # Output: 20
```

### Perbandingan: Realtime vs Upload

| Fitur | Realtime Mode | Upload Mode |
|-------|---------------|-------------|
| Butuh hardware? | ❌ Tidak | ✅ Ya |
| Kecepatan | ⚡ Sangat cepat | 🐢 Lebih lambat |
| Debugging | ✅ Mudah | ⚠️ Sulit |
| Testing kode | ✅ Bagus | ⚠️ Terbatas |
| Hardware control | ❌ Tidak bisa | ✅ Bisa |

### Tips Realtime Mode
- ✅ Cocok untuk belajar dasar Python
- ✅ Tidak perlu driver atau kabel USB
- ⚠️ Tidak bisa kontrol hardware (LED, sensor, dll)
- ⚠️ Output terbatas (hanya print ke console)

---

## 4. 💬 Mode 3: REPL (Interactive Shell)

### Kapan Menggunakan REPL Mode?
REPL (Read-Eval-Print Loop) adalah **terminal interaktif** yang terhubung langsung ke board MicroPython.

**Cocok untuk:**
- ✅ Testing kode secara interaktif
- ✅ Debugging kode di board
- ✅ Mengecek nilai sensor
- ✅ Kontrol board secara langsung

### Cara Menggunakan REPL Mode

#### Langkah 1: Hubungkan Board
1. Hubungkan board (ESP32, Micro:bit, dll) ke komputer
2. Pastikan firmware MicroPython sudah terinstall
3. Di Python IDE, pilih device yang terhubung

#### Langkah 2: Buka REPL Tab
1. Klik tab **REPL** (ikon ⌨️) di terminal
2. Tunggu sampai muncul prompt `>>>`
3. Status akan berubah jadi **REPL: Connected** 🟢

#### Langkah 3: Ketik Kode
Ketik kode Python dan tekan **Enter**:

```python
>>> print("Hello REPL!")
Hello REPL!
>>> 10 + 20
30
>>> import time
>>> time.sleep(2)  # Tunggu 2 detik
...
>>>  # Kembali ke prompt
```

#### Langkah 4: Upload File
Untuk upload file `.py` ke board:

1. Tekan **Ctrl+E** atau klik **Paste Mode**
2. Ketik nama file: `main.py`
3. Paste kode Python
4. Tekan **Ctrl+D** atau klik **Execute**

### Shortcut REPL

| Shortcut | Fungsi |
|----------|--------|
| **Enter** | Jalankan kode |
| **Ctrl+C** | Interrupt (hentikan proses) |
| **Ctrl+D** | Soft reboot (reset board) |
| **Ctrl+E** | Paste mode (upload file) |
| **↑/↓** | History command |

### Contoh Interactive REPL

```python
>>> # Cek sensor suhu (ESP32)
>>> import machine
>>> import time
>>> temp_sensor = machine.ADC(34)
>>> temp_sensor.read()
0.65
>>> # Cek GPIO
>>> machine.Pin(2).value()
1
>>> # Loop test
>>> import time
>>> for i in range(3):
...     print(f"Iterasi {i}")
...     time.sleep(1)
Iterasi 0
Iterasi 1
Iterasi 2
>>> # Kembali ke prompt
```

### Tips REPL Mode
- ✅ Ideal untuk debugging
- ✅ Bisa test kode sebelum upload
- ⚠️ Harus ada koneksi serial
- ⚠️ Baudrate default 115200 (sesuaikan dengan board)
- ⚠️ Untuk Micro:bit, baudrate 9600

---

## 5. 🎓 Tips & Tricks

### Untuk Siswa SD

#### Mulai dari yang Mudah
1. **Gunakan Realtime Mode dulu** - belajar dasar Python tanpa hardware
2. **Lihat contoh kode** - copy-paste contoh, lalu ubah angkanya
3. **Print banyak-banyak** - lihat output di console
4. **Mainkan dengan angka** - coba tambah, kurang, kali, bagi

#### Contoh Belajar Dasar
```python
# 1. Print sederhana
print("Halo Dunia!")
print("Saya belajar Python!")

# 2. Variabel
nama = "Budi"
umur = 10
print(f"Hai, saya {nama}, umur {umur} tahun")

# 3. Loop
for i in range(3):
    print(f"Loop ke-{i+1}")

# 4. If-Else
angka = 10
if angka > 5:
    print("Angka ini besar!")
else:
    print("Angka ini kecil!")
```

#### Proyek Sederhana

**1. Game Tebak Angka:**
```python
import random

angka_rahasia = random.randint(1, 10)
tebakan = 0

print("Saya memikirkan angka 1-10!")
print("Tebak angkanya!")

while True:
    tebakan = int(input("Tebak: "))
    if tebakan == angka_rahasia:
        print("Yey! Benar!")
        break
    elif tebakan < angka_rahasia:
        print("Terlalu kecil!")
    else:
        print("Terlalu besar!")
```

**2. Gerakan Sprite (Realtime Mode):**
```python
from nomoproSDKPython import sprite

@when_green_flag_clicked
def run():
    sprite.move(50)
    sprite.turn_right(90)
    sprite.move(50)
    sprite.turn_right(90)
    sprite.move(50)
    sprite.turn_right(90)
    sprite.move(50)
```

**3. Gambar Kotak dengan Pen:**
```python
from nomoproSDKPython import sprite

@when_green_flag_clicked
def draw_square():
    sprite.pen_down()
    sprite.set_pen_color("blue")
    for i in range(4):
        sprite.move(100)
        sprite.turn_right(90)
    sprite.pen_up()
```

**4. Kontrol LED (Upload Mode - ESP32/Arduino):**
```python
from nomoproSDKPython import use, pinMode, digitalWrite, wait

use(arduinoUno())

@when_green_flag_clicked
def flash_led():
    pinMode(13, "OUTPUT")
    digitalWrite(13, True)
    wait(1)
    digitalWrite(13, False)
    wait(1)
```

**5. Sensor Suhu (Upload Mode - ESP32):**
```python
from nomoproSDKPython import use, analogRead, wait
import math

use(arduinoEsp32())

@when_green_flag_clicked
def read_temp():
    # Baca sensor suhu analog
    raw = analogRead(34)
    # Konversi ke Volt (range 0-3.3V)
    voltage = raw * 3.3 / 4095
    print(f"Voltage: {voltage:.2f}V")
    wait(2)
```

**6. List & Variable:**
```python
from nomoproSDKPython import sprite, add_to_list, item_of_list, length_of_list

@when_green_flag_clicked
def shopping_list():
    add_to_list("apple", "fruits")
    add_to_list("banana", "fruits")
    add_to_list("orange", "fruits")
    
    print(f"Ada {length_of_list('fruits')} buah!")
    print(f"Buah pertama: {item_of_list(1, 'fruits')}")
```

**7. Event Handler - Key Press:**
```python
from nomoproSDKPython import sprite, when_key_pressed, wait

@when_key_pressed("space")
def jump():
    sprite.move(30)
    wait(1)
    sprite.move(-30)

@when_key_pressed("up")
def go_up():
    sprite.turn_left(90)
    sprite.move(50)
```

### Untuk Mahasiswa

#### Best Practices
1. **Gunakan tipe data yang benar**
   ```python
   # ❌ Buruk
   umur = "20"  # String, bukan angka
   
   # ✅ Bagus
   umur = 20  # Integer
   ```

2. **Komentar kode**
   ```python
   # Hitung luas persegi panjang
   panjang = 10
   lebar = 5
   luas = panjang * lebar
   print(f"Luas = {luas}")
   ```

3. **Error handling**
   ```python
   try:
       angka = int(input("Masukkan angka: "))
       hasil = 100 / angka
       print(f"Hasil: {hasil}")
   except ZeroDivisionError:
       print("Tidak bisa bagi dengan 0!")
   except ValueError:
       print("Masukkan angka yang valid!")
   ```

#### Debugging Tips
1. **Gunakan print() untuk debugging**
   ```python
   print(f"Debug: nilai x = {x}")
   print(f"Debug: nilai y = {y}")
   ```

2. **Gunakan REPL untuk inspection**
   ```python
   # Di REPL
   >>> x
   10
   >>> y
   20
   >>> x + y
   30
   ```

3. **Cek hardware status**
   ```python
   # ESP32
   >>> import machine
   >>> pin = machine.Pin(2)
   >>> pin.value()
   1
   ```

#### Optimasi Kode
```python
# ❌ Loop tidak perlu
for i in range(1000000):
    print(i)

# ✅ Lebih efisien
import sys
sys.stdout.write('\n'.join(map(str, range(1000000))))
```

#### Contoh Lengkap: Game Snake Sederhana

**Realtime Mode:**
```python
from nomoproSDKPython import sprite, when_green_flag_clicked, wait, broadcast, when_i_receive
import random

# Setup game
@when_green_flag_clicked
def start_game():
    sprite.hide()
    broadcast("game_start")
    
    # Main loop
    while sprite.visible:
        # Get key input
        if key_pressed("up"):
            sprite.turn_left(90)
        elif key_pressed("down"):
            sprite.turn_right(90)
        elif key_pressed("left"):
            sprite.turn_left(90)
        elif key_pressed("right"):
            sprite.turn_right(90)
        
        # Move
        sprite.move(10)
        
        # Check edge
        if touching("edge"):
            sprite.show()
            break
        
        wait(0.1)

# Handle broadcast
@when_i_receive("game_start")
def on_start():
    sprite.show()
    sprite.goto(0, 0)
    sprite.point(90)
```

**Upload Mode (ESP32 - LED Blinking Pattern):**
```python
from nomoproSDKPython import use, pinMode, digitalWrite, wait, analogRead, arduinoEsp32

use(arduinoEsp32())

@when_green_flag_clicked
def pattern():
    # Setup pins
    pinMode(2, "OUTPUT")   # LED
    pinMode(4, "INPUT")    # Button
    pinMode(34, "INPUT")   # Temperature sensor
    
    # Main loop
    while True:
        # Read button
        button = digitalRead(4)
        
        # Read temperature
        temp = analogRead(34)
        voltage = temp * 3.3 / 4095
        
        # Print to serial
        serialPrint(f"Temp: {voltage:.2f}V, Button: {button}")
        serialPrintln()
        
        # LED pattern
        digitalWrite(2, True)
        wait(0.5)
        digitalWrite(2, False)
        wait(0.5)
```

**Upload Mode (Micro:bit - Matrix Display):**
```python
from micropython import machine
import time

# Setup LED matrix
leds = machine.LED(matrix)

def display_message(text):
    for char in text:
        if char == ' ':
            leds.clear()
        else:
            leds.show(ord(char))
        time.sleep(0.1)

def blink_led(pin, duration):
    machine.Pin(pin, machine.Pin.OUT).value(1)
    time.sleep(duration)
    machine.Pin(pin, machine.Pin.OUT).value(0)

# Main
display_message("Hello!")
time.sleep(2)
display_message("Python!")
```

### Workflow Rekomendasi

#### Belajar Baru
```
1. Realtime Mode → Belajar dasar Python
2. Upload Mode → Flash MicroPython ke board
3. REPL Mode → Test kode interaktif
4. Upload & Run → Jalankan kode di hardware
```

#### Debugging
```
1. Lihat error di tab Error
2. Buka REPL untuk inspection
3. Print nilai variabel
4. Upload kode yang diperbaiki
5. Test di hardware
```

#### Development
```
1. Tulis kode di editor
2. Test di Realtime Mode
3. Upload ke REPL untuk debugging
4. Upload & Run untuk final testing
5. Upload Only untuk deployment
```

---

## 6. 🔧 Troubleshooting

### Masalah Umum & Solusi

#### "Device not connected"
**Penyebab:**
- Kabel USB rusak
- Driver tidak terinstall
- Port USB tidak aktif

**Solusi:**
1. Ganti kabel USB
2. Install driver (CH340 untuk ESP32, FTDI untuk Micro:bit)
3. Cek Device Manager (Windows) / System Information (Mac/Linux)
4. Coba port USB lain

#### "Timeout waiting for MicroPython prompt"
**Penyebab:**
- Baudrate tidak cocok
- Board tidak merespon
- Kabel serial rusak

**Solusi:**
1. Cek baudrate di settings (default 115200 untuk ESP32, 9600 untuk Micro:bit)
2. Pastikan firmware MicroPython sudah terinstall
3. Coba kabel serial yang berbeda
4. Restart board

#### "Flash Firmware failed"
**Penyebab:**
- Board tidak terdeteksi
- Voltage tidak cukup
- Boot mode salah

**Solusi:**
1. Pastikan board terhubung dengan baik
2. Untuk ESP32, tekan tombol BOOT saat connect
3. Gunakan power supply terpisah (jika ada)
4. Cek log error di terminal

#### "Syntax error"
**Penyebab:**
- Kurang indentasi (Python butuh indentasi!)
- Kurang tanda titik koma
- Nama variabel salah

**Solusi:**
1. Gunakan tab/spasi konsisten (4 spasi)
2. Cek tanda kurung: `(` harus ada `)`
3. Cek tanda kutip: `'` harus ada `'`
4. Gunakan Auto-format di editor

#### "Import error"
**Penyebab:**
- Library tidak ada di board
- Nama library salah
- Import order salah

**Solusi:**
1. Untuk library standar: `import machine`, `import time`, `import random`
2. Untuk library custom: upload file `.py` dulu via REPL
3. Cek spelling nama library

### Checklist Koneksi

#### ESP32
- [ ] Driver CH340/CP2102 terinstall
- [ ] Kabel USB terhubung
- [ ] Port COM/USB-SERIAL terdeteksi
- [ ] Baudrate 115200
- [ ] Firmware MicroPython terinstall
- [ ] Tombol BOOT ditekan (untuk flash)

#### Micro:bit V2
- [ ] Kabel USB-C terhubung
- [ ] Port COM terdeteksi
- [ ] Baudrate 9600
- [ ] Firmware MicroPython terinstall
- [ ] LED berkedip saat connect (jika ada)

#### Raspberry Pi Pico
- [ ] Mode USB Drive aktif
- [ ] File `boot.py` dan `code.py` di drive
- [ ] Copy file ke board
- [ ] Board otomatis boot kode

### Tips Maintenance

#### Update Firmware
```bash
# Untuk ESP32 via esptool (dari command line)
esptool.py --port COM3 --baud 115200 write_flash 0x1000 firmware.bin

# Untuk Micro:bit via microbit-python
microbit-python flash main.py
```

#### Backup Kode
1. Export project dari Python IDE
2. Simpan file JSON di tempat aman
3. Version control dengan Git

#### Reset Board
- **Soft reset**: Ctrl+D di REPL
- **Hard reset**: Cabut dan pasang USB lagi
- **Factory reset**: Tahan tombol reset 10 detik

---

## 🔧 Troubleshooting untuk Siswa SD

### "Warna Kuning/Orange di Editor"
**Artinya:** Ada error syntax!

**Penyebab:**
- Kurang indentasi (spasi/tab)
- Kurang tanda kurung `(` atau `)`
- Kurang tanda kutip `'` atau `"`

**Cara Fix:**
1. Klik kanan → **Auto-format**
2. Atau perbaiki manual:
   ```python
   # ❌ Salah (kurang kurung)
   print("Hello"
   
   # ✅ Benar
   print("Hello")
   
   # ❌ Salah (kurang kurung tutup)
   if x > 5:
       print("Besar")
   
   # ✅ Benar
   if x > 5:
       print("Besar")
   ```

### "Device not connected"
**Artinya:** Board belum terhubung dengan komputer

**Cara Fix:**
1. Cek kabel USB sudah masuk?
2. Coba port USB lain
3. Install driver (lihat di Troubleshooting lengkap)
4. Untuk ESP32: tekan tombol BOOT saat connect

### "SyntaxError: invalid indent"
**Artinya:** Python butuh indentasi (spasi/tab) yang benar!

**Cara Fix:**
```python
# ❌ Salah
if x > 5:
print("Besar")

# ✅ Benar (pakai 4 spasi)
if x > 5:
    print("Besar")
```

**Tips:** Gunakan **Tab** atau **4 spasi** untuk indentasi!

### "NameError: name 'x' is not defined"
**Artinya:** Variabel `x` belum dibuat

**Cara Fix:**
```python
# ❌ Salah
print(x)  # x belum dibuat!

# ✅ Benar
x = 10
print(x)
```

### "ImportError"
**Artinya:** Library tidak ditemukan

**Cara Fix:**
```python
# Untuk library standar (sudah ada):
import math
import random
import time

# Untuk library custom:
# 1. Upload file .py via REPL
# 2. Atau install via pip (untuk desktop mode)
```

### "Timeout waiting for MicroPython prompt"
**Artinya:** Board tidak merespon

**Cara Fix:**
1. Restart board (cabut USB, pasang lagi)
2. Cek kabel serial
3. Ganti baudrate (115200 → 9600 atau sebaliknya)
4. Flash ulang firmware MicroPython

---

## 🔧 Troubleshooting untuk Mahasiswa

### "ModuleNotFoundError: No module named 'x'"
**Penyebab:** Library belum terinstall

**Solusi:**
```python
# Install library
import sys
sys.path.append('/path/to/library')

# Atau via pip (desktop mode)
# pip install numpy pandas
```

### "Connection refused / Device not responding"
**Penyebab:** Board tidak connect atau baudrate salah

**Solusi:**
```python
# 1. Cek connection di Python IDE
# 2. Ganti baudrate di settings
# 3. Tambahkan delay untuk stabilisasi
import time
time.sleep(1)  # Tunggu 1 detik sebelum akses hardware
```

### "RuntimeError: Device already in use"
**Penyebab:** Device sedang digunakan oleh kode lain

**Solusi:**
```python
# Clear device sebelum pakai
clear_device()

# Atau gunakan device baru
use(arduinoNano())  # Ganti device
```

### "IndentationError: expected an indented block"
**Penyebab:** Kurang indentasi setelah `if`, `for`, `def`, dll

**Solusi:**
```python
# ❌ Salah
if x > 5:
print("Besar")

# ✅ Benar
if x > 5:
    print("Besar")  # 4 spasi
```

### "TypeError: 'int' object is not subscriptable"
**Penyebab:** Coba index number seperti string/list

**Solusi:**
```python
# ❌ Salah
x = 10
print(x[0])  # Number tidak bisa di-index

# ✅ Benar
x = [1, 2, 3]
print(x[0])  # List bisa di-index
```

### "ValueError: invalid literal for int() with base 10"
**Penyebab:** Convert string ke int gagal

**Solusi:**
```python
# ❌ Salah
x = "abc"
y = int(x)  # Gagal!

# ✅ Benar
try:
    y = int(x)
except ValueError:
    print("Masukkan angka!")
```

---

## 💡 Tips Debugging

### 1. Gunakan print() untuk debugging
```python
print(f"Debug: x = {x}")
print(f"Debug: y = {y}")
print(f"Debug: result = {result}")
```

### 2. Gunakan REPL untuk inspection
```python
# Di REPL
>>> x
10
>>> y
20
>>> x + y
30
```

### 3. Tambahkan comment untuk penjelasan
```python
# Hitung luas persegi panjang
panjang = 10
lebar = 5
luas = panjang * lebar
print(f"Luas = {luas}")  # Output: Luas = 50
```

### 4. Gunakan try-except untuk error handling
```python
try:
    angka = int(input("Masukkan angka: "))
    hasil = 100 / angka
    print(f"Hasil: {hasil}")
except ZeroDivisionError:
    print("Tidak bisa bagi dengan 0!")
except ValueError:
    print("Masukkan angka yang valid!")
```

---

## 📞 Kontak & Dukungan

Jika ada masalah atau pertanyaan:
- 📧 Email: support@nomopro.com
- 💬 Discord: https://discord.gg/nomopro
- 📚 Dokumentasi: https://docs.nomopro.com

---

## 📚 Appendix A: Built-in Functions Reference

### 🎯 Fungsi untuk Sprite Control (Pergerakan & Aksi)

| Fungsi | Deskripsi | Contoh |
|--------|-----------|--------|
| `move(value)` | Bergerak `value` langkah ke arah yang dituju | `move(10)` |
| `goto(x, y)` | Pindah ke koordinat (x, y) | `goto(100, 200)` |
| `turn_right(value)` | Putar kanan `value` derajat | `turn_right(90)` |
| `turn_left(value)` | Putar kiri `value` derajat | `turn_left(45)` |
| `point(direction)` | Arahkan ke sudut tertentu | `point(90)` (ke kanan) |
| `x_position()` | Ambil posisi X saat ini | `print(x_position())` |
| `y_position()` | Ambil posisi Y saat ini | `print(y_position())` |
| `direction()` | Ambil arah saat ini (0-360°) | `print(direction())` |

**Contoh:**
```python
# Sprite bergerak dalam lingkaran
for i in range(4):
    move(50)
    turn_right(90)
```

---

### 🎨 Fungsi untuk Costume & Backdrop

| Fungsi | Deskripsi | Contoh |
|--------|-----------|--------|
| `switch_costume(name)` | Ganti costume sprite | `switch_costume("running")` |
| `next_costume()` | Pindah ke costume berikutnya | `next_costume()` |
| `switch_backdrop_to(name)` | Ganti backdrop stage | `switch_backdrop_to("background2")` |
| `next_backdrop()` | Pindah ke backdrop berikutnya | `next_backdrop()` |
| `show()` | Tampilkan sprite/backdrop | `show()` |
| `hide()` | Sembunyikan sprite/backdrop | `hide()` |

**Contoh:**
```python
# Animasi berjalan
for i in range(3):
    move(10)
    switch_costume(f"run{i+1}")
```

---

### 🔊 Fungsi untuk Suara & Efek

| Fungsi | Deskripsi | Contoh |
|--------|-----------|--------|
| `play_sound(name)` | Putar suara | `play_sound("laugh")` |
| `set_effect(effect, value)` | Set efek (color, blur, etc) | `set_effect("color", 50)` |
| `change_effect(effect, value)` | Ubah efek | `change_effect("blur", 10)` |
| `clear_effects()` | Hapus semua efek | `clear_effects()` |

**Contoh:**
```python
# Animasi dengan efek
switch_costume("magic")
set_effect("color", 100)
play_sound("magic")
wait(1)
clear_effects()
```

---

### ✏️ Fungsi untuk Pen (Tinta)

| Fungsi | Deskripsi | Contoh |
|--------|-----------|--------|
| `pen_down()` | Turunkan pensil | `pen_down()` |
| `pen_up()` | Angkat pensil | `pen_up()` |
| `set_pen_color(color)` | Set warna pensil | `set_pen_color("red")` |
| `change_pen_size(delta)` | Ubah ukuran pensil | `change_pen_size(5)` |
| `set_pen_size(size)` | Set ukuran pensil | `set_pen_size(10)` |
| `pen_clear()` | Bersihkan semua jejak | `pen_clear()` |
| `pen_stamp()` | Tempatkan sprite tanpa jejak | `pen_stamp()` |

**Contoh:**
```python
# Gambar kotak
pen_down()
set_pen_color("blue")
for i in range(4):
    move(100)
    turn_right(90)
pen_up()
pen_clear()
```

---

### ⏱️ Fungsi untuk Waktu & Tunggu

| Fungsi | Deskripsi | Contoh |
|--------|-----------|--------|
| `wait(seconds)` | Tunggu `seconds` detik | `wait(2)` |
| `timer()` | Ambil waktu sejak start | `print(timer())` |
| `reset_timer()` | Reset timer | `reset_timer()` |

**Contoh:**
```python
# Tunggu sebelum lanjut
move(100)
wait(1)
hide()
```

---

### 🎭 Fungsi untuk Event Handler

| Fungsi | Deskripsi | Contoh |
|--------|-----------|--------|
| `when_green_flag_clicked(handler)` | Jalankan saat flag hijau diklik | `@when_green_flag_clicked\ndef run():` |
| `when_key_pressed(key)` | Jalankan saat tombol ditekan | `@when_key_pressed("space")` |
| `when_this_sprite_clicked(handler)` | Jalankan saat sprite diklik | `@when_this_sprite_clicked\ndef on_click():` |
| `when_stage_clicked(handler)` | Jalankan saat stage diklik | `@when_stage_clicked\ndef on_stage():` |
| `when_backdrop_switches_to(name)` | Saat backdrop berubah | `@when_backdrop_switches_to("bg2")` |
| `when_i_receive(message)` | Saat broadcast diterima | `@when_i_receive("hello")` |

**Contoh:**
```python
@when_green_flag_clicked
def run():
    move(100)
    say("Hello!")
    wait(2)
```

---

### 📢 Fungsi untuk Broadcast & Clone

| Fungsi | Deskripsi | Contoh |
|--------|-----------|--------|
| `broadcast(message)` | Kirim broadcast | `broadcast("start")` |
| `broadcast_and_wait(message)` | Kirim dan tunggu | `broadcast_and_wait("done")` |
| `create_clone(option)` | Buat clone sprite | `create_clone()` |
| `delete_clone()` | Hapus clone | `delete_clone()` |

**Contoh:**
```python
# Broadcast ke semua sprite
broadcast("start_animation")

# Buat 5 clone
for i in range(5):
    create_clone()
    wait(1)
```

---

### 🎲 Fungsi untuk Sensor & Input

| Fungsi | Deskripsi | Contoh |
|--------|-----------|--------|
| `ask(question)` | Tampilkan dialog tanya | `answer = ask("Nama?")` |
| `touching(target)` | Cek sentuh target lain | `if touching("cat"): ...` |
| `touching_color(color)` | Cek sentuh warna | `if touching_color("red"): ...` |
| `key_pressed(key)` | Cek tombol ditekan | `if key_pressed("space"): ...` |
| `mouse_down()` | Cek mouse ditekan | `if mouse_down(): ...` |
| `mouse_x()` | Ambil posisi mouse X | `print(mouse_x())` |
| `mouse_y()` | Ambil posisi mouse Y | `print(mouse_y())` |

**Contoh:**
```python
# Game tebak angka
answer = ask("Tebak angka 1-10!")
if int(answer) == 7:
    say("Benar!")
```

---

### 📋 Fungsi untuk Variable & List

| Fungsi | Deskripsi | Contoh |
|--------|-----------|--------|
| `variable(name, default=0)` | Ambil variable | `score = variable("score")` |
| `set_variable(name, value)` | Set variable | `set_variable("score", 10)` |
| `change_variable_by(name, delta)` | Tambah variable | `change_variable_by("score", 5)` |
| `list_value(name)` | Ambil list | `items = list_value("fruits")` |
| `add_to_list(item, name)` | Tambah ke list | `add_to_list("apple", "fruits")` |
| `item_of_list(index, name)` | Ambil item ke-n | `first = item_of_list(1, "fruits")` |
| `length_of_list(name)` | Panjang list | `print(length_of_list("fruits"))` |
| `delete_of_list(index, name)` | Hapus item ke-n | `delete_of_list(1, "fruits")` |
| `delete_all_of_list(name)` | Hapus semua list | `delete_all_of_list("fruits")` |

**Contoh:**
```python
# List buah
add_to_list("apple", "fruits")
add_to_list("banana", "fruits")
add_to_list("orange", "fruits")
print(f"Ada {length_of_list('fruits')} buah!")
```

---

### 📡 Fungsi untuk Device Control (Hardware)

| Fungsi | Deskripsi | Contoh |
|--------|-----------|--------|
| `use(device)` | Set device aktif | `use(arduinoUno())` |
| `pinMode(pin, mode)` | Set pin (INPUT/OUTPUT) | `pinMode(2, "OUTPUT")` |
| `digitalWrite(pin, value)` | Set pin HIGH/LOW | `digitalWrite(2, True)` |
| `digitalRead(pin)` | Baca pin digital | `val = digitalRead(3)` |
| `analogWrite(pin, value)` | PWM 0-255 | `analogWrite(9, 128)` |
| `analogRead(pin)` | Baca analog 0-4095 | `val = analogRead(A0)` |
| `servoWrite(pin, angle)` | Set servo 0-180° | `servoWrite(9, 90)` |
| `serialPrint(text)` | Kirim via serial | `serialPrint("Hello")` |
| `serialPrintln(text)` | Kirim + newline | `serialPrintln("Done")` |

**Contoh:**
```python
# Kontrol LED
use(arduinoUno())
pinMode(13, "OUTPUT")
digitalWrite(13, True)
wait(2)
digitalWrite(13, False)
```

---

### 🎮 Fungsi untuk Scratch Extension

| Fungsi | Deskripsi | Contoh |
|--------|-----------|--------|
| `green_flag()` | Jalankan semua handler | `green_flag()` |
| `trigger_key_pressed(key)` | Trigger key event | `trigger_key_pressed("a")` |
| `trigger_sprite_clicked()` | Trigger sprite click | `trigger_sprite_clicked()` |
| `trigger_stage_clicked()` | Trigger stage click | `trigger_stage_clicked()` |
| `trigger_backdrop_switch(name)` | Trigger backdrop | `trigger_backdrop_switch("bg2")` |
| `load_device(device_id, type)` | Load device extension | `load_device("esp32", "arduino")` |
| `clear_device()` | Clear device | `clear_device()` |

---

### 🎵 Fungsi untuk Music Extension

| Fungsi | Deskripsi | Contoh |
|--------|-----------|--------|
| `play_drum(drum, beats)` | Main drum | `play_drum(1, 0.5)` |
| `play_note(note, beats)` | Main not dengan durasi | `play_note(60, 0.5)` |
| `rest(beats)` | Diam `beats` ketukan | `rest(0.5)` |
| `set_instrument(instrument)` | Pilih instrumen (0-20) | `set_instrument(1)` |
| `set_tempo(tempo)` | Set tempo BPM | `set_tempo(120)` |
| `change_tempo_by(delta)` | Ubah tempo ±BPM | `change_tempo_by(20)` |
| `get_tempo()` | Ambil tempo saat ini | `print(get_tempo())` |

> **get_tempo()** hanya return nilai asli di Desktop mode. Di Web return `None`.

**Contoh:**
```python
# Main lagu sederhana
set_instrument(1)        # Piano
set_tempo(120)           # 120 BPM
play_note(60, 0.5)       # C4
play_note(64, 0.5)       # E4
play_note(67, 0.5)       # G4
play_drum(1, 1)          # Snare
```

---

### 🔊 Fungsi untuk Text to Speech (TTS)

| Fungsi | Deskripsi | Contoh |
|--------|-----------|--------|
| `speak(text)` | Ucapkan teks | `speak("Hello!")` |
| `set_voice(voice)` | Pilih suara (alto/tenor/soprano) | `set_voice("alto")` |
| `set_speech_language(lang)` | Pilih bahasa (id/en/ja/dll) | `set_speech_language("id")` |

**Contoh:**
```python
# Sapaan multi-bahasa
set_voice("alto")
set_speech_language("id")
speak("Halo, selamat datang!")
set_speech_language("en")
speak("Hello, welcome!")
```

---

### 🎥 Fungsi untuk Video Sensing

| Fungsi | Deskripsi | Contoh |
|--------|-----------|--------|
| `video_toggle(state)` | Nyalakan/matikan kamera | `video_toggle("on")` |
| `set_video_transparency(value)` | Atur transparansi video (0-100) | `set_video_transparency(50)` |

**Contoh:**
```python
# Kamera sebagai background
video_toggle("on")
set_video_transparency(30)
wait(5)
video_toggle("off")
```

---

### 🖐️ Fungsi untuk Hand Pose Extension

| Fungsi | Deskripsi | Contoh |
|--------|-----------|--------|
| `handpose_video(state)` | Nyalakan/matikan deteksi tangan | `handpose_video("on")` |
| `handpose_get_x(index)` | Posisi X landmark ke-n (0-20) | `x = handpose_get_x(0)` |
| `handpose_get_y(index)` | Posisi Y landmark ke-n | `y = handpose_get_y(0)` |
| `handpose_get_z(index)` | Posisi Z landmark ke-n | `z = handpose_get_z(0)` |
| `handpose_video_toggle(state)` | Toggle video handpose | `handpose_video_toggle("on")` |
| `handpose_set_video_transparency(value)` | Transparansi handpose video | `handpose_set_video_transparency(30)` |

> **handpose_get_x/y/z()** hanya return nilai asli di Desktop mode. Di Web return `None`.

**Contoh:**
```python
# Deteksi posisi ujung jari
handpose_video("on")
x = handpose_get_x(8)    # Ujung jari telunjuk
y = handpose_get_y(8)
print(f"Jari di ({x}, {y})")
```

---

### 🎤 Fungsi untuk Speech to Text Extension

| Fungsi | Deskripsi | Contoh |
|--------|-----------|--------|
| `listen()` | Rekam suara (blocking) | `listen()` |
| `get_speech()` | Ambil hasil transkripsi | `text = get_speech()` |

> **get_speech()** hanya return nilai asli di Desktop mode. Di Web return `None`.

**Contoh:**
```python
# Voice command
say("Katakan sesuatu!")
listen()
command = get_speech()
say(f"Kamu bilang: {command}")
```

---

### 🌐 Fungsi untuk Translate Extension

| Fungsi | Deskripsi | Contoh |
|--------|-----------|--------|
| `translate_text(text)` | Terjemahkan teks | `result = translate_text("Hello")` |
| `get_viewer_language()` | Ambil bahasa viewer | `lang = get_viewer_language()` |

> Kedua fungsi ini **hanya return nilai asli di Desktop mode**. Di Web return `None`.

**Contoh:**
```python
# Terjemahan otomatis
lang = get_viewer_language()
print(f"Bahasa viewer: {lang}")
terjemahan = translate_text("Hello")
say(terjemahan)
```

---

### 🤖 Fungsi untuk OB2Scratch Extension (Object Detection)

| Fungsi | Deskripsi | Contoh |
|--------|-----------|--------|
| `ob2_analyse()` | Analisis frame kamera | `ob2_analyse()` |
| `ob2_get_count()` | Jumlah objek terdeteksi | `count = ob2_get_count()` |
| `ob2_get_x(n)` | Posisi X objek ke-n | `x = ob2_get_x(0)` |
| `ob2_get_y(n)` | Posisi Y objek ke-n | `y = ob2_get_y(0)` |
| `ob2_get_width(n)` | Lebar objek ke-n | `w = ob2_get_width(0)` |
| `ob2_get_height(n)` | Tinggi objek ke-n | `h = ob2_get_height(0)` |
| `ob2_get_category(n)` | Label objek ke-n | `label = ob2_get_category(0)` |
| `ob2_is_detected(n)` | Cek objek ke-n terdeteksi | `if ob2_is_detected(0):` |

> Fungsi **get_*** dan **is_detected** hanya return nilai asli di Desktop mode. **ob2_analyse()** work di semua mode.

**Contoh:**
```python
# Deteksi objek real-time
video_toggle("on")
ob2_analyse()
count = ob2_get_count()
for i in range(count):
    x = ob2_get_x(i)
    y = ob2_get_y(i)
    label = ob2_get_category(i)
    print(f"Objek {i}: {label} di ({x}, {y})")
```

---

### 🧠 Fungsi untuk Machine Learning Extension

| Fungsi | Deskripsi | Contoh |
|--------|-----------|--------|
| `ml_add_example1(label)` | Tambah contoh ke class 1 | `ml_add_example1("rock")` |
| `ml_add_example2(label)` | Tambah contoh ke class 2 | `ml_add_example2("paper")` |
| `ml_add_example3(label)` | Tambah contoh ke class 3 | `ml_add_example3("scissors")` |
| `ml_add_example4(label)` | Tambah contoh ke class 4 | `ml_add_example4("spock")` |
| `ml_add_example5(label)` | Tambah contoh ke class 5 | `ml_add_example5("lizard")` |
| `ml_train()` | Latih model | `ml_train()` |
| `ml_classify()` | Klasifikasikan input | `ml_classify()` |
| `ml_get_label()` | Ambil label hasil klasifikasi | `label = ml_get_label()` |
| `ml_get_count()` | Jumlah class terlatih | `count = ml_get_count()` |
| `ml_set_confidence(threshold)` | Set threshold confidence | `ml_set_confidence(0.8)` |
| `ml_get_confidence()` | Ambil confidence | `conf = ml_get_confidence()` |
| `ml_clear()` | Reset semua contoh | `ml_clear()` |
| `ml_when_example1_labeled()` | Event example 1 labeled | (HAT - otomatis) |
| `ml_when_example2_labeled()` | Event example 2 labeled | (HAT - otomatis) |
| `ml_when_example3_labeled()` | Event example 3 labeled | (HAT - otomatis) |
| `ml_when_example4_labeled()` | Event example 4 labeled | (HAT - otomatis) |
| `ml_when_example5_labeled()` | Event example 5 labeled | (HAT - otomatis) |
| `ml_when_classify_done()` | Event klasifikasi selesai | (HAT - otomatis) |

> Fungsi **get_*** hanya return nilai asli di Desktop mode. **add_example**, **train**, **classify**, **clear** work di semua mode.

**Contoh:**
```python
# Training model sederhana
ml_add_example1("gunting")
ml_add_example1("gunting")
ml_add_example2("batu")
ml_add_example2("batu")
ml_train()
ml_classify()
label = ml_get_label()
say(f"Hasil: {label}")
```

---

### 📸 Fungsi untuk TM2Scratch Extension (Image Classification)

| Fungsi | Deskripsi | Contoh |
|--------|-----------|--------|
| `tm2_classify_image()` | Klasifikasikan gambar kamera | `tm2_classify_image()` |
| `tm2_get_label(n)` | Ambil label class ke-n (0-2) | `label = tm2_get_label(0)` |
| `tm2_get_confidence(n)` | Ambil confidence class ke-n | `conf = tm2_get_confidence(0)` |
| `tm2_set_threshold(threshold)` | Set threshold | `tm2_set_threshold(0.8)` |
| `tm2_get_threshold()` | Ambil threshold | `th = tm2_get_threshold()` |
| `tm2_get_class_n(n)` | Ambil label + confidence class ke-n | `data = tm2_get_class_n(0)` |
| `tm2_analyze_frame()` | Analisis frame (mirip classify) | `tm2_analyze_frame()` |
| `tm2_get_image_width()` | Lebar gambar | `w = tm2_get_image_width()` |
| `tm2_get_image_height()` | Tinggi gambar | `h = tm2_get_image_height()` |
| `tm2_get_image_x()` | Posisi X gambar | `x = tm2_get_image_x()` |
| `tm2_get_image_y()` | Posisi Y gambar | `y = tm2_get_image_y()` |
| `tm2_set_label(n, label)` | Set label class ke-n | `tm2_set_label(0, "kucing")` |
| `tm2_set_model(model)` | Set model URL/path | `tm2_set_model("model.json")` |
| `tm2_load_model()` | Load model | `tm2_load_model()` |
| `tm2_when_classify_done()` | Event klasifikasi selesai | (HAT - otomatis) |
| `tm2_when_image_loaded()` | Event gambar selesai load | (HAT - otomatis) |

> Fungsi **get_*** hanya return nilai asli di Desktop mode. **classify**, **analyze_frame**, **set_model**, **load_model** work di semua mode.

**Contoh:**
```python
# Klasifikasi gambar dengan Teachable Machine
tm2_set_model("https://storage.googleapis.com/model.json")
tm2_load_model()
tm2_classify_image()
for i in range(3):
    label = tm2_get_label(i)
    conf = tm2_get_confidence(i)
    print(f"Class {i}: {label} ({conf:.2%})")
```

---

### 🧍 Fungsi untuk TMPose2Scratch Extension (Pose Classification)

| Fungsi | Deskripsi | Contoh |
|--------|-----------|--------|
| `tmpose_classify()` | Klasifikasikan pose | `tmpose_classify()` |
| `tmpose_get_label(n)` | Ambil label pose ke-n | `label = tmpose_get_label(0)` |
| `tmpose_get_confidence(n)` | Ambil confidence pose ke-n | `conf = tmpose_get_confidence(0)` |
| `tmpose_set_threshold(threshold)` | Set threshold | `tmpose_set_threshold(0.8)` |
| `tmpose_get_threshold()` | Ambil threshold | `th = tmpose_get_threshold()` |
| `tmpose_get_class_n(n)` | Ambil label + confidence | `data = tmpose_get_class_n(0)` |
| `tmpose_analyze_frame()` | Analisis frame pose | `tmpose_analyze_frame()` |
| `tmpose_set_label(n, label)` | Set label pose ke-n | `tmpose_set_label(0, "duduk")` |
| `tmpose_set_model(model)` | Set model URL/path | `tmpose_set_model("model.json")` |
| `tmpose_load_model()` | Load model pose | `tmpose_load_model()` |
| `tmpose_when_classify_done()` | Event klasifikasi selesai | (HAT - otomatis) |

> Fungsi **get_*** hanya return nilai asli di Desktop mode. **classify**, **analyze_frame**, **set_model**, **load_model** work di semua mode.

**Contoh:**
```python
# Klasifikasi pose tubuh
tmpose_set_model("pose_model.json")
tmpose_load_model()
tmpose_classify()
label = tmpose_get_label(0)
conf = tmpose_get_confidence(0)
say(f"Pose: {label} ({conf:.0%})")
```

---

## 📋 Quick Reference Card (Printable)

### 🚀 Mode Selection

| Mode | Gunakan Untuk | Butuh Hardware? |
|------|---------------|-----------------|
| **Upload** | Flash firmware ke board baru | ✅ Ya |
| **Realtime** | Testing kode cepat, belajar dasar | ❌ Tidak |
| **REPL** | Debugging, test interaktif | ✅ Ya |

### 📦 Built-in Functions Summary

Python IDE ini dilengkapi **200+ built-in functions** dalam 15 kategori utama:

#### 1. Movement (Pergerakan)
```python
move(50)              # Bergerak 50 langkah
goto(100, 200)        # Pindah ke koordinat
turn_right(90)        # Putar kanan 90°
turn_left(45)         # Putar kiri 45°
point(90)             # Arah ke kanan (0-360°)
x_position()          # Ambil posisi X
y_position()          # Ambil posisi Y
direction()           # Ambil arah (0-360°)
```

#### 2. Appearance (Tampilan)
```python
switch_costume("running")     # Ganti costume
next_costume()                # Costume berikutnya
switch_backdrop_to("bg2")     # Ganti backdrop
next_backdrop()               # Backdrop berikutnya
show()                        # Tampilkan
hide()                        # Sembunyikan
```

#### 3. Pen Drawing (Menulis Gambar)
```python
pen_down()           # Turunkan pensil
pen_up()             # Angkat pensil
set_pen_color("red") # Set warna
change_pen_size(5)   # Ubah ukuran
pen_clear()          # Bersihkan semua
pen_stamp()          # Tempatkan sprite tanpa jejak
```

#### 4. Sound & Effects (Suara & Efek)
```python
play_sound("laugh")       # Putar suara
set_effect("color", 50)   # Set efek warna
change_effect("blur", 10) # Ubah efek blur
clear_effects()           # Hapus semua efek
```

#### 5. Time & Waiting (Waktu)
```python
wait(2)          # Tunggu 2 detik
timer()          # Ambil waktu sejak start
reset_timer()    # Reset timer
```

#### 6. Events (Peristiwa)
```python
@when_green_flag_clicked
def run():
    move(100)

@when_key_pressed("space")
def jump():
    move(30)

@when_i_receive("message")
def on_broadcast():
    say("Got it!")

@when_this_sprite_clicked
def on_click():
    say("Clicked!")
```

#### 7. Variables & Lists (Variabel & List)
```python
score = variable("score", 0)
set_variable("score", 10)
change_variable_by("score", 5)

add_to_list("apple", "fruits")
items = list_value("fruits")
length = length_of_list("fruits")
first_item = item_of_list(1, "fruits")
```

#### 8. Device Control (Hardware)
```python
use(arduinoUno())

pinMode(13, "OUTPUT")
digitalWrite(13, True)    # Nyalakan LED
digitalRead(13)           # Baca pin

analogRead(A0)            # Baca sensor
servoWrite(9, 90)         # Set servo

serialPrint("Hello")      # Kirim serial
```

#### 9. Music & Speech (Musik & Suara)
```python
play_drum(1, 0.5)              # Main drum 0.5 detik
play_note(60, 0.5)             # Main note C4
set_instrument(1)              # Ganti instrumen piano
set_tempo(120)                 # Set tempo 120 BPM
speak("Hello")                 # Text to speech
set_voice("alto")              # Ganti suara TTS
set_speech_language("id")      # Ganti bahasa TTS
listen()                       # Merekam suara
```

#### 10. Video Sensing (Video)
```python
video_toggle("on")             # Nyalakan kamera
set_video_transparency(50)     # Atur transparansi
```

#### 11. Hand Pose (Tangan)
```python
handpose_video("on")           # Nyalakan deteksi tangan
handpose_get_x(0)              # Posisi X jari ke-0
handpose_get_y(0)              # Posisi Y jari ke-0
handpose_get_z(0)              # Posisi Z jari ke-0
```

#### 12. AI / ML (Kecerdasan Buatan)
```python
ob2_analyse()                  # Analisis objek
tm2_classify_image()           # Klasifikasi gambar
tmpose_classify()              # Klasifikasi pose
ml_train()                     # Latih model
ml_add_example1("label")       # Tambah contoh
```

### ⌨️ Keyboard Shortcuts

| Shortcut | Fungsi |
|----------|--------|
| **Enter** | Jalankan kode |
| **Ctrl+C** | Interrupt (REPL) |
| **Ctrl+D** | Soft reset board |
| **Ctrl+E** | Paste mode (REPL) |
| **↑/↓** | History command |

### 🛠️ Common Errors & Fixes

| Error | Solusi |
|-------|--------|
| `Device not connected` | Cek kabel USB, install driver |
| `Timeout waiting for prompt` | Cek baudrate, restart board |
| `SyntaxError: invalid indent` | Tambah 4 spasi di dalam blok |
| `NameError: name 'x' is not defined` | Deferensikan variabel dulu |
| `ImportError` | Upload library via REPL |

### 📱 Baudrate Settings

| Device | Baudrate |
|--------|----------|
| ESP32 | 115200 |
| Micro:bit V2 | 9600 |
| Arduino Uno | 9600 |
| Raspberry Pi Pico | 115200 |

### 🔧 Device Functions

```python
# Arduino/ESP32
use(arduinoUno())
use(arduinoEsp32())
use(arduinoNano())

# MicroPython
from micropython import machine
import time

machine.Pin(2, machine.Pin.OUT).value(1)
time.sleep(1)
```

### 📚 Full Reference

Untuk referensi lengkap semua built-in functions, lihat **Appendix A** di akhir dokumentasi.

---

## 🎉 Selamat Belajar!

Python IDE ini dirancang untuk membuat belajar Python dan IoT menjadi menyenangkan! 

**Ingat:**
- ✅ Tidak ada pertanyaan yang bodoh
- ✅ Error adalah bagian dari belajar
- ✅ Konsisten lebih penting daripada cepat
- ✅ Bertanya itu bagus!

**Selamat coding! 🚀**
