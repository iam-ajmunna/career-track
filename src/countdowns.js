import catalog from '../deadlines.json' with { type: 'json' };
import { countdown, urgency, selectHero, formatZoned, DAY } from './domain/time.ts';
import { escapeHtml as html } from './sync/model.js';

export const verifiedDeadlines = catalog.deadlines;
export const dateOnlyDeadlines = catalog.date_only ?? [];
const labels = { normal: 'Upcoming', attention: 'Attention', high: 'High priority', urgent: 'Urgent',
  critical: 'Critical', final: 'Final hours', closed: 'Closed' };

export function createCountdowns({ state, readiness, isVisible = () => true, onHeroChange = () => {}, onTick = () => {} }) {
  let timer;
  let previousHero;
  let previousAnnouncement;
  const now = () => Date.now() + (state.clockOffset ?? 0);
  const activeDeadlines = () => verifiedDeadlines.filter(item => isVisible(item.scholarship_id));
  function render() {
    const root = document.querySelector('#deadlineHub');
    if (!root) return;
    const hero = selectHero(activeDeadlines(), state.applications, now(), readiness);
    previousHero = hero?.id;
    const remaining = hero ? Date.parse(hero.deadline_at) - now() : 0;
    root.innerHTML = hero ? `
      <section class="card countdown-panel urgency-${urgency(remaining)}" aria-labelledby="deadlineTitle">
        <div class="countdown-heading"><div><p class="eyebrow">Next verified deadline</p>
          <h2 id="deadlineTitle">${html(hero.title)}</h2></div><span class="pill warn" id="urgencyLabel">${labels[urgency(remaining)]}</span></div>
        <div class="countdown-body"><div><div class="countdown-value" id="heroCountdown" role="timer" aria-live="off"
          aria-label="Days, hours, minutes, seconds until the deadline">${countdown(hero.deadline_at, now())}</div>
          <p class="countdown-units">Days : hours : minutes : seconds</p></div>
          <div class="deadline-zones"><strong>${html(formatZoned(hero.deadline_at, 'Asia/Dhaka'))} · Dhaka</strong>
            <span>${html(formatZoned(hero.deadline_at, hero.deadline_tz))} · ${html(hero.deadline_tz)}</span>
            <span>${readiness(hero.scholarship_id)}% of checklist complete</span></div></div>
        <div class="countdown-actions"><button class="button" data-open-scholarship="${html(hero.scholarship_id)}">Open application</button>
          <button type="button" class="button secondary" data-export-visible-calendar>Calendar alarms</button>
          <a class="text-link" href="${html(hero.source_url)}" target="_blank" rel="noopener noreferrer">Official source</a></div>
      </section>` : `<section class="card card-pad"><h2 class="section-title">No active verified deadlines</h2><p class="muted">Review the scholarship list for upcoming calls.</p><button type="button" class="button secondary" data-export-visible-calendar>Export available deadlines</button></section>`;
    root.innerHTML += `<div class="compact-deadlines">${activeDeadlines().filter(item => item.id !== hero?.id &&
      !['submitted', 'skipped'].includes(state.applications[item.scholarship_id])).map(item => `
      <button class="card compact-deadline" data-open-scholarship="${html(item.scholarship_id)}"><span>${html(item.title)}</span>
        <strong data-deadline-at="${html(item.deadline_at)}">${countdown(item.deadline_at, now(), true)}</strong></button>`).join('')}</div>
      <p class="deadline-evidence">${activeDeadlines().length} visible deadlines verified on ${html(catalog.verified_on)}. Check each programme's separate nomination or admission requirements.</p>
      <span class="sr-only" id="deadlineAnnouncement" aria-live="polite"></span>`;
  }
  function tick() {
    onTick();
    const hero = selectHero(activeDeadlines(), state.applications, now(), readiness);
    if (previousHero !== hero?.id) { render(); onHeroChange(); }
    if (hero) {
      const remaining = Date.parse(hero.deadline_at) - now();
      const band = urgency(remaining);
      const timerNode = document.querySelector('#heroCountdown');
      if (timerNode) timerNode.textContent = countdown(hero.deadline_at, now());
      const badge = document.querySelector('#urgencyLabel');
      if (badge) badge.textContent = labels[band];
      const panel = document.querySelector('.countdown-panel');
      if (panel) panel.className = `card countdown-panel urgency-${band}`;
      const announcement = `${hero.id}:${band}:${remaining < DAY ? Math.floor(now() / 60000) : ''}`;
      if (announcement !== previousAnnouncement) {
        const live = document.querySelector('#deadlineAnnouncement');
        if (live) live.textContent = `${hero.title}: ${labels[band]}. ${countdown(hero.deadline_at, now(), true)} remaining.`;
        previousAnnouncement = announcement;
      }
    }
    document.querySelectorAll('[data-deadline-at]').forEach(node => { node.textContent = countdown(node.dataset.deadlineAt, now(), true); });
  }
  function visibility() { clearInterval(timer); tick(); if (!document.hidden) timer = setInterval(tick, 1000); }
  return { render, tick, start() { document.addEventListener('visibilitychange', visibility); visibility(); },
    stop() { clearInterval(timer); document.removeEventListener('visibilitychange', visibility); } };
}
