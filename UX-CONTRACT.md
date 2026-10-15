# Career Track interaction contract

Sources: owner instruction on 15 October 2026 to continue without Google Auth, recorded in `docs/upgrade/RELEASE.md`; the supplied v2 specs; `docs/ARCHITECTURE.md` Express addenda and `docs/FRESH-START.md` for retained domain behavior. Database grants/RLS remain in `supabase/migrations/` for deferred backend work. Visual ownership: `DESIGN.md` and `assets/styles.css`.

English UI; dates shown in provider zone and Asia/Dhaka. Personal application opening directly in the current browser without authentication. Public signup and automatic cross-device sync are not product features in this release.

## Canonical UI Map

| Capability | Canonical owner | Source of truth | Allowed variants | Verification |
|---|---|---|---|---|
| Form | Native checkbox / existing search | Fresh-start data contract | Checklist, local search | Store and browser tests |
| Date | `src/domain/time.ts`, `src/countdowns.js` | Verified deadline JSON | Hero, compact, provider/Dhaka | DST/boundary tests |
| Scrollbar | `assets/styles.css` | DESIGN.md | Existing responsive geometry | Static/browser review |
| Toast | `toast()` in `src/app.js` | This contract | Non-critical acknowledgements | Browser review |
| CRUD | `src/sync/local-v2.js` | Validated device state | Checklist / submission flag | Local-store and browser tests |
| Workspace | `src/bootstrap.js` | No-account owner decision | Loading / recovery gate | No-auth browser checks |

## Flow ledger

| Operation | Pending | Success | Failure/recovery |
|---|---|---|---|
| Open workspace | Local loading gate | Editable device state, no sign-in request | Unavailable bundle has Retry; blocked storage permits exportable work |
| Toggle checklist | Immediate tick and synchronous local write | Saved on this device after successful write | Persistent Not saved—Retry; retain the edit in memory for export |
| Another browser tab | Read saved local state | Reflect changes in the current view | Never discard an unsaved draft; require export/reload after conflict |
| Export | Download the complete v2 device state | Standard browser download | Persistent failure message; leave data intact |
| Import backup | Validate and preview without a write | Explicit commit adds work; current text/priorities/profile are kept | Inline error, original state unchanged, choose another file |
| Mark submitted | Immediate local status | Hero excludes application | Retain the edit and expose save failure/Retry |

Settings owns explicit legacy-browser import, previewed JSON backup import and typed RESET with a backup first. Neither import nor reset writes the original legacy keys.

## Shared behavior

- Native app-owned `<dialog>` keeps focus, Escape and restoration; no browser alert/confirm/prompt.
- Save failures never auto-dismiss. Announcements use stable live regions; countdown seconds use aria-live=off.
- One clock updates timer nodes, not all five views. Recompute on focus/visibility; timer precision never depends on accumulated interval ticks.
- Checkbox updates preserve focus across render. Search remains immediate and in-memory as an explicit Express Track exception to URL routing; IME composition does not trigger shortcuts.
- All changed surfaces consume existing tokens. Native buttons retain hover, pressed, focus-visible and disabled states; narrow screens preserve every action.
- There is no login/session gate. Local data is available to the current browser profile; it is not an authentication mechanism or durable server backup. Private notes and exports remain the owner's responsibility.


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

`career-track:v2` is the active device workspace. Original localStorage keys are read only by explicit Settings import. The status says **Saved on this device** or **Not saved — Retry**. Existing account caches and OAuth sessions are never opened or automatically imported. The browser bundle does not initialize Supabase; Google configuration and owner provisioning are not release gates. Retained RLS/CAS modules and their isolated tests apply only to deferred backend work.

Pins, priorities, notes and tracking use validated local writes. Failed writes remain exportable and can be retried. A storage event never replaces a failed in-memory draft; unreadable bytes block further edits and remain recoverable in export. JSON file import is explicit, bounded to 1 MB and validates the full state before mutation; existing text/priorities/profile win, completed work is unioned, and purged entries are not resurrected. Settings reset requires RESET and downloads a backup before clearing v2 progress. Legacy keys are never reset. Date-only deadlines never get invented exact times or calendar alarms. Hero selection prefers pinned eligible deadlines. Views render only when active; one clock updates timer nodes.

| Capability | Canonical owner | Source of truth | Allowed variants | Verification |
|---|---|---|---|---|
| Select/Listbox | Native select in `app.js` / `countries-view.js` | This contract | Priority and tracking selects | `tests/browser-v2.mjs` |
| Form | Existing native controls and v2 notes/reset form | This contract | Checklist, notes, typed reset | Browser and state validation tests |
| Date | `src/domain/time.ts`, normalized source metadata | Sourced deadline JSON | Exact provider/Dhaka, unconfirmed date | DST/ICS tests |
| Scrollbar | Global CSS in `assets/styles.css` | DESIGN.md | Internal evidence table overflow | Desktop/mobile checks |
| Toast | `toast()` / persistent sync status | This contract | Acknowledgement, inline failure | Browser recovery fixture |
| CRUD | `src/sync/local-v2.js` | Device release decision and state validation | Device workspace only | Unit and browser tests |
| Backup file | `src/sync/backup.js`, Settings delegated handlers | `docs/upgrade/RELEASE.md` | Validate / preview / explicit commit / cancel | Backup tests and clean-browser restore |
