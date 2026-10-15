import { mergePrefs } from '../lib/requirements.js';
const record = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const safe = k => /^[a-z0-9-]+$/.test(k) && !['__proto__','constructor','prototype'].includes(k);
export const V2_BUCKETS = ['pins','preferences','ui','notes','tracking','lifecycle','history'];
export function validateV2(state) {
  for (const bucket of ['pins','preferences','ui','notes']) {
    if (state[bucket] !== undefined && !record(state[bucket])) throw Error('Invalid '+bucket+'.');
    if (Object.keys(state[bucket] || {}).length > 300) throw Error('Too many '+bucket+'.');
  }
  for (const [key,value] of Object.entries(state.pins || {})) if (!safe(key) || typeof value !== 'boolean') throw Error('Invalid pin.');
  for (const [key,value] of Object.entries(state.notes || {})) if (!safe(key) || typeof value !== 'string' || value.length>8000) throw Error('Invalid note.');
  for (const [key,value] of Object.entries(state.ui || {})) if (!['unratedOpen','legacyImported'].includes(key) || typeof value!=='boolean') throw Error('Invalid UI preference.');
  for (const [key,value] of Object.entries(state.preferences || {})) {
    if (key==='sortOrder' && ['best-first','worst-first'].includes(value)) continue;
    if (/^enabled-(funding|work|career|spouse|pr)$/.test(key) && typeof value==='boolean') continue;
    if (/^weight-(funding|work|career|spouse|pr)$/.test(key) && [1,2].includes(value)) continue;
    throw Error('Invalid country priority.');
  }
  return state;
}
export function applyV2Operation(next, {bucket,key,value,baseRev}, rev, conflicts) {
  if (!V2_BUCKETS.includes(bucket) || !safe(key) && !(bucket==='preferences' && key==='sortOrder') && !(bucket==='ui' && ['unratedOpen','legacyImported'].includes(key))) return false;
  next[bucket] ||= {};
  const stale=baseRev!==rev, current=next[bucket][key];
  // Concurrent removals and free-text edits must not silently overwrite a newer device.
  if (stale && current!==undefined && JSON.stringify(current)!==JSON.stringify(value)) {
    const completion=(bucket==='pins' && value===true) || (bucket==='tracking' && value==='completed');
    if (!completion) {conflicts.push({bucket,key,...(bucket==='notes'?{localValue:value,remoteValue:current}:{})});return true;}
  }
  if(value===null)delete next[bucket][key];else next[bucket][key]=value;
  return true;
}
export { mergePrefs };
