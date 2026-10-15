import test from 'node:test';
import assert from 'node:assert/strict';
import { EMPTY_STATE } from '../src/sync/model.js';
import { createLocalStore, STORAGE_KEY } from '../src/sync/local-v2.js';
import { parseBackup, inspectBackup, MAX_BACKUP_BYTES } from '../src/sync/backup.js';

const empty = () => structuredClone(EMPTY_STATE);
function memory() {
  const values = new Map();
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
}
const exported = state => JSON.stringify({ format: 'career-track-v2-export', version: 2, state });

test('JSON backup restores a complete workspace into a fresh browser without an account', () => {
  const at = '2026-10-15T09:00:00.000Z';
  const state = { ...empty(), progress: { 'sch-kaust-0': true }, applications: { kaust: 'submitted' },
    tracking: { mext: 'researching' }, pins: { kaust: true }, notes: { kaust: '<private note>' },
    preferences: { 'enabled-pr': false }, ui: { unratedOpen: true },
    profile: { name: 'AJ', degree: 'CSE', university: 'NSU', cgpa: '3.74', highlights: [],
      positioning: { engineering: 80, research: 70, academics: 90, developmentImpact: 60, leadership: 50 } },
    lifecycle: { khs: { status: 'expired', at } }, history: { khs: { name: 'KHS', deadline: '2026-10-06', expiredAt: at } } };
  const preview = inspectBackup(parseBackup(exported(state)), empty());
  assert.deepEqual(preview.state, state);
  assert.equal(inspectBackup(state, preview.state).newItems, 0);
});

test('backup merge keeps current text, priorities and unpins while unioning completed work', () => {
  const current = { ...empty(), progress: { 'sch-kaust-0': false }, applications: { kaust: 'submitted' },
    notes: { kaust: 'current' }, pins: { kaust: false }, preferences: { 'enabled-pr': true }, tracking: { kaust: 'completed' } };
  const source = { ...empty(), progress: { 'sch-kaust-0': true }, applications: { kaust: 'preparing' },
    notes: { kaust: 'older', mext: 'new' }, pins: { kaust: true }, preferences: { 'enabled-pr': false }, tracking: { kaust: 'researching' } };
  const preview = inspectBackup(source, current);
  assert.equal(preview.state.progress['sch-kaust-0'], true);
  assert.equal(preview.state.applications.kaust, 'submitted');
  assert.equal(preview.state.notes.kaust, 'current');
  assert.equal(preview.state.notes.mext, 'new');
  assert.equal(preview.state.pins.kaust, false);
  assert.equal(preview.state.preferences['enabled-pr'], true);
  assert.equal(preview.state.tracking.kaust, 'completed');
  assert.deepEqual(current.notes, { kaust: 'current' });
  assert.equal(inspectBackup(source, preview.state).newItems, 0);
});

test('backup cannot resurrect purged scholarship progress', () => {
  const current = { ...empty(), lifecycle: { kaust: { status: 'purged', at: '2026-10-15T09:00:00.000Z' } } };
  const source = { ...empty(), progress: { 'sch-kaust-0': true }, notes: { kaust: 'old' }, pins: { kaust: true } };
  const preview = inspectBackup(source, current);
  assert.equal(preview.newItems, 0);
  assert.equal(preview.state.notes?.kaust, undefined);
});

test('backup rejects malformed, unsupported, oversized and unsafe state before any write', () => {
  for (const raw of ['', '{', '{}', 'x'.repeat(MAX_BACKUP_BYTES + 1),
    JSON.stringify({ format: 'career-track-v2-export', version: 3, state: empty() }),
    exported({ ...empty(), notes: { kaust: 123 } }),
    exported({ ...empty(), pins: JSON.parse('{"__proto__":true}') })]) assert.throws(() => parseBackup(raw));
});

test('blocked browser storage keeps the workspace editable and exportable, then retries', async () => {
  let blocked = true, saved;
  const storage = { getItem: () => { if (blocked) throw Error('blocked'); return saved ?? null; },
    setItem: (key, value) => { if (blocked) throw Error('blocked'); saved = value; } };
  const store = createLocalStore(() => {}, storage);
  assert.equal(store.get().draftProblem, false);
  store.change('notes', 'kaust', 'unsaved note');
  assert.equal(store.get().storageFailed, true);
  assert.equal(parseBackup(JSON.stringify(store.export())).notes.kaust, 'unsaved note');
  blocked = false; await store.sync();
  assert.equal(store.get().storageFailed, false);
  assert.equal(JSON.parse(saved).notes.kaust, 'unsaved note');
});

test('quota failure retains checklist progress until Retry saves it', async () => {
  const values = memory(); let full = true;
  const store = createLocalStore(() => {}, { getItem: values.getItem,
    setItem: (key, value) => { if (full) throw Error('quota'); values.setItem(key, value); } });
  store.change('progress', 'sch-kaust-0', true);
  assert.equal(store.get().pending, 1);
  assert.equal(store.export().state.progress['sch-kaust-0'], true);
  full = false; await store.sync();
  assert.equal(store.get().pending, 0);
  assert.equal(JSON.parse(values.getItem(STORAGE_KEY)).progress['sch-kaust-0'], true);
});

test('corrupt saved bytes remain recoverable and are never overwritten by Retry', async () => {
  const storage = memory(); storage.setItem(STORAGE_KEY, '{bad');
  const store = createLocalStore(() => {}, storage);
  assert.equal(store.get().draftProblem, true);
  assert.equal(store.export().raw_recovery, '{bad');
  assert.throws(() => store.change('pins', 'kaust', true));
  await store.sync(); assert.equal(storage.getItem(STORAGE_KEY), '{bad');
});

test('corruption from another tab blocks writes and preserves its raw recovery data', async () => {
  const storage = memory(), store = createLocalStore(() => {}, storage);
  store.change('notes', 'kaust', 'last readable note');
  storage.setItem(STORAGE_KEY, '{new bad'); store.reloadFromBrowser();
  assert.equal(store.get().draftProblem, true);
  assert.equal(store.export().state.notes.kaust, 'last readable note');
  assert.equal(store.export().raw_recovery, '{new bad');
  await store.sync(); assert.equal(storage.getItem(STORAGE_KEY), '{new bad');
});

test('another tab cannot discard or overwrite a failed local draft', async () => {
  const values = memory(); let full = true;
  const storage = { getItem: values.getItem, setItem: (key, value) => { if (full) throw Error('quota'); values.setItem(key, value); } };
  const store = createLocalStore(() => {}, storage);
  store.change('notes', 'kaust', 'keep this draft');
  const remote = exported(empty()); values.setItem(STORAGE_KEY, remote);
  store.reloadFromBrowser(); full = false; await store.sync();
  assert.equal(store.export().state.notes.kaust, 'keep this draft');
  assert.equal(values.getItem(STORAGE_KEY), remote);
  assert.equal(store.get().draftProblem, true);
});
