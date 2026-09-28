import test from 'node:test';
import assert from 'node:assert/strict';
import { DAY, urgency, countdown, selectHero, formatZoned } from '../src/domain/time.ts';
import { wallTime, validateDeadline } from '../scripts/lib/interim-calendar.mjs';
import catalog from '../deadlines.json' with { type: 'json' };

test('urgency boundaries and countdown closure use instants without day rounding', () => {
  for (const [left, band] of [[31 * DAY, 'normal'], [30 * DAY, 'attention'], [14 * DAY, 'attention'], [14 * DAY - 1, 'high'], [7 * DAY, 'high'], [7 * DAY - 1, 'urgent'], [3 * DAY, 'urgent'], [3 * DAY - 1, 'critical'], [DAY, 'critical'], [DAY - 1, 'final'], [0, 'closed'], [-1, 'closed']]) assert.equal(urgency(left), band);
  const at = '2026-10-20T15:00:00Z', now = Date.parse(at);
  assert.equal(countdown(at, now - 1), '00:00:00:01');
  assert.equal(countdown(at, now), 'Closed'); assert.equal(countdown('bad', now), 'Not verified');
  assert.equal(countdown(at, now - DAY - 1000), '01:00:00:01');
  assert.equal(countdown(at, now - 3 * DAY, true), '3d 00h');
  assert.equal(countdown(at, now - DAY, true), '1d 00h 00m');
  assert.equal(countdown(at, now - 3600000, true), '01h 00m 00s');
});
test('London and US fall-back fixtures retain elapsed time and Dhaka date', () => {
  assert.equal(wallTime('2026-10-25T00:30:00Z', 'Europe/London'), '2026-10-25 01:30:00');
  assert.equal(wallTime('2026-10-25T01:30:00Z', 'Europe/London'), '2026-10-25 01:30:00');
  assert.equal(wallTime('2026-10-25T01:30:00Z', 'Asia/Dhaka'), '2026-10-25 07:30:00');
  assert.equal(countdown('2026-10-25T01:30:00Z', Date.parse('2026-10-25T00:30:00Z')), '00:01:00:00');
  assert.equal(wallTime('2026-11-01T08:30:00Z', 'America/Los_Angeles'), '2026-11-01 01:30:00');
  assert.equal(wallTime('2026-11-01T09:30:00Z', 'America/Los_Angeles'), '2026-11-01 01:30:00');
  assert.equal(wallTime('2026-10-06T20:00:00Z', 'Asia/Dhaka'), '2026-10-07 02:00:00');
  assert.match(formatZoned('2026-10-06T20:00:00Z', 'Asia/Dhaka'), /7 Oct 2026.*02:00/);
});
test('hero excludes closed/submitted applications and breaks ties by least readiness', () => {
  const a = { ...catalog.deadlines[0], id: 'a', scholarship_id: 'a', deadline_at: '2026-10-10T12:00:00Z' };
  const b = { ...a, id: 'b', scholarship_id: 'b' };
  const later = { ...a, id: 'c', scholarship_id: 'c', deadline_at: '2026-10-12T12:00:00Z' };
  const now = Date.parse('2026-10-01T00:00:00Z');
  assert.equal(selectHero([a, b, later], {}, now, id => id === 'a' ? 50 : 0).id, 'b');
  assert.equal(selectHero([a, later], { a: 'submitted' }, now).id, 'c');
  assert.equal(selectHero([a], {}, Date.parse(a.deadline_at)), null);
  for (const item of catalog.deadlines) validateDeadline(item);
  assert.throws(() => validateDeadline({ ...a, deadline_wall: '2026-10-10 12:00:00', deadline_tz: 'Europe/London' }), /disagree/);
});
