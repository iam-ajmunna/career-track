# Career Track — Scholarship OS

A private scholarship workspace with Google sign-in, Supabase progress persistence, verified deadline countdowns, calendar alarms and a small evidence-led scholarship decision layer. The Express Track preserves the existing vanilla JavaScript interface and all 102 legacy checklist keys while allowing additive vNext items.

Progress starts empty, as requested. Supabase is authoritative; account-scoped device caches retain pending work through connectivity failures. The old browser progress key is never imported. This branch is a release candidate: live Google/device/phone acceptance remains required before production cutover.

## Run

Use Node 22.18+ (tested with 24.19.0).

```bash
npm ci
cp .env.example .env
# Configure the two PUBLIC_SUPABASE_* values locally; never commit credentials.
npm run dev
```

Open `http://localhost:8080`. Missing cloud configuration shows a setup gate and permits no edits. `npm run build` reads environment variables, builds only deployable browser assets into `dist`, and generates `dist/deadlines.ics`. It does not load `.env` automatically; use `node --env-file=.env scripts/build.mjs` locally when needed. Vercel injects build variables.

```bash
npm test
npm run check:keys
npm run build
```

Tests cover PostgreSQL grants/RLS/CAS, stale edits, slow and failed saves, offline reopen, recovery, clock boundaries/DST, ICS and frozen checklist compatibility. `node tests/browser-fixture.mjs` starts a synthetic local UI fixture on port 8081, excluded from `dist`. It is not real Google/Supabase acceptance.

## Structure

| Path | Responsibility |
|---|---|
| `src/bootstrap.js` | Google session, owner gate, sign-out/export and recovery |
| `src/sync/` | Revision checks, pending patches, account cache and Supabase requests |
| `src/app.js`, `src/data.js` | Apply/Watch/Closed portfolio, career context, screened-out evidence, dossier and rendering |
| `src/domain/time.ts`, `src/countdowns.js` | Exact time, urgency and isolated timer updates |
| `deadlines.json` | Verified instants and date-only evidence |
| `supabase/` | Owner-only migration and private profile seed |
| `api/keepalive.js`, `vercel.json` | Protected daily database activity and deployment settings |
| `docs/DEPLOYMENT.md` | Provisioning, acceptance and rollback |

Nine exact deadline entries are sourced as of 28 September 2026, including ETH Zurich ESOP and the Bangladesh-specific DAAD all-disciplines Master's deadline. KAUST has a verified date with no verified closing time; other unannounced or unverified calls receive no precise timer. Oxford's two funding routes share one course deadline. Calendar content contains public facts only. A calendar client may discard alarms; phone verification is still required.

Every scholarship also exposes an **Open GPT ↗** action. It creates a dedicated new-chat research prompt for that scholarship, includes the tracked official sources/deadline/checklist context, asks ChatGPT to re-verify the live 2027 rules, and copies the prompt as a fallback before opening ChatGPT.

The visible scholarship list defaults to **Apply + Watch**. Closed routes stay available for context; misleading, ineligible or funding-mismatched social-media leads are kept in a collapsed **Screened out** register rather than polluting the working shortlist. Career information appears only in scholarship details and is factual planning context, not a PR score or guarantee. The dossier now includes an additive Europass CV item for European applications.

Private profile seed, migrations, documentation, tests and `.env` files are excluded from public static output. A public Supabase key is expected in the browser; a service/secret key must never be there. Source visibility does not authorize access to progress: PostgreSQL grants and row policies enforce it.

Design and interactions are documented in `DESIGN.md` and `UX-CONTRACT.md`. Do not reorder or rewrite checklist items until the positional-key migration is separately implemented.
