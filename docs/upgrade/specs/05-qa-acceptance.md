# 05 — QA and acceptance

## 1. Automated (must be green before every commit)
```bash
npm test                                   # 17 tests (kit) + any app tests
node scripts/check-data.mjs /tmp/n.json    # OK: <n> scholarships
npm run build                              # production build succeeds
```
After D1 also run `supabase test db` (isolation) against the **dev** project, never production.

## 2. Manual acceptance checklist (record pass/fail + date in STATUS.md)
Run each at **≥1280px** and **≈390px**, in **light and dark**, using **keyboard only** at least once.

### Scholarships tab (R-1 … R-6)
| # | Check | Pass when |
|---|---|---|
| S1 | Open Scholarships | Country names appear first; no flat scholarship list |
| S2 | Tiers | Top tier is the best match; tiers descend; "No requirement met" last among rated; "Not rated yet" collapsed at bottom |
| S3 | Explicit compromises | Every sub-group header reads `Compromise: …`; every card has a "You sacrifice: …" sentence; complete matches say "Nothing to sacrifice" |
| S4 | Partial/unknown | Chips show ◐/? with words; dashed/dotted outline; not colour-only |
| S5 | Open a country | All its scholarships listed nearest-deadline first; evidence table present; no-scholarship country shows the empty message |
| S6 | Pin | "Mark as working on" → appears in the top tray immediately; survives reload |
| S7 | Tray link | Clicking a tray card opens the country page with that scholarship **expanded and focused** |
| S8 | Unpin | Disappears from tray; progress/ticks untouched |
| S9 | Priorities | Turning a requirement off recomputes tiers; "Least match first" reverses order |
| S10 | Deep link | Reloading `#/scholarships/country/GB?focus=<slug>` restores the same view |
| S11 | Keys | `2` goes to level 1 from anywhere in the tab; Tab/Enter/Space operate everything; focus visible |
| S12 | Unknown country | `#/scholarships/country/ZZ` shows "Unknown country." with a way back |

### Persistence (R-8)
| # | Check | Pass when |
|---|---|---|
| P1 | Tick → refresh | Still ticked |
| P2 | Second browser/device, sign in | Same ticks/pins visible within one load |
| P3 | Other Google account / signed-out | Cannot read or write (isolation test + manual) |
| P4 | Block the network and tick | Visible **Failed — Retry**; after reconnect + Retry it saves; reload shows it |
| P5 | Legacy import twice | Second dry-run says "0 new"; nothing changes |
| P6 | Clear site data, sign in | Everything returns from the server |
| P7 | Two devices edit the same item | No silent loss: conflict message or union result |
| P8 | Keep-alive | Vercel shows the daily cron ran with 200 |

### Data & deadlines (R-3, R-9)
| # | Check | Pass when |
|---|---|---|
| D1 | Every scholarship has `countryCode` | `check-data` OK |
| D2 | Countries list | ≈265 regions present; rated ones in tiers; none duplicated |
| D3 | Deadline display | Provider-zone and Dhaka times both shown; correct across London 25 Oct 2026 clock change |
| D4 | ICS | Imported event time equals the official source time |
| D5 | Ratings | Any rating without source/date still shows **Provisional** |

### UX clean-up (R-7)
Tick each rule from spec 01 §7 and attach before/after screenshots in `docs/upgrade/ux/`.

## 3. Definition of done
All S/P/D checks pass; UX rules applied or explicitly deferred in STATUS.md with a reason; PR from `personal-dynamic` to `main` open with checklist results; the owner merges (agents never merge to `main`).
