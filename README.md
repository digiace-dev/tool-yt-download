# Media Downloader

Download video dan audio dari YouTube, Facebook, Instagram, TikTok, X (Twitter), dan Threads.

![Node](https://img.shields.io/badge/Node.js-18%2B-green)
![Python](https://img.shields.io/badge/Python-3.8%2B-yellow)

## Instalasi

### 1. Prasyarat

**Node.js 18+**
```bash
node --version
```
Download dari https://nodejs.org jika belum ada.

**Python 3.8+**
```bash
python --version
```
Download dari https://www.python.org/downloads/ — centang "Add Python to PATH" saat install.

**ffmpeg**
```bash
ffmpeg -version
```
Install:
- Windows: `winget install "FFmpeg (Essentials Build)"`
- macOS: `brew install ffmpeg`
- Linux: `sudo apt install ffmpeg`

Manual: https://ffmpeg.org/download.html

Jika server tidak deteksi ffmpeg, set env var `FFMPEG_LOCATION`:
```powershell
# PowerShell
$env:FFMPEG_LOCATION = 'C:\Path\To\ffmpeg\bin'
npm start

# CMD
set FFMPEG_LOCATION=C:\Path\To\ffmpeg\bin && npm start
```

### 2. Install Dependensi

```bash
npm install
python -m pip install yt-dlp
```

## Menjalankan

**Windows:** Double-klik [`dist/MediaDownloader.exe`](dist/MediaDownloader.exe) atau [`dist/start.bat`](dist/start.bat)

**Terminal:**
```bash
npm start
```

Buka browser: http://localhost:3000

## Cara Pakai

1. **Tempel link** video dari YouTube, TikTok, Instagram, Facebook, X, atau Threads
2. **Klik "Get Media"** — muncul thumbnail, judul, dan daftar resolusi
3. **Pilih resolusi** (opsional) — skip untuk kualitas terbaik
4. **Klik Download Video** (`.mp4`) atau **Download Audio** (`.mp3`)

## Stack

- **Backend:** [`express`](package.json:9) ^4.21.0, [`cors`](package.json:10) ^2.8.5
- **Download engine:** yt-dlp (Python)
- **Media processing:** ffmpeg
- **Frontend:** Vanilla JS

## Troubleshooting

| Error | Fix |
|---|---|
| "Server error" after Get Media | Cek link valid & video publik |
| Download stuck | Hard refresh (Ctrl+F5) |
| Video unplayable | Pilih resolusi lebih rendah |
| "Python not found" | Reinstall Python, centang PATH |
| "ffmpeg not found" | Install ffmpeg atau set `FFMPEG_LOCATION` |

## Catatan

- **Android/APK:** Tidak tersedia. Butuh Node.js + Python + ffmpeg sebagai server. Alternatif: jalankan di PC, akses dari browser HP.
- **Threads:** Pakai proxy `lovethreads.net` karena yt-dlp belum support.
- [`node_modules`](.gitignore) tidak di-push. Clone lalu jalankan `npm install`.

## Lisensi

MIT
