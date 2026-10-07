# Astrological Rule Registry

The registry in `shared/rules/` is the single authority for yoga, house-role and dosha rules
(brief §3). `shared/analysis.js`, `shared/porutham.js` and `shared/lifecheck.js` consume
evaluations from it and do not define rules of their own.

Every rule is **`proposed`** (or `disputed`) and `reviewer: null`. AI drafted these rules. It
cannot certify that they are classically authentic. The validator stops any rule from being
marked `approved` until a named reviewer is set.

## Layout

| File | Contents |
|---|---|
| `shared/rules/core.js` | Sign and house arithmetic, the aspect table, conjunction, mutual aspect and exchange, dignity, combustion, `makeContext()`, `planetModifiers()` |
| `shared/rules/define.js` | `defineRule()` defaults, relation definitions (`REL`) |
| `shared/rules/profiles.js` | Tradition profiles and `resolveProfile()` |
| `shared/rules/yogas.js` | Yoga rules (the repaired existing ones and the section-5 priority 20) |
| `shared/rules/chevvai.js` | Chevvai rule, each Chevvai exception as a separate rule, Rahu-Ketu rule |
| `shared/rules/disputed.js` | Kala Sarpa, Pitru, Shrapit, Punarphoo, Grahana. All off by default |
| `shared/rules/roles.js` | House-lord role facts (`houseRoles`), the functional benefic/malefic table for all 12 Lagnas |
| `shared/rules/registry.js` | `RULES`, `getRule`, `listRules`, `validateRegistry`, `evaluateRule`, `evaluateRules`, `relevantPeriods`, `inputStability` |

Registry version: `REGISTRY_VERSION` (currently `0.1.0`). Each rule also has its own `version`.

## Definitions shared by every rule

- **Conjunction**: both planets in the same sidereal sign (rasi). No degree orb is used.
- **Aspect**: full graha drishti counted inclusively in signs. Every planet aspects the 7th.
  Mars also aspects the 4th and 8th, Jupiter the 5th and 9th, and Saturn the 3rd and 10th.
  Rahu and Ketu aspect the 5th, 7th and 9th. This node rule matches the existing engine table.
  A profile can turn it off with `nodeAspects: false`.
- **Mutual aspect**: each planet aspects the sign the other occupies.
- **Exchange (parivartana)**: each planet sits in a sign the other owns.
- **House**: whole-sign, counted inclusively from the rule's reference (`lagna`, `moon` or
  `sun`). House 1 is the reference sign.
- **Combustion orbs** (profile `combustion`): Moon 12°, Mars 17°, Mercury 14° (12° when
  retrograde), Jupiter 11°, Venus 10° (8° when retrograde), Saturn 15°. A planet is combust when
  its separation from the Sun is **strictly less** than the orb.
- **Natural benefics** in yoga predicates: Mercury, Jupiter, Venus.
  **Natural malefics**: Sun, Mars, Saturn, Rahu, Ketu.
- **"Strong lord"** is a provisional test used by Lakshmi, Kahala and Sankha. The lord must be in
  its own or exaltation sign, or in a kendra or trikona from Lagna. It must also be neither
  debilitated nor combust. **The astrologer must approve or replace this test.**

## Field reference

| Field | Meaning |
|---|---|
| `id` | Stable id, for example `yoga.gajakesari`. Never reuse or rename an id. Add a new one instead. |
| `legacyId` | The id the existing UI uses (`gajakesari`, `mahapurusha_Mars`…). It can be a function of the result. |
| `name` | `{en, ta}` |
| `kind` | `yoga`, `role` or `dosha` |
| `role` | `'exception'` for exception rules. These are not evaluated on their own in `evaluateRules`. |
| `profiles` | Profile ids the rule belongs to |
| `profileFlag` | A profile flag that must be `true` for the rule to run (`showDisputed`) |
| `source` | `{text, edition, passage}`. The value is "to be cited by reviewer" unless it is known. |
| `status` | `approved` (needs `reviewer`), `proposed` or `disputed` |
| `reference` | `lagna`, `moon` or `sun` |
| `planets`, `houses` | The planets and houses involved, as information for the reviewer |
| `relation` | `{type, definition}` |
| `predicateText` | The exact predicate in plain words. It is what the astrologer signs off. |
| `predicate(ctx)` | Returns `{present?, variants?, facts, involved, data, cancellation?, unavailable?}` |
| `defaultVariants` / `enabledVariants(profile)` | The variant flags that count toward `present` |
| `exceptions` | `[{id, status, text}]`. Exceptions are listed only. They never silently cancel. |
| `strengthModifiers(ctx, res)` | Returns `[{factor, effect: 'supports' \| 'weakens' \| 'note', text}]` |
| `activation(ctx, res)` | The dasa/bhukti lords that activate the rule. The default is `res.involved`. |
| `explanation` | `{en, ta}`, worded to encourage |
| `version`, `reviewer`, `fixtures` | Governance fields. `fixtures` names the test file. |
| `tone` | `good` or `mild`. This maps to the legacy `kind`. |
| `remedyPolicy` | `free-only`, or `none` for disputed labels, which are never paired with any remedy |

## Evaluation output (`evaluateRule` / `evaluateRules`)

```
{ ruleId, legacyId, title, version, kind, status, disputed, tone, name, reference, relation, profile,
  present,                 // the configuration (enabled variants only)
  unavailable, needs,      // needs: 'birth-time' when the rule needs a Lagna the chart lacks
  facts: [{en,ta}],
  variants: { <flag>: { present, enabled, unavailable, facts } },
  enabledPresent: [flags],
  cancellation: { conditions: [{id, status, satisfied, planets, text}], anySatisfied } | null,
  notRajaYoga,             // true for Neecha Bhanga
  strength: { label: 'plain'|'supported'|'mixed'|'modified', supports, weakens, modifiers, note } | null,
  periods:  { lords, dasas: [{lord,start,end}], current: {dasa, bhukti, dasaActivates, bhuktiActivates}, note } | null,
  stability: { status: 'exact'|'stable'|'unstable', unstableInputs: [...], windowMinutes? },
  explanation, source, reviewer, remedyPolicy }
```

