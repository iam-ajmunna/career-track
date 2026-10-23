// Pure view-model for the Dashboard. `rows` are results of the repo's opportunityFacts(o, registry, state, now, intake):
//   { opportunity, application:{stage,decision}, window:{status,deadline}, eligibility, blockers, lifecycle }
import { countdownModel, compactText, urgency, DAY } from "./countdown.js";

export const APPLYING_STAGES = [
  "not-started",
  "preparing",
  "awaiting-documents",
  "awaiting-references",
  "ready",
];
export const SUBMITTED_STAGES = ["submitted", "under-review", "interview"];
export const OUTCOME_STAGES = ["offer", "awarded", "rejected", "withdrawn"];
const INACTIVE = ["archived", "trash", "purged", "expired"];

/** "My list" = what the user has chosen to pursue. */
export function inMyList(row, pins = {}) {
  if (INACTIVE.includes(row.lifecycle)) return false;
  const { decision, stage } = row.application;
  if (decision === "not-pursuing") return false;
  return (
    decision === "apply" ||
    Boolean(pins[row.opportunity.id]) ||
    stage !== "not-started"
  );
}
export const laneOf = (row) => {
  const s = row.application.stage;
  return SUBMITTED_STAGES.includes(s)
    ? "submitted"
    : OUTCOME_STAGES.includes(s)
      ? "outcome"
      : "applying";
};
const deadlineMs = (row, now) => {
  const d = row.window.deadline;
  if (!d) return Infinity;
  if (d.precision === "exact" && d.at) return Date.parse(d.at);
  if (d.precision === "date-only" && d.date) return Date.parse(d.date) + DAY; // end of that calendar day (UTC proxy for ordering only)
  return Infinity;
};

export function buildDashboard(
  rows,
  { pins = {}, now = Date.now(), readinessOf = () => null } = {},
) {
  const mine = rows.filter((r) => inMyList(r, pins));
  const lanes = { applying: [], submitted: [], outcome: [] };
  for (const r of mine) lanes[laneOf(r)].push(r);
  lanes.applying.sort((a, b) => deadlineMs(a, now) - deadlineMs(b, now));

  // Hero: nearest not-yet-closed deadline among applications still being prepared.
  const hero =
    lanes.applying
      .filter(
        (r) =>
          r.window.status === "open" &&
          ["live", "days"].includes(
            countdownModel(r.window.deadline, now).mode,
          ),
      )
      .sort((a, b) => deadlineMs(a, now) - deadlineMs(b, now))[0] ?? null;

  const within30 = lanes.applying.filter((r) => {
    const t = deadlineMs(r, now);
    return t > now && t - now <= 30 * DAY;
  }).length;
  const listedIds = new Set(mine.map((r) => r.opportunity.id));
  const openMatches = rows.filter(
    (r) =>
      r.window.status === "open" &&
      !listedIds.has(r.opportunity.id) &&
      r.eligibility.status !== "ineligible" &&
      r.application.decision !== "not-pursuing" &&
      !INACTIVE.includes(r.lifecycle),
  ).length;

  return {
    hero: hero && {
      row: hero,
      countdown: countdownModel(hero.window.deadline, now),
      readiness: readinessOf(hero),
    },
    kpis: [
      { key: "applying", label: "Applying", value: lanes.applying.length },
      {
        key: "submitted",
        label: "Submitted",
        value: lanes.submitted.length + lanes.outcome.length,
      },
      { key: "closing", label: "Closing in 30 days", value: within30 },
      { key: "matches", label: "Open matches", value: openMatches },
    ],
    lanes,
    card: (row) => {
      const cd = countdownModel(row.window.deadline, now);
      return {
        id: row.opportunity.id,
        name: row.opportunity.name,
        countries: row.opportunity.countryCodes,
        stage: row.application.stage,
        countdown: cd,
        text: compactText(cd),
        urgency: cd.urgency ?? urgency(Infinity),
        readiness: readinessOf(row),
      };
    },
  };
}
