begin;

create or replace function public.career_valid_state(payload jsonb)
returns boolean language plpgsql immutable set search_path = '' as $$
declare entry record;
begin
  if jsonb_typeof(payload) is distinct from 'object'
    or octet_length(payload::text) > 131072
    or payload->'schema_version' is distinct from '1'::jsonb
    or jsonb_typeof(payload->'progress') is distinct from 'object'
    or jsonb_typeof(payload->'applications') is distinct from 'object'
    or jsonb_typeof(payload->'profile') not in ('object', 'null')
    or not (payload ? 'profile') then return false; end if;
  for entry in select key, value from jsonb_each(payload->'progress') loop
    if jsonb_typeof(entry.value) <> 'boolean'
      or length(entry.key) > 150
      or entry.key !~ '^(sch-[a-z0-9-]+-[0-9]+|doc-[a-zA-Z0-9]+|ielts-[a-z0-9]+|ref-[ABC]-(confirmed|briefed|submitted))$'
      then return false; end if;
  end loop;
  for entry in select key, value from jsonb_each(payload->'applications') loop
    if entry.key !~ '^[a-z0-9-]+$' or entry.value not in ('"preparing"'::jsonb, '"submitted"'::jsonb, '"skipped"'::jsonb)
      then return false; end if;
  end loop;
  return true;
end;
$$;
revoke all on function public.career_valid_state(jsonb) from public, anon;
grant execute on function public.career_valid_state(jsonb) to authenticated, service_role;

create table public.user_state (
  owner_id uuid primary key references auth.users(id) on delete restrict default auth.uid(),
  state jsonb not null default '{"schema_version":1,"progress":{},"applications":{},"profile":null}'::jsonb
    check (public.career_valid_state(state)),
  rev integer not null default 0 check (rev >= 0),
  updated_at timestamptz not null default clock_timestamp()
);
-- Only an administrator can provision the sole row; no "first caller wins" flow.
create unique index user_state_single_owner on public.user_state ((true));

create function public.career_bump_revision()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.owner_id <> old.owner_id then raise exception 'Owner identity is immutable' using errcode = '42501'; end if;
  new.rev := old.rev + 1;
  new.updated_at := clock_timestamp();
  return new;
end;
$$;
revoke all on function public.career_bump_revision() from public, anon, authenticated;
create trigger user_state_revision before update on public.user_state
  for each row execute function public.career_bump_revision();

alter table public.user_state enable row level security;
create policy owner_read on public.user_state for select to authenticated
  using (owner_id = (select auth.uid()));
create policy owner_update on public.user_state for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
revoke all on table public.user_state from public, anon, authenticated;
grant select on table public.user_state to authenticated;
grant update (state) on table public.user_state to authenticated;
grant all on table public.user_state to service_role;

create function public.get_career_state()
returns jsonb language sql volatile security invoker set search_path = '' as $$
  select jsonb_build_object('server_time', clock_timestamp(), 'snapshot',
    (select to_jsonb(s) from public.user_state s where owner_id = auth.uid()));
$$;
revoke all on function public.get_career_state() from public, anon;
grant execute on function public.get_career_state() to authenticated;

commit;
