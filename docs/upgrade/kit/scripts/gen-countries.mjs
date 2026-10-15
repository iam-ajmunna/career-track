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
