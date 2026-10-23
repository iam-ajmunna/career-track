# AUDIT — iam-ajmunna/career-track @ main 8eec65b (v0.3.2) — 20 Oct 2026

Method: read-only inspection through GitHub (no clone, no execution — the sandbox had no network and the GitHub connection was read-only). Every statement below was read from the named file; items marked **NOT VERIFIED** were not.
**Nothing was changed in the repository.**

## 1. Repository facts
| Area | Finding | Source |
|---|---|---|
| Stack | Vanilla ES modules, esbuild bundling, no UI framework; runtime dep `@supabase/supabase-js`; dev deps `esbuild`, `@electric-sql/pglite`; Node ≥ 22.18 (CI uses Node 24) | `package.json`, CI file |
| Scripts | `build`, `dev`, `test` (`node --test --test-concurrency=1 tests/*.test.mjs`), `check:keys`, `check:data`, `check:ui`, `test:browser`, `research:check`, `provision:owner` | `package.json` |
| CI | Runs `npm ci`, `npm test`, `check:keys`, `check:data`, `build` on every PR to `main` and on pushes to `main`, `personal-dynamic`, `v3-intelligence`. **`check:ui` and `test:browser` are NOT in CI.** | `.github/workflows/personal-dynamic-ci.yml` |
| Branches | `main` (8eec65b), `personal-dynamic`, `v3-intelligence`, `v3-finish-migration`, `v3-refresh-fix`, `feature/scholarship-lifecycle`, `feature/research-completion-tracker`, `version-2` | branch list |
| Entry | `index.html` → `src/bootstrap.js` which **dynamically imports `./v3/workspace.js`** | `src/bootstrap.js` |
| Build | `scripts/build.mjs` bundles `src/bootstrap.js` and copies a fixed list of CSS (`assets/styles.css`, `src/styles/countries.css`, `src/styles/intelligence.css`), `index.html`, builds the service worker and `deadlines.ics` | `scripts/build.mjs` |
| CSP | `script-src 'self'`, `style-src 'self' 'unsafe-inline'`, `connect-src 'self'` (no outside network; Supabase sync is therefore inactive) | `vercel.json` |
| Data | Registry in `data/v3/*` (opportunities 323 KB, deadlines, sources, universities, programmes, countries); 8 countries have policy text but **no `fit` ratings** | `data/v3` listing, `countries.json` |
| Tests | `tests/*.test.mjs` suites incl. earlier-kit `logic.test.mjs` and `views.test.mjs`; `tests/browser-v3.mjs` | `tests` listing |

