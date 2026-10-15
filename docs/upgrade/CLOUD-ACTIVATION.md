# Owner activation and release

The code, additive database migration and synthetic cloud-sync checks are complete. These account-bound steps remain before real cross-device use:

1. In the existing free Supabase project `yqqcfonzkkrboghhfbdx`, configure the Google provider using your own Google Cloud OAuth client. Add the Supabase callback to Google, and allow `https://muncareer.vercel.app` plus the exact Vercel preview origin as redirects. Do not paste the OAuth secret into chat or client code.
2. Sign in once with the intended Google owner account. The app intentionally shows an account-not-provisioned gate until an administrator provisions that exact, verified Google identity. Other accounts have no workspace access.
3. Run the existing `npm run provision:owner` from a trusted local checkout with `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `CAREER_OWNER_ID`, `CAREER_OWNER_EMAIL` set in the ignored local `.env`. It verifies the email and Google identity, preserves existing rows and never overwrites an owner. Disable public signups once the owner exists.
4. In Settings, preview and import progress from the browser where you previously worked. Import merges completed flags, pins, missing notes and priorities; newer cloud text wins. Existing legacy keys are never changed.
5. In Vercel, confirm the existing server-only `CRON_SECRET`, `SUPABASE_URL`, `SUPABASE_SECRET_KEY` for the protected daily keepalive. Never expose the secret key through PUBLIC_ or VITE_ variables. Verify its daily request returns 200 after the production merge. The browser already has committed public project configuration; public environment overrides are optional.
6. Sign in on a second browser, verify a tick/pin and notes return, clear only that test browser's site data and sign in again. Check a failed/offline save retries successfully and another account cannot read the workspace. The automated fixture already checks these flows with synthetic users; real Google/OAuth acceptance is separate.

The connected Vercel app can list this project but get-project/env operations return 403 for scope `aj-81af`. Its CLI fallback has no credentials. Reconnect the Vercel account with access to project `prj_o2tkGNXfZu5TFEGjVnaB3iH03sDw` under team `team_8dlVozcPDxaR5ETsNuMrAr1W` if direct inspection/configuration is desired. Git-triggered previews may still build independently.

Merge the reviewed `personal-dynamic` PR into main yourself, as required by the supplied upgrade instructions. No agent production merge was performed. Stay on the free tiers; no new project or paid resource was created.

## Live database verification, 15 October 2026

Migration `career_v2_fields` applied successfully to the existing project. RLS remained enabled; anonymous SELECT denied; authenticated UPDATE(state) allowed; client UPDATE(rev) denied. Valid v2 state accepted, a string-valued pin rejected. Security advisors returned no findings. There were zero real users and zero workspaces, so no real-owner Google login or live progress was fabricated. No synthetic identities were inserted in production; isolation tests ran in PGlite and the local HTTP fixture.
