# 0710 Improve & Bug Report

## 🔴 URGENT BUGS

### 1. Operator precedence bug — resolution display
**File:** [`server.js:123`](../server.js:123)
```js
resolution: d.resolution || d.height ? `${d.height}p` : null,
```
`||` lower precedence than `?:`. Evaluates as `(d.resolution || d.height) ? \`${d.height}p\` : null`.  
If `d.resolution` is `"1920x1080"` but `d.height` is `undefined` → returns `"undefinedp"`.

**Fix:** Add parens: `d.resolution || (d.height ? \`${d.height}p\` : null)`

---

### 2. Threads title — string vs array mismatch
**File:** [`server.js:83-85`](../server.js:83)
```js
const titleMatch = result.data.match(/<title[^>]*>([^<]+)<\/title>/i) || result.title;
// ...
title: titleMatch ? titleMatch[1]?.trim() : 'Threads Video',
```
When regex fails, `titleMatch = result.title` (a string). `titleMatch[1]` returns second **character** of string, not a capture group. Shows single char as title.

**Fix:** Check type: `typeof titleMatch === 'string' ? titleMatch : titleMatch[1]?.trim()`

---

### 3. URL param stripping produces malformed URL
**File:** [`server.js:106`](../server.js:106), [`server.js:145`](../server.js:145)
```js
const singleUrl = url.replace(/[?&]list=[^&]*/g, '').replace(/[?&]index=[^&]*/g, '').replace(/\?$/, '');
```
Input: `https://youtube.com/watch?v=abc&list=xyz`  
After replace: `https://youtube.com/watch?v=abc&` → leaves trailing `&`.  
Input: `https://youtube.com/watch?list=xyz&v=abc`  
After replace: `https://youtube.com/watch?&v=abc` → malformed `?&`.

**Fix:** Add cleanup pass: `.replace(/\?$/, '').replace(/\?&/, '?').replace(/&$/, '')`

---

### 4. `spawn()` ignores `timeout` option
**File:** [`server.js:182-184`](../server.js:182)
```js
const proc = spawn(args[0], args.slice(1), {
  stdio: ['ignore', 'pipe', 'pipe'],
  timeout: 600000  // ← DOES NOTHING for spawn()
});
```
`child_process.spawn()` does not support `timeout`. Only `exec`/`execFile` do. Download hangs forever if yt_dlp freezes.

**Fix:** Manual timeout: `setTimeout(() => proc.kill('SIGTERM'), 600000)` after spawn.

---

## 🟡 IMPORTANT

### 5. ~~NODE_EXE hardcoded — same class as Python bug~~ ✅ FIXED
**File:** [`server.js:16`](../server.js:16)
```js
const NODE_EXE = process.execPath; // ponytail: always points to running Node binary, no hardcoded path
```
Same fragility as the Python 3.10 path we just fixed. If Node install moves, ENOENT again.

**Fix:** Use `process.execPath` — points to running Node binary.

---

### 6. Stream error after headers sent — silent corruption
**File:** [`server.js:204-211`](../server.js:204)
```js
const stream = fs.createReadStream(tmpFile);
stream.pipe(res);
stream.on('error', () => {
  try { fs.unlinkSync(tmpFile); } catch (_) { }
});
```
If read stream errors mid-pipe, response headers already sent (200 OK). Client receives truncated file with no error indication. Silent data loss.

**Fix:** Pipe with error handler, destroy response on error: `stream.on('error', (err) => { res.destroy(); cleanup(); })`

---

### 7. Client loads entire download into memory
**File:** [`index.html:726`](../index.html:726)
```js
const blob = await res.blob();
```
Entire file buffered in browser RAM. A 500MB+ video crashes the tab.

**Fix:** Use `window.open('/api/download?...')` or hidden `<a>` with direct URL to stream download without buffering. Would need new GET endpoint.

---

## 🟢 MINOR

### 8. Console log hardcoded port
**File:** [`server.js:216`](../server.js:216)
```js
console.log(`Server running at http://localhost:3000`);
```
Should use `PORT` variable.

### 9. No `Content-Length` header on download
**File:** [`server.js:202`](../server.js:202)
File size known from temp file stat. Without Content-Length, browser can't show download progress.

### 10. CORS wide open
**File:** [`server.js:12`](../server.js:12)
`cors()` allows any origin. OK for local use. If deployed, restrict origins.

---

## Priority Order
1. **Fix #1** — resolution display bug (user-visible, easy fix)
2. **Fix #3** — malformed URL (breaks yt_dlp for some URLs)
3. **Fix #2** — Threads title (broken for some Threads posts)
4. **Fix #4** — spawn timeout (can hang server)
5. **Fix #5** — NODE_EXE path (prevents future ENOENT)
6. **Fix #6** — stream error handling (data integrity)
7. **Fix #7** — client memory (UX for large files)
