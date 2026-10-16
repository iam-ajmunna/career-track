# Migration and recovery

1. Open the same production URL in the browser that holds v2 progress.
2. V3 validates and displays the old state without changing it. Select **Download v2 backup & enable V3**. A JSON backup downloads; an exact raw pre-migration copy is saved separately; the original v2 key stays unchanged.
3. Existing submitted flags remain submitted with an explicit warning if v2 did not distinguish course admission from funding submission. Check the distinct university admission stage before editing it.
4. Export complete progress before clearing site storage or changing devices. Settings imports v2/v3 exports with a read-only preview. Ordinary import adds missing work and completed ticks while keeping existing text/conflicts.
5. A private planning-context file previews explicit profile, admission and decision changes; a current backup downloads before applying it. This is the supported way to apply personal context without publishing it as a public default.
6. Malformed/unsupported bytes block edits and remain in recovery exports. A validated backup can explicitly replace the unreadable V3 copy after downloading recovery data. Partial valid v2 states receive safe missing defaults; malformed field values are never coerced.
7. No deadline or ten-day timer deletes V3 application history. Archive/Trash can be restored after a deadline. Permanent purge is a separate confirmed action with a backup first. The old v2 and earlier legacy keys are never reset by V3.

Rollback: the original v2 key can be used by the prior deployed version. Export V3 before reverting because earlier code does not understand new admissions, budgets or references. Keep both exports; no automatic reverse migration is claimed.

## V3.0.1 completion fixes

A validated backup may now be previewed while migration is pending. **Back up v2 & import** downloads the original backup, enables the V3 copy and imports the preview in one operation. The original v2 key is unchanged. The save label identifies read-only migration explicitly.

V3 backup merge fills an unset (`unknown`) fee status, unions completed application steps and adds recorded submissions to pre-submission stages. Current notes, personal decisions and later outcomes win on conflicts. Purged records stay suppressed. Earlier Oxford application IDs also retain an additive canonical Clarendon record with the original scope warning.

For offline preparation, `node scripts/prepare-v3-workspace.mjs BACKUP.json CONTEXT.json OUTPUT.json` creates a complete validated V3 import from private files. All three paths must be outside the repository; the output must be a new file. It preserves original backup bytes for recovery and records their checksum. This does not write another browser's localStorage; the owner imports the file through Settings.

Static app updates activate after their new assets have cached, without reloading the page or discarding private in-memory drafts. A normal refresh then uses the new release even if other tabs remain open.
