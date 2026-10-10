// Automatic reading of an imported horoscope (photo or PDF) — entirely on this device.
//
// Loaded only when the family taps "Import": nothing here (and none of the ~14 MB in vendor/ocr/) is fetched before.
// Every file comes from this app's own folder by relative URL, so it works offline in the Android app, on the static
// web build and on the server build alike. The image / PDF never leaves the phone.
//
//   vendor/ocr/tesseract.esm.min.js         tesseract.js 5.1.1 (Apache-2.0) — main-thread API
//   vendor/ocr/worker.min.js                tesseract.js 5.1.1 web worker
//   vendor/ocr/tesseract-core-simd-lstm.wasm.js, tesseract-core-lstm.wasm.js
//                                           tesseract.js-core 5.1.1, LSTM-only builds (SIMD and non-SIMD phones)
//   vendor/ocr/lang/{tam,eng}.traineddata.gz @tesseract.js-data 1.0.0, 4.0.0_best_int models (Apache-2.0)
//   vendor/ocr/pdf.min.js, pdf.worker.min.js pdfjs-dist 4.10.38 legacy build (Apache-2.0), renamed from .mjs
import { parseHoroscopeText } from './shared/horoscope-parse.js';

const BASE = new URL('./vendor/ocr/', import.meta.url).href;
const MAX_SIDE = 2400;
const PDF_PAGES = 2;

let tesseractMod = null;
let pdfMod = null;

const STALL_MS = 45000;

/**
 * Wait for `promise`, but give up when nothing has moved for STALL_MS (`last.t` is bumped on every progress message)
 * or when the family cancels. A WebAssembly blocked by a page policy aborts inside the worker without any error
 * reaching us — the watchdog turns that silence into an error, so the screen can offer manual entry instead.
 */
function guarded(promise, last, signal) {
  return new Promise((resolve, reject) => {
    const timer = setInterval(() => { if (Date.now() - last.t > STALL_MS) { done(); reject(new Error('The on-device reader stopped responding')); } }, 2000);
    const onAbort = () => { done(); reject(new DOMException('Cancelled', 'AbortError')); };
    const done = () => { clearInterval(timer); signal?.removeEventListener('abort', onAbort); };
    if (signal?.aborted) { onAbort(); return; }
    signal?.addEventListener('abort', onAbort, { once: true });
    promise.then((v) => { done(); resolve(v); }, (e) => { done(); reject(e); });
  });
}

/** Progress reporter: onProgress({ stage: 'load' | 'read' | 'pdf', page, pages, progress (0–1) }). */
async function getWorker(onProgress, pageInfo, last, signal) {
  if (!tesseractMod) tesseractMod = (await import(`${BASE}tesseract.esm.min.js`)).default;
  const creating = tesseractMod.createWorker(['tam', 'eng'], 1, {
    workerPath: `${BASE}worker.min.js`,
    corePath: BASE.replace(/\/$/, ''), // folder: the worker picks the SIMD or plain LSTM core itself
    langPath: `${BASE}lang`,
    gzip: true,
    cacheMethod: 'none', // the files are already on the device; do not keep a second copy in IndexedDB
    workerBlobURL: false, // load the worker from its own same-origin URL (no blob: worker needed under a strict CSP)
    logger: (m) => {
      last.t = Date.now();
      if (!onProgress || typeof m.progress !== 'number') return;
      const stage = m.status === 'recognizing text' ? 'read' : 'load';
      onProgress({ stage, progress: m.progress, ...pageInfo() });
    },
    errorHandler: () => {},
  });
  // If we give up while it is still loading, stop the worker as soon as it exists.
  const worker = await guarded(creating, last, signal).catch((e) => { creating.then((w) => w.terminate()).catch(() => {}); throw e; });
  await worker.setParameters({ preserve_interword_spaces: '1' });
  return worker;
}

/** Image file → canvas, scaled so the longer side is at most MAX_SIDE (small photos are enlarged a little). */
async function imageCanvas(file) {
  const bmp = await createImageBitmap(file);
  const long = Math.max(bmp.width, bmp.height);
  const scale = long > MAX_SIDE ? MAX_SIDE / long : long < 1200 ? Math.min(2, 1200 / long) : 1;
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale);
  const g = c.getContext('2d');
  g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
  g.drawImage(bmp, 0, 0, c.width, c.height);
  bmp.close?.();
  return c;
}

