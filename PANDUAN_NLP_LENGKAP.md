# Panduan NLP — Dari Nol Sampai Mahir

> **NLP (Natural Language Processing)** = komputer bisa "mengerti" teks manusia.
> Extension ini bisa: analisis sentimen, klasifikasi intent, ekstrak entitas, dan相似度 (similarity).
> Tersedia di **Mode Block** dan **Python IDE** (Desktop-only, Realtime mode).

---

## 📚 Daftar Isi

1. [Apa itu NLP?](#1-apa-itu-nlp)
2. [Mengenal 3 Kemampuan Utama NLP](#2-mengenal-3-kemampuan-utama-nlp)
3. [Daftar Semua Block / Fungsi NLP](#3-daftar-semua-block--fungsi-nlp)
4. [Mode Block — Tutorial](#4-mode-block--tutorial)
   - [Project 1: Chatbot Sederhana (w/ Sample Intents)](#project-1-chatbot-sederhana-w-sample-intents)
   - [Project 2: Analisis Sentimen Review](#project-2-analisis-sentimen-review)
   - [Project 3: Training Intent Sendiri](#project-3-training-intent-sendiri)
   - [Project 4: Ekstraksi Entitas](#project-4-ekstraksi-entitas)
   - [Project 5: Similarity / Kemiripan Teks](#project-5-similarity--kemiripan-teks)
5. [Mode Python IDE — Tutorial](#5-mode-python-ide--tutorial)
   - [Project 6: Python Chatbot (Sentiment + Classify)](#project-6-python-chatbot-sentiment--classify)
   - [Project 7: Training + Export/Import Data](#project-7-training--exportimport-data)
   - [Project 8: Analisis CSV Auto](#project-8-analisis-csv-auto)
   - [Project 9: NLP + Sprite Animation](#project-9-nlp--sprite-animation)
6. [Data Training — Panduan & Template](#6-data-training--panduan--template)
7. [Troubleshooting](#7-troubleshooting)
8. [Glosarium](#8-glosarium)

---

## 1. Apa itu NLP?

**NLP** = cabang AI yang bikin komputer paham bahasa manusia.

### Analogi

Manusia bicara → komputer denger → NLP **ngerti maksudnya**.

| Manusia bilang | Komputer ngerti |
|----------------|-----------------|
| "I love this!" | 😊 Positif |
| "This is bad" | 😠 Negatif |
| "How much?" | ❓ Pertanyaan / Intent `question` |
| "Apple" | 🏢 Organisasi (bukan buah) |
| "Cat" mirip "Dog"? | 🔢 Skor 0.85 (mirip) |

### Di extension ini, NLP punya 4 kemampuan:

| Kemampuan | Guna |
|-----------|------|
| **Sentiment** | Deteksi teks positif/negatif/netral + skor numerik -1.0..1.0 |
| **Classify / Intent** | Kelompokkan teks ke kategori (contoh: greeting, goodbye, question) — COMMAND atau REPORTER |
| **Entities** | Ekstrak nama orang, tempat, organisasi dari teks |
| **Similarity** | Ukur seberapa mirip dua teks (angka 0.0–1.0) |
| **Train** | Ajarin komputer pattern baru dengan contoh-contoh |
| **Remove Intent** | Hapus 1 intent tertentu tanpa reset semua |

---

## 2. Mengenal 4 Kemampuan Utama NLP

### A. Sentiment Analysis

**Apa:** Baca emosi dari teks.

| Input | Output | Artinya |
|-------|--------|---------|
| `"I love this product"` | `positive` | Senang, puas |
| `"This is terrible"` | `negative` | Kecewa, marah |
| `"The sky is blue"` | `neutral` | Fakta, gak ada emosi |

**Guna:** Analisis review, feedback, komentar, chatbot.

### B. Intent Classification

**Apa:** Kelompokkan teks ke kategori. **Harus di-training dulu.**

| Training | Setelah training, input... | Output |
|----------|---------------------------|--------|
| `greeting` ← contoh: "hi, hello, hey" | `"good morning"` | `greeting` ✅ |
| `goodbye` ← contoh: "bye, see you" | `"see you later"` | `goodbye` ✅ |
| *belum ditraining* | `"I like pizza"` | *(kosong)* ❌ |

**Guna:** Chatbot, menu otomatis, filter pesan.

### C. Entities Extraction

**Apa:** Cari nama orang, tempat, organisasi dalam teks.

| Input | Output (JSON) |
|-------|---------------|
| `"Barack Obama visited Paris"` | `[{"text":"Barack","type":"PROPER_NOUN"},{"text":"Obama","type":"PROPER_NOUN"},{"text":"Paris","type":"GPE"}]` |
| `"Apple Inc is in California"` | `[{"text":"Apple","type":"ORG"},{"text":"California","type":"GPE"}]` |
| `"I like pizza"` | `[]` (gak ada entitas) |

**Guna:** Ekstrak informasi dari teks, data mining.

### D. Similarity

**Apa:** Ukur kemiripan makna dua teks (0.0 = beda total, 1.0 = sama persis).

| Teks 1 | Teks 2 | Skor | Arti |
|--------|--------|------|------|
| `"cat"` | `"dog"` | 0.85 | Mirip (sama-sama hewan) |
| `"car"` | `"bicycle"` | 0.72 | Mirip (sama-sama transportasi) |
| `"hello"` | `"world"` | 0.30 | Agak beda |
| `"test"` | `"test"` | 1.00 | Sama persis |

**Guna:** Cari teks mirip, deduplikasi, rekomendasi.

---

## 3. Daftar Semua Block / Fungsi NLP

### Block Mode (Scratch)

| # | Block | Type | Guna |
|---|-------|------|------|
| 1 | `sentiment of [TEXT]` | Reporter | Analisis sentimen |
| 2 | `entities in [TEXT]` | Reporter | Ekstrak entitas |
| 3 | `classify [TEXT]` | Command | Klasifikasi intent (set `last intent` + trigger `when detected`) |
| 4 | `classify result of [TEXT]` | Reporter | Klasifikasi intent, return label langsung (bisa dipake di `set [var] to`, `if`) |
| 5 | `train label [LABEL] with [EXAMPLES]` | Command | Training intent baru |
| 6 | `similarity [TEXT1] [TEXT2]` | Reporter | Ukur kemiripan |
| 7 | `export training data` | Command | Simpan training ke file `.nlp` |
| 8 | `import training data` | Command | Load training dari file `.nlp` |
| 9 | `reset all intents` | Command | Hapus semua training |
| 10 | `remove intent [LABEL]` | Command | Hapus 1 intent tertentu |
| 11 | `when [INTENT] detected` | Hat | Trigger saat `classify` menghasilkan intent tertentu |
| 12 | `last intent` | Reporter | Intent terakhir dari `classify` |
| 13 | `last confidence` | Reporter | Confidence skor terakhir (real, bukan hardcode) |
| 14 | `sentiment score of [TEXT]` | Reporter | Skor sentimen numerik -1.0 (negatif) sampai 1.0 (positif) |
| 15 | `upload csv` | Command | Upload file CSV |
| 16 | `download csv data` | Command | Download data sebagai file CSV |
| 17 | `download csv template` | Command | Download template CSV |
| 18 | `load sample intents` | Command | Auto-load 3 intent contoh (greeting, goodbye, question) |
| 19 | `train from csv` | Command | Training dari file CSV (format: `label,text`) |

### Python IDE

| Fungsi | Guna | Return |
|--------|------|--------|
| `sentiment(text)` | Analisis sentimen | `"positive"` / `"negative"` / `"neutral"` |
| `sentiment_score(text)` | Skor sentimen numerik | Float -1.0..1.0 |
| `classify(text)` | Klasifikasi intent | String label, atau kosong |
| `classify_result(text)` | Klasifikasi intent (return label langsung) | String label, atau kosong |
| `entities(text)` | Ekstrak entitas | JSON string |
| `train(label, examples)` | Training intent baru | `None` |
| `remove_intent(label)` | Hapus 1 intent | `None` |
| `similarity(t1, t2)` | Ukur kemiripan | Float 0.0–1.0 |
| `load_sample_intents()` | Load 3 intent contoh | `None` |
| `export_training()` | Export training ke file | JSON string |
| `import_training()` | Import training dari file | `None` |
| `reset_all()` | Hapus semua training | `None` |

**Import:**
```python
from nomopro_nlp import (
    sentiment, sentiment_score,
    classify, classify_result,
    entities, train, remove_intent, similarity
)
# atau langsung aja (udah global):
sentiment("Hello!")
```

---

## 4. Mode Block — Tutorial

### Project 1: Chatbot Sederhana (w/ Sample Intents)

**Tujuan:** Sprite jawab "hello" dengan salam, "bye" dengan selamat tinggal.

**Langkah:**
1. Add extension NLP
2. Klik **load sample intents** (auto-populate greeting, goodbye, question)
3. Buat script:

```
when green flag clicked
  load sample intents
  forever
    ask [Ada yang bisa dibantu?] and wait
    classify (answer)

when [greeting] detected
  say [Halo! Ada yang bisa saya bantu?] for (2) secs

when [goodbye] detected
  say [Terima kasih, sampai jumpa!] for (2) secs

when [question] detected
  say [Baik, saya cek dulu ya...] for (2) secs
```

**Hasil:**
| Ketik... | Sprite bilang |
|----------|---------------|
| "hello" | "Halo! Ada yang bisa saya bantu?" |
| "good morning" | "Halo! Ada yang bisa saya bantu?" |
| "bye" | "Terima kasih, sampai jumpa!" |
| "what is this?" | "Baik, saya cek dulu ya..." |
| "I like potatoes" | *(diam, gak ada intent cocok)* |

**Data file:** `nlp-chatbot.csv`

---

### Project 2: Analisis Sentimen Review

**Tujuan:** Cek apakah review positif atau negatif.

**Blocks:**
```
when green flag clicked
  ask [Tulis review:] and wait
  set [hasil v] to (sentiment of (answer))
  if <(hasil) = [positive]> then
    say [Senang kamu suka! 😊] for (2) secs
  else
    if <(hasil) = [negative]> then
      say [Maaf atas ketidaknyamanannya] for (2) secs
    else
      say [Terima kasih atas masukannya] for (2) secs
    end
  end
```

**Data file:** `nlp-reviews.csv`

**Contoh isi `nlp-reviews.csv`:**
```csv
text
I love this product, it's amazing
This is terrible, worst experience ever
The food was absolutely delicious
Bad quality, I want a refund
```

---

### Project 3: Training Intent Sendiri

**Tujuan:** Train intent `order` dan `complaint`, lalu klasifikasi.

**Blocks:**
```
when green flag clicked
  reset all intents
  train label [order] with [saya mau pesan,beli dong,saya ingin order,pengen pesan]
  train label [complaint] with [komplain,rusak,tidak puas,minta refund,barang cacat]
  say [Training selesai! Coba tulis sesuatu] for (2) secs

when [order] detected
  say [Baik, mau pesan apa?] for (2) secs

when [complaint] detected
  say [Maaf, kami bantu proses komplain] for (2) secs
```

**Hasil:**
| Input | Output |
|-------|--------|
| "saya mau pesan nasi goreng" | `order` |
| "barangnya rusak" | `complaint` |
| "beli dong" | `order` |

---

### Project 4: Ekstraksi Entitas

**Tujuan:** Ambil nama orang & tempat dari teks.

**Blocks:**
```
when green flag clicked
  ask [Ceritakan sesuatu:] and wait
  set [entitas v] to (entities in (answer))
  say (entitas) for (3) secs
```

Coba input: `"Barack Obama visited Paris last summer"`
Hasil: `[{"text":"Barack","type":"PROPER_NOUN"},{"text":"Obama","type":"PROPER_NOUN"},{"text":"Paris","type":"GPE"}]`

**Penjelasan output:**
- `PROPER_NOUN` = Nama orang
- `GPE` = Geopolitical entity (negara/kota)
- `ORG` = Organisasi

**Data file:** `nlp-entities.csv`

---

### Project 5: Similarity / Kemiripan Teks

**Tujuan:** Cek kata mana yang paling mirip.

**Blocks:**
```
when green flag clicked
  ask [Kata 1:] and wait
  set [kata1 v] to (answer)
  ask [Kata 2:] and wait
  set [kata2 v] to (answer)
  set [skor v] to (similarity (kata1) (kata2))
  say (join (join (kata1) (kata2))) for (2) secs
  say (skor) for (2) secs
```

**Skala:**
| Skor | Arti |
|------|------|
| 0.00–0.30 | Beda |
| 0.30–0.60 | Agak mirip |
| 0.60–0.80 | Mirip |
| 0.80–1.00 | Sangat mirip |
| 1.00 | Sama persis |

---

## 5. Mode Python IDE — Tutorial

### Project 6: Python Chatbot (Sentiment + Classify)

**Tujuan:** Chatbot yang deteksi intent + sentimen.

```python
from nomopro_nlp import sentiment, classify, train

# Training dulu
train("greeting", "hi,hello,hey,good morning,good evening")
train("goodbye", "bye,goodbye,see you,see ya")
train("complaint", "broken,not working,bad quality,refund,terrible")

# Loop chat
while True:
    msg = input("Kamu: ")
    if msg == "quit":
        break

    intent = classify(msg)
    senti = sentiment(msg)
    
    print(f"Intent: {intent}")
    print(f"Sentiment: {senti}")
    
    if intent == "greeting":
        print("Bot: Halo! Ada yang bisa dibantu?")
    elif intent == "goodbye":
        print("Bot: Sampai jumpa!")
    elif intent == "complaint":
        print("Bot: Maaf, kami akan proses komplain Anda")
    else:
        if senti == "positive":
            print("Bot: Senang kamu suka!")
        elif senti == "negative":
            print("Bot: Maaf, kami akan perbaiki")
        else:
            print("Bot: Bisa diulang?")
```

---

### Project 7: Training + Export/Import Data

**Tujuan:** Simpan training ke file, load lagi nanti.

```python
from nomopro_nlp import train, export_training, import_training, reset_all, classify

# Training
train("greeting", "hi,hello,hey")
train("goodbye", "bye,goodbye")

# Tes
print("Sebelum export:", classify("hello"))   # greeting

# Export (simpan sebagai string JSON)
data = export_training()
print("Data training tersimpan:", data[:50] + "..." if len(data) > 50 else data)

# Reset
reset_all()
print("Setelah reset:", classify("hello"))    # (kosong)

# Import balik
import_training()
print("Setelah import:", classify("hello"))   # greeting
```

**Format file `.nlp`:**
```json
{
  "greeting": ["hi", "hello", "hey"],
  "goodbye": ["bye", "goodbye"]
}
```

---

### Project 8: Analisis CSV Auto

**Tujuan:** Baca file CSV review → analisis sentimen tiap baris → print hasil.

**Data file:** `nlp-reviews.csv`

```python
from nomopro_nlp import sentiment
import csv

with open("nlp-reviews.csv", "r") as f:
    reader = csv.reader(f)
    next(reader)  # skip header
    for row in reader:
        text = row[0]
        s = sentiment(text)
        print(f"{s.upper():8s} | {text}")
```

**Output contoh:**
```
POSITIVE | I love this product, it's amazing
NEGATIVE | This is terrible, worst experience ever
POSITIVE | The food was absolutely delicious
NEGATIVE | Bad quality, I want a refund
```

---

### Project 9: NLP + Sprite Animation

**Tujuan:** Gabung NLP dengan gerakan sprite.

```python
from nomopro_nlp import sentiment, classify

train("greeting", "hi,hello,hey")
train("goodbye", "bye,goodbye")

msg = "hello"

# Gerak berdasarkan intent
intent = classify(msg)
if intent == "greeting":
    say("Halo!")
    move(50)
    turn_right(360)  # muter senang
elif intent == "goodbye":
    say("Dadah!")
    move(-50)
    hide()
else:
    senti = sentiment(msg)
    if senti == "positive":
        set_pen_color("green")
        say("😊")
    elif senti == "negative":
        set_pen_color("red")
        say("😢")
    else:
        set_pen_color("gray")
        say("🗿")
```

---

## 6. Data Training — Panduan & Template

### Format Training

Via Block: `train label [LABEL] with [EXAMPLES]`
- `LABEL` = nama kategori (contoh: `greeting`, `order`)
- `EXAMPLES` = contoh teks, dipisah koma
```
train label [greeting] with [hi,hello,hey,good morning,good evening]
```

Via Python: `train(label, examples)`
```python
train("greeting", "hi,hello,hey,good morning,good evening")
```

### Format CSV Training (`nlp-training-data.csv`)

```csv
label,text
greeting,hello
greeting,good morning
greeting,hey there
goodbye,bye
goodbye,see you later
question,what is this
question,how does it work
complaint,this is broken
praise,amazing quality
```

### Format CSV Review (`nlp-reviews.csv`)

```csv
text
I love this product, it's amazing
This is terrible, worst experience ever
The food was absolutely delicious
Bad quality, I want a refund
```

### Template CSV
```
name,age,city
Alice,25,NYC
Bob,30,London
```

### Template Training
```
greeting:hi,hello,hey,good morning
goodbye:bye,goodbye,see you
question:what,how,why,when,where,who
```

### Data Files yang Tersedia

| File | Isi | Guna |
|------|-----|------|
| `nlp-training-data.csv` | 25 baris training (5 label) | Training batch |
| `nlp-training-batch.csv` | Batch training format | Training |
| `nlp-reviews.csv` | 10 review | Analisis sentimen |
| `nlp-feedback.csv` | Feedback pelanggan | Sentimen |
| `nlp-questions.csv` | Pertanyaan | Classify |
| `nlp-entities.csv` | Teks dengan entitas | Entities |
| `nlp-email.csv` | Email sample | Classify |
| `nlp-chatbot.csv` | Percakapan chatbot | Chatbot |
| `nlp-sample-data.csv` | Data campuran | Testing |

---

## 7. Troubleshooting

| Masalah | Penyebab | Solusi |
|---------|----------|--------|
| Sentiment selalu "neutral" | Python backend (spaCy/TextBlob) gak terinstall | Fallback JS dipake, keyword matching terbatas. Install Python & `pip install textblob` |
| Classify selalu kosong | Belum training | Panggil `load sample intents` atau `train()` dulu |
| Entities selalu `[]` | Teks gak punya proper noun | Coba teks dengan nama orang/tempat |
| Similarity error | Teks kosong | Pastikan input tidak kosong |
| Export/Import gak jalan | Dialog file diblok browser | Pake Desktop mode |
| CSV upload gagal | Format salah | Pake `download csv template` dulu buat lihat format |
| "peripheral NOT FOUND" di console | Bukan error — cuma debug log | Abaikan |
| ml5 error / handpose crash | Video element belum siap | Pastikan kamera nyala dan izin diberikan |

---

## 8. Glosarium

| Istilah | Arti |
|---------|------|
| **NLP** | Natural Language Processing — komputer paham bahasa |
| **Sentiment** | Emosi dalam teks (positif/negatif/netral) |
| **Intent** | Maksud / tujuan dari teks (contoh: greeting, order) |
| **Entity** | Entitas dalam teks (nama orang, tempat, organisasi) |
| **Similarity** | Ukuran kemiripan antara dua teks |
| **Training** | Proses ngajarin komputer pattern baru |
| **Label** | Nama kategori intent |
| **Examples** | Contoh-contoh teks untuk training |
| **Confidence** | Tingkat keyakinan hasil klasifikasi (0.0–1.0) |
| **PROPER_NOUN** | Nama orang (entity type) |
| **GPE** | Geopolitical entity — negara, kota (entity type) |
| **ORG** | Organization — perusahaan, organisasi (entity type) |
| **CSV** | Comma-Separated Values — format file tabel |
| **REPL** | Read-Eval-Print Loop — mode interaktif Python |

---

## Tips Cepat

### Block Mode — Paling Simpel

```
1. Add extension NLP
2. Klik "load sample intents" (1x doang)
3. Classify teks → udah bisa!
```

### Python IDE — Paling Simpel

```python
from nomopro_nlp import load_sample_intents, classify
load_sample_intents()
print(classify("hello"))  # → "greeting"
```

### Urutan Belajar yang Disarankan

1. ✅ **Project 1** (Chatbot Block) — paham konsep intent
2. ✅ **Project 2** (Sentimen Block) — paham sentimen
3. ✅ **Project 3** (Training Block) — belajar training
4. ✅ **Project 6** (Python Chatbot) — beralih ke Python
5. ✅ **Project 8** (CSV Auto) — data processing
6. ✅ **Project 9** (NLP + Sprite) — full integration
