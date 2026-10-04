import test from 'node:test';
import assert from 'node:assert/strict';
import { EMPTY_STATE, validateState } from '../src/sync/model.js';
import { renderPersonalizedGoal, setGoalFilter, setGoalQuery } from '../src/personalized-goal.js';
import {
  canonicalScholarshipId, isScholarshipVisible, isScholarshipKnown, screenedSuggestions,
  transitionScholarship, advanceScholarshipLifecycle, archivedRecords, trashedRecords, expiredRecords
} from '../src/scholarship-lifecycle.js';

const OCT_4 = Date.parse('2026-10-04T00:00:00.000Z');
const fresh = () => structuredClone(EMPTY_STATE);

test('existing local workspace loads additively without losing previous progress', () => {
  const old = { schema_version: 1, progress: { 'sch-kaust-0': true }, applications: { kaust: 'preparing' }, profile: null };
  const migrated = validateState(old);
  assert.deepEqual(migrated.lifecycle, {});
  assert.deepEqual(migrated.history, {});
  assert.equal(migrated.progress['sch-kaust-0'], true);
});

test('archive and restore immediately affect the main and Personalized Goal views', () => {
  assert.equal(canonicalScholarshipId('oxford'), 'clarendon');
  assert.equal(canonicalScholarshipId('cambridge'), 'cambridge');
  assert.notEqual(canonicalScholarshipId('cambridge'), canonicalScholarshipId('gates'));
  const archived = transitionScholarship(fresh(), 'oxford', 'archive', OCT_4);
  assert.equal(isScholarshipVisible(archived.lifecycle, 'clarendon'), false);
  assert.equal(isScholarshipVisible(archived.lifecycle, 'oxford'), false);
  assert.equal(archivedRecords(archived).length, 1);
  const restored = transitionScholarship(archived, 'clarendon', 'restore', OCT_4 + 1000);
  assert.equal(isScholarshipVisible(restored.lifecycle, 'oxford'), true);
  assert.equal(archivedRecords(restored).length, 0);
});

test('any screened-out suggestion can also be archived and retrieved', () => {
  assert.ok(screenedSuggestions.length > 0);
  const id = screenedSuggestions[0].id;
  assert.ok(isScholarshipKnown(id));
  const archived = transitionScholarship(fresh(), id, 'archive', OCT_4);
  assert.equal(isScholarshipVisible(archived.lifecycle, id), false);
  assert.equal(isScholarshipVisible(transitionScholarship(archived, id, 'restore', OCT_4 + 1).lifecycle, id), true);
});

test('delete offers ten-day recovery before permanent suppression and cleans linked progress', () => {
  const state = fresh();
  state.progress['sch-kaust-0'] = true;
  state.progress['goal-kaust-2'] = true;
  state.progress['sch-mbzuai-0'] = true;
  state.applications.kaust = 'submitted';
  const trashed = transitionScholarship(state, 'kaust', 'delete', OCT_4);
  assert.equal(trashedRecords(trashed).length, 1);
  assert.equal(isScholarshipVisible(trashed.lifecycle, 'kaust'), false);
  assert.equal(trashed.progress['sch-kaust-0'], true, 'recoverable progress is preserved during the grace period');
  assert.equal(isScholarshipVisible(transitionScholarship(trashed, 'kaust', 'restore', OCT_4 + 3 * 86400000).lifecycle, 'kaust'), true);
  const before = advanceScholarshipLifecycle(trashed, OCT_4 + 10 * 86400000 - 1);
  assert.equal(before.lifecycle.kaust.status, 'trash');
  const purged = advanceScholarshipLifecycle(trashed, OCT_4 + 10 * 86400000);
  assert.equal(purged.lifecycle.kaust.status, 'purged');
  assert.equal(purged.progress['sch-kaust-0'], undefined);
  assert.equal(purged.progress['goal-kaust-2'], undefined);
  assert.equal(purged.progress['sch-mbzuai-0'], true);
  assert.equal(purged.applications.kaust, undefined);
  assert.equal(purged.history.kaust, undefined);
  assert.equal(isScholarshipVisible(purged.lifecycle, 'kaust'), false);
  assert.throws(() => transitionScholarship(purged, 'kaust', 'restore', OCT_4 + 10 * 86400000 + 1), /no longer recoverable/);
  assert.deepEqual(validateState(purged).lifecycle.kaust.status, 'purged');
});

