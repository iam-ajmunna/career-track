import { scholarships, documents, englishPlan, referees, refereeStages, timeline, snapshotDate, countryOutlooks, screenedOut } from './data.js';
import { escapeHtml } from './sync/model.js';
import { createCountdowns, verifiedDeadlines, dateOnlyDeadlines } from './countdowns.js';
import { buildScholarshipMasterPrompt, buildChatGptUrl } from './gpt-prompt.js';
import { renderPersonalizedGoal, setGoalFilter, setGoalSelection, setGoalQuery } from './personalized-goal.js';
import { isScholarshipVisible, archivedRecords, trashedRecords, expiredRecords, screenedSuggestions } from './scholarship-lifecycle.js';
let progressStore;
let lastState = '';

const state = {
  view: 'overview',
  filter: 'focus',
  query: '',
  progress: {}, applications: {}, profile: null, lifecycle: {}, history: {}, clockOffset: 0,
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
  library: 'Archive & History'
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
  const active = scholarships.filter(s => isScholarshipVisible(state.lifecycle, s.id) && s.eligible && decisionOf(s) === 'apply');
  const totalActions = active.reduce((n, s) => n + s.actions.length, 0);
  const completed = active.reduce((n, s) => n + s.actions.filter((_, i) => state.progress[`sch-${s.id}-${i}`]).length, 0);
  return totalActions ? Math.round((completed / totalActions) * 100) : 0;
}

function badge([label, kind]) {
  return `<span class="pill ${kind}">${label}</span>`;
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

function renderOverview() {
  const active = scholarships.filter(s => isScholarshipVisible(state.lifecycle, s.id) && s.eligible && decisionOf(s) === 'apply' && !['closed','blocked'].includes(effectiveStatus(s))).length;
  const urgent = scholarships.filter(s => isScholarshipVisible(state.lifecycle, s.id) && s.eligible && decisionOf(s) === 'apply' && effectiveStatus(s) === 'urgent').length;
  const best = [...scholarships]
    .filter(s => isScholarshipVisible(state.lifecycle, s.id) && s.eligible && decisionOf(s) === 'apply' && !['blocked','closed'].includes(effectiveStatus(s)))
    .sort((a,b) => a.priority - b.priority)
    .slice(0,5);
  const progress = getOverallProgress();

  document.querySelector('#view-overview').innerHTML = `<div id="deadlineHub"></div>
    <div class="banner">
      <div>
        <strong>Application command center</strong>
        <p>Scholarship evidence was last consolidated on ${snapshotDate}. Social-media leads are kept out until an official source is verified; Watch items never receive invented deadlines.</p>
      </div>
      <span class="pill info banner-badge">2027 Intake</span>
    </div>

    <div class="grid grid-4 section">
      <div class="card card-pad"><div class="metric-label">Priority targets</div><div class="metric-value">${best.length}</div><div class="metric-sub">Best allocation of application effort</div></div>
      <div class="card card-pad"><div class="metric-label">Open / actionable</div><div class="metric-value">${active}</div><div class="metric-sub">Includes open and immediately opening routes</div></div>
      <div class="card card-pad"><div class="metric-label">Urgent deadlines</div><div class="metric-value">${urgent}</div><div class="metric-sub">Within 25 days of snapshot</div></div>
      <div class="card card-pad"><div class="metric-label">Pipeline completion</div><div class="metric-value">${progress}%</div><div class="metric-sub">Saved locally in this browser</div></div>
    </div>

    <div class="save-assurance"><strong>Browser-local memory is active.</strong><span>Your checklist state persists on this device. Export progress before clearing browser data or switching machines.</span></div>

    <section class="section">
      <div class="section-head"><div><div class="section-title">Recommended execution order</div><div class="section-sub">Profile-fit ordering, not an official acceptance ranking.</div></div></div>
      <div class="priority-list">
        ${best.map((s, i) => `
          <button type="button" class="priority-item" data-open-scholarship="${s.id}">
            <span class="rank">0${i+1}</span>
            <span class="priority-copy"><span class="item-title">${s.name}</span><span class="item-meta">${s.country} · ${s.funding}</span></span>
            ${badge(fitMap[s.fit])}
          </button>`).join('')}
      </div>
    </section>

    <div class="grid grid-2 section">
      <section class="card card-pad">
        <div class="section-head"><div><div class="section-title">Next 30 days</div><div class="section-sub">Time-critical execution sequence.</div></div></div>
        <div class="timeline">
          ${timeline.filter(timelineItemVisible).slice(0,5).map(t => `<div class="timeline-item"><div class="timeline-date">${t.date}</div><div class="timeline-content"><h3>${t.title}</h3><p>${t.detail}</p></div></div>`).join('')}
        </div>
      </section>
      <section class="card card-pad">
        <div class="section-head"><div><div class="section-title">Profile leverage</div><div class="section-sub">Where your CV currently wins.</div></div></div>
        <div class="strength-list">
          <div class="strength"><span>Production AI engineering</span><span>High leverage</span></div>
          <div class="strength"><span>Research / publications</span><span>High leverage</span></div>
          <div class="strength"><span>Computer vision / edge AI specialization</span><span>High leverage</span></div>
          <div class="strength"><span>Academic standing</span><span>Competitive</span></div>
          <div class="strength"><span>Leadership / civic impact</span><span>Needs evidence</span></div>
          <div class="strength"><span>Development-impact narrative</span><span>Needs tailoring</span></div>
        </div>
      </section>
    </div>`;
}

// Timeline notes should never reintroduce a suppressed recommendation.
function timelineItemVisible(item) {
  const title = item.title.toLowerCase();
  const groups = [
    [['knight-hennessy'], ['khs']], [['commonwealth shared'], ['commonwealth-shared']],
    [['commonwealth'], ['commonwealth']], [['kaust'], ['kaust']], [['eth zurich'], ['eth-esop']],
    [['daad'], ['daad-master']], [['ediss'], ['ediss']], [['cambridge'], ['gates']],
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
    const matchesFilter = state.filter === 'focus' ? ['apply','watch'].includes(decision) : decision === state.filter;
    return matchesQuery && matchesFilter;
  });
}

