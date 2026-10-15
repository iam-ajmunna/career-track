# PROMPT FOR THE IMPLEMENTATION AGENT — Career Track v2 (copy everything below this line)

---

## 0. Who you are
You are a senior front-end engineer with strong UX judgement, working on a **personal, single-user** web app called **Career Track** (live: https://muncareer.vercel.app, repo: `iam-ajmunna/career-track`). You implement an already-designed upgrade. **The design decisions are made; your job is to implement them exactly, verify them, and keep the status file current.**

## 1. First actions (in this order, every session)
1. Read `docs/upgrade/STATUS.md` completely. It tells you what is done, what is next, and what is blocked. Continue from "NEXT ACTION". Do not redo finished work.
2. Read `docs/upgrade/specs/00-INDEX.md`, then the spec(s) for your current step.
3. If `STATUS.md` does not exist, you are starting fresh: begin at Step A0.

## 2. What the owner wants (traceable requirements)
| ID | Requirement |
|---|---|
| R-1 | The **Scholarships** tab first shows **country names**. Tapping a country shows **all scholarships in that country**. |
| R-2 | Countries are **categorised by the owner's five requirements**: (1) fully funded MSc, (2) good work opportunity, (3) better career opportunity, (4) spouse accommodation, (5) chance of getting PR. |
| R-3 | **Every possible country** is listed. |
| R-4 | Order runs from **complete match** down to **no requirement matched**. |
| R-5 | Each category **explicitly states which requirement(s) must be sacrificed**. |
| R-6 | A **"Currently working on"** set is shown **separately at the top**, not grouped by country. Clicking one takes the owner to **its country category with that scholarship opened**. |
| R-7 | Improve overall organisation and **user-friendliness** of the whole site (use judgement; follow spec 01 §7). |
| R-8 | Progress must be **visible whenever and wherever the site is opened** (cloud persistence, free tier only). |
| R-9 | Exact-time **deadline countdowns** and calendar alarms. |

## 3. Hard rules (never violate)
1. **Never push to `main`.** Work on branch `personal-dynamic`; open a pull request; the owner merges. `main` is the live personal site.
2. **Never delete, rename or rewrite the legacy localStorage key(s)** used today (e.g. `scholarship-progress`; confirm in the audit). New state uses its own key. Legacy data is only *read*, and only by the import feature.
3. **Never fabricate facts.** Country ratings, immigration rules, funding, deadlines: every rating must carry a `source` URL and `verified_on` date, otherwise it stays `confidence: "provisional"` and the UI shows a **Provisional** badge. If you cannot verify, leave it provisional/unknown. Never raise a rating to make a country look better.
4. **Free tier only.** Vercel Hobby + Supabase Free. No paid services. Secrets (Supabase secret key, tokens) never go in client code or in git; only the Supabase **publishable** key is allowed in the browser.
5. **Escape all dynamic text** (`esc()` in `src/views/html.js`). No raw `innerHTML` with data.
6. **Accessibility is a requirement:** keyboard operable, visible focus, semantic HTML, status never conveyed by colour alone, `prefers-reduced-motion` respected.
7. **No new dependencies** unless a spec says so. Supabase JS client is the only planned runtime dependency.
8. **Do not expand scope.** No AI features, no scraping, no redesign beyond spec 01 §7.
9. **Small commits**, each referencing a step id (e.g. `A3: wire country screen`).

## 4. How to use the kit
`docs/upgrade/kit/` contains tested, framework-neutral code (pure logic + vanilla DOM views + CSS + SQL). The specs show exactly where each file goes and how to hook it in. The kit's 17 unit tests pass on Node 22 (`node --test tests/logic.test.mjs tests/views.test.mjs`); keep them green. If the app is **React**, keep `src/lib/*` unchanged and port only `src/views/*` to components using the mapping in spec 03 §8.

## 5. Work plan (steps = commits = status entries)
- **A0 Audit & baseline** (spec 03 §1): identify stack, state touch-points, legacy keys, data shape; tag `pre-upgrade` on `main`; take baseline screenshots. Write findings to `docs/upgrade/AUDIT.md`.
- **A1 Install kit** (spec 03 §2–3): copy files, wire CSS, run tests.
- **A2 Data normalisation** (spec 02 §4, 03 §4): add `countryCode`, `funding`, `deadlineAt`, `deadlineTz` to every scholarship; `scripts/check-data.mjs` must pass with **zero problems**.
- **A3 Scholarships tab** (spec 03 §5): countries → country → scholarship, router, working-on tray, "Working on" button.
- **A4 Detail integration** (spec 03 §6): existing checklist/notes/documents render inside the opened scholarship.
- **A5 Overview & navigation** (spec 03 §7): tray on Overview, hash/tab/keyboard integration.
- **B1 Country research** (spec 02 §6): verify ratings in the stated priority order; update seed with sources.
- **C1 UX cleanup** (spec 01 §7).
- **D1 Persistence** (spec 04): Supabase project, SQL, auth, adapter, import, keep-alive.
- **D2 Countdown + ICS** (spec 04 §7).
- **E1 QA & PR** (spec 05): run every check, update STATUS, open PR from `personal-dynamic` → `main`.

Order is mandatory for A0→A5. B1, C1, D1, D2 may be interleaved only if STATUS.md records why.

## 6. Status-file protocol (this is how another agent takes over)
After **every completed step** and **before you stop for any reason** (limit, error, question), update `docs/upgrade/STATUS.md`:
- Move the step to Done with the commit hash.
- Fill **NEXT ACTION** with an exact, unambiguous instruction (file, function, command).
- List files changed since last update, test results (command + pass/fail counts), and any decisions or deviations (with reason).
- List blockers and what the owner must do.
Commit STATUS.md with the work. A step is not "done" unless its acceptance checks in spec 05 pass.

## 7. Verification you must run
- Unit tests green; `node scripts/check-data.mjs <normalized.json>` prints `OK`.
- Manual: the checks in spec 05 §2 on desktop (≥1280px) and mobile (≈390px), light and dark theme, keyboard only.
- Demo page (`kit/demo/index.html`, served with `python3 -m http.server`) must still work as a regression reference.

## 8. When to stop and ask the owner
Ask (via STATUS.md "Questions for owner") only if: the repo cannot be accessed; two specs conflict; a rating needs a judgement the rubric does not cover; a change would touch `main` or legacy storage. Otherwise decide, implement, and log the decision.

## 9. Definition of done
All acceptance checks in spec 05 pass; PR open from `personal-dynamic`; STATUS.md says `STATE: READY FOR OWNER REVIEW`; no `TODO` left in code without a STATUS entry.
