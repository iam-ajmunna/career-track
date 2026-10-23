# coding.md — Exact implementation reference (Career Track v4)

Every value here is binding. Where a value is *tested* it is marked **[T]** (covered by `tests/*.test.mjs`, 26 tests passing on Node 22). Visual CSS is **[V?]** = written to the spec but not screenshot-verified in the authoring sandbox; check in a real browser. Provider/API field names are **[U]** = unverified.

---

## 1. Conventions
| Topic | Rule |
|---|---|
| Language | Plain ES2023 modules, no TypeScript, no framework, no new dependency. |
| Naming | CSS: BEM (`block__element--modifier`). JS: files `kebab-case.js`, functions `camelCase`, constants `UPPER_SNAKE`. |
| IDs | Only for landmarks and single instances: `#appShell #mainNav #main #pageTitle #pageSub #globalSearch #themeToggle #accountBtn #accountMenu #drawer #scrim #toastRoot #syncPill`. |
| Data attributes | Behaviour hooks only (never styling): `data-nav`, `data-view`, `data-add-to-list`, `data-dismiss-match`, `data-open-opportunity`, `data-month-prev/next/today`, `data-v` (progress value), `data-p` (ring value), `data-u` (countdown unit), `data-urgency`, `data-type`, `data-out`, `data-today`. |
| Events | One delegated `click` and one delegated `change` listener per view root (`root.addEventListener`), each branching on `closest('[data-…]')`. No inline handlers. |
| Templating | `html` tagged template from `src/ui/html.js`. Interpolations are escaped; `raw()` only for already-safe fragments. URLs → `safeHref()`. |
| Units | `px` for fixed UI, `rem` never mixed in; line-height is always specified with font-size (tokens). Numbers in `--mono` with `tabular-nums`. |
| Inline styles | Not used in production markup. Widths/rings come from `data-v` / `data-p` and `hydrate()` (CSSOM). The preview page uses inline styles for brevity only. |
| Time | Deadlines are UTC instants (`precision:'exact'`) or a published date (`date-only`). Never construct a time from date-only text. Display zones: provider IANA zone + `Asia/Dhaka` (user-configurable). |

## 2. Files to install (from `kit/`)
| Kit path | Repo path | Notes |
|---|---|---|
| `next/index.html` | `next/index.html` → built to `dist/next/index.html` | Parallel entry `/next/` (same origin ⇒ same saved data). Section 5 + AUDIT §9 |
| `src/styles/tokens.css`, `src/styles/app.css` | same; **add to the copy list in `scripts/build.mjs`** as `assets/tokens.css`, `assets/app4.css` | Section 6 |
| `src/ui/html.js`, `components.js` | same | Section 9 |
| `src/ui/icons.js` | new (sprite symbols, Section 5.3) | |
| `src/app/router.js`, `ticker.js` | same | Sections 8, 9 |
| `src/features/dashboard/{countdown,model}.js` | same | |
| `src/features/calendar/grid.js` | same | |
| `src/features/radar/match.js` | same | |
| `scripts/radar/refresh.mjs`, `.github/workflows/radar-refresh.yml` | same | Section 11 |
| `tests/v4.test.mjs`, `tests/radar.test.mjs` | same | Section 15 |
| `src/v4/adapter.js` | same | Section 9 (tested against the real domain shapes) |
| `src/v4/bootstrap.js` | copy of `src/bootstrap.js` with the dynamic import changed to `./workspace.js` (v4) | Section 17 |
| `src/v4/workspace.js` | new; exports the same functions `bootstrap.js` expects from v3 | Section 17 |
| `tests/adapter.test.mjs`, `tests/fixtures/domain.real.js` | same | Fixture is a verbatim copy of real functions for sandbox runs; in the repo import `../src/v3/domain.js` instead |
| `preview/index.html` | `docs/v4/kit/preview/` (reference only) | |

---

## 3. Colour system (exact values)
Light is default. Dark applies with `[data-theme="dark"]`, or automatically when the OS prefers dark and `data-theme="light"` is not set.

| Token | Light | Dark | Use |
|---|---|---|---|
| `--bg` | `#F6F7F9` | `#0F1114` | Page background |
| `--surface` | `#FFFFFF` | `#171A1F` | Cards, sidebar, inputs |
| `--surface-2` | `#F0F2F5` | `#1D2127` | Inset panels, hover, lanes |
| `--surface-3` | `#E8EBEF` | `#262B33` | Progress tracks, pressed, skeleton |
| `--line` | `#E2E5E9` | `#2B3139` | 1 px borders |
| `--line-strong` | `#C9CED6` | `#3A424D` | Input borders |
| `--text` | `#15171A` | `#F3F5F7` | Primary text |
| `--text-2` | `#454B54` | `#C6CBD2` | Secondary text |
| `--muted` | `#5B616B` | `#9AA2AD` | Helper text |
| `--brand` | `#3451D1` | `#8DA2FB` | Primary buttons, links, active nav, progress |
| `--brand-ink` | `#2A41A8` | `#B7C4FD` | Text on `--brand-soft` |
| `--brand-soft` | `#EBEEFA` | `#282D3E` | Active nav bg, brand chips |
| `--on-brand` | `#FFFFFF` | `#0F1114` | Text on `--brand` |
| `--success` / soft | `#1B6F48` / `#E8F1EC` | `#71C89A` / `#243230` | Open, ready, opens |
| `--warning` / soft | `#7F5E0E` / `#F2EFE7` | `#DEC06D` / `#33312A` | Provisional, in progress, unconfirmed |
| `--danger` / soft | `#A43B3B` / `#F6EBEB` | `#E77C7C` / `#34282C` | Not met, urgent/high |
| `--critical` / soft | `#B42318` / `#FBEAE8` | `#FF8A80` / `#3A2626` | Critical, final hours, closes |
| `--info` / soft | `#3867A7` / `#EBF0F6` | `#81AEE9` / `#262F3B` | Submitted, milestone |
| `--focus` | `#3451D1` | `#9ABCE7` | Focus ring (2 px outline, 2 px offset) |

**Contrast (WCAG ratio, computed from `tokens.css`; all ≥ 4.5 for text, focus ≥ 3):**

| Pair | Light | Dark |
|---|---|---|
| `--text` on `--surface` | 17.96 | 15.96 |
| `--text` on `--bg` | 16.75 | 17.30 |
| `--text-2` on `--surface` | 8.80 | 10.69 |
| `--text-2` on `--surface-2` | 7.84 | 9.91 |
| `--muted` on `--surface` | 6.24 | 6.77 |
| `--muted` on `--surface-2` | 5.56 | 6.27 |
| `--muted` on `--bg` | 5.82 | 7.33 |
| `--muted` on `--surface-3` | 5.22 | 5.52 |
| `--brand` on `--surface` | 6.47 | 7.22 |
| `--brand` on `--bg` | 6.04 | 7.83 |
| `--on-brand` on `--brand` | 6.47 | 7.83 |
| `--brand-ink` on `--brand-soft` | 7.50 | 8.03 |
| `--success` on `--surface` | 6.15 | 8.66 |
| `--success` on `--success-soft` | 5.34 | 6.63 |
| `--warning` on `--surface` | 5.98 | 9.86 |
| `--warning` on `--warning-soft` | 5.21 | 7.35 |
| `--danger` on `--surface` | 6.43 | 6.29 |
| `--danger` on `--danger-soft` | 5.51 | 5.10 |
| `--critical` on `--surface` | 6.57 | 7.64 |
| `--critical` on `--critical-soft` | 5.65 | 6.19 |
| `--info` on `--surface` | 5.73 | 7.61 |
| `--info` on `--info-soft` | 5.00 | 5.90 |
| `--focus` on `--surface` | 6.47 | 8.90 |

*Fixes vs v3:* `--muted` was `#70757D` (4.13 on `--surface-2`, fail) → `#5B616B`; warning was `#8F6A12` (4.42 on `--surface-2`, fail) → `#7F5E0E`; success `#1F7A4F` (4.44 on `--surface-3`) → `#1B6F48`.

**Urgency → visual (text chip + hero left border, never colour alone)**
| Remaining | key | label | chip class | hero border |
|---|---|---|---|---|
| ≥ 30 d | `normal` | (none) | — | `--info` |
| 14–30 d | `attention` | Attention | `chip--warning` | `--warning` |
| 7–14 d | `high` | High | `chip--danger` | `--danger` |
| 3–7 d | `urgent` | Urgent | `chip--danger` | `--danger` |
| 1–3 d | `critical` | Critical | `chip--critical` | `--critical` |
| < 24 h | `final` | Final hours | `chip--critical` | `--critical` |
| ≤ 0 | `closed` | Closed | `chip--neutral` | — |

**Requirement chips:** ✓ met → `chip--success` (solid); ◐ partly → `chip--warning` (dashed outline); ✗ not met → `chip--danger`; ? unknown → `chip--unknown` (dotted).

## 4. Typography, space, shape, motion, layout
| Token | Value |
|---|---|
| `--sans` | `"Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif` |
| `--mono` | `"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace` |
| Display (countdown) | 40/44 mono 600, −0.04em, tabular (32/36 under 760 px; days-only hero 56/60) |
| H1 | 28/34, 700, −0.03em · H2 20/28, 700, −0.02em · H3 16/24, 700 |
| Body | 15/24, 400 · Small 13/20 · Micro 12/16 (eyebrows: 600, uppercase, +0.12em) |
| Space | 4, 8, 12, 16, 20, 24, 32, 40, 48 px (`--s-1`…`--s-12`) |
| Radius | 6 / 9 / 12 / 16 / 20 / 999 px (`--r-xs … --r-pill`) |
| Elevation | `--shadow-1` cards · `--shadow-2` hover · `--shadow-3` drawer/menu/toast |
| Focus ring | `outline: 2px solid var(--focus); outline-offset: 2px` + input ring `0 0 0 3px` 24 % focus |
| Motion | 120 ms (hover/press), 200 ms (toast, menu), 320 ms (drawer, bar fill); easing `cubic-bezier(.2,.8,.2,1)`; all 0 ms under `prefers-reduced-motion` |
| Z-index | sticky 10 · drawer 40 · dialog 50 · toast 60 |
| Layout | sidebar 248 px (216 ≤ 1080 px); topbar 64 px; page padding 32 / 24 / 16 px; content max 1280 px; bottom nav 64 px ≤ 760 px |
| Breakpoints | ≤ 1180 px: dashboard single column · ≤ 1080 px: narrower sidebar · ≤ 760 px: bottom nav, agenda-only calendar, full-screen drawer |
| Touch targets | ≥ 44 × 44 px (buttons, nav, inputs); `btn--sm` 36 px only inside cards with ≥ 8 px gaps |

---

## 5. Application shell (`index.html`)

### 5.1 Markup (canonical) — `next/index.html`
The ids `appShell, workspaceGate, workspaceTitle, workspaceMessage, workspaceRetry, gateExport, syncLabel, syncBar, syncRetry, syncMessage, exportProgress, themeToggle, toastRoot, globalSearch` are **required by existing bootstrap code**; their show/hide semantics (the `hidden` attribute or classes) must be copied from the current `/index.html` in step S1.2 — the markup below uses placeholders for them.
**`next/index.html`**
```html
<!doctype html>
<html lang="en" data-theme-pref="system">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>Career Track — Scholarship OS (next)</title>
  <meta name="robots" content="noindex"> <!-- remove at flip (S9) -->
  <meta name="description" content="Plan, track and win fully funded Masters scholarships. Deadlines, documents and matches in one calm workspace.">
  <meta name="color-scheme" content="light dark">
  <meta name="theme-color" content="#F6F7F9" media="(prefers-color-scheme: light)">
  <meta name="theme-color" content="#0F1114" media="(prefers-color-scheme: dark)">
  <meta property="og:title" content="Career Track — Scholarship OS">
  <meta property="og:description" content="Deadlines, documents and matches for fully funded Masters applications.">
  <meta property="og:type" content="website">
  <meta property="og:image" content="/assets/og-1200x630.png">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="manifest" href="/manifest.webmanifest">
  <link rel="icon" href="/assets/icon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="/assets/tokens.css">
  <link rel="stylesheet" href="/assets/app4.css">
  <script src="/assets/theme.js"></script> <!-- EXISTING file (src/theme.js): reads localStorage key "scholarship-theme" (light|dark). Do NOT replace it. -->
</head>
<body>
  <a class="skip-link" href="#main">Skip to content</a>

  <svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false" id="icon-sprite"><!-- <symbol> set from src/ui/icons.js --></svg>

  <noscript><p style="padding:24px">Career Track needs JavaScript to render your workspace.</p></noscript>

  <div class="app" id="appShell" hidden>
    <aside class="sidebar" aria-label="Primary">
      <div class="brand">
        <div class="brand__mark" aria-hidden="true">CT</div>
        <div><div class="brand__name">Career Track</div><div class="brand__tag">Scholarship OS</div></div>
      </div>
      <nav class="nav" aria-label="Main" id="mainNav">
        <a class="nav__item" href="#/dashboard"    data-nav="dashboard"><svg class="nav__icon" aria-hidden="true"><use href="#i-dash"/></svg><span>Dashboard</span></a>
        <a class="nav__item" href="#/scholarships" data-nav="scholarships"><svg class="nav__icon" aria-hidden="true"><use href="#i-cap"/></svg><span>Scholarships</span><span class="nav__badge" id="navCountScholarships" hidden></span></a>
        <a class="nav__item" href="#/calendar"     data-nav="calendar"><svg class="nav__icon" aria-hidden="true"><use href="#i-cal"/></svg><span>Calendar</span></a>
        <a class="nav__item" href="#/documents"    data-nav="documents"><svg class="nav__icon" aria-hidden="true"><use href="#i-doc"/></svg><span>Documents</span></a>
        <a class="nav__item" href="#/settings"     data-nav="settings"><svg class="nav__icon" aria-hidden="true"><use href="#i-gear"/></svg><span>Settings</span></a>
      </nav>
      <div class="sidebar__foot" id="dataFreshness"><div><span class="status-dot" aria-hidden="true"></span><span id="freshnessText">Data verified —</span></div><div id="nextCheckText"></div></div>
    </aside>

    <div class="main">
      <header class="topbar">
        <div class="topbar__title"><h1 id="pageTitle" tabindex="-1">Dashboard</h1><p class="topbar__sub" id="pageSub"></p></div>
        <div class="topbar__actions">
          <!-- IDs below are required by the existing bootstrap logic: copy their semantics from /index.html (hidden attribute / classes) -->
          <div class="sync-pill" id="syncBar" role="status" data-state="saved"><span id="syncLabel">Saved on this device</span> <span id="syncMessage"></span></div>
          <button class="btn btn--ghost btn--sm" id="syncRetry" type="button" hidden>Retry</button>
          <form class="search" role="search" id="searchForm" autocomplete="off">
            <svg class="search__icon" aria-hidden="true"><use href="#i-search"/></svg>
            <input class="search__input" id="globalSearch" name="q" type="search" placeholder="Search scholarships, countries…" aria-label="Search scholarships and countries" enterkeyhint="search">
            <kbd class="search__kbd" aria-hidden="true">/</kbd>
          </form>
          <button class="icon-btn" id="themeToggle" type="button" aria-label="Switch to dark theme">◐</button>
          <div style="position:relative">
            <button class="avatar-btn" id="accountBtn" type="button" aria-haspopup="menu" aria-expanded="false" aria-controls="accountMenu" aria-label="Account menu">
              <span class="avatar" id="accountAvatar" aria-hidden="true">?</span>
            </button>
            <div class="menu" id="accountMenu" role="menu" hidden>
              <div class="menu__item" role="presentation" style="cursor:default"><strong id="accountName">Your profile</strong></div>
              <a class="menu__item" role="menuitem" href="#/settings/profile">Profile &amp; preferences</a>
              <a class="menu__item" role="menuitem" href="#/settings/data">Backup &amp; export</a>
              <button class="menu__item" role="menuitem" id="exportProgress" type="button">Export progress</button>
              <a class="menu__item" role="menuitem" href="#/settings/sources">Sources &amp; coverage</a>
            </div>
          </div>
        </div>
      </header>
      <main id="main" tabindex="-1"><!-- active view renders here --></main>
    </div>
  </div>

  <section id="workspaceGate" aria-live="polite"><h2 id="workspaceTitle">Opening your workspace</h2><p id="workspaceMessage">Opening saved progress…</p><div><button class="btn btn--secondary" id="workspaceRetry" type="button" hidden>Retry</button> <button class="btn btn--secondary" id="gateExport" type="button" hidden>Export a backup</button></div></section>
  <aside class="drawer" id="drawer" hidden role="dialog" aria-modal="true" aria-labelledby="drawerTitle"><!-- opportunity detail --></aside>
  <div class="scrim" id="scrim" hidden></div>
  <div class="toast-root" id="toastRoot" role="status" aria-live="polite"></div>
  <script type="module" src="/assets/app4.js"></script> <!-- built from src/v4/bootstrap.js -->
</body>
</html>
```

