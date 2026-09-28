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
