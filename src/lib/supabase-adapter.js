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
