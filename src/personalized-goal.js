import { goalSnapshot,goalCoreDocuments,goalCampaign,goalPathways,goalProgrammes } from './personalized-goal-data.js';
import { escapeHtml } from './sync/model.js';
import { isScholarshipVisible, canonicalScholarshipId, trackingStatus } from './v3/legacy-identifiers.js';
let goalSelected='ipcvai';
let goalActiveFilter='Open now';
let goalActiveQuery='';
function goalDate(value) {
  if (!value) return 'Not yet published';
  return new Intl.DateTimeFormat('en-GB', {day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(value+'T00:00:00Z'));
}
function goalStage(item, today) {
  if (!item.ends) return 'Watch for call';
  if (today > item.ends) return 'Closed';
  if (item.starts && today < item.starts) return 'Opens soon';
  if (!item.starts) return item.applicationOpenConfirmed ? 'Open' : 'Deadline set';
  return 'Open';
}
function goalProgress(progress, prefix, items) {
  return items.filter((_, i)=>progress[`${prefix}-${i}`]===true).length;
}
function goalSafeLink(url, label) {
  const parsed = new URL(url);
  if (parsed.protocol!=='https:' && parsed.protocol!=='http:') return '';
  return `<a class="goal-source" href="${escapeHtml(parsed.href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)} ↗</a>`;
}
function goalCheckList(items, prefix, progress, css='') {
  return `<div class="goal-checks ${css}">${items.map((label,i)=>{const key=`${prefix}-${i}`;return `<label class="goal-check"><input type="checkbox" data-progress-key="${key}" ${progress[key]?'checked':''}><span>${escapeHtml(label)}</span></label>`}).join('')}</div>`;
}
export function setGoalSelection(id) {
  if (goalProgrammes.some(p=>p.id===id)) goalSelected=id;
}
export function setGoalFilter(next) {
  if (['Open now','All','Erasmus Mundus','Other fully funded','Conditional / watch'].includes(next)) goalActiveFilter=next;
}
export function setGoalQuery(next) { goalActiveQuery=String(next).slice(0,120); }
export function getGoalQuery() {return goalActiveQuery;}
export function goalVerifyCatalog() {
  if (new Set(goalProgrammes.map(p=>p.id)).size!==goalProgrammes.length) throw Error('Duplicate goal programme id.');
  for (const p of goalProgrammes) {
    if (!/^[a-z0-9-]+$/.test(p.id)) throw Error(`Invalid id: ${p.id}`);
    if (p.starts && p.ends && p.starts>p.ends) throw Error(`Invalid dates: ${p.id}`);
    if (!p.sources.length || p.sources.some(([,url])=>!url.startsWith('https://'))) throw Error(`Missing official links: ${p.id}`);
    if (!goalPathways[p.careerKey]) throw Error(`Unknown career key: ${p.id}`);
    if (p.category==='Conditional / watch' && /^Full if awarded$/.test(p.funding)) throw Error(`Unqualified funding: ${p.id}`);
  }
  return true;
}
export function renderPersonalizedGoal(progress={}, lifecycle={}, tracking={}, selectedTracking=new Set()) {
  const e=escapeHtml;
  const today=new Date(Date.now()+6*60*60*1000).toISOString().slice(0,10); // Dhaka is UTC+06 without DST.
  const active=goalProgrammes.filter(p=>isScholarshipVisible(lifecycle,p.id));
  const matches=p=> (goalActiveFilter==='All'||(goalActiveFilter==='Open now' ? goalStage(p,today)==='Open' : p.category===goalActiveFilter)) &&
    `${p.name} ${p.full} ${p.institution} ${p.location} ${p.goal} ${p.category}`.toLowerCase().includes(goalActiveQuery.toLowerCase().trim());
  const visible=active.filter(matches);
  const current=visible.find(p=>p.id===goalSelected)||visible[0];
  const globalTotal=goalCoreDocuments.length+goalCampaign.length;
  const globalDone=goalProgress(progress,'goal-core',goalCoreDocuments)+goalProgress(progress,'goal-campaign',goalCampaign);
  const pct=Math.round(globalDone*100/globalTotal);
  const funded=active.filter(p=>p.category!=='Conditional / watch').length;
  const confirmation=active.filter(p=>p.category==='Erasmus Mundus'&&p.starts&&p.ends).length;
  const stage=p=>goalStage(p,today);
  const statusCls=p=>stage(p)==='Open'?'success':stage(p)==='Closed'?'neutral':stage(p)==='Watch for call'?'info':'warn';
  const dateInfo=current?`<div class="goal-fact-grid">
    <div class="goal-fact"><span>Application opens</span><strong>${e(goalDate(current.starts))}</strong></div>
    <div class="goal-fact"><span>Application closes</span><strong>${e(goalDate(current.ends))}</strong></div>
    <div class="goal-fact"><span>Funding status</span><strong>${e(current.funding)}</strong></div>
    <div class="goal-fact"><span>Cycle confidence</span><strong>${e(current.dateQuality)}</strong></div>
  </div>`:'';
  const details=current?(()=>{
    const career=goalPathways[current.careerKey];
    const steps=current.docs||[];
    const ready=goalProgress(progress,`goal-${current.id}`,steps);
    return `<article class="card goal-detail">
      <div class="goal-detail-header"><div><span class="goal-eyebrow">${e(current.category)} · 2027 intake</span><h2>${e(current.name)}</h2><p>${e(current.full)}</p></div><span class="pill ${statusCls(current)}">${e(stage(current))}</span></div>
      <div class="goal-university"><strong>University / consortium</strong><span>${e(current.institution)}</span><strong>Study location</strong><span>${e(current.location)}</span></div>
      ${dateInfo}
      <section class="goal-section goal-tracking"><h3>Research / completion status</h3>
        <label class="field"><span>Scholarship work</span><select data-track-status-id="${e(canonicalScholarshipId(current.id))}" aria-label="Research tracking status of ${e(current.name)}">
          <option value="none" ${trackingStatus(tracking,current.id)==='none'?'selected':''}>Not tracked</option>
          <option value="researching" ${trackingStatus(tracking,current.id)==='researching'?'selected':''}>Researching</option>
          <option value="completed" ${trackingStatus(tracking,current.id)==='completed'?'selected':''}>Completed</option>
        </select></label><p class="goal-fine">Manually tracked scholarship work. Completed does not mean an application was submitted.</p></section>
      <div class="goal-detail-actions">
        <button type="button" class="button secondary" data-life-action="archive" data-life-id="${e(current.id)}">Archive</button>
        <button type="button" class="button danger-outline" data-life-action="delete" data-life-id="${e(current.id)}">Delete</button>
      </div>
      ${current.eligibilityAudit ? `<section class="goal-section goal-audit" aria-label="Personal eligibility audit">
        <div class="goal-section-heading"><div><h3>Verified eligibility audit</h3><span class="goal-minor">Checked ${e(current.eligibilityAudit.checkedOn)} · Based on current published admission criteria and your documented academic profile</span></div><span class="goal-status info">Personal eligibility</span></div>
        <p class="goal-audit-verdict">${e(current.eligibilityAudit.verdict)}</p>
        <div class="goal-audit-grid">${current.eligibilityAudit.items.map(item=>`<div class="goal-audit-item"><strong>${e(item.name)}</strong><span>${e(item.assessment)}</span><p>${e(item.evidence)}</p></div>`).join('')}</div>
        <p class="goal-fine"><strong>Remaining verification:</strong> ${e(current.eligibilityAudit.blocker)}</p>
        <p class="goal-fine"><strong>Next administrative action:</strong> ${e(current.eligibilityAudit.nextAction)}</p>
      </section>` : ''}
      <section class="goal-section"><h3>Full coverage — what the offer actually pays</h3><p>${e(current.cover)}</p><p class="goal-fine">Full funding means only when the named competitive scholarship/fellowship is awarded. Admission alone must never be treated as a full-funding offer.</p></section>
      <section class="goal-section"><h3>Why this connects to your frontier-AI career</h3><p>${e(current.goal)}</p></section>
      <section class="goal-section"><h3>Can you find a job after the MSc?</h3><span class="goal-minor">${e(career.label)}</span><p>${e(career.work)}</p><p>${e(current.careerExtra)}</p><h3>Can it lead to permanent residence?</h3><p>${e(career.pr)}</p><p class="goal-fine">Immigration is nationality-, degree- and residence-specific; no scholarship provides an automatic job offer, post-study work permission or PR. Verify rules again near graduation in 2028–29.</p></section>
      <section class="goal-section">
        <div class="goal-section-heading"><div><h3>Programme-specific documents</h3><span class="goal-minor">In addition to the shared dossier below</span></div><span class="goal-counter">${ready}/${steps.length} prepared</span></div>
        ${goalCheckList(steps,`goal-${current.id}`,progress)}
      </section>
      <section class="goal-section"><h3>What would improve this application?</h3><ol class="goal-levers">${current.levers.map(x=>`<li>${e(x)}</li>`).join('')}</ol></section>
      <section class="goal-section"><h3>Official evidence and immigration links</h3><div class="goal-sources">${[...current.sources,...career.sources].map(([label,url])=>goalSafeLink(url,label)).join('')}</div><p class="goal-fine">Scholarship facts consolidated ${goalSnapshot}. Exact hour is intentionally omitted where not independently confirmed.</p></section>
    </article>`;
  })():'<div class="card goal-empty">No records match the current filter. Clear the search or choose another category.</div>';
  const list=visible.map(p=>`
    <div class="goal-programme-row">
      <label class="goal-programme-select" title="Select scholarship for bulk tracking">
        <input type="checkbox" data-track-select="${e(canonicalScholarshipId(p.id))}" aria-label="Select ${e(p.name)}" ${selectedTracking.has(canonicalScholarshipId(p.id))?'checked':''}>
      </label>
      <button type="button" class="goal-programme ${current?.id===p.id?'selected':''}" data-goal-select="${e(p.id)}" aria-pressed="${current?.id===p.id}">
        <span class="goal-programme-top"><strong>${e(p.name)}</strong><span class="goal-status ${statusCls(p)}">${e(stage(p))}</span></span>
        <span class="goal-programme-title">${e(p.full)}</span>
        <span class="goal-programme-location">${e(p.institution)}</span>
        <span class="goal-programme-footer"><span>${e(p.category)}</span><span>${p.ends?e(goalDate(p.ends)):'Date pending'}</span></span>
        ${trackingStatus(tracking,p.id)!=='none'?`<span class="goal-tracking-label">${trackingStatus(tracking,p.id)==='researching'?'Researching':'Completed'}</span>`:''}
      </button>
    </div>`).join('');
  return `<div class="goal-workspace">
    <section class="goal-hero card">
      <div><span class="goal-eyebrow">PERSONALIZED GOAL · 2027–2029</span><h2>Build frontier-AI capability.<br>Make the work discoverable.</h2><p>Scholarships are the funding mechanism. The career objective is multimodal foundation-model research, efficient generative AI systems, publishable results and industry-grade engineering that attracts research teams.</p><span class="goal-evidence">Evidence snapshot: ${goalSnapshot} · Bangladeshi applicant · IELTS Academic plan</span></div>
      <div class="goal-hero-side"><span>Scholarship campaign</span><strong>${funded} research / funding routes</strong><small>+ ${active.length-funded} conditional funding or watch records</small><a href="#goal-campaign" class="button secondary">Open preparation plan ↓</a></div>
    </section>
    <section class="goal-metrics">
      <div class="card"><span>EMJM calls with dates</span><strong>${confirmation}</strong><small>Verify each source before final submission</small></div>
      <div class="card"><span>Full EMJM allowance</span><strong>€1,400/mo</strong><small>When awarded · up to 24 months</small></div>
      <div class="card"><span>Preparation readiness</span><strong>${pct}%</strong><small>${globalDone} of ${globalTotal} shared actions complete</small></div>
    </section>
    <section class="goal-principles card"><div><strong>Research</strong><span>Multimodal foundation models, efficient inference, grounded reasoning.</span></div><div><strong>Evidence</strong><span>Reproducible experiments, original thesis work, honest publication status.</span></div><div><strong>Career</strong><span>Internships, open-source, faculty networks, and legal work transition planning.</span></div></section>
    <section class="card tracking-toolbar" aria-label="Bulk Personalized Goal tracking">
      <div class="tracking-toolbar-copy"><strong>Research & completion tracker</strong>
        <span>${Object.values(tracking).filter(x=>x==='researching').length} researching · ${Object.values(tracking).filter(x=>x==='completed').length} completed</span>
        <small>Select one or more programmes, then update status. Completed is not the same as submitted.</small></div>
      <div class="tracking-toolbar-actions"><span class="track-selected-count">${selectedTracking.size} selected</span>
        <button type="button" class="button secondary" data-track-select-visible ${visible.length?'':'disabled'}>Select shown</button>
        <button type="button" class="button secondary" data-track-bulk="researching" ${selectedTracking.size?'':'disabled'}>Researching</button>
        <button type="button" class="button secondary" data-track-bulk="completed" ${selectedTracking.size?'':'disabled'}>Mark completed</button>
        <button type="button" class="button ghost" data-track-bulk="none" ${selectedTracking.size?'':'disabled'}>Clear status</button>
        <button type="button" class="button ghost" data-track-clear-selection ${selectedTracking.size?'':'disabled'}>Deselect</button></div>
    </section>
    <section class="goal-directory" aria-label="Scholarship explorer">
      <div class="goal-directory-header"><div><h2>Scholarship intelligence</h2><p>Select a programme to inspect funding, deadlines, mobility, career/PR rules and requirements.</p></div><label class="goal-search"><span class="sr-only">Search Personalized Goal programmes</span><input id="goalSearch" type="search" placeholder="Search programme, country, topic…" value="${e(goalActiveQuery)}" autocomplete="off"></label></div>
      <div class="goal-filters" role="group" aria-label="Filter scholarships">
      ${['Open now','All','Erasmus Mundus','Other fully funded','Conditional / watch'].map(name=>`<button class="goal-filter ${goalActiveFilter===name?'active':''}" type="button" data-goal-filter="${e(name)}" aria-pressed="${goalActiveFilter===name}">${e(name)}</button>`).join('')}
      </div>
      <div class="goal-two-col"><div class="goal-programmes" aria-label="Available programmes"><div class="goal-programmes-caption">${visible.length} programme${visible.length===1?'':'s'} · Select to expand</div>${list||'<p class="goal-fine">No results.</p>'}</div>${details}</div>
    </section>
    <section id="goal-campaign" class="goal-prep-grid">
      <div class="card card-pad">
        <div class="goal-section-heading"><div><h2>Master document bank</h2><p>Shared, transferable evidence; individual programmes have extra requirements.</p></div><span class="goal-counter">${goalProgress(progress,'goal-core',goalCoreDocuments)}/${goalCoreDocuments.length}</span></div>
        ${goalCheckList(goalCoreDocuments,'goal-core',progress)}
      </div>
      <div class="card card-pad">
        <div class="goal-section-heading"><div><h2>Execution campaign</h2><p>Build scholarship readiness and frontier-AI research credibility in parallel.</p></div><span class="goal-counter">${goalProgress(progress,'goal-campaign',goalCampaign)}/${goalCampaign.length}</span></div>
        ${goalCheckList(goalCampaign,'goal-campaign',progress)}
      </div>
    </section>
    <p class="goal-footer">Progress checks are saved locally in this browser using independent additive keys. Scholarship and immigration rules can change; only linked institutional/government notices are authoritative. No admission, employment or PR outcome is guaranteed.</p>
  </div>`;
}

