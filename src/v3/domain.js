import { validDate } from "./schema.js";
export const DAY = 86400000;
export const appKey = (id, intake = 2027) => id + ":" + intake;
export function calendarDate(now, zone = "Asia/Dhaka") {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(now));
}
export function daysTo(deadline, now = Date.now()) {
  if (deadline.precision === "exact")
    return (Date.parse(deadline.at) - now) / DAY;
  if (deadline.precision !== "date-only" || !validDate(deadline.date))
    return null;
  return (
    (Date.parse(deadline.date) -
      Date.parse(calendarDate(now, deadline.timezone || "Asia/Dhaka"))) /
    DAY
  );
}
export function deadlinePassed(deadline, now = Date.now()) {
  const days = daysTo(deadline, now);
  return (
    days !== null && (deadline.precision === "exact" ? days <= 0 : days < 0)
  );
}
export function evaluateWindow(
  opportunity,
  deadlines,
  now = Date.now(),
  intake = 2027,
) {
  const w = opportunity.windows.find((row) => row.intake === intake);
  if (!w)
    return {
      status: "verification-required",
      urgent: false,
      reason: "No verified window for this intake.",
    };
  if (w.status === "suspended")
    return { status: "suspended", urgent: false, reason: w.note };
  const closing = deadlines.filter(
    (d) =>
      d.opportunityId === opportunity.id &&
      d.intake === intake &&
      d.controlsWindow,
  );
  const deadline = closing
    .filter((d) => daysTo(d, now) !== null)
    .sort((a, b) => daysTo(a, now) - daysTo(b, now))[0];
  if (w.verification !== "verified")
    return {
      status: "verification-required",
      urgent: false,
      deadline,
      reason: w.note || "Current cycle not officially confirmed.",
    };
  if (deadline && deadlinePassed(deadline, now))
    return {
      status: "closed",
      urgent: false,
      deadline,
      reason: "Published application window has ended.",
    };
  if (w.opens && calendarDate(now, w.timezone || "Asia/Dhaka") < w.opens) {
    const days =
      (Date.parse(w.opens) -
        Date.parse(calendarDate(now, w.timezone || "Asia/Dhaka"))) /
      DAY;
    return {
      status: days <= 45 ? "opening-soon" : "upcoming",
      urgent: false,
      deadline,
      reason: w.note,
    };
  }
  if (w.status === "closed")
    return { status: "closed", urgent: false, deadline, reason: w.note };
  if (w.status === "upcoming")
    return { status: "upcoming", urgent: false, deadline, reason: w.note };
  const age = (now - Date.parse(w.checkedAt)) / DAY;
  if (w.status === "open" && age > 30)
    return {
      status: "verification-required",
      urgent: false,
      deadline,
      reason:
        "Open-call verification is over 30 days old; recheck before applying.",
    };
  if (w.status === "open")
    return {
      status: "open",
      urgent: Boolean(deadline && daysTo(deadline, now) <= 14),
      deadline,
      reason: w.note,
    };
  return {
    status: "deadline-unknown",
    urgent: false,
    deadline,
    reason: w.note || "Application opening is not officially confirmed.",
  };
}
export function dependencyBlockers(
  opportunity,
  deadlines,
  application = {},
  now = Date.now(),
  intake = 2027,
) {
  return deadlines.filter(
    (d) =>
      d.opportunityId === opportunity.id &&
      d.intake === intake &&
      d.required &&
      d.blocksRoute &&
      deadlinePassed(d, now) &&
      !application.completedSteps?.[d.id],
  );
}
export function assessEligibility(opportunity, profile = {}) {
  const rules = opportunity.eligibility.map((rule) => ({ ...rule }));
  if (
    opportunity.internationalExcluded &&
    profile.feeStatus === "international"
  )
    rules.push({
      label: "This MSc does not accept international applicants.",
      assessment: "ineligible",
      sourceIds: opportunity.sourceIds,
    });
  if (
    opportunity.citizenships?.length &&
    profile.citizenship &&
    !opportunity.citizenships.includes(profile.citizenship)
  )
    rules.push({
      label: "Citizenship is outside the published eligible list.",
      assessment: "ineligible",
      sourceIds: opportunity.sourceIds,
    });
  if (!profile.citizenship)
    rules.push({
      label: "Citizenship has not been set on this device.",
      assessment: "unknown",
      sourceIds: [],
    });
  if (!profile.cgpa)
    rules.push({
      label: "Academic equivalence and final transcript need assessment.",
      assessment: "unknown",
      sourceIds: [],
    });
  const status = rules.some((r) => r.assessment === "ineligible")
    ? "ineligible"
    : rules.some((r) => r.assessment === "unknown")
      ? "requires-assessment"
      : rules.some((r) => r.assessment === "conditional")
        ? "conditional"
        : "confirmed";
  return { status, rules };
}
export function applicationFor(state, id, intake = 2027) {
  return (
    state.v3?.applications?.[appKey(id, intake)] || {
      opportunityId: id,
      intake,
      stage:
        intake === 2027 && state.applications?.[id] === "submitted"
          ? "submitted"
          : "not-started",
      decision: "research",
      completedSteps: {},
    }
  );
}
export function opportunityFacts(
  opportunity,
  registry,
  state,
  now = Date.now(),
  intake = 2027,
) {
  const application = applicationFor(state, opportunity.id, intake),
    window = evaluateWindow(opportunity, registry.deadlines, now, intake);
  const eligibility = assessEligibility(opportunity, state.v3?.profile || {}),
    blockers = dependencyBlockers(
      opportunity,
      registry.deadlines,
      application,
      now,
      intake,
    );
  if (application.blockedReason)
    blockers.push({
      id: "private-blocker",
      title: application.blockedReason,
      precision: "unknown",
    });
  const prerequisites = registry.deadlines.filter(
    (d) =>
      d.opportunityId === opportunity.id &&
      d.intake === intake &&
      d.required &&
      d.blocksRoute &&
      d.precision === "unknown" &&
      !application.completedSteps?.[d.id],
  );
  const lifecycle = state.lifecycle?.[opportunity.id]?.status || "active";
  return {
    opportunity,
    application,
    window,
    eligibility,
    blockers,
    prerequisites,
    lifecycle,
    actionable:
      window.status === "open" &&
      !blockers.length &&
      !prerequisites.length &&
      (!opportunity.internationalExcluded ||
        state.v3?.profile?.feeStatus === "domestic") &&
      eligibility.status !== "ineligible" &&
      application.decision !== "not-pursuing" &&
      !["archived", "trash", "purged", "expired"].includes(lifecycle),
  };
}
export function globalCounts(registry, state, now = Date.now(), intake = 2027) {
  const rows = registry.opportunities.map((o) =>
    opportunityFacts(o, registry, state, now, intake),
  );
  const count = (fn) => rows.filter(fn).length;
  return {
    total: rows.length,
    open: count((r) => r.window.status === "open"),
    urgent: count((r) => r.window.status === "open" && r.window.urgent),
    upcoming: count((r) =>
      ["upcoming", "opening-soon"].includes(r.window.status),
    ),
    eligible: count((r) =>
      ["confirmed", "conditional"].includes(r.eligibility.status),
    ),
    verification: count((r) =>
      ["verification-required", "deadline-unknown"].includes(r.window.status),
    ),
    preparing: count((r) =>
      [
        "preparing",
        "awaiting-documents",
        "awaiting-references",
        "ready",
      ].includes(r.application.stage),
    ),
    submitted: count((r) =>
      ["submitted", "under-review", "interview"].includes(r.application.stage),
    ),
    awaiting: count((r) =>
      ["submitted", "under-review", "interview"].includes(r.application.stage),
    ),
    awarded: count((r) => r.application.stage === "awarded"),
    closed: count((r) => r.window.status === "closed"),
    notPursuing: count((r) => r.application.decision === "not-pursuing"),
    blocked: count((r) => r.blockers.length > 0),
  };
}
export function filterOpportunities(rows, filters = {}) {
  const query = (filters.q || "").trim().normalize("NFKC").toLowerCase();
  return rows.filter((row) => {
    const o = row.opportunity;
    return (
      (!query ||
        (
          o.searchText ||
          [o.name, o.provider, ...o.countryCodes, ...o.researchAreas].join(" ")
        )
          .toLowerCase()
          .includes(query)) &&
      (!filters.country || o.countryCodes.includes(filters.country)) &&
      (!filters.category || o.category === filters.category) &&
      (!filters.window || row.window.status === filters.window) &&
      (!filters.funding || o.funding.classification === filters.funding) &&
      (!filters.eligibility ||
        row.eligibility.status === filters.eligibility) &&
      (!filters.stage || row.application.stage === filters.stage) &&
      (!filters.decision || row.application.decision === filters.decision) &&
      (!filters.returnHome ||
        o.obligations.returnHome === filters.returnHome) &&
      (!filters.degree || o.degreeTypes.includes(filters.degree)) &&
      (!filters.university || o.universityIds.includes(filters.university)) &&
      (!filters.supervisor ||
        o.guide.supervisor.requirement === filters.supervisor) &&
      (!filters.english || o.guide.english.status === filters.english) &&
      (!filters.area || o.researchAreas.includes(filters.area)) &&
      (!filters.before ||
        !row.window.deadline?.date ||
        row.window.deadline.date <= filters.before) &&
      (!filters.after ||
        !row.window.deadline?.date ||
        row.window.deadline.date >= filters.after) &&
      (filters.includeInactive === "yes" ||
        !["archived", "trash", "purged", "expired"].includes(row.lifecycle))
    );
  });
}
export function readiness(opportunity, application, privateState = {}) {
  const mandatory = opportunity.guide.steps.filter((s) => s.required === true);
  const done = mandatory.filter(
    (s) =>
      application.completedSteps?.[s.id] ||
      (s.legacyKey && privateState.progress?.[s.legacyKey]),
  ).length;
  const unresolved = opportunity.guide.unconfirmed || [];
  return {
    done,
    total: mandatory.length,
    percent: mandatory.length
      ? Math.round((done / mandatory.length) * 100)
      : null,
    verifiedComplete:
      mandatory.length > 0 && done === mandatory.length && !unresolved.length,
    unresolved,
  };
}
export function fundingBalance(year, { includeConditional = false } = {}) {
  const required = [
    "stipend",
    "grants",
    "assistantship",
    "tuition",
    "fees",
    "insurance",
    "living",
  ];
  const missing = required.filter(
    (k) =>
      typeof year[k] !== "number" || !Number.isFinite(year[k]) || year[k] < 0,
  );
  if (missing.length) return { net: null, missing };
  return {
    net:
      year.stipend +
      year.grants +
      (year.assistantshipGuaranteed || includeConditional
        ? year.assistantship
        : 0) -
      year.tuition -
      year.fees -
      year.insurance -
      year.living,
    missing: [],
    conditionalExcluded:
      !year.assistantshipGuaranteed && year.assistantship > 0,
  };
}
export function convertCurrency(amount, from, to, rate, now = Date.now()) {
  if (from === to) return amount;
  if (
    !rate ||
    rate.from !== from ||
    rate.to !== to ||
    !Number.isFinite(rate.value) ||
    rate.value <= 0 ||
    !Number.isFinite(Date.parse(rate.checkedAt)) ||
    Math.abs(now - Date.parse(rate.checkedAt)) > DAY
  )
    return null;
  return amount * rate.value;
}
export function freshness(opportunity, now = Date.now()) {
  if (opportunity.verification.state === "historical")
    return "Historical cycle only";
  if (!opportunity.verification.checkedAt)
    return "Official information unavailable";
  const days = (now - Date.parse(opportunity.verification.checkedAt)) / DAY;
  return opportunity.verification.state === "verified" && days <= 14
    ? "Verified recently"
    : opportunity.verification.state === "unconfirmed"
      ? "Application date unconfirmed"
      : "Review due";
}
export function preferenceFit(opportunity, state) {
  const profile = state.v3?.profile || {},
    preferences = state.v3?.preferences || {};
  const areas = profile.researchAreas || [
    "machine-learning",
    "computer-vision",
    "efficient-ai",
  ];
  const matches = areas.filter((a) => opportunity.researchAreas.includes(a));
  const reasons = [
    matches.length
      ? "Research overlap: " + matches.join(", ") + "."
      : "Research alignment needs a closer review.",
  ];
  if (opportunity.obligations.returnHome === "yes")
    reasons.push(
      "A return-home requirement limits immediate employment abroad.",
    );
  if (
    opportunity.obligations.returnHome === "yes" &&
    preferences.allowReturnHome === false
  )
    reasons.push(
      "This conflicts with your preference to avoid return-home obligations.",
    );
  if (opportunity.guide.supervisor.requirement === "required")
    reasons.push("Supervisor approval is an application dependency.");
  if (opportunity.funding.classification !== "full-cost-verified")
    reasons.push("Net funding or uncovered costs still need assessment.");
  const preferred = (
    preferences.preferredCountries || ["CA", "AU", "US", "GB"]
  ).some((code) => opportunity.countryCodes.includes(code));
  return {
    score:
      matches.length * 10 +
      (preferred ? 20 : 0) -
      (opportunity.obligations.returnHome === "yes" &&
      preferences.allowReturnHome === false
        ? 30
        : 0),
    reasons,
    label: "Deterministic preference match; not an admission probability.",
  };
}
