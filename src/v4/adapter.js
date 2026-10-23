// Bridge between the repo's V3 domain (src/v3/domain.js, UNCHANGED) and the v4 view-models.
// All repo functions are INJECTED so this file has no import from ../v3 and can be unit-tested in isolation:
//   const api = createAdapter({ opportunityFacts, readiness, registry });   // in src/v4/workspace.js
import { buildDashboard } from "../features/dashboard/model.js";
import { rankMatches } from "../features/radar/match.js";

const DEFAULT_AREAS = ["machine-learning", "computer-vision", "efficient-ai"]; // same defaults as v3 preferenceFit()
const DEFAULT_COUNTRIES = ["CA", "AU", "US", "GB"]; // same defaults as v3 preferenceFit()

export function profileFromState(state) {
  const p = state.v3?.profile || {},
    pref = state.v3?.preferences || {};
  return {
    displayName:
      typeof p.displayName === "string" && p.displayName.trim()
        ? p.displayName.trim()
        : "", // NEW optional field (schema change, S6)
    researchAreas:
      Array.isArray(p.researchAreas) && p.researchAreas.length
        ? p.researchAreas
        : DEFAULT_AREAS,
    preferredCountries:
      Array.isArray(pref.preferredCountries) && pref.preferredCountries.length
        ? pref.preferredCountries
        : DEFAULT_COUNTRIES,
    allowReturnHome: pref.allowReturnHome !== false,
    citizenship: p.citizenship || null,
  };
}

/** Registry opportunity + its facts row -> candidate understood by match.js */
export function candidateFromRow(row) {
  const o = row.opportunity;
  return {
    id: o.id,
    name: o.name,
    provider: o.provider,
    countryCodes: o.countryCodes || [],
    researchAreas: o.researchAreas || [],
    funding: o.funding?.classification ?? "unknown",
    degreeTypes: o.degreeTypes || [],
    status: row.window.status,
    deadlineAt:
      row.window.deadline?.precision === "exact"
        ? row.window.deadline.at
        : null,
    eligibility: row.eligibility.status,
    returnHome: o.obligations?.returnHome ?? "unknown",
    verified: o.verification?.state === "verified",
    officialUrl: o.officialUrl ?? null,
  };
}

export function createAdapter({ opportunityFacts, readiness, registry }) {
  const rowsFor = (state, now, intake) =>
    registry.opportunities
      .filter(() => true) // keep all: facts() reports "verification-required" for missing windows
      .map((o) => opportunityFacts(o, registry, state, now, intake));
  return {
    rowsFor,
    dashboard(state, { now = Date.now(), intake = 2027 } = {}) {
      const rows = rowsFor(state, now, intake);
      const readinessOf = (row) => {
        const r = readiness(row.opportunity, row.application, state);
        return r.percent; // null when the route has no mandatory steps defined
      };
      const model = buildDashboard(rows, {
        pins: state.pins || {},
        now,
        readinessOf,
      });
      const listed = new Set(
        rows
          .filter(
            (r) =>
              model.lanes.applying.includes(r) ||
              model.lanes.submitted.includes(r) ||
              model.lanes.outcome.includes(r),
          )
          .map((r) => r.opportunity.id),
      );
      const dismissed = new Set(state.v4?.dismissedMatches || []);
      const matches = rankMatches(
        rows
          .filter(
            (r) =>
              !["archived", "trash", "purged", "expired"].includes(
                r.lifecycle,
              ) &&
              r.eligibility.status !== "ineligible" &&
              r.application.decision !== "not-pursuing",
          )
          .map(candidateFromRow),
        profileFromState(state),
        { dismissed, listed, now, limit: 6 },
      );
      return { rows, model, matches, profile: profileFromState(state) };
    },
    /** "x of y required steps" text for the hero. */
    stepsText(row, state) {
      const r = readiness(row.opportunity, row.application, state);
      return r.total
        ? `${r.done} of ${r.total} required steps`
        : "Steps not yet defined";
    },
  };
}
