// Offline preparation only. Inputs/outputs are private files outside the repository.
import { readFile, writeFile, stat } from "node:fs/promises";
import { resolve, dirname, sep } from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseBackup, validatePrivateState } from "../src/v3/store.js";
import { previewContext } from "../src/v3/context-import.js";
import { registry } from "../src/v3/catalog.js";

export function prepareWorkspace(
  backupRaw,
  contextRaw,
  now = new Date().toISOString(),
) {
  const migrated = parseBackup(backupRaw);
  const proposed = contextRaw
    ? previewContext(contextRaw, migrated, registry).state
    : migrated;
  const state = validatePrivateState(proposed);
  return {
    format: "career-track-v3-export",
    version: 3,
    exported_at: now,
    state,
    source_backup_sha256: createHash("sha256").update(backupRaw).digest("hex"),
    raw_recovery: backupRaw,
  };
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  const [backup, context, output] = process.argv.slice(2);
  if (!backup || !context || !output)
    throw Error(
      "Usage: node scripts/prepare-v3-workspace.mjs BACKUP.json CONTEXT.json OUTPUT.json",
    );
  const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const paths = [backup, context, output].map((p) => resolve(p));
  if (paths.some((p) => p === repo || p.startsWith(repo + sep)))
    throw Error(
      "Keep private workspace inputs and output outside the repository.",
    );
  if (paths[2] === paths[0] || paths[2] === paths[1])
    throw Error(
      "Choose a separate output file; original backups are never replaced.",
    );
  for (const path of paths.slice(0, 2))
    if ((await stat(path)).size > 1048576)
      throw Error("Private input exceeds 1 MB.");
  const [raw, notes] = await Promise.all([
    readFile(paths[0], "utf8"),
    readFile(paths[1], "utf8"),
  ]);
  const result = prepareWorkspace(raw, notes);
  if (Buffer.byteLength(JSON.stringify(result)) > 1048576)
    throw Error("Prepared backup exceeds the 1 MB import limit.");
  await writeFile(paths[2], JSON.stringify(result, null, 2) + "\n", {
    flag: "wx",
    mode: 0o600,
  });
  console.log(
    "Prepared and validated a complete V3 backup. Original files are unchanged.",
  );
}
