# Express Track — complete the baseline handoff

The repository audit passes **Gate 1**. The app is dependency-free JavaScript with a central progress save function. The current production implementation remains unchanged.

## 1. Back up the progress in your actual browsers

1. Open https://muncareer.vercel.app/ in the same browser/profile where you have checked tasks. Do not reset progress or clear site data.
2. Open DevTools → Sources → Snippets, create a snippet, and paste the complete contents of [`scripts/export-legacy-progress.js`](../scripts/export-legacy-progress.js). Read it, then run it on that dashboard tab. It reads two Career Track keys and downloads JSON; it sends nothing to a server.
3. Keep the downloaded `career-track-legacy-…json` in Downloads and copy it to a second private location outside this repository. Repeat for each browser/profile and each production/preview/localhost origin you actually used. A new preview URL cannot export an old origin's data.
4. If a phone browser contains unique progress and has no usable developer tools, preserve its site data and identify it before migration. Do not assume an empty desktop export includes the phone's progress.
5. Attach the export files to the implementation conversation for validation and the later dry-run import. If the file reports no progress, check the other browsers/profiles before concluding there is nothing to import.

Optional local verification, from the working branch with Node 22+:

```bash
node scripts/verify-legacy-exports.mjs "$HOME"/Downloads/career-track-legacy-*.json
```

This prints counts, unknown keys and a union dry run. Exit `0` means valid known keys; `2` means unknown keys require review; `1` means invalid input. It does not write files, localStorage or a database. Missing/false flags never undo completed flags. Keep corrupt exports too: their original raw value may be recoverable.

## 2. Publish the annotated recovery tag

The local annotated tag was created and verified. The current connector can write branches but cannot create tags, and the implementation terminal has no authenticated GitHub push. Run this once in an authenticated checkout:

```bash
git fetch origin
git switch personal-dynamic
node scripts/freeze-baseline.mjs --push
```

The script verifies the repository, refuses if remote `main` moved since audit, creates/pushes only `pre-migration`, and verifies the remote annotated tag points to `af53a4c34295a160217845465c33002b074e10d7`. It never force-pushes or replaces a mismatched tag. Share the success output; if it refuses, retain the error and re-audit rather than forcing it.

## 3. Add interim deadline alarms

Import [`interim-deadlines.ics`](baseline/interim-deadlines.ics) into the calendar you use on your phone. It contains two verified provider deadlines:

| Event | Time in Bangladesh |
|---|---|
| Knight-Hennessy | **7 October 2026, 02:00** |
| Commonwealth Master's / CSC | **20 October 2026, 21:00** |

Check both event times and the requested alarms (7 days, 3 days, 24 hours, 3 hours) on your phone. This is a one-time import, not a hosted subscription or a guarantee that your calendar retains every alarm. The Bangladesh nominating-agency deadline and Stanford graduate-program deadline are separate and still need checking. Official sources and UTC instants are in [`near-term-deadlines.json`](baseline/near-term-deadlines.json).

## What happens next

After the recovery tag and real browser backups are verified, E-2 starts: the free Supabase project, Google OAuth, the single-owner `user_state` table, revision checks and daily keep-alive. Do not put service-role secrets, Google client secrets or database passwords in chat or git; configure them in the relevant provider settings.

E-3 then adds the adapter and visible save/failure states. A fresh-device login, failed-save recovery, idempotent import, timezone behavior and phone alarms must pass on Preview before any merge to `main`.
