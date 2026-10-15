import { mergePrefs } from './requirements.js';
import { unionMerge, countTicks } from './merge.js';

// New v2 state lives under its OWN key so the legacy 'scholarship-progress' data is never touched by this module.
const KEY = 'career-track:v2';

export const localAdapter = {
  async load() { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { return null; } },
  async save(state) { localStorage.setItem(KEY, JSON.stringify(state)); },
};

/**
 * Minimal observable store.
 * state = { rev, workingOn: string[] (slugs, in the order the user added them), prefs, ui,
 *           progress: {}  <- the app's checklist/dossier/IELTS/referee progress blob (same shape the app stored in localStorage before) }
 * An adapter (local now, Supabase later - see 04-persistence.md) provides load()/save().
 */
export function createStore(adapter = localAdapter) {
  let state = { rev: 0, workingOn: [], prefs: mergePrefs(null), ui: { unratedOpen: false }, progress: {}, legacyImportedAt: null };
  const subs = new Set();
  const emit = () => subs.forEach(fn => fn(state));
  let status = 'idle'; // idle | saving | saved | failed
  const statusSubs = new Set();
  const setStatus = s => { status = s; statusSubs.forEach(fn => fn(s)); };

  async function persist() {
    setStatus('saving');
    try { await adapter.save(state); setStatus('saved'); }
    catch (e) { console.error('save failed', e); setStatus('failed'); }
  }
  function update(patch) {
    state = { ...state, ...patch, rev: state.rev + 1 };
    emit(); return persist();
  }
  return {
    get: () => state,
    status: () => status,
    subscribe: fn => (subs.add(fn), () => subs.delete(fn)),
    onStatus: fn => (statusSubs.add(fn), () => statusSubs.delete(fn)),
    async init() {
      const saved = await adapter.load();
      if (saved) state = { ...state, ...saved, prefs: mergePrefs(saved.prefs), workingOn: Array.isArray(saved.workingOn) ? saved.workingOn : [] };
      emit();
    },
    retry: persist,
    isWorkingOn: slug => state.workingOn.includes(slug),
    toggleWorkingOn(slug) {
      const has = state.workingOn.includes(slug);
      return update({ workingOn: has ? state.workingOn.filter(s => s !== slug) : [...state.workingOn, slug] });
    },
    setPrefs(prefs) { return update({ prefs: mergePrefs(prefs) }); },
    setUi(ui) { return update({ ui: { ...state.ui, ...ui } }); },
    /** The app's progress blob. The existing app code must read/write progress ONLY through these two. */
    getProgress: () => state.progress,
    setProgress(next) { return update({ progress: typeof next === 'function' ? next(state.progress) : next }); },
    /** Legacy import: dry run returns counts only; commit union-merges (idempotent, never loses a tick). */
    importLegacy(legacyBlob, { dryRun = true } = {}) {
      const merged = unionMerge(state.progress, legacyBlob);
      const report = { ticksBefore: countTicks(state.progress), ticksIncoming: countTicks(legacyBlob), ticksAfter: countTicks(merged) };
      if (dryRun) return Promise.resolve(report);
      return update({ progress: merged, legacyImportedAt: new Date().toISOString() }).then(() => report);
    },
  };
}
