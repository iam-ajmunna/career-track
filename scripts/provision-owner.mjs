import { createClient } from '@supabase/supabase-js';
import { readFile } from 'node:fs/promises';
import { EMPTY_STATE, validateState } from '../src/sync/model.js';

const { SUPABASE_URL: url, SUPABASE_SECRET_KEY: key, CAREER_OWNER_ID: id, CAREER_OWNER_EMAIL: email } = process.env;
if (!url || !key || !id || !email) throw new Error('Set SUPABASE_URL, SUPABASE_SECRET_KEY, CAREER_OWNER_ID and CAREER_OWNER_EMAIL in your local .env.');
const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const { data: auth, error: authError } = await client.auth.admin.getUserById(id);
if (authError || auth.user?.email?.toLowerCase() !== email.toLowerCase() ||
    !auth.user.identities?.some(identity => identity.provider === 'google')) {
  throw new Error('Owner must match an existing Google identity and the exact expected email. No row was changed.');
}
const { data: rows, error: readError } = await client.from('user_state').select('owner_id,rev').limit(2);
if (readError) throw new Error('Cannot read user_state. Apply the migration first.');
if (rows.length) {
  if (rows.length !== 1 || rows[0].owner_id !== id) throw new Error('Another owner already exists. No row was changed.');
  console.log('Owner already provisioned. Existing progress was preserved.');
} else {
  const profile = JSON.parse(await readFile(new URL('../supabase/owner-profile.json', import.meta.url), 'utf8'));
  const state = validateState({ ...structuredClone(EMPTY_STATE), profile });
  const { error } = await client.from('user_state').insert({ owner_id: id, state });
  if (error) throw new Error('Owner provisioning failed. No existing state was overwritten.');
  console.log('Owner provisioned with empty progress. Disable public signups before release.');
}