### 5.2 Theme (reuse the existing mechanism — do not add a new one)
The repo already ships `src/theme.js` (loaded as `/assets/theme.js` before paint). It reads `localStorage["scholarship-theme"]` and sets `document.documentElement.dataset.theme` to `"dark"` or `"light"` (default `"light"`). **v4 must use the same key and the same two values** so the owner's saved choice carries over. There is no "system" mode in the legacy contract; a system option may be added later under a *different* key without touching this one.
Toggle behaviour: `#themeToggle` flips `dark`⇄`light`, writes `scholarship-theme`, updates `aria-label` ("Switch to dark theme" / "Switch to light theme").

### 5.3 Icon sprite (`src/ui/icons.js`) — inject once into `#icon-sprite`
| id | viewBox | Shapes |
|---|---|---|
| `i-dash` | 0 0 24 24 | `rect x3 y3 w7 h9 rx1.5`, `rect x14 y3 w7 h5 rx1.5`, `rect x14 y12 w7 h9 rx1.5`, `rect x3 y16 w7 h5 rx1.5` |
| `i-cap` | 0 0 24 24 | `path M2 9l10-5 10 5-10 5z`, `path M6 11.5V16c0 1.5 3 3 6 3s6-1.5 6-3v-4.5` |
| `i-cal` | 0 0 24 24 | `rect x3 y4.5 w18 h16 rx2`, `path M3 10h18M8 2.5v4M16 2.5v4` |
| `i-doc` | 0 0 24 24 | `path M6 2.5h8l5 5V20a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 20V4A1.5 1.5 0 0 1 6.5 2.5z`, `path M14 2.5V8h5M8.5 13h7M8.5 17h5` |
| `i-gear` | 0 0 24 24 | `circle cx12 cy12 r3`, `path M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1` |
| `i-search` | 0 0 24 24 | `circle cx11 cy11 r6.5`, `path M16 16l5 5` |
Render with `<svg class="nav__icon" aria-hidden="true"><use href="#i-…"/></svg>`; size 20 px, `stroke: currentColor; fill: none; stroke-width: 1.75; stroke-linecap/linejoin: round`.

### 5.4 Shell attribute contract
| Element | Required attributes | Behaviour |
|---|---|---|
| `a.nav__item` | `href="#/<view>"`, `data-nav="<view>"`; active item gets `aria-current="page"` | Router sets/removes `aria-current`; never use a class for active state |
| `#navCountScholarships` | `hidden` until count > 0 | Shows number of items in My list |
| `#syncPill` | `role="status"`, `data-state="saved|saving|failed|offline"` | Text: "Saved on this device" / "Saving…" / "Could not save" / "Offline — showing last saved copy"; `#syncRetry` visible only for `failed` |
| `#globalSearch` | `type="search"`, `aria-label`, `enterkeyhint="search"` | `/` focuses it (when not typing); Enter routes to `#/scholarships/all?q=<text>` |
| `#themeToggle` | `type="button"`, `aria-label` | Section 5.2 |
| `#accountBtn` | `aria-haspopup="menu"`, `aria-expanded`, `aria-controls="accountMenu"` | Opens `#accountMenu` (`role="menu"`, items `role="menuitem"`), Esc closes and returns focus to the button |
| `#drawer` | `role="dialog"`, `aria-modal="true"`, `aria-labelledby="drawerTitle"`, `hidden` | Focus moves to its close button on open; Tab is trapped; Esc/scrim click closes; focus returns to the opener |
| `#toastRoot` | `role="status"`, `aria-live="polite"` | One toast per action; auto-dismiss 4 s; errors persist until dismissed |
| `main#main` | `tabindex="-1"` | Receives focus on route change if the title cannot |

---

## 6. Stylesheets (complete)
**`src/styles/tokens.css`**
**`src/styles/tokens.css`**
```css
/* ===== Career Track — design tokens (single source of truth). Light is default; dark via [data-theme="dark"]. =====
   Contrast ratios (WCAG 2.2, computed) are noted where a pair is used for text. AA text = 4.5:1, large text/UI = 3:1. */
:root {
  /* Neutrals */
  --bg: #F6F7F9;          /* page background */
  --surface: #FFFFFF;     /* cards */
  --surface-2: #F0F2F5;   /* inset panels, hover */
  --surface-3: #E8EBEF;   /* pressed, tracks */
  --line: #E2E5E9;        /* 1px borders */
  --line-strong: #C9CED6; /* inputs, emphasised borders */
  --text: #15171A;        /* 17.96:1 on surface */
  --text-2: #454B54;      /* 8.80:1 on surface — secondary body */
  --muted: #5B616B;       /* 6.24:1 on surface, 5.56:1 on surface-2 (replaces #70757D, which failed AA on surface-2 at 4.13) */

  /* Brand (single accent) */
  --brand: #3451D1;       /* 6.47:1 on surface; white on brand 6.47:1 */
  --brand-ink: #2A41A8;   /* text on brand-soft, 7.50:1 */
  --brand-soft: #EBEEFA;
  --on-brand: #FFFFFF;
  --accent: #15171A;      /* primary neutral button (kept from v3) */

  /* Semantics (text colour / soft background pairs, all >= 4.5:1) */
  --success: #1B6F48;  --success-soft: #E8F1EC;
  --warning: #7F5E0E;  --warning-soft: #F2EFE7;   /* old #8F6A12 failed on surface-2 (4.42) */
  --danger:  #A43B3B;  --danger-soft:  #F6EBEB;
  --critical:#B42318;  --critical-soft:#FBEAE8;
  --info:    #3867A7;  --info-soft:    #EBF0F6;
  --focus:   #3451D1;

  /* Shape */
  --r-xs: 6px; --r-sm: 9px; --r-md: 12px; --r-lg: 16px; --r-xl: 20px; --r-pill: 999px;
  /* Elevation */
  --shadow-1: 0 1px 2px rgba(16,24,40,.05);
  --shadow-2: 0 8px 24px rgba(16,24,40,.07);
  --shadow-3: 0 24px 64px rgba(16,24,40,.18);
  --ring: 0 0 0 3px color-mix(in srgb, var(--focus) 24%, transparent);
  /* Space (4px base) */
  --s-1: 4px; --s-2: 8px; --s-3: 12px; --s-4: 16px; --s-5: 20px; --s-6: 24px; --s-8: 32px; --s-10: 40px; --s-12: 48px;
  /* Layout */
  --sidebar-w: 248px; --topbar-h: 64px; --content-max: 1280px; --page-pad: 32px; --bottom-nav-h: 64px;
  /* Type */
  --sans: "Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  --mono: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
  --fs-display: 40px; --lh-display: 44px;   /* hero countdown digits use --mono at this size */
  --fs-h1: 28px; --lh-h1: 34px;
  --fs-h2: 20px; --lh-h2: 28px;
  --fs-h3: 16px; --lh-h3: 24px;
  --fs-body: 15px; --lh-body: 24px;
  --fs-small: 13px; --lh-small: 20px;
  --fs-micro: 12px; --lh-micro: 16px;
  /* Motion */
  --t-fast: 120ms; --t-base: 200ms; --t-slow: 320ms; --ease: cubic-bezier(.2,.8,.2,1);
  /* Z-index scale */
  --z-sticky: 10; --z-drawer: 40; --z-dialog: 50; --z-toast: 60;
}

[data-theme="dark"] {
  --bg: #0F1114; --surface: #171A1F; --surface-2: #1D2127; --surface-3: #262B33;
  --line: #2B3139; --line-strong: #3A424D;
  --text: #F3F5F7; --text-2: #C6CBD2; --muted: #9AA2AD;
  --brand: #8DA2FB; --brand-ink: #B7C4FD; --brand-soft: #282D3E; --on-brand: #0F1114;
  --accent: #F4F5F6;
  --success: #71C89A; --success-soft: #243230;
  --warning: #DEC06D; --warning-soft: #33312A;
  --danger: #E77C7C;  --danger-soft: #34282C;
  --critical: #FF8A80; --critical-soft: #3A2626;
  --info: #81AEE9;    --info-soft: #262F3B;
  --focus: #9ABCE7;
  --shadow-1: 0 1px 2px rgba(0,0,0,.3); --shadow-2: 0 8px 24px rgba(0,0,0,.28); --shadow-3: 0 24px 64px rgba(0,0,0,.5);
}
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) {
  --bg: #0F1114; --surface: #171A1F; --surface-2: #1D2127; --surface-3: #262B33;
  --line: #2B3139; --line-strong: #3A424D;
  --text: #F3F5F7; --text-2: #C6CBD2; --muted: #9AA2AD;
  --brand: #8DA2FB; --brand-ink: #B7C4FD; --brand-soft: #282D3E; --on-brand: #0F1114; --accent: #F4F5F6;
  --success: #71C89A; --success-soft: #243230; --warning: #DEC06D; --warning-soft: #33312A;
  --danger: #E77C7C; --danger-soft: #34282C; --critical: #FF8A80; --critical-soft: #3A2626;
  --info: #81AEE9; --info-soft: #262F3B; --focus: #9ABCE7;
  --shadow-1: 0 1px 2px rgba(0,0,0,.3); --shadow-2: 0 8px 24px rgba(0,0,0,.28); --shadow-3: 0 24px 64px rgba(0,0,0,.5);
} }
@media (max-width: 1080px) { :root { --sidebar-w: 216px; --page-pad: 24px; } }
@media (max-width: 760px)  { :root { --page-pad: 16px; --fs-display: 32px; --lh-display: 36px; } }
@media (prefers-reduced-motion: reduce) { :root { --t-fast: 0ms; --t-base: 0ms; --t-slow: 0ms; } html { scroll-behavior: auto; } }
```

