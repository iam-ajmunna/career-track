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
