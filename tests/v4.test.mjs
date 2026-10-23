import test from 'node:test';
import assert from 'node:assert/strict';
import { html, raw, safeHref, escapeHtml } from '../src/ui/html.js';
import { splitRemaining, urgency, countdownModel, compactText, DAY, HOUR, MIN } from '../src/features/dashboard/countdown.js';
import { monthMatrix, monthLabel, shiftMonth, toEvents, eventsByDay, agenda } from '../src/features/calendar/grid.js';
import { matchScore, rankMatches } from '../src/features/radar/match.js';
import { buildDashboard, inMyList, laneOf } from '../src/features/dashboard/model.js';

const NOW = Date.UTC(2026, 9, 20, 6, 0, 0); // 20 Oct 2026 06:00Z

test('html escapes by default, raw opts out, arrays join, falsy dropped', () => {
  assert.equal(String(html`<p>${'<script>alert(1)</script>'}</p>`), '<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>');
  assert.equal(String(html`<b>${raw('<i>x</i>')}</b>`), '<b><i>x</i></b>');
  assert.equal(String(html`<ul>${['a', '<b>'].map(x => html`<li>${x}</li>`)}</ul>`), '<ul><li>a</li><li>&lt;b&gt;</li></ul>');
  assert.equal(String(html`${false}${null}${undefined}x`), 'x');
  assert.equal(String(html`<a title="${'" onmouseover="x'}">`), '<a title="&quot; onmouseover=&quot;x">');
  assert.equal(safeHref('javascript:alert(1)'), '#');
  assert.equal(safeHref('https://example.org/a?b=1'), 'https://example.org/a?b=1');
  assert.equal(escapeHtml(null), '');
});

test('countdown parts and urgency bands (boundaries)', () => {
  assert.deepEqual(splitRemaining(22 * DAY + 4 * HOUR + 18 * MIN + 37000), { d: 22, h: 4, m: 18, s: 37, totalMs: 22 * DAY + 4 * HOUR + 18 * MIN + 37000 });
  assert.equal(splitRemaining(-5).d, 0);
  const k = ms => urgency(ms).key;
  assert.deepEqual([k(0), k(DAY - 1), k(DAY), k(3 * DAY - 1), k(3 * DAY), k(7 * DAY), k(14 * DAY), k(30 * DAY - 1), k(30 * DAY)],
    ['closed', 'final', 'critical', 'critical', 'urgent', 'high', 'attention', 'attention', 'normal']);
});

test('countdown model: exact, date-only (no invented time), closed, none', () => {
  const exact = countdownModel({ precision: 'exact', at: '2026-10-20T15:00:00Z' }, NOW);
  assert.equal(exact.mode, 'live'); assert.equal(exact.parts.h, 9);
  const dateOnly = countdownModel({ precision: 'date-only', date: '2026-12-08', timezone: 'Europe/London' }, NOW);
  assert.equal(dateOnly.mode, 'days'); assert.equal(dateOnly.days, 49); assert.match(dateOnly.caveat, /not confirmed/);
  assert.equal(compactText(dateOnly), '49 days');
  assert.equal(countdownModel({ precision: 'exact', at: '2026-10-19T00:00:00Z' }, NOW).mode, 'closed');
  assert.equal(countdownModel({ precision: 'unknown' }, NOW).mode, 'none');
  assert.equal(countdownModel(null, NOW).mode, 'none');
  assert.equal(compactText(exact), '09h 00m');
  assert.equal(compactText(countdownModel({ precision: 'exact', at: '2026-11-12T10:00:00Z' }, NOW)), '23d 04h');
});

test('London clock change does not shift an absolute UTC deadline', () => {
  // 2026-10-25 01:30 BST/GMT is ambiguous in wall time, but the stored UTC instant is unambiguous.
  const before = countdownModel({ precision: 'exact', at: '2026-10-25T12:00:00Z' }, Date.UTC(2026, 9, 24, 12, 0, 0));
  assert.equal(before.parts.d, 1); assert.equal(before.parts.h, 0);
});

