# Spec index — Career Track v2 upgrade kit

## Read order
1. `../AGENT_PROMPT.md` — rules, workflow, status protocol
2. `01-product-and-ux.md` — what the screens do and look like
3. `02-country-scoring.md` — data model, the five requirements, scoring + research rubric
4. `03-ui-implementation.md` — exact installation and wiring steps
5. `04-persistence.md` — Supabase, auth, import, keep-alive, countdown/ICS
6. `05-qa-acceptance.md` — tests and definition of done
7. `../STATUS.md` — live progress (read first every session)

## Kit layout (copy `kit/` → repo as shown in spec 03 §2)
```
kit/
  src/lib/{requirements,scoring,normalize,router,time,merge,store,supabase-adapter}.js
  src/views/{html,shared,working-tray,countries-view,country-view,scholarships-screen}.js
  src/styles/countries.css
  src/data/{iso-codes.json,countries.seed.json}
  scripts/{gen-countries.mjs,check-data.mjs}
  supabase/migrations/0001_user_state.sql  supabase/tests/isolation.test.sql
  tests/{logic.test.mjs,views.test.mjs}
  demo/index.html
```
Every file's full contents are embedded in the spec that uses it, so the specs alone are sufficient.

## Preview before touching the real site
```bash
cd kit && python3 -m http.server 8080     # then open http://localhost:8080/demo/
node --test tests/logic.test.mjs tests/views.test.mjs
```
The demo uses SAMPLE scholarships and provisional ratings. It shows the countries screen, a country page, the "Mark as working on" button, and the tray.

## Verification status of this kit (honest)
| Item | Status |
|---|---|
| Pure logic (scoring, grouping, normalisers, router, time) | **Tested**: 14 unit tests pass (Node 22): scoring, normalisers, router, time, union-merge, store |
| View rendering (HTML strings, escaping, deep link, tray order) | **Tested**: 3 smoke tests pass (17 total) |
| CSS, demo page | **Not visually verified** (no browser in the authoring sandbox) — check in a real browser |
| Supabase SQL, pgTAP test, adapter | **Not run** (needs your project) — written to current Supabase docs; verify at D1 |
| Country ratings | **Provisional** — hypotheses, not facts (spec 02 §6) |
| Existing repo/stack | **Not inspected** — repository was not accessible when this kit was written; step A0 is mandatory |
