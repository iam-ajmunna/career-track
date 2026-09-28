import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const owner = '11111111-1111-4111-8111-111111111111';
const other = '22222222-2222-4222-8222-222222222222';
test('Postgres grants, owner RLS, single-owner provisioning, validation and revision CAS', async () => {
  const db = new PGlite();
  try {
    await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
      CREATE SCHEMA auth; CREATE TABLE auth.users (id uuid primary key);
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      GRANT USAGE ON SCHEMA auth, public TO anon, authenticated, service_role;
      INSERT INTO auth.users VALUES ('${owner}'),('${other}');`);
    await db.exec(await readFile('supabase/migrations/202609280001_user_state.sql', 'utf8'));
    await db.exec(`SET ROLE authenticated; SET request.jwt.claim.sub='${owner}';`);
    await assert.rejects(db.query('INSERT INTO public.user_state DEFAULT VALUES'), /permission denied/);
    await db.exec(`RESET ROLE; INSERT INTO public.user_state(owner_id) VALUES ('${owner}');`);
    await assert.rejects(db.query('INSERT INTO public.user_state(owner_id) VALUES ($1)', [other]), /user_state_single_owner/);
    await db.exec('SET ROLE anon');
    await assert.rejects(db.query('SELECT * FROM public.user_state'), /permission denied/);
    await assert.rejects(db.query('SELECT public.get_career_state()'), /permission denied/);
    await assert.rejects(db.query("UPDATE public.user_state SET state='{}'"), /permission denied/);
    await db.exec(`RESET ROLE; SET ROLE authenticated; SET request.jwt.claim.sub='${other}';`);
    assert.equal((await db.query('SELECT * FROM public.user_state')).rows.length, 0);
    assert.equal((await db.query('SELECT public.get_career_state() AS data')).rows[0].data.snapshot, null);
    assert.equal((await db.query("UPDATE public.user_state SET state=state RETURNING *")).rows.length, 0);
    await db.exec(`SET request.jwt.claim.sub='${owner}';`);
    const before = (await db.query('SELECT public.get_career_state() AS data')).rows[0].data;
    assert.equal(before.snapshot.rev, 0); assert.ok(Date.parse(before.server_time));
    const saved = await db.query(`UPDATE public.user_state SET state=jsonb_set(state,'{progress,doc-passport}','true') WHERE rev=0 RETURNING rev,state,updated_at`);
    assert.equal(saved.rows[0].rev, 1); assert.equal(saved.rows[0].state.progress['doc-passport'], true);
    assert.ok(new Date(saved.rows[0].updated_at) >= new Date(before.snapshot.updated_at));
    assert.equal((await db.query('UPDATE public.user_state SET state=state WHERE rev=0 RETURNING rev')).rows.length, 0);
    await assert.rejects(db.query('UPDATE public.user_state SET rev=0'), /permission denied/);
    await assert.rejects(db.query('UPDATE public.user_state SET owner_id=$1', [other]), /permission denied/);
    await assert.rejects(db.query('DELETE FROM public.user_state'), /permission denied/);
    await assert.rejects(db.query("UPDATE public.user_state SET state='{}'"), /check constraint/);
    await assert.rejects(db.query("UPDATE public.user_state SET state=jsonb_set(state,'{progress,doc-passport}','\"true\"')"), /check constraint/);
    await assert.rejects(db.query("UPDATE public.user_state SET state=jsonb_set(state,'{applications,kaust}','\"unknown\"')"), /check constraint/);
    assert.equal((await db.query("UPDATE public.user_state SET state=jsonb_set(state,'{progress,doc-passport}','false') WHERE rev=1 RETURNING state,rev")).rows[0].rev, 2);
    await db.exec('RESET ROLE');
    await assert.rejects(db.query('UPDATE public.user_state SET owner_id=$1', [other]), /immutable/);
  } finally { await db.close(); }
});
