// Daily family relationship forecast ("இன்று உறவு நிலை"): for each pair of family members,
// how harmonious today is, and the chance of arguments (வாக்குவாதம்), with gentle advice.
const houseFrom = (from, to) => ((to - from + 12) % 12) + 1;

const REL_TA = { self: 'நான்', spouse: 'வாழ்க்கைத் துணை', son: 'மகன்', daughter: 'மகள்', father: 'தந்தை', mother: 'தாய்', other: 'உறவினர்', organization: 'நிறுவனம்' };
const REL_EN = { self: 'Me', spouse: 'Spouse', son: 'Son', daughter: 'Daughter', father: 'Father', mother: 'Mother', other: 'Relative', organization: 'Company' };

/**
 * Relationship label between two members, from the point of view of the family's "self" member.
 * e.g. self (male) + father → { en: 'Father – Son', ta: 'தந்தை – மகன்' }.
 */
export function pairLabel(a, b, family) {
  const self = family.find((m) => m.relation === 'self');
  const child = (g) => (g === 'female' ? ['Daughter', 'மகள்'] : ['Son', 'மகன்']);
  const parentOf = (r) => (r === 'father' ? ['Father', 'தந்தை'] : ['Mother', 'தாய்']);
  const spouseOf = (g) => (g === 'female' ? ['Wife', 'மனைவி'] : ['Husband', 'கணவன்']);
  const describe = (x, y) => {
    if (x.relation === 'self' && ['father', 'mother'].includes(y.relation)) { const p = parentOf(y.relation), c = child(x.gender); return { en: `${p[0]} – ${c[0]}`, ta: `${p[1]} – ${c[1]}` }; }
    if (x.relation === 'self' && y.relation === 'spouse') { const h = spouseOf(x.gender), w = spouseOf(y.gender); return { en: `${h[0]} – ${w[0]}`, ta: `${h[1]} – ${w[1]}` }; }
    if ((x.relation === 'self' || x.relation === 'spouse') && ['son', 'daughter'].includes(y.relation)) {
      const p = x.gender === 'female' ? ['Mother', 'தாய்'] : ['Father', 'தந்தை'];
      const c = y.relation === 'son' ? ['Son', 'மகன்'] : ['Daughter', 'மகள்'];
      return { en: `${p[0]} – ${c[0]}`, ta: `${p[1]} – ${c[1]}` };
    }
    if (x.relation === 'father' && y.relation === 'mother') return { en: 'Father – Mother', ta: 'தந்தை – தாய்' };
    if (['son', 'daughter'].includes(x.relation) && ['son', 'daughter'].includes(y.relation)) return { en: 'Siblings', ta: 'உடன்பிறப்புகள்' };
    if (x.relation === 'spouse' && ['father', 'mother'].includes(y.relation)) {
      const inlaw = y.relation === 'father' ? ['Father-in-law', 'மாமனார்'] : ['Mother-in-law', 'மாமியார்'];
      const dil = x.gender === 'male' ? ['Son-in-law', 'மருமகன்'] : ['Daughter-in-law', 'மருமகள்'];
      return { en: `${inlaw[0]} – ${dil[0]}`, ta: `${inlaw[1]} – ${dil[1]}` };
    }
    return null;
  };
  const d = describe(a, b) || describe(b, a);
  if (d) return d;
  return { en: `${REL_EN[a.relation] || ''} – ${REL_EN[b.relation] || ''}`.trim(), ta: `${REL_TA[a.relation] || ''} – ${REL_TA[b.relation] || ''}`.trim(), generic: !self };
}

/** Today's harmony between two birth charts, using today's panchang snapshot (Moon, Mars, Tara, weekday). */
export function relationToday(ca, cb, snap) {
  const reasons = [];
  let risk = 0;
  const add = (pts, en, ta) => { risk += pts; reasons.push({ pts, en, ta }); };
  const natal = houseFrom(ca.janmaRasi.index, cb.janmaRasi.index);
  if ([6, 8].includes(natal)) add(2, 'Your Moon signs are 6–8 apart (natural difference in temperament)', 'ராசிகள் 6–8 (சஷ்டாஷ்டகம்) — சுபாவ வேறுபாடு');
  else if ([2, 12].includes(natal)) add(1, 'Moon signs 2–12 apart (different priorities)', 'ராசிகள் 2–12 — முன்னுரிமைகள் வேறு');
  else if ([1, 5, 9, 7, 3, 11].includes(natal)) add(-1, 'Your Moon signs are naturally compatible', 'ராசிப் பொருத்தம் இயல்பாக நன்று');
  for (const c of [ca, cb]) {
    const pos = houseFrom(c.janmaRasi.index, snap.moonRasi.index);
    if (pos === 8) add(3, `Chandrashtamam for ${c.name} — moods may run high`, `${c.name} — சந்திராஷ்டமம், மனநிலை மாறலாம்`);
    else if ([6, 12].includes(pos)) add(1, `Moon ${pos}th from ${c.name}'s rasi`, `${c.name} ராசிக்கு ${pos}-ல் சந்திரன்`);
    const mars = houseFrom(c.janmaRasi.index, snap.planets.Mars.rasi);
    if ([1, 8].includes(mars)) add(1, `Mars transits ${mars === 1 ? 'over' : 'the 8th from'} ${c.name}'s Moon — quick temper`, `${c.name} ராசிக்கு ${mars}-ல் செவ்வாய் — சீக்கிரம் கோபம்`);
    const tara = ((snap.nakshatra.index - c.janmaNakshatra.index + 27) % 27) % 9;
    if ([2, 4, 6].includes(tara)) add(1, `Weak Tara Bala for ${c.name} today`, `${c.name} — இன்று தாரா பலம் குறைவு`);
  }
  if (snap.weekday.index === 2) add(1, 'Tuesday (Mars day) — words can be sharp', 'செவ்வாய்க்கிழமை — வார்த்தைகள் கடுமையாகலாம்');
  const level = risk >= 4 ? 'avoid' : risk >= 2 ? 'careful' : 'harmony';
  const text = {
    harmony: { en: 'Harmonious day — a good time to talk, plan together and share a meal.', ta: 'இணக்கமான நாள் — மனம் விட்டுப் பேச, சேர்ந்து திட்டமிட, ஒன்றாக உணவருந்த நல்ல நேரம்.' },
    careful: { en: 'Be gentle today — listen first; postpone sensitive topics to the evening.', ta: 'இன்று மென்மையாக இருங்கள் — முதலில் கேளுங்கள்; முக்கிய விஷயங்களை மாலைக்கு ஒத்திவையுங்கள்.' },
    avoid: { en: 'Arguments (vaakkuvaadham) are likely — avoid money or property discussions today; a short walk or prayer together helps.', ta: 'வாக்குவாதம் வர வாய்ப்பு — இன்று பணம், சொத்து பேச்சைத் தவிர்க்கவும்; சிறிது நடை அல்லது சேர்ந்து வழிபாடு உதவும்.' },
  }[level];
  return { level, risk, reasons, advice: text };
}

/** All pairs in the family (organisations excluded), most sensitive first. */
export function familyRelations(family, charts, snap) {
  const people = family.filter((m) => m.relation !== 'organization');
  const out = [];
  for (let i = 0; i < people.length; i++) {
    for (let j = i + 1; j < people.length; j++) {
      const a = people[i], b = people[j];
      out.push({ a, b, label: pairLabel(a, b, family), ...relationToday(charts[a.id], charts[b.id], snap) });
    }
  }
  return out.sort((x, y) => y.risk - x.risk);
}
