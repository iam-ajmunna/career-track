# 03 — UI implementation: exact installation and wiring

## 1. Step A0 — Audit and baseline (do first)
```bash
git fetch --all && git checkout main && git pull
git tag pre-upgrade && git push origin pre-upgrade        # recovery point (tags are allowed; main is not modified)
git checkout -b personal-dynamic
```
Write `docs/upgrade/AUDIT.md` answering:
1. Framework/build tool (Vite? vanilla ES modules? React?) and Node version; how Vercel builds (`package.json` scripts, `vercel.json`).
2. File tree; where the five views are rendered; how tab switching and the 1–5 keys work; theme mechanism.
3. **Every read/write of localStorage**: key names, value shapes, writers. (Known from the owner's old notes, unverified: key `scholarship-progress`; checklist ids like `sch-kaust-0`.) The legacy keys must keep working.
4. Scholarship data: file, export name, record fields, count. List every distinct `country` string and `funding` string (needed for A2).
5. Existing detail UI: function/modal that renders a scholarship's checklist/notes/documents, and its inputs.
6. CSS: tokens/variables, breakpoints; map them to the `--ct-*` fallbacks (§3).
7. Baseline screenshots (5 tabs × light/dark × 1440/390) into `docs/upgrade/baseline/`.
**Gate:** if the app is React, note it now — §8 applies.

## 2. Step A1 — Copy the kit
| From (kit) | To (repo) | Notes |
|---|---|---|
| `src/lib/*.js` | `src/lib/` | Keep as plain JS even in a TS repo (add `// @ts-check` optional). `supabase-adapter.js` is installed at D1, not now. |
| `src/views/*.js` | `src/views/` | |
| `src/styles/countries.css` | `src/styles/` | Import once (see §3). |
| `src/data/iso-codes.json`, `countries.seed.json` | `src/data/` | |
| `scripts/*.mjs` | `scripts/` | |
| `tests/*.mjs` | `tests/` | Add `"test": "node --test tests/logic.test.mjs tests/views.test.mjs"` to `package.json`. |
| `demo/index.html` | `docs/upgrade/kit/demo/` or leave in the kit | Reference only. |
Then run `npm test` — **17 tests must pass** before continuing.

## 3. CSS wiring and token mapping
Import after the app stylesheet: `import './styles/countries.css'` (or `<link>` in `index.html`). The file defines `--ct-*` variables with fallbacks to the app's own tokens `var(--surface, …)`. In A0 list the app's real token names and, if they differ, **edit only the first lines of `countries.css`** so `--ct-surface/--ct-surface-2/--ct-text/--ct-muted/--ct-border/--ct-accent` resolve to the app's tokens. Do not copy colour values; reuse the app's.

**`src/styles/countries.css`**
```css
/* Map these fallbacks to the site's existing tokens during Phase A (see 03-ui-implementation.md §2). */
:root{
  --ct-surface:var(--surface,#fff); --ct-surface-2:var(--surface-2,#f6f7f9); --ct-text:var(--text,#14171c);
  --ct-muted:var(--muted,#5b6472); --ct-border:var(--border,#dfe3e8); --ct-accent:var(--accent,#2f5bea);
  --ct-met:#1a7f4b; --ct-partial:#9a6700; --ct-unmet:#b42318; --ct-unknown:#5b6472;
  --ct-radius:12px; --ct-gap:12px;
}
@media (prefers-color-scheme:dark){:root{
  --ct-surface:var(--surface,#14171c); --ct-surface-2:var(--surface-2,#1b2027); --ct-text:var(--text,#e8eaee);
  --ct-muted:var(--muted,#98a2b3); --ct-border:var(--border,#2a313b); --ct-accent:var(--accent,#7c9bff);
  --ct-met:#4ade80; --ct-partial:#fbbf24; --ct-unmet:#f87171; --ct-unknown:#98a2b3;}}
:root[data-theme="dark"]{ --ct-surface:var(--surface,#14171c); --ct-surface-2:var(--surface-2,#1b2027); --ct-text:var(--text,#e8eaee);
  --ct-muted:var(--muted,#98a2b3); --ct-border:var(--border,#2a313b); --ct-accent:var(--accent,#7c9bff);
  --ct-met:#4ade80; --ct-partial:#fbbf24; --ct-unmet:#f87171; --ct-unknown:#98a2b3; }

.sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.muted{color:var(--ct-muted)}
.count{font-size:.8em;color:var(--ct-muted);margin-left:.25rem}

/* chips: symbol + text + border style so colour is never the only signal */
.chip{display:inline-flex;gap:.3rem;align-items:center;padding:.1rem .5rem;border-radius:999px;font-size:.78rem;border:1.5px solid currentColor;line-height:1.5}
.chip--met{color:var(--ct-met)} .chip--partial{color:var(--ct-partial);border-style:dashed}
.chip--unmet{color:var(--ct-unmet)} .chip--unknown{color:var(--ct-unknown);border-style:dotted}
.badge{font-size:.68rem;font-weight:700;letter-spacing:.04em;padding:.1rem .4rem;border-radius:6px;border:1.5px solid currentColor}
.badge--warn{color:var(--ct-partial)} .badge--on{color:var(--ct-accent)}
.badge--attention{color:var(--ct-partial)} .badge--high,.badge--urgent{color:var(--ct-unmet)}
.badge--critical,.badge--final{color:var(--ct-unmet);border-width:2.5px} .badge--closed{color:var(--ct-unknown)}

.meter{display:inline-flex;gap:3px;vertical-align:middle}
.dot{width:10px;height:10px;border-radius:50%;border:1.5px solid var(--ct-muted);display:inline-block}
.dot--on{background:var(--ct-met);border-color:var(--ct-met)}

/* working-on tray */
.tray{margin:0 0 1.5rem;padding:1rem;border:1px solid var(--ct-border);border-radius:var(--ct-radius);background:var(--ct-surface-2)}
.tray__title{margin:0 0 .75rem;font-size:1rem}
.tray__list{list-style:none;margin:0;padding:0;display:grid;gap:var(--ct-gap);grid-template-columns:repeat(auto-fill,minmax(220px,1fr))}
.tray-card{display:flex;flex-direction:column;gap:.35rem;padding:.8rem;border:1px solid var(--ct-border);border-radius:10px;background:var(--ct-surface);color:inherit;text-decoration:none}
.tray-card:hover,.tray-card:focus-visible{border-color:var(--ct-accent);outline:2px solid var(--ct-accent);outline-offset:1px}
.tray-card--critical,.tray-card--final{border-left:5px solid var(--ct-unmet)}
.tray-card--urgent,.tray-card--high{border-left:5px solid var(--ct-partial)}
.tray-card__top{display:flex;gap:.4rem;align-items:center;font-weight:600}
.tray-card__meta{color:var(--ct-muted);font-size:.85rem}
.bar{display:block;height:6px;border-radius:99px;background:var(--ct-border);overflow:hidden}
.bar>span{display:block;height:100%;background:var(--ct-accent)}

/* priorities */
.prefs{margin:0 0 1rem;border:1px solid var(--ct-border);border-radius:var(--ct-radius);padding:.5rem .9rem}
.prefs summary{cursor:pointer;font-weight:600}
.prefs__list{list-style:none;margin:.6rem 0;padding:0;display:grid;gap:.4rem}
.pref{display:flex;justify-content:space-between;gap:1rem;flex-wrap:wrap}

/* tiers */
.tier{margin:0 0 2rem}
.tier__head h2{margin:0;font-size:1.15rem}
.tier__sub{margin:.15rem 0 .75rem;color:var(--ct-muted);font-size:.9rem}
.subgroup{margin:0 0 1.25rem}
.subgroup__head{font-size:.85rem;font-weight:600;margin:0 0 .5rem;display:flex;flex-wrap:wrap;gap:.35rem;align-items:center}
.country-grid{list-style:none;margin:0;padding:0;display:grid;gap:var(--ct-gap);grid-template-columns:repeat(auto-fill,minmax(280px,1fr))}
.country-card{display:flex;flex-direction:column;gap:.5rem;padding:.9rem;height:100%;box-sizing:border-box;border:1px solid var(--ct-border);border-radius:var(--ct-radius);background:var(--ct-surface);color:inherit;text-decoration:none}
.country-card:hover,.country-card:focus-visible{border-color:var(--ct-accent);outline:2px solid var(--ct-accent);outline-offset:1px}
.country-card__head{display:flex;align-items:center;gap:.5rem;flex-wrap:wrap}
.country-card__flag{font-size:1.4rem}
.country-card__name{font-weight:700;flex:1 1 auto}
.country-card__chips{display:flex;flex-wrap:wrap;gap:.3rem}
.country-card__sacrifice{font-size:.85rem}
.country-card__foot{font-size:.8rem;color:var(--ct-muted)}
.unrated summary{cursor:pointer;font-weight:600}
.unrated__list{columns:3 200px;list-style:none;padding:0;margin:.5rem 0 0}

/* country page */
.crumbs{margin:0 0 .75rem}
.country-head h2{margin:0 0 .25rem}
.country-head__sacrifice{font-weight:600}
.sch-list{list-style:none;margin:0 0 1.5rem;padding:0;display:grid;gap:.6rem}
.sch{border:1px solid var(--ct-border);border-radius:var(--ct-radius);background:var(--ct-surface)}
.sch--working{border-color:var(--ct-accent)}
.sch__sum{display:grid;gap:.4rem;padding:.8rem .9rem;cursor:pointer;list-style:none}
.sch__sum::-webkit-details-marker{display:none}
.sch__name{font-weight:700}
.sch__chips{display:flex;flex-wrap:wrap;gap:.3rem}
.sch__time{font-size:.85rem;color:var(--ct-muted)}
.sch__body{padding:.2rem .9rem .9rem;border-top:1px solid var(--ct-border)}
.btn{padding:.55rem .9rem;border-radius:10px;border:1.5px solid var(--ct-border);background:var(--ct-surface-2);color:inherit;cursor:pointer;font:inherit;min-height:44px}
.btn--on{border-color:var(--ct-accent);color:var(--ct-accent);font-weight:600}
.btn:focus-visible{outline:2px solid var(--ct-accent);outline-offset:2px}
.table-scroll{overflow-x:auto}
.evidence{border-collapse:collapse;width:100%;min-width:560px}
.evidence th,.evidence td{text-align:left;padding:.5rem;border-bottom:1px solid var(--ct-border);vertical-align:top;font-size:.9rem}

@media (min-width:720px){.sch__sum{grid-template-columns:1.2fr 2fr auto;align-items:center}}
@media (prefers-reduced-motion:reduce){*{scroll-behavior:auto!important;transition:none!important;animation:none!important}}
```

## 4. Normalised data
Implement spec 02 §4 (`src/data/normalized.js`) and make `check-data` print `OK`.

## 5. Step A3 — Replace the Scholarships tab
1. Locate the function that renders the Scholarships view (A0 item 2). Keep a copy of the old renderer under `src/legacy/` (do **not** delete; it may be needed for the detail content in §6).
2. Replace its body with:
```js
import { createStore, localAdapter } from './lib/store.js';
import { mountScholarshipsScreen } from './views/scholarships-screen.js';
import { countries, scholarships } from './data/normalized.js';

export const store = createStore(localAdapter);    // D1 swaps the adapter; nothing else changes
await store.init();

let unmount = null;
export function showScholarshipsTab(rootEl) {
  unmount?.();
  unmount = mountScholarshipsScreen(rootEl, {
    countries, scholarships, store,
    progressFor: slug => /* 0..100 from the EXISTING progress logic, or null */ null,
  });
}
```
3. Call `showScholarshipsTab(rootEl)` when the tab becomes active; call `unmount()` when leaving it (prevents duplicate listeners/timers).
4. **Router ↔ tabs:** the screen reacts to `location.hash`. Make tab switching set the hash for this tab only:
```js
function activateTab(n) {                 // existing tab switch function; add one line
  if (n === 2) { if (!location.hash.startsWith('#/scholarships')) location.hash = '#/scholarships'; }
  /* …existing logic… */
}
addEventListener('hashchange', () => { if (location.hash.startsWith('#/scholarships')) activateTab(2); });
if (location.hash.startsWith('#/scholarships')) activateTab(2);   // deep links on first load
```
Keyboard shortcut `2` must go to `#/scholarships` (level 1), also when already on a country page.
5. Verify: reload on `#/scholarships/country/GB?focus=cw` opens the right tab, country and scholarship.

### Files the above relies on (embedded in full)
**`src/lib/merge.js`**
```js
/**
 * Union-merge two JSON-like values so that NO completed item is ever lost.
 *  - booleans: a || b          (a tick on either device survives)
 *  - plain objects: merged key by key, recursively
 *  - arrays: union (deduplicated by JSON value), order of `base` first
 *  - other primitives (strings/numbers): `base` wins when defined, else `incoming`
 * Use as unionMerge(remote, local): the server copy wins for free text, but ticks/pins from both survive.
 */
export function unionMerge(base, incoming) {
  if (base === undefined || base === null) return incoming;
  if (incoming === undefined || incoming === null) return base;
  if (typeof base === 'boolean' && typeof incoming === 'boolean') return base || incoming;
  if (Array.isArray(base) && Array.isArray(incoming)) {
    const seen = new Set(), out = [];
    for (const v of [...base, ...incoming]) { const k = JSON.stringify(v); if (!seen.has(k)) { seen.add(k); out.push(v); } }
    return out;
  }
  if (isPlain(base) && isPlain(incoming)) {
    const out = { ...base };
    for (const k of Object.keys(incoming)) out[k] = k in base ? unionMerge(base[k], incoming[k]) : incoming[k];
    return out;
  }
  return base;
}
const isPlain = v => v && typeof v === 'object' && !Array.isArray(v);

/** Count ticks (true booleans) in a progress blob: used for the import dry-run summary. */
export function countTicks(v) {
  if (v === true) return 1;
  if (Array.isArray(v)) return v.reduce((n, x) => n + countTicks(x), 0);
  if (isPlain(v)) return Object.values(v).reduce((n, x) => n + countTicks(x), 0);
  return 0;
}
```
**`src/lib/store.js`**
```js
import { mergePrefs } from './requirements.js';
import { unionMerge, countTicks } from './merge.js';

// New v2 state lives under its OWN key so the legacy 'scholarship-progress' data is never touched by this module.
const KEY = 'career-track:v2';

export const localAdapter = {
  async load() { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { return null; } },
  async save(state) { localStorage.setItem(KEY, JSON.stringify(state)); },
};

/**
 * Minimal observable store.
 * state = { rev, workingOn: string[] (slugs, in the order the user added them), prefs, ui,
 *           progress: {}  <- the app's checklist/dossier/IELTS/referee progress blob (same shape the app stored in localStorage before) }
 * An adapter (local now, Supabase later - see 04-persistence.md) provides load()/save().
 */
export function createStore(adapter = localAdapter) {
  let state = { rev: 0, workingOn: [], prefs: mergePrefs(null), ui: { unratedOpen: false }, progress: {}, legacyImportedAt: null };
  const subs = new Set();
  const emit = () => subs.forEach(fn => fn(state));
  let status = 'idle'; // idle | saving | saved | failed
  const statusSubs = new Set();
  const setStatus = s => { status = s; statusSubs.forEach(fn => fn(s)); };

  async function persist() {
    setStatus('saving');
    try { await adapter.save(state); setStatus('saved'); }
    catch (e) { console.error('save failed', e); setStatus('failed'); }
  }
  function update(patch) {
    state = { ...state, ...patch, rev: state.rev + 1 };
    emit(); return persist();
  }
  return {
    get: () => state,
    status: () => status,
    subscribe: fn => (subs.add(fn), () => subs.delete(fn)),
    onStatus: fn => (statusSubs.add(fn), () => statusSubs.delete(fn)),
    async init() {
      const saved = await adapter.load();
      if (saved) state = { ...state, ...saved, prefs: mergePrefs(saved.prefs), workingOn: Array.isArray(saved.workingOn) ? saved.workingOn : [] };
      emit();
    },
    retry: persist,
    isWorkingOn: slug => state.workingOn.includes(slug),
    toggleWorkingOn(slug) {
      const has = state.workingOn.includes(slug);
      return update({ workingOn: has ? state.workingOn.filter(s => s !== slug) : [...state.workingOn, slug] });
    },
    setPrefs(prefs) { return update({ prefs: mergePrefs(prefs) }); },
    setUi(ui) { return update({ ui: { ...state.ui, ...ui } }); },
    /** The app's progress blob. The existing app code must read/write progress ONLY through these two. */
    getProgress: () => state.progress,
    setProgress(next) { return update({ progress: typeof next === 'function' ? next(state.progress) : next }); },
    /** Legacy import: dry run returns counts only; commit union-merges (idempotent, never loses a tick). */
    importLegacy(legacyBlob, { dryRun = true } = {}) {
      const merged = unionMerge(state.progress, legacyBlob);
      const report = { ticksBefore: countTicks(state.progress), ticksIncoming: countTicks(legacyBlob), ticksAfter: countTicks(merged) };
      if (dryRun) return Promise.resolve(report);
      return update({ progress: merged, legacyImportedAt: new Date().toISOString() }).then(() => report);
    },
  };
}
```
**`src/lib/router.js`**
```js
// Tiny hash router. Works with any stack; no dependency.
//   #/scholarships                     -> countries screen
//   #/scholarships/country/GB          -> one country
//   #/scholarships/country/GB?focus=x  -> one country, scroll to + expand scholarship x
export function parseHash(hash) {
  const h = (hash || '').replace(/^#\/?/, '');
  const [path, query = ''] = h.split('?');
  const seg = path.split('/').filter(Boolean).map(decodeURIComponent);
  const q = Object.fromEntries(new URLSearchParams(query));
  if (seg[0] !== 'scholarships') return { name: 'other', path: seg.join('/') };
  if (seg[1] === 'country' && seg[2]) return { name: 'country', code: seg[2].toUpperCase(), focus: q.focus || null };
  return { name: 'countries' };
}
export const hrefCountries = () => '#/scholarships';
export const hrefCountry = (code, focus) =>
  `#/scholarships/country/${encodeURIComponent(code)}${focus ? `?focus=${encodeURIComponent(focus)}` : ''}`;

export function onRoute(cb) {
  const handler = () => cb(parseHash(location.hash));
  addEventListener('hashchange', handler);
  handler();
  return () => removeEventListener('hashchange', handler);
}
```
**`src/lib/time.js`**
```js
// Deadline helpers. Deadlines are stored as UTC ISO strings (deadlineAt). Never compute from date-only text.
export const MS = { min: 60e3, hour: 3600e3, day: 86400e3 };

export function urgencyBand(remainingMs) {
  if (remainingMs <= 0) return { key: 'closed', label: 'CLOSED' };
  if (remainingMs < 1 * MS.day)  return { key: 'final',     label: 'FINAL HOURS' };
  if (remainingMs < 3 * MS.day)  return { key: 'critical',  label: 'CRITICAL' };
  if (remainingMs < 7 * MS.day)  return { key: 'urgent',    label: 'URGENT' };
  if (remainingMs < 14 * MS.day) return { key: 'high',      label: 'HIGH' };
  if (remainingMs < 30 * MS.day) return { key: 'attention', label: 'ATTENTION' };
  return { key: 'normal', label: '' };
}

const p2 = n => String(n).padStart(2, '0');
export function parts(remainingMs) {
  const t = Math.max(0, Math.floor(remainingMs / 1000));
  return { d: Math.floor(t / 86400), h: Math.floor(t % 86400 / 3600), m: Math.floor(t % 3600 / 60), s: t % 60 };
}
/** Compact text: '22d 04h' (>=3d), '2d 07h 12m' (<3d), '07h 12m' (<24h). */
export function formatCompact(remainingMs) {
  if (remainingMs <= 0) return 'Closed';
  const { d, h, m } = parts(remainingMs);
  if (d >= 3) return `${d}d ${p2(h)}h`;
  if (d >= 1) return `${d}d ${p2(h)}h ${p2(m)}m`;
  return `${p2(h)}h ${p2(m)}m`;
}
export function remainingMs(deadlineAtIso, now = Date.now()) {
  const t = Date.parse(deadlineAtIso);
  return Number.isNaN(t) ? null : t - now;
}
/** Show a UTC instant in an explicit IANA zone (e.g. provider zone and the user's zone). */
export function formatInZone(iso, timeZone, locale = 'en-GB') {
  return new Intl.DateTimeFormat(locale, { timeZone, dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));
}
```
**`src/views/html.js`**
```js
// Safe HTML helper: ALWAYS escape dynamic text. No innerHTML with raw data anywhere else.
export const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const attr = esc;
```
**`src/views/shared.js`**
```js
import { esc } from './html.js';
import { REQUIREMENTS, LEVEL_SYMBOL, LEVEL_TEXT } from '../lib/requirements.js';

/** One chip per requirement: symbol + short text (never colour alone). */
export function reqChips(levels, prefs) {
  return REQUIREMENTS.filter(r => prefs.enabled[r.key]).map(r => {
    const lv = levels[r.key];
    return `<span class="chip chip--${lv.level}" title="${esc(`${r.label}: ${LEVEL_TEXT[lv.level]}${lv.reason ? ' — ' + lv.reason : ''}`)}">
      <span aria-hidden="true">${LEVEL_SYMBOL[lv.level]}</span> ${esc(r.short)}<span class="sr-only">: ${esc(LEVEL_TEXT[lv.level])}</span></span>`;
  }).join('');
}
export function meter(met, total) {
  const dots = Array.from({ length: total }, (_, i) => `<i class="dot${i < met ? ' dot--on' : ''}"></i>`).join('');
  return `<span class="meter" role="img" aria-label="${met} of ${total} requirements met">${dots}</span>`;
}
export const provisionalBadge = c => c.confidence === 'provisional'
  ? `<span class="badge badge--warn" title="Ratings not yet verified against official sources">Provisional</span>` : '';
```
**`src/views/working-tray.js`**
```js
import { esc, attr } from './html.js';
import { hrefCountry } from '../lib/router.js';
import { remainingMs, urgencyBand, formatCompact } from '../lib/time.js';

/** "Currently working on" - pinned above the country list. Each card deep-links to its country with ?focus=slug. */
export function renderWorkingTray(workingSlugs, scholarshipsBySlug, countriesByCode, progressFor, now = Date.now()) {
  const items = workingSlugs.map(slug => scholarshipsBySlug.get(slug)).filter(Boolean)
    .map(s => ({ s, rem: s.deadlineAt ? remainingMs(s.deadlineAt, now) : null }))
    .sort((a, b) => (a.rem ?? Infinity) - (b.rem ?? Infinity));
  if (!items.length) {
    return `<section class="tray tray--empty" aria-labelledby="tray-h">
      <h2 id="tray-h" class="tray__title">Currently working on</h2>
      <p class="muted">Nothing pinned yet. Open any scholarship and press <strong>Working on</strong> to pin it here.</p></section>`;
  }
  const cards = items.map(({ s, rem }) => {
    const c = countriesByCode.get(s.countryCode);
    const band = rem == null ? null : urgencyBand(rem);
    const pct = progressFor ? progressFor(s.slug) : null;
    return `<li><a class="tray-card${band ? ' tray-card--' + band.key : ''}" href="${attr(hrefCountry(s.countryCode ?? 'XX', s.slug))}">
      <span class="tray-card__top"><span class="tray-card__flag" aria-hidden="true">${esc(c?.flag ?? '🏳️')}</span>
        <span class="tray-card__name">${esc(s.name)}</span></span>
      <span class="tray-card__meta">${esc(c?.name ?? 'Country not set')}</span>
      <span class="tray-card__time">${rem == null ? 'Deadline not set' : esc(formatCompact(rem))}${band && band.label ? ` <b class="badge badge--${band.key}">${esc(band.label)}</b>` : ''}</span>
      ${pct == null ? '' : `<span class="bar" role="img" aria-label="${pct}% ready"><span style="width:${pct}%"></span></span>`}
    </a></li>`;
  }).join('');
  return `<section class="tray" aria-labelledby="tray-h">
    <h2 id="tray-h" class="tray__title">Currently working on <span class="count">${items.length}</span></h2>
    <ul class="tray__list">${cards}</ul></section>`;
}
```
**`src/views/countries-view.js`**
```js
import { esc, attr } from './html.js';
import { hrefCountry } from '../lib/router.js';
import { sacrificeHeadline } from '../lib/scoring.js';
import { REQUIREMENTS } from '../lib/requirements.js';
import { reqChips, meter, provisionalBadge } from './shared.js';
import { remainingMs, formatCompact } from '../lib/time.js';

function countryCard(ev, prefs, now) {
  const c = ev.country;
  const next = ev.scholarships.map(s => s.deadlineAt ? remainingMs(s.deadlineAt, now) : null)
    .filter(r => r != null && r > 0).sort((a, b) => a - b)[0];
  return `<li><a class="country-card" href="${attr(hrefCountry(c.code))}">
    <span class="country-card__head"><span class="country-card__flag" aria-hidden="true">${esc(c.flag)}</span>
      <span class="country-card__name">${esc(c.name)}</span>${provisionalBadge(c)}
      ${meter(ev.metCount, ev.total)}</span>
    <span class="country-card__chips">${reqChips(ev.levels, prefs)}</span>
    <span class="country-card__sacrifice">${esc(sacrificeHeadline(ev))}</span>
    <span class="country-card__foot">${ev.scholarships.length} scholarship${ev.scholarships.length === 1 ? '' : 's'}${next != null ? ` · next deadline in ${esc(formatCompact(next))}` : ''}</span>
  </a></li>`;
}

function prefsPanel(prefs) {
  const rows = REQUIREMENTS.map(r => `<li class="pref">
    <label><input type="checkbox" data-pref-enabled="${r.key}" ${prefs.enabled[r.key] ? 'checked' : ''}> ${esc(r.label)}</label>
    <label class="pref__w"><input type="checkbox" data-pref-weight="${r.key}" ${prefs.weight[r.key] === 2 ? 'checked' : ''} ${prefs.enabled[r.key] ? '' : 'disabled'}> Important</label></li>`).join('');
  return `<details class="prefs"><summary>My priorities</summary><ul class="prefs__list">${rows}</ul>
    <label class="prefs__sort">Order
      <select data-pref-sort><option value="best-first" ${prefs.sortOrder === 'best-first' ? 'selected' : ''}>Best match first</option>
      <option value="worst-first" ${prefs.sortOrder === 'worst-first' ? 'selected' : ''}>Least match first</option></select></label></details>`;
}

export function renderCountries(view, prefs, unratedOpen, now = Date.now()) {
  const groups = view.groups.map(g => `
    <section class="tier" aria-labelledby="tier-${g.tier}">
      <header class="tier__head"><h2 id="tier-${g.tier}">${esc(g.label)}</h2>
        <p class="tier__sub">${esc(g.subtitle)} · ${g.count} countr${g.count === 1 ? 'y' : 'ies'}</p></header>
      ${g.subgroups.map(sg => `
        <div class="subgroup">
          ${sg.sacrifices.length ? `<h3 class="subgroup__head">Compromise: ${sg.sacrifices.map(s =>
            `<span class="chip chip--${s.level}">${esc(s.label)}${s.level === 'partial' ? ' (partly)' : s.level === 'unknown' ? ' (unknown)' : ''}</span>`).join(' ')}</h3>`
            : '<h3 class="subgroup__head">No compromise needed</h3>'}
          <ul class="country-grid">${sg.items.map(ev => countryCard(ev, prefs, now)).join('')}</ul>
        </div>`).join('')}
    </section>`).join('');

  const unrated = view.unrated.length ? `
    <details class="unrated" ${unratedOpen ? 'open' : ''} data-unrated>
      <summary>Not rated yet · ${view.unrated.length} countries</summary>
      <p class="muted">No scholarship tracked and no research done. They are listed so nothing is missing; rate them in countries.seed.json.</p>
      <ul class="unrated__list">${view.unrated.map(ev =>
        `<li><a href="${attr(hrefCountry(ev.country.code))}">${esc(ev.country.flag)} ${esc(ev.country.name)}</a></li>`).join('')}</ul>
    </details>` : '';

  return `${prefsPanel(prefs)}${groups || '<p class="muted">No rated countries yet.</p>'}${unrated}`;
}

/** Event wiring: call once on the container; uses delegation so re-rendering is safe. */
export function wireCountries(root, store, rerender) {
  root.addEventListener('change', e => {
    const t = e.target, p = store.get().prefs;
    if (t.dataset.prefEnabled) store.setPrefs({ ...p, enabled: { ...p.enabled, [t.dataset.prefEnabled]: t.checked } });
    else if (t.dataset.prefWeight) store.setPrefs({ ...p, weight: { ...p.weight, [t.dataset.prefWeight]: t.checked ? 2 : 1 } });
    else if (t.matches('[data-pref-sort]')) store.setPrefs({ ...p, sortOrder: t.value });
    rerender();
  });
  root.addEventListener('toggle', e => {
    if (e.target.matches('[data-unrated]')) store.setUi({ unratedOpen: e.target.open });
  }, true);
}
```
**`src/views/country-view.js`**
```js
import { esc, attr } from './html.js';
import { hrefCountries } from '../lib/router.js';
import { sacrificeHeadline, evaluateScholarship } from '../lib/scoring.js';
import { REQUIREMENTS, LEVEL_SYMBOL, LEVEL_TEXT } from '../lib/requirements.js';
import { reqChips, meter, provisionalBadge } from './shared.js';
import { remainingMs, urgencyBand, formatCompact, formatInZone } from '../lib/time.js';

function evidenceTable(ev) {
  const rows = REQUIREMENTS.map(r => {
    const lv = ev.levels[r.key];
    const src = lv.source ? ` <a href="${attr(lv.source)}" rel="noopener noreferrer" target="_blank">source</a>` : '';
    const ver = lv.verified_on ? ` · verified ${esc(lv.verified_on)}` : ' · not verified';
    return `<tr><th scope="row">${esc(r.label)}</th>
      <td><span class="chip chip--${lv.level}"><span aria-hidden="true">${LEVEL_SYMBOL[lv.level]}</span> ${esc(LEVEL_TEXT[lv.level])}</span></td>
      <td>${esc(lv.reason || '—')}${src}<span class="muted">${ver}</span></td></tr>`;
  }).join('');
  return `<div class="table-scroll"><table class="evidence"><caption class="sr-only">Requirement evidence for ${esc(ev.country.name)}</caption>
    <thead><tr><th scope="col">Requirement</th><th scope="col">Status</th><th scope="col">Why / evidence</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

function scholarshipItem(s, country, prefs, isWorking, focus, now) {
  const levels = evaluateScholarship(s, country);
  const rem = s.deadlineAt ? remainingMs(s.deadlineAt, now) : null;
  const band = rem == null ? null : urgencyBand(rem);
  const open = focus === s.slug;
  return `<li><details class="sch${isWorking ? ' sch--working' : ''}" id="sch-${attr(s.slug)}" ${open ? 'open' : ''}>
    <summary class="sch__sum">
      <span class="sch__name">${esc(s.name)}${isWorking ? ' <b class="badge badge--on">Working on</b>' : ''}</span>
      <span class="sch__chips">${reqChips(levels, prefs)}</span>
      <span class="sch__time">${rem == null ? 'No deadline set' : `${esc(formatCompact(rem))}${band?.label ? ` <b class="badge badge--${band.key}">${esc(band.label)}</b>` : ''}`}</span>
    </summary>
    <div class="sch__body">
      ${s.provider ? `<p><strong>Provider:</strong> ${esc(s.provider)}</p>` : ''}
      ${s.fundingNote ? `<p><strong>Funding:</strong> ${esc(s.fundingNote)}</p>` : ''}
      ${s.deadlineAt ? `<p><strong>Deadline:</strong> ${esc(formatInZone(s.deadlineAt, s.deadlineTz || 'UTC'))} (${esc(s.deadlineTz || 'UTC')}) · ${esc(formatInZone(s.deadlineAt, 'Asia/Dhaka'))} Dhaka</p>` : ''}
      ${s.url ? `<p><a href="${attr(s.url)}" rel="noopener noreferrer" target="_blank">Official page</a></p>` : ''}
      <!-- EXISTING DETAIL CONTENT (checklist, notes, documents) IS RENDERED HERE BY THE CURRENT APP: see 03-ui-implementation.md §6 -->
      <div data-existing-detail="${attr(s.slug)}"></div>
      <button type="button" class="btn ${isWorking ? 'btn--on' : ''}" data-toggle-working="${attr(s.slug)}" aria-pressed="${isWorking}">
        ${isWorking ? '★ Working on — click to unpin' : '☆ Mark as working on'}</button>
    </div></details></li>`;
}

export function renderCountry(ev, prefs, workingSet, focus, now = Date.now()) {
  const c = ev.country;
  const list = [...ev.scholarships].sort((a, b) => (a.deadlineAt ? Date.parse(a.deadlineAt) : Infinity) - (b.deadlineAt ? Date.parse(b.deadlineAt) : Infinity));
  return `<nav class="crumbs" aria-label="Breadcrumb"><a href="${attr(hrefCountries())}">← All countries</a></nav>
  <header class="country-head">
    <h2><span aria-hidden="true">${esc(c.flag)}</span> ${esc(c.name)} ${provisionalBadge(c)}</h2>
    <p>${meter(ev.metCount, ev.total)} <strong>${ev.metCount} of ${ev.total}</strong> requirements met</p>
    <p class="country-head__sacrifice">${esc(sacrificeHeadline(ev))}</p>
    ${c.note ? `<p class="muted">${esc(c.note)}</p>` : ''}
  </header>
  <section aria-labelledby="sch-h"><h3 id="sch-h">Scholarships (${list.length})</h3>
    ${list.length ? `<ul class="sch-list">${list.map(s => scholarshipItem(s, c, prefs, workingSet.has(s.slug), focus, now)).join('')}</ul>`
      : '<p class="muted">No scholarship tracked for this country yet.</p>'}
  </section>
  <section aria-labelledby="ev-h"><h3 id="ev-h">Why this country scores the way it does</h3>${evidenceTable(ev)}</section>`;
}

export function wireCountry(root, store, rerender) {
  root.addEventListener('click', e => {
    const b = e.target.closest('[data-toggle-working]');
    if (!b) return;
    store.toggleWorkingOn(b.dataset.toggleWorking);
    rerender();
  });
}

/** After render: open + scroll to the focused scholarship. */
export function applyFocus(root, focus) {
  if (!focus) return;
  const el = root.querySelector(`#sch-${CSS.escape(focus)}`);
  if (!el) return;
  el.open = true;
  el.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  el.querySelector('summary')?.focus({ preventScroll: true });
}
```
**`src/views/scholarships-screen.js`**
```js
import { onRoute } from '../lib/router.js';
import { buildCountryView, evaluateCountry } from '../lib/scoring.js';
import { renderCountries, wireCountries } from './countries-view.js';
import { renderCountry, wireCountry, applyFocus } from './country-view.js';
import { renderWorkingTray } from './working-tray.js';

/**
 * Mount the whole Scholarships tab.
 * @param root     the element that currently holds the old Scholarships list
 * @param deps     { countries, scholarships (normalized), store, progressFor?(slug)->0..100 }
 */
export function mountScholarshipsScreen(root, { countries, scholarships, store, progressFor }) {
  const byCode = new Map(countries.map(c => [c.code, c]));
  const bySlug = new Map(scholarships.map(s => [s.slug, s]));
  let route = { name: 'countries' };

  function render() {
    const { prefs, workingOn, ui } = store.get();
    if (route.name === 'country') {
      const country = byCode.get(route.code);
      if (!country) { root.innerHTML = '<p class="muted">Unknown country.</p>'; return; }
      const ev = evaluateCountry(country, scholarships.filter(s => s.countryCode === country.code), prefs);
      root.innerHTML = renderCountry(ev, prefs, new Set(workingOn), route.focus);
      applyFocus(root, route.focus);
    } else {
      const view = buildCountryView(countries, scholarships, prefs);
      root.innerHTML = renderWorkingTray(workingOn, bySlug, byCode, progressFor) + renderCountries(view, prefs, ui.unratedOpen);
    }
  }
  wireCountries(root, store, render);
  wireCountry(root, store, render);
  const offStore = store.subscribe(() => {});            // keep for future cross-tab sync
  const offRoute = onRoute(r => { route = r.name === 'other' ? route : r; if (r.name !== 'other') render(); });
  // refresh countdowns once a minute while this screen is visible
  const tick = setInterval(() => { if (!document.hidden && route.name !== 'other') render(); }, 60_000);
  return () => { offStore(); offRoute(); clearInterval(tick); };
}
```

## 6. Step A4 — Existing detail content inside the opened scholarship
`country-view.js` renders an empty `<div data-existing-detail="<slug>">`. Fill it **lazily** when its `<details>` opens, reusing the app's current detail renderer:
```js
// in showScholarshipsTab(), after mount:
rootEl.addEventListener('toggle', e => {
  const d = e.target;
  if (!d.matches?.('details.sch') || !d.open) return;
  const slot = d.querySelector('[data-existing-detail]');
  if (slot && !slot.dataset.filled) {
    renderExistingDetail(slot.dataset.existingDetail, slot);   // ← adapt: the app's existing function (checklist, notes, documents)
    slot.dataset.filled = '1';
  }
}, true);
```
Rules: do not duplicate the checklist logic; progress writes keep using the **existing** progress store (legacy keys) until D1; after D1 they go through the same adapter. Re-renders from the screen replace `innerHTML`, so `filled` resets — acceptable (detail re-renders on open). If the detail UI is a modal rather than inline, instead add an **"Open full details"** button that opens that modal, and keep the inline summary.

## 7. Step A5 — Overview integration
On Overview render `renderWorkingTray(...)` above the existing content (reuse the same function; it deep-links into the Scholarships tab). Remove nothing from Overview in A5; C1 declutters.

## 8. If the app is React (port rules)
- Keep `src/lib/*` byte-for-byte; they are framework-free.
- State: `const state = useSyncExternalStore(store.subscribe, store.get)`; actions call `store.toggleWorkingOn`, `store.setPrefs`.
- Convert each `render*` template function to a component **1:1** (same markup, class names, aria attributes, text); never use `dangerouslySetInnerHTML` with data; React escapes automatically.
- Router: `useSyncExternalStore` over `hashchange` using `parseHash`, or keep the existing router if it already supports hashes.
- `applyFocus` becomes a `useEffect` keyed on `route.focus`.
- Unit tests for `src/views/*` string output are replaced by React Testing Library/Playwright checks asserting the same text/attributes; `src/lib` tests stay.

## 9. Adding "Working on" to existing places
Anywhere a scholarship is shown (Pipeline cards, detail modal) add the same button using `store.toggleWorkingOn(slug)` and `aria-pressed`. A pinned scholarship shows the badge **Working on** consistently.
