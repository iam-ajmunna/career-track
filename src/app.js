import { buildCalendar } from '../scripts/lib/interim-calendar.mjs';
import { inspectLegacy } from './sync/import.js';
import { inspectBackup, parseBackup, MAX_BACKUP_BYTES } from './sync/backup.js';
import { countries, scholarships as normalizedScholarships } from './data/normalized.js';
import { buildCountryView, evaluateCountry } from './lib/scoring.js';
import { mergePrefs } from './lib/requirements.js';
import { parseHash, hrefCountry } from './lib/router.js';
import { renderCountries } from './views/countries-view.js';
import { renderCountry, applyFocus } from './views/country-view.js';
import { renderWorkingTray } from './views/working-tray.js';
import { esc } from './views/html.js';
import { scholarships, documents, englishPlan, referees, refereeStages, timeline, snapshotDate, countryOutlooks, screenedOut } from './data.js';
import { escapeHtml } from './sync/model.js';
import { createCountdowns, verifiedDeadlines, dateOnlyDeadlines } from './countdowns.js';
import { buildScholarshipMasterPrompt, buildChatGptUrl } from './gpt-prompt.js';
import { renderPersonalizedGoal, setGoalFilter, setGoalSelection, setGoalQuery } from './personalized-goal.js';
import { isScholarshipVisible, archivedRecords, trashedRecords, expiredRecords, screenedSuggestions, canonicalScholarshipId } from './scholarship-lifecycle.js';
import { trackingStatus } from './tracking.js';
import { goalProgrammes } from './personalized-goal-data.js';
let progressStore;
let lastState = '';
const selectedTracking = new Set();

const state = {
  view: 'overview', pins: {}, preferences: {}, ui: {}, notes: {},
  filter: 'focus',
  query: '',
  progress: {}, applications: {}, tracking: {}, profile: null, lifecycle: {}, history: {}, clockOffset: 0,
  theme: document.documentElement.dataset.theme || 'light'
};

document.documentElement.dataset.theme = state.theme;

const els = {
  pageTitle: document.querySelector('#pageTitle'),
  nav: document.querySelector('#nav'),
  search: document.querySelector('#globalSearch'),
  searchClear: document.querySelector('#searchClear'),
  themeToggle: document.querySelector('#themeToggle'),
  dialog: document.querySelector('#scholarshipDialog'),
  dialogContent: document.querySelector('#dialogContent'),
  dialogClose: document.querySelector('#dialogClose'),
  toastRoot: document.querySelector('#toastRoot')
};

const viewTitles = {
  overview: 'Overview',
  scholarships: 'Scholarships',
  pipeline: 'Application Pipeline',
  documents: 'Documents',
  profile: 'Profile Fit',
  goal: 'Personalized Goal',
  library: 'Archive & History', settings: 'Settings'
};

const statusMap = {
  open: ['Open', 'success'],
  'opens-soon': ['Opens soon', 'info'],
  urgent: ['Urgent', 'danger'],
  upcoming: ['Upcoming', 'neutral'],
  watch: ['Watch', 'info'],
  closed: ['Closed', 'neutral'],
  blocked: ['Ineligible', 'danger']
};

const fitMap = {
  excellent: ['Excellent fit', 'success'],
  strong: ['Strong fit', 'success'],
  'strong-reach': ['Strong reach', 'warn'],
  reach: ['Reach', 'warn'],
  'extreme-reach': ['Extreme reach', 'danger'],
  ineligible: ['Ineligible', 'danger'],
  unverified: ['Eligibility unverified', 'warn']
};

const decisionMap = {
  apply: ['Apply', 'success'],
  watch: ['Watch', 'info'],
  closed: ['Closed', 'neutral']
};

const defaultProfile = {
  name: 'Assaduzzaman Munna',
  degree: 'BSc CSE | AI / Computer Vision systems',
  university: 'North South University',
  cgpa: '3.74/4.00',
  highlights: ['Production AI engineering', 'Computer vision', 'Edge inference', 'Research publications'],
  positioning: {
    engineering: 92,
    research: 86,
    academics: 82,
    developmentImpact: 70,
    leadership: 58
  }
};

function decisionOf(item) {
  if (item.decision) return item.decision;
  const status = effectiveStatus(item);
  if (status === 'closed' || status === 'blocked') return 'closed';
  if (status === 'watch' || status === 'upcoming') return 'watch';
  return 'apply';
}

function daysUntil(date) {
  const current = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(Date.now() + state.clockOffset));
  return Math.ceil((Date.parse(date + 'T00:00:00Z') - Date.parse(current + 'T00:00:00Z')) / 86400000);
}

function effectiveStatus(item) {
  if (['blocked', 'closed', 'watch'].includes(item.status)) return item.status;
  const exact = verifiedDeadlines.find(deadline => deadline.scholarship_id === item.id);
  if (exact && Date.parse(exact.deadline_at) <= Date.now() + state.clockOffset) return 'closed';
  if (!exact && item.deadline && daysUntil(item.deadline) < 0) return 'closed';

  if (item.opens) {
    const opensIn = daysUntil(item.opens);
    if (opensIn > 0) return opensIn <= 45 ? 'opens-soon' : 'upcoming';
    if (item.deadline && daysUntil(item.deadline) <= 14) return 'urgent';
    return 'open';
  }

  if (item.deadline && daysUntil(item.deadline) <= 14) return 'urgent';
  return item.status === 'upcoming' ? 'upcoming' : 'open';
}

function deadlineLabel(item) {
  const exact = verifiedDeadlines.find(deadline => deadline.scholarship_id === item.id);
  if (exact) return new Intl.DateTimeFormat('en-GB', {timeZone:'Asia/Dhaka', dateStyle:'medium', timeStyle:'short'}).format(new Date(exact.deadline_at)) + ' · Dhaka';
  const dateOnly = dateOnlyDeadlines.find(deadline => deadline.scholarship_id === item.id);
  if (dateOnly) return `${dateOnly.deadline_date} · Closing time unconfirmed`;
  const status = effectiveStatus(item);
  if (status === 'blocked') return 'Not eligible this cycle';
  if (status === 'closed') return item.timing || 'Closed for this cycle';
  if (status === 'watch' && item.timing) return item.timing;
  if (item.opens && daysUntil(item.opens) > 0) {
    const openDays = daysUntil(item.opens);
    const closing = item.deadline ? ` · closes ${item.deadline}` : '';
    return `Opens ${item.opens} · ${openDays} days${closing}`;
  }
  if (item.deadline) {
    return `${item.deadline} · Date needs re-verification`;
  }
  return item.timing || 'Official timetable pending';
}

function getScholarshipProgress(id) {
  const item = scholarships.find(s => s.id === id);
  if (!item) return 0;
  const completed = item.actions.filter((_, i) => state.progress[`sch-${id}-${i}`]).length;
  return Math.round((completed / item.actions.length) * 100);
}

function getOverallProgress() {
  const active = scholarships.filter(s => isScholarshipVisible(state.lifecycle, s.id) && s.eligible && decisionOf(s) === 'apply' && trackingStatus(state.tracking, s.id) !== 'completed');
  const totalActions = active.reduce((n, s) => n + s.actions.length, 0);
  const completed = active.reduce((n, s) => n + s.actions.filter((_, i) => state.progress[`sch-${s.id}-${i}`]).length, 0);
  return totalActions ? Math.round((completed / totalActions) * 100) : 0;
}

function badge([label, kind]) {
  return `<span class="pill ${kind}">${label}</span>`;
}

