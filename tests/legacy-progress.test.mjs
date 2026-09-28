import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { parseLegacyExport, unionCompleted, inspectProgress, MAX_IMPORT_BYTES } from '../scripts/lib/legacy-progress.mjs';

const envelope = raw => JSON.stringify({ format: 'career-track-legacy-export', version: 1,
  origin: 'https://muncareer.vercel.app', exported_at: '2026-09-28T09:34:31Z',
  storage: { 'scholarship-progress': raw } });

test('supports exact raw backups, missing progress and direct boolean maps', () => {
  assert.equal(parseLegacyExport(envelope('{"sch-kaust-0":true,"doc-cv":false}')).progress['sch-kaust-0'], true);
  assert.equal(parseLegacyExport(envelope(null)).progressPresent, false);
  assert.equal(parseLegacyExport('{"doc-cv":true}').progress['doc-cv'], true);
  assert.equal(Object.keys(parseLegacyExport(envelope('{}')).progress).length, 0);
});

test('rejects corrupt, oversized, non-boolean and unsafe payloads without coercion', () => {
  for (const input of ['{', 'null', '[]', '{"x":"true"}', '{"x":1}', '{"x":{}}', '{"__proto__":true}',
    '{"constructor":true}', '{"prototype":false}', '{"bad\\nkey":true}', envelope('{')]) {
    assert.throws(() => parseLegacyExport(input));
  }
  assert.throws(() => parseLegacyExport(' '.repeat(MAX_IMPORT_BYTES + 1)));
  assert.throws(() => parseLegacyExport(envelope('{}').replace('https://muncareer.vercel.app', 'https://muncareer.vercel.app/secret')));
  assert.throws(() => parseLegacyExport(envelope('{}').replace('"version":1', '"version":2')));
});

test('union import is idempotent and never downgrades completed or unknown keys', () => {
  const current = { 'doc-cv': true, 'doc-transcript': false, 'retired-check': true };
  const incoming = { 'doc-cv': false, 'doc-transcript': true, 'old-browser-check': true, 'unticked': false };
  const first = unionCompleted(current, incoming);
  assert.equal(first.newlyCompleted, 2);
  assert.equal(first.progress['doc-cv'], true);
  assert.equal(first.progress['retired-check'], true);
  assert.equal(first.progress['old-browser-check'], true);
  assert.equal(Object.hasOwn(first.progress, 'unticked'), false);
  const second = unionCompleted(first.progress, incoming);
  assert.equal(second.newlyCompleted, 0);
  assert.deepEqual(first.progress, second.progress);
  assert.equal(current['doc-transcript'], false);
});

test('independent browser completion union is commutative and explicitly reports unmapped keys', () => {
  const a = { 'doc-cv': true, 'doc-transcript': false };
  const b = { 'doc-transcript': true, 'legacy-unknown': true };
  const one = unionCompleted(unionCompleted({}, a).progress, b).progress;
  const two = unionCompleted(unionCompleted({}, b).progress, a).progress;
  assert.deepEqual(one, two);
  const stats = inspectProgress(one, [{ key: 'doc-cv', kind: 'document' }, { key: 'doc-transcript', kind: 'document' }]);
  assert.equal(stats.completed_keys, 3);
  assert.deepEqual(stats.unknown_keys, ['legacy-unknown']);
});

test('browser exporter reads only audited keys, preserves raw bytes and does not mutate storage', async () => {
  const source = await readFile(new URL('../scripts/export-legacy-progress.js', import.meta.url), 'utf8');
  for (const raw of [' { "sch-kaust-0" : true, "doc-cv":false } ', '{broken', null]) {
    const reads = [];
    let download, clicked = false;
    const context = {
      location: { protocol: 'https:', origin: 'https://muncareer.vercel.app', host: 'muncareer.vercel.app' },
      localStorage: { getItem: key => { reads.push(key); return key === 'scholarship-progress' ? raw : 'dark'; },
        setItem: () => assert.fail('Storage mutation'), removeItem: () => assert.fail('Storage deletion'), clear: () => assert.fail('Storage deletion') },
      document: { querySelector: () => ({}), body: { appendChild() {} },
        createElement: () => ({ click() { clicked = true; }, remove() {} }) },
      Blob, URL: { createObjectURL(blob) { download = blob; return 'blob:test'; }, revokeObjectURL() {} },
      setTimeout: fn => fn(), console: { info() {} }
    };
    vm.runInNewContext(source, context);
    const backup = JSON.parse(await download.text());
    assert.equal(clicked, true);
    assert.deepEqual(reads, ['scholarship-progress', 'scholarship-theme']);
    assert.equal(backup.storage['scholarship-progress'], raw);
    assert.equal(backup.storage['scholarship-theme'], 'dark');
    assert.equal(backup.origin, 'https://muncareer.vercel.app');
  }
});
