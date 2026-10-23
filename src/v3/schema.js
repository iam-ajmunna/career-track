/** @typedef {'open'|'opening-soon'|'upcoming'|'closed'|'deadline-unknown'|'suspended'|'verification-required'} WindowStatus */
/** @typedef {'not-started'|'preparing'|'awaiting-documents'|'awaiting-references'|'ready'|'submitted'|'under-review'|'interview'|'offer'|'awarded'|'rejected'|'withdrawn'} ApplicationStage */
/** @typedef {{id:string, opportunityId:string, intake:number, stage:ApplicationStage, decision:string, updatedAt:string}} UserApplication */
export const STAGES = [
  "not-started",
  "preparing",
  "awaiting-documents",
  "awaiting-references",
  "ready",
  "submitted",
  "under-review",
  "interview",
  "offer",
  "awarded",
  "rejected",
  "withdrawn",
];
export const DECISIONS = [
  "apply",
  "research",
  "watch",
  "low-priority",
  "not-pursuing",
];
export const CATEGORIES = [
  "government",
  "university-award",
  "research-degree",
  "assistantship",
  "joint-programme",
  "foundation",
  "combined-funding",
  "research-lead",
];
export const FUNDING = [
  "full-cost-verified",
  "tuition-stipend-net-pending",
  "tuition-only",
  "stipend-only",
  "partial",
  "competitive-assistantship",
  "unknown",
];
export const WINDOWS = [
  "open",
  "opening-soon",
  "upcoming",
  "closed",
  "deadline-unknown",
  "suspended",
  "verification-required",
];
export const record = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);
export const safeId = (value) =>
  typeof value === "string" &&
  /^[a-z0-9][a-z0-9-]{0,119}$/.test(value) &&
  !["constructor", "prototype", "__proto__"].includes(value);
