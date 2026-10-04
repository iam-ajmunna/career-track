export const EMPTY_STATE = Object.freeze({ schema_version: 1, progress: {}, applications: {}, profile: null, lifecycle: {}, history: {} });
const prohibited = new Set(['__proto__', 'constructor', 'prototype']);
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const text = (value, max = 160) => String(value ?? '').trim().slice(0, max);
const score = value => Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
export function validateProfile(value) {
  if (value === null) return null;
  if (!record(value) || !record(value.positioning)) throw new Error('The saved profile is invalid.');
  const profile = {
    name: text(value.name, 80),
    degree: text(value.degree, 120),
    university: text(value.university, 120),
    cgpa: text(value.cgpa, 32),
    highlights: Array.isArray(value.highlights) ? value.highlights.map(item => text(item, 56)).filter(Boolean).slice(0, 8) : [],
    positioning: {
      engineering: score(value.positioning.engineering),
      research: score(value.positioning.research),
      academics: score(value.positioning.academics),
      developmentImpact: score(value.positioning.developmentImpact),
      leadership: score(value.positioning.leadership)
    }
  };
  if (!profile.name || !profile.degree || !profile.university || !profile.cgpa) throw new Error('The saved profile is incomplete.');
  return profile;
}
export function validateState(value) {
  if (!record(value) || value.schema_version !== 1 || !record(value.progress) || !record(value.applications)) {
    throw new Error('The saved workspace has an unsupported format.');
  }
  if (new TextEncoder().encode(JSON.stringify(value)).length > 131072) throw new Error('The workspace exceeds its size limit.');
  for (const [key, flag] of Object.entries(value.progress)) {
    if (prohibited.has(key) || !/^(sch-[a-z0-9-]+-\d+|doc-[a-zA-Z0-9]+|ielts-[a-z0-9]+|ref-[ABC]-(confirmed|briefed|submitted)|goal-[a-z0-9-]+-\d+)$/.test(key) || typeof flag !== 'boolean') {
      throw new Error('The workspace contains invalid progress.');
    }
  }
  for (const [key, status] of Object.entries(value.applications)) {
    if (prohibited.has(key) || !/^[a-z0-9-]+$/.test(key) || !['preparing', 'submitted', 'skipped'].includes(status)) {
      throw new Error('The workspace contains an invalid application status.');
    }
  }
  const next = structuredClone(value);
  next.profile = validateProfile(next.profile);
  const validId = key => /^[a-z0-9-]+$/.test(key) && !prohibited.has(key);
  const validStamp = stamp => typeof stamp === 'string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(stamp) && Number.isFinite(Date.parse(stamp));
  next.lifecycle = {};
  if (value.lifecycle !== undefined && !record(value.lifecycle)) throw Error('Invalid scholarship lifecycle.');
  for (const [id, item] of Object.entries(value.lifecycle || {})) {
    if (!validId(id) || !record(item) || !['archived','trash','purged','expired'].includes(item.status) || !validStamp(item.at)) throw Error('Invalid scholarship lifecycle.');
    if (item.status === 'trash' && (!validStamp(item.purgeAt) || Date.parse(item.purgeAt) <= Date.parse(item.at))) throw Error('Invalid deletion date.');
    next.lifecycle[id] = item.status === 'trash' ? { status: item.status, at: item.at, purgeAt: item.purgeAt } : { status: item.status, at: item.at };
  }
  next.history = {};
  if (value.history !== undefined && !record(value.history)) throw Error('Invalid deadline history.');
  for (const [id, item] of Object.entries(value.history || {})) {
    if (!validId(id) || !record(item) || typeof item.name !== 'string' || !item.name.trim() || item.name.length > 180 ||
        typeof item.deadline !== 'string' || !/^(\d{4}-\d\d-\d\d|\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ)$/.test(item.deadline) ||
        !validStamp(item.expiredAt) || next.lifecycle[id]?.status !== 'expired') throw Error('Invalid deadline history.');
    next.history[id] = { name: item.name.trim(), deadline: item.deadline, expiredAt: item.expiredAt };
  }
  return next;
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
    if (bucket === 'profile') {
      if (key !== 'current') throw new Error('Invalid pending change.');
      next.profile = validateProfile(value);
      continue;
    }
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
