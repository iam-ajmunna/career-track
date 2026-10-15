import { validateState } from './model.js';

export const MAX_BACKUP_BYTES = 1024 * 1024;

export function parseBackup(raw) {
  if (typeof raw !== 'string' || !raw.trim() || new TextEncoder().encode(raw).length > MAX_BACKUP_BYTES) {
    throw new Error('Choose a non-empty Career Track JSON backup smaller than 1 MB.');
  }
  let backup;
  try { backup = JSON.parse(raw); } catch { throw new Error('This file is not valid JSON. Choose a Career Track export.'); }
  if (backup?.format !== 'career-track-v2-export' || backup.version !== 2) {
    throw new Error('Choose a v2 backup downloaded with Export progress.');
  }
  return validateState(backup.state);
}

// Restore missing values while preserving existing text, priorities and lifecycle decisions.
// Completed work can be added repeatedly without undoing an existing completion.
export function inspectBackup(incoming, current) {
  const source = validateState(incoming);
  const next = validateState(current);
  let newItems = 0, newTicks = 0, keptValues = 0;
  const equal = (left, right) => JSON.stringify(left) === JSON.stringify(right);
  for (const [id, value] of Object.entries(source.lifecycle)) {
    if (next.lifecycle[id] === undefined) { next.lifecycle[id] = value; newItems++; }
    else if (!equal(next.lifecycle[id], value)) keptValues++;
  }
  for (const [id, value] of Object.entries(source.history)) {
    if (next.lifecycle[id]?.status === 'expired' && next.history[id] === undefined) {
      next.history[id] = value; newItems++;
    }
  }
  for (const bucket of ['progress', 'applications', 'tracking', 'pins', 'notes', 'preferences', 'ui']) {
    for (const [key, value] of Object.entries(source[bucket] || {})) {
      const id = bucket === 'progress' ? /^sch-(.+)-\d+$/.exec(key)?.[1] : key;
      if (['progress', 'applications', 'tracking', 'pins', 'notes'].includes(bucket) &&
          ['purged', 'expired'].includes(next.lifecycle[id]?.status)) continue;
      next[bucket] ||= {};
      const existing = next[bucket][key];
      if (equal(existing, value)) continue;
      const completion = (bucket === 'progress' && value === true) ||
        (bucket === 'applications' && value === 'submitted') ||
        (bucket === 'tracking' && value === 'completed');
      if (existing !== undefined && !completion) { keptValues++; continue; }
      next[bucket][key] = value;
      newItems++;
      if (bucket === 'progress' && value === true) newTicks++;
    }
  }
  if (next.profile === null && source.profile !== null) { next.profile = source.profile; newItems++; }
  else if (source.profile !== null && !equal(next.profile, source.profile)) keptValues++;
  return { state: validateState(next), newItems, newTicks, keptValues };
}
