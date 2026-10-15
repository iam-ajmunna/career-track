# 04 — Persistence, auth, import, keep-alive, countdown, calendar (free tier)

Requirement R-8: **progress visible whenever and wherever the owner opens the site.** Server copy is the single truth; the browser keeps a cache for instant paint and offline read.

## 1. Decision summary (see `ARCHITECTURE.md` §27 for rationale)
- **Supabase Free**: Postgres + Auth (Google). **Vercel Hobby**: static hosting + one daily cron function.
- One table `user_state` holds the app state as JSON (`{ workingOn, prefs, ui, … }`) + a revision number. Legacy progress keys are **imported once**, never rewritten.
- Free-tier risks the owner accepted: project **pauses after 7 days of inactivity** (mitigated by the daily keep-alive below); **no automatic backups** (mitigated by the in-app JSON export in Settings and an optional nightly export later).

## 2. Step D1-a — Supabase project (owner + agent)
1. Create a free project; region nearest Bangladesh (Singapore or Mumbai, whichever the dashboard offers).
2. Authentication → Providers → **Google** (create OAuth client in Google Cloud; redirect URI = the Supabase callback URL shown; add site URLs: `https://muncareer.vercel.app` and the Vercel preview URL).
3. Sign in once with the owner's Google account (creates the owner user), then Authentication → **disable "Allow new users to sign up"** so nobody else can ever create an account.
4. Run the migration below (SQL editor or `supabase db push`). **It includes explicit grants**; new tables are not exposed to the Data API without them.
5. Keys: copy the **publishable** key and project URL into Vercel env vars `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` (Preview + Production). **Never** put a secret/service key in any `VITE_*` variable or in git.
6. Run the isolation test (`supabase test db`) or the manual equivalent in spec 05 §2.

**`supabase/migrations/0001_user_state.sql`**
```sql
-- One row per owner holding the app state blob (Express Track, see ARCHITECTURE.md §27).
create table if not exists public.user_state (
  owner_id   uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  state      jsonb       not null default '{}'::jsonb,
  rev        integer     not null default 1,
  updated_at timestamptz not null default now()
);

alter table public.user_state enable row level security;

-- Owner-only, all verbs. (select auth.uid()) is evaluated once per statement.
create policy "owner select" on public.user_state for select to authenticated using (owner_id = (select auth.uid()));
create policy "owner insert" on public.user_state for insert to authenticated with check (owner_id = (select auth.uid()));
create policy "owner update" on public.user_state for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "owner delete" on public.user_state for delete to authenticated using (owner_id = (select auth.uid()));

-- Explicit Data API grants (required for new tables since the 2026 Supabase change). authenticated only; never anon.
grant select, insert, update, delete on public.user_state to authenticated;
revoke all on public.user_state from anon;

create or replace function public.touch_user_state() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
create trigger user_state_touch before update on public.user_state for each row execute function public.touch_user_state();
```

**`supabase/tests/isolation.test.sql`**
```sql
-- Run with: supabase test db   (pgTAP). Proves RLS isolation + no anon access.
begin;
select plan(4);
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000a1','a@test'),('00000000-0000-0000-0000-0000000000b2','b@test');
insert into public.user_state (owner_id, state) values ('00000000-0000-0000-0000-0000000000a1','{"workingOn":["x"]}');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}', true);
select is((select count(*)::int from public.user_state), 0, 'other user sees zero rows');
select throws_ok($$insert into public.user_state (owner_id, state) values ('00000000-0000-0000-0000-0000000000a1','{}')$$, '42501', null, 'other user cannot insert for someone else');

set local role anon;
select throws_ok($$select * from public.user_state$$, '42501', null, 'anon cannot read');
select throws_ok($$insert into public.user_state (owner_id) values (gen_random_uuid())$$, '42501', null, 'anon cannot write');
select * from finish();
rollback;
```

(The pgTAP test is **unrun**; if inserting into `auth.users` needs more columns in your project version, adapt the two seed inserts. The assertions must stay.)

## 3. Step D1-b — Adapter and login gate
Install `@supabase/supabase-js`. Replace `localAdapter` with the Supabase adapter in the single place the store is created (spec 03 §5). Add a login gate: if `adapter.session()` is null show a full-screen **Sign in with Google** button (nothing else renders); on return, `store.init()`.

