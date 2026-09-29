import { reconcile, validateSnapshot } from './model.js';

export function createProgressStore({ ownerId, backend, cache, isOnline = () => navigator.onLine, onChange = () => {} }) {
  let snapshot = null;
  let status = 'loading';
  let error = '';
  let conflicts = [];
  let clockOffset = 0;
  let inflight = null;
  let timer = null;
  let stopped = false;
  let authorized = false;
  function view() {
    const operations = cache.operations();
    let state = snapshot?.state ?? null;
    if (state && operations.length) {
      // Immediate local intent is visible; conflict resolution runs against a fresh server revision.
      state = reconcile({ ...snapshot, rev: -1 }, operations.map(op => ({ ...op, baseRev: -1 }))).state;
    }
    return { snapshot, state, status, error, pending: operations.length, conflicts, clockOffset,
      storageFailed: cache.storageFailed, cacheProblem: cache.problem, draftProblem: cache.draftProblem, authorized };
  }
  function emit() { if (!stopped) onChange(view()); }
  async function fetchSnapshot() {
    const started = Date.now();
    const result = await backend.load();
    if (!result.snapshot) { const failure = new Error('This account does not have access to this workspace.'); failure.status = 403; throw failure; }
    const next = validateSnapshot(result.snapshot, ownerId);
    const server = Date.parse(result.server_time);
    if (Number.isFinite(server)) clockOffset = server - (started + Date.now()) / 2;
    if (!snapshot || next.rev >= snapshot.rev) snapshot = next;
    authorized = true;
    cache.saveSnapshot(snapshot);
    return snapshot;
  }
  function fail(failure) {
    if (failure.status === 401) status = 'reauth';
    else if (failure.status === 403) { status = 'forbidden'; authorized = false; snapshot = null; cache.clear(); }
    else status = !isOnline() ? 'offline' : 'failed';
    error = failure.status === 401 ? 'Sign in again to save your pending changes.' :
      failure.status === 403 ? 'This account does not have access to this workspace.' :
      failure.message === 'Conflict limit' ? 'Other changes are still arriving. Retry to synchronize.' :
      'Could not confirm the save. Your changes are still on this device. Retry when connected.';
    emit();
  }
  async function synchronize() {
    if (stopped) return;
    if (!isOnline()) { status = 'offline'; emit(); return; }
    status = cache.operations().length ? 'saving' : 'syncing'; error = ''; emit();
    try {
      for (let pass = 0; pass < 6; pass++) {
        let completed = false;
        for (let attempt = 0; attempt < 3; attempt++) {
          const current = await fetchSnapshot();
          if (stopped) return;
          const operations = cache.operations();
          if (cache.draftProblem) throw new Error('Unreadable local draft');
          if (!operations.length) { status = 'saved'; emit(); return; }
          const merged = reconcile(current, operations);
          const saved = merged.changed ? await backend.compareAndSwap(current.rev, merged.state) : current;
          if (stopped) return;
          if (!saved) continue;
          snapshot = validateSnapshot(saved, ownerId);
          cache.saveSnapshot(snapshot);
          // Rebase later edits from this tab onto its own acknowledged write.
          // Different tabs retain their original base revision for conflict checks.
          cache.rebaseLocal(current.rev, snapshot.rev, operations.map(operation => operation.id));
          cache.acknowledge(operations.map(operation => operation.id));
          conflicts = [...conflicts, ...merged.conflicts];
          completed = true;
          break;
        }
        if (!completed) throw new Error('Conflict limit');
        if (!cache.operations().length) { status = 'saved'; emit(); return; }
      }
      throw new Error('Conflict limit');
    } catch (failure) { fail(failure); }
  }
  const store = {
    get: view,
    async load() {
      snapshot = cache.readSnapshot();
      // A cache is used only for this SDK-authenticated owner, never as a login bypass.
      authorized = Boolean(snapshot);
      if (snapshot && !isOnline()) { status = 'offline'; emit(); return; }
      await store.sync();
    },
    change(bucket, key, value) {
      if (stopped || !snapshot || !authorized || cache.draftProblem || ['forbidden', 'reauth'].includes(status)) throw new Error('Sign in before editing.');
      if (bucket === 'profile') key = 'current';
      const change = { bucket, key, value, baseRev: snapshot.rev };
      reconcile(snapshot, [change]);
      cache.append(change);
      conflicts = []; error = ''; status = isOnline() ? 'saving' : 'offline'; emit();
      clearTimeout(timer);
      if (isOnline()) timer = setTimeout(() => { void store.sync(); }, 180);
    },
    sync() {
      clearTimeout(timer);
      if (!inflight) inflight = synchronize().finally(() => { inflight = null; });
      return inflight;
    },
    export() { return { format: 'career-track-state-export', version: 1, exported_at: new Date().toISOString(),
      snapshot, pending: cache.operations(), local_recovery: cache.rawBackup() }; },
    stop({ clear = false } = {}) { stopped = true; clearTimeout(timer); if (clear) cache.clear(); }
  };
  return store;
}
