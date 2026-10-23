# Career Track interaction contract

Sources: owner instruction on 15 October 2026 to continue without Google Auth, recorded in `docs/upgrade/RELEASE.md`; the supplied v2 specs; `docs/ARCHITECTURE.md` Express addenda and `docs/FRESH-START.md` for retained domain behavior. Database grants/RLS remain in `supabase/migrations/` for deferred backend work. Visual ownership: `DESIGN.md` and `assets/styles.css`.

English UI; dates shown in provider zone and Asia/Dhaka. Personal application opening directly in the current browser without authentication. Public signup and automatic cross-device sync are not product features in this release.

## Canonical UI Map

| Capability | Canonical owner | Source of truth | Allowed variants | Verification |
| --- | --- | --- | --- | --- |
| Select/Listbox | Native select from `src/v3/views.js` | V3 brief and this contract | Filters, stages and private budgets; OS-owned popup | `tests/browser-v3.mjs` |
| Date | Native date input plus `src/v3/domain.js` | Official precision in `data/v3/deadlines.json` | Date-only markers, exact provider/Dhaka instants, unknown dates | V3 domain/calendar tests |
| Form | `workspace.js` submit/change delegation | `src/v3/store.js` validated state | Inline text errors; no native validation bubbles | Browser failure fixtures |
| Scrollbar | Global baseline in `assets/styles.css` | DESIGN.md runtime mapping | Table horizontal overflow only | Mobile/light/dark matrix |
| Toast | Shared `notice()` and persistent sync message | Device-save outcome | Noncritical acknowledgement; persistent failure | Browser storage fixtures |
| CRUD | `src/v3/store.js` | Versioned device state; private data separate from static research | Migration, stages, notes, archive/restore, backup-gated purge | V3 store and browser suites |
| Table Selection | Explicit compare checkboxes / preserved goal selection | Local selection set, maximum four funding routes | Page-local comparison; explicit bulk research tracking | Browser comparison and goal workflows |

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

## V3 contract — 16 October 2026 (supersedes active v2 surfaces)

Authority: the attached Career Track V3 implementation brief, sections 6, 10–14 and 18–24. It explicitly authorizes release to main after validation, retains a login-free local workspace, separates independent statuses and forbids automatic history loss. Earlier v2 descriptions above remain historical documentation.

| Capability | Canonical owner | Source of truth | Allowed variants | Verification |
| --- | --- | --- | --- | --- |
| Select/Listbox | Native select from `src/v3/views.js` | V3 brief and this contract | Filters, stages and private budgets; OS-owned popup | `tests/browser-v3.mjs` |
| Date | Native date input plus `src/v3/domain.js` | Official precision in `data/v3/deadlines.json` | Date-only markers, exact provider/Dhaka instants, unknown dates | V3 domain/calendar tests |
| Form | `workspace.js` submit/change delegation | `src/v3/store.js` validated state | Inline text errors; no native validation bubbles | Browser failure fixtures |
| Scrollbar | Global baseline in `assets/styles.css` | DESIGN.md runtime mapping | Table horizontal overflow only | Mobile/light/dark matrix |
| Toast | Shared `notice()` and persistent sync message | Device-save outcome | Noncritical acknowledgement; persistent failure | Browser storage fixtures |
| CRUD | `src/v3/store.js` | Versioned device state; private data separate from static research | Migration, stages, notes, archive/restore, backup-gated purge | V3 store and browser suites |
| Table Selection | Explicit compare checkboxes / preserved goal selection | Local selection set, maximum four funding routes | Page-local comparison; explicit bulk research tracking | Browser comparison and goal workflows |

V3 preserves `career-track:v2` bytes and all 102 original keys and labels. A separate `career-track:v3` copy stores versioned applications, admissions, budgets, references and documents. No cloud cache is opened. A partial valid v2 state is completed safely; malformed bytes block edits and remain exportable. Backup imports validate and preview before writes. Existing text/conflicting records win in ordinary merge; a private context file explicitly previews updates and downloads the current state first.

The explorer and country routes own URL-restored filter/search/page state. The eight numeric shortcuts retain their historical mapping. The original Personalized Goal board remains a labeled historical planning surface with retained keys; current official V3 guides take precedence. Native dialog owns confirmation focus, Escape and restoration. In-app note drafts persist across views and are included before complete exports; failed saves remain in memory and exportable. Only the active view is rendered. One interval updates visible timer nodes; no continuous browser scraping or closed-tab notification is implied.

