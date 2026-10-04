// Universal reminders (நினைவூட்டல்): any screen can add a 🔔 button with remindBtn({...}).
// One tap opens a sheet: alarm at the time / 1 hour before / 1 day before (6 AM) / on the morning (5:30 AM).
// Delivery, best first:
//   1. Native app (Android / iOS / Huawei): Capacitor Local Notifications — rings even when the app is closed.
//   2. Server push (when the morning alarm is on) — the reminder is synced with the push scheduler.
//   3. In-app: due reminders show on the home screen, and as a browser notification while the app is open.
//   4. "Add to phone calendar" (.ics with alarm) — works on every phone.
import { state, $, L, esc, store, toast, fmtTime, monthName, STATIC, api, activeMember, displayName } from './core.js';
import { icon } from './icons.js';

const KEY = 'kj_reminders';
const load = () => store.get(KEY, { morningTime: '05:30', trips: [], pushEndpoint: null });
const save = (r) => store.set(KEY, r);
const native = () => window.Capacitor?.isNativePlatform?.() && window.Capacitor?.Plugins?.LocalNotifications;
const tz = () => state.loc?.tz ?? 5.5;
const localParts = (d) => { const x = new Date(d.getTime() + tz() * 3600000); return { date: x.toISOString().slice(0, 10), time: x.toISOString().slice(11, 16) }; };
const fromLocal = (date, time) => { const [y, m, d] = date.split('-').map(Number); const [h, mi] = time.split(':').map(Number); return new Date(Date.UTC(y, m - 1, d, h, mi) - tz() * 3600000); };

/** HTML for a bell button. at: Date (instant of the event); title: text shown in the alarm. */
export function remindBtn({ title, at, place = '', label = '' }) {
  if (!at || Number.isNaN(new Date(at).getTime()) || new Date(at).getTime() < Date.now()) return ''; // only future times get a bell
  const data = esc(JSON.stringify({ title, at: new Date(at).toISOString(), place }));
  return `<button type="button" class="remind-btn" data-remind="${data}" aria-label="${esc(L('Set reminder', 'நினைவூட்டல் அமை'))}">${icon('alarm-clock', { size: 16 })}${label ? `<span>${esc(label)}</span>` : ''}</button>`;
}

const OPTIONS = [
  { id: 'on', en: 'At the time', ta: 'அதே நேரத்தில்', calc: (at) => at },
  { id: 'hour', en: '1 hour before', ta: '1 மணி நேரம் முன்', calc: (at) => new Date(at.getTime() - 3600000) },
  { id: 'morning', en: 'Same day morning (5:30)', ta: 'அன்று காலை (5:30)', calc: (at) => fromLocal(localParts(at).date, '05:30') },
  { id: 'daybefore', en: 'Day before evening (7 PM)', ta: 'முந்தைய நாள் மாலை (7 மணி)', calc: (at) => fromLocal(localParts(new Date(at.getTime() - 86400000)).date, '19:00') },
];

function openSheet(item) {
  const at = new Date(item.at);
  const now = Date.now();
  const opts = OPTIONS.map((o) => ({ ...o, when: o.calc(at) })).filter((o) => o.when.getTime() > now - 60000);
  const dt = (d) => { const p = localParts(d); return `${Number(p.date.slice(8))} ${monthName(Number(p.date.slice(5, 7)) - 1)} · ${fmtTime(d, tz())}`; };
  const box = document.createElement('div');
  box.className = 'modal';
  box.innerHTML = `<div class="modal-card remind-sheet" role="dialog" aria-modal="true">
    <div class="card-title"><span>${icon('alarm-clock', { size: 18 })} ${L('Set a reminder', 'நினைவூட்டல் அமை')}</span><button class="link-btn" data-x>✕</button></div>
    <p><b>${esc(item.title)}</b><br><span class="muted small">${dt(at)}${item.place ? ` · ${esc(item.place)}` : ''}</span></p>
    ${opts.length ? opts.map((o) => `<button class="remind-opt" data-opt="${o.id}"><span>${L(o.en, o.ta)}</span><small class="muted">${dt(o.when)}</small></button>`).join('')
    : `<p class="muted small">${L('This time has already passed.', 'இந்த நேரம் கடந்துவிட்டது.')}</p>`}
    <button class="chip-btn" data-ics>📅 ${L('Also add to phone calendar', 'கைப்பேசி நாட்காட்டியிலும் சேர்')}</button>
  </div>`;
  document.body.append(box);
  const close = () => box.remove();
  box.addEventListener('click', (e) => { if (e.target === box || e.target.closest('[data-x]')) close(); });
  box.querySelectorAll('[data-opt]').forEach((b) => b.addEventListener('click', async () => {
    const o = opts.find((x) => x.id === b.dataset.opt);
    await addReminder({ title: item.title, place: item.place, eventAt: at, alarmAt: o.when });
    close();
  }));
  box.querySelector('[data-ics]').addEventListener('click', () => { downloadIcs([{ title: item.title, start: at, place: item.place, alarm: '-PT60M' }], 'kaippesi-reminder.ics'); });
}