test('month matrix: 6 rows, Monday start, October 2026', () => {
  const m = monthMatrix(2026, 10, 1);
  assert.equal(m.length, 6); assert.ok(m.every(r => r.length === 7));
  assert.equal(m[0][0].date, '2026-09-28');           // Mon before Thu 1 Oct
  assert.equal(m[0][3].date, '2026-10-01'); assert.equal(m[0][3].inMonth, true);
  assert.equal(m[0][0].inMonth, false);
  assert.equal(monthMatrix(2026, 10, 0)[0][0].date, '2026-09-27'); // Sunday start
  assert.equal(monthMatrix(2028, 2, 1).flat().filter(c => c.inMonth).length, 29); // leap year
});
test('month label and shift across year boundary', () => {
  assert.equal(monthLabel(2026, 10), 'October 2026');
  assert.deepEqual(shiftMonth(2026, 12, 1), { year: 2027, month: 1 });
  assert.deepEqual(shiftMonth(2026, 1, -1), { year: 2025, month: 12 });
});
test('events: exact uses viewer zone day, date-only keeps published date, unknown dropped', () => {
  const ev = toEvents([
    { id: 'a', name: 'A', type: 'closes', precision: 'exact', at: '2026-10-20T20:30:00Z' },   // 21 Oct 02:30 Dhaka
    { id: 'b', name: 'B', type: 'closes', precision: 'date-only', date: '2026-12-08' },
    { id: 'c', name: 'C', type: 'opens', precision: 'unknown' },
    { id: 'd', name: 'D', type: 'opens', precision: 'tentative', date: '2026-11-01' },
  ], 'Asia/Dhaka');
  assert.deepEqual(ev.map(e => [e.id, e.day]), [['a', '2026-10-21'], ['d', '2026-11-01'], ['b', '2026-12-08']]);
  assert.equal(eventsByDay(ev).get('2026-10-21').length, 1);
  const ag = agenda(ev, '2026-11-01');
  assert.deepEqual(ag.map(g => g.month), ['2026-11', '2026-12']);
});

const profile = { researchAreas: ['machine-learning', 'computer-vision'], preferredCountries: ['GB', 'DE'], allowReturnHome: false };
const cand = (o = {}) => ({ id: 'x', name: 'X', countryCodes: ['GB'], researchAreas: ['machine-learning'], funding: 'full-cost-verified', degreeTypes: ['research-master'], status: 'open', deadlineAt: '2026-12-20T00:00:00Z', verified: true, ...o });
test('match score: strong match with reasons, deterministic', () => {
  const m = matchScore(cand(), profile, NOW);
  assert.equal(m.score, 15 + 20 + 25 + 10 + 10 + 5); assert.equal(m.band, 'strong');
  assert.ok(m.reasons.some(r => r.key === 'country'));
  assert.deepEqual(matchScore(cand(), profile, NOW), m);
});
test('match score: penalties, caps and flags', () => {
  assert.ok(matchScore(cand({ returnHome: 'yes' }), profile, NOW).flags.some(f => f.key === 'return'));
  assert.ok(matchScore(cand({ eligibility: 'ineligible' }), profile, NOW).score <= 10);
  assert.ok(matchScore(cand({ verified: false }), profile, NOW).flags.some(f => f.key === 'lead'));
  assert.ok(matchScore(cand({ deadlineAt: '2026-10-25T00:00:00Z' }), profile, NOW).flags.some(f => f.key === 'tight'));
  const none = matchScore(cand({ countryCodes: ['ZZ'], researchAreas: [], funding: 'unknown', degreeTypes: [], status: 'upcoming', deadlineAt: undefined }), profile, NOW);
  assert.equal(none.score, 0); assert.equal(none.band, 'possible');
});
test('rankMatches excludes dismissed/listed/future and sorts', () => {
  const list = [cand({ id: 'a' }), cand({ id: 'b', funding: 'partial' }), cand({ id: 'c', status: 'upcoming' }), cand({ id: 'd' })];
  const r = rankMatches(list, profile, { dismissed: new Set(['d']), listed: new Set(), now: NOW });
  assert.deepEqual(r.map(x => x.candidate.id), ['a', 'b']);
  assert.deepEqual(rankMatches(list, profile, { listed: new Set(['a']), includeFuture: true, now: NOW }).map(x => x.candidate.id).includes('a'), false);
});

