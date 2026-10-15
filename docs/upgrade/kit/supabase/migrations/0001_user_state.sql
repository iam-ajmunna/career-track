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
