# 02 — Data model, requirements, scoring and country research

## 1. The five requirements
Defined once in `src/lib/requirements.js` (order = display order). `funding` is **derived** from scholarships; the other four are **country-level judgements** (spouse can be overridden per scholarship).

**`src/lib/requirements.js`**
```js
// The five personal requirements. Order here = display order everywhere.
// `derived: true` means the level is computed from tracked scholarships, never hand-entered.
export const REQUIREMENTS = [
  { key: 'funding', label: 'Fully funded MSc',          short: 'Funding', derived: true  },
  { key: 'work',    label: 'Good work opportunity',     short: 'Work',    derived: false },
  { key: 'career',  label: 'Better career opportunity', short: 'Career',  derived: false },
  { key: 'spouse',  label: 'Spouse accommodation',      short: 'Spouse',  derived: false },
  { key: 'pr',      label: 'Chance of getting PR',      short: 'PR',      derived: false },
];

export const REQUIREMENT_KEYS = REQUIREMENTS.map(r => r.key);
export const REQ_BY_KEY = Object.fromEntries(REQUIREMENTS.map(r => [r.key, r]));

// met = fully satisfied, partial = conditional/limited, unmet = not satisfied, unknown = not researched yet
export const LEVELS = ['met', 'partial', 'unmet', 'unknown'];
export const LEVEL_VALUE = { met: 1, partial: 0.5, unmet: 0, unknown: 0 };
export const LEVEL_SYMBOL = { met: '✓', partial: '◐', unmet: '✗', unknown: '?' };
export const LEVEL_TEXT = { met: 'Met', partial: 'Partly', unmet: 'Not met', unknown: 'Not researched' };

export const DEFAULT_PREFS = {
  enabled: { funding: true, work: true, career: true, spouse: true, pr: true },
  weight:  { funding: 1,    work: 1,    career: 1,    spouse: 1,    pr: 1    }, // 1 normal, 2 important
  sortOrder: 'best-first', // 'best-first' | 'worst-first'
};

export function mergePrefs(saved) {
  const p = structuredClone(DEFAULT_PREFS);
  if (!saved || typeof saved !== 'object') return p;
  for (const k of REQUIREMENT_KEYS) {
    if (typeof saved.enabled?.[k] === 'boolean') p.enabled[k] = saved.enabled[k];
    if ([1, 2].includes(saved.weight?.[k])) p.weight[k] = saved.weight[k];
  }
  if (['best-first', 'worst-first'].includes(saved.sortOrder)) p.sortOrder = saved.sortOrder;
  return p;
}
```

**Levels:** `met` (✓) fully satisfied · `partial` (◐) conditional/limited · `unmet` (✗) not satisfied · `unknown` (?) not researched. Only `met` counts toward the tier; `partial` earns half credit in the weighted score used for ordering inside a tier.

## 2. Data shapes
**Scholarship (after normalisation)** — extra fields are added, nothing existing is removed:
```ts
{ slug: string,                 // stable id; used in URLs and in "working on"
  name: string, provider?: string, url?: string,
  countryCode: string,          // ISO 3166-1 alpha-2, e.g. 'GB'  (REQUIRED; check-data fails without it)
  funding: 'full'|'partial'|'none'|'unknown',   // 'full' = tuition + living stipend for MSc
  fundingNote: string,          // original free text, shown in UI
  deadlineAt?: string,          // UTC ISO e.g. '2026-10-20T15:00:00Z'  (from a SOURCED wall-clock time)
  deadlineTz?: string,          // IANA zone of the provider, e.g. 'Europe/London'
  spouse?: { level, reason, source?, verified_on? }   // optional per-scholarship override
}
```
**Country** (built by `buildCountries(isoList, seed)`):
```ts
{ code, name, flag, note, confidence: 'provisional'|'verified'|'unrated',
  requirements: { work?, career?, spouse?, pr? }   // each { level, reason, source, verified_on }
}
```

## 3. Normalisation (map your existing records → the shape above)
Edit **only** `FIELD_MAP` in `normalize.js` to point at your current property names. Unmapped countries are reported (`_unmappedCountry`), never guessed.

