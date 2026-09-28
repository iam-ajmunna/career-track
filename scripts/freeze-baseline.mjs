import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const baseline = JSON.parse(await readFile(new URL('../docs/baseline/baseline.json', import.meta.url), 'utf8'));
const expected = baseline.commit;
const tag = 'pre-migration';
const args = process.argv.slice(2);
if (args.length !== 1 || !['--check-local', '--push'].includes(args[0])) {
  throw new Error('Use --check-local to verify the local tag, or --push to create/push only the annotated recovery tag.');
}
function git(args, allowAbsent = false) {
  try { return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim(); }
  catch (error) { if (allowAbsent && error.status === 2) return ''; throw error; }
}
function checkLocal() {
  if (git(['cat-file', '-t', `refs/tags/${tag}`]) !== 'tag' ||
      git(['rev-parse', `refs/tags/${tag}^{}`]) !== expected) {
    throw new Error('Existing local tag is not an annotated tag at the audited commit. Nothing was overwritten.');
  }
}
if (args[0] === '--check-local') {
  checkLocal();
  console.log(`PASS: local annotated ${tag} resolves to ${expected}. This does not prove a remote tag exists.`);
} else {
  const remote = git(['remote', 'get-url', 'origin']);
  if (!/^(?:https:\/\/github\.com\/|git@github\.com:)iam-ajmunna\/career-track(?:\.git)?$/.test(remote)) {
    throw new Error('origin is not the expected Career Track repository.');
  }
  const main = git(['ls-remote', '--exit-code', 'origin', 'refs/heads/main']).split(/\s+/)[0];
  if (main !== expected) throw new Error('Remote main changed after audit. Re-audit before freezing; no tag was changed.');
  const existing = git(['ls-remote', '--exit-code', '--tags', 'origin', `refs/tags/${tag}`, `refs/tags/${tag}^{}`], true);
  if (existing) {
    if (!existing.split('\n').some(line => line === `${expected}\trefs/tags/${tag}^{}`)) {
      throw new Error('Remote pre-migration is not an annotated tag at the audited commit. Refusing to replace it.');
    }
    console.log(`PASS: remote annotated ${tag} already points to ${expected}.`);
  } else {
    git(['fetch', '--no-tags', 'origin', 'main']);
    const hasTag = git(['tag', '--list', tag]);
    if (!hasTag) git(['tag', '-a', tag, expected, '-m', 'Career Track baseline before Express Track; audited 28 September 2026.']);
    checkLocal();
    git(['push', 'origin', `refs/tags/${tag}:refs/tags/${tag}`]);
    const after = git(['ls-remote', '--exit-code', '--tags', 'origin', `refs/tags/${tag}^{}`]);
    if (after.split(/\s+/)[0] !== expected) throw new Error('Remote tag verification failed.');
    console.log(`PASS: remote annotated ${tag} created and verified at ${expected}.`);
  }
}