**`src/styles/app.css`**
**`src/styles/app.css`**
```css
/* ===== Career Track — base + shell + components. Requires tokens.css. ===== */
*, *::before, *::after { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; scrollbar-width: thin; }
body { margin: 0; min-width: 320px; background: var(--bg); color: var(--text); font: 400 var(--fs-body)/var(--lh-body) var(--sans); -webkit-font-smoothing: antialiased; }
h1, h2, h3, h4, p { margin: 0; }
button, input, select, textarea { font: inherit; color: inherit; }
button { cursor: pointer; }
a { color: var(--brand); text-underline-offset: 3px; }
:where(a, button, input, select, textarea, summary, [tabindex]):focus-visible { outline: 2px solid var(--focus); outline-offset: 2px; border-radius: var(--r-xs); }
[hidden] { display: none !important; }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
.mono { font-family: var(--mono); font-variant-numeric: tabular-nums; }
.muted { color: var(--muted); }
.eyebrow { font-size: var(--fs-micro); line-height: var(--lh-micro); letter-spacing: .12em; text-transform: uppercase; color: var(--muted); font-weight: 600; }
.skip-link { position: absolute; left: var(--s-4); top: -64px; background: var(--surface); padding: var(--s-2) var(--s-4); border-radius: var(--r-sm); z-index: var(--z-toast); }
.skip-link:focus { top: var(--s-4); }

/* ---------- Shell ---------- */
.app { display: grid; grid-template-columns: var(--sidebar-w) minmax(0, 1fr); min-height: 100dvh; }
.sidebar { position: sticky; top: 0; height: 100dvh; display: flex; flex-direction: column; gap: var(--s-6); padding: var(--s-6) var(--s-4); background: var(--surface); border-right: 1px solid var(--line); }
.brand { display: flex; align-items: center; gap: var(--s-3); padding: 0 var(--s-2); }
.brand__mark { width: 36px; height: 36px; border-radius: var(--r-md); display: grid; place-items: center; background: var(--brand); color: var(--on-brand); font-weight: 700; letter-spacing: -.02em; }
.brand__name { font-weight: 700; letter-spacing: -.02em; line-height: 20px; }
.brand__tag { font-size: var(--fs-micro); color: var(--muted); }
.nav { display: grid; gap: var(--s-1); }
.nav__item { display: flex; align-items: center; gap: var(--s-3); min-height: 44px; padding: 0 var(--s-3); border: 0; border-radius: var(--r-md); background: transparent; color: var(--text-2); text-decoration: none; font-weight: 500; transition: background var(--t-fast) var(--ease), color var(--t-fast) var(--ease); }
.nav__item:hover { background: var(--surface-2); color: var(--text); }
.nav__item[aria-current="page"] { background: var(--brand-soft); color: var(--brand-ink); font-weight: 600; }
.nav__icon { width: 20px; height: 20px; flex: none; stroke: currentColor; fill: none; stroke-width: 1.75; stroke-linecap: round; stroke-linejoin: round; }
.nav__badge { margin-left: auto; min-width: 22px; padding: 1px 7px; border-radius: var(--r-pill); background: var(--surface-3); color: var(--text-2); font: 600 var(--fs-micro)/18px var(--mono); text-align: center; }
.sidebar__foot { margin-top: auto; display: grid; gap: var(--s-2); padding: var(--s-3); border: 1px solid var(--line); border-radius: var(--r-md); background: var(--surface-2); font-size: var(--fs-micro); color: var(--muted); }
.status-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: var(--success); margin-right: var(--s-2); }

.main { min-width: 0; padding: 0 var(--page-pad) var(--s-12); }
.topbar { position: sticky; top: 0; z-index: var(--z-sticky); display: flex; align-items: center; justify-content: space-between; gap: var(--s-4); min-height: var(--topbar-h); padding: var(--s-4) 0; background: color-mix(in srgb, var(--bg) 88%, transparent); backdrop-filter: blur(10px); }
.topbar__title h1 { font-size: var(--fs-h1); line-height: var(--lh-h1); letter-spacing: -.03em; font-weight: 700; }
.topbar__sub { color: var(--muted); font-size: var(--fs-small); }
.topbar__actions { display: flex; align-items: center; gap: var(--s-3); }
.search { position: relative; }
.search__input { width: clamp(180px, 26vw, 340px); min-height: 44px; padding: 0 44px 0 40px; border: 1px solid var(--line-strong); border-radius: var(--r-md); background: var(--surface); }
.search__input:focus { border-color: var(--brand); box-shadow: var(--ring); outline: none; }
.search__icon { position: absolute; left: 12px; top: 12px; width: 20px; height: 20px; stroke: var(--muted); fill: none; stroke-width: 1.75; pointer-events: none; }
.search__kbd { position: absolute; right: 10px; top: 11px; font: 500 var(--fs-micro)/20px var(--mono); border: 1px solid var(--line); border-radius: var(--r-xs); padding: 0 6px; color: var(--muted); }
.icon-btn { width: 44px; height: 44px; display: grid; place-items: center; border: 1px solid var(--line-strong); border-radius: var(--r-md); background: var(--surface); transition: background var(--t-fast) var(--ease); }
.icon-btn:hover { background: var(--surface-2); }
.avatar-btn { display: flex; align-items: center; gap: var(--s-2); min-height: 44px; padding: 0 var(--s-3) 0 var(--s-1); border: 1px solid var(--line-strong); border-radius: var(--r-pill); background: var(--surface); }
.avatar { width: 34px; height: 34px; border-radius: 50%; display: grid; place-items: center; background: var(--brand); color: var(--on-brand); font-weight: 700; font-size: var(--fs-small); }
.menu { position: absolute; right: 0; top: calc(100% + 8px); min-width: 240px; padding: var(--s-2); background: var(--surface); border: 1px solid var(--line); border-radius: var(--r-lg); box-shadow: var(--shadow-3); z-index: var(--z-drawer); }
.menu__item { display: flex; width: 100%; align-items: center; gap: var(--s-3); min-height: 40px; padding: 0 var(--s-3); border: 0; background: transparent; border-radius: var(--r-sm); text-align: left; color: var(--text); text-decoration: none; }
.menu__item:hover { background: var(--surface-2); }
.sync-pill { display: inline-flex; align-items: center; gap: 6px; font-size: var(--fs-micro); color: var(--muted); }
.sync-pill[data-state="saved"] { color: var(--success); } .sync-pill[data-state="failed"], .sync-pill[data-state="offline"] { color: var(--warning); }

/* ---------- Primitives ---------- */
.card { background: var(--surface); border: 1px solid var(--line); border-radius: var(--r-lg); box-shadow: var(--shadow-1); min-width: 0; }
.card--pad { padding: var(--s-6); }
.section { margin-top: var(--s-8); }
.section__head { display: flex; align-items: flex-end; justify-content: space-between; gap: var(--s-4); margin-bottom: var(--s-4); }
.section__title { font-size: var(--fs-h2); line-height: var(--lh-h2); letter-spacing: -.02em; font-weight: 700; }
.section__sub { color: var(--muted); font-size: var(--fs-small); }
.grid { display: grid; gap: var(--s-4); }
.btn { display: inline-flex; align-items: center; justify-content: center; gap: var(--s-2); min-height: 44px; padding: 0 var(--s-5); border-radius: var(--r-md); border: 1px solid transparent; font-weight: 600; font-size: var(--fs-small); text-decoration: none; transition: background var(--t-fast) var(--ease), border-color var(--t-fast) var(--ease), transform var(--t-fast) var(--ease); }
.btn:active { transform: translateY(1px); }
.btn--primary { background: var(--brand); color: var(--on-brand); } .btn--primary:hover { background: color-mix(in srgb, var(--brand) 88%, black); }
.btn--secondary { background: var(--surface); border-color: var(--line-strong); color: var(--text); } .btn--secondary:hover { background: var(--surface-2); }
.btn--ghost { background: transparent; color: var(--text-2); } .btn--ghost:hover { background: var(--surface-2); }
.btn--danger { background: transparent; border-color: var(--danger); color: var(--danger); }
.btn--sm { min-height: 36px; padding: 0 var(--s-3); }
.btn[aria-pressed="true"] { background: var(--brand-soft); border-color: var(--brand); color: var(--brand-ink); }
.btn:disabled { opacity: .5; cursor: not-allowed; }
.chip { display: inline-flex; align-items: center; gap: 6px; min-height: 24px; padding: 0 var(--s-2); border-radius: var(--r-pill); font-size: var(--fs-micro); font-weight: 600; white-space: nowrap; border: 1px solid transparent; }
.chip--neutral { background: var(--surface-2); color: var(--text-2); border-color: var(--line); }
.chip--brand { background: var(--brand-soft); color: var(--brand-ink); }
.chip--success { background: var(--success-soft); color: var(--success); }
.chip--warning { background: var(--warning-soft); color: var(--warning); border-style: dashed; border-color: currentColor; }
.chip--danger { background: var(--danger-soft); color: var(--danger); }
.chip--critical { background: var(--critical-soft); color: var(--critical); border-width: 2px; border-color: currentColor; }
.chip--info { background: var(--info-soft); color: var(--info); }
.chip--unknown { background: transparent; color: var(--muted); border-style: dotted; border-color: var(--line-strong); }
.progress { height: 8px; border-radius: var(--r-pill); background: var(--surface-3); overflow: hidden; }
.progress > i { display: block; width: calc(var(--v, 0) * 1%); height: 100%; border-radius: inherit; background: var(--brand); transition: width var(--t-slow) var(--ease); }
.ring { --p: 0; width: 88px; aspect-ratio: 1; border-radius: 50%; display: grid; place-items: center; background: conic-gradient(var(--brand) calc(var(--p) * 1%), var(--surface-3) 0); position: relative; }
.ring::after { content: ""; position: absolute; inset: 9px; border-radius: 50%; background: var(--surface); }
.ring > b { position: relative; z-index: 1; font: 700 18px/1 var(--sans); }
.empty { padding: var(--s-10) var(--s-6); text-align: center; color: var(--muted); border: 1px dashed var(--line-strong); border-radius: var(--r-lg); }
.skeleton { background: linear-gradient(90deg, var(--surface-2), var(--surface-3), var(--surface-2)); background-size: 200% 100%; animation: shimmer 1.4s linear infinite; border-radius: var(--r-md); }
@keyframes shimmer { to { background-position: -200% 0; } }

/* ---------- Dashboard ---------- */
.dash { display: grid; gap: var(--s-4); grid-template-columns: repeat(12, minmax(0, 1fr)); }
.dash__hero { grid-column: span 8; } .dash__profile { grid-column: span 4; }
.dash__kpis { grid-column: 1 / -1; display: grid; gap: var(--s-4); grid-template-columns: repeat(4, minmax(0, 1fr)); }
.dash__board { grid-column: span 8; } .dash__upcoming { grid-column: span 4; }
.dash__matches { grid-column: 1 / -1; }
.hero { padding: var(--s-8); border-left: 6px solid var(--info); display: grid; gap: var(--s-5); }
.hero[data-urgency="attention"] { border-left-color: var(--warning); }
.hero[data-urgency="high"], .hero[data-urgency="urgent"] { border-left-color: var(--danger); }
.hero[data-urgency="critical"], .hero[data-urgency="final"] { border-left-color: var(--critical); }
.hero__title { font-size: var(--fs-h1); line-height: var(--lh-h1); letter-spacing: -.03em; font-weight: 700; }
.hero__meta { display: flex; flex-wrap: wrap; gap: var(--s-2); align-items: center; }
.countdown { display: flex; gap: var(--s-3); align-items: stretch; flex-wrap: wrap; }
.countdown__unit { min-width: 84px; padding: var(--s-3) var(--s-4); border-radius: var(--r-md); background: var(--surface-2); text-align: center; }
.countdown__num { display: block; font: 600 var(--fs-display)/var(--lh-display) var(--mono); letter-spacing: -.04em; font-variant-numeric: tabular-nums; }
.countdown__lbl { display: block; font-size: var(--fs-micro); letter-spacing: .08em; text-transform: uppercase; color: var(--muted); }
.countdown--days .countdown__num { font-size: 56px; line-height: 60px; }
.hero__zones { display: grid; gap: 4px; font-size: var(--fs-small); color: var(--text-2); }
.hero__zones b { font-weight: 600; color: var(--text); }
.hero__actions { display: flex; flex-wrap: wrap; gap: var(--s-3); align-items: center; }
.profile-card { padding: var(--s-6); display: grid; gap: var(--s-5); align-content: start; }
.profile-card__head { display: flex; gap: var(--s-4); align-items: center; }
.profile-card .avatar { width: 56px; height: 56px; font-size: 20px; }
.profile-card__facts { display: grid; gap: var(--s-2); font-size: var(--fs-small); color: var(--text-2); }
.stat-row { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--s-2); padding: var(--s-3); border-radius: var(--r-md); background: var(--surface-2); }
.stat-row span { font-size: var(--fs-micro); color: var(--muted); }
.stat-row b { display: block; font: 700 22px/26px var(--sans); color: var(--text); letter-spacing: -.02em; }
.kpi { padding: var(--s-5); display: grid; gap: var(--s-1); text-decoration: none; color: inherit; transition: border-color var(--t-fast) var(--ease), box-shadow var(--t-fast) var(--ease); }
.kpi:hover { border-color: var(--line-strong); box-shadow: var(--shadow-2); }
.kpi__value { font: 700 32px/36px var(--sans); letter-spacing: -.03em; }
.kpi__label { color: var(--muted); font-size: var(--fs-small); }
.board { display: grid; gap: var(--s-3); grid-template-columns: repeat(3, minmax(0, 1fr)); }
.lane { display: grid; gap: var(--s-2); align-content: start; padding: var(--s-3); border-radius: var(--r-md); background: var(--surface-2); min-height: 160px; }
.lane__head { display: flex; justify-content: space-between; font-size: var(--fs-small); font-weight: 600; color: var(--text-2); }
.appcard { display: grid; gap: var(--s-2); padding: var(--s-3); background: var(--surface); border: 1px solid var(--line); border-radius: var(--r-md); text-decoration: none; color: var(--text); }
.appcard:hover { border-color: var(--brand); }
.appcard__name { font-weight: 600; line-height: 20px; overflow-wrap: anywhere; }
.appcard__row { display: flex; justify-content: space-between; align-items: center; gap: var(--s-2); font-size: var(--fs-micro); color: var(--muted); }
.timeline { display: grid; gap: 0; }
.timeline__item { display: grid; grid-template-columns: 56px minmax(0, 1fr); gap: var(--s-3); padding: var(--s-3) 0; border-bottom: 1px solid var(--line); }
.timeline__item:last-child { border-bottom: 0; }
.timeline__date { text-align: center; line-height: 1.1; }
.timeline__date b { display: block; font-size: 20px; } .timeline__date span { font-size: var(--fs-micro); color: var(--muted); text-transform: uppercase; }
.match { display: grid; gap: var(--s-3); padding: var(--s-5); }
.matches { display: grid; gap: var(--s-4); grid-template-columns: repeat(3, minmax(0, 1fr)); }
.match__top { display: flex; justify-content: space-between; gap: var(--s-3); align-items: flex-start; }
.match__score { font: 700 var(--fs-small)/1 var(--mono); padding: 6px 8px; border-radius: var(--r-sm); background: var(--brand-soft); color: var(--brand-ink); }
.match__why { display: flex; flex-wrap: wrap; gap: 6px; }
.match__actions { display: flex; gap: var(--s-2); margin-top: auto; }

/* ---------- Scholarships ---------- */
.tabs { display: flex; gap: var(--s-1); padding: 4px; border-radius: var(--r-md); background: var(--surface-2); width: fit-content; max-width: 100%; overflow-x: auto; }
.tab { min-height: 36px; padding: 0 var(--s-4); border: 0; border-radius: var(--r-sm); background: transparent; color: var(--text-2); font-weight: 600; font-size: var(--fs-small); white-space: nowrap; }
.tab[aria-selected="true"] { background: var(--surface); color: var(--text); box-shadow: var(--shadow-1); }
.tier { margin-top: var(--s-8); }
.tier__head { display: flex; align-items: baseline; gap: var(--s-3); flex-wrap: wrap; margin-bottom: var(--s-3); }
.tier__title { font-size: var(--fs-h2); line-height: var(--lh-h2); font-weight: 700; letter-spacing: -.02em; }
.compromise { display: flex; flex-wrap: wrap; align-items: center; gap: var(--s-2); margin: var(--s-4) 0 var(--s-2); font-size: var(--fs-small); font-weight: 600; color: var(--text-2); }
.country-grid { display: grid; gap: var(--s-4); grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); }
.country { min-width: 0; display: grid; gap: var(--s-3); padding: var(--s-5); text-decoration: none; color: var(--text); height: 100%; transition: border-color var(--t-fast) var(--ease), box-shadow var(--t-fast) var(--ease), transform var(--t-fast) var(--ease); }
.country:hover { border-color: var(--brand); box-shadow: var(--shadow-2); transform: translateY(-1px); }
.country__head { display: flex; flex-wrap: wrap; align-items: center; gap: var(--s-2) var(--s-3); }
.country__flag { font-size: 28px; line-height: 1; }
.country__name { font-weight: 700; font-size: var(--fs-h3); line-height: var(--lh-h3); flex: 1 1 auto; min-width: 0; }
.country__chips { display: flex; flex-wrap: wrap; gap: 6px; }
.country__sacrifice { font-size: var(--fs-small); color: var(--text-2); }
.country__foot { font-size: var(--fs-micro); color: var(--muted); display: flex; flex-wrap: wrap; justify-content: space-between; gap: var(--s-1) var(--s-3); }
.meter { display: inline-flex; gap: 3px; } .meter i { width: 9px; height: 9px; border-radius: 50%; border: 1.5px solid var(--muted); } .meter i.on { background: var(--brand); border-color: var(--brand); }
.oppcard { display: grid; gap: var(--s-3); padding: var(--s-5); grid-template-columns: minmax(0, 1fr) auto; align-items: center; }
.oppcard__name { font-weight: 700; font-size: var(--fs-h3); line-height: var(--lh-h3); }
.oppcard__meta { display: flex; flex-wrap: wrap; gap: 6px; margin-top: var(--s-2); }
.oppcard__side { display: grid; gap: var(--s-2); justify-items: end; text-align: right; }
.oppcard__time { font: 600 var(--fs-small)/20px var(--mono); }
.drawer { position: fixed; inset: 0 0 0 auto; width: min(640px, 100vw); background: var(--surface); border-left: 1px solid var(--line); box-shadow: var(--shadow-3); z-index: var(--z-drawer); display: flex; flex-direction: column; transform: translateX(0); transition: transform var(--t-slow) var(--ease); }
.drawer[hidden] { display: flex !important; transform: translateX(100%); visibility: hidden; }
.drawer__head { padding: var(--s-5) var(--s-6); border-bottom: 1px solid var(--line); display: flex; gap: var(--s-4); justify-content: space-between; }
.drawer__body { padding: var(--s-6); overflow-y: auto; flex: 1; display: grid; gap: var(--s-6); align-content: start; }
.scrim { position: fixed; inset: 0; background: rgba(8,12,18,.45); z-index: calc(var(--z-drawer) - 1); }
.facts { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--s-3); }
.fact { padding: var(--s-3) var(--s-4); border: 1px solid var(--line); border-radius: var(--r-md); }
.fact dt { font-size: var(--fs-micro); color: var(--muted); } .fact dd { margin: 2px 0 0; font-weight: 600; font-size: var(--fs-small); overflow-wrap: anywhere; }

/* ---------- Calendar ---------- */
.cal { padding: var(--s-5); }
.cal__bar { display: flex; align-items: center; justify-content: space-between; gap: var(--s-3); margin-bottom: var(--s-4); flex-wrap: wrap; }
.cal__title { font-size: var(--fs-h2); font-weight: 700; letter-spacing: -.02em; }
.cal__grid { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); border-top: 1px solid var(--line); border-left: 1px solid var(--line); }
.cal__dow { padding: var(--s-2); font-size: var(--fs-micro); text-transform: uppercase; letter-spacing: .08em; color: var(--muted); border-right: 1px solid var(--line); border-bottom: 1px solid var(--line); }
.cal__cell { min-height: 96px; padding: 6px; border-right: 1px solid var(--line); border-bottom: 1px solid var(--line); display: grid; align-content: start; gap: 3px; }
.cal__cell[data-out="true"] { background: var(--surface-2); color: var(--muted); }
.cal__cell[data-today="true"] .cal__day { background: var(--brand); color: var(--on-brand); }
.cal__day { width: 24px; height: 24px; display: grid; place-items: center; border-radius: 50%; font: 600 var(--fs-micro)/1 var(--mono); }
.cal__ev { display: flex; align-items: center; gap: 4px; width: 100%; min-height: 22px; padding: 0 6px; border: 0; border-radius: 5px; font-size: 11px; font-weight: 600; text-align: left; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cal__ev::before { font-size: 9px; flex: none; }
.cal__ev[data-type="opens"]::before { content: "▶"; } .cal__ev[data-type="closes"]::before { content: "■"; } .cal__ev[data-type="milestone"]::before { content: "◆"; }
.cal__ev[data-type="opens"] { background: var(--success-soft); color: var(--success); }
.cal__ev[data-type="closes"] { background: var(--critical-soft); color: var(--critical); }
.cal__ev[data-type="milestone"] { background: var(--info-soft); color: var(--info); }
.legend { display: flex; flex-wrap: wrap; gap: var(--s-4); font-size: var(--fs-small); color: var(--text-2); }

/* ---------- Documents / forms ---------- */
.doc-row { display: grid; grid-template-columns: minmax(0, 1fr) 180px 140px; gap: var(--s-4); align-items: center; padding: var(--s-4) var(--s-5); border-bottom: 1px solid var(--line); }
.doc-row:last-child { border-bottom: 0; }
.field { display: grid; gap: 6px; font-size: var(--fs-small); color: var(--text-2); }
.field input, .field select, .field textarea { min-height: 44px; padding: 0 var(--s-3); border: 1px solid var(--line-strong); border-radius: var(--r-md); background: var(--surface); }
.field textarea { padding: var(--s-3); min-height: 96px; resize: vertical; }
.field input:focus, .field select:focus, .field textarea:focus { border-color: var(--brand); box-shadow: var(--ring); outline: none; }
.stepper { display: flex; gap: 4px; } .stepper i { flex: 1; height: 6px; border-radius: var(--r-pill); background: var(--surface-3); } .stepper i.on { background: var(--brand); }
.toast-root { position: fixed; right: var(--s-5); bottom: var(--s-5); display: grid; gap: var(--s-2); z-index: var(--z-toast); }
.toast { padding: var(--s-3) var(--s-4); border-radius: var(--r-md); background: var(--text); color: var(--bg); box-shadow: var(--shadow-3); font-size: var(--fs-small); animation: toast-in var(--t-base) var(--ease); }
@keyframes toast-in { from { transform: translateY(8px); opacity: 0; } }

/* ---------- Responsive ---------- */
@media (max-width: 1180px) {
  .dash__hero, .dash__profile, .dash__board, .dash__upcoming { grid-column: 1 / -1; }
  .matches { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 760px) {
  .app { display: block; padding-bottom: var(--bottom-nav-h); }
  .sidebar { position: fixed; inset: auto 0 0 0; z-index: var(--z-sticky); height: var(--bottom-nav-h); width: 100%; flex-direction: row; padding: 0; border-right: 0; border-top: 1px solid var(--line); background: var(--surface); gap: 0; }
  .sidebar .brand, .sidebar__foot { display: none; }
  .nav { grid-auto-flow: column; grid-auto-columns: 1fr; width: 100%; gap: 0; }
  .nav__item { flex-direction: column; justify-content: center; gap: 2px; min-height: var(--bottom-nav-h); border-radius: 0; font-size: 11px; padding: 0; }
  .nav__badge { display: none; }
  .topbar { flex-wrap: wrap; } .topbar__actions { width: 100%; } .search__input { width: 100%; } .search__kbd { display: none; }
  .hero { padding: var(--s-5); }
  .topbar__actions { flex-wrap: wrap; }
  .search { flex: 1 1 180px; } .sync-pill { order: 5; width: 100%; }
  .hero__title { font-size: 24px; line-height: 30px; }
  .countdown { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: var(--s-2); }
  .countdown__unit { min-width: 0; padding: var(--s-2) var(--s-1); }
  .countdown__num { font-size: 28px; line-height: 32px; }
  .countdown--days { display: flex; } .countdown--days .countdown__num { font-size: 44px; line-height: 48px; }
  .dash__kpis { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .board, .matches { grid-template-columns: 1fr; }
  .oppcard { grid-template-columns: 1fr; } .oppcard__side { justify-items: start; text-align: left; }
  .facts { grid-template-columns: 1fr; }
  .doc-row { grid-template-columns: 1fr; gap: var(--s-2); }
  .cal__grid { display: none; } .cal__agenda { display: grid !important; }
  .drawer { width: 100vw; }
}
@media (min-width: 761px) { .cal__agenda { display: none; } }
```