const canvasBlob = (c) => new Promise((res) => c.toBlob(res, 'image/png'));

async function ocrCanvases(canvases, onProgress, signal) {
  let page = 0;
  const last = { t: Date.now() };
  const worker = await getWorker(onProgress, () => ({ page: page + 1, pages: canvases.length }), last, signal);
  try {
    const parts = [];
    for (; page < canvases.length; page++) {
      if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
      last.t = Date.now();
      const { data } = await guarded(worker.recognize(await canvasBlob(canvases[page])), last, signal);
      parts.push({ text: data.text, confidence: data.confidence });
    }
    return parts;
  } finally {
    await worker.terminate().catch(() => {});
  }
}

async function loadPdf() {
  if (!pdfMod) {
    pdfMod = await import(`${BASE}pdf.min.js`);
    pdfMod.GlobalWorkerOptions.workerSrc = `${BASE}pdf.worker.min.js`;
  }
  return pdfMod;
}

/** Text layer of a page, rebuilt into lines (items sorted top-to-bottom, then left-to-right). */
async function pageText(page) {
  const tc = await page.getTextContent();
  const rows = [];
  for (const it of tc.items) {
    if (!it.str) continue;
    const y = it.transform[5], x = it.transform[4];
    let row = rows.find((r) => Math.abs(r.y - y) < Math.max(2, (it.height || 10) * 0.5));
    if (!row) { row = { y, items: [] }; rows.push(row); }
    row.items.push({ x, s: it.str });
  }
  return rows.sort((a, b) => b.y - a.y).map((r) => r.items.sort((a, b) => a.x - b.x).map((i) => i.s).join(' ').replace(/\s+/g, ' ').trim()).filter(Boolean).join('\n');
}

/**
 * Read a horoscope file (image or PDF). Returns { text, source: 'image' | 'pdf-text' | 'pdf-ocr', pages, confidence }.
 * A PDF's own text layer is used when it yields birth details; otherwise its first pages are rendered and read by OCR
 * (scanned PDFs, and Tamil PDFs typed in old non-Unicode fonts whose text layer is unreadable).
 */
export async function readHoroscopeFile(file, { onProgress, signal } = {}) {
  const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name || '');
  if (!isPdf) {
    onProgress?.({ stage: 'load', progress: 0, page: 1, pages: 1 });
    const parts = await ocrCanvases([await imageCanvas(file)], onProgress, signal);
    return { text: parts[0].text, source: 'image', pages: 1, confidence: parts[0].confidence };
  }
  onProgress?.({ stage: 'pdf', progress: 0, page: 1, pages: 1 });
  const pdfjs = await loadPdf();
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()), isEvalSupported: false, disableAutoFetch: true, enableXfa: false }).promise;
  try {
    const n = Math.min(PDF_PAGES, doc.numPages);
    const pages = [];
    for (let i = 1; i <= n; i++) pages.push(await doc.getPage(i));
    const textLayer = (await Promise.all(pages.map(pageText))).join('\n');
    // Tamil text layers are often unusable: old non-Unicode fonts, or vowel signs stored in visual order ("ெப யர்"
    // for "பெயர்"). A pre-base vowel sign at the start of a word gives that away.
    const brokenTamil = /(^|[\s(])[\u0BC6-\u0BC8]/m.test(textLayer);
    if (!brokenTamil && parseHoroscopeText(textLayer).found >= 2) return { text: textLayer, source: 'pdf-text', pages: n, confidence: null };
    const canvases = [];
    for (const page of pages) {
      if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
      const v1 = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({ scale: Math.min(4, MAX_SIDE / Math.max(v1.width, v1.height)) });
      const c = document.createElement('canvas');
      c.width = Math.round(viewport.width); c.height = Math.round(viewport.height);
      const g = c.getContext('2d');
      g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
      await page.render({ canvasContext: g, viewport }).promise;
      canvases.push(c);
    }
    const parts = await ocrCanvases(canvases, onProgress, signal);
    const text = parts.map((p) => p.text).join('\n');
    return { text, source: 'pdf-ocr', pages: n, confidence: Math.round(parts.reduce((a, p) => a + p.confidence, 0) / parts.length) };
  } finally {
    doc.destroy();
  }
}
