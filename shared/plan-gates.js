// Plan gates (pure — no DOM, shared by the server, the app and the tests).
//
// Gates apply ONLY when the server runs with BILLING_ENFORCE=1 (`enforced` below); otherwise everything stays open.
// Basic use is always free: calendar, charts, guidance, basic porutham, baby-name browsing, meanings and
// star-letter suggestions, weekly plan view, one saved goal, one saved journey, up to 10 shortlisted names.
// Calculation quality, safety explanations and privacy controls are identical on every plan — nothing here
// gates them. A gate is shown only at the specific task, after the person has already seen a useful result.

/** Plans-screen feature lines added by the app (the server's plan list predates these features). */
export const PLAN_FEATURE_LINES = Object.freeze({
  free: [{ en: 'Daily Ithihasa: introduction and episode 1', ta: 'தினசரி இதிகாசம்: அறிமுகமும் முதல் பகுதியும்' }],
  paid: [{ en: 'Daily Ithihasa — Ramayanam & Mahabharatham, a new 15-minute episode each day, read aloud', ta: 'தினசரி இதிகாசம் — இராமாயணம், மகாபாரதம்: தினமும் புதிய 15 நிமிடப் பகுதி, குரலில் வாசிப்புடன்' }],
});

/** Free-plan limits for saved items (paid plans: no limit). */
export const FREE_LIMITS = Object.freeze({ goals: 1, shortlist: 10, journeys: 1 });

const f = (en, ta) => ({ en, ta });

/** "What this adds" — the exact list shown next to a locked task (no fear, no countdowns, no pressure). */
export const GATE_ADDS = Object.freeze({
  goals: { plan: 'personal', adds: [f('Save as many goals as you like (one is free)', 'எத்தனை இலக்குகளையும் சேமிக்கலாம் (ஒன்று இலவசம்)'), f('Each goal keeps its steps and weekly plan', 'ஒவ்வொரு இலக்கும் அதன் படிகளையும் வாரத் திட்டத்தையும் வைத்திருக்கும்')] },
  shortlist: { plan: 'personal', adds: [f('Shortlist more than 10 names', '10-க்கு மேற்பட்ட பெயர்களைப் பட்டியலிடலாம்'), f('Browsing, meanings and star letters stay free for everyone', 'பெயர் தேடல், பொருள், நட்சத்திர எழுத்துகள் அனைவருக்கும் இலவசமே')] },
  journeys: { plan: 'personal', adds: [f('Save more than one journey plan (one is free)', 'ஒன்றுக்கு மேற்பட்ட பயணத் திட்டங்களைச் சேமிக்கலாம் (ஒன்று இலவசம்)'), f('Or: Journey package — one journey, 60 days, one-time', 'அல்லது: யாத்திரைத் தொகுப்பு — ஒரு பயணம், 60 நாள், ஒருமுறைக் கட்டணம்')] },
  printReports: { plan: 'personal', adds: [f('Printable / PDF reports: Dasa road map, matching report, journey plan', 'அச்சிடக்கூடிய / PDF அறிக்கைகள்: தசா வரைபடம், பொருத்த அறிக்கை, பயணத் திட்டம்'), f('Or a one-time package for one couple or one journey', 'அல்லது ஒரு ஜோடி / ஒரு பயணத்திற்கான ஒருமுறைத் தொகுப்பு')] },
  predictions: { plan: 'personal', adds: [f('Detailed reports: life-timing periods, full chart analysis, detailed matching', 'விரிவான அறிக்கைகள்: வாழ்க்கை நேரக் காலங்கள், முழு ஜாதக ஆய்வு, விரிவான பொருத்தம்'), f('A monthly allowance of detailed answers', 'மாதாந்திர விரிவான பதில்கள்')] },
  matchingReport: { plan: 'personal', adds: [f('The full five-card matching report for this couple', 'இந்த ஜோடிக்கான முழு ஐந்து-அட்டைப் பொருத்த அறிக்கை'), f('Printable / exportable report', 'அச்சிட / ஏற்றுமதி செய்யக்கூடிய அறிக்கை'), f('Or: Marriage package — this couple only, 90 days, one-time', 'அல்லது: திருமணத் தொகுப்பு — இந்த ஜோடிக்கு மட்டும், 90 நாள், ஒருமுறைக் கட்டணம்')] },
  familyProfiles: { plan: 'family', adds: [f('Up to 8 family profiles in your account backup', 'கணக்குக் காப்பில் 8 குடும்ப உறுப்பினர்கள் வரை'), f('Each person shares only with permission; private profiles stay on this phone', 'ஒவ்வொருவரும் அனுமதியுடன் மட்டுமே பகிர்வர்; தனிப்பட்ட சுயவிவரம் இந்தக் கைப்பேசியிலேயே')] },
  familyCollab: { plan: 'family', adds: [f('Share goals, plans and events with family members who agree', 'ஒப்புக்கொள்ளும் குடும்பத்தினருடன் இலக்குகள், திட்டங்கள், நிகழ்வுகளைப் பகிரலாம்'), f('Up to 8 permission-based profiles', 'அனுமதி அடிப்படையிலான 8 சுயவிவரங்கள் வரை')] },
  sharedPlanning: { plan: 'family', adds: [f('Plan family events and journeys together', 'குடும்ப நிகழ்வுகள், பயணங்களை ஒன்றாகத் திட்டமிடலாம்'), f('Everyone sees the same plan, with permission', 'அனுமதியுடன் அனைவரும் ஒரே திட்டத்தைப் பார்ப்பர்')] },
  // Daily Ithihasa (screens-ithihasa.js): free = series intro + episode 1 in full + ~2-minute preview of later episodes.
  ithihasa: { plan: 'personal', adds: [f('Daily Ithihasa: every episode of Ramayanam and Mahabharatham, ~15 minutes a day, read aloud', 'தினசரி இதிகாசம்: இராமாயணம், மகாபாரதம் — ஒவ்வொரு நாளும் ~15 நிமிட உரை, குரலில் வாசிப்புடன்'), f('Continues each day from where you stopped', 'நேற்று விட்ட இடத்திலிருந்து ஒவ்வொரு நாளும் தொடரும்'), f('The introduction and episode 1 stay free for everyone', 'அறிமுகமும் முதல் பகுதியும் அனைவருக்கும் இலவசம்')] },
});