---

## 7. Component catalogue

| Component | Element + classes | Attributes / ARIA | Variants & states | Notes |
|---|---|---|---|---|
| Button | `button.btn.btn--primary|secondary|ghost|danger [.btn--sm]` | `type="button"`; toggles use `aria-pressed` | hover, active (1 px down), disabled (50 %), pressed (`brand-soft`) | min-height 44 px (36 px `--sm`) |
| Chip | `span.chip.chip--neutral|brand|success|warning|danger|critical|info|unknown` | text always present | — | height 24 px, radius pill, 12 px/600 |
| Progress | `div.progress > i[data-v]` | `role="progressbar"`, `aria-valuemin="0"`, `aria-valuemax="100"`, `aria-valuenow`, `aria-label` | — | 8 px high; width = `--v` % via `hydrate()` |
| Ring | `div.ring[data-p] > b` | `role="img"`, `aria-label="<name>: <n>%"` | — | 88 px; `conic-gradient` |
| Avatar | `span.avatar` | `aria-hidden="true"` (name is in adjacent text/label) | 34 px (top bar), 56 px (profile card) | initials (max 2 letters) or `?` |
| KPI tile | `a.card.kpi > span.kpi__value + span.kpi__label` | link text = "<value> <label>" | hover raises shadow | value 32/36 700 |
| Hero | `article.card.hero[data-urgency]` | `.countdown` has `role="timer"`, `aria-live="off"`, `aria-label="Time remaining"` | urgency border colour; `.countdown--days` for date-only | one per dashboard |
| Countdown unit | `.countdown__unit > .countdown__num[data-u] + .countdown__lbl` | numbers zero-padded to 2 | — | min-width 84 px (68 mobile) |
| Application card | `a.appcard` | `href="#/scholarships/country/<CC>?focus=<id>"`, `data-opportunity` | — | `appCard()` |
| Match card | `article.card.match[data-match]` | buttons carry `data-add-to-list`, `data-dismiss-match`; external link `rel="noopener noreferrer"` + sr-only "(opens in a new tab)" | after add: button becomes disabled "✓ Added" then card removed | `matchCard()` |
| Country card | `a.card.country` | `href="#/scholarships/country/<CC>"`; meter has `role="img"` + aria-label | hover: border brand, lift 1 px | contains `.meter`, chips, sacrifice sentence, foot |
| Opportunity card | `article.card.oppcard` | primary action `button.btn[aria-pressed]` | — | `.oppcard__side` right-aligned (left on mobile) |
| Tabs | `div.tabs[role="tablist"] > button.tab[role="tab"][aria-selected]` | roving tabindex; ←/→ move, Home/End jump | selected: surface + shadow-1 | panel `role="tabpanel"` `aria-labelledby` |
| Drawer | `aside.drawer` (see 5.4) | — | open: `translateX(0)`; closed: 100 % | width `min(640px,100vw)` |
| Fact | `dl.facts > div.fact > dt + dd` | semantic `dl` | 2 columns (1 on mobile) | 5 facts max on Overview |
| Calendar grid | `div.cal__grid[role="grid"]` with `.cal__dow[role="columnheader"]`, `.cal__cell[role="gridcell"]` | `data-out`, `data-today`; roving tabindex on cells; event `button.cal__ev[data-type]` | opens (success), closes (critical), milestone (info) | Mon start |
| Document row | `.doc-row` (grid: 1fr / 180 px / 140 px) | stepper is decorative (`aria-hidden`) with status chip carrying the text | **Real statuses only:** `not-started → preparing → ready → submitted`, plus `expired` flag (mockup's "Draft" = `preparing`) | 1 column on mobile |
| Field | `label.field > span + input|select|textarea` | visible label always | focus: brand border + ring | min-height 44 px |
| Empty state | `.empty` | — | — | title + one hint + optional action |
| Skeleton | `.skeleton` | `aria-hidden="true"` | shimmer 1.4 s | reserve final height |
| Toast | `.toast` inside `#toastRoot` | — | 4 s auto-dismiss (errors persist) | — |

### 7.1 Page DOM contracts (copy the structure from `kit/preview/index.html`, bind data as below)
**Dashboard** (`section[data-view="dashboard"]` → `.dash` 12-col grid)
| Region | Selector | Binding |
|---|---|---|
| Hero container | `article.hero.dash__hero[data-urgency]` | `model.hero.countdown.urgency.key` (fallback `normal`) |
| Title | `.hero__title` | `flagEmoji(country) + ' ' + opportunity.name` |
| Chips | `.hero__meta` | urgency chip, window status chip, funding chip |
| Countdown (exact) | `.countdown__num[data-u="d|h|m|s"]` | `pad2(parts[unit])`, updated by ticker every 1000 ms |
| Countdown (date-only) | `.countdown.countdown--days` | `model.hero.countdown.days` + `chip--warning` "Time not confirmed" |
| Zones | `.hero__zones` | `formatInZone(at, providerTz)`, `formatInZone(at, userTz)`; date-only → `formatDateOnly(date)` |
| Readiness | `.progress` | `readiness` % and text "x of y required steps" |
| Profile | `aside.profile-card` | `profileFromState(state)`: `displayName` (**new optional field**, S6; shows initials `?` until set), interests, preferred countries; completeness ring; `.stat-row` = Applied / Applying / Offers from `model.lanes` |
| KPIs | `.dash__kpis > a.kpi` ×4 | `model.kpis` (applying, submitted, closing, matches) → links `#/scholarships/list`, `#/scholarships/list?stage=submitted`, `#/calendar`, `#/dashboard` (scrolls to matches) |
| Board | `.board > .lane` ×3 | `model.lanes.applying|submitted|outcome` via `appCard()`; lane header shows count |
| Closing soon | `.timeline > .timeline__item` | next 4 `toEvents()` for my list |
| Matches | `.matches > article.match` | `rankMatches(..., {limit: 6})` via `matchCard()` |

**Scholarships** (`section[data-view="scholarships"]`): `.tabs` → one of: tiers (`.tier` > `.tier__head` + `.compromise` + `.country-grid > a.country`), list (`.grid > article.oppcard`), universities. Country page: breadcrumb link, header (flag, name, meter, sacrifice sentence, requirement chips), `.tabs` (Open now / Opening soon / Future & watch / Closed), cards.
**Drawer tabs:** Overview (`dl.facts` + progress + actions) · Requirements · Funding · Documents · Timeline · Sources. Each tab is `div[role="tabpanel"]`.
**Calendar:** `.card.cal` → `.cal__bar` (title, legend, prev/today/next, Export) → `.cal__grid` + `.cal__agenda`.
**Documents:** two columns `minmax(0,1fr) 280px`: list card + readiness ring card; tabs Dossier / References / Tests.
**Settings:** list of sections left (`nav aria-label="Settings sections"`), panel right.

---

## 8. Router (`src/app/router.js`) **[T]**
Route table, redirects and `buildRoute/parseRoute/countryRoute` are in the file below. `LEGACY` now uses the **real V3 view names** (verified in `src/v3/workspace.js`); V3 detail URLs `#/scholarships/<id>` redirect to `#/scholarships/detail/<id>`.
**`src/app/router.js`**
```js
// Hash router. Route shape: #/<view>[/<sub>...][?k=v&k2=v2]   e.g. #/scholarships/country/GB?focus=cw
export const VIEWS = ['dashboard', 'scholarships', 'calendar', 'documents', 'settings'];
export const DEFAULT_VIEW = 'dashboard';

/** Real V3 view names (verified in src/v3/workspace.js @ 8eec65b) -> new route. */
export const LEGACY = {
  overview: ['dashboard'],
  countries: ['scholarships'],
  universities: ['scholarships', 'universities'],
  research: ['scholarships', 'universities'],
  pipeline: ['dashboard'],
  sources: ['settings', 'sources'],
  profile: ['settings', 'profile'],
  goal: ['settings', 'planning'],
  library: ['settings', 'archive'],
};
const SCHOLARSHIP_SUBS = ['country', 'list', 'all', 'universities', 'detail'];

export function parseRoute(hash = '') {
  const raw = String(hash).replace(/^#\/?/, '');
  const [path = '', qs = ''] = raw.split('?');
  const seg = path.split('/').filter(Boolean).map(s => { try { return decodeURIComponent(s); } catch { return s; } });
  const query = Object.fromEntries(new URLSearchParams(qs));
  let [view = DEFAULT_VIEW, ...rest] = seg;
  let redirected = false;
  if (!VIEWS.includes(view)) {
    if (LEGACY[view]) { [view, ...rest] = [...LEGACY[view], ...rest]; redirected = true; }
    else { view = DEFAULT_VIEW; rest = []; redirected = true; }
  }
  // V3 detail URLs: #/scholarships/<id>  ->  #/scholarships/detail/<id>
  if (view === 'scholarships' && rest[0] && !SCHOLARSHIP_SUBS.includes(rest[0])) { rest = ['detail', rest[0]]; redirected = true; }
  return { view, segments: rest, query, redirected, canonical: buildRoute(view, rest, query) };
}

export function buildRoute(view, segments = [], query = {}) {
  const path = ['#', view, ...segments.map(encodeURIComponent)].join('/');
  const q = new URLSearchParams(Object.entries(query).filter(([, v]) => v !== undefined && v !== null && v !== '')).toString();
  return q ? `${path}?${q}` : path;
}
export const countryRoute = (code, focus) => buildRoute('scholarships', ['country', String(code).toUpperCase()], { focus });

/** Number keys 1..5 jump to the five primary views (only when focus is not in a text field). */
export const KEY_TO_VIEW = { 1: 'dashboard', 2: 'scholarships', 3: 'calendar', 4: 'documents', 5: 'settings' };
```
Navigation behaviour: on every `hashchange` → `parseRoute(location.hash)`; if `redirected`, `location.replace(canonical)`; set `aria-current`; update `#pageTitle`/`#pageSub`/`document.title`; focus `#pageTitle`. Keys `1`–`5` map via `KEY_TO_VIEW` (ignored inside inputs/textareas/selects/contenteditable or with Ctrl/Meta/Alt).

## 9. JavaScript modules (complete, tested)
| Module | Exports (signature → returns) |
|---|---|
| `ui/html.js` | `html(strings,...values)` → SafeHtml (escapes `& < > " ' \``; arrays joined; `false/null/undefined` → ''); `raw(string)`; `escapeHtml(v)`; `safeHref(url)` → https URL or `'#'` |
| `ui/components.js` | `chip(text,tone)`, `progress(value,label)`, `ring(value,label)`, `avatar(name)`, `meter(met,total)`, `emptyState(title,hint,action?)`, `appCard({id,name,countries,text,urgencyKey,readiness})`, `matchCard({candidate,score,reasons,flags})`, `flagEmoji(code)`, `hydrate(root)` |
| `features/dashboard/countdown.js` | `splitRemaining(ms)` → `{d,h,m,s,totalMs}`; `urgency(ms)` → `{key,label,rank}`; `countdownModel(deadline, now)` → `{mode:'live'|'days'|'closed'|'none', parts?, days?, urgency?, caveat?}`; `compactText(model)`; `formatInZone(iso,tz)`; `formatDateOnly('YYYY-MM-DD')`; `ymd(ms,tz)`; constants `SEC MIN HOUR DAY` |
| `features/dashboard/model.js` | `buildDashboard(rows,{pins,now,readinessOf})` → `{hero, kpis, lanes, card(row)}`; `inMyList(row,pins)`; `laneOf(row)`; stage lists `APPLYING_STAGES SUBMITTED_STAGES OUTCOME_STAGES` |
| `features/calendar/grid.js` | `monthMatrix(year,month,weekStart=1)` → 6×7 `{date,inMonth,day}`; `monthLabel`, `shiftMonth`, `toEvents(items,viewerZone)`, `eventsByDay(events)`, `agenda(events,fromDay)` |
| `features/radar/match.js` | `matchScore(candidate,profile,now)` → `{score,band,reasons,flags}`; `rankMatches(candidates,profile,{dismissed,listed,includeFuture,limit,now})` |
| `app/ticker.js` | `createTicker({now,set,clear,isHidden})` → `{subscribe(fn,everyMs)→unsubscribe, onVisible(), size()}` |

**Match scoring weights (fixed, tested):** research-area overlap +15 each (max 30) · preferred country +20 · funding (`full-cost-verified` 25, `tuition-stipend-net-pending` 18, `competitive-assistantship` 12, `partial` 8, `tuition-only`/`stipend-only` 6) · Masters-level +10 · window open +10 / opening-soon +6 · 14–120 days to deadline +5 · return-home `yes` with `allowReturnHome:false` −30 · `ineligible` caps at 10 · unverified → flag "Unverified lead". Bands: strong ≥ 70, good ≥ 45, else possible (shown only if ≥ 30).

**`src/ui/html.js`**
```js
// Safe templating. Every interpolated value is escaped unless explicitly wrapped with raw().
// Usage: html`<p class="x">${userText}</p>`  -> string (a SafeHtml instance coerces to string).
const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '`': '&#96;' };
export const escapeHtml = v => String(v ?? '').replace(/[&<>"'`]/g, c => ESC[c]);

class SafeHtml {
  constructor(s) { this.s = s; }
  toString() { return this.s; }
}
export const raw = s => new SafeHtml(String(s));
const part = v => {
  if (v instanceof SafeHtml) return v.s;
  if (Array.isArray(v)) return v.map(part).join('');
  if (v === false || v === null || v === undefined) return '';
  return escapeHtml(v);
};
export function html(strings, ...values) {
  let out = strings[0];
  for (let i = 0; i < values.length; i++) out += part(values[i]) + strings[i + 1];
  return new SafeHtml(out);
}
/** Only http(s) URLs may reach href attributes. Returns '#' otherwise. */
export function safeHref(url) {
  try { const u = new URL(url); return u.protocol === 'https:' ? u.href : '#'; } catch { return '#'; }
}
```
**`src/ui/components.js`**
```js
import { html, raw, safeHref } from './html.js';

export const flagEmoji = code => /^[A-Za-z]{2}$/.test(code ?? '')
  ? [...code.toUpperCase()].map(c => String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65)).join('') : '🏳️';

/** tone: neutral|brand|success|warning|danger|critical|info|unknown */
export const chip = (text, tone = 'neutral') => html`<span class="chip chip--${tone}">${text}</span>`;

/** Accessible progress bar. Width is applied by hydrate() from data-v (no inline style needed). */
export const progress = (value, label) => {
  const v = Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
  return html`<div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${v}" aria-label="${label}"><i data-v="${v}"></i></div>`;
};
export const ring = (value, label) => {
  const v = Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
  return html`<div class="ring" data-p="${v}" role="img" aria-label="${label}: ${v}%"><b>${v}%</b></div>`;
};
export const avatar = name => {
  const initials = String(name ?? '').trim().split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('') || '?';
  return html`<span class="avatar" aria-hidden="true">${initials}</span>`;
};
export const meter = (met, total) => html`<span class="meter" role="img" aria-label="${met} of ${total} requirements met">${Array.from({ length: total }, (_, i) => html`<i class="${i < met ? 'on' : ''}"></i>`)}</span>`;

export const emptyState = (title, hint, action) => html`<div class="empty"><p><strong>${title}</strong></p><p>${hint}</p>${action ?? ''}</div>`;

/** Compact application card for the Dashboard board. */
export const appCard = ({ id, name, countries, text, urgencyKey, readiness }) => html`
  <a class="appcard" href="#/scholarships/country/${(countries?.[0] ?? 'XX')}?focus=${id}" data-opportunity="${id}">
    <span class="appcard__name">${name}</span>
    <span class="appcard__row"><span>${flagEmoji(countries?.[0])} ${countries?.[0] ?? ''}</span><span class="mono" data-urgency="${urgencyKey ?? 'normal'}">${text}</span></span>
    ${readiness == null ? '' : progress(readiness, `${name} readiness`)}
  </a>`;

/** "Matches for you" card. matchResult = output of rankMatches() item. */
export const matchCard = ({ candidate: c, score, reasons, flags }) => html`
  <article class="card match" data-match="${c.id}">
    <div class="match__top"><div><h3>${c.name}</h3><p class="muted">${flagEmoji(c.countryCodes?.[0])} ${c.provider ?? ''}</p></div><span class="match__score" title="Fit with your interests (not a chance of winning)">${score}</span></div>
    <div class="match__why">${reasons.slice(0, 3).map(r => chip(r.text, r.key === 'funding' ? 'success' : 'brand'))}${flags.slice(0, 2).map(f => chip(f.text, f.key === 'lead' ? 'warning' : 'danger'))}</div>
    <div class="match__actions">
      <button class="btn btn--primary btn--sm" type="button" data-add-to-list="${c.id}">+ Add to my list</button>
      <button class="btn btn--ghost btn--sm" type="button" data-dismiss-match="${c.id}">Not interested</button>
      ${c.officialUrl ? html`<a class="btn btn--ghost btn--sm" href="${safeHref(c.officialUrl)}" target="_blank" rel="noopener noreferrer">Official page<span class="sr-only"> (opens in a new tab)</span></a>` : ''}
    </div>
  </article>`;

/** Apply widths after rendering: sets CSS custom properties through CSSOM (works with a strict CSP). */
export function hydrate(root = document) {
  root.querySelectorAll('[data-v]').forEach(el => el.style.setProperty('--v', el.dataset.v));
  root.querySelectorAll('[data-p]').forEach(el => el.style.setProperty('--p', el.dataset.p));
}
```
**`src/features/dashboard/countdown.js`**
```js
// Countdown maths. Deadlines are UTC instants for precision "exact"; "date-only" has NO time of day.
export const SEC = 1000, MIN = 60 * SEC, HOUR = 60 * MIN, DAY = 24 * HOUR;

/** @returns {{d:number,h:number,m:number,s:number,totalMs:number}} all >= 0 */
export function splitRemaining(ms) {
  const t = Math.max(0, Math.floor(ms / SEC));
  return { d: Math.floor(t / 86400), h: Math.floor(t % 86400 / 3600), m: Math.floor(t % 3600 / 60), s: t % 60, totalMs: Math.max(0, ms) };
}
export const pad2 = n => String(n).padStart(2, '0');

/** Urgency bands (identical thresholds to the approved blueprint). Inclusive lower bound. */
export function urgency(ms) {
  if (ms <= 0) return { key: 'closed', label: 'Closed', rank: 0 };
  if (ms < 1 * DAY) return { key: 'final', label: 'Final hours', rank: 5 };
  if (ms < 3 * DAY) return { key: 'critical', label: 'Critical', rank: 4 };
  if (ms < 7 * DAY) return { key: 'urgent', label: 'Urgent', rank: 3 };
  if (ms < 14 * DAY) return { key: 'high', label: 'High', rank: 2 };
  if (ms < 30 * DAY) return { key: 'attention', label: 'Attention', rank: 1 };
  return { key: 'normal', label: '', rank: 0 };
}

/**
 * View-model for the hero countdown.
 * deadline = { precision: 'exact'|'date-only'|'tentative'|'unknown', at?: ISO UTC, date?: 'YYYY-MM-DD', timezone?: IANA }
 */
export function countdownModel(deadline, now = Date.now(), dhakaDate = ymd(now, 'Asia/Dhaka')) {
  if (!deadline) return { mode: 'none', text: 'Deadline not confirmed' };
  if (deadline.precision === 'exact' && deadline.at) {
    const ms = Date.parse(deadline.at) - now;
    if (Number.isNaN(ms)) return { mode: 'none', text: 'Deadline not confirmed' };
    if (ms <= 0) return { mode: 'closed', text: 'Closed', urgency: urgency(0) };
    return { mode: 'live', parts: splitRemaining(ms), urgency: urgency(ms) };
  }
  if (deadline.precision === 'date-only' && /^\d{4}-\d\d-\d\d$/.test(deadline.date || '')) {
    const today = ymd(now, deadline.timezone || 'Asia/Dhaka');
    const days = Math.round((Date.parse(deadline.date) - Date.parse(today)) / DAY);
    if (days < 0) return { mode: 'closed', text: 'Closed', urgency: urgency(0) };
    // date-only: urgency from whole days, never from an invented time of day
    return { mode: 'days', days, urgency: urgency(days * DAY + DAY - 1), caveat: 'Closing time not confirmed' };
  }
  return { mode: 'none', text: 'Deadline not confirmed' };
}
export function ymd(ms, timeZone) {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(ms));
}
/** Compact text for cards: "22d 04h" (>=3d), "2d 07h 12m", "07h 12m"; date-only -> "49 days". */
export function compactText(model) {
  if (model.mode === 'closed') return 'Closed';
  if (model.mode === 'none') return model.text;
  if (model.mode === 'days') return model.days === 0 ? 'Due today' : `${model.days} day${model.days === 1 ? '' : 's'}`;
  const { d, h, m } = model.parts;
  return d >= 3 ? `${d}d ${pad2(h)}h` : d >= 1 ? `${d}d ${pad2(h)}h ${pad2(m)}m` : `${pad2(h)}h ${pad2(m)}m`;
}

/** Show a UTC instant in an explicit IANA zone, e.g. "20 Oct 2026, 16:00 BST". */
export function formatInZone(iso, timeZone, locale = 'en-GB') {
  return new Intl.DateTimeFormat(locale, { timeZone, day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false, timeZoneName: 'short' }).format(new Date(iso));
}
/** Date-only deadlines have no time of day: "8 Dec 2026". */
export function formatDateOnly(ymdText, locale = 'en-GB') {
  return new Intl.DateTimeFormat(locale, { timeZone: 'UTC', day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(ymdText + 'T00:00:00Z'));
}
```
**`src/features/dashboard/model.js`**
```js
// Pure view-model for the Dashboard. `rows` are results of the repo's opportunityFacts(o, registry, state, now, intake):
//   { opportunity, application:{stage,decision}, window:{status,deadline}, eligibility, blockers, lifecycle }
import { countdownModel, compactText, urgency, DAY } from './countdown.js';

export const APPLYING_STAGES = ['not-started', 'preparing', 'awaiting-documents', 'awaiting-references', 'ready'];
export const SUBMITTED_STAGES = ['submitted', 'under-review', 'interview'];
export const OUTCOME_STAGES = ['offer', 'awarded', 'rejected', 'withdrawn'];
const INACTIVE = ['archived', 'trash', 'purged', 'expired'];

/** "My list" = what the user has chosen to pursue. */
export function inMyList(row, pins = {}) {
  if (INACTIVE.includes(row.lifecycle)) return false;
  const { decision, stage } = row.application;
  if (decision === 'not-pursuing') return false;
  return decision === 'apply' || Boolean(pins[row.opportunity.id]) || stage !== 'not-started';
}
export const laneOf = row => {
  const s = row.application.stage;
  return SUBMITTED_STAGES.includes(s) ? 'submitted' : OUTCOME_STAGES.includes(s) ? 'outcome' : 'applying';
};
const deadlineMs = (row, now) => {
  const d = row.window.deadline;
  if (!d) return Infinity;
  if (d.precision === 'exact' && d.at) return Date.parse(d.at);
  if (d.precision === 'date-only' && d.date) return Date.parse(d.date) + DAY; // end of that calendar day (UTC proxy for ordering only)
  return Infinity;
};

export function buildDashboard(rows, { pins = {}, now = Date.now(), readinessOf = () => null } = {}) {
  const mine = rows.filter(r => inMyList(r, pins));
  const lanes = { applying: [], submitted: [], outcome: [] };
  for (const r of mine) lanes[laneOf(r)].push(r);
  lanes.applying.sort((a, b) => deadlineMs(a, now) - deadlineMs(b, now));

  // Hero: nearest not-yet-closed deadline among applications still being prepared.
  const hero = lanes.applying
    .filter(r => deadlineMs(r, now) > now && r.window.status !== 'closed')
    .sort((a, b) => deadlineMs(a, now) - deadlineMs(b, now))[0] ?? null;

  const within30 = lanes.applying.filter(r => { const t = deadlineMs(r, now); return t > now && t - now <= 30 * DAY; }).length;
  const listedIds = new Set(mine.map(r => r.opportunity.id));
  const openMatches = rows.filter(r => r.window.status === 'open' && !listedIds.has(r.opportunity.id) && r.eligibility.status !== 'ineligible'
    && r.application.decision !== 'not-pursuing' && !INACTIVE.includes(r.lifecycle)).length;

  return {
    hero: hero && {
      row: hero,
      countdown: countdownModel(hero.window.deadline, now),
      readiness: readinessOf(hero),
    },
    kpis: [
      { key: 'applying', label: 'Applying', value: lanes.applying.length },
      { key: 'submitted', label: 'Submitted', value: lanes.submitted.length + lanes.outcome.length },
      { key: 'closing', label: 'Closing in 30 days', value: within30 },
      { key: 'matches', label: 'Open matches', value: openMatches },
    ],
    lanes,
    card: row => {
      const cd = countdownModel(row.window.deadline, now);
      return { id: row.opportunity.id, name: row.opportunity.name, countries: row.opportunity.countryCodes, stage: row.application.stage,
               countdown: cd, text: compactText(cd), urgency: cd.urgency ?? urgency(Infinity), readiness: readinessOf(row) };
    },
  };
}
```
**`src/features/calendar/grid.js`**
```js
// Calendar maths without Date-local pitfalls: everything is computed from y/m/d integers in ONE timezone.
import { ymd } from '../dashboard/countdown.js';

/** 6x7 matrix of {date:'YYYY-MM-DD', inMonth:boolean, day:number}. weekStart: 0=Sun, 1=Mon. month: 1-12. */
export function monthMatrix(year, month, weekStart = 1) {
  const first = new Date(Date.UTC(year, month - 1, 1));
  const offset = (first.getUTCDay() - weekStart + 7) % 7;
  const start = Date.UTC(year, month - 1, 1 - offset);
  const rows = [];
  for (let r = 0; r < 6; r++) {
    const row = [];
    for (let c = 0; c < 7; c++) {
      const d = new Date(start + (r * 7 + c) * 86400000);
      row.push({ date: d.toISOString().slice(0, 10), inMonth: d.getUTCMonth() === month - 1, day: d.getUTCDate() });
    }
    rows.push(row);
  }
  return rows;
}
export const monthLabel = (year, month, locale = 'en-GB') =>
  new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(year, month - 1, 1)));
