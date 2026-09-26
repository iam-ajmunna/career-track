import { scholarships, profile, documents, timeline, snapshotDate } from './data.js';

const state = {
  view: 'overview',
  filter: 'all',
  query: '',
  progress: JSON.parse(localStorage.getItem('scholarship-progress') || '{}'),
  theme: localStorage.getItem('scholarship-theme') || 'light'
};

document.documentElement.dataset.theme = state.theme;

const els = {
  pageTitle: document.querySelector('#pageTitle'),
  nav: document.querySelector('#nav'),
  search: document.querySelector('#globalSearch'),
  searchClear: document.querySelector('#searchClear'),
  themeToggle: document.querySelector('#themeToggle'),
  resetProgress: document.querySelector('#resetProgress'),
  dialog: document.querySelector('#scholarshipDialog'),
  dialogContent: document.querySelector('#dialogContent'),
  dialogClose: document.querySelector('#dialogClose'),
  resetDialog: document.querySelector('#resetDialog'),
  resetCancel: document.querySelector('#resetCancel'),
  resetConfirm: document.querySelector('#resetConfirm'),
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

function saveProgress() {
  localStorage.setItem('scholarship-progress', JSON.stringify(state.progress));
}

function daysUntil(date) {
  const now = new Date(`${snapshotDate}T00:00:00`);
  const end = new Date(`${date}T00:00:00`);
  return Math.ceil((end - now) / 86400000);
}

function deadlineLabel(item) {
  if (item.status === 'blocked') return 'Not eligible this cycle';
  if (!item.deadline) return 'No deadline recorded';
  const days = daysUntil(item.deadline);
  return `${item.deadline} · ${days >= 0 ? `${days} days` : 'closed'}`;
}

function getScholarshipProgress(id) {
  const item = scholarships.find(s => s.id === id);
  if (!item) return 0;
  const completed = item.actions.filter((_, i) => state.progress[`sch-${id}-${i}`]).length;
  return Math.round((completed / item.actions.length) * 100);
}

function getOverallProgress() {
  const active = scholarships.filter(s => s.eligible && s.priority < 90);
  const totalActions = active.reduce((n, s) => n + s.actions.length, 0);
  const completed = active.reduce((n, s) => n + s.actions.filter((_, i) => state.progress[`sch-${s.id}-${i}`]).length, 0);
  return totalActions ? Math.round((completed / totalActions) * 100) : 0;
}

function badge([label, kind]) {
  return `<span class="pill ${kind}">${label}</span>`;
}

function scholarshipCard(item) {
  const status = statusMap[item.status] || ['Unknown', 'neutral'];
  const fit = fitMap[item.fit] || ['Fit unknown', 'neutral'];
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
        ${badge(fit)}
        <span class="tag">${item.route}</span>
        <span class="tag">Fit ${item.fitScore}/100</span>
      </div>
      <p>${item.whyFit}</p>
      <div class="progress-track" title="Application checklist progress"><div class="progress-fill" style="width:${progress}%"></div></div>
      <div class="card-bottom">
        <div class="deadline">${deadlineLabel(item)}</div>
        <button class="button secondary" data-open-scholarship="${item.id}">Open</button>
      </div>
    </article>`;
}

function renderOverview() {
  const active = scholarships.filter(s => s.eligible && s.status !== 'upcoming').length;
  const urgent = scholarships.filter(s => s.status === 'urgent' || (s.deadline && daysUntil(s.deadline) <= 25 && daysUntil(s.deadline) >= 0 && s.eligible)).length;
  const best = [...scholarships].filter(s => s.eligible).sort((a,b) => a.priority - b.priority).slice(0,5);
  const progress = getOverallProgress();

  document.querySelector('#view-overview').innerHTML = `
    <div class="banner">
      <div>
        <strong>Application command center</strong>
        <p>Data snapshot: 26 Sep 2026. This is a planning workspace, not a live scholarship feed. Always verify deadlines and funding terms on the official source before submission.</p>
      </div>
      <span class="pill info banner-badge">2027 Intake</span>
    </div>

    <div class="grid grid-4 section">
      <div class="card card-pad"><div class="metric-label">Priority targets</div><div class="metric-value">${best.length}</div><div class="metric-sub">Best allocation of application effort</div></div>
      <div class="card card-pad"><div class="metric-label">Open / actionable</div><div class="metric-value">${active}</div><div class="metric-sub">Includes open and immediately opening routes</div></div>
      <div class="card card-pad"><div class="metric-label">Urgent deadlines</div><div class="metric-value">${urgent}</div><div class="metric-sub">Within 25 days of snapshot</div></div>
      <div class="card card-pad"><div class="metric-label">Pipeline completion</div><div class="metric-value">${progress}%</div><div class="metric-sub">Saved locally in this browser</div></div>
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
    const haystack = `${s.name} ${s.country} ${s.provider} ${s.status} ${s.fit} ${s.route}`.toLowerCase();
    const matchesQuery = !query || haystack.includes(query);
    const matchesFilter = state.filter === 'all' ||
      (state.filter === 'open' && ['open','urgent','opens-soon'].includes(s.status)) ||
      (state.filter === 'priority' && s.priority <= 5) ||
      (state.filter === 'full' && !s.funding.toLowerCase().includes('possible')) ||
      (state.filter === 'blocked' && !s.eligible);
    return matchesQuery && matchesFilter;
  });
}