function trackBadge(id) {
  const status = trackingStatus(state.tracking, id);
  return status === 'none' ? '' : badge([status === 'researching' ? 'Researching' : 'Completed', status === 'researching' ? 'info' : 'success']);
}
function trackSelection(id, label) {
  const canonical = canonicalScholarshipId(id);
  return `<label class="track-picker" title="Select for a bulk tracking action">
    <input type="checkbox" data-track-select="${canonical}" aria-label="Select ${escapeHtml(label)}" ${selectedTracking.has(canonical) ? 'checked' : ''}>
    <span>Select</span></label>`;
}
function trackStatusControl(id, label) {
  const status = trackingStatus(state.tracking, id);
  return `<label class="track-status-control">
    <span class="sr-only">Research tracking status of ${escapeHtml(label)}</span>
    <select data-track-status-id="${canonicalScholarshipId(id)}" aria-label="Research tracking status of ${escapeHtml(label)}">
      <option value="none" ${status === 'none' ? 'selected' : ''}>Not tracked</option>
      <option value="researching" ${status === 'researching' ? 'selected' : ''}>Researching</option>
      <option value="completed" ${status === 'completed' ? 'selected' : ''}>Completed</option>
    </select></label>`;
}
function trackingToolbar(visibleIds = []) {
  const count = selectedTracking.size;
  return `<section class="card tracking-toolbar" aria-label="Bulk scholarship tracking">
    <div class="tracking-toolbar-copy"><strong>Research & completion tracker</strong>
    <span>${Object.values(state.tracking).filter(x => x === 'researching').length} researching · ${Object.values(state.tracking).filter(x => x === 'completed').length} completed</span>
    <small>Completed means you've finished work on this scholarship; it does not mark an application as submitted.</small></div>
    <div class="tracking-toolbar-actions"><span class="track-selected-count">${count} selected</span>
      <button class="button secondary" type="button" data-track-select-visible ${visibleIds.length ? '' : 'disabled'}>Select shown</button>
      <button class="button secondary" type="button" data-track-bulk="researching" ${count ? '' : 'disabled'}>Researching</button>
      <button class="button secondary" type="button" data-track-bulk="completed" ${count ? '' : 'disabled'}>Mark completed</button>
      <button class="button ghost" type="button" data-track-bulk="none" ${count ? '' : 'disabled'}>Clear status</button>
      <button class="button ghost" type="button" data-track-clear-selection ${count ? '' : 'disabled'}>Deselect</button>
    </div>
  </section>`;
}

function scholarshipCard(item) {
  const status = statusMap[effectiveStatus(item)] || ['Unknown', 'neutral'];
  const fit = fitMap[item.fit] || ['Fit unknown', 'neutral'];
  const decision = decisionMap[decisionOf(item)] || ['Review', 'neutral'];
  const progress = getScholarshipProgress(item.id);
  return `
    <article class="card scholarship-card" data-scholarship-id="${item.id}">
      <div class="scholarship-card-top">
        <div>
          <div class="scholarship-name">${item.name}</div>
          <div class="country">${item.country} · ${item.provider}</div>
        </div>
        ${badge(status)}
      </div>
      <div class="tracking-card-row">${trackSelection(item.id, item.name)} ${trackBadge(item.id)} ${trackStatusControl(item.id, item.name)}</div>
      <div class="tag-row">
        ${badge(decision)}
        ${badge(fit)}
        <span class="tag">${item.route}</span>
        ${Number.isFinite(item.fitScore) ? `<span class="tag">Fit ${item.fitScore}/100</span>` : ''}
      </div>
      <p>${item.whyFit}</p>
      <div class="progress-track" title="Application checklist progress"><div class="progress-fill" style="width:${progress}%"></div></div>
      <div class="card-bottom">
        <div class="deadline">${deadlineLabel(item)}</div>
        <div class="card-actions">
          <button class="button secondary" data-open-scholarship="${item.id}">Details</button>
          <button class="button ghost" data-open-gpt="${item.id}" title="Open a new ChatGPT chat with a scholarship-specific research prompt">GPT prompt ↗</button>
          <button class="button ghost lifecycle-btn" data-life-action="archive" data-life-id="${item.id}" aria-label="Archive ${escapeHtml(item.name)}">Archive</button>
          <button class="button danger-outline lifecycle-btn" data-life-action="delete" data-life-id="${item.id}" aria-label="Delete ${escapeHtml(item.name)}">Delete</button>
        </div>
      </div>
    </article>`;
}

const byCountry = new Map(countries.map(c => [c.code,c]));
function currentCatalog() {
  return normalizedScholarships.filter(s => !['archived','trash','purged'].includes(state.lifecycle[canonicalScholarshipId(s.id)]?.status))
    .map(s => ({ ...s, applicationStatus:state.applications[s.id], trackingStatus:trackingStatus(state.tracking,s.id) }));
}
function workingTray() {
  return renderWorkingTray(Object.keys(state.pins).filter(k=>state.pins[k]), new Map(currentCatalog().map(s=>[s.slug,s])), byCountry, getScholarshipProgress, Date.now()+state.clockOffset, 'tray-'+state.view);
}
function currentPrefs() {
  return mergePrefs({ enabled:Object.fromEntries(['funding','work','career','spouse','pr'].map(k=>[k,state.preferences['enabled-'+k] ?? true])),
    weight:Object.fromEntries(['funding','work','career','spouse','pr'].map(k=>[k,state.preferences['weight-'+k] ?? 1])),
    sortOrder:state.preferences.sortOrder });
}
function renderOverview() {
  const best=scholarships.filter(s=>isScholarshipVisible(state.lifecycle,s.id) && s.eligible && decisionOf(s)==='apply' && trackingStatus(state.tracking,s.id)!=='completed' && !['closed','blocked'].includes(effectiveStatus(s))).sort((a,b)=>a.priority-b.priority).slice(0,5);
  document.querySelector('#view-overview').innerHTML=`<div id="deadlineHub"></div>${workingTray()}
    <div class="grid grid-3 section">
      <div class="card card-pad"><div class="metric-label">Actionable targets</div><div class="metric-value">${best.length}</div><a href="#/scholarships">Choose a country →</a></div>
      <div class="card card-pad"><div class="metric-label">Checklist completion</div><div class="metric-value">${getOverallProgress()}%</div><a href="#/pipeline">Continue preparation →</a></div>
      <div class="card card-pad"><div class="metric-label">Completed scholarships</div><div class="metric-value">${Object.values(state.tracking).filter(x=>x==='completed').length}</div><a href="#/scholarships?tracking=completed">Review finished work →</a></div>
    </div>
    <section class="section"><div class="section-head"><h2 class="section-title">Next actions</h2><span class="section-sub">Profile-fit order; competitive awards are never guaranteed.</span></div>
      <div class="priority-list">${best.length ? best.map(s=>`<button type="button" class="priority-item" data-open-scholarship="${esc(s.id)}"><span class="priority-copy"><span class="item-title">${esc(s.name)}</span><span class="item-meta">${esc(s.actions.find((_,i)=>!state.progress['sch-'+s.id+'-'+i]) || 'Review and submit the application')}</span></span><span aria-hidden="true">→</span></button>`).join('') : '<p class="empty">No actionable applications. <a href="#/scholarships">Review countries and upcoming calls.</a></p>'}</div>
    </section>`;
}

// Timeline notes should never reintroduce a suppressed recommendation.
function timelineItemVisible(item) {
  const title = item.title.toLowerCase();
  const groups = [
    [['knight-hennessy'], ['khs']], [['commonwealth shared'], ['commonwealth-shared']],
    [['commonwealth'], ['commonwealth']], [['kaust'], ['kaust']], [['eth zurich'], ['eth-esop']],
    [['daad'], ['daad-master']], [['ediss'], ['ediss']], [['cambridge'], ['gates', 'cambridge']],
    [['oxford'], ['clarendon', 'weidenfeld']], [['mbzuai'], ['mbzuai']],
    [['türkiye'], ['turkiye']], [['mext / stipendium / gks'], ['mext','stipendium','gks']]
  ];
  const found = groups.find(([words]) => words.some(word => title.includes(word)));
  return !found || found[1].some(id => isScholarshipVisible(state.lifecycle, id));
}

function filteredScholarships() {
  return scholarships.filter(s => {
    if (!isScholarshipVisible(state.lifecycle, s.id)) return false;
    const query = state.query.trim().toLowerCase();
    const decision = decisionOf(s);
    const haystack = `${s.name} ${s.country} ${s.provider} ${s.status} ${s.fit} ${s.route} ${decision}`.toLowerCase();
    const matchesQuery = !query || haystack.includes(query);
    const tracked = trackingStatus(state.tracking, s.id);
    const matchesFilter = ['researching', 'completed'].includes(state.filter)
      ? tracked === state.filter
      : tracked !== 'completed' && (state.filter === 'focus' ? ['apply','watch'].includes(decision) : decision === state.filter);
    return matchesQuery && matchesFilter;
  });
}

