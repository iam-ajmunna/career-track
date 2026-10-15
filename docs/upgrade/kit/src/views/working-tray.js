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