The output keeps three things apart: whether the configuration is present, its strength, and the
relevant periods. Modifiers never set `present` to false. Weakening is reported as a modifier
instead. A Neecha Bhanga is never relabelled as a Raja Yoga. `stability` comes from
`chart.stability` (approximate or unknown birth times). It lists the inputs this rule read, such
as the Lagna or a planet's house, that change within the uncertainty window.

## How to add a rule

1. Choose a stable `id` (`yoga.<name>`, `role.<name>`, `dosha.<name>`) and add it with
   `defineRule({...})` in the right module. Use the helpers in `core.js`. Do not write ad-hoc
   aspect or house arithmetic.
2. Write `predicateText` first, in plain words, then implement exactly that. If texts disagree,
   implement each version as a separate **variant flag**. Choose the primary flag in
   `defaultVariants` and leave the others off.
3. Report weakening conditions in `strengthModifiers`, not in the predicate.
4. Set `status: 'proposed'` and `reviewer: null`. Cite `source` only when you are sure of it.
   Otherwise leave "to be cited by reviewer".
5. Add the rule to the module's exported list (`YOGA_RULES` …).
6. Add hand-worked fixtures in `test/rules-*.test.js`: a positive, a negative and a boundary
   case, using synthetic `planets` with explicit rasi and longitude. The yoga coverage test fails
   if an enabled yoga rule is missing any of the three.
7. Run `npm test`. `validateRegistry()` must return `[]`.
8. Add the rule to the sign-off sheet below and send it to the master astrologer. A disputed or
   high-impact rule also needs a second, independent reviewer.

Profiles: `parashari-tamil-default` and `parashari-tamil-review` (the same, with
`showDisputed: true`). Pass `{ profile: { base, ...overrides } }` to override flags. For example:
`{ variants: { 'yoga.raja': ['conjunction','exchange'] } }` or
`{ chevvai: { applyExceptions: ['dosha.chevvai.exc.jupiter_conjunct'] } }`.

## Behaviour notes

- **Ayul Balam is retired.** `ayulBalam()` returns a stub (`{removed: true, level: null, score: null, text: null}`).
  `deepMarriageChecks()` has no `ayul` check and no 8th-house "mangalyam & long life" check
  (`retired` lists both). `deep.ayul` is a crash-safe stub.
- **Papa Samyam** is compared symmetrically (`|difference| ≤ PAPA_TOLERANCE`). The gendered
  "groom ≥ bride" rule is not used.
- **Chevvai exceptions** are listed with `appliesUnderProfile`. They cancel only when a profile
  lists them in `chevvai.applyExceptions`. None are listed by default.
- **Dosha samyam** compares like with like and gives the same result in either pair order. When
  only one chart has a Lagna, both charts are compared by the Moon reference.
- **Maraka**: only the 2nd and 7th lords and occupants are reported. No secondary 3rd/8th rule is
  applied, because the original arithmetic was wrong. Nothing in the roles feeds a lifespan,
  health or death statement.
- **Unknown birth time**: rules that need the Lagna return `unavailable` / `needs: 'birth-time'`.
  Moon- and Sun-referenced rules still run.

## Full rule list

