# UI verification — 15 October 2026

`tests/browser-v2.mjs` now exercises the no-account device release: no sign-in controls or auth requests (even with an obsolete session), country navigation, empty/error routes, keyboard entry, persisted pins/checklists/escaped notes, priorities/sort, explicit legacy import, JSON export/preview/import into a clean browser, malformed backups, calendar downloads, all eight tabs at 1440px and 390px in both themes, app-owned deletion, offline writes, cross-tab updates, quota failure/Retry, corrupt-data export and blocked-storage recovery. All 15 checks pass without a live database or OAuth identity. Retained cloud tests run separately against isolated synthetic state.

Before/after captures are in `baseline/` and `ux/`. `ux/results.json` records the latest full run. The production bundle uses the existing neutral tokens; v2 styles adapt to them. There is no framework migration or new runtime dependency.

## Static-audit review

`audit_project.py --mode strict` ran and its raw result is preserved in `ui-audit.json`. Its nine `affordance.actionless-button` findings are false positives: the parser recognizes inline onclick but does not recognize this vanilla application's delegated `document.addEventListener` handlers. Adding inline onclick would violate the site's CSP. Each reported button has an existing handler:

| Reported surface | Delegated action | Evidence |
|---|---|---|
| Overview next-action button | `[data-open-scholarship]` → `openScholarship` | Country/deep-link browser check |
| Pipeline submission | `[data-application-status]` → `progressStore.change` | State/store tests, shared inline submission |
| Pipeline GPT | `[data-open-gpt]` → `openGptForScholarship` | Existing isolated prompt-generation tests |
| Archive Restore / Delete (three instances) | `[data-life-action]` → lifecycle transition and app-owned confirmation | Lifecycle tests and deletion-dialog browser check |
| Compact deadline | `[data-open-scholarship]` → country detail or Goal fallback | Shared route handler and deadline tests |
| Backup preview action(s) | `[data-commit-backup]` / `[data-cancel-backup]` → validated local commit or clear preview | Clean-browser backup browser check; Cancel handler clears selection and restores picker focus |
| Legacy preview commit | `[data-commit-import]` → idempotent validated merge | Explicit-import browser check |

No source was weakened to satisfy the parser. All findings were manually traced to the canonical delegated handlers; this review is distinct from claiming a clean raw static scan. Native selects intentionally use OS-owned popup behavior. Search remains local/immediate. Notes use escaped text and a fixed-minimum-height, non-resizable textarea. All new dynamic text is escaped.

The no-login follow-up preserves the existing token mapping, component geometry and native controls. `DESIGN.md` now describes the workspace/recovery gate and local save status instead of the superseded login gate. Its official lint reports zero errors and the same nine existing token-documentation warnings. The mobile Settings and backup-preview captures were visually inspected; no new palette, typography or spacing tokens were introduced.

## Deliberate corrections to kit assumptions

The CLDR kit contained 15 historical aliases and duplicate country names; these are removed from production. Current coverage is ISO's 249 entries plus Kosovo, with an explicit extra Europe collection. Date-only calls have no invented UTC instant. Existing sole-owner RLS and CAS are retained instead of granting client row insertion. Closed v2 applications retain progress; only explicitly trashed records are cleaned after their recovery window.
