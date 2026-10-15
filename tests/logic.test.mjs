import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildCountryView, evaluateCountry, deriveFunding, sacrificeHeadline } from '../src/lib/scoring.js';
import { DEFAULT_PREFS, mergePrefs } from '../src/lib/requirements.js';
import { buildCountries, normalizeFunding, countryCodeFrom, normalizeScholarship } from '../src/lib/normalize.js';
import { parseHash, hrefCountry } from '../src/lib/router.js';
import { urgencyBand, formatCompact, remainingMs, MS } from '../src/lib/time.js';

const iso = JSON.parse(readFileSync(new URL('../src/data/iso-codes.json', import.meta.url)));
const seed = JSON.parse(readFileSync(new URL('../docs/upgrade/kit/src/data/countries.seed.json', import.meta.url)));
const countries = buildCountries(iso, seed);
const mk = (code, name, funding, extra = {}) => ({ slug: name, name, countryCode: code, funding, ...extra });

test('funding derivation', () => {
  assert.equal(deriveFunding([]).level, 'unknown');
  assert.equal(deriveFunding([mk('GB', 'a', 'full')]).level, 'met');
  assert.equal(deriveFunding([mk('GB', 'a', 'partial')]).level, 'partial');
  assert.equal(deriveFunding([mk('GB', 'a', 'none')]).level, 'unmet');
  assert.equal(deriveFunding([mk('GB', 'a', 'unknown')]).level, 'unknown');
});

test('complete match is tier 5/5 with no sacrifices', () => {
  const nl = countries.find(c => c.code === 'NL');
  const ev = evaluateCountry(nl, [mk('NL', 'x', 'full')], DEFAULT_PREFS);
  assert.equal(ev.metCount, 5);
  assert.equal(ev.sacrifices.length, 0);
  assert.match(sacrificeHeadline(ev), /Nothing to sacrifice/);
});

test('sacrifices are explicit and ordered unmet > unknown > partial', () => {
  const sa = countries.find(c => c.code === 'SA');
  const ev = evaluateCountry(sa, [mk('SA', 'kaust', 'full')], DEFAULT_PREFS);
  assert.deepEqual(ev.sacrifices.map(s => s.key), ['pr', 'work', 'career', 'spouse']);
  assert.equal(ev.metCount, 1);
});

test('scholarship spouse override lifts the country spouse level', () => {
  const sa = countries.find(c => c.code === 'SA');
  const ev = evaluateCountry(sa, [mk('SA', 'kaust', 'full', { spouse: { level: 'met', reason: 'Family housing' } })], DEFAULT_PREFS);
  assert.equal(ev.levels.spouse.level, 'met');
});

test('grouping: tiers best-first, sub-groups share identical sacrifice sets, unrated collapsed', () => {
  const schs = [mk('NL', 'a', 'full'), mk('SE', 'b', 'full'), mk('GB', 'c', 'full'), mk('SA', 'd', 'full')];
  const { groups, unrated } = buildCountryView(countries, schs, DEFAULT_PREFS);
  assert.equal(groups[0].tier, 5);
  assert.deepEqual(groups[0].subgroups[0].items.map(i => i.country.code).sort(), ['NL', 'SE']);
  for (const g of groups) for (const sg of g.subgroups)
    for (const it of sg.items) assert.equal(it.sacrificeKey, sg.key);
  assert.ok(groups.map(g => g.tier).every((t, i, a) => i === 0 || a[i - 1] > t));
  assert.ok(unrated.length > 200);
  assert.ok(!unrated.some(e => e.country.code === 'NL'));
});

test('worst-first reverses tier order', () => {
  const prefs = mergePrefs({ sortOrder: 'worst-first' });
  const { groups } = buildCountryView(countries, [mk('NL', 'a', 'full'), mk('SA', 'd', 'full')], prefs);
  assert.ok(groups[0].tier < groups[groups.length - 1].tier);
});

test('disabling a requirement removes it from tiers and sacrifices', () => {
  const prefs = mergePrefs({ enabled: { pr: false } });
  const sa = countries.find(c => c.code === 'SA');
  const ev = evaluateCountry(sa, [mk('SA', 'kaust', 'full')], prefs);
  assert.equal(ev.total, 4);
  assert.ok(!ev.sacrifices.some(s => s.key === 'pr'));
});