export const shiftMonth = (year, month, delta) => {
  const t = year * 12 + (month - 1) + delta;
  return { year: Math.floor(t / 12), month: (t % 12) + 1 };
};

/**
 * Normalise registry deadlines + windows into calendar events.
 * input item: { id, opportunityId, name, type: 'opens'|'closes'|'milestone', precision, at?, date?, timezone? }
 * output: adds `day` = calendar day in the viewer's timezone (exact) or the published date (date-only).
 */
export function toEvents(items, viewerZone = 'Asia/Dhaka') {
  return items
    .filter(i => (i.precision === 'exact' && i.at) || (['date-only', 'tentative'].includes(i.precision) && i.date))
    .map(i => ({ ...i, day: i.precision === 'exact' ? ymd(Date.parse(i.at), viewerZone) : i.date }))
    .sort((a, b) => a.day.localeCompare(b.day) || (a.at || '').localeCompare(b.at || ''));
}
export function eventsByDay(events) {
  const map = new Map();
  for (const e of events) { if (!map.has(e.day)) map.set(e.day, []); map.get(e.day).push(e); }
  return map;
}
/** Agenda grouped by month, future first. */
export function agenda(events, fromDay) {
  const groups = new Map();
  for (const e of events.filter(e => e.day >= fromDay)) {
    const key = e.day.slice(0, 7);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(e);
  }
  return [...groups].map(([month, items]) => ({ month, items }));
}
```
**`src/features/radar/match.js`**
```js
// Deterministic "matches for you" score. NOT an admission or award probability.
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

/**
 * candidate: { id, name, countryCodes:[ISO2], researchAreas:[], funding: 'full-cost-verified'|'tuition-stipend-net-pending'|'partial'|'tuition-only'|'unknown'|...,
 *              degreeTypes:[], status:'open'|'opening-soon'|'upcoming'|..., deadlineAt?:ISO, eligibility?:'confirmed'|'conditional'|'requires-assessment'|'ineligible',
 *              returnHome?:'yes'|'no'|'unknown', verified:boolean }
 * profile:   { researchAreas:[], preferredCountries:[ISO2], allowReturnHome:boolean, citizenship?:ISO2 }
 */
