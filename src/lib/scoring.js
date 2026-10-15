import { REQUIREMENTS, REQ_BY_KEY, LEVEL_VALUE, DEFAULT_PREFS } from './requirements.js';

const RANK = { unmet: 0, unknown: 1, partial: 2, met: 3 };
export const bestLevel = (a, b) => (RANK[a] >= RANK[b] ? a : b);

/** Country-level funding requirement, derived from the scholarships tracked in that country. */
export function deriveFunding(scholarships) {
  if (!scholarships.length) return { level: 'unknown', reason: 'No scholarship tracked for this country yet.' };
  const full = scholarships.filter(s => s.funding === 'full');
  if (full.length) return { level: 'met', reason: `${full.length} fully funded MSc scholarship${full.length > 1 ? 's' : ''} tracked.`, source:full[0].funding_source_url || full[0].url, verified_on:full[0].funding_verified_on };
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