const row = (id, o = {}) => ({
  opportunity: { id, name: id.toUpperCase(), countryCodes: ['GB'] },
  application: { stage: 'not-started', decision: 'research', ...(o.application || {}) },
  window: { status: 'open', deadline: o.deadline === undefined ? { precision: 'exact', at: '2026-11-01T00:00:00Z' } : o.deadline },
  eligibility: { status: 'requires-assessment' }, blockers: [], lifecycle: 'active', ...(o.rest || {}),
});
test('dashboard: my list, lanes, hero is nearest APPLYING deadline, KPIs', () => {
  const rows = [
    row('far', { application: { decision: 'apply' }, deadline: { precision: 'exact', at: '2026-12-31T00:00:00Z' } }),
    row('near', { application: { decision: 'apply', stage: 'preparing' }, deadline: { precision: 'exact', at: '2026-10-30T00:00:00Z' } }),
    row('sent', { application: { stage: 'submitted', decision: 'apply' }, deadline: { precision: 'exact', at: '2026-10-21T00:00:00Z' } }),
    row('won', { application: { stage: 'awarded', decision: 'apply' } }),
    row('skip', { application: { decision: 'not-pursuing' } }),
    row('pinned', { deadline: { precision: 'date-only', date: '2026-12-08', timezone: 'Europe/London' } }),
    row('other'),
  ];
  const d = buildDashboard(rows, { pins: { pinned: true }, now: NOW });
  assert.equal(d.hero.row.opportunity.id, 'near');
  assert.deepEqual(d.lanes.applying.map(r => r.opportunity.id), ['near', 'pinned', 'far']);
  assert.deepEqual(d.lanes.submitted.map(r => r.opportunity.id), ['sent']);
  assert.deepEqual(d.lanes.outcome.map(r => r.opportunity.id), ['won']);
  const k = Object.fromEntries(d.kpis.map(x => [x.key, x.value]));
  assert.deepEqual(k, { applying: 3, submitted: 2, closing: 1, matches: 1 });
  assert.equal(inMyList(rows[4]), false); assert.equal(laneOf(rows[2]), 'submitted');
  assert.equal(d.card(rows[1]).text, '9d 18h');
});
test('dashboard: no list -> no hero; closed window never hero', () => {
  assert.equal(buildDashboard([row('a')], { now: NOW }).hero, null);
  const closed = row('z', { application: { decision: 'apply' }, rest: { window: { status: 'closed', deadline: { precision: 'exact', at: '2026-11-01T00:00:00Z' } } } });
  assert.equal(buildDashboard([closed], { now: NOW }).hero, null);
});

import { parseRoute, buildRoute, countryRoute, VIEWS, KEY_TO_VIEW } from '../src/app/router.js';
import { chip, progress, ring, avatar, meter, appCard, matchCard, flagEmoji, emptyState } from '../src/ui/components.js';

test('router: V3 detail URLs and real legacy names redirect', () => {
  const d = parseRoute('#/scholarships/gates-cambridge?intake=2027');
  assert.deepEqual([d.view, d.segments, d.redirected, d.canonical], ['scholarships', ['detail', 'gates-cambridge'], true, '#/scholarships/detail/gates-cambridge?intake=2027']);
  assert.deepEqual([parseRoute('#/library').view, parseRoute('#/library').segments], ['settings', ['archive']]);
  assert.deepEqual([parseRoute('#/goal').view, parseRoute('#/goal').segments], ['settings', ['planning']]);
  assert.equal(parseRoute('#/scholarships/country/GB').redirected, false);
});

test('router: canonical, query, legacy redirects, unknown -> dashboard', () => {
  assert.deepEqual(parseRoute('#/scholarships/country/GB?focus=cw'), { view: 'scholarships', segments: ['country', 'GB'], query: { focus: 'cw' }, redirected: false, canonical: '#/scholarships/country/GB?focus=cw' });
  assert.equal(parseRoute('').view, 'dashboard');
  assert.equal(parseRoute('#/overview').redirected, true); assert.equal(parseRoute('#/overview').view, 'dashboard');
  assert.deepEqual([parseRoute('#/universities').view, parseRoute('#/universities').segments], ['scholarships', ['universities']]);
  assert.equal(parseRoute('#/scholarships?window=open&intake=2027').query.intake, '2027');
  assert.equal(parseRoute('#/nonsense/x').canonical, '#/dashboard');
  assert.equal(parseRoute('#/scholarships/country/%E0%A4%A').view, 'scholarships'); // malformed % does not throw
  assert.equal(buildRoute('calendar', [], { month: '2026-10', empty: '' }), '#/calendar?month=2026-10');
  assert.equal(countryRoute('gb', 'x y'), '#/scholarships/country/GB?focus=x+y');
  assert.deepEqual(Object.values(KEY_TO_VIEW), VIEWS);
});

