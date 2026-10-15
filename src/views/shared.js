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
export const provisionalBadge = c => c.confidence === 'provisional' || ['work','career','spouse','pr'].some(k=>!c.requirements?.[k]?.source || !c.requirements?.[k]?.verified_on)
  ? `<span class="badge badge--warn" title="Some ratings are provisional or not yet researched">Provisional</span>` : '';
