// Shared read-aloud player (Daily Ithihasa and the Hymn reader): speaks a list of texts one unit at a time with a
// Tamil voice, highlighting as it goes. Web Speech API with a Tamil (ta-IN) voice; a native TextToSpeech plugin is
// used when the app has one. With no Tamil voice it steps through the units at reading pace ("read-along").

export const nativeTts = () => window.Capacitor?.isNativePlatform?.() && window.Capacitor?.Plugins?.TextToSpeech;

let voiceCache = null;
/** { tamil: SpeechSynthesisVoice|null, engine: 'web'|'native'|'none' } — waits briefly for voices to load. */
export async function detectVoice() {
  if (nativeTts()) return { tamil: null, engine: 'native' };
  if (!('speechSynthesis' in window)) return { tamil: null, engine: 'none' };
  if (voiceCache) return voiceCache;
  let voices = speechSynthesis.getVoices();
  if (!voices.length) {
    voices = await new Promise((res) => {
      const done = () => res(speechSynthesis.getVoices());
      speechSynthesis.addEventListener?.('voiceschanged', done, { once: true });
      setTimeout(done, 1500);
    });
  }
  const tamil = voices.find((v) => /^ta([-_]|$)/i.test(v.lang)) || null;
  voiceCache = { tamil, engine: tamil ? 'web' : 'none' };
  if (voices.length) setTimeout(() => { voiceCache = null; }, 30000); // re-check later (voice data may be installed)
  return voiceCache;
}

/** Sentence-sized chunks: long utterances get cut off on phones. */
export function chunks(text) {
  const out = [];
  for (const p of String(text).replace(/\s+/g, ' ').trim().split(/(?<=[.!?।])\s+/)) {
    if (p.length <= 200) { if (p) out.push(p); continue; }
    let rest = p;
    while (rest.length > 200) { const cut = rest.lastIndexOf(' ', 200); out.push(rest.slice(0, cut > 80 ? cut : 200)); rest = rest.slice(cut > 80 ? cut + 1 : 200); }
    if (rest) out.push(rest);
  }
  return out;
}

/**
 * One player (one voice at a time). textAt(i) gives unit i's text; set player.max before playing.
 * Hooks: onPara(i) when unit i starts, onState() when playing/engine changes, onEnd() after the last unit.
 * Extra fields (the current episode, hymn …) may be stored on the returned object by the caller.
 */
export function createPlayer({ textAt, wpm = 130, lang = 'ta-IN', minMs = 2500 }) {
  const player = { gen: 0, playing: false, i: 0, max: 0, rate: 1, timer: null, engine: 'none', onPara: null, onState: null, onEnd: null };
  /** No voice: hold each unit for the time it takes to read it at the chosen speed. */
  const readAlong = (text, next) => {
    const words = String(text).split(/\s+/).filter(Boolean).length;
    player.timer = setTimeout(next, Math.max(minMs, (words / (wpm * player.rate)) * 60000));
  };
  player.stop = () => {
    player.gen++;
    player.playing = false;
    clearTimeout(player.timer);
    try { if ('speechSynthesis' in window) speechSynthesis.cancel(); } catch { /* ignore */ }
    try { nativeTts()?.stop?.(); } catch { /* ignore */ }
    player.onState?.();
  };
  /** Speak (or, with no Tamil voice, time) unit i, then continue with the next one. */
  player.playFrom = async (i) => {
    player.stop();
    const gen = ++player.gen;
    player.i = Math.max(0, Math.min(i, player.max - 1));
    player.playing = true;
    player.onState?.();
    const v = await detectVoice();
    if (gen !== player.gen) return;
    player.engine = v.engine;
    player.onState?.();
    const step = () => {
      if (gen !== player.gen) return;
      if (player.i >= player.max) { player.playing = false; player.onState?.(); player.onEnd?.(); return; }
      player.onPara?.(player.i);
      const text = textAt(player.i);
      const next = () => { if (gen !== player.gen) return; player.i++; step(); };
      if (v.engine === 'native') {
        nativeTts().speak({ text, lang, rate: player.rate, category: 'playback' }).then(next).catch(() => { player.engine = 'none'; readAlong(text, next); });
      } else if (v.engine === 'web') {
        const parts = chunks(text);
        if (!parts.length) { readAlong(text, next); return; }
        parts.forEach((c, k) => {
          const u = new SpeechSynthesisUtterance(c);
          u.lang = lang; u.voice = v.tamil; u.rate = player.rate;
          if (k === parts.length - 1) u.onend = next;
          u.onerror = (e) => { if (e?.error !== 'interrupted' && e?.error !== 'canceled' && k === parts.length - 1) next(); };
          speechSynthesis.speak(u);
        });
      } else readAlong(text, next);
    };
    step();
  };
  return player;
}

/** Browsers allow speech only after a tap. */
export const userHasTapped = () => (navigator.userActivation ? navigator.userActivation.hasBeenActive : true);