function inlineDetails(s) {
  const career=countryOutlooks[s.country];
  return `<p>${esc(s.whyFit || '')}</p>${s.mobilityNote ? `<p class="muted">${esc(s.mobilityNote)}</p>` : ''}
    <p class="muted">${s.fundingConditional ? 'Funding describes coverage if the competitive award is won. ' : ''}${s.deadlineAt ? '' : esc(s.deadlineDate ? s.deadlineDate+' · Closing time unconfirmed. Calendar alarms are unavailable until an exact time is verified.' : 'Official deadline not announced.')}</p>
    <h4>Execution checklist · ${getScholarshipProgress(s.id)}% complete</h4>
    <div class="checklist">${s.actions.map((action,i)=>{const key='sch-'+s.id+'-'+i;return `<div class="check-row"><input id="inline-${esc(key)}" type="checkbox" data-progress-key="${esc(key)}" ${state.progress[key]?'checked':''}><label for="inline-${esc(key)}">${esc(action)}</label></div>`;}).join('')}</div>
    <div class="application-controls">${trackSelection(s.id,s.name)} ${trackStatusControl(s.id,s.name)}
      <span class="pill neutral">${state.applications[s.id]==='submitted'?'Submitted':'Preparing'}</span>
      <button type="button" class="button secondary" data-application-id="${esc(s.id)}" data-application-status="${state.applications[s.id]==='submitted'?'preparing':'submitted'}">${state.applications[s.id]==='submitted'?'Resume preparation':'Mark submitted'}</button></div>
    <label class="note-label" for="note-${esc(s.id)}">Application notes</label><textarea id="note-${esc(s.id)}" data-note="${esc(s.id)}" maxlength="8000" rows="4">${esc(state.notes[s.id] || '')}</textarea>
    <button type="button" class="button secondary" data-save-note="${esc(s.id)}">Save notes</button>
    <details class="section"><summary>Career context and related documents</summary>${career ? `<p><strong>During MSc:</strong> ${esc(career.duringStudy)}</p><p><strong>After MSc:</strong> ${esc(career.postStudy)}</p><p><strong>Long-term:</strong> ${esc(career.longTerm)}</p><p class="muted">Prior research: ${esc(career.verifiedOn)}. Recheck current rules in the country evidence below.</p>` : ''}<a href="#/documents">Open shared application documents →</a></details>
    <div class="dialog-actions"><button type="button" class="button secondary" data-open-gpt="${esc(s.id)}">Open GPT ↗</button><a class="button secondary" href="#/pipeline">Application pipeline</a><button type="button" class="button ghost" data-life-action="archive" data-life-id="${esc(s.id)}">Archive</button><button type="button" class="button danger-outline" data-life-action="delete" data-life-id="${esc(s.id)}">Move to Trash</button></div>`;
}
function renderScholarships() {
  const root=document.querySelector('#view-scholarships');
  const previouslyOpen=new Set([...root.querySelectorAll('details[id][open]')].map(n=>n.id));
  const prefsOpen=root.querySelector('.prefs')?.open;
  const route=parseHash(location.hash), prefs=currentPrefs(), all=currentCatalog();
  const pinned=new Set(Object.keys(state.pins).filter(k=>state.pins[k]));
  const forCountry=code=>all.filter(s=>(s.countryCodes || [s.countryCode]).includes(code));
  const trackingFilter=new URLSearchParams(location.hash.split('?')[1] || '').get('tracking');
  if(route.name==='country') {
    const country=byCountry.get(route.code);
    if(!country){root.innerHTML='<p class="empty">Unknown country. <a href="#/scholarships">Back to all countries</a></p>';return;}
    const trackingPanel=`<details class="card card-pad section" ${selectedTracking.size?'open':''}><summary>Research &amp; completion controls${selectedTracking.size?' · '+selectedTracking.size+' selected':''}</summary>${trackingToolbar(forCountry(country.code).map(s=>canonicalScholarshipId(s.id)))}</details>`;
    root.innerHTML=workingTray()+trackingPanel+renderCountry(evaluateCountry(country,forCountry(country.code),prefs),prefs,pinned,route.focus,Date.now()+state.clockOffset);
    root.querySelectorAll('[data-existing-detail]').forEach(el=>{const item=all.find(s=>s.slug===el.dataset.existingDetail);if(item)el.innerHTML=inlineDetails(item);});
  } else {
    const query=state.query.trim().toLowerCase();
    const visibleCountries=countries.filter(c=>!query || c.name.toLowerCase().includes(query) || c.code.toLowerCase()===query);
    // A mobility programme appears under each documented host without duplicating its state or slug.
    const expanded=all.flatMap(s=>(s.countryCodes || [s.countryCode]).map(countryCode=>({...s,countryCode})));
    const catalog=trackingFilter ? expanded.filter(s=>trackingStatus(state.tracking,s.id)===trackingFilter) : expanded;
    root.innerHTML=workingTray()+(selectedTracking.size?trackingToolbar([...new Set(all.map(s=>canonicalScholarshipId(s.id)))]):'')+`<p class="section-sub">${countries.length-1} countries and territories · one multi-country collection. Ratings are planning judgements, not eligibility or immigration guarantees.</p>`+
      (trackingFilter ? `<section class="card card-pad section"><h2>${esc(trackingFilter==='completed'?'Completed scholarships':'Currently researching')}</h2>${trackingToolbar([...new Set(catalog.map(s=>s.id))])}<div class="priority-list">${[...new Map(catalog.map(s=>[s.id,s])).values()].map(s=>`<a class="tray-card" href="${esc(hrefCountry(s.countryCode,s.id))}">${esc(s.name)} ${trackBadge(s.id)}</a>`).join('') || '<p class="empty">No scholarships have this tracking status yet.</p>'}</div><a href="#/scholarships">All countries →</a></section>` : '')+
      (visibleCountries.length ? renderCountries(buildCountryView(visibleCountries,catalog,prefs),prefs,state.ui.unratedOpen,Date.now()+state.clockOffset) : '<p class="empty">No countries match. Clear the search to show all countries.</p>');
    const prefsNode=root.querySelector('.prefs');if(prefsOpen && prefsNode)prefsNode.open=true;
  }
  for(const id of previouslyOpen){const node=document.getElementById(id);if(node)node.open=true;}
  if(route.name==='country' && route.focus && lastFocusedRoute!==location.hash){lastFocusedRoute=location.hash;requestAnimationFrame(()=>applyFocus(root,route.focus));}
}
let lastFocusedRoute='';

function renderPipeline() {
  const ordered = [...scholarships]
    .filter(s => isScholarshipVisible(state.lifecycle, s.id) && s.eligible && decisionOf(s) === 'apply' && !['closed','blocked'].includes(effectiveStatus(s)) && trackingStatus(state.tracking, s.id) !== 'completed')
    .sort((a,b) => a.priority - b.priority);
  document.querySelector('#view-pipeline').innerHTML = `
    <div class="banner"><div><strong>Use one master evidence bank, then tailor by scholarship archetype.</strong><p>Tailor your evidence for research-focused, development-impact and leadership-heavy programmes using only the scholarships currently in your workspace.</p></div><span class="pill neutral banner-badge">Progress tracking</span></div>
    <div class="section pipeline-list">
      ${ordered.map((s, index) => {
        const progress = getScholarshipProgress(s.id);
        const open = progress > 0 || index < 2 ? 'open' : '';
        const nextAction = s.nextAction || s.actions.find((_, i) => !state.progress[`sch-${s.id}-${i}`]) || s.actions[0];
        return `<details class="card card-pad pipeline-card" ${open}>
          <summary class="pipeline-summary">
            <span class="pipeline-heading">
              <span class="section-title">${s.name}</span>
              <span class="section-sub">${s.country} · ${deadlineLabel(s)}</span>
            </span>
            <span class="pipeline-status">
              <span class="pill ${progress===100?'success':'neutral'}">${progress}% complete</span>
              <span class="pill neutral pipeline-state"></span>
            </span>
          </summary>
          <div class="pipeline-content">
            <div class="pipeline-next"><span>Next action</span><strong>${nextAction}</strong></div>
            <div class="progress-track" style="margin-bottom:12px"><div class="progress-fill" style="width:${progress}%"></div></div>
            <div class="checklist">
              ${s.actions.map((action, i) => {
                const key = `sch-${s.id}-${i}`;
                return `<div class="check-row"><input id="${key}" type="checkbox" data-progress-key="${key}" ${state.progress[key]?'checked':''}><label for="${key}">${action}</label><span class="meta">Step ${i+1}</span></div>`;
              }).join('')}
            </div>
            <div class="application-controls">
              ${trackBadge(s.id)} ${trackStatusControl(s.id, s.name)}
              <span class="pill neutral">${state.applications[s.id] === 'submitted' ? 'Submitted' : 'Preparing'}</span>
              <button class="button secondary" data-application-id="${s.id}" data-application-status="${state.applications[s.id] === 'submitted' ? 'preparing' : 'submitted'}">${state.applications[s.id] === 'submitted' ? 'Resume preparation' : 'Mark submitted'}</button>
              <button class="button ghost" data-open-gpt="${s.id}">GPT prompt ↗</button>
            </div>
          </div>
        </details>`;
      }).join('')}
    </div>`;
}