| Rule id | Name | Kind | Reference | Status | Source | Default flags |
|---|---|---|---|---|---|---|
| `yoga.gajakesari` | Gaja Kesari Yoga | yoga | moon | proposed | Phaladeepika (Mantreswara) | — |
| `yoga.budhaditya` | Budha-Aditya Yoga | yoga | lagna | proposed | to be cited by reviewer | — |
| `yoga.chandramangala` | Chandra-Mangala Yoga | yoga | moon | proposed | to be cited by reviewer | conjunction |
| `yoga.mahapurusha.ruchaka` | Ruchaka Yoga (Pancha Mahapurusha) | yoga | lagna | proposed | Brihat Parashara Hora Shastra; Phaladeepika (Mantreswara) | lagna |
| `yoga.mahapurusha.bhadra` | Bhadra Yoga (Pancha Mahapurusha) | yoga | lagna | proposed | Brihat Parashara Hora Shastra; Phaladeepika (Mantreswara) | lagna |
| `yoga.mahapurusha.hamsa` | Hamsa Yoga (Pancha Mahapurusha) | yoga | lagna | proposed | Brihat Parashara Hora Shastra; Phaladeepika (Mantreswara) | lagna |
| `yoga.mahapurusha.malavya` | Malavya Yoga (Pancha Mahapurusha) | yoga | lagna | proposed | Brihat Parashara Hora Shastra; Phaladeepika (Mantreswara) | lagna |
| `yoga.mahapurusha.sasa` | Sasa Yoga (Pancha Mahapurusha) | yoga | lagna | proposed | Brihat Parashara Hora Shastra; Phaladeepika (Mantreswara) | lagna |
| `role.yogakaraka` | Yogakaraka | role | lagna | proposed | to be cited by reviewer | — |
| `yoga.raja` | Raja Yoga (kendra–trikona lords) | yoga | lagna | proposed | to be cited by reviewer | conjunction |
| `yoga.dhana` | Dhana Yoga (wealth lords) | yoga | lagna | proposed | to be cited by reviewer | conjunction |
| `yoga.viparita.harsha` | Harsha Yoga (Viparita Raja Yoga) | yoga | lagna | proposed | Phaladeepika (Mantreswara) | — |
| `yoga.viparita.sarala` | Sarala Yoga (Viparita Raja Yoga) | yoga | lagna | proposed | Phaladeepika (Mantreswara) | — |
| `yoga.viparita.vimala` | Vimala Yoga (Viparita Raja Yoga) | yoga | lagna | proposed | Phaladeepika (Mantreswara) | — |
| `yoga.adhi` | Adhi Yoga | yoga | moon | proposed | Brihat Parashara Hora Shastra; Phaladeepika (Mantreswara) | full, partial |
| `yoga.neechabhanga.sun` | Neecha Bhanga — Sun (cancellation of debilitation) | yoga | lagna | proposed | Brihat Parashara Hora Shastra; Phaladeepika (Mantreswara) | — |
| `yoga.neechabhanga.moon` | Neecha Bhanga — Moon (cancellation of debilitation) | yoga | lagna | proposed | Brihat Parashara Hora Shastra; Phaladeepika (Mantreswara) | — |
| `yoga.neechabhanga.mars` | Neecha Bhanga — Mars (cancellation of debilitation) | yoga | lagna | proposed | Brihat Parashara Hora Shastra; Phaladeepika (Mantreswara) | — |
| `yoga.neechabhanga.mercury` | Neecha Bhanga — Mercury (cancellation of debilitation) | yoga | lagna | proposed | Brihat Parashara Hora Shastra; Phaladeepika (Mantreswara) | — |
| `yoga.neechabhanga.jupiter` | Neecha Bhanga — Jupiter (cancellation of debilitation) | yoga | lagna | proposed | Brihat Parashara Hora Shastra; Phaladeepika (Mantreswara) | — |
| `yoga.neechabhanga.venus` | Neecha Bhanga — Venus (cancellation of debilitation) | yoga | lagna | proposed | Brihat Parashara Hora Shastra; Phaladeepika (Mantreswara) | — |
| `yoga.neechabhanga.saturn` | Neecha Bhanga — Saturn (cancellation of debilitation) | yoga | lagna | proposed | Brihat Parashara Hora Shastra; Phaladeepika (Mantreswara) | — |
| `yoga.kemadruma` | Kemadruma (mild) | yoga | moon | proposed | Brihat Parashara Hora Shastra; Phaladeepika (Mantreswara) | — |
| `yoga.sunapha` | Sunapha Yoga | yoga | moon | proposed | Brihat Parashara Hora Shastra; Phaladeepika (Mantreswara) | standard |
| `yoga.anapha` | Anapha Yoga | yoga | moon | proposed | Brihat Parashara Hora Shastra; Phaladeepika (Mantreswara) | standard |
| `yoga.durudhara` | Durudhara Yoga | yoga | moon | proposed | Brihat Parashara Hora Shastra; Phaladeepika (Mantreswara) | standard |
| `yoga.vesi` | Vesi Yoga | yoga | sun | proposed | Brihat Parashara Hora Shastra; Phaladeepika (Mantreswara) | — |
| `yoga.vasi` | Vasi Yoga | yoga | sun | proposed | Brihat Parashara Hora Shastra; Phaladeepika (Mantreswara) | — |
| `yoga.ubhayachari` | Ubhayachari Yoga | yoga | sun | proposed | Brihat Parashara Hora Shastra; Phaladeepika (Mantreswara) | — |
| `yoga.parivartana.maha` | Maha Parivartana Yoga | yoga | lagna | proposed | Phaladeepika (Mantreswara) | — |
| `yoga.parivartana.khala` | Khala Parivartana Yoga | yoga | lagna | proposed | Phaladeepika (Mantreswara) | — |
| `yoga.parivartana.dainya` | Dainya Parivartana Yoga | yoga | lagna | proposed | Phaladeepika (Mantreswara) | — |
| `yoga.lakshmi` | Lakshmi Yoga | yoga | lagna | proposed | Brihat Parashara Hora Shastra; Phaladeepika (Mantreswara) | — |
| `yoga.saraswati` | Saraswati Yoga | yoga | lagna | proposed | Phaladeepika (Mantreswara) | — |
| `yoga.amala` | Amala Yoga | yoga | lagna | proposed | Phaladeepika (Mantreswara) | lagna, moon |
| `yoga.vasumathi` | Vasumathi Yoga | yoga | lagna | proposed | Phaladeepika (Mantreswara) | lagna, moon |
| `yoga.parvata` | Parvata Yoga | yoga | lagna | proposed | Brihat Parashara Hora Shastra | beneficKendra |
| `yoga.kahala` | Kahala Yoga | yoga | lagna | proposed | Brihat Parashara Hora Shastra | lordsMutualKendra |
| `yoga.chamara` | Chamara Yoga | yoga | lagna | proposed | Brihat Parashara Hora Shastra | lagnaLordExalted |
| `yoga.sankha` | Sankha Yoga | yoga | lagna | proposed | Brihat Parashara Hora Shastra | lordsMutualKendra |
| `role.house_lords` | House lords and placements | role | lagna | proposed | to be cited by reviewer | — |
| `role.badhaka` | Badhaka house and lord | role | lagna | proposed | to be cited by reviewer | — |
| `role.maraka` | 2nd and 7th house lords (Maraka houses in Parashari terms) | role | lagna | proposed | to be cited by reviewer | — |
| `role.kendradhipathya` | Functional benefic / malefic profile (Kendradhipathya) | role | lagna | proposed | Laghu Parashari (Jataka Chandrika) — as commonly summarised | — |
| `dosha.chevvai` | Chevvai dosham | dosha | lagna | proposed | Tamil regional marriage-matching convention | per profile |
| `dosha.chevvai.exc.own_exalted` | Mars in own sign or exalted (Mesha, Vrischika, Makara) | dosha (exception) | lagna | proposed | Tamil regional marriage-matching convention | — |
| `dosha.chevvai.exc.simha_kumbha` | Mars in Simha or Kumbha | dosha (exception) | lagna | proposed | Tamil regional marriage-matching convention | — |
| `dosha.chevvai.exc.jupiter_conjunct` | Jupiter with Mars | dosha (exception) | lagna | proposed | Tamil regional marriage-matching convention | — |
| `dosha.chevvai.exc.second_mithuna_kanni` | Mars in the 2nd (from Lagna) in Mithuna or Kanni | dosha (exception) | lagna | proposed | Tamil regional marriage-matching convention | — |
| `dosha.rahuketu` | Rahu-Ketu dosham | dosha | lagna | proposed | Tamil regional marriage-matching convention | per profile |
| `dosha.kalasarpa` | Kala Sarpa (disputed label) | dosha | lagna | disputed | to be cited by reviewer | — |
| `dosha.pitru` | Pitru (disputed label) | dosha | lagna | disputed | to be cited by reviewer | sunWithNode |
| `dosha.shrapit` | Shrapit (disputed label) | dosha | lagna | disputed | to be cited by reviewer | — |
| `dosha.punarphoo` | Punarphoo (disputed label) | dosha | lagna | disputed | to be cited by reviewer | conjunction |
| `dosha.grahana` | Grahana label (Sun/Moon with a node; disputed) | dosha | lagna | disputed | to be cited by reviewer | — |

## Astrologer sign-off sheet

