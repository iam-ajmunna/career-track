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
