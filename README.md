# Career Track — Scholarship OS

A scholarship workspace with browser-saved progress, verified deadline countdowns, calendar alarms and a small evidence-led scholarship decision layer. The Express Track preserves the existing vanilla JavaScript interface and all 102 legacy checklist keys while allowing additive vNext items.

Progress starts empty, as requested, then saves automatically in the current browser using localStorage. There is no Google sign-in gate and no cloud account requirement. The old browser progress key is never imported.

## Run

Use Node 22.18+ (tested with 24.19.0).

```bash
npm ci
cp .env.example .env
npm run dev
```

Open `http://localhost:8080`. The app opens directly into the editable workspace and saves progress in this browser. `npm run build` builds only deployable browser assets into `dist` and generates `dist/deadlines.ics`.

```bash
npm test
npm run check:keys
npm run build
```

Tests cover PostgreSQL grants/RLS/CAS, stale edits, slow and failed saves, offline reopen, recovery, clock boundaries/DST, ICS and frozen checklist compatibility. `node tests/browser-fixture.mjs` starts a synthetic local UI fixture on port 8081, excluded from `dist`. It is not real Google/Supabase acceptance.

## Structure

| Path | Responsibility |
|---|---|
| `src/bootstrap.js` | Browser-local progress store, export and recovery |
| `src/sync/` | State validation plus the retained cloud sync modules |
| `src/app.js`, `src/data.js` | Apply/Watch/Closed portfolio, career context, screened-out evidence, dossier and rendering |
| `src/domain/time.ts`, `src/countdowns.js` | Exact time, urgency and isolated timer updates |
| `deadlines.json` | Verified instants and date-only evidence |
| `supabase/` | Owner-only migration and private profile seed |
| `api/keepalive.js`, `vercel.json` | Protected daily database activity and deployment settings |
| `docs/DEPLOYMENT.md` | Provisioning, acceptance and rollback |

Nine exact deadline entries are sourced as of 28 September 2026, including ETH Zurich ESOP and the Bangladesh-specific DAAD all-disciplines Master's deadline. KAUST has a verified date with no verified closing time; other unannounced or unverified calls receive no precise timer. Oxford's two funding routes share one course deadline. Calendar content contains public facts only. A calendar client may discard alarms; phone verification is still required.

Every scholarship also exposes an **Open GPT ↗** action. It creates a dedicated new-chat research prompt for that scholarship, includes the tracked official sources/deadline/checklist context, asks ChatGPT to re-verify the live 2027 rules, and copies the prompt as a fallback before opening ChatGPT.

The visible scholarship list defaults to **Apply + Watch**. Closed routes stay available for context; misleading, ineligible or funding-mismatched social-media leads are kept in a collapsed **Screened out** register rather than polluting the working shortlist. Career information appears only in scholarship details and is factual planning context, not a PR score or guarantee. The dossier now includes an additive Europass CV item for European applications.

Private profile seed, migrations, documentation, tests and `.env` files are excluded from public static output. Current progress is browser-local: use the export button for a portable backup or before clearing browser data.

Design and interactions are documented in `DESIGN.md` and `UX-CONTRACT.md`. Do not reorder or rewrite checklist items until the positional-key migration is separately implemented.