function renderDocuments() {
  const relevant = {
    sopKaust: ['kaust'], sopOxford: ['clarendon', 'weidenfeld'],
    commonwealthImpact: ['commonwealth', 'commonwealth-shared'],
    mextPlan: ['mext'], edissVideo: ['ediss']
  };
  const visibleDocuments = documents.filter(item => !relevant[item.id] ||
    relevant[item.id].some(id => isScholarshipVisible(state.lifecycle, id)));
  const done = visibleDocuments.filter(d => state.progress[`doc-${d.id}`]).length;
  const required = visibleDocuments.filter(d => d.required);
  const requiredDone = required.filter(d => state.progress[`doc-${d.id}`]).length;
  const pct = visibleDocuments.length ? Math.round(done / visibleDocuments.length * 100) : 0;
  const groups = [...new Set(visibleDocuments.map(d => d.group))];

  const ieltsDone = englishPlan.steps.filter(step => state.progress[`ielts-${step.id}`]).length;
  const refereeChecks = referees.length * refereeStages.length;
  const refereeDone = referees.reduce((total, referee) => {
    return total + refereeStages.filter(stage => state.progress[`ref-${referee.id}-${stage.id}`]).length;
  }, 0);

  document.querySelector('#view-documents').innerHTML = `
    <div class="grid grid-4">
      <div class="card card-pad"><div class="metric-label">Dossier items ready</div><div class="metric-value">${done}/${visibleDocuments.length}</div><div class="metric-sub">Master evidence packet</div></div>
      <div class="card card-pad"><div class="metric-label">Required items ready</div><div class="metric-value">${requiredDone}/${required.length}</div><div class="metric-sub">Critical cross-application material</div></div>
      <div class="card card-pad"><div class="metric-label">IELTS plan</div><div class="metric-value">${ieltsDone}/${englishPlan.steps.length}</div><div class="metric-sub">${englishPlan.target}</div></div>
      <div class="card card-pad"><div class="metric-label">Referee readiness</div><div class="metric-value">${refereeDone}/${refereeChecks}</div><div class="metric-sub">Three-person reference system</div></div>
    </div>

    <section class="section">
      <div class="section-head">
        <div><div class="section-title">Master application dossier</div><div class="section-sub">Prepare once, then tailor the narrative and format for each scholarship.</div></div>
        <span class="pill ${pct === 100 ? 'success' : 'neutral'}">${pct}% complete</span>
      </div>
      <div class="document-groups">
        ${groups.map(group => `
          <section class="card card-pad document-group">
            <div class="section-title">${group}</div>
            <div class="checklist dossier-list">
              ${visibleDocuments.filter(d => d.group === group).map(d => {
                const key = `doc-${d.id}`;
                const priorityClass = d.priority === 'critical' ? 'danger' : d.priority === 'high' ? 'warn' : d.priority === 'watch' ? 'info' : 'neutral';
                const priorityLabel = d.priority === 'critical' ? 'Critical' : d.priority === 'high' ? 'High' : d.priority === 'watch' ? 'Watch' : (d.required ? 'Required' : 'Optional');
                return `<div class="check-row dossier-row">
                  <input id="${key}" type="checkbox" data-progress-key="${key}" ${state.progress[key]?'checked':''}>
                  <label for="${key}"><strong>${d.label}</strong><span class="doc-detail">${d.detail || ''}</span></label>
                  <span class="pill ${priorityClass}">${priorityLabel}</span>
                </div>`;
              }).join('')}
            </div>
          </section>`).join('')}
      </div>
    </section>

    <div class="grid grid-2 section">
      <section class="card card-pad">
        <div class="section-head"><div><div class="section-title">English-test strategy</div><div class="section-sub">Portfolio English plan; verify the thresholds for the scholarship routes you have kept.</div></div></div>
        <div class="target-callout"><span>Portfolio target</span><strong>${englishPlan.target}</strong></div>
        <div class="requirement-grid">
          ${englishPlan.requirements.filter(req => isScholarshipVisible(state.lifecycle, req.programme.startsWith('Cambridge') ? (isScholarshipVisible(state.lifecycle, 'gates') ? 'gates' : 'cambridge') : req.programme === 'KAUST' ? 'kaust' : 'ediss')).map(req => `<div class="requirement-card"><span>${req.programme}</span><strong>${req.score}</strong></div>`).join('')}
        </div>
        <div class="checklist" style="margin-top:14px">
          ${englishPlan.steps.map((step, index) => {
            const key = `ielts-${step.id}`;
            return `<div class="check-row"><input id="${key}" type="checkbox" data-progress-key="${key}" ${state.progress[key]?'checked':''}><label for="${key}">${step.label}</label><span class="meta">Step ${index+1}</span></div>`;
          }).join('')}
        </div>
      </section>

      <section class="card card-pad">
        <div class="section-head"><div><div class="section-title">Three-referee system</div><div class="section-sub">Track confirmation, briefing and submissions separately instead of one generic “references done” checkbox.</div></div></div>
        <div class="referee-grid">
          ${referees.map(referee => `
            <div class="referee-card">
              <div><span class="referee-id">Referee ${referee.id}</span><strong>${referee.role}</strong><p>${referee.purpose}</p></div>
              <div class="referee-stages">
                ${refereeStages.map(stage => {
                  const key = `ref-${referee.id}-${stage.id}`;
                  return `<label class="mini-check"><input type="checkbox" data-progress-key="${key}" ${state.progress[key]?'checked':''}><span>${stage.label}</span></label>`;
                }).join('')}
              </div>
            </div>`).join('')}
        </div>
      </section>
    </div>
  `;
}


const profileDimensions = [
  ['engineering', 'Engineering depth'],
  ['research', 'Research readiness'],
  ['academics', 'Academic strength'],
  ['developmentImpact', 'Development impact'],
  ['leadership', 'Leadership evidence']
];

function normalizeProfileInput(value) {
  const source = value || defaultProfile;
  const positioning = Object.fromEntries(profileDimensions.map(([key]) => [key, Math.max(0, Math.min(100, Math.round(Number(source.positioning?.[key]) || 0)))]));
  return {
    name: String(source.name || defaultProfile.name).trim().slice(0, 80),
    degree: String(source.degree || defaultProfile.degree).trim().slice(0, 120),
    university: String(source.university || defaultProfile.university).trim().slice(0, 120),
    cgpa: String(source.cgpa || defaultProfile.cgpa).trim().slice(0, 32),
    highlights: (Array.isArray(source.highlights) ? source.highlights : defaultProfile.highlights)
      .map(item => String(item || '').trim().slice(0, 56))
      .filter(Boolean)
      .slice(0, 8),
    positioning
  };
}

function profileFromForm(form) {
  const data = new FormData(form);
  return normalizeProfileInput({
    name: data.get('name'),
    degree: data.get('degree'),
    university: data.get('university'),
    cgpa: data.get('cgpa'),
    highlights: String(data.get('highlights') || '').split('\n'),
    positioning: Object.fromEntries(profileDimensions.map(([key]) => [key, data.get(key)]))
  });
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/\n/g, '&#10;');
}

