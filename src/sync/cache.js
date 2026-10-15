import { EMPTY_STATE, reconcile, validateSnapshot } from './model.js';

export function createCache({ storage, namespace, ownerId, randomId = () => crypto.randomUUID(), version = 'v1' }) {
  const prefix = `career-track:${version}:${namespace}:${ownerId}:`;
  const memory = new Map();
  const localIds = new Set();
  let storageFailed = false;
  let problem = null;
  let draftProblem = false;
  function read(key) { if (memory.has(key)) return memory.get(key); try { return storage.getItem(key); } catch { storageFailed = true; return null; } }
  function write(key, value) {
    try { storage.setItem(key, value); memory.delete(key); } catch { storageFailed = true; memory.set(key, value); }
  }
  function keys() {
    try { return [...new Set([...Array.from({ length: storage.length }, (_, index) => storage.key(index)), ...memory.keys()])].filter(Boolean); }
    catch { storageFailed = true; return [...memory.keys()]; }
  }
  function remove(key) {
    memory.delete(key);
    try { storage.removeItem(key); } catch { storageFailed = true; }
  }
  function operations() {
    const result = [];
    draftProblem = false;
    for (const key of keys().filter(key => key.startsWith(prefix + 'op:'))) {
      try {
        const item = JSON.parse(read(key));
        if (!item || !['progress','applications','profile','pins','preferences','ui','notes','tracking','lifecycle','history'].includes(item.bucket) || typeof item.key !== 'string' ||
            !Number.isSafeInteger(item.baseRev) || item.baseRev < 0 || !Number.isSafeInteger(item.order) ||
            typeof item.id !== 'string' || key !== prefix + 'op:' + item.id) throw new Error();
        const validationState=structuredClone(EMPTY_STATE);
        if(item.bucket==='history' && item.value!==null)validationState.lifecycle={[item.key]:{status:'expired',at:item.value?.expiredAt}};
        reconcile({state:validationState,rev:item.baseRev},[item]);
        result.push(item);
      } catch { draftProblem = true; problem = 'A local draft could not be read. Export your local data before continuing.'; }
    }
    return result.sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
  }
  return {
    prefix,
    get storageFailed() { return storageFailed; },
    get problem() { return problem; },
    get draftProblem() { return draftProblem; },
    readSnapshot() {
      const raw = read(prefix + 'snapshot');
      if (!raw) return null;
      try { return validateSnapshot(JSON.parse(raw), ownerId); }
      catch { problem = 'The cached workspace could not be read. Reconnect to refresh it.'; return null; }
    },
    saveSnapshot(snapshot) {
      validateSnapshot(snapshot, ownerId);
      const old = this.readSnapshot();
      if (!old || old.rev <= snapshot.rev) write(prefix + 'snapshot', JSON.stringify(snapshot));
    },
    operations,
    append(change) {
      const previous = operations();
      const item = { ...change, id: randomId(), order: Math.max(Date.now(), (previous.at(-1)?.order ?? 0) + 1) };
      write(prefix + 'op:' + item.id, JSON.stringify(item));
      localIds.add(item.id);
      return item;
    },
    rebaseLocal(fromRev, toRev, acknowledged) {
      const completed = new Set(acknowledged);
      for (const item of operations()) {
        if (localIds.has(item.id) && !completed.has(item.id) && item.baseRev === fromRev) {
          write(prefix + 'op:' + item.id, JSON.stringify({ ...item, baseRev: toRev }));
        }
      }
    },
    acknowledge(ids) { ids.forEach(id => { remove(prefix + 'op:' + id); localIds.delete(id); }); },
    clear() { keys().filter(key => key.startsWith(prefix)).forEach(remove); problem = null; draftProblem = false; },
    rawBackup() { return Object.fromEntries(keys().filter(key => key.startsWith(prefix)).map(key => [key, read(key)])); }
  };
}

