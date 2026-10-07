// Response compression and static caching headers (no extra dependency: node:zlib).
//
//   compression()        brotli (preferred) or gzip for text-like responses — pages, scripts, CSS, JSON, SVG,
//                        the web manifest — honouring Accept-Encoding (including q=0). Skips already-compressed
//                        types (images, fonts, .gz, wasm-in-gzip…), small bodies, HEAD/204/304, ranges (206),
//                        Server-Sent Events (they must flush every event) and `Cache-Control: no-transform`.
//                        Always sends `Vary: Accept-Encoding` for compressible types so caches keep one copy per
//                        encoding. Compressed static files are kept in a small in-memory cache keyed by ETag, so
//                        each file is compressed once per version, not on every request.
//   staticCacheControl() Cache-Control for files under public/: the HTML shell, sw.js and the manifest always
//                        revalidate (no-cache — a deploy reaches everyone at once); vendored libraries and fonts
//                        are long-cached and immutable (a library upgrade must change the file name); everything
//                        else revalidates cheaply with its ETag (304) because file names carry no content hash.
import zlib from 'node:zlib';

const COMPRESSIBLE = /^(text\/(?!event-stream)|application\/(javascript|x-javascript|ecmascript|json|[\w.+-]*\+json|xml|[\w.+-]*\+xml|wasm)|image\/svg\+xml|image\/x-icon|font\/(ttf|otf))/i;
const THRESHOLD = 1024; // bytes; below this the headers cost more than they save
const CACHE_ENTRY_MAX = 4 * 1024 * 1024;
const CACHE_TOTAL_MAX = 48 * 1024 * 1024;

/** 'br' | 'gzip' | null from an Accept-Encoding header (q-values honoured; br preferred on a tie). */
export function pickEncoding(header = '') {
  const q = {};
  for (const part of String(header).toLowerCase().split(',')) {
    const [name, ...params] = part.trim().split(';');
    if (!name) continue;
    const qp = params.map((p) => p.trim()).find((p) => p.startsWith('q='));
    q[name] = qp ? Number(qp.slice(2)) || 0 : 1;
  }
  const of = (n) => (n in q ? q[n] : ('*' in q ? q['*'] : 0));
  const br = of('br'), gz = of('gzip');
  if (br > 0 && br >= gz) return 'br';
  if (gz > 0) return 'gzip';
  return null;
}

function appendVary(res, field) {
  const cur = String(res.getHeader('Vary') || '');
  if (cur === '*' || cur.split(',').map((s) => s.trim().toLowerCase()).includes(field.toLowerCase())) return;
  res.setHeader('Vary', cur ? `${cur}, ${field}` : field);
}

/** Small LRU of compressed static bodies: key → Buffer. */
const cache = new Map();
let cacheBytes = 0;
function cacheGet(key) {
  const v = cache.get(key);
  if (v) { cache.delete(key); cache.set(key, v); }
  return v;
}
function cachePut(key, buf) {
  if (buf.length > CACHE_ENTRY_MAX) return;
  if (cache.has(key)) return;
  cache.set(key, buf);
  cacheBytes += buf.length;
  for (const [k, v] of cache) {
    if (cacheBytes <= CACHE_TOTAL_MAX) break;
    cache.delete(k); cacheBytes -= v.length;
  }
}
export const _compressionCache = { clear() { cache.clear(); cacheBytes = 0; }, get size() { return cache.size; } };

function makeStream(enc, cacheable) {
  if (enc === 'br') {
    return zlib.createBrotliCompress({ params: { [zlib.constants.BROTLI_PARAM_QUALITY]: cacheable ? 9 : 4, [zlib.constants.BROTLI_PARAM_MODE]: zlib.constants.BROTLI_MODE_TEXT } });
  }
  return zlib.createGzip({ level: cacheable ? 9 : 6 });
}