test('country with a tracked scholarship but no research still appears rated', () => {
  const bd = countries.find(c => c.code === 'FI');
  const ev = evaluateCountry(bd, [mk('FI', 'x', 'full')], DEFAULT_PREFS);
  assert.equal(ev.rated, true);
  assert.equal(ev.researched, false);
});

test('normalizers', () => {
  assert.equal(normalizeFunding('Fully funded (tuition + stipend)'), 'full');
  assert.equal(normalizeFunding('Tuition only'), 'partial');
  assert.equal(normalizeFunding('???'), 'unknown');
  assert.equal(countryCodeFrom('UK', iso), 'GB');
  assert.equal(countryCodeFrom('Saudi Arabia', iso), 'SA');
  assert.equal(countryCodeFrom('Atlantis', iso), null);
  const n = normalizeScholarship({ id: 'k', name: 'K', country: 'Atlantis', funding: 'Fully funded' }, iso);
  assert.equal(n._unmappedCountry, 'Atlantis');
});

test('router', () => {
  assert.deepEqual(parseHash('#/scholarships'), { name: 'countries' });
  assert.deepEqual(parseHash(hrefCountry('gb', 'kaust')), { name: 'country', code: 'GB', focus: 'kaust' });
  assert.equal(parseHash('#/documents').name, 'other');
});

test('time bands and compact format', () => {
  const now = Date.UTC(2026, 9, 1);
  assert.equal(urgencyBand(-1).key, 'closed');
  assert.equal(urgencyBand(23 * MS.hour).key, 'final');
  assert.equal(urgencyBand(2 * MS.day).key, 'critical');
  assert.equal(urgencyBand(31 * MS.day).key, 'normal');
  assert.equal(formatCompact(22 * MS.day + 4 * MS.hour), '22d 04h');
  assert.equal(formatCompact(2 * MS.day + 7 * MS.hour + 12 * MS.min), '2d 07h 12m');
  assert.equal(remainingMs('2026-10-01T00:00:10Z', now), 10000);
  assert.equal(remainingMs('garbage', now), null);
});

import { unionMerge, countTicks } from '../src/lib/merge.js';
import { createStore } from '../src/lib/store.js';

test('unionMerge never loses a tick, pin or key', () => {
  const remote = { sch: { 'kaust-0': true, 'kaust-1': false }, workingOn: ['a'], note: 'server' };
  const local  = { sch: { 'kaust-1': true, 'cw-0': true }, workingOn: ['b', 'a'], note: 'local' };
  const m = unionMerge(remote, local);
  assert.deepEqual(m.sch, { 'kaust-0': true, 'kaust-1': true, 'cw-0': true });
  assert.deepEqual(m.workingOn, ['a', 'b']);
  assert.equal(m.note, 'server');
  assert.deepEqual(unionMerge(m, local), m);                 // idempotent
  assert.equal(countTicks(m), 3);
});

test('store: import legacy is dry-run by default, then idempotent', async () => {
  const mem = { v: null };
  const store = createStore({ load: async () => mem.v, save: async s => { mem.v = JSON.parse(JSON.stringify(s)); } });
  await store.init();
  await store.setProgress({ a: true });
  const legacy = { a: false, b: true };
  const dry = await store.importLegacy(legacy);
  assert.deepEqual(dry, { ticksBefore: 1, ticksIncoming: 1, ticksAfter: 2 });
  assert.deepEqual(store.getProgress(), { a: true });       // dry run changed nothing
  await store.importLegacy(legacy, { dryRun: false });
  const once = JSON.stringify(store.getProgress());
  await store.importLegacy(legacy, { dryRun: false });
  assert.equal(JSON.stringify(store.getProgress()), once);
  assert.deepEqual(store.getProgress(), { a: true, b: true });
});

test('store: pinning persists and failed saves are reported', async () => {
  let fail = false, saved = null;
  const store = createStore({ load: async () => saved, save: async s => { if (fail) throw new Error('net'); saved = s; } });
  await store.init();
  await store.toggleWorkingOn('kaust');
  assert.deepEqual(saved.workingOn, ['kaust']);
  fail = true;
  const origErr = console.error; console.error = () => {};
  await store.toggleWorkingOn('cw');
  console.error = origErr;
  assert.equal(store.status(), 'failed');
  assert.deepEqual(store.get().workingOn, ['kaust', 'cw']);   // UI state kept; user sees Failed-Retry
  fail = false; await store.retry();
  assert.equal(store.status(), 'saved');
});