**`src/lib/normalize.js`**
```js
// Turns the existing scholarship records (src/data.js) into the shape the new screens need.
// EDIT FIELD_MAP ONLY: it tells the code which property of your current records holds what.
export const FIELD_MAP = {
  slug: 'id',            // stable unique id used in URLs and in "working on" (e.g. 'kaust')
  name: 'name',
  provider: 'provider',
  country: 'country',    // free text such as 'UK', 'Saudi Arabia'
  funding: 'funding',    // free text or enum describing funding
  deadline: 'deadline',  // date text or ISO; see time.js
  url: 'url',
};

// Extra aliases not covered by Intl names (lower-case keys).
export const COUNTRY_ALIASES = {
  uk: 'GB', 'u.k.': 'GB', england: 'GB', scotland: 'GB', wales: 'GB', britain: 'GB', 'great britain': 'GB',
  usa: 'US', 'u.s.': 'US', 'u.s.a.': 'US', america: 'US', 'united states of america': 'US',
  uae: 'AE', 'u.a.e.': 'AE', emirates: 'AE', 'abu dhabi': 'AE', dubai: 'AE',
  ksa: 'SA', 'saudi': 'SA', 'south korea': 'KR', korea: 'KR', 'republic of korea': 'KR',
  holland: 'NL', 'the netherlands': 'NL', czechia: 'CZ', 'czech republic': 'CZ', turkey: 'TR', 'türkiye': 'TR',
  russia: 'RU', 'hong kong': 'HK', taiwan: 'TW', 'new zealand': 'NZ',
};

let _nameIndex = null;
function nameIndex(isoList) {
  if (_nameIndex) return _nameIndex;
  _nameIndex = new Map(isoList.map(c => [c.name.toLowerCase(), c.code]));
  return _nameIndex;
}

/** Returns an ISO-3166 alpha-2 code or null (null must be reported, never guessed). */
export function countryCodeFrom(text, isoList) {
  if (!text) return null;
  const t = String(text).trim().toLowerCase();
  if (COUNTRY_ALIASES[t]) return COUNTRY_ALIASES[t];
  const idx = nameIndex(isoList);
  if (idx.has(t)) return idx.get(t);
  if (/^[a-z]{2}$/i.test(t) && isoList.some(c => c.code === t.toUpperCase())) return t.toUpperCase();
  return null;
}

/** 'full' | 'partial' | 'none' | 'unknown' from free text. Conservative: anything unclear → 'unknown'. */
export function normalizeFunding(text) {
  if (!text) return 'unknown';
  const t = String(text).toLowerCase();
  if (/(partial|partly|tuition only|fee waiver only|half)/.test(t)) return 'partial';
  if (/(fully[- ]?funded|full(?:y)? funding|full scholarship|full ride|tuition.*stipend|stipend.*tuition)/.test(t)) return 'full';
  if (/(self[- ]?funded|no funding|unfunded)/.test(t)) return 'none';
  return 'unknown';
}

export function normalizeScholarship(raw, isoList, map = FIELD_MAP) {
  const code = countryCodeFrom(raw[map.country], isoList);
  return {
    ...raw,
    slug: raw[map.slug],
    name: raw[map.name],
    countryCode: code,
    funding: normalizeFunding(raw[map.funding]),
    fundingNote: typeof raw[map.funding] === 'string' ? raw[map.funding] : '',
    _unmappedCountry: code ? undefined : raw[map.country] ?? '(missing)',
  };
}

/** Build the full country list: every ISO region, merged with researched overrides from countries.seed.json */
export function buildCountries(isoList, seed) {
  const bySeed = new Map(seed.map(s => [s.code, s]));
  return isoList.map(({ code, name }) => {
    const s = bySeed.get(code) ?? {};
    return {
      code, name: s.name ?? name,
      flag: flagEmoji(code),
      requirements: s.requirements ?? {},
      note: s.note ?? '',
      confidence: s.confidence ?? 'unrated',
    };
  });
}

export function flagEmoji(code) {
  return [...code.toUpperCase()].map(ch => String.fromCodePoint(0x1F1E6 + ch.charCodeAt(0) - 65)).join('');
}
```

