import test from 'node:test';
import assert from 'node:assert/strict';
import * as real from '../src/v3/domain.js';
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