/** Save a reminder and schedule it everywhere we can. */
export async function addReminder({ title, place = '', eventAt, alarmAt }) {
  const r = load();
  const id = Math.random().toString(36).slice(2, 10);
  const p = localParts(alarmAt);
  r.trips.push({ id, kind: 'reminder', title, place, date: p.date, time: p.time, eventAt: new Date(eventAt).toISOString() });
  save(r);
  let how = L('Saved in the app', 'செயலியில் சேமிக்கப்பட்டது');
  const LN = native();
  if (LN) {
    try {
      const perm = await LN.requestPermissions();
      if (perm.display === 'granted') {
        await LN.schedule({ notifications: [{ id: Number.parseInt(id, 36) % 2147483000, title: L('Kaippesi Jothidar', 'கைப்பேசி ஜோதிடர்'), body: `🔔 ${title}`, schedule: { at: new Date(alarmAt), allowWhileIdle: true } }] });
        how = L('Alarm set on this phone', 'இந்தக் கைப்பேசியில் அலாரம் அமைக்கப்பட்டது');
      }
    } catch { /* fall back */ }
  } else if (r.pushEndpoint && !STATIC) {
    try { await syncPushTrips(r); how = L('Alarm set (notification)', 'அலாரம் அமைக்கப்பட்டது (அறிவிப்பு)'); } catch { /* ignore */ }
  } else if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission().catch(() => {});
  }
  toast(`🔔 ${how}`);
  scheduleInApp();
  document.dispatchEvent(new CustomEvent('kj:reminders'));
}

async function syncPushTrips(r) {
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return;
  const m = activeMember();
  const today = localParts(new Date()).date;
  await api('/api/push/subscribe', { method: 'POST', body: { subscription: sub.toJSON(), prefs: {
    morningTime: r.morningTime || null, tz: tz(), lat: state.loc?.lat, lon: state.loc?.lon, place: state.loc?.name, lang: state.lang, name: m ? displayName(m) : '',
    trips: r.trips.filter((t) => t.date >= today).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)).slice(0, 60)
      .map((t) => ({ id: t.id, date: t.date, time: t.time, title: t.title, place: t.place, kind: t.kind || 'trip' })),
  } } });
}

/** Upcoming reminders (alarm time from now on), soonest first. */
export function upcomingReminders(limit = 50) {
  const now = Date.now();
  return load().trips.map((t) => ({ ...t, alarm: fromLocal(t.date, t.time) })).filter((t) => t.alarm.getTime() > now - 3600000)
    .sort((a, b) => a.alarm - b.alarm).slice(0, limit);
}
export function deleteReminder(id) {
  const r = load();
  r.trips = r.trips.filter((t) => t.id !== id);
  save(r);
  const LN = native();
  if (LN) LN.cancel({ notifications: [{ id: Number.parseInt(id, 36) % 2147483000 }] }).catch(() => {});
  document.dispatchEvent(new CustomEvent('kj:reminders'));
}

/** Home card: reminders in the next 48 hours. */
export function reminderCard() {
  const soon = upcomingReminders().filter((t) => t.alarm.getTime() < Date.now() + 48 * 3600000);
  if (!soon.length) return '';
  return `<div class="card glass remind-card" data-go="reminders"><div class="card-title"><span>${icon('alarm-clock', { size: 18 })} ${L('Your reminders', 'உங்கள் நினைவூட்டல்கள்')}</span><span class="pill">${soon.length}</span></div>
    ${soon.slice(0, 4).map((t) => `<div class="factor"><span>🔔 ${esc(t.title)}</span><b class="zero">${fmtTime(t.alarm, tz())}</b></div>`).join('')}</div>`;
}

// While the app is open, ring due reminders as a notification (or a toast).
const timers = new Map();
export function scheduleInApp() {
  for (const t of timers.values()) clearTimeout(t);
  timers.clear();
  if (native()) return; // the OS rings them
  for (const r of upcomingReminders()) {
    const ms = r.alarm.getTime() - Date.now();
    if (ms < 0 || ms > 6 * 3600000) continue;
    timers.set(r.id, setTimeout(() => {
      const body = `🔔 ${r.title}`;
      if ('Notification' in window && Notification.permission === 'granted') {
        navigator.serviceWorker?.ready.then((reg) => reg.showNotification(L('Kaippesi Jothidar', 'கைப்பேசி ஜோதிடர்'), { body, tag: `rem-${r.id}` })).catch(() => toast(body, 8000));
      } else toast(body, 8000);
    }, ms));
  }
}

/** Calendar file with alarms — works on every phone. */
export function downloadIcs(events, filename = 'kaippesi.ics') {
  const pad = (n) => String(n).padStart(2, '0');
  const stamp = (d) => `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;
  const clean = (x) => String(x || '').replace(/[,;\n]/g, ' ');
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Kaippesi Jothidar//TA', 'CALSCALE:GREGORIAN'];
  for (const ev of events) {
    const s = new Date(ev.start);
    lines.push('BEGIN:VEVENT', `UID:${Math.random().toString(36).slice(2)}@kaippesi`, `DTSTAMP:${stamp(new Date())}`, `DTSTART:${stamp(s)}`, `DTEND:${stamp(new Date(s.getTime() + 30 * 60000))}`,
      `SUMMARY:${clean(ev.title)}`, ev.place ? `LOCATION:${clean(ev.place)}` : '', 'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${clean(ev.title)}`, `TRIGGER:${ev.alarm || '-PT60M'}`, 'END:VALARM', 'END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  const text = lines.filter(Boolean).join('\r\n');
  (async () => {
    if (STATIC && window.claude?.use) {
      const dl = await window.claude.use('downloads').catch(() => null);
      if (dl) { try { await dl.save({ filename, data: text }); return; } catch { /* declined */ } }
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'text/calendar' }));
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  })();
}

document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-remind]');
  if (!b) return;
  e.preventDefault();
  e.stopPropagation();
  try { openSheet(JSON.parse(b.dataset.remind)); } catch { /* bad data */ }
}, true);
scheduleInApp();
