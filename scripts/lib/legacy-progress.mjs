export const MAX_IMPORT_BYTES = 1024 * 1024;
const unsafeKeys = new Set(['__proto__', 'constructor', 'prototype']);
const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);

export function validateProgress(value) {
  if (!isRecord(value)) throw new Error('Progress must be a JSON object.');
  const result = Object.create(null);
  for (const [key, flag] of Object.entries(value)) {
    if (!key || key.length > 200 || unsafeKeys.has(key) || /[\u0000-\u001f\u007f]/.test(key)) {
      throw new Error('Progress contains an unsafe or invalid key. Preserve the original export for review.');
    }
    if (typeof flag !== 'boolean') {
      throw new Error(`Non-boolean progress at ${JSON.stringify(key)}; no values were coerced or discarded.`);
    }
    result[key] = flag;
  }
  return result;
}

export function parseLegacyExport(text) {
  if (typeof text !== 'string' || Buffer.byteLength(text, 'utf8') > MAX_IMPORT_BYTES) {
    throw new Error('Legacy import must be UTF-8 JSON no larger than 1 MiB.');
  }
  let payload;
  try { payload = JSON.parse(text); }
  catch { throw new Error('Invalid JSON. Preserve the original export; nothing has been imported.'); }
  if (!isRecord(payload)) throw new Error('Legacy export must be a JSON object.');
  let progress = payload;
  let origin = null;
  let progressPresent = true;
  if (payload.format === 'career-track-legacy-export') {
    if (payload.version !== 1 || !isRecord(payload.storage)) throw new Error('Unsupported export version or storage shape.');
    if (typeof payload.origin !== 'string') throw new Error('Export origin is missing.');
    const source = new URL(payload.origin);
    if (!['https:', 'http:'].includes(source.protocol) || source.origin !== payload.origin) {
      throw new Error('Export origin must be an HTTP(S) origin without a path or credentials.');
    }
    if (typeof payload.exported_at !== 'string' || !Number.isFinite(Date.parse(payload.exported_at))) {
      throw new Error('Export timestamp is invalid.');
    }
    origin = source.origin;
    progressPresent = payload.storage['scholarship-progress'] !== null;
    const raw = payload.storage['scholarship-progress'];
    if (raw !== null && typeof raw !== 'string') throw new Error('Raw progress storage value must be a string or null.');
    try { progress = JSON.parse(raw ?? '{}'); }
    catch { throw new Error('The backup preserves malformed browser progress. Review its raw value before importing.'); }
  }
  return { progress: validateProgress(progress), origin, progressPresent };
}

// Import/recovery only. Normal online unchecks will require revision-checked patches.
export function unionCompleted(current, incoming) {
  const next = validateProgress(current);
  const source = validateProgress(incoming);
  let newlyCompleted = 0;
  for (const [key, value] of Object.entries(source)) {
    if (value === true && next[key] !== true) {
      next[key] = true;
      newlyCompleted++;
    }
  }
  return { progress: next, newlyCompleted };
}

export function inspectProgress(progress, inventory) {
  const known = new Map(inventory.map(item => [item.key, item.kind]));
  const result = { stored_keys: 0, completed_keys: 0, known_keys: 0, unknown_keys: [], by_kind: {} };
  for (const [key, flag] of Object.entries(validateProgress(progress))) {
    result.stored_keys++;
    if (flag) result.completed_keys++;
    const kind = known.get(key);
    if (!kind) { result.unknown_keys.push(key); continue; }
    result.known_keys++;
    result.by_kind[kind] ??= { stored: 0, completed: 0 };
    result.by_kind[kind].stored++;
    if (flag) result.by_kind[kind].completed++;
  }
  result.unknown_keys.sort();
  return result;
}

export function enumerateLegacyKeys({ scholarships, documents, englishPlan, referees, refereeStages }) {
  return [
    ...scholarships.flatMap(scholarship => scholarship.actions.map((label, index) => ({
      key: `sch-${scholarship.id}-${index}`, kind: 'scholarship', entity: scholarship.id, index, label
    }))),
    ...documents.map(item => ({ key: `doc-${item.id}`, kind: 'document', entity: item.id, label: item.label })),
    ...englishPlan.steps.map(item => ({ key: `ielts-${item.id}`, kind: 'ielts', entity: item.id, label: item.label })),
    ...referees.flatMap(referee => refereeStages.map(stage => ({
      key: `ref-${referee.id}-${stage.id}`, kind: 'referee', entity: referee.id, stage: stage.id, label: stage.label
    })))
  ];
}
