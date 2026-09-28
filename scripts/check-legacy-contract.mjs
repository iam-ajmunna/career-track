import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import * as data from '../src/data.js';
import { enumerateLegacyKeys } from './lib/legacy-progress.mjs';

const baseline = JSON.parse(await readFile(new URL('../docs/baseline/legacy-keys.json', import.meta.url), 'utf8'));
const current = enumerateLegacyKeys(data);
assert.equal(new Set(current.map(item => item.key)).size, current.length, 'Duplicate progress key');
assert.deepEqual(current, baseline.keys, 'Legacy keys or checklist labels/order changed. Freeze them during Express Track.');
console.log(`PASS: ${current.length} legacy keys and their meanings match baseline ${baseline.baseline_commit}.`);