function renderScholarships() {
  const items = filteredScholarships();
  document.querySelector('#view-scholarships').innerHTML = `
    <div class="filters" role="group" aria-label="Scholarship filters">
      ${[['all','All'],['open','Open / opening'],['priority','Priority'],['full','Guaranteed / stated full'],['blocked','Ineligible']].map(([id,label]) => `<button type="button" class="filter-btn ${state.filter===id?'active':''}" data-filter="${id}" aria-pressed="${state.filter===id}">${label}</button>`).join('')}
    </div>
    <div class="scholarship-grid">${items.length ? items.map(scholarshipCard).join('') : '<div class="empty">No scholarships match the current search/filter.</div>'}</div>`;
}

function renderPipeline() {
  const ordered = [...scholarships].filter(s => s.eligible).sort((a,b) => a.priority - b.priority);
  document.querySelector('#view-pipeline').innerHTML = `
    <div class="banner"><div><strong>Use one master evidence bank, then tailor by scholarship archetype.</strong><p>Research-first: KAUST/Oxford/Cambridge/MBZUAI. Development-impact: Commonwealth/Weidenfeld. Leadership-heavy: Gates/Knight-Hennessy.</p></div><span class="pill neutral banner-badge">Local progress</span></div>
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
        </section>`;
      }).join('')}
    </div>`;
}

function renderDocuments() {
  const done = documents.filter(d => state.progress[`doc-${d.id}`]).length;
  const pct = Math.round(done / documents.length * 100);
  document.querySelector('#view-documents').innerHTML = `
    <div class="grid grid-3">
      <div class="card card-pad"><div class="metric-label">Documents ready</div><div class="metric-value">${done}/${documents.length}</div><div class="metric-sub">Master application packet</div></div>
      <div class="card card-pad"><div class="metric-label">Packet completion</div><div class="metric-value">${pct}%</div><div class="metric-sub">Stored in local browser progress</div></div>
      <div class="card card-pad"><div class="metric-label">Required docs</div><div class="metric-value">${documents.filter(d=>d.required).length}</div><div class="metric-sub">Core documents across most targets</div></div>
    </div>
    <section class="card card-pad section">
      <div class="section-head"><div><div class="section-title">Master document packet</div><div class="section-sub">Prepare once; tailor the narrative layers per scholarship.</div></div></div>
      <div class="checklist">
        ${documents.map(d => {
          const key = `doc-${d.id}`;
          return `<div class="check-row"><input id="${key}" type="checkbox" data-progress-key="${key}" ${state.progress[key]?'checked':''}><label for="${key}">${d.label}</label><span class="meta">${d.required?'Required':'Optional'}</span></div>`;
        }).join('')}
      </div>
    </section>`;
}

function renderProfile() {
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

function renderCurrentView() {
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
}

function openScholarship(id) {
  const s = scholarships.find(x => x.id === id);
  if (!s) return;
  const status = statusMap[s.status] || ['Unknown','neutral'];
  const fit = fitMap[s.fit] || ['Fit unknown','neutral'];
  els.dialogContent.innerHTML = `
    <div class="dialog-body">
      <div class="tag-row">${badge(status)} ${badge(fit)}</div>
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
      <h3>Execution checklist</h3>
      <ul>${s.actions.map(a=>`<li>${a}</li>`).join('')}</ul>
      <div class="dialog-actions">
        ${s.source ? `<a class="button" href="${s.source}" target="_blank" rel="noopener noreferrer">Official source ↗</a>` : ''}
        ${s.secondarySource ? `<a class="button secondary" href="${s.secondarySource}" target="_blank" rel="noopener noreferrer">Secondary official source ↗</a>` : ''}
        <button class="button ghost" data-jump-pipeline="${s.id}">Open pipeline</button>
      </div>
    </div>`;
  els.dialog.showModal();
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
  localStorage.setItem('scholarship-theme', state.theme);
  syncThemeToggle();
});

els.dialogClose.addEventListener('click', () => els.dialog.close());
els.dialog.addEventListener('click', e => { if (e.target === els.dialog) els.dialog.close(); });

els.resetProgress.addEventListener('click', () => {
  els.resetDialog.showModal();
  els.resetCancel.focus();
});

els.resetCancel.addEventListener('click', () => els.resetDialog.close());
els.resetConfirm.addEventListener('click', () => {
  state.progress = {};
  saveProgress();
  els.resetDialog.close();
  renderCurrentView();
  toast('Progress reset');
});
els.resetDialog.addEventListener('click', e => { if (e.target === els.resetDialog) els.resetDialog.close(); });

document.addEventListener('click', e => {
  const filter = e.target.closest('[data-filter]');
  if (filter) { state.filter = filter.dataset.filter; renderCurrentView(); return; }

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
  state.progress[key] = e.target.checked;
  saveProgress();
  renderCurrentView();
});

document.addEventListener('keydown', e => {
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

syncThemeToggle();
renderCurrentView();
