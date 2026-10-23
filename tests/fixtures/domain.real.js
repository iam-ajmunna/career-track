// VERBATIM copy of the functions used from iam-ajmunna/career-track@8eec65b src/v3/domain.js (read via GitHub on 20 Oct 2026),
// so the adapter can be tested in a sandbox without the repo. In the repo, import "../src/v3/domain.js" instead.
const validDate = s => typeof s === 'string' && /^\d{4}-\d\d-\d\d$/.test(s) && !Number.isNaN(Date.parse(s)); // stand-in for schema.js validDate
export const DAY = 86400000;
export const appKey = (id, intake = 2027) => id + ":" + intake;
export function calendarDate(now, zone = "Asia/Dhaka") {
  return new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(now));
}
export function daysTo(deadline, now = Date.now()) {
  if (deadline.precision === "exact") return (Date.parse(deadline.at) - now) / DAY;
  if (deadline.precision !== "date-only" || !validDate(deadline.date)) return null;
  return (Date.parse(deadline.date) - Date.parse(calendarDate(now, deadline.timezone || "Asia/Dhaka"))) / DAY;
}
export function deadlinePassed(deadline, now = Date.now()) {
  const days = daysTo(deadline, now);
  return days !== null && (deadline.precision === "exact" ? days <= 0 : days < 0);
}
export function evaluateWindow(opportunity, deadlines, now = Date.now(), intake = 2027) {
  const w = opportunity.windows.find((row) => row.intake === intake);
  if (!w) return { status: "verification-required", urgent: false, reason: "No verified window for this intake." };
  if (w.status === "suspended") return { status: "suspended", urgent: false, reason: w.note };
  const closing = deadlines.filter((d) => d.opportunityId === opportunity.id && d.intake === intake && d.controlsWindow);
  const deadline = closing.filter((d) => daysTo(d, now) !== null).sort((a, b) => daysTo(a, now) - daysTo(b, now))[0];
  if (w.verification !== "verified") return { status: "verification-required", urgent: false, deadline, reason: w.note || "Current cycle not officially confirmed." };
  if (deadline && deadlinePassed(deadline, now)) return { status: "closed", urgent: false, deadline, reason: "Published application window has ended." };
  if (w.opens && calendarDate(now, w.timezone || "Asia/Dhaka") < w.opens) {
    const days = (Date.parse(w.opens) - Date.parse(calendarDate(now, w.timezone || "Asia/Dhaka"))) / DAY;
    return { status: days <= 45 ? "opening-soon" : "upcoming", urgent: false, deadline, reason: w.note };
  }
  if (w.status === "closed") return { status: "closed", urgent: false, deadline, reason: w.note };
  if (w.status === "upcoming") return { status: "upcoming", urgent: false, deadline, reason: w.note };
  const age = (now - Date.parse(w.checkedAt)) / DAY;
  if (w.status === "open" && age > 30) return { status: "verification-required", urgent: false, deadline, reason: "Open-call verification is over 30 days old; recheck before applying." };
  if (w.status === "open") return { status: "open", urgent: Boolean(deadline && daysTo(deadline, now) <= 14), deadline, reason: w.note };
  return { status: "deadline-unknown", urgent: false, deadline, reason: w.note || "Application opening is not officially confirmed." };
}
export function dependencyBlockers(opportunity, deadlines, application = {}, now = Date.now(), intake = 2027) {
  return deadlines.filter((d) => d.opportunityId === opportunity.id && d.intake === intake && d.required && d.blocksRoute && deadlinePassed(d, now) && !application.completedSteps?.[d.id]);
}
export function assessEligibility(opportunity, profile = {}) {
  const rules = opportunity.eligibility.map((rule) => ({ ...rule }));
  if (opportunity.internationalExcluded && profile.feeStatus === "international") rules.push({ label: "This MSc does not accept international applicants.", assessment: "ineligible", sourceIds: opportunity.sourceIds });
  if (opportunity.citizenships?.length && profile.citizenship && !opportunity.citizenships.includes(profile.citizenship)) rules.push({ label: "Citizenship is outside the published eligible list.", assessment: "ineligible", sourceIds: opportunity.sourceIds });
  if (!profile.citizenship) rules.push({ label: "Citizenship has not been set on this device.", assessment: "unknown", sourceIds: [] });
  if (!profile.cgpa) rules.push({ label: "Academic equivalence and final transcript need assessment.", assessment: "unknown", sourceIds: [] });
  const status = rules.some((r) => r.assessment === "ineligible") ? "ineligible" : rules.some((r) => r.assessment === "unknown") ? "requires-assessment" : rules.some((r) => r.assessment === "conditional") ? "conditional" : "confirmed";
  return { status, rules };
}
export function applicationFor(state, id, intake = 2027) {
  return state.v3?.applications?.[appKey(id, intake)] || { opportunityId: id, intake, stage: intake === 2027 && state.applications?.[id] === "submitted" ? "submitted" : "not-started", decision: "research", completedSteps: {} };
}
export function opportunityFacts(opportunity, registry, state, now = Date.now(), intake = 2027) {
  const application = applicationFor(state, opportunity.id, intake), window = evaluateWindow(opportunity, registry.deadlines, now, intake);
  const eligibility = assessEligibility(opportunity, state.v3?.profile || {}), blockers = dependencyBlockers(opportunity, registry.deadlines, application, now, intake);
  if (application.blockedReason) blockers.push({ id: "private-blocker", title: application.blockedReason, precision: "unknown" });
  const prerequisites = registry.deadlines.filter((d) => d.opportunityId === opportunity.id && d.intake === intake && d.required && d.blocksRoute && d.precision === "unknown" && !application.completedSteps?.[d.id]);
  const lifecycle = state.lifecycle?.[opportunity.id]?.status || "active";
  return { opportunity, application, window, eligibility, blockers, prerequisites, lifecycle,
    actionable: window.status === "open" && !blockers.length && !prerequisites.length && (!opportunity.internationalExcluded || state.v3?.profile?.feeStatus === "domestic") && eligibility.status !== "ineligible" && application.decision !== "not-pursuing" && !["archived", "trash", "purged", "expired"].includes(lifecycle) };
}
export function readiness(opportunity, application, privateState = {}) {
  const mandatory = opportunity.guide.steps.filter((s) => s.required === true);
  const done = mandatory.filter((s) => application.completedSteps?.[s.id] || (s.legacyKey && privateState.progress?.[s.legacyKey])).length;
  const unresolved = opportunity.guide.unconfirmed || [];
  return { done, total: mandatory.length, percent: mandatory.length ? Math.round((done / mandatory.length) * 100) : null, verifiedComplete: mandatory.length > 0 && done === mandatory.length && !unresolved.length, unresolved };
}
