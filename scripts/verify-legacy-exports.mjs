import { readFile, stat } from 'node:fs/promises';
import { basename } from 'node:path';
import { MAX_IMPORT_BYTES, parseLegacyExport, unionCompleted, inspectProgress } from './lib/legacy-progress.mjs';

const files = process.argv.slice(2);
if (!files.length) {
  console.error('Usage: node scripts/verify-legacy-exports.mjs /outside/repo/backup.json [more-backups.json ...]');
  process.exitCode = 1;
} else {
  const inventory = JSON.parse(await readFile(new URL('../docs/baseline/legacy-keys.json', import.meta.url), 'utf8')).keys;
  let union = Object.create(null);
  const reports = [];
  for (const file of files) {
    try {
      if ((await stat(file)).size > MAX_IMPORT_BYTES) throw new Error('File exceeds 1 MiB limit.');
      const backup = parseLegacyExport(await readFile(file, 'utf8'));
      const report = inspectProgress(backup.progress, inventory);
      const merged = unionCompleted(union, backup.progress);
      union = merged.progress;
      reports.push({ file: basename(file), origin: backup.origin, progress_present: backup.progressPresent,
        ...report, additional_completed_in_union: merged.newlyCompleted });
      if (report.unknown_keys.length && !process.exitCode) process.exitCode = 2;
    } catch (error) {
      reports.push({ file: basename(file), error: error.message });
      process.exitCode = 1;
    }
  }
  const valid = reports.filter(report => !report.error);
  const richest = valid.length ? Math.max(...valid.map(report => report.completed_keys)) : null;
  console.log(JSON.stringify({ mode: 'dry-run-only', reports,
    richest_exports: valid.filter(report => report.completed_keys === richest).map(report => report.file),
    combined: inspectProgress(union, inventory),
    note: 'No files, browser storage or server records changed. Unknown keys are retained and require review.' }, null, 2));
}
