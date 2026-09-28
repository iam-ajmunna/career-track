# Express implementation checkpoint — 28 September 2026

The fresh-start instruction is implemented: no legacy progress reads/import, empty owner progress, no reset control. The existing vanilla UI and all 102 checklist definitions remain intact.

## Implemented

- Google PKCE sign-in/session recovery; explicit signed-out, setup, forbidden, unavailable and offline gates.
- Administrator-provisioned single-owner JSON state, grants limited to SELECT/UPDATE(state), RLS, immutable owner and database-controlled revisions/timestamps.
- Remote-read-before-save CAS with bounded retries; independent pending operation keys avoid whole-cache overwrites. Stale completions union, unrelated state survives, and intentional current-revision unchecks work. Later same-tab edits rebase only after that tab's successful write.
- Saving/Saved/error state, persistent Retry, owner-scoped recovery/export, storage-failure warning and save-or-export sign-out.
- Seven exact deadline entries, one date-only KAUST record, provider/Dhaka displays, urgency and hero selection excluding submitted applications. One visibility-aware timer updates timer nodes. Clock skew uses server time.
- Build-time public ICS with stable UIDs, UTF-8 folding, UTC instants and alarms at 7d/3d/24h/3h. Oxford's two funding routes share the same underlying course deadline.
- Bundled browser build, pinned dependencies/lockfile, public-key validation, private profile exclusion, CSP/security headers, authenticated daily Vercel keepalive.

## Verification

`npm test`: **23 passed** using Node 24.19.0. Includes a real PostgreSQL-compatible PGlite engine for grants/RLS/schema/CAS and deterministic failure/concurrency simulations for sync. It does not exercise a deployed Supabase service or real Google OAuth.

`npm run check:keys`: **102/102 keys and meanings match** baseline `af53a4c`.

`npm run build`: succeeds; initial browser entry approximately 63 KB gzip, dashboard code loaded separately after sign-in. Build output contains no `.env`, profile seed, migration, docs or fixtures.

`git diff --check`: clean. DESIGN.md lint: 0 errors; 9 warnings about the existing token/component mapping.

The premium static audit reports four actionless-button findings. These are parser limitations for delegated vanilla event handlers: priority buttons, filter buttons, submission buttons and compact countdown cards are all handled by the document click handler in `src/app.js`. No inline event attributes were introduced to silence the audit. Runtime verification is still required.

The supported cloud browser returned `ERR_BLOCKED_BY_CLIENT` for the local fixture URL. No local UI screenshot or end-to-end pass is claimed. `tests/browser-fixture.mjs` is available for authorized local browser verification, with synthetic identities only, excluded from the deployment build.

## Release state

**Not merged / not production-ready.** Cloud project creation, Google configuration, provider-level RLS checks, authenticated Vercel preview, two-device/phone acceptance and the remote recovery tag remain open. Vercel currently returns 403 for team `aj-81af`; Supabase awaits its mandatory organization/cost selection. See `DEPLOYMENT.md` for exact steps.
