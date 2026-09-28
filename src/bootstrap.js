import { createClient } from '@supabase/supabase-js';
import { createBackend } from './sync/backend.js';
import { createCache } from './sync/cache.js';
import { createProgressStore } from './sync/store.js';

const config = __PUBLIC_CONFIG__;
const $ = id => document.getElementById(id);
let store, ownerId, ui, client, cache, authKey;
let generation = 0;
let authenticating = false;
let mounted = false;
let lastEvent;
const authMemory = new Map();
const storage = {
  getItem(key) { try { return localStorage.getItem(key); } catch { return authMemory.get(key) ?? null; } },
  setItem(key, value) { authMemory.set(key, value); try { localStorage.setItem(key, value); } catch {} },
  removeItem(key) { authMemory.delete(key); try { localStorage.removeItem(key); } catch {} }
};
const draftStorage = {
  get length() { return localStorage.length; }, key: index => localStorage.key(index),
  getItem: key => localStorage.getItem(key), setItem: (key, value) => localStorage.setItem(key, value),
  removeItem: key => localStorage.removeItem(key)
};

function gate(title, message, { login = false, retry = false, signout = false, pending = false, preview = false } = {}) {
  $('appShell').hidden = true;
  $('authGate').hidden = false;
  $('authTitle').textContent = title;
  $('authMessage').textContent = message;
  $('googleSignIn').hidden = !login;
  $('googleSignIn').disabled = authenticating;
  $('previewUi').hidden = !preview;
  $('authRetry').hidden = !retry;
  $('gateSignOut').hidden = !signout;
  $('gateExport').hidden = !pending;
  document.title = `${title} · Scholarship OS`;
  if (mounted) { ui.hideWorkspace(); mounted = false; }
}
function render(event) {
  lastEvent = event;
  const pending = event.pending > 0 || event.draftProblem;
  if (event.status === 'forbidden') return gate('Access restricted', 'This Google account does not have access to this private workspace.', { signout: true });
  if (event.status === 'reauth') return gate('Sign in again', 'Your session expired. Pending changes remain on this device for your account.', { login: true, pending });
  if (!event.authorized || !event.state) return gate(event.status === 'offline' ? 'You are offline' : event.status === 'failed' ? 'Workspace unavailable' : 'Opening your workspace',
    event.status === 'offline' ? 'Connect to the internet to open this workspace for the first time.' : event.error || 'Checking your account and saved progress…',
    { retry: ['failed', 'offline'].includes(event.status), signout: Boolean(ownerId), pending });
  $('authGate').hidden = true;
  $('appShell').hidden = false;
  if (!mounted) { ui.mountApp(store); mounted = true; }
  ui.updateWorkspace(event);
  const labels = { saved: 'Saved', saving: 'Saving…', syncing: 'Checking saved progress…', offline: 'Offline', failed: 'Save not confirmed' };
  $('syncLabel').textContent = `${labels[event.status] ?? 'Loading…'}${event.pending ? ` · ${event.pending} pending` : ''}`;
  $('syncBar').dataset.status = event.status;
  $('syncRetry').hidden = !['failed', 'offline'].includes(event.status);
  const messages = [];
  if (event.error) messages.push(event.error);
  if (event.status === 'offline') messages.push('Changes stay on this device until you reconnect.');
  if (event.storageFailed) messages.push('Device storage is unavailable. Keep this tab open until saved, or export your progress.');
  if (event.cacheProblem) messages.push(event.cacheProblem);
  if (event.conflicts.length) messages.push('Completed work from another session was kept. Review it before undoing a completion.');
  if (Math.abs(event.clockOffset) > 60000) messages.push('Your device clock differs from the server. Countdown times have been adjusted.');
  $('syncMessage').textContent = messages.join(' ');
  $('syncMessage').hidden = messages.length === 0;
  document.querySelectorAll('[data-progress-key], [data-application-status]').forEach(node => { node.disabled = event.draftProblem; });
}
async function activate(session) {
  if (!session?.user?.id) {
    generation++;
    store?.stop();
    ownerId = null;
    gate('Your scholarship workspace', 'Sign in with your Google account to save and reopen your progress across devices.',
      { login: true, pending: Boolean(lastEvent?.pending || lastEvent?.draftProblem) });
    return;
  }
  const id = session.user.id;
  if (ownerId === id && store) { await store.sync(); return; }
  const request = ++generation;
  store?.stop();
  ownerId = id;
  store = null; lastEvent = null;
  gate('Opening your workspace', 'Checking your account and saved progress…', { signout: true });
  try {
    ui ??= await import('./app.js');
    if (request !== generation) return;
    cache = createCache({ storage: draftStorage, namespace: new URL(config.url).host, ownerId: id });
    const nextStore = createProgressStore({ ownerId: id, cache, backend: createBackend(client, id),
      onChange: event => { if (request === generation) render(event); } });
    store = nextStore;
    await nextStore.load();
  } catch {
    if (request === generation) gate('Workspace unavailable', 'The workspace could not open. Check your connection and try again.', { retry: true, signout: true });
  }
}
async function start() {
  if (!config.url || !config.key) {
    gate('Workspace setup in progress', 'Cloud sign-in is not ready yet. You can still inspect the current interface in read-only preview mode.', { preview: true });
    return;
  }
  authKey = `career-track-auth:${new URL(config.url).host}`;
  client = createClient(config.url, config.key, { auth: { storage, storageKey: authKey, flowType: 'pkce',
    autoRefreshToken: true, persistSession: true, detectSessionInUrl: true } });
  // Never call async auth APIs inside the SDK's synchronous auth callback.
  client.auth.onAuthStateChange((event, session) => {
    if (event === 'INITIAL_SESSION') return;
    setTimeout(() => { authenticating = false; void activate(session); }, 0);
  });
  try {
    const { data, error } = await client.auth.getSession();
    if (error) throw error;
    await activate(data.session);
    if (new URLSearchParams(location.search).has('error')) {
      history.replaceState(null, '', location.pathname);
      gate('Sign-in was not completed', 'Try again with the Google account assigned to this workspace.', { login: true });
    }
  } catch { gate('Sign-in unavailable', 'Check your connection and try again. Any pending changes remain on this device.', { login: true, retry: true }); }
}
async function openReadOnlyPreview() {
  try {
    ui ??= await import('./app.js');
    document.body.dataset.readonlyPreview = 'true';
    const readOnlyStore = { change() { throw new Error('Read-only preview'); } };
    $('authGate').hidden = true;
    $('appShell').hidden = false;
    ui.mountApp(readOnlyStore);
    mounted = true;
    ui.updateWorkspace({
      status: 'saved',
      authorized: true,
      state: { progress: {}, applications: {}, profile: null },
      clockOffset: 0,
      pending: 0,
      draftProblem: false,
      storageFailed: false,
      cacheProblem: '',
      conflicts: []
    });
    $('syncLabel').textContent = 'Read-only preview · cloud setup pending';
    $('syncBar').dataset.status = 'saved';
    $('syncRetry').hidden = true;
    $('syncMessage').textContent = 'Preview mode does not save progress. Cloud persistence will activate after Supabase and Google sign-in are configured.';
    $('syncMessage').hidden = false;
    $('exportProgress').hidden = true;
    $('signOut').hidden = true;
    document.title = 'Read-only Preview · Scholarship OS';
  } catch {
    gate('Preview unavailable', 'The interface preview could not open. Please try again.', { retry: true, preview: true });
  }
}

