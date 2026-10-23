# STATUS — Career Track V4

**Updated:** 23 October 2026 · **State:** V4 is live; functionality and source audit completed.

## Current evidence

- 149 unit/integration tests pass.
- 25 V4 browser scenarios and 20 retained Classic scenarios pass.
- Every route renders all six drawer tabs: 47 routes / 103 source records / 22 programmes.
- Five views pass 1440/1024/768/390/320 px in light/dark; Axe finds zero serious/critical issues on all five views in both themes.
- All 102 legacy keys and labels are preserved. Existing checklist IDs and document record meanings are retained.
- Data, privacy, delegated UI-binding and production-build checks pass. The raw strict scanner findings are resolved through shared controller bindings and browser evidence.
- Current bundle evidence is in `bundle-budget.json`; guides remain lazy and initial JavaScript remains below 150 KiB gzip.

See [the complete functionality/data audit](FUNCTIONAL-AUDIT-2026-10-23.md), `ux/browser-results.json` and `source-review-2026-10-23.json`.

## Current behavior

The five V4 screens run at `/` and `/next/`, with advanced admission, funding comparison, historical planning and recovery tools retained under `/classic/`. No authentication is required. Both interfaces use the same validated V3 local store; the V4 preference namespace is additive.

V4 now exposes individual/bulk research tracking, tracking filters, priority pinning, scholarship-specific GPT launch/copy and private package export. The audit repaired unrelated-form draft loss, guide retry/loading, async recovery locks and ticker cadence. Official opening hours now flow through status evaluation and calendar export. The V3 store itself remains unchanged; additive registry timing and shared prompt behavior were updated and tested in both interfaces.

## Data status

75 source records reviewed: 69 public-page reviews and six labelled official indexed-content reviews. Erasmus programme rounds, Canadian deadlines/funding conditions, the separate Commonwealth Shared round and the Australian shortlist have been refreshed.

Twelve routes still require current-cycle/provider confirmation. Future month-only dates, Eiffel's conflicting cutoff, DEAI's portal maintenance and unavailable provider pages remain explicit. Country ratings stay Provisional where the required evidence is missing. A review date is not a blanket verification claim.

## Production and provenance

- Original ZIP is unchanged. Its modules/instructions and the initial implementation decisions remain documented in RELEASE.md and the audit files.
- Remote `pre-v4` preserves the actual pre-upgrade main `8eec65bfc83325b22e58b06d6a0402d90f2ca257`.
- Original V4 PR #8 merged; CI passed. The initially failing Vercel deployment was superseded by a successful production deployment from `376688e6637a84e1f8a8fabb25e7021ce8b3527a`.
- The Git-connected release process deploys audit fixes from main. The release closeout verifies the public default shell, hashed assets, guides, Classic and live navigation after merge. GitHub checks carry the exact new commit/deployment reference.

## Deferred and boundaries

- External radar collection remains off pending provider configuration/review. The source-fingerprint workflow is installed for review reports, not automatic fact verification.
- Cloud sync remains off under the instruction to continue without Google Auth. Export/import is the verified transfer path.
- Country judgements do not imply immigration or scholarship probabilities.
- Current-tree private defaults/captures were removed previously. Repository visibility and historic private content require owner administration; history was not rewritten.
- `pre-v4` is a preservation branch, not a tag. Original licence attribution is retained.
