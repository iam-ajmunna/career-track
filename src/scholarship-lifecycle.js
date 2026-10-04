import { scholarships, screenedOut } from './data.js';
import { goalProgrammes } from './personalized-goal-data.js';
import catalog from '../deadlines.json' with { type: 'json' };

// These are two directory representations of the same funding suggestions.
const aliases = Object.freeze({ oxford: 'clarendon', cambridge: 'gates' });
const TEN_DAYS = 10 * 24 * 60 * 60 * 1000;
export const canonicalScholarshipId = id => aliases[id] || id;
export const scholarshipAliases = id => [canonicalScholarshipId(id), ...Object.keys(aliases).filter(key => aliases[key] === canonicalScholarshipId(id))];
export const screenedSuggestions = screenedOut.map((item, index) => ({ ...item, id: `screened-${index + 1}` }));

const catalogEntries = new Map();
for (const item of [...scholarships, ...screenedSuggestions, ...goalProgrammes]) {
  const id = canonicalScholarshipId(item.id);
  const existing = catalogEntries.get(id) || { id, name: item.name, deadline: '', exact: null };
  if (!existing.name || existing.name.startsWith('screened-')) existing.name = item.name;
  if (item.deadline || item.ends) existing.deadline = item.deadline || item.ends;
  catalogEntries.set(id, existing);
}
for (const item of catalog.deadlines) {
  const id = canonicalScholarshipId(item.scholarship_id);
  const existing = catalogEntries.get(id);
  if (existing) existing.exact = item.deadline_at;
}
export const scholarshipCatalogue = catalogEntries;
export const lifecycleStatus = (lifecycle = {}, id) => lifecycle[canonicalScholarshipId(id)]?.status || 'active';
export const isScholarshipVisible = (lifecycle = {}, id) => lifecycleStatus(lifecycle, id) === 'active';
export const isScholarshipKnown = id => catalogEntries.has(canonicalScholarshipId(id));

function dhakaDay(milliseconds) {
  return new Date(milliseconds + 6 * 60 * 60 * 1000).toISOString().slice(0, 10);
}
function isPastDeadline(item, now) {
  if (item.exact) return Date.parse(item.exact) <= now;
  // Date-only deadlines remain actionable throughout the advertised calendar day in Dhaka.
  return Boolean(item.deadline && dhakaDay(now) > item.deadline);
}
function removePrivateScholarshipState(next, id) {
  const aliases = scholarshipAliases(id);
  for (const key of Object.keys(next.progress)) {
    if (aliases.some(alias => key.startsWith(`sch-${alias}-`) || key.startsWith(`goal-${alias}-`))) delete next.progress[key];
  }
  for (const alias of aliases) delete next.applications[alias];
}
function clonedState(state) {
  return {
    ...state,
    progress: { ...state.progress },
    applications: { ...state.applications },
    lifecycle: { ...(state.lifecycle || {}) },
    history: { ...(state.history || {}) }
  };
}
export function transitionScholarship(state, rawId, action, now = Date.now()) {
  const id = canonicalScholarshipId(rawId);
  if (!catalogEntries.has(id)) throw Error('Unknown scholarship suggestion.');
  const current = lifecycleStatus(state.lifecycle, id);
  const item = catalogEntries.get(id);
  if ((current === 'expired' || current === 'purged') || (current === 'trash' && Date.parse(state.lifecycle[id].purgeAt) <= now) || (action === 'restore' && isPastDeadline(item, now))) {
    throw Error('This record is no longer recoverable.');
  }
  if (!['archive', 'delete', 'restore'].includes(action)) throw Error('Unsupported scholarship action.');
  if (action === 'restore' && !['archived', 'trash'].includes(current)) throw Error('This scholarship cannot be restored.');
  if (action === 'archive' && current !== 'active') throw Error('Only active suggestions can be archived.');
  if (action === 'delete' && !['active', 'archived'].includes(current)) throw Error('Only active or archived suggestions can be deleted.');
  const next = clonedState(state);
  if (action === 'restore') delete next.lifecycle[id];
  else if (action === 'archive') next.lifecycle[id] = { status: 'archived', at: new Date(now).toISOString() };
  else next.lifecycle[id] = { status: 'trash', at: new Date(now).toISOString(), purgeAt: new Date(now + TEN_DAYS).toISOString() };
  return next;
}
export function advanceScholarshipLifecycle(state, now = Date.now()) {
  let next = null;
  const result = () => next || (next = clonedState(state));
  // Manual deletion takes precedence over expiry. Its complete record is destroyed after 10 days.
  for (const [id, entry] of Object.entries(state.lifecycle || {})) {
    if (entry.status === 'trash' && Date.parse(entry.purgeAt) <= now) {
      result().lifecycle[id] = { status: 'purged', at: new Date(now).toISOString() };
      removePrivateScholarshipState(result(), id);
    }
  }
  for (const [id, item] of catalogEntries) {
    const status = lifecycleStatus(next?.lifecycle || state.lifecycle, id);
    if (['trash', 'purged', 'expired'].includes(status) || !isPastDeadline(item, now)) continue;
    const destination = result();
    destination.lifecycle[id] = { status: 'expired', at: new Date(now).toISOString() };
    destination.history[id] = {
      name: item.name,
      deadline: item.exact || item.deadline,
      expiredAt: new Date(now).toISOString()
    };
    removePrivateScholarshipState(destination, id);
  }
  return next || state;
}
export function archivedRecords(state) {
  return Object.entries(state.lifecycle || {}).filter(([, item]) => item.status === 'archived')
    .map(([id]) => catalogEntries.get(id)).filter(Boolean).sort((a, b) => a.name.localeCompare(b.name));
}
export function trashedRecords(state) {
  return Object.entries(state.lifecycle || {}).filter(([, item]) => item.status === 'trash')
    .map(([id, lifecycle]) => ({ ...catalogEntries.get(id), ...lifecycle })).filter(item => item.name)
    .sort((a, b) => Date.parse(a.purgeAt) - Date.parse(b.purgeAt));
}
export function expiredRecords(state) {
  return Object.entries(state.history || {}).map(([id, item]) => ({ id, ...item }))
    .sort((a, b) => b.expiredAt.localeCompare(a.expiredAt));
}
