# Release v2 without an account

The owner requested continuing without Google Auth on 15 October 2026. This supersedes the OAuth activation gates in the original kit and earlier handoff. No Google Cloud, Supabase Auth, owner provisioning or Vercel secret setup is required for this release.

## Publish

Review [PR #4](https://github.com/iam-ajmunna/career-track/pull/4), then merge `personal-dynamic` into `main` after its checks pass. The existing GitHub/Vercel integration builds the live site at https://muncareer.vercel.app. The supplied upgrade instructions reserve the production merge for the owner; the agent has not merged or pushed to main.

## Keep your progress

1. Open the site in the browser where you previously worked.
2. In **Settings → Import progress from this browser**, choose **Preview import**, then **Import completed progress** if items are found. Original browser keys remain unchanged.
3. Use **Export progress** to download a JSON backup. Keep it outside the browser before clearing website data, switching devices or changing between a preview URL and the live URL.
4. On another browser/device, open **Settings → Import a backup file**, choose the exported JSON, review its preview and select **Import backup**. Existing notes, priorities and profile details are preserved; completed work and missing values are added. Repeat imports are safe.

Changes save automatically under `career-track:v2` in the current browser and website origin. There is no automatic cross-device sync. A clean browser starts empty until a backup is imported. Private browsing or clearing site data can remove the local copy.

**Not saved — Retry** means the browser could not persist the latest change. Retry after freeing/allowing browser storage, or export before closing. Corrupt saved data is kept intact for recovery export; it is never silently overwritten. A tab with unsaved work is protected from a conflicting storage update in another tab.

## Technical scope

The active browser entry initializes only `local-v2.js`. It never reads existing OAuth sessions, sends Google/Supabase requests or embeds public database configuration. Vercel's scheduled database keepalive is removed because this release has no cloud dependency. Existing database records, RLS policies, migrations and server-side tooling remain intact for any separately requested future sync work.

This change makes the static application available without authentication. Use a browser/profile you control for private notes, and handle exported backups as personal data. The existing site already contains the applicant's public-facing profile context; this release does not add a new access-control mechanism.
