// Tiny hash router. Works with any stack; no dependency.
//   #/scholarships                     -> countries screen
//   #/scholarships/country/GB          -> one country
//   #/scholarships/country/GB?focus=x  -> one country, scroll to + expand scholarship x
export function parseHash(hash) {
  const h = (hash || '').replace(/^#\/?/, '');
  const [path, query = ''] = h.split('?');
  const seg = path.split('/').filter(Boolean).map(decodeURIComponent);
  const q = Object.fromEntries(new URLSearchParams(query));
  if (seg[0] !== 'scholarships') return { name: 'other', path: seg.join('/') };
  if (seg[1] === 'country' && seg[2]) return { name: 'country', code: seg[2].toUpperCase(), focus: q.focus || null };
  return { name: 'countries' };
}
export const hrefCountries = () => '#/scholarships';
export const hrefCountry = (code, focus) =>
  `#/scholarships/country/${encodeURIComponent(code)}${focus ? `?focus=${encodeURIComponent(focus)}` : ''}`;

export function onRoute(cb) {
  const handler = () => cb(parseHash(location.hash));
  addEventListener('hashchange', handler);
  handler();
  return () => removeEventListener('hashchange', handler);
}