Full region list is generated, not typed (`node scripts/gen-countries.mjs > src/data/iso-codes.json`, 265 entries, already included):

**`scripts/gen-countries.mjs`**
```js
// Generates the full list of sovereign-state / territory region codes from the runtime's CLDR data.
// Run: node scripts/gen-countries.mjs > src/data/iso-codes.json
const dn = new Intl.DisplayNames(['en'], { type: 'region' });
const EXCLUDE = new Set(['EU','EZ','UN','QO','ZZ','XA','XB','XK_','AC','CP','DG','EA','IC','TA','CQ','AN']);
const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const out = [];
for (const a of A) for (const b of A) {
  const code = a + b;
  if (EXCLUDE.has(code)) continue;
  let name;
  try { name = dn.of(code); } catch { continue; }
  if (!name || name === code) continue;
  out.push({ code, name });
}
out.sort((x, y) => x.name.localeCompare(y.name));
console.log(JSON.stringify(out));
```

## 4. Applying it to the repo data (step A2)
1. Find the current scholarship array (likely `src/data.js`). Do **not** delete fields.
2. Create `src/data/normalized.js`:
```js
import iso from './iso-codes.json' with { type: 'json' };       // if your bundler lacks JSON import attributes, use a plain `import iso from './iso-codes.json'`
import seed from './countries.seed.json' with { type: 'json' };
import { SCHOLARSHIPS as RAW } from '../data.js';                // ← adapt to the real export name
import { buildCountries, normalizeScholarship } from '../lib/normalize.js';

export const countries = buildCountries(iso, seed);
export const scholarships = RAW.map(r => normalizeScholarship(r, iso));
```
3. For each scholarship add `deadlineAt` + `deadlineTz` **only from an official source** (store `deadline_source_url`, `deadline_verified_on` alongside). Date-only deadlines: use 23:59:59 in the provider's zone and add `deadlinePrecision: 'date_only'` so the UI can show "assumed".
4. Add `spouse: {…}` overrides only where an official scholarship/institution page states family support.
5. Dump normalised data and run the gate:
```bash
node -e "import('./src/data/normalized.js').then(m=>console.log(JSON.stringify(m.scholarships)))" > /tmp/n.json
node scripts/check-data.mjs /tmp/n.json     # must print: OK: <n> scholarships
```
`funding: 'unknown'` for any record is a **failure**: read the scholarship's official page and classify (`full` only if tuition **and** living stipend are covered).

## 5. Scoring and grouping engine
Pure functions, no DOM. Behaviour contract (all covered by tests):
- `deriveFunding` → met if any tracked scholarship is `full`; partial if only `partial`; unknown if none tracked/unclassified; else unmet.
- `evaluateCountry` → per-requirement levels, met/partial counts, weighted score, **ordered sacrifices** (✗ first, then ?, then ◐; ties by weight), `sacrificeKey`, `rated` flag.
- `groupCountries` → tiers by met count (best-first or worst-first), **sub-groups by identical sacrifice set**, and the collapsed `unrated` list.
- `sacrificeHeadline` → "You sacrifice: A; B (partly)." or "Nothing to sacrifice — every requirement met."

