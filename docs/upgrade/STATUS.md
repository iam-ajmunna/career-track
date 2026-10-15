# Career Track v2

Updated: 15 October 2026. STATE: READY FOR OWNER REVIEW — CLOUD ACTIVATION PENDING.

## NEXT ACTION
Review draft PR https://github.com/iam-ajmunna/career-track/pull/4. Follow `CLOUD-ACTIVATION.md` for Google owner setup/provisioning, real-device checks and the first production keepalive. Mark ready and merge only after those account-controlled release gates are complete. No implementation source remains unpublished.

## Completed
| Step | Evidence |
|---|---|
| A0 audit/recovery baseline | `AUDIT.md`; upstream main `5f1362c010dfe3106c9ad8150295815d9ea49794`; local recovery tag; 20 before captures |
| A1 kit | Local commit `c2afd46`; 17 original kit tests retained; immutable reference in `kit/` |
| A2 normalization | Local `c31b7cb` + QA corrections; 21 records; canonical GB/FR; 250 current countries/territories plus EU collection, no duplicate names |
| A3 country screen | Country tiers, explicit compromises, source/provisional badges, country search/priorities, exact deep links |
| A4 details | Editable checklists, notes, shared documents, submission, single/bulk research/completion; old renderer retained in `src/legacy/` |
| A5 Overview/navigation | Pinned tray on both tabs, pinned-first deadline hero, five next actions, three summary tiles; first five shortcuts retained, Settings 6 / Goal 7 / Archive 8 |
| B1 evidence | Official country evidence and KAUST family-housing costs sourced; unsourced judgments remain explicitly Provisional |
| C1 UX | 1440/390px light/dark checks, all eight tabs, sticky chrome, bottom mobile nav, explicit import, backup-first typed reset, app-owned deletion |
| D1 persistence | Owner-only RLS/CAS retained, new v2 namespaces, recoverable queue/conflicts, Google sign-in, explicit import; migration applied, live grants/validation verified, security advisors clean |
| D2 calendar | Exact UTC + provider/Dhaka displays, DST tests, four alarms/event, date-only calls never receive invented alarms |
| E1 code QA | 74/74 automated tests; 11 browser checks; production build/data/key checks pass; before/after captures prepared |

## Latest verification
- `npm test`: **74 passed, 0 failed** (serial runner bounds PGlite peak memory).
- `CT_CHROMIUM_PATH=<existing chromium> npm run test:browser`: **11 checks passed**, no uncaught browser errors; includes clean second-browser restore, failed save/Retry and other-account denial on synthetic backend.
- `npm run check:data`: **OK: 21 scholarships**.
- `npm run check:keys`: **102 frozen legacy keys/meanings preserved**.
- `npm run build`: succeeds; entry 236,158 bytes / 63,313 gzip (split app chunks are separate).
- DESIGN.md lint: **0 errors**; nine pre-existing token-documentation warnings.
- UI strict static scan ran. Seven actionless-button findings are parser false positives for delegated handlers; manual tracing/runtime evidence in `UI-REVIEW.md`. Raw results retained; no inline handlers were added to bypass CSP.
- `baseline/`: 20 original screenshots; `ux/`: 36 after screenshots and machine-readable browser results. WebP copies preserve the exact pixels losslessly; raw PNGs are intermediate captures.

## Owner-controlled release gates
Google provider/redirect setup, first real Google owner sign-in and administrative provisioning, real second-device login, and the first production keepalive 200. See `CLOUD-ACTIVATION.md`. Vercel project/env inspection returns a scope-permission 403; CLI fallback is unauthenticated. The implementation remains reviewable through GitHub.

## Decisions / corrections
- Corrected 15 obsolete CLDR aliases: the kit mapped UK scholarships to UK instead of GB and France to FX. Current coverage is ISO 249 + Kosovo; EU is clearly a region, not a fabricated country. See AUDIT.
- Preserve the stronger existing sole-owner row, grants and revision trigger instead of the kit's client INSERT policy.
- Device mode is explicitly labeled local-only until Google sign-in. Account caches are owner-scoped. The explicit importer can transfer the v2 device workspace to an authorized owner without overwriting newer cloud notes.
- Closed v2 applications retain their progress, including pins; only manually trashed records purge after their existing ten-day recovery period. Legacy expiry logic remains available with its original default for historical contracts.
- A3–A5, C1 and D1 were integrated together because the same detail rendering, auth lifecycle and queued state must switch atomically. B1 data edits were kept source-backed; unsourced judgments were not upgraded.
- Never pushed or merged to main. The earlier outage checkpoint was documentation only; this publish contains the actual implementation.

## Commit evidence
Local source implementation: `00c35c1` (A3–D2). Original kit/audit: `c2afd46`; normalization: `c31b7cb`. Remote publish hashes and PR follow in the final handoff commit.

## Published review result
- Actual source commit: `9672d9d378abd74e4ecd93bf7da85eb52e7bb1e8`.
- Lossless screenshot evidence: `369ab2349968aa1571ecb104268bf3d71e5354a0`.
- Draft PR: https://github.com/iam-ajmunna/career-track/pull/4 (`personal-dynamic` → `main`). Draft status reflects account activation, not missing implementation.
- GitHub’s Vercel status for the source commit returned success. Main is still `5f1362c010dfe3106c9ad8150295815d9ea49794`.
