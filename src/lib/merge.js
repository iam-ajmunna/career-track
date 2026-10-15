/**
 * Union-merge two JSON-like values so that NO completed item is ever lost.
 *  - booleans: a || b          (a tick on either device survives)
 *  - plain objects: merged key by key, recursively
 *  - arrays: union (deduplicated by JSON value), order of `base` first
 *  - other primitives (strings/numbers): `base` wins when defined, else `incoming`
 * Use as unionMerge(remote, local): the server copy wins for free text, but ticks/pins from both survive.
 */
export function unionMerge(base, incoming) {
  if (base === undefined || base === null) return incoming;
  if (incoming === undefined || incoming === null) return base;
  if (typeof base === 'boolean' && typeof incoming === 'boolean') return base || incoming;
  if (Array.isArray(base) && Array.isArray(incoming)) {
    const seen = new Set(), out = [];
    for (const v of [...base, ...incoming]) { const k = JSON.stringify(v); if (!seen.has(k)) { seen.add(k); out.push(v); } }
    return out;
  }
  if (isPlain(base) && isPlain(incoming)) {
    const out = { ...base };
    for (const k of Object.keys(incoming)) out[k] = k in base ? unionMerge(base[k], incoming[k]) : incoming[k];
    return out;
  }
  return base;
}
const isPlain = v => v && typeof v === 'object' && !Array.isArray(v);

/** Count ticks (true booleans) in a progress blob: used for the import dry-run summary. */
export function countTicks(v) {
  if (v === true) return 1;
  if (Array.isArray(v)) return v.reduce((n, x) => n + countTicks(x), 0);
  if (isPlain(v)) return Object.values(v).reduce((n, x) => n + countTicks(x), 0);
  return 0;
}
