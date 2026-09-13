const express = require('express');
const cors = require('cors');
const { spawn, execFile } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { Readable } = require('stream');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const NODE_EXE = process.execPath; // ponytail: always points to running Node binary, no hardcoded path
const { spawnSync } = require('child_process');

// Resolve how to invoke yt-dlp:
// 1. Prefer a standalone `yt-dlp` executable on PATH (where.exe)
// 2. Fallback to `python -m yt_dlp` using whichever `python` is on PATH
function resolveYtDlpBase() {
  try {
    const which = spawnSync('where', ['yt-dlp'], { encoding: 'utf8' });
    if (which.status === 0 && which.stdout) {
      const exe = which.stdout.split(/\r?\n/)[0].trim();
      if (exe) return [exe];
    }
  } catch (_) { }
  // fallback
  const pythonCmd = process.env.PYTHON || 'python';
  return [pythonCmd, '-m', 'yt_dlp'];
}

// Resolve ffmpeg directory: env var first, then where.exe, then WinGet scan, then null
let _ffmpegDir = undefined; // undefined = not resolved yet
function resolveFfmpegLocation() {
  if (_ffmpegDir !== undefined) return _ffmpegDir;
  // 1. Explicit env var
  if (process.env.FFMPEG_LOCATION) {
    _ffmpegDir = process.env.FFMPEG_LOCATION;
    return _ffmpegDir;
  }
  // 2. Auto-detect via where.exe / where
  try {
    const which = spawnSync('where', ['ffmpeg'], { encoding: 'utf8' });
    if (which.status === 0 && which.stdout) {
      const exe = which.stdout.split(/\r?\n/)[0].trim();
      if (exe) {
        _ffmpegDir = path.dirname(exe);
        return _ffmpegDir;
      }
    }
  } catch (_) { }
  // 3. Scan WinGet Packages dir for Gyan.FFmpeg* containing ffmpeg.exe
  try {
    const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
    const pkgDir = path.join(localAppData, 'Microsoft', 'WinGet', 'Packages');
    if (fs.existsSync(pkgDir)) {
      const entries = fs.readdirSync(pkgDir).filter(d => /^Gyan\.FFmpeg/i.test(d));
      for (const entry of entries) {
        const binDir = path.join(pkgDir, entry);
        // WinGet nests the actual bin under a subfolder like ffmpeg-8.1.1-essentials_build\bin
        const dirs = [binDir];
        try {
          for (const sub of fs.readdirSync(binDir)) {
            dirs.push(path.join(binDir, sub, 'bin'));
          }
        } catch (_) { }
        for (const d of dirs) {
          if (fs.existsSync(path.join(d, 'ffmpeg.exe'))) {
            _ffmpegDir = d;
            return _ffmpegDir;
          }
        }
      }
    }
  } catch (_) { }
  _ffmpegDir = null;
  return _ffmpegDir;
}

const YT_DLP_BASE = [...resolveYtDlpBase(), '--js-runtimes', `node:${NODE_EXE}`, '--remote-components', 'ejs:github'];

// Helper: build arguments and child env for yt-dlp per-request so we can
// pick up FFMPEG_LOCATION set after process start and ensure child process
// PATH contains the ffmpeg bin directory.
function buildYtDlpArgs(extraArgs = []) {
  const args = [...YT_DLP_BASE, ...extraArgs];
  const ff = resolveFfmpegLocation();
  if (ff) {
    args.push('--ffmpeg-location', ff);
  }
  // Build env for child process
  const childEnv = { ...process.env };
  if (ff) {
    // Prepend ffmpeg bin to PATH so other tools can find ffmpeg/ffprobe
    const sep = process.platform === 'win32' ? ';' : ':';
    const orig = process.env.PATH || '';
    childEnv.PATH = `${ff}${sep}${orig}`;
    childEnv.FFMPEG_LOCATION = ff;
  }
  return { args, env: childEnv };
}

