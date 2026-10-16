---
version: alpha
name: "MSc Scholarship Command Center"
description: "A quiet, information-dense application workspace for navigating and executing fully funded MSc scholarship applications."
colors:
  background: "#f6f7f9"
  surface: "#ffffff"
  surfaceMuted: "#f0f2f5"
  text: "#15171a"
  muted: "#70757d"
  border: "#e2e5e9"
  success: "#1f7a4f"
  warning: "#8f6a12"
  danger: "#a43b3b"
  info: "#3867a7"
typography:
  sans:
    fontFamily: "Inter, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
  mono:
    fontFamily: "JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, monospace"
rounded:
  DEFAULT: "16px"
  sm: "9px"
  md: "11px"
  lg: "16px"
spacing:
  section-gap: "22px"
  card-padding: "20px"
  desktop-page-inline: "36px"
components:
  button: {}
  card: {}
  status-pill: {}
  search: {}
  dialog: {}
  toast: {}
---

# MSc Scholarship Command Center Design System

## Overview

### Creative North Star

A personal academic operations console: closer to a disciplined research workspace than a marketing dashboard. Dense information should feel calm, ordered, and immediately actionable.

### Product context and register

- **Audience and primary job:** one scholarship applicant managing deadlines, fit, documents, and application execution.
- **Target market(s) and evidence:** globally distributed MSc scholarships; the current portfolio is tailored to a Bangladeshi applicant.
- **Locale(s) and language policy:** English UI; scholarship names and official-source terminology are preserved.
- **Usage scene:** primarily desktop planning with responsive mobile review/check-off support.
- **Register:** product UI. Utility, hierarchy, and consistency outrank decoration.
- **Memorable signature:** monochrome operational surfaces with restrained semantic status chips and deadline-oriented data.
- **Restraint:** cards, buttons, and navigation remain visually quiet; status color is used only to encode meaning.
- **Anti-references:** no neon AI-dashboard styling, glass-heavy sci-fi chrome, oversized KPI theatrics, or marketing-style gradient CTAs.
- **Token ownership/runtime mapping:** this document mirrors the canonical CSS custom properties in `assets/styles.css`; runtime CSS remains the implementation source of truth. Durable token changes must update both files together.

## Colors

The light theme uses neutral gray surfaces and near-black text. Semantic colors are reserved for scholarship status, warnings, danger, and information. Dark mode preserves the same semantic hierarchy with brighter semantic values and darker surfaces. Focus uses a dedicated blue focus token rather than overloading status colors.

## Typography

Inter is the interface and reading face. JetBrains Mono is reserved for deadlines, ranks, keyboard hints, and compact technical values. Hierarchy is achieved through weight, scale, and spacing rather than decorative type treatments.

## Layout

Desktop uses a fixed navigation rail and fluid content column. All content grids use `minmax(0, 1fr)` to prevent long scholarship names or funding strings from forcing horizontal overflow. At 760px the sidebar becomes a horizontal navigation strip and the top bar returns to document flow. At 520px priority rows, cards, checklists, and dialog actions collapse deliberately instead of relying on accidental wrapping.

## Elevation & Depth

Borders and tonal surfaces carry most hierarchy. Shadows remain subtle and are limited to cards, dialogs, and temporary feedback. Sticky surfaces use translucency only where it improves orientation; mobile removes the sticky top bar to preserve viewport space.

## Shapes

Cards use the 16px family. Controls use 9–11px radii. Pills are reserved for statuses and compact metadata; they must never stretch to fill a flex row or resemble primary action buttons.

## Components

### Foundational visual states

All enabled controls expose hover, focus-visible, and pressed states. Focus-visible uses the dedicated focus token. Reduced-motion preference disables nonessential transitions and smooth scrolling. Disabled states retain geometry and reduce emphasis without becoming ambiguous.

### Buttons and actions

Primary actions are solid neutral controls. Secondary actions use bordered surfaces. Danger indicates critical deadlines and failures that need attention. Status pills are non-interactive and must not inherit button geometry.

