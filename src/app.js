import { scholarships, documents, englishPlan, referees, refereeStages, timeline, snapshotDate, countryOutlooks, screenedOut } from './data.js';
import { escapeHtml } from './sync/model.js';
import { createCountdowns, verifiedDeadlines, dateOnlyDeadlines } from './countdowns.js';
import { buildScholarshipMasterPrompt, buildChatGptUrl } from './gpt-prompt.js';
let progressStore;
let lastState = '';

const state = {
  view: 'overview',
  filter: 'focus',
  query: '',
  progress: {}, applications: {}, profile: null, clockOffset: 0,
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
  profile: 'Profile Fit'
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
  ineligible: ['Ineligible', 'danger']
};

const decisionMap = {
  apply: ['Apply', 'success'],
  watch: ['Watch', 'info'],
  closed: ['Closed', 'neutral']
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
  const active = scholarships.filter(s => s.eligible && decisionOf(s) === 'apply');
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
        <span class="tag">Fit ${item.fitScore}/100</span>
      </div>
      <p>${item.whyFit}</p>
      <div class="progress-track" title="Application checklist progress"><div class="progress-fill" style="width:${progress}%"></div></div>
      <div class="card-bottom">
        <div class="deadline">${deadlineLabel(item)}</div>
        <div class="card-actions">
          <button class="button secondary" data-open-scholarship="${item.id}">Open</button>
          <button class="button secondary" data-open-gpt="${item.id}" title="Open a new ChatGPT chat with a scholarship-specific research prompt">Open GPT ↗</button>
        </div>
      </div>
    </article>`;
}

function renderOverview() {
  const active = scholarships.filter(s => s.eligible && decisionOf(s) === 'apply' && !['closed','blocked'].includes(effectiveStatus(s))).length;
  const urgent = scholarships.filter(s => s.eligible && decisionOf(s) === 'apply' && effectiveStatus(s) === 'urgent').length;
  const best = [...scholarships]
    .filter(s => s.eligible && decisionOf(s) === 'apply' && !['blocked','closed'].includes(effectiveStatus(s)))
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
      <div class="card card-pad"><div class="metric-label">Pipeline completion</div><div class="metric-value">${progress}%</div><div class="metric-sub">Synced to your private workspace</div></div>
    </div>

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
          ${timeline.slice(0,5).map(t => `<div class="timeline-item"><div class="timeline-date">${t.date}</div><div class="timeline-content"><h3>${t.title}</h3><p>${t.detail}</p></div></div>`).join('')}
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

function filteredScholarships() {
  return scholarships.filter(s => {
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
  const screened = screenedOut.filter(item => !screenedQuery || `${item.name} ${item.country} ${item.reason}`.toLowerCase().includes(screenedQuery));
  document.querySelector('#view-scholarships').innerHTML = `
    <div class="filters" role="group" aria-label="Scholarship decision filters">
      ${[['focus','Apply + Watch'],['apply','Apply'],['watch','Watch'],['closed','Closed']].map(([id,label]) => `<button type="button" class="filter-btn ${state.filter===id?'active':''}" data-filter="${id}" aria-pressed="${state.filter===id}">${label}</button>`).join('')}
    </div>
    <div class="scholarship-grid">${items.length ? items.map(scholarshipCard).join('') : '<div class="empty">No scholarships match the current search/filter.</div>'}</div>
    <details class="card card-pad section">
      <summary class="section-title">Screened out (${screenedOut.length})</summary>
      <p class="section-sub">Verified leads that do not currently deserve application time. Kept here so the same social-media claims are not researched repeatedly.</p>
      <div class="timeline" style="margin-top:14px">
        ${screened.length ? screened.map(item => `<div class="timeline-item"><div class="timeline-date">${escapeHtml(item.country)}</div><div class="timeline-content"><h3>${escapeHtml(item.name)}</h3><p>${escapeHtml(item.reason)} ${item.source ? `<a class="text-link" href="${item.source}" target="_blank" rel="noopener noreferrer">Official source ↗</a>` : ''}</p></div></div>`).join('') : '<div class="empty">No screened-out records match the current search.</div>'}
      </div>
    </details>`;
}

function renderPipeline() {
  const ordered = [...scholarships]
    .filter(s => s.eligible && decisionOf(s) === 'apply' && !['closed','blocked'].includes(effectiveStatus(s)))
    .sort((a,b) => a.priority - b.priority);
  document.querySelector('#view-pipeline').innerHTML = `
    <div class="banner"><div><strong>Use one master evidence bank, then tailor by scholarship archetype.</strong><p>Research-first: KAUST/Oxford/Cambridge/MBZUAI. Development-impact: Commonwealth/Weidenfeld. Leadership-heavy: Gates/Knight-Hennessy.</p></div><span class="pill neutral banner-badge">Cloud progress</span></div>
    <div class="section grid">
      ${ordered.map(s => {
        const progress = getScholarshipProgress(s.id);
        return `<section class="card card-pad">
          <div class="section-head">
            <div><div class="section-title">${s.name}</div><div class="section-sub">${s.country} · ${deadlineLabel(s)}</div></div>
            <span class="pill ${progress===100?'success':'neutral'}">${progress}% complete</span>
          </div>
          <div class="progress-track" style="margin-bottom:12px"><div class="progress-fill" style="width:${progress}%"></div></div>
          <div class="checklist">
            ${s.actions.map((action, i) => {
              const key = `sch-${s.id}-${i}`;
              return `<div class="check-row"><input id="${key}" type="checkbox" data-progress-key="${key}" ${state.progress[key]?'checked':''}><label for="${key}">${action}</label><span class="meta">Step ${i+1}</span></div>`;
            }).join('')}
          </div>
          <div class="application-controls"><span class="pill neutral">${state.applications[s.id] === 'submitted' ? 'Submitted' : 'Preparing'}</span><button class="button secondary" data-application-id="${s.id}" data-application-status="${state.applications[s.id] === 'submitted' ? 'preparing' : 'submitted'}">${state.applications[s.id] === 'submitted' ? 'Resume preparation' : 'Mark submitted'}</button></div>
        </section>`;
      }).join('')}
    </div>`;
}

function renderDocuments() {
  const done = documents.filter(d => state.progress[`doc-${d.id}`]).length;
  const required = documents.filter(d => d.required);
  const requiredDone = required.filter(d => state.progress[`doc-${d.id}`]).length;
  const pct = Math.round(done / documents.length * 100);
  const groups = [...new Set(documents.map(d => d.group))];

  const ieltsDone = englishPlan.steps.filter(step => state.progress[`ielts-${step.id}`]).length;
  const refereeChecks = referees.length * refereeStages.length;
  const refereeDone = referees.reduce((total, referee) => {
    return total + refereeStages.filter(stage => state.progress[`ref-${referee.id}-${stage.id}`]).length;
  }, 0);

  document.querySelector('#view-documents').innerHTML = `
    <div class="grid grid-4">
      <div class="card card-pad"><div class="metric-label">Dossier items ready</div><div class="metric-value">${done}/${documents.length}</div><div class="metric-sub">Master evidence packet</div></div>
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
              ${documents.filter(d => d.group === group).map(d => {
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
        <div class="section-head"><div><div class="section-title">English-test strategy</div><div class="section-sub">${englishPlan.rationale}</div></div></div>
        <div class="target-callout"><span>Portfolio target</span><strong>${englishPlan.target}</strong></div>
        <div class="requirement-grid">
          ${englishPlan.requirements.map(req => `<div class="requirement-card"><span>${req.programme}</span><strong>${req.score}</strong></div>`).join('')}
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

function renderProfile() {
  if (!state.profile) { document.querySelector('#view-profile').innerHTML = '<div class="empty">Your profile has not been configured yet.</div>'; return; }
  const profile = { ...state.profile, positioning: Object.fromEntries(['engineering','research','academics','developmentImpact','leadership'].map(key => [key, Math.max(0,Math.min(100,Number(state.profile.positioning?.[key]) || 0))])), highlights: Array.isArray(state.profile.highlights) ? state.profile.highlights.map(escapeHtml) : [] };
  for (const key of ['name','degree','university','cgpa']) profile[key] = escapeHtml(profile[key]);
  const avg = Math.round(Object.values(profile.positioning).reduce((a,b)=>a+b,0) / Object.values(profile.positioning).length);
  const dims = [
    ['Engineering depth', profile.positioning.engineering],
    ['Research readiness', profile.positioning.research],
    ['Academic strength', profile.positioning.academics],
    ['Development impact', profile.positioning.developmentImpact],
    ['Leadership evidence', profile.positioning.leadership]
  ];

  document.querySelector('#view-profile').innerHTML = `
    <section class="card card-pad profile-score">
      <div class="score-ring" style="--score:${avg}"><div class="score-inner"><div class="score-number">${avg}</div><div class="score-caption">portfolio readiness</div></div></div>
      <div>
        <div class="section-title">${profile.name}</div>
        <div class="section-sub">${profile.degree} · ${profile.university} · CGPA ${profile.cgpa}</div>
        <div class="tag-row" style="margin-top:12px">${profile.highlights.map(x=>`<span class="tag">${x}</span>`).join('')}</div>
        <p class="muted" style="font-size:13px;line-height:1.7">Your strongest positioning is for research- and engineering-intensive scholarships. Leadership-heavy schemes require more explicit evidence than the current CV exposes.</p>
      </div>
    </section>

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
          <div class="timeline-item"><div class="timeline-date">Track A</div><div class="timeline-content"><h3>Research / technical</h3><p>AI systems, computer vision, efficient inference, publications, production-scale engineering. Primary targets: KAUST, Oxford, Cambridge, MBZUAI.</p></div></div>
          <div class="timeline-item"><div class="timeline-date">Track B</div><div class="timeline-content"><h3>Development impact</h3><p>Use AI engineering to address measurable Bangladesh-relevant constraints in safety, healthcare, infrastructure or public-sector capability. Primary: Commonwealth, Weidenfeld.</p></div></div>
          <div class="timeline-item"><div class="timeline-date">Track C</div><div class="timeline-content"><h3>Leadership / civic impact</h3><p>Only use where you have authentic evidence of initiative, influence, mentorship and community outcomes. Primary: Gates, Knight-Hennessy.</p></div></div>
        </div>
      </section>
    </div>`;
}

const countdowns = createCountdowns({ state, readiness: getScholarshipProgress, onHeroChange: renderCurrentView });

function renderCurrentView() {
  const focusedKey = document.activeElement?.dataset?.progressKey;
  renderOverview();
  renderScholarships();
  renderPipeline();
  renderDocuments();
  renderProfile();
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
  els.searchClear.hidden = !state.query;
  countdowns.render();
  if (focusedKey) document.querySelector(`[data-progress-key="${CSS.escape(focusedKey)}"]`)?.focus({ preventScroll: true });
}

function openScholarship(id) {
  const s = scholarships.find(x => x.id === id);
  if (!s) return;
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
        <div class="info-box"><div class="info-label">Profile fit</div><div class="info-value">${s.fitScore}/100 · ${fit[0]}</div></div>
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
      </div>
    </div>`;
  els.dialog.showModal();
}

function openGptForScholarship(id) {
  const scholarship = scholarships.find(item => item.id === id);
  if (!scholarship) return;
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

document.addEventListener('click', e => {
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
  if (/^[1-5]$/.test(e.key) && !document.querySelector('dialog[open]') && !['INPUT','TEXTAREA'].includes(document.activeElement.tagName)) {
    const views = ['overview','scholarships','pipeline','documents','profile'];
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
  state.progress = event.state.progress; state.applications = event.state.applications; state.profile = event.state.profile; state.clockOffset = event.clockOffset;
  const signature = JSON.stringify(event.state);
  if (signature !== lastState) { lastState = signature; renderCurrentView(); } else countdowns.tick();
}
export function hideWorkspace() { countdowns.stop(); lastState = ''; state.progress = {}; state.applications = {}; state.profile = null; els.dialog.close(); els.dialogContent.replaceChildren(); document.querySelectorAll('.view').forEach(node => node.replaceChildren()); }
