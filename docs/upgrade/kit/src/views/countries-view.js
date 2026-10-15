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