function renderProfileEditor(sourceProfile) {
  const profile = normalizeProfileInput(sourceProfile);
  return `
    <form class="card card-pad profile-editor" id="profileEditor">
      <div class="section-head">
        <div>
          <div class="section-title">Editable profile setup</div>
          <div class="section-sub">Update the applicant evidence used by the fit dashboard. Saves to this browser.</div>
        </div>
        <div class="card-actions">
          <button class="button secondary" type="submit">Save profile</button>
          <button class="button ghost" type="button" data-reset-profile>Reset baseline</button>
        </div>
      </div>
      <div class="profile-form-grid">
        <label class="field"><span>Name</span><input name="name" maxlength="80" value="${escapeAttr(profile.name)}" autocomplete="name"></label>
        <label class="field"><span>Degree / positioning</span><input name="degree" maxlength="120" value="${escapeAttr(profile.degree)}"></label>
        <label class="field"><span>University</span><input name="university" maxlength="120" value="${escapeAttr(profile.university)}"></label>
        <label class="field"><span>CGPA</span><input name="cgpa" maxlength="32" value="${escapeAttr(profile.cgpa)}"></label>
      </div>
      <label class="field field-full"><span>Highlights, one per line</span><textarea name="highlights" rows="4" maxlength="480">${escapeHtml(profile.highlights.join('\n'))}</textarea></label>
      <div class="profile-slider-grid">
        ${profileDimensions.map(([key, label]) => `
          <label class="score-field">
            <span><strong>${label}</strong><output data-score-output="${key}">${profile.positioning[key]}</output></span>
            <input class="profile-score-input" type="range" name="${key}" min="0" max="100" step="1" value="${profile.positioning[key]}" data-score-input="${key}">
          </label>`).join('')}
      </div>
    </form>`;
}

