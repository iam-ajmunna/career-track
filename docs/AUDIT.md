# Career Track — Express Track baseline audit

> Historical baseline audit. The owner's 28 September fresh-start decision waives legacy exports/import. Current implementation and remaining cloud gates are recorded in [IMPLEMENTATION.md](IMPLEMENTATION.md) and [DEPLOYMENT.md](DEPLOYMENT.md). The baseline findings below describe commit `af53a4c`, not the new branch state.

Audited: **28 September 2026**. Scope: **E-0 / E-1**, following architecture addenda 27.8–27.9.

**Gate 1: GO on repository feasibility.** Progress can be centralized without a UI rewrite: one initialization read, one save function, two mutation call sites. **E-0 is not complete:** actual owner-browser exports and the remote annotated recovery tag remain outstanding. This is not a release approval or a claim that persistence is implemented.

## Evidence and recovery point

| Item | Verified result |
|---|---|
| Repository | `iam-ajmunna/career-track`, private, default branch `main` |
| Baseline commit | `af53a4c34295a160217845465c33002b074e10d7` |
| Baseline tree | `e5a60e600f7850f8cea71da022b4a3b8ac6af327` |
| Existing branches before work | `main`, `version-2` |
| Working branch | `personal-dynamic`, based on the exact baseline commit |
| Local recovery tag | Annotated `pre-migration`, verified to resolve to the baseline |
| Remote recovery tag | **Pending**; absent when queried. Available GitHub connector supports branch/commit changes but has no tag-creation operation; authenticated terminal push is unavailable. `scripts/freeze-baseline.mjs --push` completes and verifies this from an authenticated clone. |
| Deployment status | GitHub Vercel status: success, 26 September 2026 13:40:36 UTC |
| Rollback dashboard | https://vercel.com/aj-81af/career-track/BiwXf6qVViRkfcpDoZNVbbYdzBRY |
| Production alias | https://muncareer.vercel.app/ — loaded and rendered during audit |
| Deployment limitation | The immutable deployment public URL and rollback controls were not accessed; the dashboard above is the recorded deployment reference. |

All eight original files were fetched at the baseline SHA. Their Git blob hashes and complete tree hash were verified. The original commit object was reconstructed and hash-verified for the local checkout because the GitHub connector could read the private repository but the terminal lacked GitHub credentials. No fabricated replacement baseline commit was used.

The original eight files remain byte-for-byte unchanged in this work. `main` and `version-2` are not modified. Personal progress exports are never committed.

## Repository shape and build

```text
index.html
src/app.js
src/data.js
assets/styles.css
README.md
DESIGN.md
SCHOLARSHIP-SOURCES.md
LICENSE
```

- Vanilla browser ES modules, HTML and CSS. **No React, Vite, Next.js, package manifest, lockfile, build step or installed dependencies.**
- `index.html` loads `src/app.js`; `app.js` imports static named exports from `data.js`.
- No `AGENTS.md`, CI workflow, backend, auth, service worker, IndexedDB, API routes or Vercel configuration exists in the audited tree.
- Local serving: `python3 -m http.server 8080`. Native ESM can consume a browser-compatible Supabase client in E-3. Dependency bundling/pinning is an E-2/E-3 delivery choice; a React rewrite is unnecessary.
- Five in-page views; view/search/filter are in memory, not URL routes. Every `renderCurrentView()` calls all five renderers before changing the visible section (`src/app.js:382`).
- Existing Google Fonts requests load Inter and JetBrains Mono. CSS tokens and responsive rules are already present.

## Complete browser-storage inventory

Line numbers refer to the frozen commit, not future edits.

| File:line | Operation | Key | Shape / behavior | E-3 treatment |
|---|---|---|---|---|
| `src/app.js:7` | Read / JSON parse | `scholarship-progress` | Missing → `{}`; unguarded parse and storage access | Adapter bootstrap; validated owner-scoped cache and remote fetch |
| `src/app.js:8` | Read | `scholarship-theme` | String, default `light`; unguarded access | Keep as a device preference behind safe storage access |
| `src/app.js:57` | Write in `saveProgress()` | `scholarship-progress` | Serializes entire `state.progress`; unguarded | Replace with revision-checked persistence adapter |
| `src/app.js:470` | Write on theme toggle | `scholarship-theme` | `light` / `dark` | Safe preference storage; no need to sync theme |
| `index.html:13` | Read before CSS loads | `scholarship-theme` | Inside try/catch; applies `data-theme` | Preserve early theme paint; remains local preference |

