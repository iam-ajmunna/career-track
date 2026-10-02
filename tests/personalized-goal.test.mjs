import test from 'node:test';
import assert from 'node:assert/strict';
import { EMPTY_STATE, validateState } from '../src/sync/model.js';
import { goalProgrammes, goalCoreDocuments, goalCampaign, goalPathways } from '../src/personalized-goal-data.js';
import { renderPersonalizedGoal, goalVerifyCatalog, setGoalFilter, setGoalSelection, setGoalQuery } from '../src/personalized-goal.js';

test('personalized catalog has distinct grounded programmes and valid date/route records', () => {
  assert.equal(goalVerifyCatalog(), true);
  assert.equal(goalProgrammes.length, 12);
  for (const item of goalProgrammes) {
    assert.ok(item.sources.length && item.sources.every(source => /^https:\/\//.test(source[1])));
    assert.ok(goalPathways[item.careerKey]);
    if (item.starts && item.ends) assert.ok(item.starts <= item.ends);
    if (!item.ends) assert.match(item.dateQuality, /pending|NOT published|no confirmed/i);
  }
});

test('new goal checklists are accepted additively; former progress keys and structure survive', () => {
  const before = { ...EMPTY_STATE, progress: { 'sch-kaust-0': true, 'doc-passport': true, 'ielts-booked': true } };
  const after = validateState({ ...before, progress: { ...before.progress, 'goal-core-0': true, 'goal-campaign-3': true, 'goal-ipcvai-1': false } });
  assert.deepEqual(Object.fromEntries(Object.entries(after.progress).filter(([key]) => !key.startsWith('goal-'))), before.progress);
  assert.throws(() => validateState({ ...before, progress: { 'goal-__proto__-0': true } }));
});

test('goal view includes all funding/career/immigration and source sections', () => {
  setGoalFilter('All'); setGoalQuery(''); setGoalSelection('ipcvai');
  const html = renderPersonalizedGoal({ 'goal-core-0': true });
  for (const item of goalProgrammes) assert.ok(html.includes('data-goal-select="' + item.id + '"'));
  for (const text of ['Application opens', 'Application closes', 'Funding status', 'Can you find a job', 'permanent residence', 'Programme-specific documents', 'Master document bank', 'Execution campaign']) assert.ok(html.includes(text), text);
  assert.ok(html.includes('rel="noopener noreferrer"'));
  assert.match(html, /data-progress-key="goal-core-0" checked/);
});

test('filter/search and selection render the proper programme without losing shared state', () => {
  setGoalFilter('Erasmus Mundus'); setGoalQuery('IMLEX'); setGoalSelection('imlex');
  const filtered = renderPersonalizedGoal({});
  assert.ok(filtered.includes('data-goal-select="imlex"'));
  assert.ok(!filtered.includes('data-goal-select="kaust"'));
  setGoalFilter('All'); setGoalQuery(''); setGoalSelection('ediss');
  const ediss = renderPersonalizedGoal({ 'goal-ediss-2': true });
  assert.ok(ediss.includes('Bangladesh MOFA'));
  assert.ok(ediss.includes('data-progress-key="goal-ediss-2" checked'));
});
