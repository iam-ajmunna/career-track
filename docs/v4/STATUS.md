# STATUS — Career Track V4

**Last updated:** 23 October 2026 · **Updated by:** Codex · **STATE: release candidate; local verification complete, publishing to main**

## NEXT ACTION

Publish the reviewed V4 tree on `v4-redesign`, wait for GitHub CI and Vercel checks, merge to `main`, then verify production assets at https://muncareer.vercel.app. The user explicitly authorized this publication.

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
