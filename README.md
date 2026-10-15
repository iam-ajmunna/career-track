# Career Track v2

A personal scholarship workspace for the 2027 MSc intake. Vanilla ES modules and esbuild, hosted on Vercel. The active app needs no account or cloud configuration.

## Workflow

- **Overview:** nearest verified deadline, currently working on, up to five next actions and three summary tiles.
- **Scholarships:** country names first, grouped by five personal requirements with explicit compromises. Every current country/territory is listed; unresearched entries are collapsed. Provisional means the evidence has not been fully verified.
- **Country details:** editable checklist, notes, submission, single/bulk research and completion tracking, official evidence and a pin toggle. Tray links restore the country and focused scholarship.
- **Pipeline / Documents / Profile Fit:** existing application preparation, evidence and profile workflows.
- **Settings:** JSON backup export/import, explicit idempotent browser-progress import and typed reset with a backup first.
- **Personalized Goal / Archive & History:** existing extended programme research and recoverable archive/trash.

Shortcuts: 1–5 retain the original tabs; Settings=6, Goal=7, Archive=8. `/` opens country search. Navigation is keyboard accessible and becomes a bottom rail on mobile.

## Persistence

The app opens directly with **Saved on this device** and stores progress under `career-track:v2`. There is no Google sign-in or automatic cross-device sync. The browser bundle does not load the Supabase client or read OAuth sessions. Offline changes save locally while the page is open; this is not an offline-installable PWA.

Use **Settings → Import progress from this browser** to migrate previous local work without changing either legacy key. Use **Export progress** and **Import a backup file** to transfer between browsers, devices or website origins. Imports validate the file, preview changes and preserve existing notes, priorities and profile details. Storage failures retain an exportable draft and expose Retry; corrupt bytes are preserved for recovery. Export before clearing browser data.

Publication and usage are documented in [RELEASE](docs/upgrade/RELEASE.md). Google/Supabase activation is deferred. Existing database protections and backend tooling are preserved but are not used by this release; the scheduled keepalive is removed. No service secret belongs in browser configuration or source control.

## Development and checks

```sh
npm ci
npm run dev
npm test
npm run check:data
npm run check:keys
npm run build
```

Node 22.18+ is required. Unit tests run serially to bound PGlite memory; retained backend tests use isolated synthetic data. Browser verification uses a development Playwright installation (the supplied execution runtime also provides one); set `CT_CHROMIUM_PATH` to an existing Chromium binary when needed, then run `npm run test:browser`. It exercises the actual device-mode entry without a live database or OAuth identity.

Exact deadlines retain source, UTC instant and provider timezone. The calendar uses four alarms per event; date-only/unannounced deadlines never receive invented exact times. Country lists contain 249 ISO entries plus Kosovo, with a separate regional Europe collection; historical CLDR aliases are removed.

Implementation/audit/acceptance evidence: [STATUS](docs/upgrade/STATUS.md), [UI review](docs/upgrade/UI-REVIEW.md), [design](DESIGN.md), [interaction contract](UX-CONTRACT.md). Original kit/specs remain under `docs/upgrade/`.

Work is on `personal-dynamic`; the owner reviews and merges the PR to `main`.
