# agent.md — Operating instructions for the implementation agent (Career Track v4)

Read this file completely at the start of **every** session. Then read `AUDIT.md` (code audit, supersedes assumptions elsewhere) and `STATUS.md`, then the section(s) of `implementation.md` and `coding.md` for the current step.

## 1. Mission
Transform Career Track from a dense, 13-item, text-heavy workspace into a calm, professional, shareable product with **five** screens: **Dashboard, Scholarships, Calendar, Documents, Settings**, plus a **profile avatar menu**. Preserve the V3 data rigour, the local-first storage and every legacy-key guarantee. Specifications: `implementation.md` (what/why) and `coding.md` (exact markup, tokens, functions).

## 2. Hard rules — never break these
1. **Never push to `main`.** Work on `v4-redesign` (create from `main` after tagging `pre-v4`). Open a PR; the owner merges.
2. **Do not read, print, commit or request secrets.** The only key that may appear in client code is the Supabase *publishable* key. API keys live in GitHub Secrets / Vercel env.
3. **Privacy first.** No personal data (name, university, CGPA, referee names, scores) in code, tests, fixtures, docs, screenshots or commits. Use the fictional profile "Alex Morgan" in `data/demo/*`. Run the privacy scan (§7) before every push.
4. **Never invent facts.** No fabricated deadlines, funding, immigration rules, ratings or sources. Unknown = `unknown` / "Not confirmed". Ratings without `sourceIds` + `checkedAt` render the **Provisional** chip.
5. **Legacy contract:** do not rename/delete existing localStorage keys or change their shapes. State additions are additive and versioned with a migration test. `npm run check:keys` must stay green.
6. **Escape everything.** All markup is produced with the `html` tagged template from `src/ui/html.js`. No `innerHTML` with unescaped data. `href` values from data go through `safeHref`.
7. **Strict CSP is respected:** no inline `<script>`, no `eval`, no external connections from the browser (`connect-src 'self'`) until P8 explicitly changes it.
8. **Do not edit** `src/v3/views.js`, `src/v3/workspace.js`, `src/styles/intelligence.css` during the strangler phase (`check:ui` and the browser tests are coupled to them).
9. **No new runtime dependencies.** Existing: `@supabase/supabase-js`. Dev: `esbuild`, `@electric-sql/pglite`.
10. **Accessibility is a requirement, not polish** (WCAG 2.2 AA; see `coding.md` §13).
11. **Do not expand scope.** No AI features, scraping beyond the specified collector, file uploads, drag-and-drop, or redesign of the data model.
12. **Small commits**; message format `S<step>: <what>` (e.g. `S3.2: country tiers`).

## 3. Session protocol
1. `git fetch --all && git checkout v4-redesign && git pull`.
2. Read `docs/v4/STATUS.md` → find **NEXT ACTION**. Do exactly that.
3. Implement in the smallest coherent unit; run the checks in §7.
4. Update `STATUS.md` (§9) and commit it together with the code.
5. Stop only at a clean state (tests green, STATUS updated). If you must stop mid-step, write exactly where and why.

## 4. Verification commands (existing in the repo)
Agents with GitHub tools: open a draft PR into `main`; CI runs `npm test`, `check:keys`, `check:data`, `build` — read the result with the PR status API. Agents with a local checkout run everything below.
```bash
npm test                 # node:test suites (the repo reports ~111 tests)
npm run check:keys       # legacy storage contract
npm run check:data       # registry integrity
npm run check:ui         # UI binding check (update its expectations when views move; log every change in STATUS)
npm run test:browser     # browser scenarios (the repo reports 19)
node --test tests/v4.test.mjs tests/radar.test.mjs   # new modules (from the kit)
npm run build            # must succeed; check bundle sizes against budgets
```

## 5. Steps
Mark each step **Done** in `STATUS.md` only when its acceptance passes.

