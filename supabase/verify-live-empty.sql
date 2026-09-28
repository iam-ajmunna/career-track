-- Run only against an empty fresh-start project, using an administrator connection.
-- All synthetic identities and state are rolled back. Never remove the empty-state guard.
begin;
do $verify$
declare
  owner_test uuid := gen_random_uuid();
  other_test uuid := gen_random_uuid();
  snapshot jsonb;
  affected integer;
  denied boolean;
begin
  if exists (select 1 from public.user_state) then
    raise exception 'Verification requires an empty workspace; refusing to touch existing state';
  end if;
  insert into auth.users (id) values (owner_test), (other_test);
  insert into public.user_state(owner_id) values (owner_test);
  perform set_config('request.jwt.claim.sub',owner_test::text,true);
  execute 'set local role authenticated';
  snapshot := public.get_career_state();
  if snapshot->'snapshot'->>'owner_id' is distinct from owner_test::text then raise exception 'Owner read failed'; end if;
  update public.user_state set state=jsonb_set(state,'{progress,doc-passport}','true') where rev=0;
  get diagnostics affected = row_count;
  if affected <> 1 then raise exception 'Owner update failed'; end if;
  if (select rev from public.user_state) <> 1 then raise exception 'Revision trigger failed'; end if;
  update public.user_state set state=state where rev=0;
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'Stale CAS was accepted'; end if;
  denied := false;
  begin update public.user_state set rev=0; exception when insufficient_privilege then denied:=true; end;
  if not denied then raise exception 'Client controlled revision'; end if;
  denied := false;
  begin insert into public.user_state default values; exception when insufficient_privilege then denied:=true; end;
  if not denied then raise exception 'Client insert was accepted'; end if;
  perform set_config('request.jwt.claim.sub',other_test::text,true);
  if exists (select 1 from public.user_state) then raise exception 'Other owner could read state'; end if;
  if public.get_career_state()->'snapshot' <> 'null'::jsonb then raise exception 'Other owner RPC leaked state'; end if;
  update public.user_state set state=state;
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'Other owner could write state'; end if;
  execute 'set local role anon';
  denied := false;
  begin perform 1 from public.user_state; exception when insufficient_privilege then denied:=true; end;
  if not denied then raise exception 'Anonymous read was accepted'; end if;
  denied := false;
  begin perform public.get_career_state(); exception when insufficient_privilege then denied:=true; end;
  if not denied then raise exception 'Anonymous RPC was accepted'; end if;
  execute 'reset role';
end;
$verify$;
rollback;
select 'passed; synthetic identities and state rolled back' as verification,
  (select count(*) from public.user_state) as workspace_rows,
  (select count(*) from auth.users) as auth_users;
