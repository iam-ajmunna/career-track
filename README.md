# Career Track v2

A personal scholarship workspace for the 2027 MSc intake. Vanilla ES modules, esbuild and the Supabase JS client; Vercel Hobby and an existing Supabase Free project.

## Workflow

- **Overview:** nearest verified deadline, currently working on, up to five next actions and three summary tiles.
- **Scholarships:** country names first, grouped by five personal requirements with explicit compromises. Every current country/territory is listed; unresearched entries are collapsed. Provisional means the evidence has not been fully verified.
- **Country details:** editable checklist, notes, submission, single/bulk research and completion tracking, official evidence and a pin toggle. Tray links restore the country and focused scholarship.
- **Pipeline / Documents / Profile Fit:** existing application preparation, evidence and profile workflows.
- **Settings:** export, explicit idempotent browser-progress import and typed reset with a backup first.
- **Personalized Goal / Archive & History:** existing extended programme research and recoverable archive/trash.

Shortcuts: 1–5 retain the original tabs; Settings=6, Goal=7, Archive=8. `/` opens country search. Navigation is keyboard accessible and becomes a bottom rail on mobile.

## Persistence

Device mode uses a new `career-track:v2` key and is clearly labeled local-only. Sign in with the provisioned Google owner to synchronize through the existing owner-only table and compare-and-swap revision engine. Failures retain queued work and expose Retry. Concurrent removals/text replacements report a conflict; completions and added pins survive recovery. Settings import can transfer prior browser work without changing either legacy key or overwriting newer cloud notes.

Cloud account activation is documented in [CLOUD-ACTIVATION](docs/upgrade/CLOUD-ACTIVATION.md). The existing database migration is applied; real owner OAuth/provisioning and the first production cron run need account configuration. No service secret belongs in browser configuration or source control.

## Development and checks

```sh
npm ci
npm run dev
npm test
npm run check:data
npm run check:keys
npm run build
```

Node 22.18+ is required. Unit tests run serially to bound PGlite memory. Browser verification uses a development Playwright installation (the supplied execution runtime also provides one); set `CT_CHROMIUM_PATH` to an existing Chromium binary when needed, then run `npm run test:browser`. The synthetic HTTP fixture never uses the live database and is excluded from deployment.

Exact deadlines retain source, UTC instant and provider timezone. The calendar uses four alarms per event; date-only/unannounced deadlines never receive invented exact times. Country lists contain 249 ISO entries plus Kosovo, with a separate regional Europe collection; historical CLDR aliases are removed.

Implementation/audit/acceptance evidence: [STATUS](docs/upgrade/STATUS.md), [UI review](docs/upgrade/UI-REVIEW.md), [design](DESIGN.md), [interaction contract](UX-CONTRACT.md). Original kit/specs remain under `docs/upgrade/`.

Work is on `personal-dynamic`; the owner reviews and merges the PR to `main`.
