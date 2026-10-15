// The five personal requirements. Order here = display order everywhere.
// `derived: true` means the level is computed from tracked scholarships, never hand-entered.
export const REQUIREMENTS = [
  { key: 'funding', label: 'Fully funded MSc',          short: 'Funding', derived: true  },
  { key: 'work',    label: 'Good work opportunity',     short: 'Work',    derived: false },
  { key: 'career',  label: 'Better career opportunity', short: 'Career',  derived: false },
  { key: 'spouse',  label: 'Spouse accommodation',      short: 'Spouse',  derived: false },
  { key: 'pr',      label: 'Chance of getting PR',      short: 'PR',      derived: false },
];

export const REQUIREMENT_KEYS = REQUIREMENTS.map(r => r.key);
export const REQ_BY_KEY = Object.fromEntries(REQUIREMENTS.map(r => [r.key, r]));

// met = fully satisfied, partial = conditional/limited, unmet = not satisfied, unknown = not researched yet
export const LEVELS = ['met', 'partial', 'unmet', 'unknown'];
export const LEVEL_VALUE = { met: 1, partial: 0.5, unmet: 0, unknown: 0 };
export const LEVEL_SYMBOL = { met: '✓', partial: '◐', unmet: '✗', unknown: '?' };
export const LEVEL_TEXT = { met: 'Met', partial: 'Partly', unmet: 'Not met', unknown: 'Not researched' };

export const DEFAULT_PREFS = {
  enabled: { funding: true, work: true, career: true, spouse: true, pr: true },
  weight:  { funding: 1,    work: 1,    career: 1,    spouse: 1,    pr: 1    }, // 1 normal, 2 important
  sortOrder: 'best-first', // 'best-first' | 'worst-first'
};

export function mergePrefs(saved) {
  const p = structuredClone(DEFAULT_PREFS);
  if (!saved || typeof saved !== 'object') return p;
  for (const k of REQUIREMENT_KEYS) {
    if (typeof saved.enabled?.[k] === 'boolean') p.enabled[k] = saved.enabled[k];
    if ([1, 2].includes(saved.weight?.[k])) p.weight[k] = saved.weight[k];
  }
  if (['best-first', 'worst-first'].includes(saved.sortOrder)) p.sortOrder = saved.sortOrder;
  return p;
}