function renderProfile() {
  const sourceProfile = normalizeProfileInput(state.profile || defaultProfile);
  const isConfiguredProfile = Boolean(state.profile);
  const profile = { ...sourceProfile, highlights: sourceProfile.highlights.map(escapeHtml) };
  for (const key of ['name','degree','university','cgpa']) profile[key] = escapeHtml(profile[key] || '');
  const avg = Math.round(Object.values(sourceProfile.positioning).reduce((a,b)=>a+b,0) / Object.values(sourceProfile.positioning).length);
  const dims = profileDimensions.map(([key, label]) => [label, sourceProfile.positioning[key]]);

  document.querySelector('#view-profile').innerHTML = `
    <div class="profile-note"><strong>${isConfiguredProfile ? 'Custom profile saved.' : 'Baseline profile loaded.'}</strong><span>${isConfiguredProfile ? 'Your editable profile is saved in this browser and drives this fit dashboard.' : 'This page uses the current scholarship evidence profile until you save your own version.'}</span></div>
    <section class="card card-pad profile-score">
      <div class="score-ring" style="--score:${avg}"><div class="score-inner"><div class="score-number">${avg}</div><div class="score-caption">portfolio readiness</div></div></div>
      <div>
        <div class="section-title">${profile.name}</div>
        <div class="section-sub">${profile.degree} · ${profile.university} · CGPA ${profile.cgpa}</div>
        <div class="tag-row" style="margin-top:12px">${profile.highlights.map(x=>`<span class="tag">${x}</span>`).join('')}</div>
        <p class="muted" style="font-size:13px;line-height:1.7">Your strongest positioning is for research- and engineering-intensive scholarships. Leadership-heavy schemes require more explicit evidence than the current CV exposes.</p>
      </div>
    </section>

    <div class="grid grid-3 section profile-action-grid">
      <section class="card card-pad">
        <div class="metric-label">Highest leverage</div>
        <div class="section-title">Research / engineering MSc routes</div>
        <p class="metric-sub">Apply the strongest technical evidence to your active research/engineering scholarship routes.</p>
      </section>
      <section class="card card-pad">
        <div class="metric-label">Primary gap</div>
        <div class="section-title">Leadership + public-impact proof</div>
        <p class="metric-sub">Leadership and public-impact awards need concrete outcomes, not generic ambition.</p>
      </section>
      <section class="card card-pad">
        <div class="metric-label">Next build block</div>
        <div class="section-title">Three SOP tracks</div>
        <p class="metric-sub">Keep separate research, development-impact and leadership narratives to avoid one weak generic SOP.</p>
      </section>
    </div>

    <div class="grid grid-2 section">
      <section class="card card-pad">
        <div class="section-title">Selection dimensions</div>
        <div class="section-sub">Internal planning scores derived from the CV evidence and scholarship fit—not official probabilities.</div>
        <div style="display:grid;gap:14px;margin-top:18px">
          ${dims.map(([label,score])=>`<div><div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:6px"><span>${label}</span><span class="mono muted">${score}/100</span></div><div class="progress-track"><div class="progress-fill" style="width:${score}%"></div></div></div>`).join('')}
        </div>
      </section>
      <section class="card card-pad">
        <div class="section-title">Narrative architecture</div>
        <div class="section-sub">Do not use one generic SOP for every scholarship.</div>
        <div class="timeline" style="margin-top:16px">
          <div class="timeline-item"><div class="timeline-date">Track A</div><div class="timeline-content"><h3>Research / technical</h3><p>AI systems, computer vision, efficient inference, publications, production-scale engineering. Prioritise the applicable routes currently retained in your scholarship directory.</p></div></div>
          <div class="timeline-item"><div class="timeline-date">Track B</div><div class="timeline-content"><h3>Development impact</h3><p>Use AI engineering to address measurable Bangladesh-relevant constraints in safety, healthcare, infrastructure or public-sector capability. Apply only to retained, eligible development-impact routes.</p></div></div>
          <div class="timeline-item"><div class="timeline-date">Track C</div><div class="timeline-content"><h3>Leadership / civic impact</h3><p>Only use where you have authentic evidence of initiative, influence, mentorship and community outcomes. Apply only to retained, eligible leadership-based routes.</p></div></div>
        </div>
      </section>
    </div>

    <div class="section">${renderProfileEditor(sourceProfile)}</div>`;
}

function readableDate(value) {
  return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeZone: 'Asia/Dhaka' }).format(new Date(value));
}
function renderLibrary() {
  const snapshot = { lifecycle: state.lifecycle, history: state.history };
  const archived = archivedRecords(snapshot);
  const trashed = trashedRecords(snapshot);
  const expired = expiredRecords(snapshot);
  document.querySelector('#view-library').innerHTML = `
    <div class="banner"><div><strong>One workspace, one scholarship lifecycle</strong>
      <p>Archived recommendations can be restored. Deleted recommendations remain recoverable for 10 days and are permanently suppressed after that period. Older expired entries remain in History; v2 closed scholarships keep their progress.</p>
      <p>Trash cleanup runs while this workspace is open. Deadlines close applications without erasing v2 progress. Export a backup to keep a separate copy.</p></div></div>
    <section class="section"><div class="section-head"><div class="section-title">Archive (${archived.length})</div></div>
      <div class="lifecycle-list">${archived.length ? archived.map(item => `<article class="card lifecycle-record">
        <div><strong>${escapeHtml(item.name)}</strong><span>Saved for later · ${escapeHtml(item.deadline || 'Deadline not published')}</span></div>
        <div class="card-actions"><button class="button secondary" data-life-action="restore" data-life-id="${item.id}">Restore</button>
        <button class="button danger-outline" data-life-action="delete" data-life-id="${item.id}">Delete</button></div></article>`).join('') : '<div class="empty">Nothing archived.</div>'}</div>
    </section>
    <section class="section"><div class="section-head"><div class="section-title">Recently deleted (${trashed.length})</div></div>
      <p class="section-sub">Restore before the deletion date. After 10 days, the record and its application checklist are purged; a minimal internal ID prevents it returning from the static catalogue.</p>
      <div class="lifecycle-list">${trashed.length ? trashed.map(item => `<article class="card lifecycle-record">
        <div><strong>${escapeHtml(item.name)}</strong><span>Permanent deletion: ${readableDate(item.purgeAt)}</span></div>
        <button class="button secondary" data-life-action="restore" data-life-id="${item.id}">Restore</button></article>`).join('') : '<div class="empty">Trash is empty.</div>'}</div>
    </section>
    <section class="section"><div class="section-head"><div class="section-title">Deadline history (${expired.length})</div></div>
      <p class="section-sub">Only the programme name and closing deadline are retained for reference. Full details, actions and application progress are removed.</p>
      <div class="lifecycle-list">${expired.length ? expired.map(item => `<div class="card lifecycle-record">
        <strong>${escapeHtml(item.name)}</strong><span>Deadline: ${readableDate(item.deadline)}</span></div>`).join('') : '<div class="empty">No deadlines have elapsed yet.</div>'}</div>
    </section>`;
}
function exportVisibleCalendar() {
  const rows = verifiedDeadlines.filter(item => isScholarshipVisible(state.lifecycle, item.scholarship_id));
  if (!rows.length) { toast('No active verified deadlines to export.'); return; }
  const url=URL.createObjectURL(new Blob([buildCalendar(rows)],{type:'text/calendar'}));
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'career-track-active-deadlines.ics';
  document.body.append(anchor); anchor.click(); anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const countdowns = createCountdowns({ state, readiness: getScholarshipProgress,
  isVisible: id => isScholarshipVisible(state.lifecycle, id) || state.pins[id],
  onHeroChange: renderCurrentView, onTick: () => progressStore?.reap?.() });

function renderSettings() {
  document.querySelector('#view-settings').innerHTML=`<section class="card card-pad section"><h2>Device storage and backups</h2><p>Your checklists, pins, priorities and notes save in this browser. No account is needed. Export a backup before clearing browser data, changing the website address or moving to another device; automatic cross-device sync is off.</p><div class="dialog-actions"><button type="button" class="button" data-export-state>Export progress</button><a class="button secondary" href="/deadlines.ics">Subscribe / download calendar</a></div><p class="muted">Calendar alarms use verified exact times only. Add the calendar to your phone for reminders.</p></section>
    <section class="card card-pad section"><h2>Import a backup file</h2><p id="backupHelp">Choose one Career Track v2 JSON export, up to 1 MB. Preview before importing. Completed work and missing items are added; existing notes, priorities and profile details are kept. The file stays on this device.</p><button type="button" class="button secondary" data-pick-backup>Choose backup file</button><input id="backupFile" type="file" accept=".json,application/json" aria-label="Career Track JSON backup" aria-describedby="backupHelp backupReport" hidden><div id="backupReport" role="status" aria-live="polite"></div></section>
    <section class="card card-pad section"><h2>Import progress from this browser</h2><p>Preview the import first. Completed items, pins, notes and priorities are merged into v2 while keeping existing notes and priorities; your original browser data stays intact. Run this on the browser where you previously used Career Track.</p><button type="button" class="button secondary" data-preview-import>Preview import</button><div id="importReport" role="status" aria-live="polite"></div></section>
    <details class="card card-pad section danger-zone"><summary>Danger zone</summary><h3>Reset v2 checklist progress</h3><p>This clears v2 checklist flags, notes, pins and application statuses for this workspace. Your previous browser data stays intact. A JSON backup downloads before the reset.</p><form id="resetProgressForm" novalidate><label for="resetWord">Type RESET to continue</label><input id="resetWord" name="resetWord" aria-describedby="resetError" autocomplete="off" spellcheck="false"><p id="resetError" role="status"></p><button type="submit" class="button danger-outline">Export backup and reset v2</button></form></details>`;
  if(pendingBackup)renderBackupPreview();
}
let pendingImport=null,pendingBackup=null,backupVersion=0;
function inspectBrowserImport() {
  try{return inspectLegacy(localStorage,progressStore.get().state);}
  catch{return {changes:[],newItems:0,newTicks:0,sources:0,errors:['Browser storage is unavailable. Allow site storage, or choose an exported JSON backup instead.']};}
}
function renderBackupPreview() {
  const report=document.querySelector('#backupReport');
  if(!report||!pendingBackup)return;
  try{
    const preview=inspectBackup(pendingBackup.state,progressStore.get().state);
    report.innerHTML=`<p>${esc(pendingBackup.name)}: ${preview.newItems} new items (${preview.newTicks} completed checklist items). ${preview.keptValues} existing values kept.</p><div class="dialog-actions">${preview.newItems?`<button type="button" class="button" data-commit-backup${progressStore.get().draftProblem?' disabled':''}>Import backup</button>`:'<p>This backup is already up to date.</p>'}<button type="button" class="button secondary" data-cancel-backup>Cancel</button></div>`;
  }catch{report.textContent='This backup cannot fit alongside your current progress. Export your progress and choose a smaller backup.';}
}
document.addEventListener('change',async e=>{
  if(e.target.id!=='backupFile')return;
  const input=e.target,file=input.files?.[0],version=++backupVersion;
  const report=document.querySelector('#backupReport');pendingBackup=null;
  if(!file){report.textContent='';return;}
  report.textContent='Checking '+file.name+'…';input.removeAttribute('aria-invalid');
  try{
    if(!/\.json$/i.test(file.name)||!file.size||file.size>MAX_BACKUP_BYTES)throw Error('Choose one non-empty JSON backup, up to 1 MB.');
    const raw=await file.text();
    if(version!==backupVersion||!input.isConnected)return;
    const candidate={name:file.name,state:parseBackup(raw)};
    inspectBackup(candidate.state,progressStore.get().state);
    pendingBackup=candidate;renderBackupPreview();
  }catch(error){
    if(version!==backupVersion||!input.isConnected)return;
    report.textContent=error.message||'The backup could not be read. Choose another Career Track export.';
    input.setAttribute('aria-invalid','true');document.querySelector('[data-pick-backup]').focus();
  }
});
function showDeleteConfirmation(id) {
  const dialog=document.querySelector('#confirmDialog');
  document.querySelector('#confirmTitle').textContent='Move scholarship to Trash?';
  document.querySelector('#confirmDescription').textContent='It disappears from your workspace immediately. Restore it from Archive & History within 10 days.';
  const action=document.querySelector('#confirmAction');action.textContent='Move to Trash';
  action.onclick=()=>{try{progressStore.lifecycle('delete',id);selectedTracking.delete(canonicalScholarshipId(id));dialog.close();toast('Moved to Trash. Restore within 10 days.');}catch{dialog.close();toast('Could not move this scholarship.');}};
  dialog.showModal();
}
document.addEventListener('click',e=>{
  if(e.target.closest('[data-pick-backup]'))document.querySelector('#backupFile').click();
  if(e.target.closest('[data-cancel-backup]')){backupVersion++;pendingBackup=null;document.querySelector('#backupFile').value='';document.querySelector('#backupReport').textContent='';document.querySelector('[data-pick-backup]').focus();}
  if(e.target.closest('[data-commit-backup]')&&pendingBackup&&!progressStore.get().draftProblem){
    try{
      const preview=inspectBackup(pendingBackup.state,progressStore.get().state);
      pendingBackup=null;backupVersion++;progressStore.applyState(preview.state);renderSettings();
      document.querySelector('#backupReport').textContent=progressStore.get().storageFailed?'Backup imported into this tab but not saved. Use Retry or export before closing.':'Backup imported and saved on this device.';
      document.querySelector('[data-pick-backup]').focus();
    }catch{document.querySelector('#backupReport').textContent='Backup could not be imported. Your current progress is unchanged; export it and try a smaller backup.';}
  }
  if(e.target.closest('[data-preview-import]')){
    pendingImport=inspectBrowserImport();
    document.querySelector('#importReport').innerHTML=`<p>${pendingImport.newItems} new items (${pendingImport.newTicks} checklist ticks) from ${pendingImport.sources} prior data source(s).</p>${pendingImport.errors.map(error=>`<p>${esc(error)}</p>`).join('')}${pendingImport.newItems?`<button type="button" class="button" data-commit-import${progressStore.get().draftProblem?' disabled':''}>Import completed progress</button>`:''}`;
  }
  if(e.target.closest('[data-commit-import]')&&pendingImport&&!progressStore.get().draftProblem){
    const latest=inspectBrowserImport();
    progressStore.changeMany([...latest.changes,{bucket:'ui',key:'legacyImported',value:true}]);
    pendingImport=null;renderSettings();document.querySelector('#importReport').textContent=progressStore.get().storageFailed?'Imported into this tab but not saved. Use Retry or export before closing.':'Progress imported and saved on this device. Preview again to check for new items.';
  }
});
document.addEventListener('submit',e=>{
  if(e.target.id!=='resetProgressForm')return;e.preventDefault();
  if(new FormData(e.target).get('resetWord')!=='RESET'){document.querySelector('#resetError').textContent='Type RESET exactly to continue.';document.querySelector('#resetWord').setAttribute('aria-invalid','true');document.querySelector('#resetWord').focus();return;}
  const url=URL.createObjectURL(new Blob([JSON.stringify(progressStore.export(),null,2)],{type:'application/json'}));
  const a=document.createElement('a');a.href=url;a.download='career-track-before-reset-'+new Date().toISOString().replace(/[:.]/g,'-')+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  const current=progressStore.get().state;
  const changes=['progress','applications','pins','notes','tracking'].flatMap(bucket=>Object.keys(current[bucket]||{}).map(key=>({bucket,key,value:null})));
  if(changes.length)progressStore.changeMany(changes);renderSettings();toast(progressStore.get().storageFailed?'Reset is not saved. Use Retry or export before closing.':'v2 reset saved on this device. Backup downloaded.');
});

function renderCurrentView() {
  const focusedKey = document.activeElement?.dataset?.progressKey;
  const drafts=[...document.querySelectorAll('[data-note-dirty]')].map(n=>({id:n.dataset.note,value:n.value}));
  ({overview:renderOverview,scholarships:renderScholarships,pipeline:renderPipeline,documents:renderDocuments,profile:renderProfile,library:renderLibrary,settings:renderSettings,
    goal:()=>{document.querySelector('#view-goal').innerHTML=renderPersonalizedGoal(state.progress,state.lifecycle,state.tracking,selectedTracking);}})[state.view]();
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active-view'));
  document.querySelector(`#view-${state.view}`).classList.add('active-view');
  els.pageTitle.textContent = state.view==='scholarships' && parseHash(location.hash).name==='country' ? (byCountry.get(parseHash(location.hash).code)?.name || 'Unknown country') : viewTitles[state.view];
  document.querySelector('#pageSubtitle').textContent=({overview:'What should I do next?',scholarships:'Where should I apply and what do I give up?',pipeline:'What is due when?',documents:'What is ready?',profile:'How strong am I?',settings:'Keep your progress safe.',goal:'Which programme fits my research direction?',library:'What have I set aside?'})[state.view];
  document.title = `${viewTitles[state.view]} · MSc Scholarship Command Center`;
  els.nav.querySelectorAll('.nav-item').forEach(b => {
    const active = b.dataset.view === state.view;
    b.classList.toggle('active', active);
    if (active) b.setAttribute('aria-current', 'page');
    else b.removeAttribute('aria-current');
  });
  els.search.value = state.query;
  els.search.placeholder='Search country names…';
  els.search.setAttribute('aria-label','Search countries');
  els.search.closest('.search-wrap').hidden = ['goal','library','settings'].includes(state.view);
  els.searchClear.hidden = !state.query;
  for(const draft of drafts){const n=document.querySelector('[data-note="'+CSS.escape(draft.id)+'"]');if(n){n.value=draft.value;n.dataset.noteDirty='true';}}
  countdowns.render();
  if (focusedKey) document.querySelector(`.active-view [data-progress-key="${CSS.escape(focusedKey)}"]`)?.focus({ preventScroll: true });
}