**`src/lib/scoring.js`**
```js
import { REQUIREMENTS, REQ_BY_KEY, LEVEL_VALUE, DEFAULT_PREFS } from './requirements.js';

const RANK = { unmet: 0, unknown: 1, partial: 2, met: 3 };
export const bestLevel = (a, b) => (RANK[a] >= RANK[b] ? a : b);

/** Country-level funding requirement, derived from the scholarships tracked in that country. */
export function deriveFunding(scholarships) {
  if (!scholarships.length) return { level: 'unknown', reason: 'No scholarship tracked for this country yet.' };
  const full = scholarships.filter(s => s.funding === 'full');
  if (full.length) return { level: 'met', reason: `${full.length} fully funded MSc scholarship${full.length > 1 ? 's' : ''} tracked.` };
  const partial = scholarships.filter(s => s.funding === 'partial');
  if (partial.length) return { level: 'partial', reason: 'Only partially funded scholarships tracked.' };
  if (scholarships.every(s => s.funding === 'unknown' || !s.funding))
    return { level: 'unknown', reason: 'Funding level of tracked scholarships not classified.' };
  return { level: 'unmet', reason: 'No funded scholarship tracked.' };
}

/** Per-scholarship requirement levels (what a single scholarship gives you in this country). */
export function evaluateScholarship(scholarship, country) {
  const out = {};
  for (const { key } of REQUIREMENTS) {
    if (key === 'funding') {
      const f = scholarship.funding;
      out.funding = { level: f === 'full' ? 'met' : f === 'partial' ? 'partial' : f === 'none' ? 'unmet' : 'unknown',
                      reason: scholarship.fundingNote || '' };
    } else if (key === 'spouse' && scholarship.spouse?.level) {
      out.spouse = { ...scholarship.spouse, scope: 'scholarship' };
    } else {
      out[key] = country?.requirements?.[key] ?? { level: 'unknown', reason: 'Not researched yet.' };
    }
  }
  return out;
}

/**
 * Evaluate one country against the user's preferences.
 * @param country      { code, name, flag, requirements: {work,career,spouse,pr} }
 * @param scholarships normalized scholarships whose countryCode === country.code
 */
export function evaluateCountry(country, scholarships, prefs = DEFAULT_PREFS) {
  const levels = {};
  for (const { key } of REQUIREMENTS) {
    if (key === 'funding') { levels.funding = deriveFunding(scholarships); continue; }
    let lv = country.requirements?.[key] ?? { level: 'unknown', reason: 'Not researched yet.' };
    if (key === 'spouse') {
      // a country is as good as its best scholarship for spouse support
      for (const s of scholarships) {
        if (s.spouse?.level && RANK[s.spouse.level] > RANK[lv.level]) lv = { ...s.spouse, via: s.name };
      }
    }
    levels[key] = lv;
  }

  const active = REQUIREMENTS.filter(r => prefs.enabled[r.key]);
  let met = 0, partial = 0, num = 0, den = 0;
  const sacrifices = [];
  for (const r of active) {
    const lv = levels[r.key];
    const w = prefs.weight[r.key] ?? 1;
    num += w * LEVEL_VALUE[lv.level]; den += w;
    if (lv.level === 'met') met++;
    else {
      if (lv.level === 'partial') partial++;
      sacrifices.push({ key: r.key, label: r.label, short: r.short, level: lv.level, reason: lv.reason || '', weight: w });
    }
  }
  const order = { unmet: 0, unknown: 1, partial: 2 };
  sacrifices.sort((a, b) => order[a.level] - order[b.level] || b.weight - a.weight);

  const researched = ['work', 'career', 'spouse', 'pr'].some(k => levels[k].level !== 'unknown');
  return {
    country, scholarships, levels, sacrifices,
    metCount: met, partialCount: partial, total: active.length,
    score: den ? num / den : 0,
    researched,
    // countries with nothing tracked and nothing researched go to the collapsed "not rated" section
    rated: researched || scholarships.length > 0,
    sacrificeKey: sacrifices.map(s => s.key).sort().join('+'),
  };
}

export function sacrificeHeadline(ev) {
  if (!ev.sacrifices.length) return 'Nothing to sacrifice — every requirement met.';
  const parts = ev.sacrifices.map(s => s.level === 'partial' ? `${s.label} (partly)` : s.level === 'unknown' ? `${s.label} (unknown)` : s.label);
  return `You sacrifice: ${parts.join('; ')}.`;
}

function compare(a, b, order) {
  let c = b.metCount - a.metCount || b.score - a.score || b.scholarships.length - a.scholarships.length;
  if (order === 'worst-first') c = -c;
  return c || a.country.name.localeCompare(b.country.name);
}

/**
 * Group evaluated countries into tiers (by number of requirements met) and, inside each tier, into
 * sub-groups that share the exact same set of compromised requirements, so every category states
 * explicitly what you are giving up.
 */
export function groupCountries(evaluated, prefs = DEFAULT_PREFS) {
  const rated = evaluated.filter(e => e.rated);
  const unrated = evaluated.filter(e => !e.rated).sort((a, b) => a.country.name.localeCompare(b.country.name));
  const total = rated[0]?.total ?? Object.values(prefs.enabled).filter(Boolean).length;

  const tiers = new Map();
  for (const ev of rated) {
    if (!tiers.has(ev.metCount)) tiers.set(ev.metCount, new Map());
    const subs = tiers.get(ev.metCount);
    if (!subs.has(ev.sacrificeKey)) subs.set(ev.sacrificeKey, []);
    subs.get(ev.sacrificeKey).push(ev);
  }
  const tierKeys = [...tiers.keys()].sort((a, b) => prefs.sortOrder === 'worst-first' ? a - b : b - a);
  const groups = tierKeys.map(t => {
    const subs = [...tiers.get(t).entries()].map(([key, items]) => {
      items.sort((a, b) => compare(a, b, prefs.sortOrder));
      return { key, sacrifices: items[0].sacrifices, items };
    });
    // sub-groups: fewest/least important sacrifices first (best-first); reverse for worst-first
    const lost = g => g.sacrifices.reduce((s, x) => s + x.weight, 0);
    subs.sort((a, b) => (lost(a) - lost(b) || a.key.localeCompare(b.key)) * (prefs.sortOrder === 'worst-first' ? -1 : 1));
    return {
      tier: t, total,
      label: t === total ? 'Complete match' : t === 0 ? 'No requirement met' : `${t} of ${total} requirements met`,
      subtitle: t === total ? 'Nothing to sacrifice' : `You sacrifice ${total - t} requirement${total - t > 1 ? 's' : ''}`,
      subgroups: subs,
      count: [...tiers.get(t).values()].reduce((n, a) => n + a.length, 0),
    };
  });
  return { groups, unrated };
}

/** Convenience: build everything for the Countries screen. */
export function buildCountryView(countries, scholarships, prefs) {
  const byCode = new Map();
  for (const s of scholarships) {
    if (!byCode.has(s.countryCode)) byCode.set(s.countryCode, []);
    byCode.get(s.countryCode).push(s);
  }
  const evaluated = countries.map(c => evaluateCountry(c, byCode.get(c.code) ?? [], prefs));
  return groupCountries(evaluated, prefs);
}
```