function renderScholarships() {
  const items = filteredScholarships();
  const screenedQuery = state.query.trim().toLowerCase();
  const screened = screenedSuggestions.filter(item => isScholarshipVisible(state.lifecycle, item.id) && (!screenedQuery || `${item.name} ${item.country} ${item.reason}`.toLowerCase().includes(screenedQuery)));
  document.querySelector('#view-scholarships').innerHTML = `
    <div class="filters" role="group" aria-label="Scholarship decision filters">
      ${[['focus','Apply + Watch'],['apply','Apply'],['watch','Watch'],['closed','Closed']].map(([id,label]) => `<button type="button" class="filter-btn ${state.filter===id?'active':''}" data-filter="${id}" aria-pressed="${state.filter===id}">${label}</button>`).join('')}
    </div>
    <div class="scholarship-grid">${items.length ? items.map(scholarshipCard).join('') : '<div class="empty">No scholarships match the current search/filter.</div>'}</div>
    <details class="card card-pad section">
      <summary class="section-title">Screened out (${screened.length})</summary>
      <p class="section-sub">Verified leads that do not currently deserve application time. Kept here so the same social-media claims are not researched repeatedly.</p>
      <div class="timeline" style="margin-top:14px">
        ${screened.length ? screened.map(item => `<div class="timeline-item"><div class="timeline-date">${escapeHtml(item.country)}</div><div class="timeline-content"><h3>${escapeHtml(item.name)}</h3><p>${escapeHtml(item.reason)} ${item.source ? `<a class="text-link" href="${item.source}" target="_blank" rel="noopener noreferrer">Official source ↗</a>` : ''} <span class="card-actions"><button type="button" class="button ghost lifecycle-btn" data-life-action="archive" data-life-id="${item.id}">Archive</button><button type="button" class="button danger-outline lifecycle-btn" data-life-action="delete" data-life-id="${item.id}">Delete</button></span></p></div></div>`).join('') : '<div class="empty">No screened-out records match the current search.</div>'}
      </div>
    </details>`;
}

