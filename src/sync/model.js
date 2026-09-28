export const EMPTY_STATE = Object.freeze({ schema_version: 1, progress: {}, applications: {}, profile: null });
const prohibited = new Set(['__proto__', 'constructor', 'prototype']);
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
export function validateState(value) {
  if (!record(value) || value.schema_version !== 1 || !record(value.progress) || !record(value.applications)) {
    throw new Error('The saved workspace has an unsupported format.');
  }
  if (new TextEncoder().encode(JSON.stringify(value)).length > 131072) throw new Error('The workspace exceeds its size limit.');
  for (const [key, flag] of Object.entries(value.progress)) {
    if (prohibited.has(key) || !/^(sch-[a-z0-9-]+-\d+|doc-[a-zA-Z0-9]+|ielts-[a-z0-9]+|ref-[ABC]-(confirmed|briefed|submitted))$/.test(key) || typeof flag !== 'boolean') {
      throw new Error('The workspace contains invalid progress.');
    }
  }
  for (const [key, status] of Object.entries(value.applications)) {
    if (prohibited.has(key) || !/^[a-z0-9-]+$/.test(key) || !['preparing', 'submitted', 'skipped'].includes(status)) {
      throw new Error('The workspace contains an invalid application status.');
    }
  }
  if (value.profile !== null && !record(value.profile)) throw new Error('The saved profile is invalid.');
  return structuredClone(value);
}
export function validateSnapshot(value, ownerId) {
  if (!record(value) || value.owner_id !== ownerId || !Number.isSafeInteger(value.rev) || value.rev < 0 ||
      !Number.isFinite(Date.parse(value.updated_at))) throw new Error('The server returned an invalid workspace.');
  return { ...value, state: validateState(value.state) };
}
export function reconcile(snapshot, operations) {
  const next = validateState(snapshot.state);
  const conflicts = [];
  for (const operation of operations) {
    const { bucket, key, value, baseRev } = operation;
    if (!['progress', 'applications'].includes(bucket) || prohibited.has(key)) throw new Error('Invalid pending change.');
    const current = next[bucket][key];
    const stale = baseRev !== snapshot.rev;
    const completion = bucket === 'progress' ? value === true : value === 'submitted';
    if (stale && !completion && (bucket === 'progress' ? current === true : current === 'submitted')) {
      conflicts.push({ bucket, key });
      continue;
    }
    next[bucket][key] = value;
  }
  validateState(next);
  return { state: next, conflicts, changed: JSON.stringify(next) !== JSON.stringify(snapshot.state) };
}

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}