## 6. Country research (step B1) — rubric, sources, priority
**Rule:** a rating may only be changed from `provisional` with a **primary source** and `verified_on` (ISO date). Primary = government immigration/education sites or the scholarship provider. Blogs/forums are leads, not sources.

| Requirement | `met` | `partial` | `unmet` |
|---|---|---|---|
| **Work** | Post-study work / job-search permit **≥ 12 months** AND work allowed during study **≥ 15 h/week** (or equivalent) | Only one of the two | Neither |
| **Career** | Documented large employer base AND research ecosystem relevant to AI/engineering, reachable **in English**; cite ≥ 2 independent sources (e.g. national statistics, recognised rankings) | Niche, small, or language barrier for English-only candidates | Very limited |
| **Spouse** | Spouse may accompany a master's (or scholarship) student **and** may work, **or** the institution provides family housing/allowance | May accompany but no work rights / no support / conditions likely unmet | Cannot accompany |
| **PR** | Documented route to PR/citizenship **≤ 5 years** of residence open to this profile, no lottery/quota dependence | Route exists but > 5 years, capped, points-competitive or discretionary | No route |

**Priority order:** (1) every country that has a tracked scholarship; (2) the 12 seeded countries; (3) other common destinations (FR, IE, FI, NO, DK, CH, AT, BE, NZ, TR, HU, PL, CZ, IT, ES, MY, QA, CN, TW, HK, …); (4) the rest stay "Not rated yet".
**Per-country record:** four requirement objects with `level`, one-sentence `reason`, `source` URL, `verified_on`; then set `confidence: 'verified'` only when all four have sources.
**Rules change often** (immigration policy moved repeatedly in 2025–2026): when in doubt keep `partial` or `provisional`; add a note stating what to re-check.

### Provisional seed (hypotheses to verify, **not facts**)
Twelve countries are pre-filled as starting hypotheses so the screen is not empty. Every line carries `source: null, verified_on: null` and the UI shows **Provisional**.