Tick **approve**, or write the correction: predicate, exceptions, which variant flags should be
on, source edition and passage. After sign-off, the engineer sets `status: 'approved'`, the
`reviewer` and the `source`, and bumps the rule `version`.

Also for review: the provisional "strong lord" test, the combustion orbs, node aspects, the
Badhaka scheme, and the 12-Lagna functional table in `shared/rules/roles.js` (`FUNCTIONAL_TABLE`).

| Rule id | Predicate in plain words | Exceptions / variants to decide | Approve / correct |
|---|---|---|---|
| `yoga.gajakesari` | Jupiter in the 1st, 4th, 7th or 10th sign counted from the Moon. | gk.bphs_extra_conditions: Some texts additionally require benefic aspect/association and Jupiter free of debilitation or combustion. Recorded here as strength modifiers, not as an exclusion — reviewer to decide. | ☐ approve ☐ correct: |
| `yoga.budhaditya` | Sun and Mercury in the same sign. Combustion and degree separation are reported as modifiers. | ba.frequency: Very common: Mercury never moves more than about 28° from the Sun. Whether a combust Mercury still forms the yoga is for the reviewer. | ☐ approve ☐ correct: |
| `yoga.chandramangala` | Moon and Mars in the same sign. Variant (separate flag, off by default): Moon and Mars in mutual 7th aspect. | — | ☐ approve ☐ correct: |
| `yoga.mahapurusha.ruchaka` | Mars in its own or exaltation sign AND in a kendra (1/4/7/10) from Lagna. Moon-reference is a separate variant flag, off by default (the reference is never silently switched). | pmp.strength_conditions: Texts differ on whether combustion, planetary war or association with the Sun/Moon reduces or removes the yoga. Reported as modifiers; reviewer to decide. | ☐ approve ☐ correct: |
| `yoga.mahapurusha.bhadra` | Mercury in its own or exaltation sign AND in a kendra (1/4/7/10) from Lagna. Moon-reference is a separate variant flag, off by default (the reference is never silently switched). | pmp.strength_conditions: Texts differ on whether combustion, planetary war or association with the Sun/Moon reduces or removes the yoga. Reported as modifiers; reviewer to decide. | ☐ approve ☐ correct: |
| `yoga.mahapurusha.hamsa` | Jupiter in its own or exaltation sign AND in a kendra (1/4/7/10) from Lagna. Moon-reference is a separate variant flag, off by default (the reference is never silently switched). | pmp.strength_conditions: Texts differ on whether combustion, planetary war or association with the Sun/Moon reduces or removes the yoga. Reported as modifiers; reviewer to decide. | ☐ approve ☐ correct: |
| `yoga.mahapurusha.malavya` | Venus in its own or exaltation sign AND in a kendra (1/4/7/10) from Lagna. Moon-reference is a separate variant flag, off by default (the reference is never silently switched). | pmp.strength_conditions: Texts differ on whether combustion, planetary war or association with the Sun/Moon reduces or removes the yoga. Reported as modifiers; reviewer to decide. | ☐ approve ☐ correct: |
| `yoga.mahapurusha.sasa` | Saturn in its own or exaltation sign AND in a kendra (1/4/7/10) from Lagna. Moon-reference is a separate variant flag, off by default (the reference is never silently switched). | pmp.strength_conditions: Texts differ on whether combustion, planetary war or association with the Sun/Moon reduces or removes the yoga. Reported as modifiers; reviewer to decide. | ☐ approve ☐ correct: |
| `role.yogakaraka` | A single planet that rules both a kendra (4/7/10) and a trikona (5/9) counted from Lagna. | — | ☐ approve ☐ correct: |
| `yoga.raja` | A lord of the 4th, 7th or 10th and a different lord of the 5th or 9th (from Lagna) are related. Separate flags: conjunction (default), mutual aspect, exchange, and Lagna-lord inclusion (Lagna lord with any 4/5/7/9/10 lord). | — | ☐ approve ☐ correct: |
| `yoga.dhana` | A lord of the 2nd or 11th and a different lord of the 5th or 9th (from Lagna) are related. Separate flags: conjunction (default), mutual aspect, exchange, and Lagna-lord inclusion (Lagna lord with the 2nd/11th lord). | — | ☐ approve ☐ correct: |
| `yoga.viparita.harsha` | The lord of the 6th house (from Lagna) is placed in the 6th, 8th or 12th house. | viparita.harsha.association: Some authorities require the lord to be free of association with other (non-dusthana) lords. Not applied — reviewer to decide. | ☐ approve ☐ correct: |
| `yoga.viparita.sarala` | The lord of the 8th house (from Lagna) is placed in the 6th, 8th or 12th house. | viparita.sarala.association: Some authorities require the lord to be free of association with other (non-dusthana) lords. Not applied — reviewer to decide. | ☐ approve ☐ correct: |
| `yoga.viparita.vimala` | The lord of the 12th house (from Lagna) is placed in the 6th, 8th or 12th house. | viparita.vimala.association: Some authorities require the lord to be free of association with other (non-dusthana) lords. Not applied — reviewer to decide. | ☐ approve ☐ correct: |
| `yoga.adhi` | Natural benefics (Mercury, Jupiter, Venus) in the 6th, 7th or 8th from the Moon. Flags: full = all three; partial = exactly two; fromLagna = two or more in 6/7/8 from Lagna (separate, off by default). | adhi.unafflicted: Some texts require the benefics to be free of malefic association; reported as a modifier, not an exclusion. | ☐ approve ☐ correct: |
| `yoga.neechabhanga.sun` | Sun is debilitated (Thula) AND at least one enabled classical cancellation condition holds. Each condition is a separate flag. This is reported as Neecha Bhanga only — never automatically as a Raja Yoga. | neechabhanga.dispositor_kendra_lagna: Lord of the debilitation sign is in a kendra from Lagna neechabhanga.dispositor_kendra_moon: Lord of the debilitation sign is in a kendra from the Moon neechabhanga.exalt_lord_kendra_lagna: Lord of the planet's exaltation sign is in a kendra from Lagna neechabhanga.exalt_lord_kendra_moon: Lord of the planet's exaltation sign is in a kendra from the Moon neechabhanga.exalting_planet_kendra: The planet exalted in this sign is in a kendra from Lagna or Moon neechabhanga.aspected_by_dispositor: The debilitated planet is aspected by the lord of its sign neechabhanga.conjunct_dispositor: The debilitated planet is with the lord of its sign neechabhanga.dispositor_exalt_lord_mutual_kendra: Lords of the debilitation and exaltation signs are in mutual kendras neechabhanga.exalted_in_navamsa: The planet is exalted in the navamsa (D9) | ☐ approve ☐ correct: |
| `yoga.neechabhanga.moon` | Moon is debilitated (Vrischika) AND at least one enabled classical cancellation condition holds. Each condition is a separate flag. This is reported as Neecha Bhanga only — never automatically as a Raja Yoga. | neechabhanga.dispositor_kendra_lagna: Lord of the debilitation sign is in a kendra from Lagna neechabhanga.dispositor_kendra_moon: Lord of the debilitation sign is in a kendra from the Moon neechabhanga.exalt_lord_kendra_lagna: Lord of the planet's exaltation sign is in a kendra from Lagna neechabhanga.exalt_lord_kendra_moon: Lord of the planet's exaltation sign is in a kendra from the Moon neechabhanga.exalting_planet_kendra: The planet exalted in this sign is in a kendra from Lagna or Moon neechabhanga.aspected_by_dispositor: The debilitated planet is aspected by the lord of its sign neechabhanga.conjunct_dispositor: The debilitated planet is with the lord of its sign neechabhanga.dispositor_exalt_lord_mutual_kendra: Lords of the debilitation and exaltation signs are in mutual kendras neechabhanga.exalted_in_navamsa: The planet is exalted in the navamsa (D9) | ☐ approve ☐ correct: |
| `yoga.neechabhanga.mars` | Mars is debilitated (Kataka) AND at least one enabled classical cancellation condition holds. Each condition is a separate flag. This is reported as Neecha Bhanga only — never automatically as a Raja Yoga. | neechabhanga.dispositor_kendra_lagna: Lord of the debilitation sign is in a kendra from Lagna neechabhanga.dispositor_kendra_moon: Lord of the debilitation sign is in a kendra from the Moon neechabhanga.exalt_lord_kendra_lagna: Lord of the planet's exaltation sign is in a kendra from Lagna neechabhanga.exalt_lord_kendra_moon: Lord of the planet's exaltation sign is in a kendra from the Moon neechabhanga.exalting_planet_kendra: The planet exalted in this sign is in a kendra from Lagna or Moon neechabhanga.aspected_by_dispositor: The debilitated planet is aspected by the lord of its sign neechabhanga.conjunct_dispositor: The debilitated planet is with the lord of its sign neechabhanga.dispositor_exalt_lord_mutual_kendra: Lords of the debilitation and exaltation signs are in mutual kendras neechabhanga.exalted_in_navamsa: The planet is exalted in the navamsa (D9) | ☐ approve ☐ correct: |
| `yoga.neechabhanga.mercury` | Mercury is debilitated (Meena) AND at least one enabled classical cancellation condition holds. Each condition is a separate flag. This is reported as Neecha Bhanga only — never automatically as a Raja Yoga. | neechabhanga.dispositor_kendra_lagna: Lord of the debilitation sign is in a kendra from Lagna neechabhanga.dispositor_kendra_moon: Lord of the debilitation sign is in a kendra from the Moon neechabhanga.exalt_lord_kendra_lagna: Lord of the planet's exaltation sign is in a kendra from Lagna neechabhanga.exalt_lord_kendra_moon: Lord of the planet's exaltation sign is in a kendra from the Moon neechabhanga.exalting_planet_kendra: The planet exalted in this sign is in a kendra from Lagna or Moon neechabhanga.aspected_by_dispositor: The debilitated planet is aspected by the lord of its sign neechabhanga.conjunct_dispositor: The debilitated planet is with the lord of its sign neechabhanga.dispositor_exalt_lord_mutual_kendra: Lords of the debilitation and exaltation signs are in mutual kendras neechabhanga.exalted_in_navamsa: The planet is exalted in the navamsa (D9) | ☐ approve ☐ correct: |
| `yoga.neechabhanga.jupiter` | Jupiter is debilitated (Makara) AND at least one enabled classical cancellation condition holds. Each condition is a separate flag. This is reported as Neecha Bhanga only — never automatically as a Raja Yoga. | neechabhanga.dispositor_kendra_lagna: Lord of the debilitation sign is in a kendra from Lagna neechabhanga.dispositor_kendra_moon: Lord of the debilitation sign is in a kendra from the Moon neechabhanga.exalt_lord_kendra_lagna: Lord of the planet's exaltation sign is in a kendra from Lagna neechabhanga.exalt_lord_kendra_moon: Lord of the planet's exaltation sign is in a kendra from the Moon neechabhanga.exalting_planet_kendra: The planet exalted in this sign is in a kendra from Lagna or Moon neechabhanga.aspected_by_dispositor: The debilitated planet is aspected by the lord of its sign neechabhanga.conjunct_dispositor: The debilitated planet is with the lord of its sign neechabhanga.dispositor_exalt_lord_mutual_kendra: Lords of the debilitation and exaltation signs are in mutual kendras neechabhanga.exalted_in_navamsa: The planet is exalted in the navamsa (D9) | ☐ approve ☐ correct: |
| `yoga.neechabhanga.venus` | Venus is debilitated (Kanni) AND at least one enabled classical cancellation condition holds. Each condition is a separate flag. This is reported as Neecha Bhanga only — never automatically as a Raja Yoga. | neechabhanga.dispositor_kendra_lagna: Lord of the debilitation sign is in a kendra from Lagna neechabhanga.dispositor_kendra_moon: Lord of the debilitation sign is in a kendra from the Moon neechabhanga.exalt_lord_kendra_lagna: Lord of the planet's exaltation sign is in a kendra from Lagna neechabhanga.exalt_lord_kendra_moon: Lord of the planet's exaltation sign is in a kendra from the Moon neechabhanga.exalting_planet_kendra: The planet exalted in this sign is in a kendra from Lagna or Moon neechabhanga.aspected_by_dispositor: The debilitated planet is aspected by the lord of its sign neechabhanga.conjunct_dispositor: The debilitated planet is with the lord of its sign neechabhanga.dispositor_exalt_lord_mutual_kendra: Lords of the debilitation and exaltation signs are in mutual kendras neechabhanga.exalted_in_navamsa: The planet is exalted in the navamsa (D9) | ☐ approve ☐ correct: |
| `yoga.neechabhanga.saturn` | Saturn is debilitated (Mesha) AND at least one enabled classical cancellation condition holds. Each condition is a separate flag. This is reported as Neecha Bhanga only — never automatically as a Raja Yoga. | neechabhanga.dispositor_kendra_lagna: Lord of the debilitation sign is in a kendra from Lagna neechabhanga.dispositor_kendra_moon: Lord of the debilitation sign is in a kendra from the Moon neechabhanga.exalt_lord_kendra_lagna: Lord of the planet's exaltation sign is in a kendra from Lagna neechabhanga.exalt_lord_kendra_moon: Lord of the planet's exaltation sign is in a kendra from the Moon neechabhanga.exalting_planet_kendra: The planet exalted in this sign is in a kendra from Lagna or Moon neechabhanga.aspected_by_dispositor: The debilitated planet is aspected by the lord of its sign neechabhanga.conjunct_dispositor: The debilitated planet is with the lord of its sign neechabhanga.dispositor_exalt_lord_mutual_kendra: Lords of the debilitation and exaltation signs are in mutual kendras neechabhanga.exalted_in_navamsa: The planet is exalted in the navamsa (D9) | ☐ approve ☐ correct: |
| `yoga.kemadruma` | No planet among Mars, Mercury, Jupiter, Venus, Saturn in the 2nd or 12th from the Moon (Sun and nodes not counted). Traditional cancellations are checked and listed separately; the configuration itself is not erased. | kemadruma.cancel.conjunct_moon: A planet (Mars–Saturn) in the same sign as the Moon kemadruma.cancel.kendra_from_moon: A planet (Mars–Saturn) in a kendra (4/7/10) from the Moon kemadruma.cancel.moon_kendra_from_lagna: The Moon in a kendra from Lagna kemadruma.cancel.jupiter_aspects_moon: Jupiter aspects the Moon | ☐ approve ☐ correct: |
| `yoga.sunapha` | Planet(s) among Mars–Saturn in the 2nd from the Moon and none in the 12th (if both are occupied it is Durudhara). Flag `inclusive`: 2nd occupied regardless of the 12th (off by default). | — | ☐ approve ☐ correct: |
| `yoga.anapha` | Planet(s) among Mars–Saturn in the 12th from the Moon and none in the 2nd. Flag `inclusive`: 12th occupied regardless of the 2nd (off by default). | — | ☐ approve ☐ correct: |
| `yoga.durudhara` | Planet(s) among Mars–Saturn in BOTH the 2nd and the 12th from the Moon. | — | ☐ approve ☐ correct: |
| `yoga.vesi` | Planet(s) among Mars–Saturn (not Moon, not nodes) in the 2nd from the Sun and none in the 12th. | — | ☐ approve ☐ correct: |
| `yoga.vasi` | Planet(s) among Mars–Saturn in the 12th from the Sun and none in the 2nd. | — | ☐ approve ☐ correct: |
| `yoga.ubhayachari` | Planet(s) among Mars–Saturn in BOTH the 2nd and the 12th from the Sun. | — | ☐ approve ☐ correct: |
| `yoga.parivartana.maha` | An exchange of signs between the lords of two houses, both from {1,2,4,5,7,9,10,11}. | — | ☐ approve ☐ correct: |
| `yoga.parivartana.khala` | An exchange of signs involving the 3rd lord, with no 6th/8th/12th lord involved. | — | ☐ approve ☐ correct: |
| `yoga.parivartana.dainya` | An exchange of signs involving a 6th, 8th or 12th lord. | — | ☐ approve ☐ correct: |
| `yoga.lakshmi` | The 9th lord is in its own or exaltation sign AND placed in a kendra or trikona from Lagna, AND the Lagna lord is strong (provisional: own or exaltation sign, or placed in a kendra/trikona from Lagna; and neither debilitated nor combust). | — | ☐ approve ☐ correct: |
| `yoga.saraswati` | Jupiter, Venus and Mercury are each in a kendra, a trikona or the 2nd from Lagna, AND Jupiter is in its own, exaltation or a natural friend's sign. | — | ☐ approve ☐ correct: |
| `yoga.amala` | A natural benefic (Mercury, Jupiter or Venus) occupies the 10th from Lagna (flag `lagna`) or the 10th from the Moon (flag `moon`). Flag `exclusive` (off by default): the 10th from Lagna holds benefics and no malefic. | — | ☐ approve ☐ correct: |
| `yoga.vasumathi` | All three natural benefics (Mercury, Jupiter, Venus) occupy upachaya houses (3/6/10/11) from Lagna (flag `lagna`) or from the Moon (flag `moon`). | — | ☐ approve ☐ correct: |
| `yoga.parvata` | Flag `beneficKendra` (default): at least one natural benefic in a kendra from Lagna AND the 6th and 8th are empty or hold no natural malefic. Flag `lordsMutualKendra` (off by default): Lagna lord and 12th lord in mutual kendras. | — | ☐ approve ☐ correct: |
| `yoga.kahala` | Flag `lordsMutualKendra` (default): 4th and 9th lords (different planets) in mutual kendras AND Lagna lord strong (provisional: own or exaltation sign, or placed in a kendra/trikona from Lagna; and neither debilitated nor combust). Flag `fourthLordDignified` (off by default): 4th lord in own/exaltation sign and conjunct or aspected by the 10th lord. | — | ☐ approve ☐ correct: |
| `yoga.chamara` | Flag `lagnaLordExalted` (default): Lagna lord exalted, in a kendra from Lagna, and aspected by Jupiter. Flag `twoBenefics` (off by default): two or more natural benefics together in the 1st, 7th, 9th or 10th. | — | ☐ approve ☐ correct: |
| `yoga.sankha` | Flag `lordsMutualKendra` (default): 5th and 6th lords (different planets) in mutual kendras AND Lagna lord strong (provisional: own or exaltation sign, or placed in a kendra/trikona from Lagna; and neither debilitated nor combust). Flag `lagnaTenthMovable` (off by default): Lagna lord and 10th lord together in a movable sign AND 9th lord strong. | — | ☐ approve ☐ correct: |
| `role.house_lords` | For each house: its sign, the sign lord, the house where that lord sits, and the occupants. Lagna/5th/9th/8th/12th lords are shown as placement facts only (no categorical prediction such as "12th lord = foreign travel"). | — | ☐ approve ☐ correct: |
| `role.badhaka` | Badhaka house = 11th for a movable Lagna, 9th for a fixed Lagna, 7th for a dual Lagna. House, lord, occupants and associated planets (conjunct or aspecting the lord) are separate facts. No penalty or warning. | — | ☐ approve ☐ correct: |
| `role.maraka` | 2nd lord and 7th lord with their placements, and the occupants of the 2nd and 7th, as separate facts. No secondary rule is applied. Never used for lifespan, health or death statements. | — | ☐ approve ☐ correct: |
| `role.kendradhipathya` | Looks up the reviewed per-Lagna table of functional benefics, malefics and yogakaraka. Natural benefics ruling kendras are listed as a fact; no universal malefic penalty is applied. | — | ☐ approve ☐ correct: |
| `dosha.chevvai` | Mars in the 2nd, 4th, 7th, 8th or 12th counted from each enabled reference (profile default: Lagna and Moon, each a separate flag). Exceptions are separate rules and are not auto-applied. | — | ☐ approve ☐ correct: |
| `dosha.chevvai.exc.own_exalted` | Mars in own sign or exalted (Mesha, Vrischika, Makara) | — | ☐ approve ☐ correct: |
| `dosha.chevvai.exc.simha_kumbha` | Mars in Simha or Kumbha | — | ☐ approve ☐ correct: |
| `dosha.chevvai.exc.jupiter_conjunct` | Jupiter with Mars | — | ☐ approve ☐ correct: |
| `dosha.chevvai.exc.second_mithuna_kanni` | Mars in the 2nd (from Lagna) in Mithuna or Kanni | — | ☐ approve ☐ correct: |
| `dosha.rahuketu` | Rahu or Ketu in the 1st, 2nd, 7th or 8th counted from each enabled reference (profile default: Lagna only; Moon is a separate flag). | — | ☐ approve ☐ correct: |
| `dosha.kalasarpa` | All of Sun..Saturn have longitudes inside one half of the zodiac bounded by Rahu and Ketu. Flags: `rahuToKetu`, `ketuToRahu`. | — | ☐ approve ☐ correct: |
| `dosha.pitru` | Flag `sunWithNode` (default): Sun in the same sign as Rahu or Ketu. Flag `rahuNinth` (off): Rahu in the 9th from Lagna. | — | ☐ approve ☐ correct: |
| `dosha.shrapit` | Saturn and Rahu in the same sign. | — | ☐ approve ☐ correct: |
| `dosha.punarphoo` | Flag `conjunction` (default): Saturn and Moon in the same sign. Flag `mutualAspect` (off): Saturn and Moon in mutual aspect. | — | ☐ approve ☐ correct: |
| `dosha.grahana` | Flag `sun`: Sun in the same sign as Rahu or Ketu. Flag `moon`: Moon in the same sign as Rahu or Ketu. Sign-sharing only — no eclipse geometry is computed and none is implied. | — | ☐ approve ☐ correct: |