export function matchScore(candidate, profile, now = Date.now()) {
  const reasons = [], flags = [];
  let score = 0;

  const areas = candidate.researchAreas?.filter(a => profile.researchAreas?.includes(a)) ?? [];
  if (areas.length) { score += Math.min(30, areas.length * 15); reasons.push({ key: 'area', text: `Research match: ${areas.join(', ')}` }); }

  const country = candidate.countryCodes?.some(c => profile.preferredCountries?.includes(c));
  if (country) { score += 20; reasons.push({ key: 'country', text: 'In a preferred country' }); }

  const fundingPoints = { 'full-cost-verified': 25, 'tuition-stipend-net-pending': 18, 'competitive-assistantship': 12, partial: 8, 'tuition-only': 6, 'stipend-only': 6 };
  const fp = fundingPoints[candidate.funding] ?? 0;
  if (fp) { score += fp; reasons.push({ key: 'funding', text: candidate.funding === 'full-cost-verified' ? 'Fully funded (verified)' : 'Funding available — check coverage' }); }

  if (candidate.degreeTypes?.some(d => /master|msc/i.test(d))) { score += 10; reasons.push({ key: 'degree', text: 'Masters level' }); }

  if (candidate.status === 'open') { score += 10; reasons.push({ key: 'window', text: 'Open now' }); }
  else if (candidate.status === 'opening-soon') { score += 6; reasons.push({ key: 'window', text: 'Opening soon' }); }

  if (candidate.deadlineAt) {
    const days = (Date.parse(candidate.deadlineAt) - now) / 86400000;
    if (days >= 14 && days <= 120) { score += 5; reasons.push({ key: 'time', text: 'Enough time to prepare' }); }
    if (days > 0 && days < 14) flags.push({ key: 'tight', text: `Only ${Math.ceil(days)} days left` });
  }

  if (candidate.returnHome === 'yes' && profile.allowReturnHome === false) { score -= 30; flags.push({ key: 'return', text: 'Return-home requirement' }); }
  if (candidate.eligibility === 'ineligible') { score = Math.min(score, 10); flags.push({ key: 'ineligible', text: 'Likely ineligible' }); }
  if (!candidate.verified) flags.push({ key: 'lead', text: 'Unverified lead — confirm on the official site' });

  score = clamp(Math.round(score), 0, 100);
  const band = score >= 70 ? 'strong' : score >= 45 ? 'good' : 'possible';
  return { score, band, reasons, flags };
}

/** Rank matches, drop dismissed + already-listed, keep only open/opening-soon unless includeFuture. */
export function rankMatches(candidates, profile, { dismissed = new Set(), listed = new Set(), includeFuture = false, limit = 6, now = Date.now() } = {}) {
  return candidates
    .filter(c => !dismissed.has(c.id) && !listed.has(c.id))
    .filter(c => includeFuture || ['open', 'opening-soon'].includes(c.status))
    .map(c => ({ candidate: c, ...matchScore(c, profile, now) }))
    .filter(m => m.band !== 'possible' || m.score >= 30)
    .sort((a, b) => b.score - a.score || Number(b.candidate.verified) - Number(a.candidate.verified))
    .slice(0, limit);
}
```
**`src/app/ticker.js`**
```js
// One shared ticker. Hero subscribes at 1000 ms, cards at 60000 ms. Pauses while the tab is hidden and
// fires immediately on return, so numbers are always recomputed from Date.now() (no accumulated drift).
export function createTicker({ now = () => Date.now(), set = setInterval, clear = clearInterval, isHidden = () => typeof document !== 'undefined' && document.hidden } = {}) {
  const subs = new Map();            // fn -> { every, last }
  let handle = null;
  const run = force => {
    if (isHidden() && !force) return;
    const t = now();
    for (const [fn, s] of subs) if (force || t - s.last >= s.every - 5) { s.last = t; fn(t); }
  };
  const start = () => { if (!handle && subs.size) handle = set(() => run(false), 1000); };
  const stop = () => { if (handle && !subs.size) { clear(handle); handle = null; } };
  return {
    subscribe(fn, every = 1000) { subs.set(fn, { every, last: 0 }); start(); fn(now()); return () => { subs.delete(fn); stop(); }; },
    onVisible() { run(true); },     // call from a 'visibilitychange' listener when document.hidden === false
    size: () => subs.size,
  };
}
```

**Adapter to the repo's domain (`src/v4/adapter.js`, tested).** The repo's `opportunityFacts(opportunity, registry, state, now, intake)` already returns the row shape `buildDashboard` needs, so the adapter only injects it:
```js
import { opportunityFacts, readiness } from '../v3/domain.js';
import { registry } from '../v3/catalog.js';           // VERIFY export name
const api = createAdapter({ opportunityFacts, readiness, registry });
const { model, matches, profile } = api.dashboard(store.get().state, { now: Date.now(), intake });
```
**`src/v4/adapter.js`**
```js
// Bridge between the repo's V3 domain (src/v3/domain.js, UNCHANGED) and the v4 view-models.
// All repo functions are INJECTED so this file has no import from ../v3 and can be unit-tested in isolation:
//   const api = createAdapter({ opportunityFacts, readiness, registry });   // in src/v4/workspace.js
import { buildDashboard } from '../features/dashboard/model.js';
import { rankMatches } from '../features/radar/match.js';

const DEFAULT_AREAS = ['machine-learning', 'computer-vision', 'efficient-ai'];   // same defaults as v3 preferenceFit()
const DEFAULT_COUNTRIES = ['CA', 'AU', 'US', 'GB'];                                // same defaults as v3 preferenceFit()

export function profileFromState(state) {
  const p = state.v3?.profile || {}, pref = state.v3?.preferences || {};
  return {
    displayName: typeof p.displayName === 'string' && p.displayName.trim() ? p.displayName.trim() : '',   // NEW optional field (schema change, S6)
    researchAreas: Array.isArray(p.researchAreas) && p.researchAreas.length ? p.researchAreas : DEFAULT_AREAS,
    preferredCountries: Array.isArray(pref.preferredCountries) && pref.preferredCountries.length ? pref.preferredCountries : DEFAULT_COUNTRIES,
    allowReturnHome: pref.allowReturnHome !== false,
    citizenship: p.citizenship || null,
  };
}

/** Registry opportunity + its facts row -> candidate understood by match.js */
export function candidateFromRow(row) {
  const o = row.opportunity;
  return {
    id: o.id, name: o.name, provider: o.provider, countryCodes: o.countryCodes || [],
    researchAreas: o.researchAreas || [], funding: o.funding?.classification ?? 'unknown',
    degreeTypes: o.degreeTypes || [], status: row.window.status,
    deadlineAt: row.window.deadline?.precision === 'exact' ? row.window.deadline.at : null,
    eligibility: row.eligibility.status, returnHome: o.obligations?.returnHome ?? 'unknown',
    verified: o.verification?.state === 'verified', officialUrl: o.officialUrl ?? null,
  };
}

export function createAdapter({ opportunityFacts, readiness, registry }) {
  const rowsFor = (state, now, intake) => registry.opportunities
    .filter(o => o.windows.some(w => w.intake === intake) || true)       // keep all: facts() reports "verification-required" for missing windows
    .map(o => opportunityFacts(o, registry, state, now, intake));
  return {
    rowsFor,
    dashboard(state, { now = Date.now(), intake = 2027 } = {}) {
      const rows = rowsFor(state, now, intake);
      const readinessOf = row => {
        const r = readiness(row.opportunity, row.application, state);
        return r.percent;                                              // null when the route has no mandatory steps defined
      };
      const model = buildDashboard(rows, { pins: state.pins || {}, now, readinessOf });
      const listed = new Set(rows.filter(r => model.lanes.applying.includes(r) || model.lanes.submitted.includes(r) || model.lanes.outcome.includes(r)).map(r => r.opportunity.id));
      const dismissed = new Set(state.v4?.dismissedMatches || []);
      const matches = rankMatches(rows.filter(r => r.eligibility.status !== 'ineligible' && r.application.decision !== 'not-pursuing').map(candidateFromRow),
        profileFromState(state), { dismissed, listed, now, limit: 6 });
      return { rows, model, matches, profile: profileFromState(state) };
    },
    /** "x of y required steps" text for the hero. */
    stepsText(row, state) { const r = readiness(row.opportunity, row.application, state); return r.total ? `${r.done} of ${r.total} required steps` : 'Steps not yet defined'; },
  };
}
```
**`tests/adapter.test.mjs`**
```js
import test from 'node:test';
import assert from 'node:assert/strict';
import * as real from './fixtures/domain.real.js';
import { createAdapter, profileFromState, candidateFromRow } from '../src/v4/adapter.js';

const NOW = Date.UTC(2026, 9, 20, 6, 0, 0);
const opp = (id, o = {}) => ({
  id, name: id.toUpperCase(), provider: 'P', countryCodes: ['GB'], researchAreas: ['machine-learning'], category: 'scholarship',
  degreeTypes: ['taught-master'], universityIds: [], sourceIds: [], eligibility: [{ label: 'ok', assessment: 'confirmed', sourceIds: [] }],
  funding: { classification: 'full-cost-verified' }, obligations: { returnHome: 'no' }, verification: { state: 'verified', checkedAt: '2026-10-16' },
  windows: [{ intake: 2027, status: 'open', verification: 'verified', checkedAt: '2026-10-16', note: '' }],
  guide: { steps: [{ id: 's1', required: true }, { id: 's2', required: true }, { id: 's3', required: false }], unconfirmed: [], supervisor: { requirement: 'none' }, english: { status: 'x' } },
  ...o,
});
const dl = (opportunityId, o) => ({ id: opportunityId + '-close', opportunityId, intake: 2027, controlsWindow: true, required: true, blocksRoute: false, ...o });
const registry = {
  opportunities: [opp('near'), opp('far'), opp('closed'), opp('fresh'), opp('lead', { verification: { state: 'unconfirmed' }, windows: [{ intake: 2027, status: 'open', verification: 'unverified', checkedAt: '2026-10-16' }] })],
  deadlines: [
    dl('near', { precision: 'exact', at: '2026-10-29T16:00:00Z' }),
    dl('far', { precision: 'date-only', date: '2026-12-08', timezone: 'Europe/London' }),
    dl('closed', { precision: 'exact', at: '2026-10-01T00:00:00Z' }),
    dl('fresh', { precision: 'exact', at: '2026-12-20T00:00:00Z' }),
  ],
};
const state = {
  v3: { profile: { citizenship: 'BD', cgpa: '3.5', researchAreas: ['machine-learning'] }, preferences: { preferredCountries: ['GB'], allowReturnHome: false },
        applications: { 'near:2027': { opportunityId: 'near', intake: 2027, stage: 'preparing', decision: 'apply', completedSteps: { s1: true } },
                        'far:2027': { opportunityId: 'far', intake: 2027, stage: 'not-started', decision: 'apply', completedSteps: {} } } },
  pins: {}, lifecycle: {}, progress: {},
};
const api = createAdapter({ opportunityFacts: real.opportunityFacts, readiness: real.readiness, registry });

test('adapter: real domain rows -> dashboard hero is the nearest in-my-list open deadline', () => {
  const d = api.dashboard(state, { now: NOW });
  assert.equal(d.model.hero.row.opportunity.id, 'near');
  assert.equal(d.model.hero.countdown.mode, 'live');
  assert.equal(d.model.hero.readiness, 50);                                   // 1 of 2 mandatory steps (s3 optional)
  assert.equal(api.stepsText(d.model.hero.row, state), '1 of 2 required steps');
  assert.deepEqual(d.model.lanes.applying.map(r => r.opportunity.id), ['near', 'far']);
  const far = d.model.card(d.model.lanes.applying[1]);
  assert.equal(far.countdown.mode, 'days'); assert.equal(far.countdown.days, 49); // date-only: no invented time
});
test('adapter: closed windows never become hero; closed counted in neither KPI', () => {
  const s2 = structuredClone(state); s2.v3.applications['closed:2027'] = { opportunityId: 'closed', intake: 2027, stage: 'preparing', decision: 'apply', completedSteps: {} };
  const d = api.dashboard(s2, { now: NOW });
  assert.equal(d.model.hero.row.opportunity.id, 'near');
  const closedRow = d.rows.find(r => r.opportunity.id === 'closed'); assert.equal(closedRow.window.status, 'closed');
});
test('adapter: matches exclude listed items, unverified leads are flagged, preferences drive ranking', () => {
  const d = api.dashboard(state, { now: NOW });
  const ids = d.matches.map(m => m.candidate.id);
  assert.ok(!ids.includes('near') && !ids.includes('far'));                    // already in my list
  assert.ok(ids.includes('fresh'));
  const lead = d.matches.find(m => m.candidate.id === 'lead');
  if (lead) assert.ok(lead.flags.some(f => f.key === 'lead'));                // unverified -> flagged
  assert.ok(d.matches[0].score >= d.matches[d.matches.length - 1].score);
});
test('adapter: dismissed matches are respected', () => {
  const s2 = structuredClone(state); s2.v4 = { dismissedMatches: ['fresh'] };
  assert.ok(!api.dashboard(s2, { now: NOW }).matches.some(m => m.candidate.id === 'fresh'));
});
test('profileFromState defaults mirror the repo (areas + countries) and never invents a name', () => {
  const p = profileFromState({});
  assert.deepEqual(p.researchAreas, ['machine-learning', 'computer-vision', 'efficient-ai']);
  assert.deepEqual(p.preferredCountries, ['CA', 'AU', 'US', 'GB']);
  assert.equal(p.displayName, ''); assert.equal(p.allowReturnHome, true);
  assert.equal(profileFromState({ v3: { profile: { displayName: '  Alex  ' }, preferences: { allowReturnHome: false } } }).displayName, 'Alex');
});
test('candidateFromRow maps registry fields without inventing', () => {
  const row = real.opportunityFacts(registry.opportunities[0], registry, state, NOW, 2027);
  const c = candidateFromRow(row);
  assert.equal(c.funding, 'full-cost-verified'); assert.equal(c.status, 'open'); assert.equal(c.deadlineAt, '2026-10-29T16:00:00Z');
  assert.equal(c.verified, true); assert.equal(c.officialUrl, null);
});
```

---

## 10. Data contracts
**State additions** (additive, versioned; location chosen in S0): `ui:{theme,calendarView,scholarshipsTab}` · `dismissedMatches:string[]` · `leads:{[radarId]:{addedAt:ISO, note?:string}}` · profile `{displayName, programme, researchAreas:string[], preferredCountries:ISO2[], allowReturnHome:boolean, requirementWeights}`.
**Country fit block** (`data/v3/countries.json`, per country): `fit:{ work, career, spouse, pr }`, each `{ level:'met|partial|unmet|unknown', reason:string (≤ 160 chars), sourceIds:string[], checkedAt:'YYYY-MM-DD' }`. No `sourceIds`/`checkedAt` ⇒ UI shows **Provisional**.
**Radar file** (`data/v3/radar.json`): schema `career-track/radar@1`; sample:
**`data-samples/radar.sample.json`**
```json
{
  "schema": "career-track/radar@1",
  "generatedAt": "2026-10-20T03:00:00Z",
  "source": { "name": "ScholarshipAPI", "url": "https://scholarshipapi.com/", "terms": "UNVERIFIED — read the provider terms before enabling" },
  "items": [
    {
      "id": "radar:sample-001",
      "name": "Sample International Masters Scholarship",
      "provider": "Sample University",
      "countryCodes": ["GB"],
      "researchAreas": ["machine-learning"],
      "degreeTypes": ["taught-master"],
      "funding": "unknown",
      "status": "open",
      "deadlineAt": null,
      "deadlineDate": "2026-12-15",
      "officialUrl": "https://example.org/scholarships/sample",
      "summary": "Short neutral summary (max 240 chars). No copied marketing text.",
      "verified": false,
      "firstSeen": "2026-10-20",
      "lastSeen": "2026-10-20"
    }
  ]
}
```
**Demo mode fixtures** (`data/demo/*`): fictional profile `{displayName:'Alex Morgan', programme:'MSc 2027 · Bangladesh', researchAreas:['machine-learning','computer-vision'], preferredCountries:['GB','DE','CA'], allowReturnHome:false}` plus sample progress; activated by `?demo=1`; writes go to an in-memory store, never to the owner's storage.

## 11. Matches collector (nightly)
**`scripts/radar/refresh.mjs`** — response field names in `mapHit` are **[U]**: run once with a real key, inspect one hit, adjust, then enable the workflow.
**`scripts/radar/refresh.mjs`**
```js
// Nightly collector: pulls candidate scholarships from ONE external source and writes data/v3/radar.json.
// - Runs in GitHub Actions only (the API key lives in repository secrets; the browser never sees it).
// - Output are LEADS (verified:false). They never become verified deadlines without a human adding a registry entry.
// - STATUS: written against the provider's public description (REST /v1/search, API key, 100 requests/day on the free tier).
//   Field names in `mapHit` are UNVERIFIED: run once locally with a real key, inspect one hit, and adjust `mapHit` before enabling the workflow.
import { writeFile, readFile } from 'node:fs/promises';

const API = process.env.SCHOLARSHIP_API_URL ?? 'https://api.scholarshipapi.com/v1/search';
const KEY = process.env.SCHOLARSHIP_API_KEY;
const OUT = new URL('../../data/v3/radar.json', import.meta.url);
const MAX_REQUESTS = 20;                       // hard budget: far below the 100/day cap
const QUERIES = [                              // derived from the owner's interests; edit in data/v3/radar-queries.json later
  { q: 'masters scholarship fully funded machine learning' },
  { q: 'masters scholarship international students artificial intelligence' },
  { q: 'masters scholarship computer vision' },
];

const norm = s => String(s ?? '').replace(/\s+/g, ' ').trim();
const clip = (s, n) => (s.length > n ? s.slice(0, n - 1) + '…' : s);

/** ADAPT after inspecting one real response. Everything defensive: missing field -> null/unknown, never guessed. */
export function mapHit(hit, today) {
  const url = hit.url ?? hit.link ?? hit.official_url ?? null;
  if (!hit.name && !hit.title) return null;
  let safeUrl = null; try { const u = new URL(url); if (u.protocol === 'https:') safeUrl = u.href; } catch {}
  if (!safeUrl) return null;                    // a lead without an official https link is useless
  const deadline = norm(hit.deadline ?? hit.closing_date ?? '');
  return {
    id: 'radar:' + (hit.id ?? safeUrl).toString().toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60),
    name: clip(norm(hit.name ?? hit.title), 140),
    provider: clip(norm(hit.university ?? hit.provider ?? ''), 120),
    countryCodes: Array.isArray(hit.country_codes) ? hit.country_codes.filter(c => /^[A-Z]{2}$/.test(c)) : [],
    researchAreas: [],                          // classified later by registry keywords, never invented here
    degreeTypes: /master/i.test(norm(hit.level ?? hit.degree ?? '')) ? ['taught-master'] : [],
    funding: 'unknown',                         // 'full' only after a human reads the official page
    status: /open/i.test(norm(hit.status)) ? 'open' : 'upcoming',
    deadlineAt: null,
    deadlineDate: /^\d{4}-\d\d-\d\d$/.test(deadline) ? deadline : null,
    officialUrl: safeUrl,
    summary: clip(norm(hit.summary ?? hit.description ?? ''), 240),
    verified: false, firstSeen: today, lastSeen: today,
  };
}

