# V3 architecture and data-quality audit

Baseline: production main `7f10f68e0dd8e69577f586d5a4257636827aa09d`, inspected 16 October 2026. The attached implementation brief authorizes a validated production release and supersedes the earlier owner-only merge handoff. Keep the no-login, local-first workflow.

## Reproduced status defects

At the audit instant, the 21-record source catalog contains seven raw open records. The existing date evaluator classifies six as open and one as urgent. This is evidence of catalog coverage, not independent confirmation that all seven routes remain actionable.

- `renderOverview` counts `best.length` after `.slice(0,5)`, so its Actionable targets metric is capped and is not a global open count.
- `renderPipeline` combines provider window, eligibility, Apply decision and research-completion filters. An open Watch route disappears; a completed or deadline-closed application disappears even if its submission history should remain available.
- `effectiveStatus` treats Watch/Blocked as window states. Upcoming routes can enter the actionable list before their window opens. There is no unified status definition shared by the old and normalized catalogues.
- A count based only on literal open excludes urgent records. No independent Open now metric currently exists on production. The user's exact prior zero-count browser state is unavailable; no private user-state reproduction is claimed.
- Deadlines are mostly one per scholarship. A provider's main deadline does not model an earlier mandatory nomination. The missed national route must not be recommended as actionable merely because its provider portal is open.

## Retain

Vanilla modules, esbuild, existing visual tokens, eight established shortcuts, all 102 frozen legacy keys, country coverage, existing scholarship IDs, document/goal tools, escaped notes, backup export and no-login startup. Keep the existing RLS/backend code dormant; introduce no cloud auth or paid resource.

## Incremental design

Add a normalized, validated public intelligence registry under `data/v3/` and pure domain logic under `src/v3/`. Independent provider-window, eligibility, funding, personal-decision and application-stage dimensions feed every new view. Add intake-aware private application records in a versioned device store. University admissions and linked scholarship consideration remain separate.

V2 keys are never written by V3. Migration requires a downloadable backup and explicit confirmation, keeps the original raw bytes, and preserves unknown legacy records. No automatic expiry or trash purge may remove application history. Real private notes/progress are available only in the user's browser; repository inspection cannot reveal them.

Public research and private user state remain separate. The uploaded applicant's name, referee correspondence and declared application decisions will not be added to the public research dataset. Known personal updates will be supplied as a private import rather than hardcoded into everyone's frontend.

Research uses current official sources first, with field provenance and explicit unconfirmed facts. Student reports are separate evidence with dates, scope and limitations. A scheduled source-change report may flag review candidates; it cannot certify that a changed page's claims are true.
