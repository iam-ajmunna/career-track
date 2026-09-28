# Express Track — fresh start

The owner confirmed that there is no progress to migrate. New progress starts empty; no export or import is required. The app ignores the old `scholarship-progress` value.

- Implementation and test evidence: [IMPLEMENTATION.md](IMPLEMENTATION.md).
- Supabase, Google, Vercel and acceptance steps: [DEPLOYMENT.md](DEPLOYMENT.md).
- Exact deadlines and provenance: [../deadlines.json](../deadlines.json). The build generates `/deadlines.ics` with four alarms per event.
- Decision overriding the original import gate: [FRESH-START.md](FRESH-START.md).

Work stays on `personal-dynamic` until the preview acceptance gate passes. Production continues at its existing baseline.
