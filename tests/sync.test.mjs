import test from 'node:test';
import assert from 'node:assert/strict';
import { createCache } from '../src/sync/cache.js';
import { createProgressStore } from '../src/sync/store.js';
import { EMPTY_STATE, reconcile, validateState } from '../src/sync/model.js';
const ownerId = 'owner';
const clone = value => structuredClone(value);
function storage() { const map = new Map(); return { get length() { return map.size; }, key: index => [...map.keys()][index], getItem: key => map.get(key) ?? null, setItem: (key, value) => map.set(key, value), removeItem: key => map.delete(key) }; }
function fixture({ disk = storage(), backend, online = true } = {}) {
  let row = { owner_id: ownerId, state: clone(EMPTY_STATE), rev: 0, updated_at: new Date().toISOString() };
  const cache = createCache({ storage: disk, namespace: 'test', ownerId });
  const state = { online };
  const service = backend ?? { load: async () => ({ snapshot: clone(row), server_time: new Date().toISOString() }),
    compareAndSwap: async (rev, data) => { if (row.rev !== rev) return null; row = { ...row, rev: rev + 1, state: clone(data), updated_at: new Date().toISOString() }; return clone(row); } };
  const store = createProgressStore({ ownerId, cache, backend: service, isOnline: () => state.online });
  return { store, cache, service, state, disk, row: () => clone(row), setRow: value => { row = clone(value); } };
}
function deferred() { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; }

test('empty first load, saved refresh and ordinary uncheck survive', async () => {
  const f = fixture(); await f.store.load(); assert.deepEqual(f.store.get().state.progress, {});
  f.store.change('progress', 'doc-passport', true); assert.equal(f.store.get().status, 'saving');
  await f.store.sync(); assert.equal(f.store.get().status, 'saved');
  const reopened = fixture({ disk: f.disk, backend: f.service }); await reopened.store.load();
  assert.equal(reopened.store.get().state.progress['doc-passport'], true);
  reopened.store.change('progress', 'doc-passport', false); await reopened.store.sync();
  assert.equal(f.row().state.progress['doc-passport'], false); f.store.stop(); reopened.store.stop();
});
test('two stale devices preserve unrelated ticks and submitted flags', async () => {
  const f = fixture(); const g = fixture({ backend: f.service });
  await Promise.all([f.store.load(), g.store.load()]);
  f.store.change('progress', 'doc-passport', true); g.store.change('progress', 'doc-cv', true);
  g.store.change('applications', 'kaust', 'submitted');
  await Promise.all([f.store.sync(), g.store.sync()]);
  assert.equal(f.row().state.progress['doc-passport'], true); assert.equal(f.row().state.progress['doc-cv'], true);
  assert.equal(f.row().state.applications.kaust, 'submitted'); f.store.stop(); g.store.stop();
});
test('offline work survives reopen and merges on reconnect; stale uncheck reports conflict', async () => {
  const f = fixture(); await f.store.load(); f.state.online = false;
  f.store.change('progress', 'doc-passport', false); f.store.change('progress', 'doc-cv', true); f.store.stop();
  f.setRow({ ...f.row(), rev: 1, state: { ...clone(EMPTY_STATE), progress: { 'doc-passport': true } } });
  const g = fixture({ disk: f.disk, backend: f.service, online: false }); await g.store.load();
  assert.equal(g.store.get().state.progress['doc-cv'], true); assert.equal(g.store.get().status, 'offline');
  g.state.online = true; await g.store.sync();
  assert.equal(f.row().state.progress['doc-passport'], true); assert.equal(f.row().state.progress['doc-cv'], true);
  assert.equal(g.store.get().conflicts.length, 1); assert.equal(g.store.get().pending, 0); g.store.stop();
});
test('new edits during a slow write are acknowledged separately and latest local intent wins', async () => {
  const f = fixture(); const original = f.service.compareAndSwap; const gate = deferred(); const started = deferred(); let first = true;
  f.service.compareAndSwap = async (...args) => { if (first) { first = false; started.resolve(); await gate.promise; } return original(...args); };
  await f.store.load(); f.store.change('progress', 'doc-passport', true);
  const save = f.store.sync(); await started.promise;
  f.store.change('progress', 'doc-passport', false); f.store.change('progress', 'doc-cv', true);
  gate.resolve(); await save;
  assert.equal(f.row().state.progress['doc-passport'], false); assert.equal(f.row().state.progress['doc-cv'], true);
  assert.equal(f.store.get().pending, 0); f.store.stop();
});
test('uncertain response retains pending work and retry is idempotent', async () => {
  const f = fixture(); const original = f.service.compareAndSwap; let fail = true;
  f.service.compareAndSwap = async (...args) => { const result = await original(...args); if (fail) { fail = false; throw new Error('Network lost'); } return result; };
  await f.store.load(); f.store.change('progress', 'doc-passport', true); await f.store.sync();
  assert.equal(f.store.get().status, 'failed'); assert.equal(f.store.get().pending, 1);
  await f.store.sync(); assert.equal(f.store.get().pending, 0); assert.equal(f.row().rev, 1); f.store.stop();
});
test('session expiry retains drafts, forbidden account clears only its own cache', async () => {
  const f = fixture(); await f.store.load(); f.store.change('progress', 'doc-passport', true);
  f.service.load = async () => { throw Object.assign(new Error(), { status: 401 }); }; await f.store.sync();
  assert.equal(f.store.get().status, 'reauth'); assert.equal(f.store.get().pending, 1);
  assert.throws(() => f.store.change('progress', 'doc-cv', true));
  f.disk.setItem('unrelated', 'keep'); f.service.load = async () => ({ snapshot: null }); await f.store.sync();
  assert.equal(f.store.get().status, 'forbidden'); assert.equal(f.store.get().state, null); assert.equal(f.disk.getItem('unrelated'), 'keep'); f.store.stop();
});
test('corrupt draft is exportable and can never produce a Saved acknowledgement', async () => {
  const f = fixture(); await f.store.load(); f.disk.setItem(f.cache.prefix + 'op:broken', '{bad json'); await f.store.sync();
  assert.equal(f.store.get().status, 'failed'); assert.equal(f.store.get().draftProblem, true);
  assert.equal(f.store.export().local_recovery[f.cache.prefix + 'op:broken'], '{bad json'); f.store.stop();
});
test('storage quota failure keeps edits in memory and warns until server save', async () => {
  const disk = storage(); disk.setItem = () => { throw new Error('quota'); };
  const f = fixture({ disk }); await f.store.load(); f.state.online = false;
  f.store.change('progress', 'doc-passport', true); assert.equal(f.store.get().storageFailed, true);
  assert.equal(f.store.get().pending, 1); f.state.online = true; await f.store.sync();
  assert.equal(f.row().state.progress['doc-passport'], true); assert.equal(f.store.get().pending, 0); f.store.stop();
});
test('bounded contention preserves draft and stops retrying automatically', async () => {
  const f = fixture(); await f.store.load(); let attempts = 0;
  f.service.compareAndSwap = async () => { attempts++; return null; };
  f.store.change('progress', 'doc-passport', true); await f.store.sync();
  assert.equal(attempts, 3); assert.equal(f.store.get().status, 'failed'); assert.equal(f.store.get().pending, 1); f.store.stop();
});
test('state validation rejects malformed values and prototype keys', () => {
  assert.throws(() => validateState({ ...EMPTY_STATE, progress: { 'doc-passport': 'true' } }));
  assert.throws(() => reconcile({ state: EMPTY_STATE, rev: 0 }, [{ bucket: 'progress', key: '__proto__', value: true, baseRev: 0 }]));
});