**Exactly five storage API call sites; two concern progress.** No other browser persistence API calls exist in the original files.

### Progress mutations

| File:line | Mutation | Persistence path |
|---|---|---|
| `src/app.js:510–515` | Delegated `change` handler assigns checkbox boolean by `data-progress-key` | Calls `saveProgress()`, then re-renders |
| `src/app.js:483–488` | Reset confirmation replaces the entire map with `{}` | Calls the same save function; no backup or undo |

Reads for rendering occur in scholarship percentages (`app.js:110,117`), pipeline checkboxes (`253`), document totals/rows (`262–264,297`), IELTS (`268,317`) and referee checks (`271,331`). They use the in-memory map, not additional storage reads. The scholarship detail modal contains a plain action list rather than editable progress controls.

## Key and data contract

Runtime state is a **flat boolean map**, for example `{"sch-kaust-0":true,"doc-cv":false}`. Unchecking persists `false`; it does not delete the property. The current UI tests truthiness without schema validation. E-0 validation deliberately rejects non-booleans rather than silently coercing them.

| Kind | Key form | Definitions |
|---|---|---:|
| Scholarship action | `sch-${scholarship.id}-${zeroBasedIndex}` | 62 |
| Dossier item | `doc-${document.id}` | 26 |
| IELTS step | `ielts-${step.id}` | 5 |
| Referee stage | `ref-${referee.id}-${stage.id}` | 9 |
| **Total** | | **102** |

There are 14 scholarships; 3 referee slots (`A`, `B`, `C`) × 3 stages (`confirmed`, `briefed`, `submitted`). `docs/baseline/legacy-keys.json` records all 102 keys, labels, indexes and entities from the frozen source, including closed/ineligible/watch scholarships that are filtered out of the current pipeline. It is an inventory, **not** the normalized stable-key map deferred by the Express addendum.

`node scripts/check-legacy-contract.mjs` prevents changes to these keys, labels and ordering. Deadline/funding fact corrections can still occur without changing checklist definitions.

Other data is static: profile and fit heuristics, scholarship facts/actions, document definitions, IELTS strategy, referee role descriptions, timeline and `snapshotDate`. There are no persisted notes, application statuses, actual referee names/emails, document files or target dates in the current app.

## Progress export status

**No owner-browser export has been received, read or backed up in this session.** Number of real export files: 0. Richest origin/browser: unknown. Coverage against real exported keys: **not yet measured**.

The separate inspection browser rendered 0% pipeline completion. This says nothing about the owner's Chrome/Safari profiles, phone, localhost or preview origins and is not a valid owner-progress backup. Browser same-origin isolation prevents a preview/local utility from reading production progress.

Prepared tools:

- `scripts/export-legacy-progress.js`: owner-run exporter on the original dashboard; reads only the two audited keys, preserves raw strings (including malformed data), downloads JSON, no network or storage mutation.
- `scripts/verify-legacy-exports.mjs`: validates files outside git, caps input at 1 MiB, counts all buckets, reports unknown keys, identifies the richest export(s), and previews union completion across files. It never imports or writes state.
- `scripts/lib/legacy-progress.mjs`: strict parser, inventory helpers and idempotent completion union. Unknown valid boolean keys remain in the union and are explicitly reported; invalid values block validation and remain preserved in the original backup.
- `.gitignore`: excludes standard export filenames and environment secrets. This is defense in depth; keep the files outside the checkout.

Run the owner steps in `docs/EXPRESS-START.md`. Store one backup per used browser/profile/origin in two places outside git, then record counts without committing file contents.

## Deadline and visual findings

Current `deadline` and `opens` fields are date strings only. `localDate()` builds browser-local midnight; `daysUntil()` subtracts local midnights. Status closes only when the calendar day has passed, not at the provider's published closing time. There is no shared clock, UTC instant, IANA zone, timer interval, clock-skew correction or calendar export. Dates refresh only when rendering is triggered.

Two near-term official deadlines were independently verified on 28 September 2026:

