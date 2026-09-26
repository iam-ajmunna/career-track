# MSc Scholarship Command Center — Personal 2027 Portfolio

A dependency-free scholarship planning dashboard tailored to **Assaduzzaman Munna's 2027 fully funded MSc applications**.

Scholarship information was last manually verified against official sources on **26 Sep 2026**. Deadline countdowns are calculated from the current browser date; calls marked **Watch** still require official re-verification before relying on them.

## Current portfolio

### Active / opening
- Commonwealth Master's Scholarship
- KAUST MSc Fellowship
- MBZUAI MSc + merit-funding route
- Oxford MSc Advanced Computer Science + Weidenfeld-Hoffmann
- Oxford Clarendon Fund
- Cambridge MPhil Advanced Computer Science + Gates Cambridge
- Knight-Hennessy Scholars

### Scheduled / upcoming
- Erasmus Mundus EDISS — opens 16 Nov 2026
- Commonwealth Shared Scholarship — expected early Nov 2026; exact candidate dates/course list pending
- Türkiye Scholarships Graduate — official programme uses a recurring 10 Jan–20 Feb window; confirm the 2027 announcement

### Watch / next cycle
- Stipendium Hungaricum — Bangladesh is an eligible sending partner; 2027/28 call pending
- Global Korea Scholarship Graduate (GKS-G) — general 2027 graduate call pending
- MEXT Research Student Scholarship — 2027 Bangladesh embassy-recommendation route already closed; prepare for the next relevant route

### Not eligible this cycle
- Chevening — retain for a later cycle after satisfying the applicable post-degree experience/timing rules

## Application operating system

The dashboard now tracks four layers:

1. **Scholarship portfolio** — status, funding, deadline, fit, official sources and scholarship-specific execution steps.
2. **Master dossier** — identity, academic records, CV variants, statements, references, testing and evidence.
3. **English-test strategy** — portfolio target of IELTS Academic 7.5+ overall with no component below 7.0, chosen to satisfy the highest published threshold among the currently tracked KAUST/Cambridge/EDISS routes.
4. **Three-referee system** — confirmation, evidence briefing and submission tracking for three core referees.

## Master narrative architecture

- **Research / technical:** KAUST, MBZUAI, Oxford, Cambridge, EDISS.
- **Development impact:** Commonwealth Master's, Commonwealth Shared, Weidenfeld-Hoffmann.
- **Leadership / civic:** Gates Cambridge and Knight-Hennessy only where authentic evidence supports the case.
- **Future research-plan route:** MEXT.

Do not send one generic SOP to every scholarship. Build from one evidence bank and tailor the selection logic, research fit, development impact and leadership emphasis.

## Progress persistence

Progress remains stored locally in the browser using `localStorage`.

Existing progress keys from the original dashboard were preserved. New dossier, IELTS and referee milestones add new keys without invalidating previously checked Commonwealth/KAUST/document steps.

Clearing browser storage or using **Reset local progress** will reset that device's progress.

## Run locally

Because the app uses ES modules, serve the repository rather than opening `index.html` directly:

```bash
python3 -m http.server 8080
```

Then open:

```text
http://localhost:8080
```

## Architecture

```text
index.html
assets/
  styles.css
src/
  data.js   # profile, scholarship portfolio, dossier, IELTS/referee plan, timeline
  app.js    # derived statuses, rendering, filtering, progress persistence
DESIGN.md
```

## Important

This branch is the **personal portfolio**. Scholarship rules, eligible courses, funding terms and deadlines can change. Always use the linked official source before submitting or spending money on application-related services.
