import test from 'node:test';
import assert from 'node:assert/strict';
import * as data from '../src/data.js';
import catalog from '../deadlines.json' with { type: 'json' };
import { enumerateLegacyKeys } from '../scripts/lib/legacy-progress.mjs';
import { buildScholarshipMasterPrompt, buildChatGptUrl } from '../src/gpt-prompt.js';

test('new scholarship intelligence is present and decision-scoped', () => {
  const expected = ['daad-master','eth-esop','mext-university','goi-ies','eiffel','si-sweden','erasmus-ai'];
  const byId = new Map(data.scholarships.map(item => [item.id, item]));
  for (const id of expected) {
    assert.ok(byId.has(id), `missing ${id}`);
    assert.equal(byId.get(id).legacy, false);
    assert.ok(['apply','watch','closed'].includes(byId.get(id).decision));
    assert.match(byId.get(id).source, /^https:\/\//);
  }
  assert.equal(byId.get('daad-master').decision, 'apply');
  assert.equal(byId.get('eth-esop').decision, 'apply');
  assert.equal(byId.get('mext-university').decision, 'watch');
});

test('Europass is additive and legacy progress contract stays frozen', () => {
  const europass = data.documents.find(item => item.id === 'cvEuropass');
  assert.ok(europass);
  assert.equal(europass.legacy, false);
  assert.match(europass.label, /Europass/i);
  assert.equal(enumerateLegacyKeys(data).length, 102);
});

test('screened-out leads and career context remain separate from active scholarships', () => {
  assert.ok(data.screenedOut.length >= 9);
  assert.ok(data.screenedOut.some(item => /Trudeau/i.test(item.name)));
  assert.ok(data.screenedOut.some(item => /VLIR/i.test(item.name)));
  for (const country of ['Germany','United Kingdom','Ireland','Japan','Sweden','Switzerland','France','Hungary','United States']) {
    const outlook = data.countryOutlooks[country];
    assert.ok(outlook, `missing career outlook for ${country}`);
    assert.match(outlook.source, /^https:\/\//);
    assert.equal(outlook.verifiedOn, '2026-09-28');
  }
});

test('ETH and DAAD have exact verified countdown evidence', () => {
  const byId = new Map(catalog.deadlines.map(item => [item.id, item]));
  assert.equal(byId.get('eth-esop-2027')?.deadline_at, '2026-11-30T10:59:00Z');
  assert.equal(byId.get('daad-master-2027')?.deadline_at, '2026-12-01T23:00:00Z');
  assert.equal(catalog.verified_on, '2026-09-28');
});


test('Open GPT prompt is scholarship-specific, source-grounded and creates a ChatGPT deep link', () => {
  const scholarship = data.scholarships.find(item => item.id === 'kaust');
  const prompt = buildScholarshipMasterPrompt({
    scholarship,
    deadlineLabel: '3 Jan 2027 · Closing time unconfirmed',
    career: data.countryOutlooks[scholarship.country],
    progress: { 'sch-kaust-0': true },
    applicationStatus: 'preparing'
  });
  assert.match(prompt, /KAUST MSc Fellowship/);
  assert.match(prompt, /Primary official source:/);
  assert.match(prompt, /Shortlist AI\/CV\/ML faculty and labs/);
  assert.match(prompt, /Completed:\n- Shortlist AI\/CV\/ML faculty and labs/);
  assert.match(prompt, /MY NEXT 5 ACTIONS/);
  assert.match(prompt, /do NOT convert this into an admission probability/);

  const url = new URL(buildChatGptUrl(prompt));
  assert.equal(url.origin, 'https://chatgpt.com');
  assert.equal(url.searchParams.get('q'), prompt);
  assert.equal(url.searchParams.get('hints'), 'search');
});

test('every visible scholarship can generate an isolated GPT prompt', () => {
  for (const scholarship of data.scholarships) {
    const prompt = buildScholarshipMasterPrompt({
      scholarship,
      deadlineLabel: scholarship.deadline || scholarship.timing || 'Official timetable pending',
      career: data.countryOutlooks[scholarship.country],
      progress: {},
      applicationStatus: 'preparing'
    });
    assert.ok(prompt.includes(scholarship.name), scholarship.id);
    assert.ok(prompt.includes('for ONE scholarship only'), scholarship.id);
    assert.ok(!prompt.includes('undefined'), scholarship.id);
  }
});