## 2. Storage (what "keeps saved browser data" means)
| Key | Meaning | Rule for v4 |
|---|---|---|
| `career-track:v3` | Main validated state (progress, lifecycle, tracking, pins, notes, `v3.{profile,preferences,applications,documents,references,…}`). Store validates, migrates, backs up and detects cross-tab conflicts. | **Reuse `createV3Store` unchanged.** v4 must read/write only through its API. |
| Legacy progress keys | e.g. checklist ids; frozen by `docs/baseline/legacy-keys.json`, guarded by `npm run check:keys` | Never rename/reorder. |
| `scholarship-theme` | `"dark"` or `"light"` (default light). Read by `src/theme.js`. | v4 uses this key and only these two values. (The earlier kit's `career-track:v4:theme` and "system" mode are **withdrawn**.) |
Because storage is per-origin, a page served from the **same origin** sees the same data. Vercel preview URLs are different origins (empty storage).

## 3. Shell contract the bootstrap relies on
`src/bootstrap.js` binds to these ids at load: `appShell, workspaceGate, workspaceTitle, workspaceMessage, workspaceRetry, gateExport, syncLabel, syncBar, syncRetry, syncMessage, exportProgress`. `workspace.js` additionally binds `nav, pageTitle, pageSubtitle, globalSearch, searchClear, themeToggle, toastRoot`, dialogs and `view-<name>` sections at module load (it throws if they are missing). **Consequence:** the new shell cannot simply replace `index.html` while `workspace.js` is loaded.

## 4. Routes (13 views) and parameters
Views: `overview, scholarships, countries, universities, research, pipeline, documents, calendar, sources, profile, goal, library, settings`. Detail: `#/scholarships/<id>`; country: `#/scholarships/country/<CC>?focus=<id>`; filters via query (`q`, `window`, `intake`, …). Intake switch **2027 / 2028** exists and must be kept (the earlier plan omitted it). Keys 1–8 select views.

## 5. Domain shapes the new UI must consume (from `src/v3/domain.js`, `schema.js`)
- `opportunityFacts(opportunity, registry, state, now, intake)` → `{ opportunity, application{stage,decision,completedSteps,blockedReason?}, window{status,urgent,deadline,reason}, eligibility{status,rules}, blockers, prerequisites, lifecycle, actionable }`.
- `window.status`: `open | closed | upcoming | opening-soon | verification-required | deadline-unknown | suspended`.
- `decision`: `apply | research | watch | low-priority | not-pursuing`. Stages include `not-started, preparing, awaiting-documents, awaiting-references, ready, submitted, under-review, interview, offer, awarded, rejected, withdrawn`.
- Deadline precision: `exact | date-only | tentative | unknown`; exact has `at` (UTC), date-only has `date` + `timezone`.
- `readiness(opportunity, application, state)` → `{done,total,percent,unresolved,verifiedComplete}` (mandatory steps only).
- Document statuses: `not-started, preparing, ready, submitted, expired` (**no "Draft"** — earlier mockup stepper used four steps with "Draft"; map it to `preparing`). Reference stages: `not-requested, requested, confirmed, briefed, submitted`.
- `profile` has no display name today; `preferences.preferredCountries` defaults to `CA, AU, US, GB`; `allowReturnHome` exists; research areas default to `machine-learning, computer-vision, efficient-ai`.

## 6. Constraints discovered (must not be violated)
1. `check:ui` couples to `src/v3/views.js`, `src/v3/workspace.js`, `src/styles/intelligence.css` (forbids inline `onclick`, native `alert/confirm/prompt`, requires specific `data-v3-*` handlers). → **Do not edit those files** in the strangler phase.
2. `npm test` runs every `tests/*.test.mjs`; new test files must use that suffix and stay deterministic.
3. `scripts/build.mjs` only copies listed CSS; new CSS and the new entry must be added there.
4. CSP forbids inline scripts and outside connections.

## 7. Privacy findings
- `supabase/owner-profile.json` (public while the repo was public) holds: full name, country, degree, university, CGPA, specialisation, highlights and self-scored ratings. **Treat as exposed.** `supabase/project.json` holds the project ref and a *publishable* key (public by design; safe only if Row-Level Security is correct — RLS tests are not in CI).
- **NOT VERIFIED:** `src/data.js`, `src/personalized-goal-data.js`, `docs/**`, git history. Run locally (history included):
  `Run scripts/check-v4-privacy.mjs; review history separately without printing personal values.`
- Recommended: remove the file from the tree, purge history with `git filter-repo` (owner decision), keep the repo private.

## 8. Requirements status (R-1 … R-9)
| ID | Status in `main` |
|---|---|
| R-1/R-2/R-4/R-5 country tiers + sacrifice lines | Built 15 Oct in `src/views/*` + `src/lib/scoring.js`; **not wired into V3** (V3 Country Explorer is flat A–Z). Countries lack `fit` data. |
| R-3 every country | ISO list from earlier kit exists (**NOT VERIFIED** in V3 views). |
| R-6 working-on tray | Exists in `src/views/working-tray.js`; V3 uses pins/decisions instead (**NOT VERIFIED** UI). |
| R-7 user-friendliness | Regressed in V3 (13 nav items, dense text). |
| R-8 visible on every device | **Not met** (device-only storage; sync code present but off). |
| R-9 countdown + alarms | Deadline engine + `deadlines.ics` exist; dashboard shows a "next verified deadline" card with text countdown. |

## 9. Corrections to the earlier plan/kit (these supersede it)
1. **Rollout:** not `?ui=4` inside `index.html`. Use a **parallel entry `/next/`** (same origin ⇒ same saved data): `next/index.html` + `src/v4/bootstrap.js` (a copy of `src/bootstrap.js` whose dynamic import points to `./v4/workspace.js`). Root `/` is untouched until the flip.
2. **Theme:** reuse `src/theme.js` and key `scholarship-theme` (light/dark only).
3. **Build:** add to `scripts/build.mjs`: bundle entry `src/v4/bootstrap.js` → `assets/app4.js`; copy `src/styles/tokens.css` and `app.css` (as `assets/tokens.css`, `assets/app4.css`); copy `next/index.html` → `dist/next/index.html`; make the service worker precache them. (Read `build.mjs` first; exact edits not applied.)
4. **Adapter:** the repo's `opportunityFacts` rows are already the shape `buildDashboard` needs. `src/v4/adapter.js` (tested against a verbatim copy of the real domain functions) wires them; inject the real functions in `src/v4/workspace.js`.
5. **Documents UI:** use the 5 real statuses; stepper = not-started → preparing → ready → submitted (+ `expired` flag).
6. **Legacy redirects:** real view names above (see `LEGACY` in `src/app/router.js` — updated).
7. **Keep intake switch (2027/2028)**; place it in the top bar as a small select.
8. **Settings → Backup & import** reuses the existing store/backup functions; first release links to the classic page for advanced tools instead of re-implementing them.
9. **CI gaps:** add `check:ui` to CI only for the classic UI; add `node --test` for new tests automatically (suffix `.test.mjs`).

## 10. Not verified / not done
Not read: `src/app.js`, `src/personalized-goal*.js`, `src/data.js`, `src/v3/calendar.js`, `src/sync/*`, `scripts/*` other than build/contract/ui-bindings, `docs/UX-CONTRACT.md`, test bodies. Not run: any repo command. Not changed: any repo file.


## 11. Implementation verification — 23 October 2026

The local checkout matches the audited main content baseline. The remote main ref was verified as `8eec65b`; local history is synthetic, so publication constructs commits from the actual remote base tree and parent without force-pushing. Remote `pre-v4` and `v4-redesign` branches were created from that exact SHA.

All S0 VERIFY items were checked against the live code: 13 classic view names and hash filters; inactive prior `src/views` tier UI; V3 private state and public store API; exact/date-only ICS semantics; esbuild’s content-hashed entries and static cache; classic delegated binding assertions and browser selectors. V4 does not import the classic workspace or its DOM-bound views. `tests/adapter.test.mjs` now imports the actual domain functions.

The repository was still public when implementation began. Current-tree remediation removes the old owner-profile file, hard-coded applicant defaults, grade-bearing example profile values, and historic applicant screenshots. Existing licence attribution is retained. Provisioning now requires an explicitly supplied private profile file outside Git. The privacy scan checks values without printing them. Generic academic field names and schema fixtures remain: they are not applicant data. History was not rewritten and visibility could not be changed through the available connector.

V4 additions are stored in the existing validated V3 preferences map, under a separately versioned namespace. The legacy store remains byte-for-byte unchanged. Backup round-trip and preserved legacy work are tested. The country policy text does not prove the full five-requirement rubric, so added fit fields remain unknown with no invented source/date.

The lazy registry index keeps all domain prerequisites/checklist fields; long guide JSON is emitted separately by the build. Both default and parallel shells share V4 assets; classic has its own content-hashed entry and offline navigation cache. Production static caching has no private data. Browser and release evidence are listed in STATUS.md.
