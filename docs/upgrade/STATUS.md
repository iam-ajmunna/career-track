# Career Track v2

Updated: 15 October 2026. STATE: READY FOR OWNER REVIEW — NO AUTH REQUIRED.

## Next action

Review [PR #4](https://github.com/iam-ajmunna/career-track/pull/4), then merge `personal-dynamic` into `main` after checks pass. The owner requested proceeding without Google Auth. Google Cloud setup, Supabase provider configuration, owner provisioning and database keepalive are no longer release gates. See [RELEASE.md](RELEASE.md) for the short publication/backup instructions. The supplied kit reserves the production merge for the owner.

## Complete implementation

| Area | Result |
|---|---|
| Audit / kit / normalization | Original kit retained; upstream baseline `5f1362c010dfe3106c9ad8150295815d9ea49794`; 21 scholarships; canonical GB/FR; ISO 249 + Kosovo and one explicit Europe collection |
| Country workflow | Requirement tiers, explicit compromises, source/provisional badges, search/priorities, exact focused deep links |
| Scholarship work | Checklists, escaped notes, shared documents, submission, single/bulk research/completion and working tray |
| Overview / navigation | Pinned-first verified deadline, five next actions, three tiles; original five shortcuts, Settings 6 / Goal 7 / Archive 8 |
| Evidence | Official source/date updates and KAUST family housing costs; unsourced judgments remain Provisional |
| Device persistence | Direct no-login startup, validated `career-track:v2` storage, offline local writes, blocked/quota/corrupt-data recovery, explicit legacy import and JSON backup transfer |
| UX / safety | All eight tabs at 1440/390px in both themes; sticky chrome, mobile bottom rail, backup-first typed reset and app-owned deletion |
| Calendar | UTC + provider/Dhaka displays, DST validation and four alarms per exact verified event; no invented times |
| Deferred backend | Existing owner-only RLS/CAS, migrations and server tooling preserved; no browser cloud/session initialization and no scheduled keepalive |

## Latest verification

- `npm test`: **83 passed, 0 failed**, including nine device/backup recovery tests. Serial execution bounds PGlite memory.
- `CT_CHROMIUM_PATH=<existing chromium> npm run test:browser`: **15 checks passed**, zero uncaught browser errors. This runs the actual device-mode entry, not a cloud substitute.
- Browser coverage includes obsolete-session isolation/no auth requests, clean-browser backup restore, read-only preview/idempotence, malformed files, offline/cross-tab writes, quota Retry, corrupt-byte export and blocked storage.
- `npm run check:data`: **OK: 21 scholarships**.
- `npm run check:keys`: **102 frozen legacy keys/meanings preserved**.
- `npm run build`: succeeds. Bootstrap entry: 4,078 bytes / 1,796 gzip; application/data chunks are separate. No Supabase SDK or auth configuration is included in the browser build.
- Official DESIGN.md lint: **0 errors**, nine pre-existing token-documentation warnings. Existing runtime tokens and component styling are unchanged.
- UI strict static scan: nine delegated-handler parser findings, manually traced in `UI-REVIEW.md`; no clean raw scan is claimed.
- `baseline/` retains 20 original captures. `ux/` has 38 current captures and machine-readable results; WebP copies preserve PNG pixels losslessly.

## Current decisions

- The owner's request to continue without Google Auth supersedes the earlier OAuth release gates. The page opens directly; existing OAuth sessions/account caches are not read. The production merge remains owner-controlled under the supplied kit.
- The active workspace is local to this browser and website origin. Automatic cross-device sync is unavailable. Settings can export/import a JSON backup between browsers or URLs; existing notes, priorities and profile details are kept, and completed work is added idempotently.
- Legacy keys are never changed. Corrupt bytes are retained for recovery rather than silently overwritten. An unsaved in-memory draft is protected from a conflicting storage event.
- Only manually trashed records purge after the existing ten-day window. Closed v2 applications retain progress. Backup import cannot resurrect purged records.
- The kit's 15 obsolete CLDR aliases remain removed; no current country is omitted and no duplicate country name remains. Country judgments without evidence remain Provisional.

## Published review history

The original source was published as `9672d9d378abd74e4ecd93bf7da85eb52e7bb1e8`, screenshots as `369ab2349968aa1571ecb104268bf3d71e5354a0`, and the previous handoff as `21cd96a79a976ab2b4799bc081a138b514b08726`. Those commits remain in branch history. This no-login follow-up updates the same PR and supersedes the earlier account-activation handoff. The agent has never pushed or merged to main.