### S0 — Audit & safety (P0) — **audit DONE** (`AUDIT.md`); spot-check it, then do S0.1/S0.2 below
- S0.1 Tag `pre-v4` on `main` and push the tag. Create `v4-redesign`.
- S0.2 **Privacy:** list personal data in the tree (start with `supabase/owner-profile.json`, `src/data.js`, `src/personalized-goal-data.js`, docs). Move personal values out of git into the owner's private storage; replace with `data/demo/*` fixtures. Record findings in `docs/v4/AUDIT.md` **without quoting personal values**. History purge is the **owner's** decision (see implementation.md §11); do not force-push.
- S0.3 Write `docs/v4/AUDIT.md`: confirm or correct each **VERIFY (S0)** item in implementation.md — view names in `workspace.js` (for the `LEGACY` redirect map), whether `src/views/*` + `src/lib/scoring.js` (country tiers) are still wired, `store.js` state shape and where to add new keys, `calendar.js` capabilities, how `scripts/build.mjs` ships `opportunities.json`, what `check-ui-bindings` asserts, CSS classes used by existing browser tests.
- S0.4 Baseline: screenshots of every current view (desktop 1440 + mobile 390, light/dark) into `docs/v4/baseline/` using demo data only.
**Accept:** `AUDIT.md` complete; no personal data in tree; all existing checks green.

### S1 — Foundation (P1)
- S1.1 Copy kit files (`coding.md` §2 table) into the repo paths. Add `src/styles/tokens.css` + `app.css` to the build as `assets/app.css`.
- S1.2 Parallel entry `/next/`: `next/index.html` (coding.md §5), `src/v4/bootstrap.js`, `src/v4/workspace.js`, and the `scripts/build.mjs` edits in coding.md §17. Copy the required-id markup semantics from the current `/index.html`. The classic UI at `/` stays untouched.
- S1.3 Icon sprite (`src/ui/icons.js`), theme toggle using the **existing** `scholarship-theme` key (light/dark), toasts, sync bar bound to the existing sync ids.
- S1.4 Router + keyboard map + legacy redirects + focus management (on route change focus `#pageTitle`).
- S1.5 Avatar menu (profile initials from the store; "?" when empty; Demo mode shows "AM").
**Accept:** all 5 routes render placeholders; keyboard keys 1–5 work; tests in `tests/v4.test.mjs` green; axe finds 0 serious/critical issues on the shell.

### S2 — Dashboard (P2)
- S2.1 Wire `src/v4/adapter.js` (already tested) to the real `opportunityFacts`/`readiness`/registry; add the intake select (2027/2028).
- S2.2 Hero (countdown with ticker, provider + Dhaka time, readiness, actions, empty state).
- S2.3 Profile card, KPI tiles (links), My applications lanes, Closing-soon list.
- S2.4 Matches feed (verified matches from registry first; leads later in S7). "+ Add to my list" sets decision `apply` through the **existing** store action; "Not interested" appends to `dismissedMatches`.
**Accept (Dashboard):** D-1 hero shows the nearest in-my-list, still-open deadline and updates every second; D-2 date-only deadline shows days + "Time not confirmed" (never a fake hour); D-3 empty list shows the invitation; D-4 adding a match moves it to My applications immediately and survives reload; D-5 no horizontal scroll at 390 px; D-6 first screen at 1440×900 shows hero, profile and KPIs without scrolling.

### S3 — Scholarships (P3)
- S3.1 Tiers + sub-groups + sacrifice sentence (reuse tested `buildCountryView` logic; wire to V3 registry facts; extend `countries.json` with `fit`).
- S3.2 Country page with sub-tabs (Open now / Opening soon / Future & watch / Closed) and `oppcard`s.
- S3.3 Detail drawer with 6 tabs (focus trap, Esc, `?focus=`), lazy guide loading.
- S3.4 Tabs "My list", "All open", "Universities" (absorbs University Explorer + Research & Supervisors).
- S3.5 My priorities popover.
**Accept:** S-1 first screen shows countries, not scholarships; S-2 every sub-group header names its compromised requirements; S-3 every card has the "You sacrifice" sentence; S-4 clicking a country lists open + future scholarships; S-5 `#/scholarships/country/GB?focus=<id>` opens the drawer on that item after reload; S-6 legacy routes redirect; S-7 drawer closes with Esc and returns focus to the opener.

### S4 — Calendar (P4)
- Month grid (`monthMatrix`), agenda, filters, today, keyboard navigation, event→drawer, `.ics` export.
**Accept:** C-1 October 2026 matrix correct (Mon start); C-2 an exact deadline appears on the viewer-zone day; C-3 date-only events keep the published date; C-4 mobile shows agenda only; C-5 grid keyboard-operable (arrow keys, Enter opens event).

