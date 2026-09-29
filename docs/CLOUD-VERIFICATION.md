# Supabase cloud verification — 28 September 2026

Project `career-track` (`yqqcfonzkkrboghhfbdx`) was created in the approved `munspace` organization, Singapore region, after the connector confirmed a $0/month project cost. The project is healthy and runs PostgreSQL 17. The exact repository migration `supabase/migrations/202609280001_user_state.sql` was applied successfully.

## Live database checks

`supabase/verify-live-empty.sql` ran against the deployed database through an administrator connection. It inserted two synthetic identities and one workspace inside a transaction, tested authenticated/anonymous roles and JWT subject claims, and rolled everything back.

| Check | Observed result |
|---|---|
| Owner RPC/read | Returns only the matching owner's snapshot |
| Owner state update at revision 0 | One affected row, database advances revision to 1 |
| Stale update at revision 0 | Zero affected rows |
| Client revision update or row insert | Denied by privileges |
| Other authenticated account | No row/RPC snapshot; update affects zero rows |
| Anonymous table/RPC | Denied by privileges |
| RLS and grants inspection | RLS enabled; no anonymous SELECT, client INSERT/DELETE or revision UPDATE; authenticated UPDATE(state) allowed |
| Security and performance advisors | No findings returned |
| Final row counts | `public.user_state = 0`, `auth.users = 0` |

The deployed functions are security-invoker functions with empty `search_path`. Single-owner and immutable-owner constraints are installed by the migration and covered by the local PostgreSQL-compatible tests.

## Public API checks

Requests used only the project's modern publishable key, with no user session:

| Request | Result |
|---|---|
| `GET /rest/v1/user_state?select=owner_id` | HTTP 401, SQLSTATE `42501`, permission denied for table |
| `POST /rest/v1/rpc/get_career_state` | HTTP 401, SQLSTATE `42501`, permission denied for function |
| `GET /auth/v1/settings` | Google disabled; email enabled; signup disabled = false |

No credential, secret key or token is stored in this evidence. Public project identifiers and the publishable browser key are in `supabase/project.json`; explicit build environment variables may override them.

## Remaining acceptance

Google provider credentials, exact redirect URLs and signup restrictions still need configuration. No real owner account or progress row exists. SQL role simulation does not verify Google's redirect/session flow or authenticated PostgREST claims. Those require a real owner sign-in, empty owner provisioning, and the preview/device checks in `DEPLOYMENT.md` before merging to main.
