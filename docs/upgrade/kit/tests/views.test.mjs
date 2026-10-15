import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildCountryView, evaluateCountry } from '../src/lib/scoring.js';
import { DEFAULT_PREFS } from '../src/lib/requirements.js';
import { buildCountries } from '../src/lib/normalize.js';
import { renderCountries } from '../src/views/countries-view.js';
import { renderCountry } from '../src/views/country-view.js';
import { renderWorkingTray } from '../src/views/working-tray.js';

const iso = JSON.parse(readFileSync(new URL('../src/data/iso-codes.json', import.meta.url)));
const seed = JSON.parse(readFileSync(new URL('../src/data/countries.seed.json', import.meta.url)));
const countries = buildCountries(iso, seed);
const byCode = new Map(countries.map(c => [c.code, c]));
const NOW = Date.UTC(2026, 9, 1);
const S = [
  { slug: 'kaust', name: 'KAUST <script>alert(1)</script>', countryCode: 'SA', funding: 'full', deadlineAt: '2027-01-03T20:59:00Z', deadlineTz: 'Asia/Riyadh' },
  { slug: 'cw', name: 'Commonwealth', countryCode: 'GB', funding: 'full', deadlineAt: '2026-10-20T15:00:00Z', deadlineTz: 'Europe/London' },
];

test('countries screen renders tiers, explicit compromises, unrated section, and escapes data', () => {
  const html = renderCountries(buildCountryView(countries, S, DEFAULT_PREFS), DEFAULT_PREFS, false, NOW);
  assert.match(html, /Compromise:/);
  assert.match(html, /You sacrifice:/);
  assert.match(html, /Not rated yet/);
  assert.match(html, /href="#\/scholarships\/country\/GB"/);
});

test('country screen escapes names, auto-opens the focused scholarship, shows evidence table', () => {
  const ev = evaluateCountry(byCode.get('SA'), [S[0]], DEFAULT_PREFS);
  const html = renderCountry(ev, DEFAULT_PREFS, new Set(['kaust']), 'kaust', NOW);
  assert.ok(!html.includes('<script>'));
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /id="sch-kaust"[^>]*open/);
  assert.match(html, /Working on/);
  assert.match(html, /<table class="evidence">/);
});

test('tray sorts by nearest deadline and deep-links with focus', () => {
  const bySlug = new Map(S.map(s => [s.slug, s]));
  const html = renderWorkingTray(['kaust', 'cw'], bySlug, byCode, null, NOW);
  assert.ok(html.indexOf('Commonwealth') < html.indexOf('KAUST'));
  assert.match(html, /href="#\/scholarships\/country\/GB\?focus=cw"/);
  assert.match(renderWorkingTray([], bySlug, byCode, null, NOW), /Nothing pinned yet/);
});