export function merge(previous, fresh, today) {
  const byId = new Map(previous.map(i => [i.id, i]));
  for (const f of fresh) {
    const old = byId.get(f.id);
    byId.set(f.id, old ? { ...f, firstSeen: old.firstSeen } : f);
  }
  // drop leads not seen for 21 days (stale) so the feed never shows dead links forever
  return [...byId.values()].filter(i => (Date.parse(today) - Date.parse(i.lastSeen)) / 86400000 <= 21);
}

async function main() {
  if (!KEY) { console.log('SCHOLARSHIP_API_KEY not set — skipping (no file change).'); return; }
  const today = new Date().toISOString().slice(0, 10);
  let previous = []; try { previous = JSON.parse(await readFile(OUT, 'utf8')).items ?? []; } catch {}
  const fresh = []; let used = 0;
  for (const query of QUERIES) {
    if (used >= MAX_REQUESTS) break;
    used++;
    const res = await fetch(API, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${KEY}` }, body: JSON.stringify({ ...query, limit: 20 }), signal: AbortSignal.timeout(15000) });
    if (!res.ok) { console.error('provider error', res.status); process.exitCode = 1; return; }
    const body = await res.json();
    for (const hit of body.hits ?? []) { const m = mapHit(hit, today); if (m) fresh.push(m); }
  }
  const items = merge(previous, fresh, today).sort((a, b) => a.name.localeCompare(b.name));
  await writeFile(OUT, JSON.stringify({ schema: 'career-track/radar@1', generatedAt: new Date().toISOString(), source: { name: 'ScholarshipAPI', url: 'https://scholarshipapi.com/', terms: 'UNVERIFIED — read the provider terms before enabling' }, items }, null, 2) + '\n');
  console.log(`radar: ${items.length} leads (${fresh.length} fresh, ${used} requests)`);
}
if (import.meta.url === `file://${process.argv[1]}`) main();
```
**`.github/workflows/radar-refresh.yml`** — opens a PR; never pushes to `main`. Requires repository secret `SCHOLARSHIP_API_KEY` (owner adds it; never committed).
**`.github/workflows/radar-refresh.yml`**
```yaml
name: radar-refresh
on:
  schedule: [{ cron: '17 3 * * *' }]    # daily 03:17 UTC
  workflow_dispatch: {}
permissions: { contents: write, pull-requests: write }
jobs:
  refresh:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - run: node scripts/radar/refresh.mjs
        env: { SCHOLARSHIP_API_KEY: '${{ secrets.SCHOLARSHIP_API_KEY }}' }
      - name: Open PR if data changed (never push to main)
        run: |
          if [ -n "$(git status --porcelain data/v3/radar.json)" ]; then
            git config user.name "radar-bot"; git config user.email "radar-bot@users.noreply.github.com"
            git checkout -b radar/$(date +%Y%m%d)
            git add data/v3/radar.json && git commit -m "data: radar refresh $(date +%F)"
            git push origin HEAD
            gh pr create --title "Radar refresh $(date +%F)" --body "Automated lead refresh. Leads are UNVERIFIED." --base main
          fi
        env: { GH_TOKEN: '${{ github.token }}' }
```

## 12. Interaction contract
| Hook | Handler | Effect |
|---|---|---|
| `[data-add-to-list="<id>"]` | `addToList(id)` | Existing store action sets decision `apply` (verified opportunities) or creates `leads[id]` (radar leads); toast "Added to your list"; Dashboard re-renders; button disabled "✓ Added" |
| `[data-dismiss-match="<id>"]` | `dismissMatch(id)` | Append to `dismissedMatches`; card removed; toast with **Undo** (5 s) |
| `[data-open-opportunity="<id>"]` | `openDrawer(id)` | Route `…?focus=<id>`; drawer opens |
| `[data-month-prev|next|today]` | `shiftMonth` / today | Updates `?month=YYYY-MM` |
| `.tab[role=tab]` | tab handler | Updates route segment; roving focus |
| `#syncRetry` | `store.retry()` | Re-attempts failed save |

**Keyboard map:** `1`–`5` views · `/` focus search · `Esc` close drawer/menu · `T` calendar today · `←/→/↑/↓` move in calendar grid · `Enter` open event · `Tab` order = skip link → sidebar → top bar → main.

## 13. Accessibility specification
1. Landmarks: `aside[aria-label="Primary"]`, `nav[aria-label="Main"]`, `header.topbar`, `main#main`; one `h1` (`#pageTitle`) per view; headings never skip levels.
2. Focus: visible 2 px outline everywhere; after route change focus `#pageTitle`; drawer traps focus and restores it to the opener.
3. Colour is never the only signal: every status has a text label and a shape/outline difference (solid / dashed / dotted).
4. Targets ≥ 44 px; spacing ≥ 8 px between adjacent small buttons.
5. Countdown: `role="timer"`, `aria-live="off"`; a visually hidden polite live region announces only urgency-band changes and, below 24 h, once per minute.
6. Tables (`evidence`, matrices) use `th scope`; wide tables scroll in their own container.
7. External links: `target="_blank" rel="noopener noreferrer"` + sr-only "(opens in a new tab)".
8. Motion: all transitions/animations collapse to 0 ms under `prefers-reduced-motion`.
9. Zoom/reflow: usable at 200 % zoom and 320 px width without horizontal page scroll.
10. Axe: 0 serious/critical on every view in light and dark.

## 14. Copy deck (exact strings)
| Place | Text |
|---|---|
| Dashboard subtitle | "Your next move, at a glance" |
| Hero eyebrow | "Next deadline · in my list" |
| Hero empty | Title "Add your first scholarship" · hint "Pick one from your matches below, or browse by country." · button "Browse scholarships" |
| Date-only chip | "Time not confirmed" |
| Provider/Dhaka lines | "Provider time · {date}" / "Your time · {date}" |
| KPI labels | "Applying" · "Submitted" · "Closing in 30 days" · "Open matches" |
| Matches heading / sub | "Matches for you" / "Open now and fitting your interests. One tap adds to your list." |
| Matches empty | "No new matches today. We check every day." |
| Score tooltip | "Fit with your interests — not a chance of winning." |
| Lead chip / task | "Unverified lead" / "Verify on the official site" |
| Scholarships subtitle | "Where to apply and what you give up" |
| Sacrifice sentence | "You sacrifice: {labels}." · none: "Nothing to sacrifice — every requirement met." |
| Provisional chip tooltip | "Ratings not yet verified against official sources" |
| Calendar subtitle | "When things open and close" |
| Documents subtitle | "Your application dossier" |
| Settings subtitle | "Profile, data and preferences" |
| Save states | "Saved on this device" · "Saving…" · "Could not save — Retry" · "Offline — showing last saved copy" |
| Danger zone | "Type RESET to confirm. We download a backup first." |
Rules: sentence case; no sentence over 20 words in headings or helper text; helper text ≤ 2 lines; never "Evidence-backed", "Intelligence" or similar marketing words on the first screen.

## 15. Tests (complete)
Run: `node --test tests/v4.test.mjs tests/radar.test.mjs` (19 tests).
**`tests/v4.test.mjs`**
```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { html, raw, safeHref, escapeHtml } from '../src/ui/html.js';
import { splitRemaining, urgency, countdownModel, compactText, DAY, HOUR, MIN } from '../src/features/dashboard/countdown.js';
import { monthMatrix, monthLabel, shiftMonth, toEvents, eventsByDay, agenda } from '../src/features/calendar/grid.js';
import { matchScore, rankMatches } from '../src/features/radar/match.js';
import { buildDashboard, inMyList, laneOf } from '../src/features/dashboard/model.js';

const NOW = Date.UTC(2026, 9, 20, 6, 0, 0); // 20 Oct 2026 06:00Z

test('html escapes by default, raw opts out, arrays join, falsy dropped', () => {
  assert.equal(String(html`<p>${'<script>alert(1)</script>'}</p>`), '<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>');
  assert.equal(String(html`<b>${raw('<i>x</i>')}</b>`), '<b><i>x</i></b>');
  assert.equal(String(html`<ul>${['a', '<b>'].map(x => html`<li>${x}</li>`)}</ul>`), '<ul><li>a</li><li>&lt;b&gt;</li></ul>');
  assert.equal(String(html`${false}${null}${undefined}x`), 'x');
  assert.equal(String(html`<a title="${'" onmouseover="x'}">`), '<a title="&quot; onmouseover=&quot;x">');
  assert.equal(safeHref('javascript:alert(1)'), '#');
  assert.equal(safeHref('https://example.org/a?b=1'), 'https://example.org/a?b=1');
  assert.equal(escapeHtml(null), '');
});

test('countdown parts and urgency bands (boundaries)', () => {
  assert.deepEqual(splitRemaining(22 * DAY + 4 * HOUR + 18 * MIN + 37000), { d: 22, h: 4, m: 18, s: 37, totalMs: 22 * DAY + 4 * HOUR + 18 * MIN + 37000 });
  assert.equal(splitRemaining(-5).d, 0);
  const k = ms => urgency(ms).key;
  assert.deepEqual([k(0), k(DAY - 1), k(DAY), k(3 * DAY - 1), k(3 * DAY), k(7 * DAY), k(14 * DAY), k(30 * DAY - 1), k(30 * DAY)],
    ['closed', 'final', 'critical', 'critical', 'urgent', 'high', 'attention', 'attention', 'normal']);
});

test('countdown model: exact, date-only (no invented time), closed, none', () => {
  const exact = countdownModel({ precision: 'exact', at: '2026-10-20T15:00:00Z' }, NOW);
  assert.equal(exact.mode, 'live'); assert.equal(exact.parts.h, 9);
  const dateOnly = countdownModel({ precision: 'date-only', date: '2026-12-08', timezone: 'Europe/London' }, NOW);
  assert.equal(dateOnly.mode, 'days'); assert.equal(dateOnly.days, 49); assert.match(dateOnly.caveat, /not confirmed/);
  assert.equal(compactText(dateOnly), '49 days');
  assert.equal(countdownModel({ precision: 'exact', at: '2026-10-19T00:00:00Z' }, NOW).mode, 'closed');
  assert.equal(countdownModel({ precision: 'unknown' }, NOW).mode, 'none');
  assert.equal(countdownModel(null, NOW).mode, 'none');
  assert.equal(compactText(exact), '09h 00m');
  assert.equal(compactText(countdownModel({ precision: 'exact', at: '2026-11-12T10:00:00Z' }, NOW)), '23d 04h');
});

test('London clock change does not shift an absolute UTC deadline', () => {
  // 2026-10-25 01:30 BST/GMT is ambiguous in wall time, but the stored UTC instant is unambiguous.
  const before = countdownModel({ precision: 'exact', at: '2026-10-25T12:00:00Z' }, Date.UTC(2026, 9, 24, 12, 0, 0));
  assert.equal(before.parts.d, 1); assert.equal(before.parts.h, 0);
});

test('month matrix: 6 rows, Monday start, October 2026', () => {
  const m = monthMatrix(2026, 10, 1);
  assert.equal(m.length, 6); assert.ok(m.every(r => r.length === 7));
  assert.equal(m[0][0].date, '2026-09-28');           // Mon before Thu 1 Oct
  assert.equal(m[0][3].date, '2026-10-01'); assert.equal(m[0][3].inMonth, true);
  assert.equal(m[0][0].inMonth, false);
  assert.equal(monthMatrix(2026, 10, 0)[0][0].date, '2026-09-27'); // Sunday start
  assert.equal(monthMatrix(2028, 2, 1).flat().filter(c => c.inMonth).length, 29); // leap year
});
test('month label and shift across year boundary', () => {
  assert.equal(monthLabel(2026, 10), 'October 2026');
  assert.deepEqual(shiftMonth(2026, 12, 1), { year: 2027, month: 1 });
  assert.deepEqual(shiftMonth(2026, 1, -1), { year: 2025, month: 12 });
});
test('events: exact uses viewer zone day, date-only keeps published date, unknown dropped', () => {
  const ev = toEvents([
    { id: 'a', name: 'A', type: 'closes', precision: 'exact', at: '2026-10-20T20:30:00Z' },   // 21 Oct 02:30 Dhaka
    { id: 'b', name: 'B', type: 'closes', precision: 'date-only', date: '2026-12-08' },
    { id: 'c', name: 'C', type: 'opens', precision: 'unknown' },
    { id: 'd', name: 'D', type: 'opens', precision: 'tentative', date: '2026-11-01' },
  ], 'Asia/Dhaka');
  assert.deepEqual(ev.map(e => [e.id, e.day]), [['a', '2026-10-21'], ['d', '2026-11-01'], ['b', '2026-12-08']]);
  assert.equal(eventsByDay(ev).get('2026-10-21').length, 1);
  const ag = agenda(ev, '2026-11-01');
  assert.deepEqual(ag.map(g => g.month), ['2026-11', '2026-12']);
});

const profile = { researchAreas: ['machine-learning', 'computer-vision'], preferredCountries: ['GB', 'DE'], allowReturnHome: false };
const cand = (o = {}) => ({ id: 'x', name: 'X', countryCodes: ['GB'], researchAreas: ['machine-learning'], funding: 'full-cost-verified', degreeTypes: ['research-master'], status: 'open', deadlineAt: '2026-12-20T00:00:00Z', verified: true, ...o });
test('match score: strong match with reasons, deterministic', () => {
  const m = matchScore(cand(), profile, NOW);
  assert.equal(m.score, 15 + 20 + 25 + 10 + 10 + 5); assert.equal(m.band, 'strong');
  assert.ok(m.reasons.some(r => r.key === 'country'));
  assert.deepEqual(matchScore(cand(), profile, NOW), m);
});
test('match score: penalties, caps and flags', () => {
  assert.ok(matchScore(cand({ returnHome: 'yes' }), profile, NOW).flags.some(f => f.key === 'return'));
  assert.ok(matchScore(cand({ eligibility: 'ineligible' }), profile, NOW).score <= 10);
  assert.ok(matchScore(cand({ verified: false }), profile, NOW).flags.some(f => f.key === 'lead'));
  assert.ok(matchScore(cand({ deadlineAt: '2026-10-25T00:00:00Z' }), profile, NOW).flags.some(f => f.key === 'tight'));
  const none = matchScore(cand({ countryCodes: ['ZZ'], researchAreas: [], funding: 'unknown', degreeTypes: [], status: 'upcoming', deadlineAt: undefined }), profile, NOW);
  assert.equal(none.score, 0); assert.equal(none.band, 'possible');
});
test('rankMatches excludes dismissed/listed/future and sorts', () => {
  const list = [cand({ id: 'a' }), cand({ id: 'b', funding: 'partial' }), cand({ id: 'c', status: 'upcoming' }), cand({ id: 'd' })];
  const r = rankMatches(list, profile, { dismissed: new Set(['d']), listed: new Set(), now: NOW });
  assert.deepEqual(r.map(x => x.candidate.id), ['a', 'b']);
  assert.deepEqual(rankMatches(list, profile, { listed: new Set(['a']), includeFuture: true, now: NOW }).map(x => x.candidate.id).includes('a'), false);
});

const row = (id, o = {}) => ({
  opportunity: { id, name: id.toUpperCase(), countryCodes: ['GB'] },
  application: { stage: 'not-started', decision: 'research', ...(o.application || {}) },
  window: { status: 'open', deadline: o.deadline === undefined ? { precision: 'exact', at: '2026-11-01T00:00:00Z' } : o.deadline },
  eligibility: { status: 'requires-assessment' }, blockers: [], lifecycle: 'active', ...(o.rest || {}),
});
test('dashboard: my list, lanes, hero is nearest APPLYING deadline, KPIs', () => {
  const rows = [
    row('far', { application: { decision: 'apply' }, deadline: { precision: 'exact', at: '2026-12-31T00:00:00Z' } }),
    row('near', { application: { decision: 'apply', stage: 'preparing' }, deadline: { precision: 'exact', at: '2026-10-30T00:00:00Z' } }),
    row('sent', { application: { stage: 'submitted', decision: 'apply' }, deadline: { precision: 'exact', at: '2026-10-21T00:00:00Z' } }),
    row('won', { application: { stage: 'awarded', decision: 'apply' } }),
    row('skip', { application: { decision: 'not-pursuing' } }),
    row('pinned', { deadline: { precision: 'date-only', date: '2026-12-08', timezone: 'Europe/London' } }),
    row('other'),
  ];
  const d = buildDashboard(rows, { pins: { pinned: true }, now: NOW });
  assert.equal(d.hero.row.opportunity.id, 'near');
  assert.deepEqual(d.lanes.applying.map(r => r.opportunity.id), ['near', 'pinned', 'far']);
  assert.deepEqual(d.lanes.submitted.map(r => r.opportunity.id), ['sent']);
  assert.deepEqual(d.lanes.outcome.map(r => r.opportunity.id), ['won']);
  const k = Object.fromEntries(d.kpis.map(x => [x.key, x.value]));
  assert.deepEqual(k, { applying: 3, submitted: 2, closing: 1, matches: 1 });
  assert.equal(inMyList(rows[4]), false); assert.equal(laneOf(rows[2]), 'submitted');
  assert.equal(d.card(rows[1]).text, '9d 18h');
});
test('dashboard: no list -> no hero; closed window never hero', () => {
  assert.equal(buildDashboard([row('a')], { now: NOW }).hero, null);
  const closed = row('z', { application: { decision: 'apply' }, rest: { window: { status: 'closed', deadline: { precision: 'exact', at: '2026-11-01T00:00:00Z' } } } });
  assert.equal(buildDashboard([closed], { now: NOW }).hero, null);
});

import { parseRoute, buildRoute, countryRoute, VIEWS, KEY_TO_VIEW } from '../src/app/router.js';
import { chip, progress, ring, avatar, meter, appCard, matchCard, flagEmoji, emptyState } from '../src/ui/components.js';

test('router: V3 detail URLs and real legacy names redirect', () => {
  const d = parseRoute('#/scholarships/gates-cambridge?intake=2027');
  assert.deepEqual([d.view, d.segments, d.redirected, d.canonical], ['scholarships', ['detail', 'gates-cambridge'], true, '#/scholarships/detail/gates-cambridge?intake=2027']);
  assert.deepEqual([parseRoute('#/library').view, parseRoute('#/library').segments], ['settings', ['archive']]);
  assert.deepEqual([parseRoute('#/goal').view, parseRoute('#/goal').segments], ['settings', ['planning']]);
  assert.equal(parseRoute('#/scholarships/country/GB').redirected, false);
});

test('router: canonical, query, legacy redirects, unknown -> dashboard', () => {
  assert.deepEqual(parseRoute('#/scholarships/country/GB?focus=cw'), { view: 'scholarships', segments: ['country', 'GB'], query: { focus: 'cw' }, redirected: false, canonical: '#/scholarships/country/GB?focus=cw' });
  assert.equal(parseRoute('').view, 'dashboard');
  assert.equal(parseRoute('#/overview').redirected, true); assert.equal(parseRoute('#/overview').view, 'dashboard');
  assert.deepEqual([parseRoute('#/universities').view, parseRoute('#/universities').segments], ['scholarships', ['universities']]);
  assert.equal(parseRoute('#/scholarships?window=open&intake=2027').query.intake, '2027');
  assert.equal(parseRoute('#/nonsense/x').canonical, '#/dashboard');
  assert.equal(parseRoute('#/scholarships/country/%E0%A4%A').view, 'scholarships'); // malformed % does not throw
  assert.equal(buildRoute('calendar', [], { month: '2026-10', empty: '' }), '#/calendar?month=2026-10');
  assert.equal(countryRoute('gb', 'x y'), '#/scholarships/country/GB?focus=x+y');
  assert.deepEqual(Object.values(KEY_TO_VIEW), VIEWS);
});

test('components: escaping, aria, clamped values', () => {
  assert.match(String(chip('<b>x</b>', 'danger')), /chip--danger">&lt;b&gt;x&lt;\/b&gt;</);
  const p = String(progress(140, 'Ready')); assert.match(p, /aria-valuenow="100"/); assert.match(p, /role="progressbar"/); assert.match(p, /data-v="100"/);
  assert.match(String(progress(-5, 'x')), /aria-valuenow="0"/); assert.match(String(progress('abc', 'x')), /aria-valuenow="0"/);
  assert.match(String(ring(72, 'Profile')), /data-p="72"[^>]*aria-label="Profile: 72%"/);
  assert.match(String(avatar('Alex Morgan')), />AM</); assert.match(String(avatar('')), />\?</);
  assert.equal((String(meter(3, 5)).match(/class="on"/g) || []).length, 3);
  assert.equal(flagEmoji('gb'), '🇬🇧'); assert.equal(flagEmoji('xx1'), '🏳️');
  assert.match(String(emptyState('Nothing', 'Add one')), /class="empty"/);
  const card = String(appCard({ id: 'cw', name: 'Commonwealth <img>', countries: ['GB'], text: '9d 04h', urgencyKey: 'high', readiness: 67 }));
  assert.ok(!card.includes('<img>')); assert.match(card, /href="#\/scholarships\/country\/GB\?focus=cw"/); assert.match(card, /data-urgency="high"/);
});
test('matchCard: add/dismiss hooks, https-only official link, no raw HTML', () => {
  const m = matchScore(cand({ id: 'r1', name: 'Evil <script>', officialUrl: 'javascript:alert(1)', provider: 'P' }), profile, NOW);
  const html1 = String(matchCard({ candidate: cand({ id: 'r1', name: 'Evil <script>', officialUrl: 'javascript:alert(1)' }), ...m }));
  assert.match(html1, /data-add-to-list="r1"/); assert.match(html1, /data-dismiss-match="r1"/);
  assert.ok(!html1.includes('<script>')); assert.match(html1, /href="#"/);
  assert.match(String(matchCard({ candidate: cand({ officialUrl: 'https://example.org/a' }), ...matchScore(cand(), profile, NOW) })), /rel="noopener noreferrer"/);
});

import { formatInZone, formatDateOnly } from '../src/features/dashboard/countdown.js';
import { createTicker } from '../src/app/ticker.js';

test('zone formatting: provider zone vs Dhaka, date-only without time', () => {
  assert.match(formatInZone('2026-10-20T15:00:00Z', 'Europe/London'), /^20 Oct 2026, 16:00 (BST|GMT\+1)$/);
  assert.match(formatInZone('2026-10-20T15:00:00Z', 'Asia/Dhaka'), /^20 Oct 2026, 21:00 (GMT\+6|BDT)$/);
  assert.match(formatInZone('2026-10-25T12:00:00Z', 'Europe/London'), /^25 Oct 2026, 12:00 (GMT|UTC)$/); // after the clock change
  assert.equal(formatDateOnly('2026-12-08'), '8 Dec 2026');
});

test('ticker: per-subscriber cadence, pause when hidden, immediate refresh on visible, unsubscribe stops timer', () => {
  let t = 0, hidden = false, cb = null, cleared = 0;
  const tk = createTicker({ now: () => t, set: f => (cb = f, 1), clear: () => { cleared++; cb = null; }, isHidden: () => hidden });
  const fast = [], slow = [];
  const offFast = tk.subscribe(x => fast.push(x), 1000);
  const offSlow = tk.subscribe(x => slow.push(x), 60000);
  assert.equal(fast.length, 1); assert.equal(slow.length, 1);        // immediate first call
  for (let i = 1; i <= 3; i++) { t = i * 1000; cb(); }
  assert.equal(fast.length, 4); assert.equal(slow.length, 1);        // slow not yet due
  hidden = true; t = 10000; cb();
  assert.equal(fast.length, 4);                                       // paused while hidden
  hidden = false; t = 70000; tk.onVisible();
  assert.equal(fast.length, 5); assert.equal(slow.length, 2);         // forced refresh from the real clock
  offFast(); assert.equal(cleared, 0); offSlow(); assert.equal(cleared, 1); assert.equal(tk.size(), 0);
});
```
**`tests/radar.test.mjs`**
```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { mapHit, merge } from '../scripts/radar/refresh.mjs';
const T = '2026-10-20';
test('mapHit requires name + https official URL and never invents facts', () => {
  assert.equal(mapHit({ name: 'A' }, T), null);
  assert.equal(mapHit({ name: 'A', url: 'http://insecure.example' }, T), null);
  assert.equal(mapHit({ name: 'A', url: 'javascript:alert(1)' }, T), null);
  const m = mapHit({ id: 7, title: 'Great  Award', university: 'U', url: 'https://example.org/x', country_codes: ['GB', 'bad'], level: 'Masters', status: 'Open', deadline: '2026-12-15', summary: 'x'.repeat(400) }, T);
  assert.equal(m.verified, false); assert.equal(m.funding, 'unknown'); assert.deepEqual(m.countryCodes, ['GB']);
  assert.equal(m.name, 'Great Award'); assert.equal(m.deadlineAt, null); assert.equal(m.deadlineDate, '2026-12-15');
  assert.equal(m.summary.length, 240); assert.deepEqual(m.degreeTypes, ['taught-master']); assert.equal(m.status, 'open');
});
test('merge keeps firstSeen, refreshes lastSeen, drops stale leads', () => {
  const prev = [{ id: 'a', firstSeen: '2026-10-01', lastSeen: '2026-10-10' }, { id: 'old', firstSeen: '2026-08-01', lastSeen: '2026-09-01' }];
  const out = merge(prev, [{ id: 'a', firstSeen: T, lastSeen: T }, { id: 'b', firstSeen: T, lastSeen: T }], T);
  assert.deepEqual(out.map(i => i.id).sort(), ['a', 'b']);
  assert.equal(out.find(i => i.id === 'a').firstSeen, '2026-10-01');
});
```
Additional tests the agent must add: adapter fixture (S2.1), drawer focus trap and `?focus=` (browser), calendar keyboard navigation (browser), export→clear→import round-trip, `check:keys` unchanged, a11y smoke per view.

## 16. Build notes
- Bundle `src/main.js` with the existing esbuild script; emit `assets/app.js` and `assets/app.css`; keep `format: 'esm'`, `target: 'es2022'`, `minify: true`, `sourcemap: false` in production.
- Fonts: keep Google Fonts allowed by the current CSP **or** self-host Inter/JetBrains Mono (preferred for privacy and speed; then drop the `fonts.googleapis.com` / `fonts.gstatic.com` entries from the CSP).
- To tighten CSP later (S9): remove `'unsafe-inline'` from `style-src` once no inline `style` attributes remain (components already avoid them; replace the remaining ones in legacy views).
- PWA: `manifest.webmanifest` (`name`, `short_name`, `start_url:"/#/dashboard"`, `display:"standalone"`, `theme_color:"#3451D1"`, `background_color:"#F6F7F9"`, icons 192/512 + maskable) and the existing service worker (cache the shell; never cache `data/v3/radar.json` longer than 6 h).


## 17. Parallel entry `/next/` — build and bootstrap spec
1. **`src/v4/bootstrap.js`** = copy of `src/bootstrap.js`; change only the dynamic import `./v3/workspace.js` → `./workspace.js` (v4). Keep store creation (`createV3Store`), service worker registration, sync/export wiring and all error paths unchanged.
2. **`src/v4/workspace.js`** must export what bootstrap calls (same names as v3's `workspace.js` exports; read them in S0) and must not import `src/v3/views.js` or `workspace.js` (they bind v3 DOM at load).
3. **`scripts/build.mjs`** (read it first; apply minimal edits): add esbuild entry `src/v4/bootstrap.js` → `assets/app4.js` (same options as the existing entry); copy `src/styles/tokens.css` → `assets/tokens.css` and `src/styles/app.css` → `assets/app4.css`; copy `next/index.html` → `dist/next/index.html`; ensure the service worker's precache list includes the new assets and does **not** hijack `/next/` navigations to the old shell (check its navigation fallback).
4. **`vercel.json`**: confirm `/next/` is served as a static directory (no rewrite to `/index.html`); CSP unchanged.
5. **Verification on the real origin:** after merge, open `https://muncareer.vercel.app/next/` — same origin as `/`, so it reads `career-track:v3` and `scholarship-theme` directly. Compare: pins, applications, documents, theme, export file contents before/after. Root `/` stays the default until S9.
6. **CI:** new tests use the `.test.mjs` suffix so `npm test` picks them up. `check:ui`/`test:browser` are not in CI; run them locally for the classic UI whenever shared files change.
