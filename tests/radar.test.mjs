import test from 'node:test';
import assert from 'node:assert/strict';
import { mapHit, merge } from '../scripts/radar/refresh.mjs';
const T = '2026-10-20';
test('mapHit requires name + https official URL and never invents facts', () => {
  assert.equal(mapHit({ name: 'A' }, T), null);
  assert.equal(mapHit({ name: 'A', url: 'http://insecure.example' }, T), null);
  assert.equal(mapHit({ name: 'A', url: 'javascript:alert(1)' }, T), null);
  const m = mapHit({ id: 7, title: 'Great  Award', university: 'U', url: 'https://example.org/x', country_codes: ['GB', 'bad'], level: 'Masters', status: 'Open', deadline: '2026-12-15', summary: 'x'.repeat(400) }, T);
  assert.equal(m.verified, false); assert.equal(m.funding, 'unknown'); assert.deepEqual(m.countryCodes, ['GB']);
  assert.equal(m.name, 'Great Award'); assert.equal(m.deadlineAt, null); assert.equal(m.deadlineDate, '2026-12-15');
  assert.equal(m.summary.length, 240); assert.deepEqual(m.degreeTypes, ['taught-master']); assert.equal(m.status, 'open');
});
test('merge keeps firstSeen, refreshes lastSeen, drops stale leads', () => {
  const prev = [{ id: 'a', firstSeen: '2026-10-01', lastSeen: '2026-10-10' }, { id: 'old', firstSeen: '2026-08-01', lastSeen: '2026-09-01' }];
  const out = merge(prev, [{ id: 'a', firstSeen: T, lastSeen: T }, { id: 'b', firstSeen: T, lastSeen: T }], T);
  assert.deepEqual(out.map(i => i.id).sort(), ['a', 'b']);
  assert.equal(out.find(i => i.id === 'a').firstSeen, '2026-10-01');
});