test('components: escaping, aria, clamped values', () => {
  assert.match(String(chip('<b>x</b>', 'danger')), /chip--danger">&lt;b&gt;x&lt;\/b&gt;</);
  const p = String(progress(140, 'Ready')); assert.match(p, /aria-valuenow="100"/); assert.match(p, /role="progressbar"/); assert.match(p, /data-v="100"/);
  assert.match(String(progress(-5, 'x')), /aria-valuenow="0"/); assert.match(String(progress('abc', 'x')), /aria-valuenow="0"/);
  assert.match(String(ring(72, 'Profile')), /data-p="72"[^>]*aria-label="Profile: 72%"/);
  assert.match(String(avatar('Alex Morgan')), />AM</); assert.match(String(avatar('')), />\?</);
  assert.equal((String(meter(3, 5)).match(/class="on"/g) || []).length, 3);
  assert.equal(flagEmoji('gb'), '🇬🇧'); assert.equal(flagEmoji('xx1'), '🏳️');
  assert.match(String(emptyState('Nothing', 'Add one')), /class="empty"/);
  const card = String(appCard({ id: 'cw', name: 'Commonwealth <img>', countries: ['GB'], text: '9d 04h', urgencyKey: 'high', readiness: 67 }));
  assert.ok(!card.includes('<img>')); assert.match(card, /href="#\/scholarships\/country\/GB\?focus=cw"/); assert.match(card, /data-urgency="high"/);
});
test('matchCard: add/dismiss hooks, https-only official link, no raw HTML', () => {
  const m = matchScore(cand({ id: 'r1', name: 'Evil <script>', officialUrl: 'javascript:alert(1)', provider: 'P' }), profile, NOW);
  const html1 = String(matchCard({ candidate: cand({ id: 'r1', name: 'Evil <script>', officialUrl: 'javascript:alert(1)' }), ...m }));
  assert.match(html1, /data-add-to-list="r1"/); assert.match(html1, /data-dismiss-match="r1"/);
  assert.ok(!html1.includes('<script>')); assert.match(html1, /href="#"/);
  assert.match(String(matchCard({ candidate: cand({ officialUrl: 'https://example.org/a' }), ...matchScore(cand(), profile, NOW) })), /rel="noopener noreferrer"/);
});

import { formatInZone, formatDateOnly } from '../src/features/dashboard/countdown.js';
import { createTicker } from '../src/app/ticker.js';

test('zone formatting: provider zone vs Dhaka, date-only without time', () => {
  assert.match(formatInZone('2026-10-20T15:00:00Z', 'Europe/London'), /^20 Oct 2026, 16:00 (BST|GMT\+1)$/);
  assert.match(formatInZone('2026-10-20T15:00:00Z', 'Asia/Dhaka'), /^20 Oct 2026, 21:00 (GMT\+6|BDT)$/);
  assert.match(formatInZone('2026-10-25T12:00:00Z', 'Europe/London'), /^25 Oct 2026, 12:00 (GMT|UTC)$/); // after the clock change
  assert.equal(formatDateOnly('2026-12-08'), '8 Dec 2026');
});

test('ticker: per-subscriber cadence, pause when hidden, immediate refresh on visible, unsubscribe stops timer', () => {
  let t = 0, hidden = false, cb = null, cleared = 0;
  const tk = createTicker({ now: () => t, set: f => (cb = f, 1), clear: () => { cleared++; cb = null; }, isHidden: () => hidden });
  const fast = [], slow = [];
  const offFast = tk.subscribe(x => fast.push(x), 1000);
  const offSlow = tk.subscribe(x => slow.push(x), 60000);
  assert.equal(fast.length, 1); assert.equal(slow.length, 1);        // immediate first call
  for (let i = 1; i <= 3; i++) { t = i * 1000; cb(); }
  assert.equal(fast.length, 4); assert.equal(slow.length, 1);        // slow not yet due
  hidden = true; t = 10000; cb();
  assert.equal(fast.length, 4);                                       // paused while hidden
  hidden = false; t = 70000; tk.onVisible();
  assert.equal(fast.length, 5); assert.equal(slow.length, 2);         // forced refresh from the real clock
  offFast(); assert.equal(cleared, 0); offSlow(); assert.equal(cleared, 1); assert.equal(tk.size(), 0);
});
