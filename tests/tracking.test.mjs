import test from 'node:test';
import assert from 'node:assert/strict';
import { EMPTY_STATE, validateState } from '../src/sync/model.js';
import { applyTracking, trackingStatus } from '../src/tracking.js';
import { advanceScholarshipLifecycle, transitionScholarship } from '../src/scholarship-lifecycle.js';
import { renderPersonalizedGoal, setGoalFilter, setGoalQuery } from '../src/personalized-goal.js';

const fresh = () => structuredClone(EMPTY_STATE);

test('legacy browser state gains an empty tracking registry without losing progress', () => {
  const migrated = validateState({ schema_version: 1, progress: { 'sch-kaust-0': true }, applications: {}, profile: null });
  assert.deepEqual(migrated.tracking, {});
  assert.equal(migrated.progress['sch-kaust-0'], true);
});

test('single and bulk tracking updates are canonicalized and preserve independent submissions', () => {
  const original = { ...fresh(), applications: { kaust: 'submitted' } };
  const selected = applyTracking(original, ['kaust', 'oxford', 'clarendon'], 'researching');
  assert.equal(trackingStatus(selected.tracking, 'kaust'), 'researching');
  assert.equal(trackingStatus(selected.tracking, 'oxford'), 'researching');
  assert.equal(Object.keys(selected.tracking).length, 2);
  assert.deepEqual(selected.applications, original.applications);
  const completed = validateState(applyTracking(selected, ['kaust', 'clarendon'], 'completed'));
  assert.equal(trackingStatus(completed.tracking, 'kaust'), 'completed');
  assert.equal(completed.applications.kaust, 'submitted');
  const cleared = applyTracking(completed, ['kaust'], null);
  assert.equal(trackingStatus(cleared.tracking, 'kaust'), 'none');
  assert.equal(trackingStatus(completed.tracking, 'kaust'), 'completed', 'updates are immutable');
});

test('tracking rejects malformed statuses, unknown records and unsafe identifiers', () => {
  const state = fresh();
  assert.throws(() => applyTracking(state, ['missing-programme'], 'researching'));
  assert.throws(() => applyTracking(state, ['kaust'], 'submitted'));
  assert.throws(() => applyTracking(state, [], 'completed'));
  assert.throws(() => validateState({ ...state, tracking: { kaust: 'submitted' } }), /tracking/);
  assert.throws(() => validateState({ ...state, tracking: { constructor: 'completed' } }), /tracking/);
});

test('completed applications remain visible after deadline; uncompleted research expires normally', () => {
  const stamp = Date.parse('2028-01-05T00:00:00Z');
  const retained = advanceScholarshipLifecycle(applyTracking(fresh(), ['kaust'], 'completed'), stamp);
  assert.equal(retained.tracking.kaust, 'completed');
  assert.notEqual(retained.lifecycle.kaust?.status, 'expired');
  const ordinary = advanceScholarshipLifecycle(applyTracking(fresh(), ['kaust'], 'researching'), stamp);
  assert.equal(ordinary.lifecycle.kaust.status, 'expired');
  assert.equal(ordinary.tracking.kaust, undefined);
});

test('manual deletion still purges completed tracking after ten days', () => {
  const now = Date.parse('2026-10-04T00:00:00Z');
  const tracked = applyTracking(fresh(), ['kaust'], 'completed');
  const deleted = transitionScholarship(tracked, 'kaust', 'delete', now);
  const purged = advanceScholarshipLifecycle(deleted, now + 10 * 86400000);
  assert.equal(purged.tracking.kaust, undefined);
});

test('Personalized Goal displays programme status and research selection controls', () => {
  setGoalFilter('All'); setGoalQuery('');
  const html = renderPersonalizedGoal({}, {}, { ipcvai: 'researching' });
  assert.match(html, /data-track-status-id="ipcvai"/);
  assert.match(html, /data-track-select="ipcvai"/);
  assert.match(html, /Researching/);
});
