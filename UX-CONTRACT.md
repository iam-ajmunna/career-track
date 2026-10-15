# Career Track interaction contract

Sources: `docs/ARCHITECTURE.md` Express addenda, `docs/FRESH-START.md` owner decision, database grants/RLS in `supabase/migrations/`. Visual ownership: `DESIGN.md` and `assets/styles.css`.

English UI; dates shown in provider zone and Asia/Dhaka. Personal, single-owner application; public signup is not a product feature.

## Canonical UI Map

| Capability | Canonical owner | Source of truth | Allowed variants | Verification |
|---|---|---|---|---|
| Form | Native checkbox / existing search | Fresh-start data contract | Checklist, local search | Store and browser tests |
| Date | `src/domain/time.ts`, `src/countdowns.js` | Verified deadline JSON | Hero, compact, provider/Dhaka | DST/boundary tests |
| Scrollbar | `assets/styles.css` | DESIGN.md | Existing responsive geometry | Static/browser review |
| Toast | `toast()` in `src/app.js` | This contract | Non-critical acknowledgements | Browser review |
| CRUD | `src/sync/store.js` | Database revision/RLS contract | Checklist / submission flag | SQL and store tests |
| Auth | `src/bootstrap.js` | Google OAuth + RLS | Initial sign-in / session recovery | Browser and provider UAT |

## Flow ledger

| Operation | Pending | Success | Failure/recovery |
|---|---|---|---|
| Open workspace | Sign-in/loading gate | Remote snapshot before editable state | Owner cache shown with offline label; unavailable state has Retry |
| Toggle checklist | Immediate tick + Saving | Saved only after server acknowledgement | Persistent Failed—Retry or offline pending count; retain local change |
| Reconnect / stale revision | Refresh server state | Union completed flags; preserve unrelated state | Report skipped stale unchecks; user may repeat after sync |
| Sign in | Disable duplicate sign-in | Return to prior view and same-owner draft | Persistent generic error; no private data for other accounts |
| Export | Download full account state and pending patch | Honest file export acknowledgement | Persistent failure message |
| Sign out | Save pending changes first | Clear account caches and hide data | Keep session/work visible with Retry or Export |
| Mark submitted | Optimistic status | Hero excludes application | Retain pending change and retry |

The old reset control is removed: a fresh start is an initialization decision, not a recurring destructive button. No legacy import UI is needed. Export remains available.

## Shared behavior

- Native app-owned `<dialog>` keeps focus, Escape and restoration; no browser alert/confirm/prompt.
- Save failures never auto-dismiss. Announcements use stable live regions; countdown seconds use aria-live=off.
- One clock updates timer nodes, not all five views. Recompute on focus/visibility; timer precision never depends on accumulated interval ticks.
- Checkbox updates preserve focus across render. Search remains immediate and in-memory as an explicit Express Track exception to URL routing; IME composition does not trigger shortcuts.
- All changed surfaces consume existing tokens. Native buttons retain hover, pressed, focus-visible and disabled states; narrow screens preserve every action.
- No authenticated UI appears before a successful owner read, except previously authorized owner cache while offline. Cache is device-local best effort, not authentication or durable server backup.


## Scholarship intelligence rules — 28 Sep 2026

- The Scholarships view defaults to **Apply + Watch**. The only decision filters are Apply + Watch, Apply, Watch and Closed.
- Social-media posts are discovery leads only. An opportunity enters the working portfolio only after an official source is verified.
- Rejected or misleading leads stay in one collapsed **Screened out** register with a short factual reason and official evidence where available.
- Scholarship cards remain compact. Career/immigration context is shown only inside the detail dialog.
- Career context uses three factual fields: **During MSc**, **After MSc**, and **Long-term route**. Do not produce PR probabilities, scores or guarantees.
- Exact countdowns require an official date, time and timezone. Date-only or unannounced calls must not receive invented times.
- New vNext checklist/document items use additive keys with `legacy: false`; the original 102 progress keys and meanings remain frozen.
- The Documents view includes **Europass CV for European applications** as a high-priority optional variant, without replacing the master academic/research CVs.
- Every tracked scholarship exposes **Open GPT ↗** from its scholarship card/detail view and active pipeline block. It generates one scholarship-specific research/application prompt, opens a new ChatGPT tab with the prompt deep-linked, and copies the same prompt to the clipboard as a fallback.
- The GPT prompt is limited to the selected scholarship, carries official-source/deadline/checklist context, instructs fresh official-source verification, and asks for a complete application playbook. It must not turn internal fit labels into admission probabilities.
- Do not embed the private Supabase profile object in the ChatGPT URL. The launcher uses a minimal non-identifying applicant direction plus the selected scholarship's current tracker state.


## v2 country workflow — 15 October 2026

The supplied `docs/upgrade/specs/01-product-and-ux.md` supersedes the earlier flat Apply + Watch landing layout: Scholarships opens country tiers. All 250 current countries/territories (ISO 249 + Kosovo) are retained, plus one explicitly named regional collection for the generic Europe directory. EDISS has one stable scholarship ID shared across its published mobility countries. Raw facts keep official sources and dates; unsourced judgments stay Provisional. No score is an admission or permanent-residence probability.

The original five shortcuts remain. Settings=6, Personalized Goal=7, Archive=8. Native selects own platform popup behavior; this product does not require authored option-popup geometry. Country-name search is local, immediate and transient, following the existing URL-state exception. Native dialog owns modal focus/Escape; delegated `data-*` actions are canonical in `src/app.js`.

`career-track:v2` is the new device workspace; account caches use `career-track:v2:<project>:<owner>:`. Original localStorage keys are read only by explicit Settings import. Device mode is labeled local-only; cloud Saved is displayed only after a CAS acknowledgment. Authenticated accounts without the pre-provisioned sole owner row receive an access gate. OAuth refresh must retain store subscriptions. Cache isolation does not substitute for RLS.

Pins, priorities, notes and tracking use the existing operation queue and server revision. Concurrent unpin or text replacement preserves the newer server value and reports a conflict; completed flags and newly added pins are unioned. Intentional online removals apply at a current revision. Settings reset requires RESET and downloads a backup before clearing v2 progress. Legacy keys are never reset. Date-only deadlines never get invented exact times or calendar alarms. Hero selection prefers pinned eligible deadlines. Views render only when active; one clock updates timer nodes.

| Capability | Canonical owner | Source of truth | Allowed variants | Verification |
|---|---|---|---|---|
| Select/Listbox | Native select in `app.js` / `countries-view.js` | This contract | Priority and tracking selects | `tests/browser-v2.mjs` |
| Form | Existing native controls and v2 notes/reset form | This contract | Checklist, notes, typed reset | Browser and state validation tests |
| Date | `src/domain/time.ts`, normalized source metadata | Sourced deadline JSON | Exact provider/Dhaka, unconfirmed date | DST/ICS tests |
| Scrollbar | Global CSS in `assets/styles.css` | DESIGN.md | Internal evidence table overflow | Desktop/mobile checks |
| Toast | `toast()` / persistent sync status | This contract | Acknowledgement, inline failure | Browser recovery fixture |
| CRUD | `src/sync/store.js`, `local-v2.js` | RLS/CAS migration | Guest device, owner cloud | Unit/database/browser tests |
