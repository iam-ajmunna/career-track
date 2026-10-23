# Career Track V4

The uploaded `career-track-v4-kit.zip` is the source of the supplied shell, tokens, components, router, countdown/calendar/dashboard models, match scorer, adapter, radar collector and 26 original tests. Its root instructions are retained in this folder; the preview remains a reference artifact under `kit/preview/`.

The default UI has five destinations: Dashboard, Scholarships, Calendar, Documents and Settings. `/next/` serves the same interface; `/classic/` and `?ui=3` retain advanced V3 tools for one release. Both use the same unchanged V3 store and original local keys. No Google Auth or cloud sync is required.

## Implemented

- Live exact countdowns and honest date-only deadlines; four KPIs, application lanes, profile and curated matches.
- Country tiers, named compromises, all ISO destinations, priorities, four country-window tabs, searchable paginated lists, universities and research directories.
- Six-tab detail drawer with focus trapping, Escape/restoration, deep links, application stages, required/legacy checklists, private notes and lazy guides.
- Monday-start calendar, viewer timezone, agenda on mobile, keyboard movement, filters, personal test milestones and ICS export.
- Shared dossier readiness, document version/expiry, referees and English test plans.
- Profile/theme/density, complete export, previewed typed restore, backup-first typed reset/purge and retained Archive/Trash.
- Explicit in-memory demo, PWA manifest/icons, offline shell separation, hashed entries and a 150 KB initial-JS budget.

## Integration decisions

The kit explicitly anticipates implementation around its modules; it is not a complete app to copy and deploy unchanged. These corrections are recorded rather than silently treated as original kit code:

1. New V4 state uses `v3.preferences.workspaceV4.version = 1`, with validated defaults and a temporary adapter alias. The V3 schema/key and store remain unchanged. No migration write occurs on load.
2. The kit hero model could select unknown/suspended windows or a missing deadline. It now selects only open windows with a real live/date-only countdown. Additional regression coverage exercises those cases.
3. Adapter matches exclude inactive history. The adapter test imports the real repository domain rather than its sandbox fixture.
4. Country `fit` fields remain unknown/Provisional: current policy text does not establish every condition of the supplied rubric. No new immigration judgement is fabricated.
5. V4 backup restore is a previewed exact replacement after RESTORE and an export. Classic retains additive merge, private-context and corrupt-state recovery tools. Historical planning, comparison and advanced funding/admission tools remain linked to classic as allowed by the audit corrections.
6. Radar collector/workflow are installed, with an empty real feed. A repository variable `RADAR_PROVIDER_REVIEWED=true` is required before the scheduled job runs. No provider key/terms/response has been supplied or reviewed; no live collection is claimed. Unverified leads never receive countdowns.
7. Optional S8 sync stays deferred under the owner’s instruction to continue without Google Auth.
8. Existing copyright/licence attribution is retained. Real applicant defaults, the tracked private profile and historical captures containing personal data were removed from the current tree. History was not rewritten; repository visibility still requires owner administration.
9. Main publication is explicitly authorized by the current user instruction, superseding the kit’s generic owner-merge restriction. `pre-v4` preserves the actual remote baseline as a branch because this connector exposes branch creation but no tag-creation capability.
10. The classic browser suite now targets `/classic/` and fixes its clock for historical deadline assertions. Its implementation files remain untouched.

## Verification evidence

- `npm test`: 144 passing tests, including all 26 supplied tests and seven integration regressions.
- `check:keys`: all 102 original keys and labels preserved.
- `check:data`: 43 curated routes, 88 sources and valid registry references.
- Classic browser suite: 20 scenarios.
- V4 browser suite: `ux/browser-results.json`; width/theme/accessibility, persistence, typed restore/reset, offline, quota and corruption checks.
- `bundle-budget.json`: actual imported V4 JavaScript below 150 KB gzip.
- `ux/performance-results.json`: Lighthouse desktop/mobile results; test server compresses text resources as production hosting does.
- `ui-static-audit.json`: unmodified strict scanner output. Literal-button findings are traced to shared data-hook delegation by `check:ui:v4`; `ui-reviewed-audit.json` records the resolution and runtime evidence. No inline handler/CSP exception was introduced.
- `baseline/results.json`: all 13 classic screens captured in both themes at 1440/390 with an empty fictional workspace. PNG captures remain local; selected V4 demo WebP captures are committed.

The production Vercel deployment is triggered by Git after the PR checks pass. The public HTML, content-hashed application assets, guide endpoint, classic shell, manifest and service worker are checked after merge. Private browser data remains on its original device/origin.
