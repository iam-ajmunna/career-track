# A0 audit — 15 October 2026

Baseline: upstream main `5f1362c010dfe3106c9ad8150295815d9ea49794`. `personal-dynamic` is an ancestor 30 commits behind main; fast-forward it before publication. Direct Git cloning is unauthenticated in this environment; the authenticated GitHub connector supplied the 70 text files. Local `pre-upgrade` records that snapshot; the upstream SHA is authoritative.

- Stack: vanilla ES modules, esbuild 0.28.2, Node 24.19.0 (project minimum 22.18), no framework. `scripts/build.mjs` bundles bootstrap/theme; Vercel Hobby serves `dist` with a daily protected keepalive.
- UI: `src/app.js` renders seven tabs. Buttons / keys 1–7 switch in-memory state. `index.html` owns the rail, topbar, search, dialogs and sync status. `src/theme.js` reads `scholarship-theme` and CSS consumes `data-theme`.
- Storage: active bootstrap reads/writes `career-track:local-state:v1` (schema_version 1; progress, applications, tracking, profile, lifecycle, history). The older `scholarship-progress` key is already unused. Existing cloud cache would use `career-track:v1:<project>:<owner>:snapshot` and `:op:<uuid>` but is currently inactive. v2 must not write any of these existing keys; its new namespace is `career-track:v2`.
- Data: `src/data.js` exports 21 scholarships plus documents, referee/IELTS/timeline and career context. Twelve extended programmes live in `personalized-goal-data.js`. Existing fields include id/name/country/provider/funding/source/actions/deadline/status. Countries: UK, US, Saudi Arabia, UAE, Japan, Hungary, Türkiye, South Korea, Germany, Switzerland, Ireland, France, Sweden, and Europe. The two Europe entries need an honest multi-country representation, not an invented host country.
- Details: `openScholarship(id)` renders a modal containing source/career/research tracking and a read-only action list. Editable actions live in Pipeline. New inline details will share real editable progress keys and retain submission, tracking and GPT controls; notes are new additive state.
- Tokens: `assets/styles.css`: --surface/--surface-2/--text/--muted/--line/--accent/--radius; --ct-border maps to --line. Existing 760/520px breakpoints. Preserve light/dark neutrals, Inter/monospace, semantic colors, native dialog and checkbox owners.
- Baseline automated gate: 49 tests passed; production build and all 102 frozen progress-key meanings passed. Kit baseline: 17 tests passed.
- Browser baseline: local Playwright package exists but its browser download is blocked/truncated. Captures will be retried with available runtime browser; absent captures remain explicitly unverified.
- Cloud: project `yqqcfonzkkrboghhfbdx` was INACTIVE; restore requested successfully on 15 October. Current auth/provider/provisioning configuration must be re-read. Never replace its existing owner-only table with the kit's weaker insert policy.

## C1 findings and decisions

Overview has four counters, duplicate research cards, long snapshot copy and two secondary sections; reduce to next deadline + pins + five next actions + three summary tiles. Global search currently rerenders all hidden screens and switches tab; countries will get local country-name search and stable focus. Existing destructive controls use window.confirm; replace with app-owned dialog. Existing Settings shortcut 6 conflicts with an existing Personalized Goal shortcut: assign Settings=6, retain Goal=7 and Archive=8 (documented expansion). Existing local-only strings must reflect actual persistence.

Date-only conflicts in supplied specs: normalization suggests invented 23:59:59, while deadline rules prohibit unsourced exact times. Preserve current source-backed exact instants and label date-only values 'Closing time unconfirmed'; never generate alarms for date-only values.

## A2 correction discovered by browser QA

The supplied CLDR generator produced 265 entries, including 15 obsolete aliases that duplicated current names. Its last-write-wins name lookup mapped United Kingdom to UK and France to FX, so canonical deep links GB/FR omitted those scholarships. The production list now excludes those aliases: 249 ISO country/territory codes plus Kosovo XK, and one explicitly labeled EU regional collection (251 distinct entries total). The immutable kit remains unchanged as the regression reference. Generator, normalizer, unique-name assertions and canonical-country regressions were corrected together. This is an evidence-backed correction to the approximate count in the spec, not a reduction in current country coverage.

Mobile visual QA removed the kit's 700px intrinsic tier placeholders, which created excessive blank space for offscreen small groups. Active-view-only rendering already bounds this small catalogue's DOM work. Header/save state/error messages now share one sticky wrapper to avoid overlapping sticky offsets. Bottom navigation retains all eight existing/new destinations through horizontal scrolling.