export function compression({ threshold = THRESHOLD } = {}) {
  return (req, res, next) => {
    const enc = pickEncoding(req.headers['accept-encoding']);
    const _write = res.write, _end = res.end, _on = res.on, _writeHead = res.writeHead;
    let decided = false, stream = null, cached = null, collect = null, cacheKey = null;
    const drainListeners = [];

    function decide(endChunk) {
      if (decided) return;
      decided = true;
      setup(endChunk);
      // Not compressing: anyone who waited for 'drain' before the decision waits on the response itself.
      if (!stream) for (const [type, fn] of drainListeners.splice(0)) _on.call(res, type, fn);
    }
    function setup(endChunk) {
      const type = String(res.getHeader('Content-Type') || '');
      if (!COMPRESSIBLE.test(type)) return;
      appendVary(res, 'Accept-Encoding');
      if (!enc || req.method === 'HEAD' || res.getHeader('Content-Encoding')) return;
      if ([204, 206, 304].includes(res.statusCode) || res.statusCode < 200 || req.headers.range) return;
      if (/\bno-transform\b/i.test(String(res.getHeader('Cache-Control') || ''))) return;
      const declared = Number(res.getHeader('Content-Length'));
      const endLen = endChunk == null ? null : Buffer.byteLength(endChunk);
      const len = Number.isFinite(declared) && res.hasHeader('Content-Length') ? declared : endLen;
      if (len != null && len < threshold) return;

      res.setHeader('Content-Encoding', enc);
      res.removeHeader('Content-Length');
      const etag = res.getHeader('ETag');
      if (etag && !String(etag).startsWith('W/')) res.setHeader('ETag', `W/${etag}`);
      const cacheable = !!etag && res.statusCode === 200 && !req.path.startsWith('/api/');
      if (cacheable) {
        cacheKey = `${enc}\u0000${req.path}\u0000${etag}`;
        cached = cacheGet(cacheKey) || null;
        if (cached) return;
        collect = [];
      }
      stream = makeStream(enc, cacheable);
      let collected = 0;
      stream.on('data', (chunk) => {
        if (collect) { collected += chunk.length; if (collected > CACHE_ENTRY_MAX) collect = null; else collect.push(chunk); }
        if (_write.call(res, chunk) === false) stream.pause();
      });
      stream.on('end', () => {
        if (collect && cacheKey) cachePut(cacheKey, Buffer.concat(collect));
        _end.call(res);
      });
      stream.on('error', (err) => { res.destroy(err); });
      _on.call(res, 'drain', () => stream.resume());
      for (const [type, fn] of drainListeners.splice(0)) stream.on(type, fn);
    }

    res.writeHead = function writeHead(code, ...args) {
      const last = args[args.length - 1];
      if (last && typeof last === 'object' && !Array.isArray(last)) {
        args.pop();
        for (const [k, v] of Object.entries(last)) if (v !== undefined) this.setHeader(k, v);
      } else if (Array.isArray(last)) {
        decided = true; // raw header array: leave untouched
      }
      this.statusCode = code;
      decide();
      return _writeHead.call(this, code, ...args);
    };
    res.write = function write(chunk, encoding, cb) {
      decide();
      if (cached) { if (typeof encoding === 'function') encoding(); else if (typeof cb === 'function') cb(); return true; }
      if (!stream) return _write.call(this, chunk, encoding, cb);
      return stream.write(chunk == null ? Buffer.alloc(0) : chunk, typeof encoding === 'string' ? encoding : undefined, typeof encoding === 'function' ? encoding : cb);
    };
    res.end = function end(chunk, encoding, cb) {
      if (typeof chunk === 'function') { cb = chunk; chunk = undefined; encoding = undefined; }
      else if (typeof encoding === 'function') { cb = encoding; encoding = undefined; }
      if (!decided && !this.headersSent) decide(chunk != null ? (typeof chunk === 'string' ? Buffer.from(chunk, encoding || 'utf8') : chunk) : Buffer.alloc(0));
      if (cached) return _end.call(this, cached, cb);
      if (!stream) return _end.call(this, chunk, encoding, cb);
      if (cb) this.once('finish', cb);
      if (chunk != null) stream.end(chunk, encoding); else stream.end();
      return this;
    };
    // Back-pressure: whoever waits for 'drain' (e.g. a piped file) waits on the compressor once it exists.
    res.on = function on(type, listener) {
      if (type !== 'drain') return _on.call(this, type, listener);
      if (stream) { stream.on(type, listener); return this; }
      if (!decided) { drainListeners.push([type, listener]); return this; }
      return _on.call(this, type, listener);
    };
    next();
  };
}

const LONG = 'public, max-age=31536000, immutable';
/** Cache-Control for a file served from public/ (or a vendored module), by its URL path. */
export function staticCacheControl(urlPath) {
  const p = String(urlPath || '/');
  if (p === '/' || p.endsWith('.html') || p === '/sw.js' || p.endsWith('.webmanifest')) return 'no-cache';
  if (p.startsWith('/vendor/') || p.startsWith('/fonts/')) return LONG;
  return 'no-cache';
}
