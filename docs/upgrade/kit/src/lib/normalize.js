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