function renderPipeline() {
  const ordered = [...scholarships]
    .filter(s => isScholarshipVisible(state.lifecycle, s.id) && s.eligible && decisionOf(s) === 'apply' && !['closed','blocked'].includes(effectiveStatus(s)))
    .sort((a,b) => a.priority - b.priority);
  document.querySelector('#view-pipeline').innerHTML = `
    <div class="banner"><div><strong>Use one master evidence bank, then tailor by scholarship archetype.</strong><p>Tailor your evidence for research-focused, development-impact and leadership-heavy programmes using only the scholarships currently in your workspace.</p></div><span class="pill neutral banner-badge">Browser memory</span></div>
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
          ${englishPlan.requirements.filter(req => isScholarshipVisible(state.lifecycle, req.programme.startsWith('Cambridge') ? 'gates' : req.programme === 'KAUST' ? 'kaust' : 'ediss')).map(req => `<div class="requirement-card"><span>${req.programme}</span><strong>${req.score}</strong></div>`).join('')}
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
      <p>Archived recommendations can be restored. Deleted recommendations remain recoverable for 10 days and are permanently suppressed after that period. Expired scholarships leave only their name and deadline in History.</p>
      <p>Cleanup runs while this browser is open or on your next visit. Progress is stored on this browser; export before clearing its data.</p></div></div>
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
  const icalEscape = text => String(text).replace(/\\/g,'\\\\').replace(/\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;');
  const lines = ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Career Track//Personal Deadlines//EN', ...rows.flatMap(item => [
    'BEGIN:VEVENT', `UID:${icalEscape(item.id)}@career-track`,
    `DTSTAMP:${new Date().toISOString().split('.')[0].replace(/[-:]/g,'')}Z`,
    `DTSTART:${item.deadline_at.replace(/[-:]/g,'')}`,
    `SUMMARY:${icalEscape(item.title)}`, `URL:${item.source_url}`, 'END:VEVENT'
  ]), 'END:VCALENDAR'];
  const url = URL.createObjectURL(new Blob([lines.join('\r\n')+'\r\n'], { type: 'text/calendar' }));
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'career-track-active-deadlines.ics';
  document.body.append(anchor); anchor.click(); anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const countdowns = createCountdowns({ state, readiness: getScholarshipProgress,
  isVisible: id => isScholarshipVisible(state.lifecycle, id),
  onHeroChange: renderCurrentView, onTick: () => progressStore?.reap?.() });

function renderCurrentView() {
  const focusedKey = document.activeElement?.dataset?.progressKey;
  renderOverview();
  renderScholarships();
  renderPipeline();
  renderDocuments();
  renderProfile();
  renderLibrary();
  document.querySelector('#view-goal').innerHTML = renderPersonalizedGoal(state.progress, state.lifecycle);
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active-view'));
  document.querySelector(`#view-${state.view}`).classList.add('active-view');
  els.pageTitle.textContent = viewTitles[state.view];
  document.title = `${viewTitles[state.view]} · MSc Scholarship Command Center`;
  els.nav.querySelectorAll('.nav-item').forEach(b => {
    const active = b.dataset.view === state.view;
    b.classList.toggle('active', active);
    if (active) b.setAttribute('aria-current', 'page');
    else b.removeAttribute('aria-current');
  });
  els.search.value = state.query;
  els.search.closest('.search-wrap').hidden = ['goal','library'].includes(state.view);
  els.searchClear.hidden = !state.query;
  countdowns.render();
  if (focusedKey) document.querySelector(`[data-progress-key="${CSS.escape(focusedKey)}"]`)?.focus({ preventScroll: true });
}

