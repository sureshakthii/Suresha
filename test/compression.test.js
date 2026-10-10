// Response compression and static caching headers (server/compress.js), and the share-URL substitution in the
// HTML shell (PUBLIC_URL replaces the https://thunai.example placeholder in canonical / Open Graph tags).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import zlib from 'node:zlib';

process.env.DB_PATH = ':memory:';
process.env.AUTH_DEV_MODE = '1';
process.env.AUTH_SECRET = 'compression-test-secret';
process.env.PUBLIC_URL = 'https://share.example.org';
for (const k of ['NODE_ENV', 'ANTHROPIC_API_KEY', 'FORCE_HTTPS', 'CSP_MODE']) delete process.env[k];

let server, port, pickEncoding;
before(async () => {
  ({ pickEncoding } = await import('../server/compress.js'));
  const { createApp } = await import('../server/index.js');
  server = createApp().listen(0);
  await new Promise((r) => server.once('listening', r));
  port = server.address().port;
});
after(() => server.close());

/** Raw GET (fetch would add its own Accept-Encoding and decode the body). */
const get = (p, headers = {}, method = 'GET') => new Promise((resolve, reject) => {
  const req = http.request({ host: '127.0.0.1', port, path: p, method, headers }, (res) => {
    const chunks = [];
    res.on('data', (c) => chunks.push(c));
    res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
  });
  req.on('error', reject);
  req.end();
});
const file = (p) => fs.readFileSync(new URL(`../public${p}`, import.meta.url));

test('Accept-Encoding negotiation: br preferred, q=0 honoured', () => {
  assert.equal(pickEncoding('gzip, deflate, br'), 'br');
  assert.equal(pickEncoding('gzip'), 'gzip');
  assert.equal(pickEncoding('br;q=0, gzip'), 'gzip');
  assert.equal(pickEncoding('gzip;q=0.5, br;q=0.4'), 'gzip');
  assert.equal(pickEncoding('identity'), null);
  assert.equal(pickEncoding(''), null);
  assert.equal(pickEncoding('*'), 'br');
});

test('static text is sent brotli / gzip and decodes to the same bytes, with Vary', async () => {
  const want = file('/styles.css');
  const br = await get('/styles.css', { 'Accept-Encoding': 'br, gzip' });
  assert.equal(br.headers['content-encoding'], 'br');
  assert.match(br.headers.vary, /Accept-Encoding/i);
  assert.ok(br.body.length < want.length / 2);
  assert.ok(zlib.brotliDecompressSync(br.body).equals(want));
  const again = await get('/styles.css', { 'Accept-Encoding': 'br' }); // served from the compressed cache
  assert.ok(zlib.brotliDecompressSync(again.body).equals(want));
  const gz = await get('/styles.css', { 'Accept-Encoding': 'gzip' });
  assert.equal(gz.headers['content-encoding'], 'gzip');
  assert.ok(zlib.gunzipSync(gz.body).equals(want));
  const plain = await get('/styles.css');
  assert.equal(plain.headers['content-encoding'], undefined);
  assert.match(plain.headers.vary, /Accept-Encoding/i);
  assert.ok(plain.body.equals(want));
});

test('already-compressed and tiny responses are left alone; HEAD, 304 and ranges are not encoded', async () => {
  const png = await get('/icon-512.png', { 'Accept-Encoding': 'br, gzip' });
  assert.equal(png.headers['content-encoding'], undefined);
  assert.ok(png.body.equals(file('/icon-512.png')));
  const health = await get('/api/health', { 'Accept-Encoding': 'br' });
  assert.equal(health.headers['content-encoding'], undefined, 'below the size threshold');
  assert.equal(health.headers['cache-control'], 'no-store', 'security headers intact');
  const head = await get('/app.js', { 'Accept-Encoding': 'br' }, 'HEAD');
  assert.equal(head.headers['content-encoding'], undefined);
  const first = await get('/app.js', { 'Accept-Encoding': 'br' });
  const cond = await get('/app.js', { 'Accept-Encoding': 'br', 'If-None-Match': first.headers.etag });
  assert.equal(cond.status, 304);
  const range = await get('/app.js', { 'Accept-Encoding': 'br', Range: 'bytes=0-9' });
  assert.equal(range.status, 206);
  assert.equal(range.headers['content-encoding'], undefined);
  assert.equal(range.body.length, 10);
});

test('JSON API responses are compressed and keep no-store', async () => {
  const r = await get('/api/panchang?date=2026-10-07&lat=13.0827&lon=80.2707&tz=5.5', { 'Accept-Encoding': 'gzip' });
  assert.equal(r.status, 200);
  assert.equal(r.headers['content-encoding'], 'gzip');
  assert.equal(r.headers['cache-control'], 'no-store');
  assert.ok(JSON.parse(zlib.gunzipSync(r.body)));
});

test('cache headers: shell, sw.js and manifest revalidate; vendored files and fonts are immutable', async () => {
  for (const p of ['/', '/index.html', '/sw.js', '/manifest.webmanifest', '/app.js', '/shared/astro.js']) {
    assert.equal((await get(p)).headers['cache-control'], 'no-cache', p);
  }
  for (const p of ['/vendor/astronomy-engine.js', '/fonts/inter-latin-400-normal.woff2']) {
    assert.match((await get(p)).headers['cache-control'], /max-age=31536000, immutable/, p);
  }
  const page = await get('/', { 'Accept-Encoding': 'br' });
  assert.match(page.headers['content-security-policy'], /default-src 'self'/, 'security headers on the compressed shell');
  assert.equal(page.headers['x-content-type-options'], 'nosniff');
});

test('the shell carries share tags with the PUBLIC_URL origin', async () => {
  const html = (await get('/')).body.toString('utf8');
  assert.match(html, /<link rel="canonical" href="https:\/\/share\.example\.org\/"/);
  assert.match(html, /property="og:image" content="https:\/\/share\.example\.org\/og-image\.png"/);
  assert.ok(!html.includes('thunai.example'));
  assert.match(html, /name="twitter:card" content="summary_large_image"/);
  assert.ok(!/apple-mobile-web-app-capable/.test(html), 'deprecated meta removed');
  assert.match(html, /<title>[^<]*[^.]<\/title>/, 'title has no trailing full stop');
  const og = file('/og-image.png');
  assert.equal(og.readUInt32BE(16), 1200);
  assert.equal(og.readUInt32BE(20), 630);
});
