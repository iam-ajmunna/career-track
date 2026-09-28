# Fresh start — 28 September 2026

The owner explicitly instructed: no actual progress needs migration; start over.

This decision supersedes the legacy-export and mandatory-import prerequisites in `ARCHITECTURE.md` sections 27.3, 27.8 and 27.9 and the earlier E-0 handoff. New server progress is `{}`. The app never reads or automatically imports `scholarship-progress`. Existing scholarship definitions and the personal profile remain; only completion history starts empty.

Implementation proceeds on `personal-dynamic`. The baseline commit and local annotated recovery tag already exist. Publishing the remote recovery tag remains a cutover task, not a blocker to isolated implementation. No force-push, production merge or remote data deletion is authorized by this decision.

## Data and authorization decisions

- One `public.user_state` row, created only by an administrator for the verified Google owner. A unique constant index limits the table to one row.
- Browser users receive SELECT and UPDATE(state), never INSERT/DELETE. Owner RLS protects both reads and updates. A second authenticated account cannot create its own row.
- Compare-and-swap updates require the last observed revision. A database trigger controls revision and server timestamps.
- Online intentional unchecks apply when the base revision is current. Conflict/offline recovery unions completions; a stale uncheck never clears a remotely completed task. The UI reports when an uncheck needs to be repeated after synchronization.
- Pending local changes are account-scoped and durably cached separately from the last confirmed snapshot. Explicit sign-out first requires pending work to be saved or exported, then clears account caches. Expired sessions retain safe progress drafts until the same owner signs in again.
- Private profile data is seeded into authenticated state and excluded from the public build output.
- Missing cloud configuration fails closed at the sign-in screen; no fake success or anonymous editable mode.

See `UX-CONTRACT.md` for observable behavior and `docs/DEPLOYMENT.md` for cloud setup and release gates.
