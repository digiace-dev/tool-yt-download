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
const YT_DLP = [
  'C:\\laragon\\bin\\python\\python-3.13\\python.exe', '-m', 'yt_dlp',
  '--js-runtimes', `node:${NODE_EXE}`,
  '--remote-components', 'ejs:github'
];

function sanitizeFilename(name) {
  return name.replace(/[<>:"/\\|?*]/g, '_').replace(/[^\x20-\x7E]/g, '_').substring(0, 200);
}

function contentDisposition(filename, ext) {
  const ascii = `${filename}.${ext}`.replace(/[^\x20-\x7E]/g, '_');
  const encoded = encodeURIComponent(`${filename}.${ext}`);
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encoded}`;
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
  const args = [...YT_DLP, '--dump-json', '--no-download', '--no-playlist', singleUrl];
  const proc = execFile(args[0], args.slice(1), {
    timeout: 60000,
    maxBuffer: 10 * 1024 * 1024
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
  const { url, type, format_id, filename } = req.body;
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

  const ext = type === 'audio' ? 'mp3' : 'mp4';
  const tmpFile = path.join(os.tmpdir(), `dl-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`);

  let args;
  if (type === 'audio') {
    args = [...YT_DLP, '--no-playlist', '-x', '--audio-format', 'mp3', '--audio-quality', '0', '-o', tmpFile, singleUrl];
  } else if (format_id) {
    args = [...YT_DLP, '--no-playlist', '-f', `${format_id}+bestaudio[ext=m4a]/${format_id}+bestaudio/best`, '--merge-output-format', 'mp4', '-o', tmpFile, singleUrl];
  } else {
    args = [...YT_DLP, '--no-playlist', '-f', 'bestvideo[ext=mp4][vcodec^=avc1]+bestaudio[ext=m4a]/bestvideo[vcodec^=avc1]+bestaudio/best[ext=mp4]/best', '--merge-output-format', 'mp4', '-o', tmpFile, singleUrl];
  }

  const proc = spawn(args[0], args.slice(1), {
    stdio: ['ignore', 'pipe', 'pipe']
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
  });

  proc.on('close', (code) => {
    clearTimeout(timeout);
    if (code !== 0) {
      const msg = stderrBuf.split('\n').filter(l => l.trim()).pop() || 'Download failed';
      res.status(400).json({ error: msg });
      try { fs.unlinkSync(tmpFile); } catch (_) { }
      return;
    }
    res.setHeader('Content-Disposition', contentDisposition(baseName, ext));
    res.setHeader('Content-Type', type === 'audio' ? 'audio/mpeg' : 'video/mp4');
    try {
      const stats = fs.statSync(tmpFile);
      res.setHeader('Content-Length', stats.size);
    } catch (_) { }
    const stream = fs.createReadStream(tmpFile);
    stream.on('error', (err) => {
      if (!res.headersSent) res.status(500).json({ error: 'Download interrupted' });
      else res.destroy();
      try { fs.unlinkSync(tmpFile); } catch (_) { }
    });
    stream.pipe(res);
    res.on('finish', () => {
      try { fs.unlinkSync(tmpFile); } catch (_) { }
    });
    res.on('close', () => {
      try { fs.unlinkSync(tmpFile); } catch (_) { }
    });
  });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