function openScholarship(id) {
  const s = scholarships.find(x => x.id === id);
  if (!s || !isScholarshipVisible(state.lifecycle, id)) return;
  const status = statusMap[effectiveStatus(s)] || ['Unknown','neutral'];
  const fit = fitMap[s.fit] || ['Fit unknown','neutral'];
  const decision = decisionMap[decisionOf(s)] || ['Review','neutral'];
  const career = countryOutlooks[s.country];
  const verifiedOn = s.verifiedOn || snapshotDate;
  els.dialogContent.innerHTML = `
    <div class="dialog-body">
      <div class="tag-row">${badge(decision)} ${badge(status)} ${badge(fit)}</div>
      <h2 id="scholarshipDialogTitle" class="dialog-title">${s.name}</h2>
      <div class="muted">${s.country} · ${s.provider}</div>
      <div class="dialog-grid">
        <div class="info-box"><div class="info-label">Funding</div><div class="info-value">${s.funding}</div></div>
        <div class="info-box"><div class="info-label">Deadline</div><div class="info-value">${deadlineLabel(s)}</div></div>
        <div class="info-box"><div class="info-label">Profile fit</div><div class="info-value">${Number.isFinite(s.fitScore) ? `${s.fitScore}/100 · ` : ''}${fit[0]}</div></div>
        <div class="info-box"><div class="info-label">Primary risk</div><div class="info-value">${s.keyRisk}</div></div>
      </div>
      <h3>Why it fits your profile</h3>
      <p class="muted" style="line-height:1.7;font-size:13px">${s.whyFit}</p>
      <h3>Next action</h3>
      <p class="muted" style="line-height:1.7;font-size:13px">${s.nextAction || s.actions[0]}</p>
      ${career ? `<h3>Career outlook</h3>
        <div class="dialog-grid">
          <div class="info-box"><div class="info-label">During MSc</div><div class="info-value">${career.duringStudy}</div></div>
          <div class="info-box"><div class="info-label">After MSc</div><div class="info-value">${career.postStudy}</div></div>
          <div class="info-box"><div class="info-label">Long-term route</div><div class="info-value">${career.longTerm}</div></div>
          <div class="info-box"><div class="info-label">Immigration check</div><div class="info-value">Verified ${career.verifiedOn}. Planning context only — not a PR guarantee.</div></div>
        </div>` : ''}
      <h3>Execution checklist</h3>
      <ul>${s.actions.map(a=>`<li>${a}</li>`).join('')}</ul>
      <p class="deadline-evidence">✓ Scholarship source verified ${verifiedOn}.${career ? ` Career rules last checked ${career.verifiedOn}.` : ''}</p>
      <div class="dialog-actions">
        <button class="button" data-open-gpt="${s.id}">Open GPT ↗</button>
        ${s.source ? `<a class="button secondary" href="${s.source}" target="_blank" rel="noopener noreferrer">Official source ↗</a>` : ''}
        ${s.secondarySource ? `<a class="button secondary" href="${s.secondarySource}" target="_blank" rel="noopener noreferrer">Secondary official source ↗</a>` : ''}
        ${career?.source ? `<a class="button secondary" href="${career.source}" target="_blank" rel="noopener noreferrer">Career rules ↗</a>` : ''}
        <button class="button ghost" data-jump-pipeline="${s.id}">Open pipeline</button>
        <button class="button ghost" data-life-action="archive" data-life-id="${s.id}">Archive</button>
        <button class="button danger-outline" data-life-action="delete" data-life-id="${s.id}">Delete</button>
      </div>
    </div>`;
  els.dialog.showModal();
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
  state.view = btn.dataset.view;
  renderCurrentView();
});

els.search.addEventListener('input', e => {
  state.query = e.target.value;
  if (state.view !== 'scholarships' && state.query) state.view = 'scholarships';
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
    toast('Profile saved in this browser');
  } catch {
    toast('Profile could not be saved. Export progress and retry.');
  }
});

document.addEventListener('input', e => {
  if (e.target.id === 'goalSearch') {
    const pos=e.target.selectionStart;
    setGoalQuery(e.target.value);
    document.querySelector('#view-goal').innerHTML=renderPersonalizedGoal(state.progress, state.lifecycle);
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
  const lifecycleControl = e.target.closest('[data-life-action]');
  if (lifecycleControl) {
    const action = lifecycleControl.dataset.lifeAction;
    const id = lifecycleControl.dataset.lifeId;
    if (action === 'delete' && !window.confirm('Move this scholarship to Trash? It will disappear from all sections immediately and be permanently deleted after 10 days unless restored.')) return;
    try {
      progressStore.lifecycle(action, id);
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
  const key = e.target.dataset.progressKey;
  if (!key) return;
  try { progressStore.change('progress', key, e.target.checked); } catch { renderCurrentView(); toast('Sign in again before editing.'); }
});

document.addEventListener('keydown', e => {
  if (document.querySelector('#appShell').hidden) return;
  if (e.isComposing || e.keyCode === 229) return;
  if (/^[1-7]$/.test(e.key) && !document.querySelector('dialog[open]') && !['INPUT','TEXTAREA'].includes(document.activeElement.tagName)) {
    const views = ['overview','scholarships','pipeline','documents','profile','goal','library'];
    state.view = views[Number(e.key)-1];
    renderCurrentView();
  }
  if (e.key === '/' && !document.querySelector('dialog[open]') && document.activeElement !== els.search) {
    e.preventDefault();
    els.search.focus();
  }
});

export function mountApp(store) { progressStore = store; lastState = ''; syncThemeToggle(); countdowns.start(); }
export function updateWorkspace(event) {
  if (!event.state) return;
  state.progress = event.state.progress; state.applications = event.state.applications; state.profile = event.state.profile;
  state.lifecycle = event.state.lifecycle || {}; state.history = event.state.history || {}; state.clockOffset = event.clockOffset;
  const signature = JSON.stringify(event.state);
  if (signature !== lastState) { lastState = signature; renderCurrentView(); } else countdowns.tick();
}
export function hideWorkspace() { countdowns.stop(); lastState = ''; state.progress = {}; state.applications = {}; state.profile = null; state.lifecycle = {}; state.history = {}; els.dialog.close(); els.dialogContent.replaceChildren(); document.querySelectorAll('.view').forEach(node => node.replaceChildren()); }