| Deadline | Provider wall-clock | UTC | Asia/Dhaka |
|---|---|---|---|
| [Knight-Hennessy](https://knight-hennessy.stanford.edu/admission) | 6 Oct 2026, 13:00 America/Los_Angeles | 6 Oct, 20:00 | **7 Oct, 02:00** |
| [Commonwealth Master's / CSC](https://cscuk.fcdo.gov.uk/scholarships/commonwealth-masters-scholarships/) | 20 Oct 2026, 16:00 Europe/London (BST) | 20 Oct, 15:00 | **20 Oct, 21:00** |

Provider dates/times come from the linked official pages; UTC/Dhaka values are calculated and tested using the stated IANA zones. The CSC page says nominators may set separate closing dates. The linked Bangladesh UGC page returned no readable deadline, so **the Bangladesh nomination deadline remains unverified**. The calendar does not imply that it is the same as CSC. Other portfolio dates have not been reverified in this E-0/E-1 work.

`docs/baseline/interim-deadlines.ics` contains only those two public facts with 7-day, 3-day, 24-hour and 3-hour alarm requests. It is an importable interim file, not the E-6 hosted subscription feed. Phone import, displayed event times and alarm retention remain owner acceptance checks. Calendar clients control alarm handling.

Existing `assets/styles.css` already owns the light/dark tokens. `docs/tokens.md` records them. Theme defaults to light, not automatic OS preference. The 20-image full visual baseline from the original P0 roadmap is deferred with the rewrite; this Express start preserves every runtime file. The live overview and pipeline were inspected. No screenshot parity gate is claimed complete.

## Findings that must affect E-2 / E-3

1. **Malformed or blocked localStorage can crash startup.** Storage reads/writes must be guarded, surfaced and validated. Preserve corrupt raw backups before any repair.
2. **Concurrent full-map writes lose ticks.** Store a base `rev`, perform compare-and-swap at the database, and re-fetch/union/retry stale saves. Keep a persistent dirty snapshot during offline edits; never allow a newer server response to silently discard local unsaved work.
3. **Union semantics and unchecking differ.** Imports/stale recovery are completion-union only. A normal intentional online uncheck must be a revision-checked patch. Blind union on every successful save would make checkboxes impossible to clear. Reset needs an explicit safe design; it cannot be routed through ordinary union.
4. **RLS `owner_id = auth.uid()` alone is not single-owner authorization.** It isolates tenants but permits any existing authenticated user to insert their own row. Enforce the actual owner server-side, disable new signups after owner creation, and test a second account against both SELECT and INSERT/UPDATE. No client email allow-list.
5. **A login screen does not privatize static source.** `src/data.js` contains the personal profile. Before claiming the entire app is private, move private profile data into authenticated state or protect its serving path. A UI gate alone is insufficient.
6. **No secrets or project configuration is present.** Supabase project, owner identity, OAuth provider/redirect settings and Vercel environment access are not verified. No project was provisioned, no credentials were requested in chat, and no remote database was changed.
7. **Timers must not call `renderCurrentView()` every second.** It re-renders all five views and replaces focused controls. E-5 should update isolated timer nodes from one visibility-aware clock.
8. **Theme should stay device-local.** Syncing all localStorage indiscriminately would risk collecting unrelated credentials once an auth SDK is installed. Keep an explicit key allow-list.

## Verification and gates

Passed locally with Node 24.19.0, no package installation:

```bash
node scripts/check-legacy-contract.mjs
node --test tests/*.test.mjs
node scripts/build-interim-calendar.mjs
node scripts/freeze-baseline.mjs --check-local
```

Eight tests passed: strict import parsing, corrupt/unsafe/oversized input rejection, idempotent completion union, multi-browser union and unknown-key reporting, exporter read-only/allow-list behavior, UTC/Dhaka conversion, deterministic ICS/alarm structure, and UTF-8 folding/injection resistance. These are local tests, not database, cross-device or phone UAT.

| Gate | Status |
|---|---|
| E-1 storage centralizability | **GO** |
| E-0 exact source/commit baseline | Verified |
| E-0 remote annotated tag | Pending authenticated tag push |
| E-0 exports from every used browser/origin + two backup locations | Pending owner exports |
| E-0 interim phone alarms | File prepared; phone acceptance pending |
| E-2 / E-3 cloud persistence implementation | Not started; E-0 prerequisites outstanding |
| E-7 / Gate 2 preview acceptance | Not run |
| E-8 merge / production cutover | **NO-GO** until all release checks pass |

Next implementation component after E-0 closes: the Supabase `user_state` migration with explicit grants, strict single-owner RLS, revision trigger and isolation test, followed by Google sign-in and the persistence adapter. E-2b keep-alive remains in Express scope. Full normalization, React rewrite and Telegram remain deferred.