// FNV-1a — a short, stable tag so a couple's names or birth data are never sent in clear as the package scope.
const tagOf = (v) => { let h = 0x811c9dc5; for (const ch of String(v)) { h ^= ch.codePointAt(0); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(36); };
const personTag = (p) => {
  const m = p && typeof p === 'object' ? (p.member && typeof p.member === 'object' ? p.member : p) : null; // {member, chart} or a profile
  return tagOf(m ? (m.id ?? `${typeof m.name === 'string' ? m.name : m.name?.en || ''}|${m.date || m.dob || ''}|${m.time || ''}`) : p);
};
/** Stable, order-independent id for a couple (profiles, ids or strings), as captured by the Marriage package. */
export const pairKey = (a, b) => [personTag(a), personTag(b)].sort().join('+');

/**
 * Is `feature` allowed for these entitlements?
 * @param {object|null} ent  entitlements from /api/billing/me (null → open: billing not loaded / static build)
 * @param {boolean} enforced BILLING_ENFORCE on the server
 * @param {string} feature   a GATE_ADDS key
 * @param {{count?: number, scope?: {pairId?: string, journeyId?: string}}} [opts] count = items already saved
 */
export function gateAllows(ent, enforced, feature, { count = 0, scope = {} } = {}) {
  if (!enforced || !ent) return true;
  const inPair = !!scope?.pairId && (ent.matchingPairs || []).includes(scope.pairId);
  const inJourney = !!scope?.journeyId && (ent.journeyIds || []).includes(scope.journeyId);
  const under = (max, fallback) => { const m = max === undefined ? fallback : max; return m === null || count < m; };
  switch (feature) {
    case 'goals': return under(ent.goalsMax, FREE_LIMITS.goals);
    case 'shortlist': return under(ent.shortlistMax, FREE_LIMITS.shortlist);
    case 'journeys': return inJourney || under(ent.journeysMax, FREE_LIMITS.journeys);
    case 'printReports': return !!ent.printReports || inPair || inJourney;
    case 'predictions': case 'matchingReport': return !!ent.predictions || inPair;
    case 'familyProfiles': return count < (ent.familyProfiles ?? 1);
    case 'familyCollab': case 'sharedPlanning': return !!ent[feature];
    case 'ithihasa': return !!ent.predictions || !!ent.ithihasa; // Personal and Family plans
    default: return !!ent[feature];
  }
}

/**
 * Value summary ("Your Thunai so far") — counts of genuine completed items from this phone's own data and task
 * log. Factual counts only: never money saved, risks avoided or anything that was not actually done.
 * @param {{goals?: any, taskLog?: object, week?: any, journeys?: any[], nameFavs?: any[], reminders?: any}} local
 * @param {number} [now]
 */
export function valueSummary(local = {}, now = Date.now()) {
  const goalList = Array.isArray(local.goals) ? local.goals : Array.isArray(local.goals?.goals) ? local.goals.goals : [];
  const isDone = (x) => Boolean(x && (x.done === true || x.status === 'done' || x.status === 'completed' || x.completedAt));
  const log = local.taskLog && typeof local.taskLog === 'object' ? local.taskLog : {};
  const n = (k) => (Number.isInteger(log[k]) && log[k] > 0 ? log[k] : 0);
  const stepsFromGoals = goalList.reduce((s, g) => s + (Array.isArray(g?.steps) ? g.steps.filter(isDone).length : 0), 0);
  const trips = Array.isArray(local.reminders?.trips) ? local.reminders.trips : [];
  const kept = trips.filter((t) => { const at = Date.parse(t?.alarmAt || (t?.date ? `${t.date}T${t.time || '00:00'}:00` : '')); return Number.isFinite(at) && at <= now; }).length;
  return {
    goalsCompleted: Math.max(goalList.filter(isDone).length, n('goal_done')),
    stepsDone: Math.max(stepsFromGoals, n('goal_step')),
    weeklyPlansSaved: Math.max(n('weekly_plan'), local.week?.savedAt ? 1 : 0),
    journeysPlanned: Math.max(n('journey'), Array.isArray(local.journeys) ? local.journeys.length : 0),
    matchingReportsPrepared: n('porutham') + n('matching_report'),
    remindersKept: kept,
    namesShortlisted: Array.isArray(local.nameFavs) ? local.nameFavs.length : 0,
  };
}
