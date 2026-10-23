# STATUS — Career Track V4

**Last updated:** 23 October 2026 · **Updated by:** Codex · **STATE: merged to main; CI passed; hosting blocked**

## NEXT ACTION

Obtain build-log access to the existing Vercel team `aj-81af` or the failed build error for deployment `dpl_4s9zbNmVQsnD8Nopi3q6DPcMk2gS`. Fix that concrete hosting error and redeploy. Do not reimplement or remerge V4: source is already on main.

## Done

| Step | Result | Evidence |
| --- | --- | --- |
| S0 audit | Actual baseline main `8eec65bfc83325b22e58b06d6a0402d90f2ca257` preserved in remote `pre-v4`; privacy commit `c5692a673bdae950bf1ebaf9bc88f1353c12dd0c`; current private defaults and personal captures removed | AUDIT addendum; privacy check |
| S1 foundation | Supplied tokens/components/router/ticker, five-route shell, theme, avatar, keyboard, parallel `/next/` | All 26 kit tests plus browser suite |
| S2 dashboard | Open-only hero, precise timer/day-only caveat, profile/KPIs/lanes/matches, persistent add/dismiss | V4 browser results and integration regressions |
| S3 scholarships | Existing scorer, country tiers/compromises/priorities, lists, universities/research, six-tab deep-link drawer | Browser country/drawer/keyboard/guide checks |
| S4 calendar | Month/agenda, zone, filters, keyboard, official/own milestone export | Unit/browser precision and ICS checks |
| S5 documents | Shared dossier statuses/version/expiry, referee matrix, test plan | Dossier/drawer/referee/browser checks |
| S6 settings | Private profile, appearance, sources, advanced planning, archive, typed backup-first reset/restore/purge | Full export → reset → restore equality |
| S7 collector installation | Supplied collector, tests, review-gated PR workflow and honest unverified lead UI | Radar tests; no-key run skips without changes |
| S9 release work | V4 default, classic fallback, lazy registry guides, PWA/demo, docs, budget, a11y/performance checks | RELEASE.md; bundle and browser reports |

## Verification

- `npm test`: **144 passed** (111 existing + 26 kit + 7 integration).
- `npm run check:keys`: **102 keys/labels unchanged**.
- `npm run check:data`: registry valid, **43 routes / 88 sources**.
- `npm run check:ui`: classic delegated bindings verified.
- `npm run check:ui:v4`: **10 raw literal-button findings** traced to shared delegation; zero unresolved. Raw strict scanner output is retained; it does not understand cross-file delegated handlers.
- `npm run check:privacy`: current applicant defaults/profile removed; original licence attribution intentionally retained.
- Classic browser suite: **20 passed**, fixed historical clock and `/classic/` route.
- V4 browser suite: see `ux/browser-results.json` for all actual scenarios and Axe results.
- Lighthouse desktop **100 / 100 / 100**, mobile **99 / 100 / 100** (Performance / Accessibility / Best Practices); LCP **0.38s / 1.81s**, CLS **0 / 0**.
- `npm run build`: passes; initial JS approximately **72 KB gzip**, below 150 KB.
- DESIGN.md lint: zero errors; runtime-owned token reference warnings are recorded by the tool.

## Deferred and limitations

- S7 live provider run/review is incomplete: no provider key, verified terms or live response was supplied. `RADAR_PROVIDER_REVIEWED=true` must be set only after owner review. The feed is empty; curated matching works.
- S8 cloud sync is deferred, consistent with the owner’s instruction to continue without Google Auth.
- The repository is public. This connector cannot change visibility. History was not rewritten and may retain earlier private defaults/captures; owner administration is required.
- `pre-v4` is a preservation branch, not a tag (no tag-creation tool). The existing licence remains unchanged.
- Country rubric judgements are Provisional/unknown until sourced; no immigration or award probability is invented.
- Classic advanced funding/admission/comparison/planning/context-recovery tools remain linked for one release.

## Files and deviations

See RELEASE.md for the exact kit-to-runtime mapping and integration corrections. The V3 store/domain/schema/views/workspace/intelligence CSS remain unchanged. Original uploaded ZIP is unchanged. Source is Git-backed; no private backup or applicant context is included in this release.


## Main publication — 23 October 2026

- PR [#8](https://github.com/iam-ajmunna/career-track/pull/8) merged successfully.
- Source commit: `0107d08f1f42c3a2ab385280e524996343c57245`; main merge: `3395ba4e123c48db1c67ed29e3900093061facff`.
- All **145 intentional paths** were compared by Git blob SHA with the checked local files: no mismatches.
- GitHub CI passed on both PR and main (main run `39929743291`), including tests, keys, data, classic/V4 UI binding checks, privacy and production build. GitGuardian reported no secrets.
- Vercel preview and production deployments failed. The [production build](https://vercel.com/aj-81af/career-track/4s9zbNmVQsnD8Nopi3q6DPcMk2gS) is not ready.
- The Vercel connector returned **403 forbidden** for deployment details and build logs because it lacks team access. Its advertised team-authorization action is not exposed in this connection. No token/secret was read or requested.
- Public production returned HTTP 200 with the prior V3 entry `/assets/app-BYZIMYAO.js`; the new UI is **not live yet**. The previous site remains active.

This is an unresolved hosting/access blocker, not a passing production verification. Grant the existing Vercel connection access to that team or provide the build error before continuing hosting work.