export function validDate(value) {
  return (
    typeof value === "string" &&
    /^\d{4}-\d\d-\d\d$/.test(value) &&
    Number.isFinite(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value
  );
}
export const validInstant = (value) =>
  typeof value === "string" &&
  /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/.test(value) &&
  Number.isFinite(Date.parse(value)) &&
  new Date(value).toISOString() === value.replace(/(?<!\.\d{3})Z$/, ".000Z");
export function safeUrl(value) {
  try {
    const u = new URL(value);
    return (
      u.protocol === "https:" &&
      !u.username &&
      !u.password &&
      (!u.port || u.port === "443") &&
      !/^(localhost|\[|\d)/i.test(u.hostname) &&
      !/\.(local|internal|test)$/i.test(u.hostname)
    );
  } catch {
    return false;
  }
}
export function validZone(value) {
  try {
    new Intl.DateTimeFormat("en", { timeZone: value }).format();
    return typeof value === "string" && Boolean(value);
  } catch {
    return false;
  }
}
const requireValue = (ok, message) => {
  if (!ok) throw Error(message);
};
function entities(rows, label) {
  requireValue(Array.isArray(rows), "Missing " + label + " collection.");
  const ids = new Set();
  for (const row of rows) {
    requireValue(
      record(row) && safeId(row.id) && !ids.has(row.id),
      "Invalid or duplicate " + label + " ID.",
    );
    ids.add(row.id);
  }
  return ids;
}
export function validateRegistry(registry) {
  requireValue(
    record(registry) && registry.schemaVersion === 3,
    "Unsupported research registry.",
  );
  const sources = entities(registry.sources, "source"),
    universities = entities(registry.universities, "university"),
    programmes = entities(registry.programmes, "programme");
  const opportunities = entities(registry.opportunities, "opportunity"),
    deadlines = entities(registry.deadlines, "deadline");
  entities(registry.countries, "country");
  entities(registry.experiences, "experience");
  entities(registry.research, "research group");
  const refs = (ids, set) =>
    Array.isArray(ids) && ids.every((id) => set.has(id));
  for (const source of registry.sources)
    requireValue(
      safeUrl(source.url) &&
        typeof source.title === "string" &&
        source.title &&
        typeof source.publisher === "string" &&
        ["official", "department", "student", "discovery"].includes(
          source.kind,
        ) &&
        validInstant(source.checkedAt),
      "Invalid source provenance: " + source.id,
    );
  for (const row of registry.universities)
    requireValue(
      typeof row.name === "string" &&
        /^[A-Z]{2}$/.test(row.countryCode) &&
        safeUrl(row.url) &&
        refs(row.sourceIds, sources),
      "Invalid university: " + row.id,
    );
  for (const row of registry.programmes)
    requireValue(
      typeof row.name === "string" &&
        refs(row.universityIds, universities) &&
        Array.isArray(row.researchAreas) &&
        safeUrl(row.url) &&
        refs(row.sourceIds, sources),
      "Invalid programme: " + row.id,
    );
  for (const row of registry.opportunities) {
    requireValue(
      typeof row.name === "string" &&
        CATEGORIES.includes(row.category) &&
        refs(row.universityIds, universities) &&
        refs(row.programmeIds, programmes) &&
        Array.isArray(row.countryCodes) &&
        row.countryCodes.every((code) => /^[A-Z]{2}$/.test(code)) &&
        Array.isArray(row.intakes) &&
        row.intakes.every(
          (year) => Number.isInteger(year) && year >= 2024 && year <= 2040,
        ) &&
        refs(row.sourceIds, sources) &&
        FUNDING.includes(row.funding.classification) &&
        ["yes", "no", "unknown"].includes(row.obligations.returnHome) &&
        ["verified", "review-due", "historical", "unconfirmed"].includes(
          row.verification.state,
        ),
      "Invalid opportunity: " + row.id,
    );
    requireValue(
      refs(row.deadlineIds, deadlines) &&
        Array.isArray(row.guide.steps) &&
        row.guide.steps.every(
          (step) => safeId(step.id) && typeof step.text === "string",
        ),
      "Invalid playbook: " + row.id,
    );
    requireValue(
      Array.isArray(row.windows) &&
        row.windows.every(
          (w) =>
            row.intakes.includes(w.intake) &&
            WINDOWS.includes(w.status) &&
            ["verified", "unconfirmed", "historical"].includes(
              w.verification,
            ) &&
            validInstant(w.checkedAt) &&
            (!w.opens || validDate(w.opens)) &&
            (!w.opensAt ||
              (validInstant(w.opensAt) &&
                Boolean(w.opens) &&
                validZone(w.timezone))) &&
            (!w.timezone || validZone(w.timezone)),
        ),
      "Invalid application window: " + row.id,
    );
    requireValue(
      Array.isArray(row.funding.components) &&
        row.funding.components.every(
          (c) =>
            typeof c.label === "string" &&
            typeof c.detail === "string" &&
            refs(c.sourceIds, sources),
        ),
      "Invalid funding components: " + row.id,
    );
    for (const link of row.guide.portals)
      requireValue(safeUrl(link.url), "Unsafe portal URL: " + row.id);
    for (const rule of row.eligibility)
      requireValue(
        typeof rule.label === "string" &&
          ["confirmed", "conditional", "unknown", "ineligible"].includes(
            rule.assessment,
          ) &&
          refs(rule.sourceIds, sources),
        "Invalid eligibility rule: " + row.id,
      );
    for (const claim of Object.values(row.claims || {}))
      requireValue(
        record(claim) &&
          refs(claim.sourceIds, sources) &&
          validInstant(claim.checkedAt),
        "Invalid field provenance: " + row.id,
      );
  }
  const byDeadline = new Map(registry.deadlines.map((row) => [row.id, row]));
  for (const row of registry.deadlines) {
    requireValue(
      opportunities.has(row.opportunityId) &&
        Number.isInteger(row.intake) &&
        ["exact", "date-only", "tentative", "unknown"].includes(
          row.precision,
        ) &&
        refs(row.sourceIds, sources),
      "Invalid deadline: " + row.id,
    );
    requireValue(
      row.date === null || validDate(row.date),
      "Invalid calendar date: " + row.id,
    );
    requireValue(
      row.timezone === null || validZone(row.timezone),
      "Invalid deadline timezone: " + row.id,
    );
    requireValue(
      row.precision !== "exact" ||
        (validInstant(row.at) &&
          validZone(row.timezone) &&
          row.time &&
          row.date),
      "Exact deadline lacks its official time: " + row.id,
    );
    requireValue(
      row.precision === "exact" || row.at === null,
      "Invented instant for non-exact deadline: " + row.id,
    );
    requireValue(
      Array.isArray(row.dependsOn) &&
        row.dependsOn.every(
          (id) =>
            byDeadline.has(id) &&
            byDeadline.get(id).opportunityId === row.opportunityId,
        ),
      "Invalid deadline dependency: " + row.id,
    );
  }
  const visited = new Set(),
    visiting = new Set();
  function visit(id) {
    if (visiting.has(id)) throw Error("Cyclic deadline dependencies.");
    if (visited.has(id)) return;
    visiting.add(id);
    for (const dep of byDeadline.get(id).dependsOn) visit(dep);
    visiting.delete(id);
    visited.add(id);
  }
  for (const id of deadlines) visit(id);
  for (const row of registry.countries)
    requireValue(
      /^[A-Z]{2}$/.test(row.code) && refs(row.sourceIds, sources),
      "Invalid country profile.",
    );
  for (const row of registry.experiences)
    requireValue(
      sources.has(row.sourceId) &&
        ["university", "country", "opportunity"].includes(row.scope) &&
        typeof row.summary === "string" &&
        typeof row.limitations === "string",
      "Invalid student evidence.",
    );
  for (const row of registry.research)
    requireValue(
      universities.has(row.universityId) &&
        safeUrl(row.url) &&
        refs(row.sourceIds, sources) &&
        ["unknown", "verified-open", "not-advertised"].includes(
          row.availability,
        ),
      "Invalid research evidence.",
    );
  return registry;
}
