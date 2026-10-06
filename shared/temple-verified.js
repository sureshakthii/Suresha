// Reviewed temple facts. ONLY add an entry after checking an authorised, current source
// (temple office by phone, the official HR&CE / devasthanam website, or a visit) — never from memory or blogs.
// Every entry needs: source (who/what was checked), verifiedOn (YYYY-MM-DD) and verifiedBy (reviewer name).
// Entries older than STALE_DAYS are shown as "needs re-check" automatically.
//
// Format:
//   madurai_meenakshi: {
//     hours: { en: '5:00–12:30, 16:00–21:30', ta: 'காலை 5:00–மதியம் 12:30, மாலை 4:00–இரவு 9:30',
//              source: 'Temple office phone call', verifiedOn: '2026-10-10', verifiedBy: 'Reviewer name' },
//     accessibility: { en: 'Ramp at the east entrance; wheelchairs on request', ta: '…', source: '…', verifiedOn: '…', verifiedBy: '…' },
//     association: { en: 'Navagraha sthalam for Mercury', ta: '…', source: 'HR&CE temple page', verifiedOn: '…', verifiedBy: '…' },
//   },
export const STALE_DAYS = 180;
export const VERIFIED = {};

/** A reviewed field for a temple, with freshness. Returns null when nothing reviewed exists. */
export function verifiedField(templeId, field, now = new Date()) {
  const v = VERIFIED[templeId]?.[field];
  if (!v || !v.source || !/^\d{4}-\d{2}-\d{2}$/.test(v.verifiedOn || '')) return null;
  const ageDays = (now - new Date(`${v.verifiedOn}T00:00:00Z`)) / 86400000;
  return { ...v, stale: ageDays > STALE_DAYS };
}
