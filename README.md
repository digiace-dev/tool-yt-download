# Media Downloader

Aplikasi untuk mengunduh video dan audio dari **YouTube, Facebook, Instagram, TikTok, X (Twitter), dan Threads**.

Cukup tempel link, pilih kualitas, lalu download — langsung dari browser.

![Preview](https://img.shields.io/badge/Platform-Web-blue)
![Node](https://img.shields.io/badge/Node.js-18%2B-green)
![Python](https://img.shields.io/badge/Python-3.8%2B-yellow)

---

## Yang Perlu Disiapkan

Sebelum memulai, pastikan komputer sudah memiliki 3 hal ini:

### 1. Node.js

Cek dengan membuka **Command Prompt** atau **PowerShell**, ketik:

```bash
node --version
```

Jika muncul angka seperti `v22.22.3` — berarti sudah ada.\
Jika muncul `node not recognized` — download dan install dari https://nodejs.org (pipihkan tombol LTS).

### 2. Python

Cek dengan:

```bash
python --version
```

Harus muncul `Python 3.8` atau lebih baru.\
Jika belum ada, download dari https://www.python.org/downloads/.\
**Centang "Add Python to PATH" saat install.**

### 3. ffmpeg

Cek dengan:

```bash
ffmpeg -version
```

Jika belum ada:
- **Windows:** `winget install "FFmpeg (Essentials Build)"`
- **macOS:** `brew install ffmpeg`
- **Linux:** `sudo apt install ffmpeg`

Atau download manual dari https://ffmpeg.org/download.html

Jika server masih melaporkan "ffmpeg not found", jalankan salah satu opsi berikut sebelum men-start server:

- Set variabel lingkungan `FFMPEG_LOCATION` ke folder yang berisi `ffmpeg.exe` (contoh `C:\Path\To\ffmpeg\bin`) lalu jalankan `npm start`.

PowerShell (session):

```powershell
$env:FFMPEG_LOCATION = 'C:\Path\To\ffmpeg\bin'
npm start
```

CMD (session):

```cmd
set FFMPEG_LOCATION=C:\Path\To\ffmpeg\bin
npm start
```

Atau panggil `yt-dlp` secara langsung dengan argumen `--ffmpeg-location`:

```powershell
yt-dlp --ffmpeg-location "C:\Path\To\ffmpeg\bin" "<VIDEO_URL>"
```

---

## Cara Install

Buka **Command Prompt / PowerShell** di folder proyek ini, lalu jalankan perintah berikut satu per satu:

```bash
# 1. Install dependensi Node.js (express, cors, dll)
npm install

# 2. Install yt-dlp (mesin download untuk semua platform)
python -m pip install yt-dlp
```

Tunggu sampai masing-masing selesai (tidak ada pesan error merah).

---

## Cara Menjalankan

### Opsi 1: Double-klik (Windows)

Jalankan `dist/MediaDownloader.exe` atau `dist/start.bat` — langsung buka browser.

### Opsi 2: Terminal

```bash
npm start
```

Akan muncul tulisan:

```
Server running at http://localhost:3000
```

Artinya server sudah nyala. Sekarang buka browser dan ketik:

```
http://localhost:3000
```

---

## Cara Pakai

### 1. Tempel link

Copy link video dari YouTube, TikTok, Instagram, Facebook, X, atau Threads.\
Tempel ke kotak input di halaman web.

Link otomatis dikenali — badge platform akan menyala (misal tulisan **YouTube** jadi biru).

### 2. Klik "Get Media"

Muncul thumbnail, judul, durasi, dan daftar resolusi (144p, 360p, 720p, 1080p, dst).

### 3. Pilih resolusi (opsional)

Klik salah satu chip kualitas, misal **720p** atau **1080p**.\
Chip yang dipilih akan berubah warna menjadi biru.\
Jika tidak memilih, sistem akan mengambil kualitas terbaik yang tersedia.

### 4. Klik Download

- **Download Video** → file `.mp4`
- **Download Audio** → file `.mp3`

File akan langsung terunduh ke komputer.

---

## Troubleshooting

| Masalah | Penyebab | Solusi |
|---|---|---|
| Muncul "Server error" setelah Get Media | Link tidak valid atau yt-dlp bermasalah | Cek link, pastikan video bisa diakses publik |
| Download tidak dimulai | Cache browser lama | Tekan **Ctrl + F5** (hard refresh) |
| Video tidak bisa diputar | Proses merge gagal | Coba pilih resolusi lebih rendah, atau jangan pilih resolusi (biar auto) |
| Error "Python not found" | Python tidak terdaftar di PATH | Install ulang Python, centang "Add Python to PATH" |
| Error "ffmpeg not found" | ffmpeg belum terinstal | Install ffmpeg (lihat panduan di atas) |
| Download lambat | Ukuran file besar | Tunggu, atau pilih resolusi lebih rendah |
| node_modules terlanjur di-push | Sudah terlacak git | `git rm -r --cached node_modules` lalu commit |

---

## Struktur Folder

```
Downloader/
├── index.html          Halaman web (tampilan)
├── server.js           Backend (logika download)
├── package.json        Daftar dependensi Node.js
├── dist/               Launcher Windows
│   ├── MediaDownloader.exe   EXE launcher
│   ├── MediaDownloader.ps1   Script PowerShell
│   └── start.bat             Batch file
└── README.md           Dokumen ini
```

---

## Cara Kerja (untuk yang penasaran)

```
Browser ──→ Server (Node.js) ──→ yt-dlp ──→ YouTube / TikTok / dll
                │
                ↓
         File dikirim ke browser
                │
                ↓
         Tersimpan di komputer
```

1. Browser kirim link ke server
2. Untuk YouTube/Facebook/Instagram/TikTok/X: server panggil **yt-dlp** (tool Python)
3. Untuk **Threads**: server panggil API `lovethreads.net` sebagai proxy
4. **ffmpeg** dipakai untuk menggabungkan video + audio (kalau terpisah) dan konversi ke MP3
5. File dikirim ke browser, langsung terunduh

---

## Catatan

- **APK (Android):** Tidak tersedia. Aplikasi ini membutuhkan Node.js + Python + ffmpeg yang berjalan sebagai server — Android tidak mendukungnya secara native. Alternatif: jalankan server di PC, lalu akses dari browser HP di jaringan yang sama.
- **node_modules** tidak di-push ke GitHub. Clone repo lalu jalankan `npm install` untuk menginstal dependensi.
- **Threads** tidak didukung yt-dlp langsung. Server menggunakan `lovethreads.net` sebagai proxy untuk mengambil video.

## Lisensi

MIT — bebas pakai, modifikasi, dan distribusi.
