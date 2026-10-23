// Nightly collector: pulls candidate scholarships from ONE external source and writes data/v3/radar.json.
// - Runs in GitHub Actions only (the API key lives in repository secrets; the browser never sees it).
// - Output are LEADS (verified:false). They never become verified deadlines without a human adding a registry entry.
// - STATUS: written against the provider's public description (REST /v1/search, API key, 100 requests/day on the free tier).
//   Field names in `mapHit` are UNVERIFIED: run once locally with a real key, inspect one hit, and adjust `mapHit` before enabling the workflow.
import { writeFile, readFile } from 'node:fs/promises';

const API = process.env.SCHOLARSHIP_API_URL ?? 'https://api.scholarshipapi.com/v1/search';
const KEY = process.env.SCHOLARSHIP_API_KEY;
const OUT = new URL('../../data/v3/radar.json', import.meta.url);
const MAX_REQUESTS = 20;                       // hard budget: far below the 100/day cap
const QUERIES = [                              // derived from the owner's interests; edit in data/v3/radar-queries.json later
  { q: 'masters scholarship fully funded machine learning' },
  { q: 'masters scholarship international students artificial intelligence' },
  { q: 'masters scholarship computer vision' },
];

const norm = s => String(s ?? '').replace(/\s+/g, ' ').trim();
const clip = (s, n) => (s.length > n ? s.slice(0, n - 1) + '…' : s);

/** ADAPT after inspecting one real response. Everything defensive: missing field -> null/unknown, never guessed. */
export function mapHit(hit, today) {
  const url = hit.url ?? hit.link ?? hit.official_url ?? null;
  if (!hit.name && !hit.title) return null;
  let safeUrl = null; try { const u = new URL(url); if (u.protocol === 'https:') safeUrl = u.href; } catch {}
  if (!safeUrl) return null;                    // a lead without an official https link is useless
  const deadline = norm(hit.deadline ?? hit.closing_date ?? '');
  return {
    id: 'radar:' + (hit.id ?? safeUrl).toString().toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60),
    name: clip(norm(hit.name ?? hit.title), 140),
    provider: clip(norm(hit.university ?? hit.provider ?? ''), 120),
    countryCodes: Array.isArray(hit.country_codes) ? hit.country_codes.filter(c => /^[A-Z]{2}$/.test(c)) : [],
    researchAreas: [],                          // classified later by registry keywords, never invented here
    degreeTypes: /master/i.test(norm(hit.level ?? hit.degree ?? '')) ? ['taught-master'] : [],
    funding: 'unknown',                         // 'full' only after a human reads the official page
    status: /open/i.test(norm(hit.status)) ? 'open' : 'upcoming',
    deadlineAt: null,
    deadlineDate: /^\d{4}-\d\d-\d\d$/.test(deadline) ? deadline : null,
    officialUrl: safeUrl,
    summary: clip(norm(hit.summary ?? hit.description ?? ''), 240),
    verified: false, firstSeen: today, lastSeen: today,
  };
}

export function merge(previous, fresh, today) {
  const byId = new Map(previous.map(i => [i.id, i]));
  for (const f of fresh) {
    const old = byId.get(f.id);
    byId.set(f.id, old ? { ...f, firstSeen: old.firstSeen } : f);
  }
  // drop leads not seen for 21 days (stale) so the feed never shows dead links forever
  return [...byId.values()].filter(i => (Date.parse(today) - Date.parse(i.lastSeen)) / 86400000 <= 21);
}

async function main() {
  if (!KEY) { console.log('SCHOLARSHIP_API_KEY not set — skipping (no file change).'); return; }
  const today = new Date().toISOString().slice(0, 10);
  let previous = []; try { previous = JSON.parse(await readFile(OUT, 'utf8')).items ?? []; } catch {}
  const fresh = []; let used = 0;
  for (const query of QUERIES) {
    if (used >= MAX_REQUESTS) break;
    used++;
    const res = await fetch(API, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${KEY}` }, body: JSON.stringify({ ...query, limit: 20 }), signal: AbortSignal.timeout(15000) });
    if (!res.ok) { console.error('provider error', res.status); process.exitCode = 1; return; }
    const body = await res.json();
    for (const hit of body.hits ?? []) { const m = mapHit(hit, today); if (m) fresh.push(m); }
  }
  const items = merge(previous, fresh, today).sort((a, b) => a.name.localeCompare(b.name));
  await writeFile(OUT, JSON.stringify({ schema: 'career-track/radar@1', generatedAt: new Date().toISOString(), source: { name: 'ScholarshipAPI', url: 'https://scholarshipapi.com/', terms: 'UNVERIFIED — read the provider terms before enabling' }, items }, null, 2) + '\n');
  console.log(`radar: ${items.length} leads (${fresh.length} fresh, ${used} requests)`);
}
if (import.meta.url === `file://${process.argv[1]}`) main();
