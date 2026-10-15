# Career Track v2 — recovery checkpoint

Updated: 15 October 2026. STATE: LOCAL IMPLEMENTATION SAVED; EXECUTION ENVIRONMENT OFFLINE.

## NEXT ACTION
Reconnect the existing workspace at /workspace/scratch/76089bc8d648/career-track. Preserve its modified files and local commits. Do not replace this directory with the remote branch. Complete browser QA, publish the implementation commits onto personal-dynamic, then open the requested PR to main. This remote checkpoint contains only this handoff; implementation source has not been uploaded.

## Baseline
- Upstream main: 5f1362c010dfe3106c9ad8150295815d9ea49794.
- personal-dynamic was an ancestor 30 commits behind main. No force-push or change to main.
- Direct Git clone lacked authentication. Seventy baseline files were fetched through the connected GitHub app and locally initialized.
- Local baseline/recovery snapshot: 526d4a1. Local kit/audit commit: c2afd46. Local normalization commit: c31b7cb.
- A subsequent A3–A5 commit command was started; its result must be inspected after reconnect.

## Implemented locally
- Kit installed in docs/upgrade and src/lib, src/views, src/styles, src/data. Existing DESIGN.md/UX-CONTRACT.md read.
- 21 scholarships normalized; 265 countries/territories plus one explicitly labeled EU multi-country collection. EDISS appears under its documented FI/ES/IT/SE hosts.
- Country-first browsing, requirement tiers and explicit compromises, priorities, country search, deep links and working tray on Overview/Scholarships.
- Inline editable checklists, notes, research/completion controls and submission. Original renderer retained under src/legacy.
- Settings=6, Goal=7, Archive=8. Typed reset downloads an export; deletion uses app-owned dialog.
- New local namespace career-track:v2. Existing local-state and scholarship-progress keys are read only through an explicit, idempotent import preview.
- Existing CAS sync/cache extended for pins, notes, priorities, research tracking and lifecycle. Ordinary unpin persists; stale unpin/text edits report conflicts.
- Google sign-in/sign-out integrated; device-only mode explicitly labeled until sign-in.
- Calendar export reuses validated RFC5545 folding and four alarms; no alarms invented for date-only deadlines.
- Official country evidence added for GB/DE/FI/HU/US/FR/IE/AE/KR/TR/JP and a KAUST spouse-housing override that states extra fees. Unverified judgments remain Provisional.

## Verification actually completed
- Baseline: 49/49 tests; kit 17/17; frozen 102 legacy-key meanings preserved.
- After core UI/sync/migration implementation: 71/71 tests, production build passed.
- Local Chromium smoke: countries render; country deep link opens; pin and checklist tick survive reload; tray link works. Screenshots saved at /tmp/ct-first.png, /tmp/ct-countries.png, /tmp/ct-detail.png.
- Research/countdown/view follow-up changes were made after that 71-test run. Their test/commit command was started but output was not retrieved before disconnection.
- Expanded tests/browser-v2.mjs creation/execution was attempted when exec transport disconnected; verify whether that file exists.
- No full mobile/theme matrix, synthetic cloud browser recovery matrix, live Google OAuth, real second-device acceptance, or final QA claim.

## Cloud
- Existing free Supabase project yqqcfonzkkrboghhfbdx was INACTIVE; restored successfully.
- Live metadata read: zero users, zero workspaces; owner SELECT/UPDATE RLS policies retained.
- Additive migration generated locally via Supabase CLI: supabase/migrations/20261015081528_career_v2_fields.sql.
- Migration validated in local PGlite; NOT applied to the live project.
- Google provider and real owner provisioning remain required. No owner identity or credentials were fabricated.

## Environment / QA recovery
The terminal returned: 409 Conflict, environment_offline: Environment is not connected. exec_command and apply_patch could no longer reach the workspace. This is an infrastructure interruption, not a test failure.
Local commands have isolated network namespaces: start the dev server and Playwright in the SAME exec command/process tree.
Playwright runtime: CODEX_PRIMARY_RUNTIME_NODE_MODULES/playwright. A temporary tooling-only @sparticuz/chromium install is under /tmp/ct-browser; its binary was decompressed to /tmp/ct-chrome/chromium. No new project runtime dependencies were added.
Use the existing tests/browser-fixture.mjs for synthetic account isolation/save failure tests. No tests should write to the production database.
