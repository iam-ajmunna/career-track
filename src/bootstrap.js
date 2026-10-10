import { EMPTY_STATE, validateState } from './sync/model.js';
import { transitionScholarship, advanceScholarshipLifecycle } from './scholarship-lifecycle.js';
import { applyTracking } from './tracking.js';

const STORAGE_KEY = 'career-track:local-state:v1';
const $ = id => document.getElementById(id);
let store, ui;
let mounted = false;
let lastEvent;

function emptyState() {
  return structuredClone(EMPTY_STATE);
}

function readLocalState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { state: emptyState(), problem: '' };
    return { state: validateState(JSON.parse(raw)), problem: '' };
  } catch {
    return {
      state: emptyState(),
      problem: 'Saved browser progress could not be read. This tab started with an empty workspace; export before replacing anything important.'
    };
  }
}

function writeLocalState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(validateState(state)));
}

function createLocalProgressStore(onChange) {
  const initial = readLocalState();
  let state = initial.state;
  let storageProblem = initial.problem;
  let storageFailed = false;
  let stopped = false;

  function event() {
    return {
      status: storageFailed ? 'failed' : 'saved',
      authorized: true,
      state,
      pending: storageFailed ? 1 : 0,
      conflicts: [],
      clockOffset: 0,
      storageFailed,
      cacheProblem: storageProblem,
      draftProblem: false
    };
  }

  function emit() {
    if (!stopped) onChange(event());
  }

  function persist() {
    try {
      writeLocalState(state);
      storageFailed = false;
      if (storageProblem === 'Browser storage is unavailable. Export your progress before closing this tab.') storageProblem = '';
    } catch {
      storageFailed = true;
      storageProblem = 'Browser storage is unavailable. Export your progress before closing this tab.';
    }
  }

  return {
    get: event,
    load() {
      state = validateState(advanceScholarshipLifecycle(state));
      persist();
      emit();
    },
    reap() {
      const next = advanceScholarshipLifecycle(state);
      if (next === state) return;
      state = validateState(next);
      persist();
      emit();
    },
    lifecycle(action, id) {
      state = validateState(advanceScholarshipLifecycle(state));
      state = validateState(transitionScholarship(state, id, action));
      persist();
      emit();
    },
    bulkTrack(ids, status) {
      state = validateState(advanceScholarshipLifecycle(state));
      state = validateState(applyTracking(state, ids, status));
      persist();
      emit();
    },
    sync() {
      persist();
      emit();
      return Promise.resolve();
    },
    change(bucket, key, value) {
      if (bucket === 'profile') {
        state = validateState({ ...state, profile: value });
      } else {
        if (!['progress', 'applications'].includes(bucket)) throw new Error('Unsupported local change.');
        state = validateState({ ...state, [bucket]: { ...state[bucket], [key]: value } });
      }
      persist();
      emit();
    },
    export() {
      return {
        format: 'career-track-local-state-export',
        version: 1,
        exported_at: new Date().toISOString(),
        storage_key: STORAGE_KEY,
        state: validateState(state)
      };
    },
    reloadFromBrowser() {
      const next = readLocalState();
      state = validateState(advanceScholarshipLifecycle(next.state));
      storageProblem = next.problem;
      storageFailed = false;
      emit();
    },
    stop() {
      stopped = true;
    }
  };
}

function gate(title, message, { retry = false, pending = false } = {}) {
  $('appShell').hidden = true;
  $('authGate').hidden = false;
  $('authTitle').textContent = title;
  $('authMessage').textContent = message;
  $('authRetry').hidden = !retry;
  $('gateExport').hidden = !pending;
  document.title = `${title} · Scholarship OS`;
  if (mounted) {
    ui?.hideWorkspace();
    mounted = false;
  }
}

function render(event) {
  lastEvent = event;
  $('authGate').hidden = true;
  $('appShell').hidden = false;
  if (!mounted) {
    ui.mountApp(store);
    mounted = true;
  }
  ui.updateWorkspace(event);
  $('syncLabel').textContent = event.storageFailed ? 'Save not confirmed · export backup' : 'Saved in this browser';
  $('syncBar').dataset.status = event.status;
  $('syncRetry').hidden = !event.storageFailed;
  const messages = [];
  if (event.cacheProblem) messages.push(event.cacheProblem);
  if (event.storageFailed) messages.push('Progress is currently only in this open tab. Export a backup before closing it.');
  $('syncMessage').textContent = messages.join(' ');
  $('syncMessage').hidden = messages.length === 0;
  document.querySelectorAll('[data-progress-key], [data-application-status]').forEach(node => { node.disabled = false; });
  $('signOut')?.setAttribute('hidden', '');
}

async function start() {
  try {
    ui = await import('./app.js');
    store = createLocalProgressStore(render);
    store.load();
  } catch {
    gate('Workspace unavailable', 'The saved workspace could not open. Try reloading the page.', { retry: true });
  }
}

function exportProgress() {
  if (!store) return false;
  try {
    const blob = new Blob([JSON.stringify(store.export(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `career-track-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return true;
  } catch {
    const target = $('appShell').hidden ? $('authMessage') : $('syncMessage');
    target.hidden = false;
    target.textContent = 'Export failed. Keep this tab open and try again.';
    return false;
  }
}

$('authRetry')?.addEventListener('click', () => location.reload());
$('syncRetry')?.addEventListener('click', () => { void store?.sync(); });
$('exportProgress')?.addEventListener('click', exportProgress);
$('gateExport')?.addEventListener('click', exportProgress);
window.addEventListener('storage', event => {
  if (event.key === STORAGE_KEY) store?.reloadFromBrowser();
});
window.addEventListener('beforeunload', event => {
  if (lastEvent?.storageFailed) {
    event.preventDefault();
    event.returnValue = '';
  }
});
void start();