**`src/data/countries.seed.json`**
```json
[
  {
    "code": "GB", "confidence": "provisional",
    "note": "Starting hypothesis only. Verify every line on gov.uk before removing the 'Provisional' badge.",
    "requirements": {
      "work":   { "level": "met",     "reason": "Post-study Graduate route + part-time work during study. Verify current duration (reform proposed).", "source": null, "verified_on": null },
      "career": { "level": "met",     "reason": "Large engineering/AI/research job market and strong university brand.", "source": null, "verified_on": null },
      "spouse": { "level": "partial", "reason": "Dependants of taught-master's students are restricted; exception reported for government-funded scholarship holders. Verify per scholarship.", "source": null, "verified_on": null },
      "pr":     { "level": "partial", "reason": "Settlement route exists but qualifying period/rules were under reform. Verify.", "source": null, "verified_on": null }
    }
  },
  {
    "code": "DE", "confidence": "provisional",
    "note": "Verify on make-it-in-germany.com and DAAD.",
    "requirements": {
      "work":   { "level": "met",     "reason": "Job-seeking permit after graduation and student part-time work allowed.", "source": null, "verified_on": null },
      "career": { "level": "met",     "reason": "Strong engineering/industrial/AI sector.", "source": null, "verified_on": null },
      "spouse": { "level": "partial", "reason": "Family reunification possible with financial/language conditions. Verify.", "source": null, "verified_on": null },
      "pr":     { "level": "met",     "reason": "Skilled-worker route to settlement is comparatively short. Verify current timelines.", "source": null, "verified_on": null }
    }
  },
  {
    "code": "US", "confidence": "provisional",
    "note": "Verify on travel.state.gov and uscis.gov. Policies changed frequently in 2025-2026.",
    "requirements": {
      "work":   { "level": "partial", "reason": "Practical-training work after study but later work-visa selection is uncertain.", "source": null, "verified_on": null },
      "career": { "level": "met",     "reason": "Largest AI/tech job market.", "source": null, "verified_on": null },
      "spouse": { "level": "partial", "reason": "Spouse can accompany on dependant status but work rights are restricted.", "source": null, "verified_on": null },
      "pr":     { "level": "partial", "reason": "Employment-based route exists but is long and uncertain.", "source": null, "verified_on": null }
    }
  },
  {
    "code": "CA", "confidence": "provisional",
    "note": "Verify on canada.ca. Study-permit and spousal rules were tightened in 2024-2025.",
    "requirements": {
      "work":   { "level": "met",     "reason": "Post-graduation work permit and on-campus/part-time work.", "source": null, "verified_on": null },
      "career": { "level": "met",     "reason": "Growing AI sector.", "source": null, "verified_on": null },
      "spouse": { "level": "partial", "reason": "Spousal open work permit only for qualifying programmes. Verify.", "source": null, "verified_on": null },
      "pr":     { "level": "partial", "reason": "Points-based routes exist but are competitive and capped.", "source": null, "verified_on": null }
    }
  },
  {
    "code": "AU", "confidence": "provisional",
    "note": "Verify on immi.homeaffairs.gov.au.",
    "requirements": {
      "work":   { "level": "met",     "reason": "Post-study temporary graduate visa and part-time work.", "source": null, "verified_on": null },
      "career": { "level": "partial", "reason": "Good market but smaller AI/research sector.", "source": null, "verified_on": null },
      "spouse": { "level": "partial", "reason": "Partner can accompany; work rights depend on course level. Verify.", "source": null, "verified_on": null },
      "pr":     { "level": "partial", "reason": "Points-tested pathways; occupation lists change.", "source": null, "verified_on": null }
    }
  },
  {
    "code": "SA", "confidence": "provisional",
    "note": "KAUST-specific benefits (family housing) belong on the scholarship record as spouse override.",
    "requirements": {
      "work":   { "level": "partial", "reason": "Research/industry roles exist, post-study stay is employer-tied.", "source": null, "verified_on": null },
      "career": { "level": "partial", "reason": "Growing research and AI investment.", "source": null, "verified_on": null },
      "spouse": { "level": "partial", "reason": "Depends on institution housing and sponsorship rules. Verify.", "source": null, "verified_on": null },
      "pr":     { "level": "unmet",   "reason": "No conventional PR pathway for most graduates. Verify premium residency terms.", "source": null, "verified_on": null }
    }
  },
  {
    "code": "AE", "confidence": "provisional",
    "note": "MBZUAI-specific benefits belong on the scholarship record.",
    "requirements": {
      "work":   { "level": "met",     "reason": "Large job market for graduates, employer-sponsored residency.", "source": null, "verified_on": null },
      "career": { "level": "partial", "reason": "Growing AI hub; verify depth of research roles.", "source": null, "verified_on": null },
      "spouse": { "level": "met",     "reason": "Residents can generally sponsor spouses. Verify student/scholar conditions.", "source": null, "verified_on": null },
      "pr":     { "level": "partial", "reason": "Long-term residency visas exist but are not classic PR. Verify eligibility.", "source": null, "verified_on": null }
    }
  },
  {
    "code": "JP", "confidence": "provisional",
    "note": "Verify on MEXT and Immigration Services Agency of Japan.",
    "requirements": {
      "work":   { "level": "met",     "reason": "Job-hunting status after graduation; part-time work permitted.", "source": null, "verified_on": null },
      "career": { "level": "partial", "reason": "Strong industry; Japanese language often required.", "source": null, "verified_on": null },
      "spouse": { "level": "partial", "reason": "Dependant status possible; work limited.", "source": null, "verified_on": null },
      "pr":     { "level": "partial", "reason": "Points-based fast-track for highly skilled professionals; language helps.", "source": null, "verified_on": null }
    }
  },
  {
    "code": "KR", "confidence": "provisional",
    "note": "Verify on studyinkorea.go.kr and hikorea.go.kr.",
    "requirements": {
      "work":   { "level": "partial", "reason": "Post-study job-seeking visa exists with conditions.", "source": null, "verified_on": null },
      "career": { "level": "partial", "reason": "Strong tech industry; language barrier.", "source": null, "verified_on": null },
      "spouse": { "level": "partial", "reason": "Dependant status possible; verify rules for scholarship students.", "source": null, "verified_on": null },
      "pr":     { "level": "partial", "reason": "Points-based residency routes exist. Verify.", "source": null, "verified_on": null }
    }
  },
  {
    "code": "NL", "confidence": "provisional",
    "note": "Verify on ind.nl.",
    "requirements": {
      "work":   { "level": "met", "reason": "Orientation-year visa after graduation; limited student work hours.", "source": null, "verified_on": null },
      "career": { "level": "met", "reason": "Strong tech/semiconductor/research sector.", "source": null, "verified_on": null },
      "spouse": { "level": "met", "reason": "Partner can usually join and work. Verify income requirements.", "source": null, "verified_on": null },
      "pr":     { "level": "met", "reason": "Long-term residence typically after ~5 years. Verify.", "source": null, "verified_on": null }
    }
  },
  {
    "code": "SE", "confidence": "provisional",
    "note": "Verify on migrationsverket.se and Swedish Institute.",
    "requirements": {
      "work":   { "level": "met", "reason": "Residence extension to seek work after study.", "source": null, "verified_on": null },
      "career": { "level": "met", "reason": "Strong tech/engineering sector.", "source": null, "verified_on": null },
      "spouse": { "level": "met", "reason": "Family members can usually accompany. Verify.", "source": null, "verified_on": null },
      "pr":     { "level": "met", "reason": "Permanent residence after qualifying years of work permit. Verify.", "source": null, "verified_on": null }
    }
  },
  {
    "code": "SG", "confidence": "provisional",
    "note": "Verify on mom.gov.sg and ica.gov.sg.",
    "requirements": {
      "work":   { "level": "partial", "reason": "Employment pass needed; competitive.", "source": null, "verified_on": null },
      "career": { "level": "met",     "reason": "Regional tech/finance hub.", "source": null, "verified_on": null },
      "spouse": { "level": "partial", "reason": "Dependant pass depends on pass type/salary.", "source": null, "verified_on": null },
      "pr":     { "level": "partial", "reason": "PR is discretionary.", "source": null, "verified_on": null }
    }
  }
]
```