function openScholarship(id) {
  const item=normalizedScholarships.find(s=>s.id===id);
  if(!item){const goal=goalProgrammes.find(p=>p.id===id);if(goal){setGoalSelection(goal.id);setGoalFilter('All');navigate('goal');}return;}
  state.view='scholarships';
  const href=hrefCountry(item.countryCode,item.slug);
  if(location.hash!==href)location.hash=href;
  else {lastFocusedRoute='';renderCurrentView();}
}

function openGptForScholarship(id) {
  const scholarship = scholarships.find(item => item.id === id);
  if (!scholarship || !isScholarshipVisible(state.lifecycle, id)) return;
  const prompt = buildScholarshipMasterPrompt({
    scholarship,
    deadlineLabel: deadlineLabel(scholarship),
    career: countryOutlooks[scholarship.country],
    progress: state.progress,
    applicationStatus: state.applications[scholarship.id] || 'preparing'
  });
  navigator.clipboard?.writeText(prompt).catch(() => {});
  const anchor = document.createElement('a');
  anchor.href = buildChatGptUrl(prompt);
  anchor.target = '_blank';
  anchor.rel = 'noopener noreferrer';
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  toast('Opened ChatGPT · master prompt copied as backup');
}

function toast(message) {
  const node = document.createElement('div');
  node.className = 'toast';
  node.textContent = message;
  els.toastRoot.appendChild(node);
  setTimeout(() => node.remove(), 2200);
}

els.nav.addEventListener('click', e => {
  const btn = e.target.closest('[data-view]');
  if (!btn) return;
  navigate(btn.dataset.view);
});

els.search.addEventListener('input', e => {
  state.query = e.target.value;
  if (state.view !== 'scholarships' || parseHash(location.hash).name==='country') {state.view='scholarships';history.replaceState(null,'','#/scholarships');}
  renderCurrentView();
});

els.searchClear.addEventListener('click', () => {
  state.query = '';
  els.search.value = '';
  renderCurrentView();
  els.search.focus();
});

function syncThemeToggle() {
  const dark = state.theme === 'dark';
  const label = dark ? 'Switch to light theme' : 'Switch to dark theme';
  els.themeToggle.setAttribute('aria-label', label);
  els.themeToggle.setAttribute('title', label);
  els.themeToggle.setAttribute('aria-pressed', String(dark));
}

els.themeToggle.addEventListener('click', () => {
  state.theme = state.theme === 'light' ? 'dark' : 'light';
  document.documentElement.dataset.theme = state.theme;
  try { localStorage.setItem('scholarship-theme', state.theme); } catch { toast('Theme will apply until this tab closes.'); }
  syncThemeToggle();
});

els.dialogClose.addEventListener('click', () => els.dialog.close());
els.dialog.addEventListener('click', e => { if (e.target === els.dialog) els.dialog.close(); });

document.addEventListener('submit', e => {
  const form = e.target.closest('#profileEditor');
  if (!form) return;
  e.preventDefault();
  try {
    progressStore.change('profile', 'current', profileFromForm(form));
    toast('Profile queued for saving');
  } catch {
    toast('Profile could not be saved. Export progress and retry.');
  }
});

document.addEventListener('input', e => {
  if(e.target.matches('[data-note]')){e.target.dataset.noteDirty='true';return;}
  if (e.target.id === 'goalSearch') {
    const pos=e.target.selectionStart;
    setGoalQuery(e.target.value);
    document.querySelector('#view-goal').innerHTML=renderPersonalizedGoal(state.progress, state.lifecycle, state.tracking, selectedTracking);
    const next=document.querySelector('#goalSearch');
    next?.focus({preventScroll:true});
    try { next?.setSelectionRange(pos,pos); } catch { /* Input selection unsupported. */ }
    return;
  }
  const slider = e.target.closest('[data-score-input]');
  if (!slider) return;
  document.querySelector(`[data-score-output="${CSS.escape(slider.dataset.scoreInput)}"]`)?.replaceChildren(String(slider.value));
});