## Dosham & Nivarthi rules (shared/dosham.js) — status: proposed, need astrologer sign-off

Owner requirement (Oct 2026): the app must name the doshams a senior jothidar would read — including the ones that
delay marriage, children and work — and give a nivarthi plan (parigara sthalam, day / time, best period, free home
practice, charity, what not to do). `shared/dosham.js` composes these from the registry rules above (Chevvai and
Rahu–Ketu exactly as `dosha.chevvai` / `dosha.rahuketu` evaluate them; Kala Sarpa, Shrapit and Grahana re-use the
disputed predicates; Kemadruma re-uses `yoga.kemadruma`) plus the composite rules below. **Every rule is AI-drafted and
`proposed`; none is approved.** Severity is a count of traditional factors (never the word "severe"): 1 = mild,
2 = moderate, 3+ = strong, each listed cancellation lowering it by one step. Combustion uses the profile orbs
(Mercury 14° / 12° retrograde, Venus 10° / 8°, Jupiter 11°, Mars 17°, Saturn 15°, Moon 12°) and states the orb used.

**Policy change to review.** The registry keeps the contested labels (Kala Sarpa, Pitru, Shrapit, Grahana) at
`status: disputed` and `remedyPolicy: none` for reports and matching. The dosham engine now SHOWS them (owner decision),
always marked "traditional; some astrologers differ", always mild unless several factors combine, and pairs them only
with free practice and a parigara sthalam framed as belief — never a paid remedy. The reviewer must confirm or reverse this.