**`src/lib/supabase-adapter.js`**
```js
// Persistence adapter for the store. NOT RUN IN THIS SESSION (needs your Supabase keys) - see 04-persistence.md.
// Truth = server row in public.user_state. localStorage is a write-through cache for instant paint/offline.
import { createClient } from '@supabase/supabase-js';
import { localAdapter } from './store.js';
import { unionMerge } from './merge.js';

export function createSupabaseAdapter({ url, publishableKey }) {
  const sb = createClient(url, publishableKey, { auth: { persistSession: true, autoRefreshToken: true } });
  let serverRev = 0;

  // union-merge: never lose a pin or a tick; free text / prefs / ui: server copy wins
  const merge = (local, remote) => unionMerge(remote ?? {}, local ?? {});

  return {
    sb,
    async signIn() { return sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin } }); },
    async session() { return (await sb.auth.getSession()).data.session; },
    async load() {
      const local = await localAdapter.load();
      const { data, error } = await sb.from('user_state').select('state, rev').maybeSingle();
      if (error) throw error;
      if (!data) return local;                    // first run: server empty -> keep local, first save creates the row
      serverRev = data.rev;
      const merged = merge(local, data.state);
      await localAdapter.save(merged);
      return merged;
    },
    async save(state) {
      await localAdapter.save(state);             // cache first: never lose a tick locally
      const { data: { user } } = await sb.auth.getUser();
      if (!user) throw new Error('Not signed in');
      // optimistic concurrency: only write if nobody else wrote since we loaded
      if (serverRev === 0) {
        const { error } = await sb.from('user_state').insert({ owner_id: user.id, state, rev: 1 });
        if (error) throw error; serverRev = 1; return;
      }
      const { data, error } = await sb.from('user_state')
        .update({ state, rev: serverRev + 1 }).eq('owner_id', user.id).eq('rev', serverRev).select('rev');
      if (error) throw error;
      if (!data.length) throw new Error('Conflict: another device saved first. Reload to merge.');
      serverRev = data[0].rev;
    },
  };
}
```

Behaviour contract:
- **Load:** local cache paints immediately; then fetch server row; **union-merge** (a pin or tick is never lost); for free text/prefs/ui the server copy wins.
- **Save:** write cache first; then `update … where rev = serverRev`. A zero-row result means another device saved first → show "Another device saved changes — Reload to merge" (no silent overwrite). Network/auth failure → the store's status becomes `failed` and the UI shows **Failed — Retry**; the change stays in the local cache.
- Show a persistent status chip in the top bar: `Saved · Saving… · Failed — Retry · Offline (showing last saved copy)`.
- On sign-out: clear the local cache key `career-track:v2`.

