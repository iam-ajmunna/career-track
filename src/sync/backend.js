export function createBackend(client, ownerId) {
  function check(error, status) {
    if (!error) return;
    const failure = new Error('The workspace request did not succeed.');
    failure.status = error.code === 'PGRST301' || error.code === 'PGRST303' || status === 401 ? 401 :
      error.code === '42501' || status === 403 ? 403 : status;
    throw failure;
  }
  return {
    async load() {
      const { data, error, status } = await client.rpc('get_career_state').abortSignal(AbortSignal.timeout(15000));
      check(error, status);
      return data;
    },
    async compareAndSwap(rev, state) {
      const { data, error, status } = await client.from('user_state').update({ state })
        .eq('owner_id', ownerId).eq('rev', rev).select('owner_id,state,rev,updated_at')
        .maybeSingle().abortSignal(AbortSignal.timeout(15000));
      check(error, status);
      return data;
    }
  };
}
