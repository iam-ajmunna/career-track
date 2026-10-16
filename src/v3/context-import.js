import { validatePrivateState } from "./store.js";
import { record } from "./schema.js";
import { appKey } from "./domain.js";
export function previewContext(raw, current, registry) {
  if (typeof raw !== "string" || new TextEncoder().encode(raw).length > 1048576)
    throw Error("Context file exceeds 1 MB.");
  const blob = JSON.parse(raw);
  if (
    blob?.format !== "career-track-private-context" ||
    blob.version !== 1 ||
    !record(blob.profile) ||
    !Array.isArray(blob.applications) ||
    !Array.isArray(blob.admissions) ||
    blob.applications.length > 50 ||
    blob.admissions.length > 50
  )
    throw Error("Invalid private planning context.");
  const next = structuredClone(current),
    changes = [];
  for (const [key, value] of Object.entries(blob.profile)) {
    if (
      ![
        "citizenship",
        "cgpa",
        "graduationDate",
        "researchAreas",
        "feeStatus",
      ].includes(key)
    )
      throw Error("Unsupported private profile field.");
    if (JSON.stringify(next.v3.profile[key]) !== JSON.stringify(value)) {
      changes.push("Profile " + key + ": " + JSON.stringify(value));
      next.v3.profile[key] = value;
    }
  }
  for (const row of blob.applications) {
    if (
      !registry.opportunities.some((o) => o.id === row.opportunityId) ||
      !Number.isInteger(row.intake)
    )
      throw Error("Unknown opportunity or intake in context.");
    const key = appKey(row.opportunityId, row.intake),
      before = next.v3.applications[key] || {};
    next.v3.applications[key] = {
      opportunityId: row.opportunityId,
      intake: row.intake,
      stage: before.stage || "not-started",
      decision: before.decision || "research",
      completedSteps: before.completedSteps || {},
      ...before,
      ...row,
      updatedAt: new Date().toISOString(),
    };
    changes.push(
      `${row.opportunityId} ${row.intake}: ${before.stage || "not-started"} → ${next.v3.applications[key].stage}; decision ${next.v3.applications[key].decision}${row.blockedReason ? "; " + row.blockedReason : ""}`,
    );
  }
  for (const row of blob.admissions) {
    if (
      !registry.programmes.some((p) => p.id === row.programmeId) ||
      !Number.isInteger(row.intake)
    )
      throw Error("Unknown programme or intake in context.");
    const key = appKey(row.programmeId, row.intake);
    changes.push(
      `${row.programmeId} admission: ${next.v3.admissions[key]?.stage || "not-started"} → ${row.stage}`,
    );
    next.v3.admissions[key] = { ...row, updatedAt: new Date().toISOString() };
  }
  return { state: validatePrivateState(next), changes };
}
export function validateSourceReport(raw, registry) {
  if (typeof raw !== "string" || new TextEncoder().encode(raw).length > 1048576)
    throw Error("Source report exceeds 1 MB.");
  const blob = JSON.parse(raw);
  if (
    blob?.format !== "career-track-source-review" ||
    blob.version !== 1 ||
    !Array.isArray(blob.items) ||
    blob.items.length > 200 ||
    !Number.isFinite(Date.parse(blob.checkedAt))
  )
    throw Error("Invalid source-check report.");
  const notices = {};
  for (const row of blob.items) {
    const source = registry.sources.find((s) => s.id === row.id);
    if (
      !source ||
      ![
        "changed",
        "unchanged",
        "initial",
        "blocked",
        "error",
        "skipped",
      ].includes(row.status)
    )
      throw Error("Unknown source or invalid check status.");
    if (row.status !== "unchanged")
      notices[row.id] = {
        title: source.title,
        status: row.status,
        checkedAt: blob.checkedAt,
      };
  }
  return notices;
}
