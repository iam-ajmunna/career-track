# 01 — Product & UX specification

## 1. Interpretation notes (decisions already taken)
| Owner wording | Implemented as |
|---|---|
| "ascending order … from completely matching to not matching any" | Default **best match first** (5/5 → 0/5). A selector "Least match first" reverses it. |
| "every possible country" | **All ISO regions (~265)** are in the list. Rated countries are shown in tiers; countries with no scholarship and no research go to a collapsed **"Not rated yet"** group so the screen stays usable. Nothing is hidden or deleted. |
| "each category must explicitly tell which requirement to sacrifice" | Tier header states how many requirements are sacrificed; inside each tier, **sub-groups share the exact same compromised requirements** and are headed `Compromise: <requirements>`; every country card repeats it in a sentence. |
| "currently working on … will take me to the specific category" | Pinned tray at top; card links to `#/scholarships/country/<CODE>?focus=<slug>`; that page **opens and scrolls to** the scholarship. |
| "according to my personalization" | A **My priorities** panel: enable/disable each requirement and mark it Important; tiers and sacrifices recompute. Defaults = all five on. |

## 2. Information architecture
Top-level tabs stay (muscle memory + keys 1–5): **Overview · Scholarships · Application Pipeline · Documents · Profile Fit**. Add **Settings** (key 6 / gear icon). Scholarships has three levels:

```
Level 1  #/scholarships                       Countries (tiers) + Currently working on
Level 2  #/scholarships/country/GB            One country: summary, scholarships, evidence
Level 3  #/scholarships/country/GB?focus=cw   Same page, scholarship "cw" opened and scrolled into view
```
There is no separate scholarship page: the existing detail content (checklist, notes, documents) renders inside the opened scholarship row (spec 03 §6).

## 3. Level 1 — Countries screen
**Purpose:** "Where should I focus, what do I give up there, and what am I already working on?"
```
┌ Currently working on (3) ───────────────────────────────────────────┐
│ [🇬🇧 Commonwealth  · 8d 02h  URGENT ▓▓▓▓░] [🇺🇸 KHS · 2d 07h ...]    │  ← sorted by nearest deadline
└─────────────────────────────────────────────────────────────────────┘
▸ My priorities  (5 toggles + Important + order)
Complete match                         Nothing to sacrifice · 2 countries
   (cards)
4 of 5 requirements met                You sacrifice 1 requirement · 5 countries
   Compromise: [Chance of getting PR]
      🇬🇧 United Kingdom  ●●●●○   ✓Funding ✓Work ✓Career ◐Spouse ✗PR
      You sacrifice: Chance of getting PR; Spouse accommodation (partly).
      3 scholarships · next deadline in 22d 04h
   Compromise: [Spouse accommodation]
      ...
3 of 5 … 2 of 5 … 1 of 5 … No requirement met
▸ Not rated yet · 240 countries   (collapsed)
```
- **Card = one big link** (whole card clickable), min touch target 44px.
- Chips always show **symbol + word**: ✓ met, ◐ partly, ✗ not met, ? not researched. Dashed/dotted borders encode partial/unknown (not colour alone).
- **Provisional** badge on any country whose ratings are unverified.
- Sort inside a sub-group: met count → weighted score → number of scholarships → name.
- Empty "Currently working on": one-line hint, no big empty box.
- Loading: skeleton for tray + first tier. Error loading data: message + Retry; never blank.

## 4. Level 2 — Country screen
```
← All countries
🇬🇧 United Kingdom  [Provisional]
●●●●○  4 of 5 requirements met
You sacrifice: Chance of getting PR.
Scholarships (3)                                  ← nearest deadline first
 ▸ Commonwealth  [✓Funding ✓Work ✓Career ◐Spouse ◐PR]   8d 02h URGENT   [Working on]
     provider · funding · deadline in provider zone AND Asia/Dhaka · official link
     (existing checklist / documents / notes render here)
     [☆ Mark as working on]
Why this country scores the way it does   (table: requirement | status | evidence + source + verified date)
```
- A scholarship row can override **Spouse** (e.g. institution family housing): the chip shows the scholarship's own level; the country level uses the **best** scholarship level.
- No scholarships: "No scholarship tracked for this country yet." (country evidence still shown).

## 5. Working-on behaviour
- Toggle exists on every scholarship row and in the existing detail view.
- Persisted (spec 04); instantly reflected in tray (optimistic) with a visible **Saved / Saving / Failed — Retry** indicator.
- Un-pinning never deletes progress.
- Submitted or closed scholarships stay pinned until the owner unpins, but show their state (`CLOSED`) instead of a countdown.

## 6. Accessibility & responsive
- Countries grid: 1 column ≤ 480px, auto-fill ≥ 280px cards above; tray cards ≥ 220px.
- Each tier is a `<section>` with an `<h2>`; sub-groups `<h3>`; cards are `<a>` inside `<ul>`; country evidence is a real `<table>` with `<th scope>`.
- Focus: visible outline; after arriving with `?focus=` the target `<summary>` receives focus.
- Countdown text is static text updated once a minute here (the 1-second hero timer is specified in spec 04 §7).

## 7. Whole-site UX clean-up (R-7)
**Limitation:** when this spec was written only the app shell of the live site was inspectable (five tabs, number-key shortcuts, "Dataset snapshot", a "Reset local progress" action). Layout/density of each tab could not be reviewed. Therefore step C1 begins with an **audit** and then applies the rules below; record findings in `AUDIT.md`.

**Audit protocol (C1-a):** screenshot every tab at 1440px and 390px, light/dark. For each tab list: (1) its single primary question, (2) elements that don't serve it, (3) duplicated information, (4) controls without labels, (5) text < 14px, (6) targets < 44px, (7) horizontal scroll, (8) empty/error states missing.

**Rules to apply (measurable):**
1. Each tab answers **one primary question** shown as the page heading's subtitle (Overview: "What should I do next?"; Scholarships: "Where should I apply and what do I give up?"; Pipeline: "What is due when?"; Documents: "What is ready?"; Profile Fit: "How strong am I?").
2. **Progressive disclosure:** secondary detail lives in `<details>`; max **7 ± 2** visible items per group before "Show more".
3. **One spacing scale** (4/8/12/16/24/32) and **one type scale** (12, 14, 16, 20, 28); body text ≥ 14px (prefer 16px on mobile).
4. **Overview** = hero "next deadline" (spec 04 §7) + **Currently working on** tray + at-most 5 "today" actions + three summary tiles. Remove statistics that don't drive an action.
5. **Search / filter** on Scholarships country screen: type-ahead on country name (`/` focuses it).
6. **Destructive actions** (current "Reset local progress") move to **Settings → Danger zone**, require typing `RESET`, and auto-download a JSON export first.
7. **Consistent naming:** use the requirement names from `requirements.js` everywhere.
8. **Sticky top bar** with tab nav and the Saved/Offline indicator; bottom tab bar on mobile (≤ 640px).
9. **Every list has an empty state and an error state** with a next action.
10. **Theme toggle** has an accessible name ("Switch to dark theme") and persists.
11. Preserve the current visual language (colours, radius, type); only reorganise and declutter.

## 8. Out of scope (do not build)
AI features, scraping, notifications beyond calendar (Telegram is a later phase), file uploads, multi-user, redesign of colour/brand.