## 4. Step D1-c — Progress through the store, and one-time legacy import
**Routing all progress through the store is what makes it visible everywhere.** In A0 you listed every read/write of the legacy localStorage key(s). In D1 replace each of them:
- read → `store.getProgress()` (returns the same JSON shape the app stored before)
- write → `store.setProgress(next)` (or `store.setProgress(prev => next)`)
The store persists `progress` through the adapter (cache + server) and union-merges it across devices (`src/lib/merge.js`). The legacy localStorage key is **no longer written** after this change, but is **never deleted** (it is the owner's rollback and the import source).

**Import (Settings → "Import progress from this browser")**
1. Read the legacy key (read-only) → `legacyBlob`.
2. `const report = await store.importLegacy(legacyBlob)` is a **dry run** by default → show "N ticks found in this browser, M will be added" and ask for confirmation.
3. On confirm: `await store.importLegacy(legacyBlob, { dryRun: false })`. Union-merge means: a tick present in either copy survives; importing twice changes nothing.
4. Do this on **every browser/device that has ticks** (each import only adds). `legacyImportedAt` records the last import.
5. Export: Settings → **Download everything (JSON)** = full state + legacy key(s) + timestamp (this is the manual backup on the free tier).

**`src/lib/merge.js`**
```js
/**
 * Union-merge two JSON-like values so that NO completed item is ever lost.
 *  - booleans: a || b          (a tick on either device survives)
 *  - plain objects: merged key by key, recursively
 *  - arrays: union (deduplicated by JSON value), order of `base` first
 *  - other primitives (strings/numbers): `base` wins when defined, else `incoming`
 * Use as unionMerge(remote, local): the server copy wins for free text, but ticks/pins from both survive.
 */
export function unionMerge(base, incoming) {
  if (base === undefined || base === null) return incoming;
  if (incoming === undefined || incoming === null) return base;
  if (typeof base === 'boolean' && typeof incoming === 'boolean') return base || incoming;
  if (Array.isArray(base) && Array.isArray(incoming)) {
    const seen = new Set(), out = [];
    for (const v of [...base, ...incoming]) { const k = JSON.stringify(v); if (!seen.has(k)) { seen.add(k); out.push(v); } }
    return out;
  }
  if (isPlain(base) && isPlain(incoming)) {
    const out = { ...base };
    for (const k of Object.keys(incoming)) out[k] = k in base ? unionMerge(base[k], incoming[k]) : incoming[k];
    return out;
  }
  return base;
}
const isPlain = v => v && typeof v === 'object' && !Array.isArray(v);

/** Count ticks (true booleans) in a progress blob: used for the import dry-run summary. */
export function countTicks(v) {
  if (v === true) return 1;
  if (Array.isArray(v)) return v.reduce((n, x) => n + countTicks(x), 0);
  if (isPlain(v)) return Object.values(v).reduce((n, x) => n + countTicks(x), 0);
  return 0;
}
```

## 5. Step D1-d — Keep-alive (prevents free-tier pause)
Vercel function `api/keepalive.js` (project root of the deployed app) plus a daily cron in `vercel.json`. Vercel Hobby cron runs **at most once per day**, at some point inside the scheduled hour, in UTC; that is enough.
```js
// api/keepalive.js
export default async function handler(req, res) {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) return res.status(401).end();
  const r = await fetch(`${process.env.VITE_SUPABASE_URL}/rest/v1/user_state?select=rev&limit=1`, {
    headers: { apikey: process.env.VITE_SUPABASE_PUBLISHABLE_KEY },
  });
  // 401/403/empty is fine (RLS); a network error or 5xx means the project is down or paused
  if (r.status >= 500) return res.status(502).json({ ok: false, status: r.status });
  res.status(200).json({ ok: true, status: r.status });
}
```
```json
// vercel.json  (merge with existing keys)
{ "crons": [ { "path": "/api/keepalive", "schedule": "17 3 * * *" } ] }
```
Set `CRON_SECRET` (random 32+ chars) in Vercel env. Vercel sends it as the Bearer token for cron invocations. Verify in Vercel → project → Cron Jobs after the first deploy. **Runbook:** if the app shows "database unavailable", open the Supabase dashboard and restore the paused project; data is retained.

## 6. Offline & flakiness (Bangladesh-friendly)
First load without network: show the cached copy with banner "Offline — showing last saved copy". Edits made offline are saved to the local cache and merged on the next successful load/save (union for pins). A full persisted queue is a later phase; do not claim more in the UI.

## 7. Step D2 — Countdown and calendar alarms
**Hero timer (Overview):** choose the nearest `deadlineAt` among scholarships that are pinned **and** not submitted/skipped/closed; if none pinned, nearest among all. Show `DD : HH : MM : SS`, the provider-zone time and the Dhaka time (`formatInZone`), urgency label from `urgencyBand`. One shared 1-second timer for the hero only (pause when `document.hidden`, recompute from `Date.now()` on `visibilitychange`); everything else updates per minute. Use `role="timer"` with `aria-live="off"`; announce only when the urgency band changes.
**Static calendar file:** a build script `scripts/build-ics.mjs` reads the normalised scholarships that have `deadlineAt` and writes `public/deadlines.ics` (UTC `DTSTART`, `SUMMARY`, `URL`, and `VALARM` at 7 days, 3 days, 24 hours, 3 hours before). It contains only public deadline facts — no personal data — so no secret URL is needed. Subscribe on the phone via the URL `https://muncareer.vercel.app/deadlines.ics`. Run it in the `build` script before the bundler. Test by importing the file into a calendar and checking one event's time against the source.
**Date rules:** never derive a deadline from date-only text; date-only deadlines are stored as 23:59:59 in the provider's zone with `deadlinePrecision:'date_only'` and displayed with an "assumed" badge.
