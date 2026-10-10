// Optional daily notifications for the morning brief, the evening lamp time, Sunday "your week" and the 1st-of-month
// "your month" — computed on this phone (shared/daily-brief.js), nothing sent to a server.
//   • Installed app: Capacitor Local Notifications for the next 7 days (re-planned every time the app opens, so the
//     text always matches that day). Ids 7100000–7100099 are reserved for these.
//   • Browser: a notification only while Thunai is open (the existing morning alarm in Alarm & reminders uses push).
// Everything is off until the person switches it on (Settings → Daily brief & reminders); the permission prompt is
// shown only from that switch.
import { state, store, L, activeMember, chartOf, displayName, BRAND } from './core.js';
import { morningBrief, briefNotification, sandhyaReminder, weekAhead, monthAhead, briefSettings, instantAt, isoAt, addDaysIso } from './shared/daily-brief.js';

export const SETTINGS_KEY = 'kj_daily';
export const ID_BASE = 7100000;
const IDS = Array.from({ length: 100 }, (_, i) => ID_BASE + i);
export const settings = () => briefSettings(store.get(SETTINGS_KEY, {}));
const native = () => (window.Capacitor?.isNativePlatform?.() && window.Capacitor?.Plugins?.LocalNotifications) || null;

/** The person the notifications are about: the "self" profile, else the active person (never a company profile). */
export function briefPerson() {
  const people = state.family.filter((m) => m.relation !== 'organization');
  return people.find((m) => m.relation === 'self' && !m.shared) || (activeMember()?.relation !== 'organization' ? activeMember() : null) || people[0] || null;
}
/** Residence place for wall-clock times (the brief arrives at 6:30 where the person lives). */
const home = () => state.residence || state.loc;

/** The notifications to plan for the next `days` days: [{ id, at, title, body, kind }]. Pure apart from state. */
export function plannedNotifications({ now = new Date(), days = 7, s = settings() } = {}) {
  const loc = home();
  if (!loc || !Number.isFinite(loc.lat)) return [];
  const tz = Number(loc.tz ?? 5.5);
  const m = briefPerson();
  let chart = null;
  try { chart = m ? chartOf(m) : null; } catch { chart = null; }
  const name = m ? displayName(m) : '';
  const lang = state.lang === 'en' ? 'en' : 'ta';
  const pick = (x) => (lang === 'ta' ? x.ta : x.en);
  const out = [];
  const today = isoAt(now, tz);
  for (let i = 0; i < days; i++) {
    const date = addDaysIso(today, i);
    const at = instantAt(date, s.morningTime, tz);
    if (s.notify && at > now) {
      try {
        const b = morningBrief({ chart, member: m, name, loc, now: at, from: at });
        const n = briefNotification(b, lang);
        out.push({ id: ID_BASE + i, at, title: n.title, body: n.body, kind: 'brief' });
      } catch { /* a day the engine cannot compute is skipped */ }
      const wd = new Date(`${date}T12:00:00Z`).getUTCDay();
      if (s.weekly && wd === 0) {
        try { const w = weekAhead({ chart, loc, start: date, member: m, now: at }); out.push({ id: ID_BASE + 40 + i, at: new Date(at.getTime() + 60000), title: `🗓️ ${pick(w.title)}`, body: w.lines.map((l) => pick(l.text)).join('\n'), kind: 'week' }); } catch { /* skip */ }
      }
      if (s.monthly && date.endsWith('-01')) {
        try { const mo = monthAhead({ chart, loc, month: date.slice(0, 7), member: m, now: at }); out.push({ id: ID_BASE + 60 + i, at: new Date(at.getTime() + 120000), title: `📅 ${pick(mo.title)}`, body: mo.lines.map((l) => pick(l.text)).join('\n'), kind: 'month' }); } catch { /* skip */ }
      }
    }
    if (s.sandhya) {
      const r = sandhyaReminder({ loc, date });
      if (r && r.at > now) out.push({ id: ID_BASE + 20 + i, at: r.at, title: `🪔 ${L('Evening lamp', 'மாலை விளக்கு')}`, body: pick(r.text), kind: 'sandhya' });
    }
  }
  return out;
}

const timers = [];
/**
 * (Re)plan the notifications. ask=true may show the permission prompt (only from the Settings switch).
 * Returns 'native' | 'browser' | 'off' | 'denied'.
 */
export async function scheduleBriefNotifications({ ask = false } = {}) {
  const s = settings();
  timers.splice(0).forEach(clearTimeout);
  const LN = native();
  const wanted = s.notify || s.sandhya;
  if (LN) {
    try { await LN.cancel({ notifications: IDS.map((id) => ({ id })) }); } catch { /* none planned */ }
    if (!wanted) return 'off';
    try {
      let perm = await LN.checkPermissions();
      if (perm.display !== 'granted' && ask) perm = await LN.requestPermissions();
      if (perm.display !== 'granted') return 'denied';
      const list = plannedNotifications({ s });
      if (list.length) await LN.schedule({ notifications: list.map((n) => ({ id: n.id, title: n.title, body: n.body, largeBody: n.body, schedule: { at: n.at, allowWhileIdle: true }, extra: { go: 'home', kind: n.kind } })) });
      return 'native';
    } catch { return 'denied'; }
  }
  if (!wanted || !('Notification' in window)) return 'off';
  if (Notification.permission === 'default' && ask) { try { await Notification.requestPermission(); } catch { /* ignore */ } }
  if (Notification.permission !== 'granted') return 'denied';
  // Browser: only what falls in the next 12 hours, while this tab stays open.
  for (const n of plannedNotifications({ s, days: 2 })) {
    const ms = n.at.getTime() - Date.now();
    if (ms < 0 || ms > 12 * 3600000) continue;
    timers.push(setTimeout(() => {
      navigator.serviceWorker?.ready.then((reg) => reg.showNotification(n.title || L(BRAND.name, BRAND.nameTa), { body: n.body, tag: `brief-${n.id}` }))
        .catch(() => { try { new Notification(n.title, { body: n.body }); } catch { /* ignore */ } });
    }, ms));
  }
  return 'browser';
}
