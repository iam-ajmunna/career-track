# Cloud setup and release gate

## Current connection state — 28 September 2026

- The owner approved organization `munspace` (`rlpbkpgjhisywvkmwchu`) and the confirmed $0/month project cost. Project `career-track` (`yqqcfonzkkrboghhfbdx`) is active in Singapore (`ap-southeast-1`), on the free plan. Use this existing project; do not create another one. Non-secret coordinates are in `supabase/project.json`.
- Migration `202609280001_user_state.sql` is applied. Live SQL checks passed for owner access, other-account isolation, anonymous denial, immutable revisions and stale CAS rejection. Anonymous PostgREST table and RPC calls both return 401 / PostgreSQL `42501`. Security and performance advisors returned no findings. The verification transaction rolled back: zero workspace rows and zero auth users remain. See `CLOUD-VERIFICATION.md`.
- Google authentication is not configured: the public Auth settings report Google disabled, email enabled and signups enabled. These defaults must be restricted before owner registration/release; no owner account is provisioned yet.
- Vercel connection lists no teams. Reading existing project `career-track` under `aj-81af` returns 403: reauthenticate to that scope or use a connection with access. The known team ID is `team_8dlVozcPDxaR5ETsNuMrAr1W`. No permission bypass was attempted.
- `main` is still the original static app. All implementation work belongs to `personal-dynamic` / draft PR #1.

## 1. Provision the free database

Completed on 28 September 2026. Project API origin: `https://yqqcfonzkkrboghhfbdx.supabase.co`. Keep the single free project for this Express release; no paid branch is needed.

`supabase/verify-live-empty.sql` preserves the executed SQL verification. It refuses a populated workspace and always rolls back its synthetic identities/state. Do not run it after owner provisioning or remove its empty-workspace guard. Real owner Google/PostgREST acceptance remains separate from these database checks.

## 2. Google authentication and owner registration

Configure a Google OAuth web client in Google Cloud and its client ID/secret in Supabase's Google provider settings. Enter secrets directly in provider settings; never paste them into a PR, chat or browser bundle.

- Authorized OAuth callback is the exact Supabase callback URL displayed by the provider settings.
- Supabase Site URL is the eventual production origin. Allow only the exact local and current preview callback URLs during testing. Remove obsolete previews at cutover; avoid a wildcard covering arbitrary Vercel projects.
- Limit the Google consent application's test users to the intended owner during initial registration. Enable Supabase signup only for the owner's first Google sign-in; the database remains unreadable because no row exists.
- Verify that identity, obtain its auth user ID, then immediately disable public signups in Supabase. Confirm Google sign-in still works for the existing owner.
- Set local `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `CAREER_OWNER_ID` and `CAREER_OWNER_EMAIL` in ignored `.env`. Run `npm run provision:owner`. The script checks the exact email and a Google identity, refuses a different existing owner, and creates empty progress with the profile seed. Reruns preserve existing progress.

Do not provision an owner on “first caller wins” logic. The account ID is the authorization boundary, not editable user metadata or email alone.

## 3. Vercel preview and environment

Reconnect Vercel with access to `aj-81af/career-track`. Retain the existing GitHub project and `main` production branch. Build command and output are in `vercel.json`; Node must be 22.18+ (24.x matches local verification). Deploy `personal-dynamic` as a preview.

| Variable | Scope | Purpose |
|---|---|---|
| `PUBLIC_SUPABASE_URL` | Optional Preview + Production override | Exact project API origin; falls back to `supabase/project.json` |
| `PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Optional Preview + Production override | Publishable key; falls back to `supabase/project.json`; legacy anon accepted |
| `SUPABASE_URL` | Production server only | Daily keepalive query |
| `SUPABASE_SECRET_KEY` | Production server only | Privileged server query; never PUBLIC-prefixed |
| `CRON_SECRET` | Production server only | Random bearer secret for Vercel cron |

Vercel's secret environment-variable entry should hold the server values. Do not echo or log them. Rebuild after changing public variables; they are compiled into the frontend. Preview and production share the one owner database by explicit Express decision, so preview edits affect real progress after provisioning. Keep fixture data separate.

Cron runs daily at `23 3 * * *` UTC (within the hour on Hobby), production only. `/api/keepalive` requires `Authorization: Bearer <CRON_SECRET>`, returns no state, and aborts the query after 10 seconds. A failed save returns within 15 seconds. Cron is best effort and does not guarantee that the free project can never pause.

## 4. Preview acceptance — mandatory before main

- [ ] Fresh owner starts at 0%; existing legacy browser keys are ignored.
- [ ] Tick → Saved → refresh retains state.
- [ ] A second clean browser/device sees the same state after Google sign-in.
- [ ] Signed-out and different accounts see no private content and cannot read/write the row through the API.
- [ ] Failed/blocked save shows a persistent error with Retry. Reopen preserves pending work; recovery does not lose ticks.
- [ ] Two clients editing together preserve unrelated completions; a stale uncheck is reported. Same-tab intentional unchecks work.
- [ ] Expired session retains pending drafts and resumes after the same owner signs in.
- [ ] Export contains confirmed state and pending recovery data. Sign-out waits for save or explicit export.
- [ ] Responsive light/dark UI, keyboard focus, native dialogs and no horizontal overflow pass on desktop and phone.
- [ ] London 25 October and Los Angeles 1 November 2026 fixtures pass; displayed Dhaka dates match provider instants.
- [ ] Subscribe to the production `/deadlines.ics` URL on the phone (a file import is a snapshot). Verify all four alarms and event times; calendar applications may alter them.
- [ ] Unauthorized keepalive request is rejected; authorized production invocation succeeds. Confirm cron is enabled after cutover.

Legacy import acceptance is waived by the owner, not silently skipped.

## 5. Cutover and rollback

Before any main merge, publish and verify the annotated `pre-migration` tag using `node scripts/freeze-baseline.mjs --push` in an authenticated checkout. The local tag targets `af53a4c34295a160217845465c33002b074e10d7`. Never replace a mismatched tag or force a moved main.

After the acceptance gate passes, merge the reviewed PR and inspect the exact production deployment, Google return URL, cloud saves and cron. If production fails, restore the previous Vercel production deployment. Keep the Supabase row intact; rollback to the static frontend does not erase it and does not synchronize new static ticks. Export cloud state before any later migration or destructive database work.

If Supabase becomes unavailable/paused, restore the project in its dashboard and Retry. The UI retains owner drafts on the device where possible. Device storage eviction cannot recover unsent edits; only server-acknowledged progress is durable across devices. Server backups/restore drills and Telegram remain later phases.