test('exact deadline expiry retains only minimal history and removes the checklist', () => {
  const state = fresh();
  state.progress['sch-khs-0'] = true;
  state.applications.khs = 'preparing';
  const atDeadline = advanceScholarshipLifecycle(state, Date.parse('2026-10-06T20:00:00Z'));
  assert.equal(atDeadline.lifecycle.khs.status, 'expired');
  assert.equal(atDeadline.history.khs.deadline, '2026-10-06T20:00:00Z');
  assert.ok(atDeadline.history.khs.name);
  assert.equal(Object.keys(atDeadline.history.khs).sort().join(','), 'deadline,expiredAt,name');
  assert.equal(atDeadline.progress['sch-khs-0'], undefined);
  assert.equal(atDeadline.applications.khs, undefined);
  assert.equal(isScholarshipVisible(atDeadline.lifecycle, 'khs'), false);
  assert.ok(expiredRecords(atDeadline).some(item => item.id === 'khs'));
  assert.throws(() => transitionScholarship(atDeadline, 'khs', 'restore', Date.parse('2026-10-07T00:00:00Z')));
});

test('date-only calls close after the entire Dhaka deadline day, including Goal-only programmes', () => {
  const state = fresh();
  state.progress['goal-ipcvai-0'] = true;
  const duringLastDay = advanceScholarshipLifecycle(state, Date.parse('2027-02-03T11:59:59Z'));
  assert.equal(isScholarshipVisible(duringLastDay.lifecycle, 'ipcvai'), true);
  const nextDay = advanceScholarshipLifecycle(state, Date.parse('2027-02-03T12:00:00Z'));
  assert.equal(nextDay.lifecycle.ipcvai.status, 'expired');
  assert.equal(nextDay.history.ipcvai.deadline, '2027-02-02');
  assert.equal(nextDay.progress['goal-ipcvai-0'], undefined);
});

test('manually trashed recommendations remain recoverable during their ten days even if the deadline passes', () => {
  const now = Date.parse('2026-10-05T00:00:00Z');
  const trashed = transitionScholarship(fresh(), 'khs', 'delete', now);
  const advanced = advanceScholarshipLifecycle(trashed, Date.parse('2026-10-07T00:00:00Z'));
  assert.equal(advanced.lifecycle.khs.status, 'trash');
  assert.equal(advanced.history.khs, undefined);
  assert.throws(() => transitionScholarship(advanced, 'khs', 'restore', Date.parse('2026-10-07T00:00:00Z')), /no longer recoverable/);
});

test('malformed lifecycle and history payloads are rejected before local storage persists them', () => {
  const now = new Date(OCT_4).toISOString();
  assert.throws(() => validateState({ ...fresh(), lifecycle: { '__proto__': { status:'archived', at:now }, constructor: { status:'archived', at:now } } }), /Invalid scholarship lifecycle/);
  assert.throws(() => validateState({ ...fresh(), lifecycle: { kaust: { status:'trash', at:now, purgeAt:'bad' } } }), /Invalid deletion date/);
  assert.throws(() => validateState({ ...fresh(), history: { kaust: { name:'X',deadline:'2027-01-03',expiredAt:now } } }), /Invalid deadline history/);
});

test('Personalized Goal directory suppresses the archived counterpart but preserves distinct funding routes', () => {
  setGoalFilter('All'); setGoalQuery('');
  const archived = transitionScholarship(fresh(), 'clarendon', 'archive', OCT_4);
  const html = renderPersonalizedGoal({}, archived.lifecycle);
  assert.equal(html.includes('data-goal-select="oxford"'), false);
  assert.equal(html.includes('data-goal-select="cambridge"'), true);
  assert.equal(html.includes('data-goal-select="kaust"'), true);
});
