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
