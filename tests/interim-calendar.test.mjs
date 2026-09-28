import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { buildCalendar, validateDeadline, wallTime, foldLine } from '../scripts/lib/interim-calendar.mjs';
const { deadlines } = JSON.parse(await readFile(new URL('../docs/baseline/near-term-deadlines.json', import.meta.url), 'utf8'));

test('verified provider instants convert to the correct Dhaka day and time', () => {
  deadlines.forEach(validateDeadline);
  assert.equal(wallTime(deadlines[0].deadline_at, 'Asia/Dhaka'), '2026-10-07 02:00:00');
  assert.equal(wallTime(deadlines[1].deadline_at, 'Asia/Dhaka'), '2026-10-20 21:00:00');
  assert.throws(() => validateDeadline({ ...deadlines[0], deadline_at: '2026-10-06T21:00:00Z' }));
  assert.throws(() => validateDeadline({ ...deadlines[0], verified_on: '2026-02-30' }));
});

test('calendar uses UTC, stable IDs, CRLF and four alarms for each event', () => {
  const ics = buildCalendar(deadlines);
  assert.equal(ics.match(/BEGIN:VEVENT/g).length, 2);
  assert.equal(ics.match(/BEGIN:VALARM/g).length, 8);
  assert.ok(ics.includes('DTSTART:20261006T200000Z\r\n'));
  assert.ok(ics.includes('DTSTART:20261020T150000Z\r\n'));
  assert.equal(ics.replaceAll('\r\n', '').includes('\n'), false);
  assert.ok(ics.split('\r\n').every(line => Buffer.byteLength(line) <= 75));
  assert.equal(ics, buildCalendar(deadlines));
  assert.throws(() => buildCalendar([deadlines[0], deadlines[0]]));
});

test('UTF-8 folding preserves characters and calendar text cannot inject properties', () => {
  const original = 'DESCRIPTION:' + 'ঢাকা 🌙'.repeat(40);
  const folded = foldLine(original);
  assert.equal(folded.replaceAll('\r\n ', ''), original);
  assert.ok(folded.split('\r\n').every(line => Buffer.byteLength(line) <= 75));
  const ics = buildCalendar([{ ...deadlines[0], title: 'Title\nBEGIN:VEVENT, injected; text' }]);
  assert.equal(ics.match(/\r\nBEGIN:VEVENT\r\n/g).length, 1);
});
