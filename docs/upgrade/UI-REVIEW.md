# UI verification — 15 October 2026

`tests/browser-v2.mjs` exercises country navigation, empty/error routes, keyboard entry, persisted pins/checklists/escaped notes, priorities/sort, explicit import, calendar downloads, all eight tabs at 1440px and 390px in both themes, app-owned deletion, clean-browser cloud restore, write failure/retry and other-account isolation. Synthetic identities and data only; the fixture is excluded from the production build.

Before/after captures are in `baseline/` and `ux/`. `ux/results.json` records the latest full run. The production bundle uses the existing neutral tokens; v2 styles adapt to them. There is no framework migration or new runtime dependency.

## Static-audit review

`audit_project.py --mode strict` ran and its raw result is preserved in `ui-audit.json`. Its seven `affordance.actionless-button` findings are false positives: the parser recognizes inline onclick but does not recognize this vanilla application's delegated `document.addEventListener` handlers. Adding inline onclick would violate the site's CSP. Each reported button has an existing handler:

| Reported surface | Delegated action | Evidence |
|---|---|---|
| Overview next-action button | `[data-open-scholarship]` → `openScholarship` | Country/deep-link browser check |
| Pipeline submission | `[data-application-status]` → `progressStore.change` | State/store tests, shared inline submission |
| Pipeline GPT | `[data-open-gpt]` → `openGptForScholarship` | Existing isolated prompt-generation tests |
| Archive Restore / Delete (three instances) | `[data-life-action]` → lifecycle transition and app-owned confirmation | Lifecycle tests and deletion-dialog browser check |
| Compact deadline | `[data-open-scholarship]` → country detail or Goal fallback | Shared route handler and deadline tests |

No source was weakened to satisfy the parser. All findings were manually traced to the canonical delegated handlers; this review is distinct from claiming a clean raw static scan. Native selects intentionally use OS-owned popup behavior. Search remains local/immediate. Notes use escaped text and a fixed-minimum-height, non-resizable textarea. All new dynamic text is escaped.

## Deliberate corrections to kit assumptions

The CLDR kit contained 15 historical aliases and duplicate country names; these are removed from production. Current coverage is ISO's 249 entries plus Kosovo, with an explicit extra Europe collection. Date-only calls have no invented UTC instant. Existing sole-owner RLS and CAS are retained instead of granting client row insertion. Closed v2 applications retain progress; only explicitly trashed records are cleaned after their recovery window.
