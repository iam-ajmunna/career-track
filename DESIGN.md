---
version: alpha
name: "Career Track v2"
description: "A calm academic operations workspace for persistent, profile-aware scholarship discovery and application management."
colors:
  background: "#f5f6f8"
  surface: "#ffffff"
  surfaceMuted: "#f0f2f5"
  text: "#11151b"
  muted: "#6c7480"
  border: "#dfe3e8"
  success: "#19724a"
  warning: "#9a6b10"
  danger: "#a23e3e"
  info: "#386aa8"
typography:
  sans:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
rounded:
  DEFAULT: "18px"
  sm: "10px"
  md: "14px"
  lg: "18px"
spacing:
  section-gap: "24px"
  page-inline: "clamp(20px, 4vw, 54px)"
components:
  button: {}
  panel: {}
  scholarship-card: {}
  status-control: {}
  search: {}
  dialog: {}
---

# Career Track v2 Design System

## Overview

### Creative North Star

Career Track should feel like a personal academic operations desk: structured, evidence-led, calm under deadline pressure, and credible enough for students to trust with scholarship decisions.

### Product context and register

- **Audience and primary job:** students researching, evaluating, saving, and executing scholarship applications.
- **Target market(s):** global scholarship applicants; no geography-specific visual assumptions.
- **Locale:** English in v2; localization must remain structurally possible.
- **Usage scene:** desktop-first research and planning with fully usable mobile status/checklist updates.
- **Register:** product application, not marketing dashboard.
- **Memorable signature:** profile-aware scholarship cards pair one compact fit score with direct source evidence and application state.
- **Restraint:** no decorative AI chrome, no fake certainty, no oversized gradients, no gamification around acceptance probability.
- **Anti-references:** crypto dashboards, neon AI assistants, social feeds, and admissions sites that obscure source evidence.
- **Token ownership:** runtime values live in `web/styles.css`; this file records intent and durable mapping.

## Colors

Neutral surfaces dominate. Semantic color is reserved for system state, warnings, success, and destructive actions. Scholarship fit is expressed numerically and textually, not through aggressive traffic-light coloring.

## Typography

The system sans stack prioritizes availability and rendering stability. Small uppercase eyebrows are reserved for navigation/context labels. Scholarship titles use compact bold type. Dense metadata remains readable at 11–12px but never carries critical information exclusively.

## Layout

A fixed desktop sidebar anchors global navigation. The content region uses fluid padding and minmax-based grids to avoid overflow. At tablet/mobile widths the sidebar becomes a horizontal navigation strip and content collapses to one column. Scholarship cards never require horizontal scrolling.

## Elevation & Depth

Panels use thin borders plus one restrained shadow token. Modal dialogs may use stronger depth. Navigation and cards should remain visually quiet so deadlines, source evidence, and fit rationale carry attention.

## Shapes

Panels use 18px radii, controls 10–14px, and metadata tags use compact rounded rectangles. Pill shapes are reserved for small filters/tags only.

## Components

### Foundational visual states

Every interactive control requires hover, focus-visible, active, disabled/busy states. Reduced-motion preference is respected. Async search uses a stable status row rather than replacing page geometry.

### Buttons and actions

Primary actions represent explicit commits: sign in, create account, research, save profile, analyze CV. Secondary actions open detail or alter non-destructive tracking state. Destructive behavior is visually isolated.

### Navigation and data display

Dashboard summaries lead to scholarship cards rather than becoming decorative KPIs. Cards always expose source/provider, fit score, funding/deadline evidence when available, and persistent status controls.

### Forms and overlays

Forms use real labels and application-owned validation messaging. CV upload has a file-picker fallback. Scholarship details use native modal dialog semantics. Browser-native alert/confirm/prompt are prohibited.

### Iconography

Minimal symbol usage. Icon-only actions require an accessible label and should not replace text where scholarship workflow meaning is ambiguous.

### Motion

Motion is limited to spinner/status feedback, button state changes, and short toast entry. Reduced-motion disables animation.

### Content and data visualization

The interface must distinguish:
- source facts,
- AI-extracted structured data,
- profile-fit analysis,
- user-maintained workflow state.

A fit score is an evidence-fit heuristic, **not an admission probability**.

## Do's and Don'ts

- **Do:** keep every scholarship linked to a reviewable source.
- **Do:** preserve user edits/status/checklists as server-backed state.
- **Do:** clearly show when local AI is unavailable and fallback logic is active.
- **Don't:** imply guaranteed eligibility, funding, or acceptance.
- **Don't:** hide uncertainty behind polished visual scoring.