async function signIn() {
  if (authenticating || !client) return;
  authenticating = true; $('googleSignIn').disabled = true;
  try {
    const { error } = await client.auth.signInWithOAuth({ provider: 'google', options: {
      redirectTo: location.origin + location.pathname, queryParams: { prompt: 'select_account' } } });
    if (error) throw error;
  } catch { authenticating = false; gate('Sign-in unavailable', 'Check your connection and try again.', { login: true, pending: Boolean(lastEvent?.pending) }); }
}
function exportProgress() {
  if (!store) return false;
  try {
    const blob = new Blob([JSON.stringify(store.export(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url; anchor.download = `career-track-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.append(anchor); anchor.click(); anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return true;
  } catch {
    const target = $('appShell').hidden ? $('authMessage') : $('syncMessage');
    target.hidden = false; target.textContent = 'Export failed. Keep this tab open and try again.'; return false;
  }
}
async function finishSignOut() {
  generation++;
  store?.stop({ clear: true });
  gate('Signing out', 'Clearing this device’s workspace…');
  try { await client.auth.signOut({ scope: 'local' }); } catch {}
  storage.removeItem(authKey); storage.removeItem(authKey + '-code-verifier');
  location.replace(location.origin + location.pathname);
}
async function requestSignOut() {
  $('signOut').disabled = true; $('gateSignOut').disabled = true;
  try {
    if (store && ownerId) await store.sync();
    const event = store?.get();
    if (event?.pending || event?.draftProblem) {
      $('signOutDescription').textContent = 'Some changes have not been saved to the cloud. Stay to retry, or download a recovery copy before signing out.';
      $('signOutDialog').showModal();
    } else await finishSignOut();
  } finally { $('signOut').disabled = false; $('gateSignOut').disabled = false; }
}
$('googleSignIn').addEventListener('click', signIn);
$('previewUi').addEventListener('click', openReadOnlyPreview);
$('authRetry').addEventListener('click', () => { if (store && ownerId) void store.sync(); else location.reload(); });
$('syncRetry').addEventListener('click', () => { void store?.sync(); });
$('exportProgress').addEventListener('click', exportProgress);
$('gateExport').addEventListener('click', exportProgress);
$('signOut').addEventListener('click', requestSignOut);
$('gateSignOut').addEventListener('click', requestSignOut);
$('signOutCancel').addEventListener('click', () => $('signOutDialog').close());
$('exportSignOut').addEventListener('click', () => { if (exportProgress()) { $('signOutDialog').close(); void finishSignOut(); } });
window.addEventListener('online', () => { if (ownerId) void store?.sync(); });
window.addEventListener('offline', () => { if (ownerId) void store?.sync(); });
window.addEventListener('storage', event => { if (ownerId && event.key?.startsWith(cache?.prefix)) void store?.sync(); });
document.addEventListener('visibilitychange', () => { if (!document.hidden && ownerId) void store?.sync(); });
window.addEventListener('beforeunload', event => { if (lastEvent?.pending && lastEvent.storageFailed) { event.preventDefault(); event.returnValue = ''; } });
void start();