### S5 — Documents (P5)
- Dossier list + stepper + readiness ring; References; Tests; per-scholarship checklist in drawer.
**Accept:** DOC-1 one status change updates ring, row and every scholarship checklist; DOC-2 expired document is flagged; DOC-3 tables have headers and scroll inside their own container on mobile.

### S6 — Settings & profile (P6)
- Profile editor (feeds Dashboard profile card + match scoring), appearance, backup/export/import round-trip, sources & coverage, planning board (legacy), archive/trash, danger zone.
**Accept:** SET-1 export → clear data → import restores everything; SET-2 danger actions require typing the word and export first; SET-3 profile changes update matches immediately.

### S7 — Radar (P7)
- Install `scripts/radar/refresh.mjs` + workflow. **Run once locally with a real key supplied by the owner (never commit it)**, inspect one raw hit, then adjust `mapHit`. Add `data/v3/radar.json`, leads UI ("Unverified lead", "Verify on the official site" first task).
**Accept:** R-1 collector tests green; R-2 leads never show a countdown until a deadline is confirmed; R-3 workflow opens a PR and never pushes to `main`; R-4 owner reviews one real run.

### S8 — Optional sync (P8) — only after the owner says yes
- Reactivate existing Supabase adapter behind a Settings switch; CSP change shipped with it; RLS isolation tests; union-merge; failure UX (Saved / Saving / Failed—Retry / Offline).
**Accept:** X-1 second device shows the same progress after sign-in; X-2 other account/anon sees nothing; X-3 blocking the network shows Failed—Retry and loses nothing; X-4 turning sync off returns to local-only without data loss.

### S9 — Polish & release (P9)
- Registry split + lazy guides, bundle budgets, Lighthouse, PWA manifest/icons, Demo mode, README + screenshots, flip default UI to v4, keep `?ui=3` for one release, then remove v3 views.
**Accept:** see §8.

## 6. Definition of done for any UI step
- [ ] Markup follows `coding.md` (tags, classes, attributes, ARIA).
- [ ] Works at 1440, 1024, 768, 390 px; light and dark; keyboard only; `prefers-reduced-motion`.
- [ ] Loading, empty and error states implemented with the copy in `coding.md` §14.
- [ ] No console errors/warnings; no layout shift on the hero.
- [ ] Unit/browser tests added or updated and green; `check:keys` green.

## 7. Pre-push checks
```bash
npm test && npm run check:keys && npm run check:data && npm run build
# privacy scan: must print nothing
git grep -n -i -E "cgpa|owner-profile|<owner real name>|<owner email>" -- . ':!docs/v4/AUDIT.md' || true
# secrets scan: must print nothing
git grep -n -E "sb_secret_|SUPABASE_SECRET_KEY=.+|SCHOLARSHIP_API_KEY=.+|BEGIN (RSA )?PRIVATE KEY" || true
```
(Replace the `<owner …>` placeholders locally; never commit the real values.)

## 8. Release checklist (S9)
- Lighthouse (mobile + desktop): Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 95.
- Initial JS ≤ 150 KB gzip; LCP ≤ 2.0 s (throttled 4G); CLS 0; no request to any third-party origin.
- Axe: 0 serious/critical on all 5 views.
- Demo mode works on a clean browser profile; screenshots in README are Demo-mode only.
- Legacy URLs redirect; export/import round-trip passes; `?ui=3` fallback works.
- `SECURITY.md`, `LICENSE` (owner decision), `CHANGELOG.md`, accessibility statement present.

## 9. STATUS.md protocol
After every completed step and before stopping for any reason, update `docs/v4/STATUS.md`:
1. Set **STATE**, **Last updated**, **Updated by**.
2. Move the step to **Done** with commit hash and the exact commands + pass counts you ran.
3. Rewrite **NEXT ACTION** as one unambiguous instruction (file, function, command).
4. List files changed, deviations (with reason), open questions for the owner, and blockers.
A step is not Done unless its acceptance items pass.

## 10. When to ask the owner (write it under "Questions for owner" in STATUS.md)
- Anything that touches `main`, git history, secrets, or the legacy storage keys.
- A country rating or funding judgement the rubric cannot decide.
- Provider terms/keys for the radar collector; enabling sync.
- A conflict between this file, `implementation.md` and `coding.md` (list the conflict; follow `coding.md` for markup/values and `implementation.md` for behaviour until answered).