document.addEventListener('click', e => {
  const pin=e.target.closest('[data-toggle-working]');
  if(pin){progressStore.change('pins',pin.dataset.toggleWorking,!state.pins[pin.dataset.toggleWorking]);return;}
  const note=e.target.closest('[data-save-note]');
  if(note){const field=document.querySelector('[data-note="'+CSS.escape(note.dataset.saveNote)+'"]');delete field.dataset.noteDirty;progressStore.change('notes',note.dataset.saveNote,document.querySelector('[data-note="'+CSS.escape(note.dataset.saveNote)+'"]').value);toast('Notes queued for saving.');return;}

  const trackedFilter = e.target.closest('[data-open-track-filter]');
  if (trackedFilter) { location.hash='#/scholarships?tracking='+encodeURIComponent(trackedFilter.dataset.openTrackFilter); return; }
  const openGoal = e.target.closest('[data-open-goal-programme]');
  if (openGoal) { setGoalSelection(openGoal.dataset.openGoalProgramme); setGoalFilter('All'); state.view = 'goal'; renderCurrentView(); return; }
  if (e.target.closest('[data-track-select-visible]')) {
    document.querySelectorAll('.active-view [data-track-select]').forEach(node => selectedTracking.add(node.dataset.trackSelect));
    renderCurrentView(); return;
  }
  if (e.target.closest('[data-track-clear-selection]')) { selectedTracking.clear(); renderCurrentView(); return; }
  const bulk = e.target.closest('[data-track-bulk]');
  if (bulk) {
    const status = bulk.dataset.trackBulk === 'none' ? null : bulk.dataset.trackBulk;
    if (!selectedTracking.size) return;
    try {
      progressStore.bulkTrack([...selectedTracking], status);
      selectedTracking.clear();
      renderCurrentView();
      toast(status === 'researching' ? 'Scholarships marked researching.' : status === 'completed' ? 'Scholarships marked completed.' : 'Tracking status cleared.');
    } catch { toast('Could not update selection. Review archived or expired entries.'); }
    return;
  }
  const lifecycleControl = e.target.closest('[data-life-action]');
  if (lifecycleControl) {
    const action = lifecycleControl.dataset.lifeAction;
    const id = lifecycleControl.dataset.lifeId;
    if (action === 'delete' && !lifecycleControl.dataset.confirmed) {showDeleteConfirmation(id);return;}
    try {
      progressStore.lifecycle(action, id);
      selectedTracking.delete(canonicalScholarshipId(id));
      if (els.dialog.open) els.dialog.close();
      toast(action === 'restore' ? 'Scholarship restored.' : action === 'archive' ? 'Archived. Retrieve it from Archive & History.' : 'Moved to Trash. Restore within 10 days.');
    } catch { toast('Action unavailable. The deadline or recovery window may have passed.'); }
    return;
  }
  if (e.target.closest('[data-export-visible-calendar]')) { exportVisibleCalendar(); return; }
  const goalSelect=e.target.closest('[data-goal-select]');
  if (goalSelect) { setGoalSelection(goalSelect.dataset.goalSelect); renderCurrentView(); return; }
  const goalFilter=e.target.closest('[data-goal-filter]');
  if (goalFilter) { setGoalFilter(goalFilter.dataset.goalFilter); renderCurrentView(); return; }
  const resetProfile = e.target.closest('[data-reset-profile]');
  if (resetProfile) {
    try {
      progressStore.change('profile', 'current', null);
      toast('Profile reset to baseline');
    } catch {
      toast('Profile could not be reset.');
    }
    return;
  }

  const status = e.target.closest('[data-application-status]');
  if (status) { try { progressStore.change('applications', status.dataset.applicationId, status.dataset.applicationStatus); }
    catch { toast('Sign in again before editing.'); } return; }
  const filter = e.target.closest('[data-filter]');
  if (filter) { state.filter = filter.dataset.filter; renderCurrentView(); return; }

  const gpt = e.target.closest('[data-open-gpt]');
  if (gpt) { openGptForScholarship(gpt.dataset.openGpt); return; }

  const open = e.target.closest('[data-open-scholarship]');
  if (open) { openScholarship(open.dataset.openScholarship); return; }

  const jump = e.target.closest('[data-jump-pipeline]');
  if (jump) {
    els.dialog.close();
    state.view = 'pipeline';
    renderCurrentView();
    const key = `sch-${jump.dataset.jumpPipeline}-0`;
    document.getElementById(key)?.scrollIntoView({behavior:'smooth', block:'center'});
  }
});

document.addEventListener('change', e => {
  const t=e.target;
  if(t.dataset.prefEnabled){if(!t.checked && Object.values(currentPrefs().enabled).filter(Boolean).length===1){t.checked=true;toast('Keep at least one priority enabled.');return;}progressStore.change('preferences','enabled-'+t.dataset.prefEnabled,t.checked);return;}
  if(t.dataset.prefWeight){progressStore.change('preferences','weight-'+t.dataset.prefWeight,t.checked?2:1);return;}
  if(t.matches('[data-pref-sort]')){progressStore.change('preferences','sortOrder',t.value);return;}

  const select = e.target.closest('[data-track-select]');
  if (select) {
    if (select.checked) selectedTracking.add(select.dataset.trackSelect);
    else selectedTracking.delete(select.dataset.trackSelect);
    renderCurrentView();
    return;
  }
  const tracker = e.target.closest('[data-track-status-id]');
  if (tracker) {
    try {
      progressStore.bulkTrack([tracker.dataset.trackStatusId], tracker.value === 'none' ? null : tracker.value);
      toast('Research tracking saved.');
    } catch { renderCurrentView(); toast('Could not save tracking status.'); }
    return;
  }
  const key = e.target.dataset.progressKey;
  if (!key) return;
  try { progressStore.change('progress', key, e.target.checked); } catch { renderCurrentView(); toast('Sign in again before editing.'); }
});

document.addEventListener('keydown', e => {
  if (document.querySelector('#appShell').hidden) return;
  if (e.isComposing || e.keyCode === 229) return;
  if (/^[1-8]$/.test(e.key) && !document.querySelector('dialog[open]') && !['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName) && !document.activeElement.isContentEditable) {
    const views = ['overview','scholarships','pipeline','documents','profile','settings','goal','library'];
    navigate(views[Number(e.key)-1]);
  }
  if (e.key === '/' && !document.querySelector('dialog[open]') && !['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName) && !document.activeElement.isContentEditable) {
    e.preventDefault();
    navigate('scholarships'); els.search.focus();
  }
});

function navigate(view) { saveNoteDrafts();state.view=view; const hash=view==='scholarships'?'#/scholarships':'#/'+view; if(location.hash!==hash)location.hash=hash;else renderCurrentView(); }
function saveNoteDrafts(){if(!progressStore)return;const drafts=[...document.querySelectorAll('[data-note-dirty]')].map(n=>({id:n.dataset.note,value:n.value,node:n}));if(!drafts.length)return;try{drafts.forEach(d=>delete d.node.dataset.noteDirty);progressStore.changeMany(drafts.map(d=>({bucket:'notes',key:d.id,value:d.value})));}catch{drafts.forEach(d=>d.node.dataset.noteDirty='true');toast('Notes are unsaved. Sign in again or export before leaving.');}}
function routeView(){saveNoteDrafts();const hash=location.hash;const route=parseHash(hash);if(route.name!=='country')lastFocusedRoute='';if(hash.startsWith('#/scholarships'))state.view='scholarships';else {const target=hash.replace(/^#\//,'').split('?')[0];if(viewTitles[target])state.view=target;}if(progressStore && !document.querySelector('#appShell').hidden)renderCurrentView();}
window.addEventListener('hashchange',routeView);
document.addEventListener('toggle',e=>{if(e.target.matches('[data-unrated]') && e.target.open!==Boolean(state.ui.unratedOpen))progressStore?.change('ui','unratedOpen',e.target.open);},true);
export function mountApp(store) { progressStore=store;lastState='';routeView();syncThemeToggle();countdowns.start(); }

export function updateWorkspace(event) {
  if (!event.state) return;
  state.progress = event.state.progress; state.applications = event.state.applications; state.tracking = event.state.tracking || {}; state.profile = event.state.profile;
  state.pins=event.state.pins || {}; state.preferences=event.state.preferences || {}; state.ui=event.state.ui || {}; state.notes=event.state.notes || {};
  state.lifecycle = event.state.lifecycle || {}; state.history = event.state.history || {}; state.clockOffset = event.clockOffset;
  const signature = JSON.stringify(event.state);
  if (signature !== lastState) { lastState = signature; renderCurrentView(); } else countdowns.tick();
}
export function hideWorkspace() { countdowns.stop(); lastState = ''; selectedTracking.clear(); state.progress = {}; state.applications = {}; state.tracking = {}; state.profile = null; state.lifecycle = {}; state.history = {}; state.pins={};state.preferences={};state.ui={};state.notes={};els.dialog.close(); els.dialogContent.replaceChildren(); document.querySelectorAll('.view').forEach(node => node.replaceChildren()); }