function sanitizeFilename(name) {
  return name.replace(/[<>:"/\\|?*]/g, '_').replace(/[^\x20-\x7E]/g, '_').substring(0, 200);
}

function contentDisposition(filename, ext) {
  const ascii = `${filename}.${ext}`.replace(/[^\x20-\x7E]/g, '_');
  const encoded = encodeURIComponent(`${filename}.${ext}`);
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encoded}`;
}

function audioContentType(ext) {
  switch ((ext || '').toLowerCase()) {
    case 'mp3': return 'audio/mpeg';
    case 'm4a': return 'audio/mp4';
    case 'webm': return 'audio/webm';
    case 'opus': return 'audio/opus';
    case 'ogg': return 'audio/ogg';
    case 'aac': return 'audio/aac';
    default: return 'application/octet-stream';
  }
}

function findOutputFile(base) {
  const dir = path.dirname(base);
  const name = path.basename(base);
  try {
    const files = fs.readdirSync(dir).filter(f => f.startsWith(name + '.'));
    return files.length ? path.join(dir, files[0]) : null;
  } catch (_) { return null; }
}

function isThreads(url) {
  return /threads\.(com|net)/i.test(url);
}

async function threadsFetchInfo(url) {
  const resp = await fetch('https://lovethreads.net/api/ajaxSearch', {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
      origin: 'https://lovethreads.net',
      referer: 'https://lovethreads.net/en',
      'x-requested-with': 'XMLHttpRequest',
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    },
    body: new URLSearchParams({ q: url, t: 'media', lang: 'en' })
  });
  const data = await resp.json();
  if (data.status !== 'ok') throw new Error('Gagal mengambil media dari Threads');
  return data;
}

function parseThreadsHtml(html) {
  const videos = [];
  const liRegex = /<li>.*?<\/li>/gis;
  let liMatch;
  while ((liMatch = liRegex.exec(html)) !== null) {
    const li = liMatch[0];
    if (/icon-dlvideo/i.test(li)) {
      const thumbMatch = li.match(/<img[^>]*src="([^"]+)"/i);
      const urlMatch = li.match(/<a[^>]*href="([^"]+)"[^>]*title="Download Video"/i) || li.match(/<a[^>]*title="Download Video"[^>]*href="([^"]+)"/i);
      if (urlMatch) {
        videos.push({
          thumbnail: thumbMatch ? thumbMatch[1] : '',
          url: urlMatch[1]
        });
      }
    }
  }
  return videos;
}

app.post('/api/info', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL is required' });

  if (isThreads(url)) {
    try {
      const result = await threadsFetchInfo(url);
      const videos = parseThreadsHtml(result.data || '');
      const firstVideo = videos[0] || {};
      const titleMatch = result.data.match(/<title[^>]*>([^<]+)<\/title>/i) || result.title;
      res.json({
        title: typeof titleMatch === 'string' ? titleMatch : (titleMatch ? titleMatch[1]?.trim() : 'Threads Video'),
        thumbnail: firstVideo.thumbnail || '',
        duration: null,
        resolution: null,
        ext: 'mp4',
        formats: videos.map((v, i) => ({
          format_id: `video_${i}`,
          ext: 'mp4',
          resolution: `Video ${i + 1}`,
          filesize: 0,
          url: v.url
        })),
        _threadsVideos: videos
      });
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
    return;
  }

  // Strip playlist params from URL to avoid extracting entire playlist
  const singleUrl = url.replace(/[?&]list=[^&]*/g, '').replace(/[?&]index=[^&]*/g, '').replace(/\?$/, '').replace(/\?&/, '?').replace(/&$/, '');
  const infoReq = buildYtDlpArgs(['--dump-json', '--no-download', '--no-playlist', singleUrl]);
  const proc = execFile(infoReq.args[0], infoReq.args.slice(1), {
    timeout: 60000,
    maxBuffer: 10 * 1024 * 1024,
    env: infoReq.env
  }, (err, stdout, stderr) => {
    if (err) {
      const lines = stderr.split('\n').filter(l => l.trim() && !l.startsWith('WARNING') && !l.startsWith('Deprecated'));
      const msg = lines.pop() || err.message;
      return res.status(400).json({ error: msg });
    }
    try {
      const d = JSON.parse(stdout);
      res.json({
        title: d.title || 'Untitled',
        thumbnail: d.thumbnail || '',
        duration: d.duration || null,
        resolution: d.resolution || (d.height ? `${d.height}p` : null),
        ext: d.ext || 'mp4',
        formats: (d.formats || []).map(f => ({
          format_id: f.format_id,
          ext: f.ext,
          resolution: f.height ? `${f.height}p` : 'audio',
          filesize: f.filesize || f.filesize_approx || 0
        }))
      });
    } catch (e) {
      res.status(500).json({ error: 'Failed to parse media info.' });
    }
  });
});

app.post('/api/download', async (req, res) => {
  const { url, type, format_id, filename, bitrate } = req.body;
  if (!url) return res.status(400).json({ error: 'URL is required' });

  const baseName = filename ? sanitizeFilename(filename) : 'download';

  // Strip playlist params to download only the single video
  const singleUrl = url.replace(/[?&]list=[^&]*/g, '').replace(/[?&]index=[^&]*/g, '').replace(/\?$/, '').replace(/\?&/, '?').replace(/&$/, '');

  if (isThreads(url)) {
    try {
      const result = await threadsFetchInfo(url);
      const videos = parseThreadsHtml(result.data || '');
      let videoUrl = videos[0]?.url;
      if (format_id) {
        const idx = parseInt(format_id.replace('video_', ''), 10);
        if (!isNaN(idx) && videos[idx]) videoUrl = videos[idx].url;
      }
      if (!videoUrl) throw new Error('No video found');

      const resp = await fetch(videoUrl);
      if (!resp.ok) throw new Error('Failed to fetch video');

      res.setHeader('Content-Disposition', contentDisposition(baseName, 'mp4'));
      res.setHeader('Content-Type', 'video/mp4');
      Readable.fromWeb(resp.body).pipe(res);
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
    return;
  }

  const isOriginalAudio = type === 'audio' && bitrate === 'original';
  let ext = type === 'audio' ? 'mp3' : 'mp4';
  const tmpBase = path.join(os.tmpdir(), `dl-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  let tmpFile = `${tmpBase}.${ext}`;

  let args;
  if (type === 'audio' && isOriginalAudio) {
    ext = null;
    args = [...YT_DLP_BASE, '--no-playlist', '-x', '--audio-format', 'best', '-o', `${tmpBase}.%(ext)s`, singleUrl];
  } else if (type === 'audio') {
    const quality = bitrate || '320K';
    args = [...YT_DLP_BASE, '--no-playlist', '-x', '--audio-format', 'mp3', '--audio-quality', quality, '-o', tmpFile, singleUrl];
  } else if (format_id) {
    args = [...YT_DLP_BASE, '--no-playlist', '-f', `${format_id}+bestaudio[ext=m4a]/${format_id}+bestaudio/best`, '--merge-output-format', 'mp4', '-o', tmpFile, singleUrl];
  } else {
    args = [...YT_DLP_BASE, '--no-playlist', '-f', 'bestvideo[ext=mp4][vcodec^=avc1]+bestaudio[ext=m4a]+bestaudio/best[ext=mp4]/best', '--merge-output-format', 'mp4', '-o', tmpFile, singleUrl];
  }

  const spawnReq = buildYtDlpArgs(args.slice(1));
  const proc = spawn(spawnReq.args[0], spawnReq.args.slice(1), {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: spawnReq.env
  });

  // Manual timeout since spawn() doesn't support timeout option
  const timeout = setTimeout(() => {
    proc.kill('SIGTERM');
  }, 600000);

  let stderrBuf = '';
  proc.stderr.on('data', (chunk) => { stderrBuf += chunk.toString(); });

  proc.on('error', () => {
    res.status(500).json({ error: 'Failed to start download process.' });
    try { fs.unlinkSync(tmpFile); } catch (_) { }
    if (isOriginalAudio) { const f = findOutputFile(tmpBase); if (f) try { fs.unlinkSync(f); } catch (_) { } }
  });

  proc.on('close', (code) => {
    clearTimeout(timeout);
    if (code !== 0) {
      const msg = stderrBuf.split('\n').filter(l => l.trim()).pop() || 'Download failed';
      res.status(400).json({ error: msg });
      try { fs.unlinkSync(tmpFile); } catch (_) { }
      if (isOriginalAudio) { const f = findOutputFile(tmpBase); if (f) try { fs.unlinkSync(f); } catch (_) { } }
      return;
    }

    let outFile = tmpFile;
    let outExt = ext;
    if (isOriginalAudio) {
      const found = findOutputFile(tmpBase);
      if (found) {
        outFile = found;
        outExt = path.extname(found).replace(/^\./, '') || 'mp3';
      }
    }

    res.setHeader('Content-Disposition', contentDisposition(baseName, outExt));
    res.setHeader('Content-Type', type === 'audio' ? audioContentType(outExt) : 'video/mp4');
    try {
      const stats = fs.statSync(outFile);
      res.setHeader('Content-Length', stats.size);
    } catch (_) { }
    const stream = fs.createReadStream(outFile);
    stream.on('error', (err) => {
      if (!res.headersSent) res.status(500).json({ error: 'Download interrupted' });
      else res.destroy();
      try { fs.unlinkSync(outFile); } catch (_) { }
    });
    stream.pipe(res);
    res.on('finish', () => {
      try { fs.unlinkSync(outFile); } catch (_) { }
    });
    res.on('close', () => {
      try { fs.unlinkSync(outFile); } catch (_) { }
    });
  });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