Base rates (300 random Chennai charts, 1950–2005, as of 7 Oct 2026; recorded by test/dosham.test.js on 30 charts):
average 4.3 items per chart, 1.5 moderate-or-strong, 0.3 strong; Chevvai 64% (the registry rule with Lagna + Moon
references), Putra 47%, Kalathra 44%, Sani transit 44% (Ezharai / Ashtama / Ardhashtama), combustion 44%,
Rahu–Ketu 34%, Pitru 30%, Sani 26%, Lagna lord in 6/8/12 25%, Sani–Sevvai 22%, Grahana 17%, Naga 14%, Guru Chandala 8%,
Shrapit 7%, Kala Sarpa 4%, Kemadruma (uncancelled) 2%. The UI shows mild ones as "lighter notes".

| Rule id | Predicate (plain words) | Needs Lagna | Contested | Sign-off |
|---|---|---|---|---|
| `dosham.rahuketu` | Rahu or Ketu in the 1st/7th or 2nd/8th from Lagna (exactly the registry rule dosha.rahuketu, Lagna reference); a node in the 5th is a Putra-dosham factor. Base: moderate. Softened by Jupiter aspecting/joining the node, or the node in Rishabam/Mithunam/Kanni/Kumbam (Rahu) or Vrischikam/Dhanusu (Ketu). | yes | — | ☐ approve ☐ correct: |
| `dosham.kalasarpa` | All seven planets on one side of the Rahu–Ketu axis by longitude (registry predicate dosha.kalasarpa). Rahu→Ketu side: Kala Sarpa; Ketu→Rahu side: Kala Amirtha. Always mild; marked traditional/disputed. | no | yes | ☐ approve ☐ correct: |
| `dosham.chevvai` | Exactly the registry rule dosha.chevvai (Mars in 2/4/7/8/12 from Lagna and/or Moon, profile references). Severity: one reference mild, both moderate, +1 for Mars in the 7th/8th from Lagna; each registry exception that holds lowers it one step and is listed as a cancellation (exceptions are not auto-applied, so presence matches the registry). | no | — | ☐ approve ☐ correct: |
| `dosham.sani` | Saturn in the 1st, 5th or 7th from Lagna (not already reported as Sani–Sevvai in that house). 7th: moderate; 1st/5th: mild; debilitated +1; own/exalted −1; Jupiter aspect −1. | yes | — | ☐ approve ☐ correct: |
| `dosham.sanisevvai` | Saturn and Mars in the same sign (moderate) or in mutual aspect (mild); +1 when they occupy the Lagna, 5th or 7th; Jupiter aspecting the conjunction −1. | no | — | ☐ approve ☐ correct: |
| `dosham.lagnalord` | Lagna lord in the 6th, 8th or 12th from Lagna: moderate; +1 debilitated, +1 combust (profile orb); −1 own or exalted sign. | yes | — | ☐ approve ☐ correct: |
| `dosham.combust` | Combustion (profile orbs: Mercury 14°/12° retro, Venus 10°/8° retro, Jupiter 11°, Mars 17°, Saturn 15°, Moon 12°) of the Lagna lord, 5th lord, 7th lord, Venus or Jupiter (Mercury only when it is one of those lords). Within half the orb: moderate, else mild; Mercury always mild (tradition treats Budha moudyam lightly). Folded into the Lagna-lord item when that lord is also in a dusthana. | no | — | ☐ approve ☐ correct: |
| `dosham.putra` | Factors: Saturn/Mars/Rahu/Ketu in the 5th; 5th lord in 6/8/12; 5th lord joined by Saturn/Mars/Rahu/Ketu; Jupiter debilitated, combust or in 6/8/12; Jupiter with Rahu/Ketu; +1 when the 5th lord is afflicted and the Lagna lord is in a dusthana. Cancellations: Jupiter aspects the 5th or the 5th lord; 5th lord own/exalted; Jupiter or Venus in the 5th. Present when at least one PRIMARY factor (anything but Jupiter's house or Jupiter with a node) holds and ≥1 factor remains after cancellations. | yes | — | ☐ approve ☐ correct: |
| `dosham.kalathra` | Factors: Saturn or the Sun in the 7th; 7th lord in 6/8/12; 7th lord joined by Saturn/Mars/Rahu/Ketu, combust or debilitated; Venus debilitated, combust or with Saturn/Rahu/Ketu; the 7th aspected by both Saturn and Mars. Cancellations: Jupiter aspects the 7th or 7th lord; 7th lord or Venus own/exalted. Present when at least one PRIMARY factor holds (Venus with Saturn/Rahu/Ketu and the double aspect are supporting only) and ≥1 factor remains after cancellations. (Chevvai and Rahu–Ketu in the 7th are reported as their own doshams.) | yes | — | ☐ approve ☐ correct: |
| `dosham.pitru` | Sun in the same sign as Rahu, Ketu or Saturn; or (with Lagna) Rahu/Ketu in the 9th while the 9th lord is in 6/8/12 or joined by Saturn/Mars/Rahu/Ketu. Marked traditional/disputed. | no | yes | ☐ approve ☐ correct: |
| `dosham.guruchandala` | Jupiter and Rahu in the same sign. Own/exalted Jupiter −1. Marked traditional/disputed. | no | yes | ☐ approve ☐ correct: |
| `dosham.shrapit` | Saturn and Rahu in the same sign (registry predicate dosha.shrapit); +1 in the Lagna or 7th. Marked traditional/disputed. | no | yes | ☐ approve ☐ correct: |
| `dosham.grahana` | Sun or Moon in the same sign as Rahu or Ketu (registry predicate dosha.grahana; sign placement only, never an eclipse). The Sun case is folded into Pitru when that is reported. Marked traditional/disputed. | no | yes | ☐ approve ☐ correct: |
| `dosham.kemadruma` | Registry rule yoga.kemadruma present and none of its cancellation conditions satisfied. Mild. | no | — | ☐ approve ☐ correct: |
| `dosham.naga` | Rahu or Ketu in the 1st, 2nd, 5th, 7th or 8th from Lagna AND in the same sign as the Moon or Venus. Mild; +1 in the 7th. Marked traditional/disputed. | yes | yes | ☐ approve ☐ correct: |
| `dosham.sanitransit` | Transit Saturn 12th/1st/2nd (Ezharai), 8th (Ashtama) or 4th (Ardhashtama) from the natal Moon (analysis.transitStatus). Janma (1st) and Ashtama moderate, others mild. Ends when Saturn leaves the stretch. | no | — | ☐ approve ☐ correct: |

Parigara sthalam associations (shared/dosham-data.js) also need review: Rahu–Ketu → Sri Kalahasti, Thirunageswaram,
Keezhaperumpallam; Kala Sarpa → Sri Kalahasti, Thirupampuram; Naga → Nagercoil Nagaraja, Thirupampuram, Thirunageswaram;
Chevvai → Vaitheeswaran Kovil (+ Thirumanancheri for marriage); Sani → Thirunallar (Kuchanur for transit); Putra →
Thirukarugavur Garbharakshambigai, Rameswaram, Alangudi; Kalathra → Thirumanancheri, Srinivasa Mangapuram (Kalyana
Venkateswara), Thiruvidanthai; Pitru → Rameswaram, Thilatharpanapuri, Thiruvallur Veeraraghava (Amavasai); Grahana →
Sri Kalahasti; Kemadruma → Thingalur; each planet → its Navagraha sthalam. Five temples were added for this
(thirukarugavur, thirupampuram, nagercoil_nagaraja, thilatharpanapuri, thiruvallur_veeraraghava): coordinates from public
listings (Thilatharpanapuri approximate, placed at nearby Koothanur), opening hours NOT on file (shown as "please check
with the temple"), legends phrased as tradition; all need verification through HR&CE / the temple office.