Source checking is a scheduled GitHub Actions job. Fingerprint changes require human review; no automatic claim verification, private-group extraction, personal email, live exchange-rate feed, external application submission or account sync is represented as implemented. Reports are imported explicitly from the owner's private repository.


## V4 contract — 23 October 2026 (current default)

Authority: `docs/v4/agent.md`, `coding.md` and `implementation.md`, plus the owner’s explicit instruction to push this ZIP upgrade to the main repository. Earlier V2/V3 entries describe the isolated classic interface. V4 runs at `/` and `/next/`; `/classic/` and `?ui=3` retain advanced V3 tools for one release.

| Capability | Canonical owner | Source of truth | Allowed variants | Verification |
| --- | --- | --- | --- | --- |
| Select/Listbox | Native select from `src/ui/fields.js` | ZIP coding §7 | Platform-owned popup for intake, filters, stages and status | V4 browser keyboard and popup checks |
| Date | Native date fields and `src/features/calendar/grid.js` | Registry precision; ZIP coding §9 | Published-date markers, exact viewer-zone events, personal test dates | Unit and V4 browser calendar checks |
| Form | `src/v4/workspace.js` delegated handlers; `src/v4/state.js` validation | Unchanged V3 state contract with additive V4 namespace | Inline errors, associated fields, retained form drafts | V4 profile/referee/failure tests |
| Scrollbar | Global baseline in `src/styles/app.css` | DESIGN.md and supplied tokens | Internal table and drawer overflow | Width/theme and computed-style checks |
| Toast | `src/app/toast.js`, persistent sync message | Device-save result | Undo dismissal; persistent storage error | V4 browser save/failure checks |
| CRUD | Unchanged `src/v3/store.js` | Validated local state and lifecycle | V4 adapters and classic advanced tools | Unit and both browser suites |
| Table Selection | V4 scholarship selection set; classic comparison and planning tools | Existing tracking states and V3 maximum-four comparison contract | Cross-page V4 research selection; classic funding comparison | Both browser suites |

Five numeric shortcuts route to Dashboard, Scholarships, Calendar, Documents and Settings. Search commits on Enter, retains its query in the hash, ignores composition and offers an immediate clear action. Tabs use roving focus with arrow/Home/End navigation. The shared detail drawer uses six tabs, inert background, focus trapping and restoration, with route-based `focus` and `tab` parameters. Guide requests are keyed and stale responses never replace another opportunity.

The V3 schema and storage key remain unchanged. Version 1 V4 additions live at `v3.preferences.workspaceV4`; `readV4` supplies additive defaults without writing on load, validates imported additions, and exposes a temporary `state.v4` adapter alias. Display name/programme are optional profile fields. The V3 store API performs every persistent mutation. The original V2 key and all 102 progress keys/labels are preserved. No legacy auto-import, cloud sign-in or third-party browser connection is introduced.

V4 data restore is an explicit replacement after preview, typed RESTORE and a download of the current state. Classic retains additive merge and private-context/recovery imports. Reset requires RESET and exports first. Purge requires PURGE and exports first; Trash/Archive can be restored without losing work. Failed writes stay in memory, remain exportable and retry through the store. Note drafts survive view changes and are flushed before full export. Form drafts remain in memory across V4 routes and trigger an unload warning.

Country rubric ratings remain unknown/Provisional unless sources and check dates support the judgement. Curated funding classification feeds the existing five-requirement scorer. Radar remains static, unverified and without countdowns; its workflow requires explicit provider review/configuration. Sync stays off per the owner’s prior direction.

The 23 October functionality audit restores research/completion tracking directly in V4, including a URL-restored tracking filter and explicit cross-page bulk selection. Research completion never changes a funding application stage. Pinning, scholarship-specific GPT launch/copy and private application-package export are also available in V4. GPT URLs contain the selected scholarship’s public facts, intake and checklist status; names, contacts, profile fields and private notes are excluded. A denied clipboard opens a copyable app-owned dialog. Application packages include private notes only in the downloaded file.

Every guide fetch has a bounded timeout and a visible retry state, including Overview. A later guide request cannot replace another drawer. Recovery locks apply again after asynchronous renders, preserve export/import access and prevent writes while stored bytes are corrupt. Saving one form preserves drafts on other routes. Exact published opening instants control both the application status and calendar precision; month-only and conflicting dates remain unconfirmed.
