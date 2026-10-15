// Data-quality gate. Run in CI: node scripts/check-data.mjs <path-to-normalized-scholarships.json>
// Fails (exit 1) on: scholarship without countryCode, duplicate slug, unknown funding, malformed deadline.
import { readFileSync } from 'node:fs';
const file = process.argv[2];
if (!file) { console.error('usage: node scripts/check-data.mjs scholarships.json'); process.exit(2); }
const list = JSON.parse(readFileSync(file, 'utf8'));
const problems = [], seen = new Set();
for (const s of list) {
  if (!s.slug) problems.push(`missing slug: ${s.name}`);
  if (seen.has(s.slug)) problems.push(`duplicate slug: ${s.slug}`); seen.add(s.slug);
  if (!s.countryCode) problems.push(`no countryCode: ${s.slug} (country text: ${s._unmappedCountry})`);
  if (s.funding === 'unknown') problems.push(`funding not classified: ${s.slug} ("${s.fundingNote}")`);
  if (s.deadlineAt && Number.isNaN(Date.parse(s.deadlineAt))) problems.push(`bad deadlineAt: ${s.slug}`);
}
if (problems.length) { console.error(problems.join('\n')); process.exit(1); }
console.log(`OK: ${list.length} scholarships`);