### Navigation and data display

The sidebar establishes global navigation. Scholarship filters are an `aria-pressed` button group. Priority scholarship rows are native buttons so pointer, keyboard, and focus behavior stay consistent. Long names, providers, funding text, and deadlines may wrap without changing container width.

The Documents view is a dossier workspace rather than a flat checklist. Evidence is grouped by Identity, Academic Records, CV Variants, Statements & Essays, References, Testing and Evidence. IELTS and referee readiness are separate operational trackers because they have independent deadlines and dependencies.

### Forms and overlays

Search owns an explicit clear control whenever non-empty. Dialogs use native `<dialog>` with accessible names and app-owned deletion confirmation; browser `confirm()` is not used. Toasts acknowledge non-critical actions through a polite live region. Backup import uses a semantic file-picker button, an explicit preview/commit and persistent inline validation.

### Iconography

The interface uses minimal text/symbol controls rather than an icon library. Icon-only controls always have accessible names and tooltips.

### Motion

Motion is limited to brief hover/press feedback and toast entry. It communicates interactivity rather than adding ambient decoration.

### Content and data visualization

Copy is concise, operational, and specific. Status labels distinguish Open, Opens soon, Urgent, Upcoming, Watch, Closed and Ineligible. Fit scores are explicitly planning heuristics, not scholarship probabilities. Future calls without an official timetable must remain Watch/Upcoming rather than receiving invented dates.

## Do's and Don'ts

- **Do:** preserve the calm operations-console hierarchy and semantic status vocabulary.
- **Do:** let content wrap inside stable grid tracks instead of widening cards or the page.
- **Don't:** style informational badges as large action controls or allow flex stretching to change their meaning.
- **Don't:** introduce decorative gradients, excessive elevation, or color without semantic purpose.

### Workspace and save surfaces

The startup/recovery gate uses the existing card, neutral primary button, typography and spacing. The device workspace opens without authentication. **Saved on this device** appears only while the current local state has no failed write. Persistent recovery messages sit below the top bar; blocked storage and unreadable data have distinct copy. The active interface has no sign-in controls.

Countdowns use tabular monospace numerals, provider/Dhaka time labels, semantic urgency borders and quiet source links. Seconds update timer nodes only; screen readers receive urgency changes and final-day minute updates. Compact cards wrap at existing responsive breakpoints. Settings owns JSON export/import and backup-first typed reset.


### Country navigation and v2 surfaces

v2 retains the established palette, typography and radii. `src/styles/countries.css` adapts `--ct-*` to the existing runtime tokens; notably `--ct-border → --line` and requirement statuses → the existing success/warning/danger tokens. Country tiers and compact compromise chips replace the flat landing list. The tray is shared between Overview and Scholarships. A dedicated Settings view contains backups, explicit import and reset; the first five navigation positions are preserved. On screens at most 640px wide the same navigation becomes a horizontally scrollable bottom rail, with at least 44px actions. Body copy on the new surfaces is at least 14px. Small status metadata remains 12px. Focus rings use the existing focus token. Reduced-motion preference disables smooth transitions.

### V3 intelligence workspace — 16 October 2026

V3 extends the same operations-console design. `src/styles/intelligence.css` consumes the existing runtime tokens without a second palette. The explorer uses compact route rows, native select filters and explicit 12-item pagination. Filters, committed search, sort, intake and page live in the hash URL. Country results use explicit Load more. Individual guides use A–Q native disclosures, with local application stages above them and source provenance alongside factual claims. Document tables own horizontal scrolling; the surrounding page remains naturally scrollable. Native date/select popup geometry is deliberately platform-owned.

Global totals describe independent application windows and include urgent routes. Personal stages, eligibility, funding coverage, lifecycle and decisions use separate labeled controls. Mutations retain the shared device-save status and persistent recovery errors. V2 migration requires a downloadable backup and a preserved original key before V3 edits. Trash has no timer-driven deletion; permanent purge is explicit and backup-gated. No identity, academic result or application outcome is a public default.
