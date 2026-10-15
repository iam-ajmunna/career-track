-- Additive v2 validation. Existing owner policies, grants, revisions and all rows are preserved.
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
      or entry.key !~ '^(sch-[a-z0-9-]+-[0-9]+|doc-[a-zA-Z0-9]+|ielts-[a-z0-9]+|ref-[ABC]-(confirmed|briefed|submitted)|goal-[a-z0-9-]+-[0-9]+)$'
      then return false; end if;
  end loop;
  for entry in select key, value from jsonb_each(payload->'applications') loop
    if entry.key !~ '^[a-z0-9-]+$' or entry.value not in ('"preparing"'::jsonb, '"submitted"'::jsonb, '"skipped"'::jsonb)
      then return false; end if;
  end loop;
  for entry in select key, value from jsonb_each(coalesce(payload->'pins','{}'::jsonb)) loop
    if entry.key !~ '^[a-z0-9-]+$' or entry.key in ('constructor','prototype','__proto__') or jsonb_typeof(entry.value) <> 'boolean' then return false; end if;
  end loop;
  for entry in select key, value from jsonb_each(coalesce(payload->'notes','{}'::jsonb)) loop
    if entry.key !~ '^[a-z0-9-]+$' or entry.key in ('constructor','prototype','__proto__') or jsonb_typeof(entry.value) <> 'string' or length(entry.value #>> '{}') > 8000 then return false; end if;
  end loop;
  for entry in select key, value from jsonb_each(coalesce(payload->'preferences','{}'::jsonb)) loop
    if entry.key = 'sortOrder' and entry.value in ('"best-first"'::jsonb,'"worst-first"'::jsonb) then continue; end if;
    if entry.key ~ '^enabled-(funding|work|career|spouse|pr)$' and jsonb_typeof(entry.value) = 'boolean' then continue; end if;
    if entry.key ~ '^weight-(funding|work|career|spouse|pr)$' and entry.value in ('1'::jsonb,'2'::jsonb) then continue; end if;
    return false;
  end loop;
  for entry in select key, value from jsonb_each(coalesce(payload->'ui','{}'::jsonb)) loop
    if entry.key not in ('unratedOpen','legacyImported') or jsonb_typeof(entry.value) <> 'boolean' then return false; end if;
  end loop;
  for entry in select key, value from jsonb_each(coalesce(payload->'tracking','{}'::jsonb)) loop
    if entry.key !~ '^[a-z0-9-]+$' or entry.key in ('constructor','prototype','__proto__') or entry.value not in ('"researching"'::jsonb,'"completed"'::jsonb) then return false; end if;
  end loop;
  for entry in select key, value from jsonb_each(coalesce(payload->'lifecycle','{}'::jsonb)) loop
    if entry.key !~ '^[a-z0-9-]+$' or entry.key in ('constructor','prototype','__proto__') or jsonb_typeof(entry.value) <> 'object'
      or coalesce(entry.value->>'status','') not in ('archived','trash','purged','expired')
      or coalesce(entry.value->>'at','') !~ '^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$' then return false; end if;
    if entry.value->>'status' = 'trash' and (coalesce(entry.value->>'purgeAt','') !~ '^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$' or (entry.value->>'purgeAt')::timestamptz <= (entry.value->>'at')::timestamptz) then return false; end if;
  end loop;
  for entry in select key, value from jsonb_each(coalesce(payload->'history','{}'::jsonb)) loop
    if entry.key !~ '^[a-z0-9-]+$' or jsonb_typeof(entry.value) <> 'object' or coalesce(payload->'lifecycle'->entry.key->>'status','') <> 'expired'
      or length(coalesce(entry.value->>'name','')) not between 1 and 180
      or coalesce(entry.value->>'deadline','') !~ '^\d{4}-\d\d-\d\d(T\d\d:\d\d:\d\dZ)?$'
      or coalesce(entry.value->>'expiredAt','') !~ '^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$' then return false; end if;
  end loop;
  return true;
exception when others then return false;
end;
$$;
commit;
