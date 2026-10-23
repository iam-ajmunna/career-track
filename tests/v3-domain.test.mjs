import test from "node:test";
import assert from "node:assert/strict";
import { registry } from "../src/v3/catalog.js";
import {
  validateRegistry,
  safeUrl,
  validDate,
  validInstant,
} from "../src/v3/schema.js";
import {
  emptyState,
  migrateV2,
  createV3Store,
  STORAGE_KEY,
  V2_KEY,
  parseBackup,
  mergeBackup,
} from "../src/v3/store.js";
import {
  evaluateWindow,
  globalCounts,
  opportunityFacts,
  filterOpportunities,
  assessEligibility,
  fundingBalance,
  convertCurrency,
  readiness,
} from "../src/v3/domain.js";
import { buildV3Calendar } from "../src/v3/calendar.js";
import {
  previewContext,
  validateSourceReport,
} from "../src/v3/context-import.js";
const now = Date.parse("2026-10-16T12:00:00Z"),
  get = (id) => registry.opportunities.find((o) => o.id === id);
const memory = () => {
  const m = new Map();
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => m.set(k, v),
    removeItem: (k) => m.delete(k),
    get length() {
      return m.size;
    },
    key: (i) => [...m.keys()][i] || null,
  };
};
test("V3 registry has independent referenced entities and every original route", () => {
  assert.equal(validateRegistry(registry), registry);
  assert.ok(registry.opportunities.length >= 43);
  assert.ok(new Set(registry.opportunities.map((o) => o.category)).size >= 6);
  assert.equal(registry.countries.length, 8);
  assert.ok(registry.research.length >= 6);
});
test("Open totals are global, include urgency, decisions, completed work and submissions", () => {
  const s = emptyState(),
    base = globalCounts(registry, s, now);
  assert.ok(base.open >= 10);
  assert.ok(base.urgent >= 1);
  s.v3.applications["commonwealth:2027"] = {
    opportunityId: "commonwealth",
    intake: 2027,
    stage: "submitted",
    decision: "not-pursuing",
    completedSteps: {},
  };
  s.tracking.commonwealth = "completed";
  s.lifecycle.commonwealth = {
    status: "archived",
    at: "2026-10-16T00:00:00.000Z",
  };
  assert.equal(globalCounts(registry, s, now).open, base.open);
  assert.equal(globalCounts(registry, s, now).submitted, 1);
  const rows = registry.opportunities.map((o) =>
    opportunityFacts(o, registry, s, now),
  );
  assert.equal(
    filterOpportunities(rows, { country: "US", window: "open" }).length,
    0,
  );
  assert.equal(globalCounts(registry, s, now).open, base.open);
});
test("Opening dates are not inferred from last year and urgent remains an open window", () => {
  assert.equal(
    evaluateWindow(get("ediss"), registry.deadlines, now).status,
    "opening-soon",
  );
  assert.equal(
    evaluateWindow(get("eth-esop"), registry.deadlines, now).status,
    "opening-soon",
  );
  assert.equal(
    evaluateWindow(get("turkiye"), registry.deadlines, now).status,
    "verification-required",
  );
  const c = evaluateWindow(get("commonwealth"), registry.deadlines, now);
  assert.equal(c.status, "open");
  assert.equal(c.urgent, true);
  assert.equal(
    evaluateWindow(get("unsw-rtp"), registry.deadlines, now).status,
    "closed",
  );
  assert.equal(
    evaluateWindow(get("princeton-mse"), registry.deadlines, now).status,
    "suspended",
  );
});
test("Official open-call verification ages visibly without pretending a current call", () => {
  assert.equal(
    evaluateWindow(
      get("ubc-msc"),
      registry.deadlines,
      Date.parse(get("ubc-msc").windows[0].checkedAt) + 31 * 86400000,
    ).status,
    "verification-required",
  );
  assert.equal(
    evaluateWindow(
      get("ubc-msc"),
      registry.deadlines,
      Date.parse("2026-12-17T00:00:00Z"),
    ).status,
    "closed",
  );
});
test("Missed nomination and unconfirmed EOI block feasibility, independent of provider window", () => {
  const s = emptyState();
  s.v3.applications["commonwealth:2027"] = {
    stage: "not-started",
    decision: "not-pursuing",
    completedSteps: {},
    blockedReason: "Mandatory nomination was missed",
  };
  const c = opportunityFacts(get("commonwealth"), registry, s, now);
  assert.equal(c.window.status, "open");
  assert.equal(c.actionable, false);
  assert.equal(c.blockers.length, 1);
  const uq = opportunityFacts(get("uq-rtp"), registry, s, now);
  assert.equal(uq.window.status, "open");
  assert.equal(uq.prerequisites.length, 1);
  assert.equal(uq.actionable, false);
});
test("Date-only deadlines never invent midnight; exact deadlines convert across DST", () => {
  const d = registry.deadlines.find((d) => d.id === "clarendon-admission");
  assert.equal(d.at, "2027-01-06T12:00:00Z");
  assert.equal(
    evaluateWindow(
      get("ubc-msc"),
      registry.deadlines,
      Date.parse("2026-12-15T12:00:00Z"),
    ).status,
    "verification-required",
  );
  const clone = structuredClone(get("ubc-msc"));
  clone.windows[0].checkedAt = "2026-12-15T00:00:00Z";
  assert.equal(
    evaluateWindow(
      clone,
      registry.deadlines,
      Date.parse("2026-12-15T12:00:00Z"),
    ).status,
    "open",
  );
  assert.equal(
    evaluateWindow(
      clone,
      registry.deadlines,
      Date.parse("2026-12-16T12:00:00Z"),
    ).status,
    "closed",
  );
});
test("Eligibility depends on actual fee status and cannot be replaced by preference", () => {
  const o = get("toronto-msc");
  assert.equal(
    assessEligibility(o, {
      citizenship: "BD",
      cgpa: "3.80",
      feeStatus: "international",
    }).status,
    "ineligible",
  );
  assert.equal(
    assessEligibility(o, {
      citizenship: "BD",
      cgpa: "3.80",
      feeStatus: "domestic",
    }).status,
    "conditional",
  );
});
test("Unknown budget inputs remain unknown; conditional RA income is excluded by default", () => {
  const b = {
    stipend: 30000,
    grants: 0,
    assistantship: 10000,
    assistantshipGuaranteed: false,
    tuition: 10000,
    fees: 1000,
    insurance: 2000,
    living: 20000,
  };
  assert.equal(fundingBalance({ ...b, living: null }).net, null);
  assert.equal(fundingBalance(b).net, -3000);
  assert.equal(fundingBalance(b, { includeConditional: true }).net, 7000);
  assert.equal(
    convertCurrency(
      10,
      "CAD",
      "BDT",
      { from: "CAD", to: "BDT", value: 90, checkedAt: "2026-10-14T00:00:00Z" },
      now,
    ),
    null,
  );
  assert.equal(convertCurrency(10, "CAD", "CAD", null, now), 10);
});
test("Net-ready checklist does not claim complete while official requirements are unconfirmed", () => {
  const o = get("ubc-msc"),
    completedSteps = Object.fromEntries(o.guide.steps.map((s) => [s.id, true]));
  assert.equal(readiness(o, { completedSteps }).percent, 100);
  assert.equal(readiness(o, { completedSteps }).verifiedComplete, false);
});
test("Registry rejects reference errors, cycles, invented instants, invalid dates and unsafe URLs", () => {
  const bad = structuredClone(registry);
  bad.deadlines[0].dependsOn = [bad.deadlines[0].id];
  assert.throws(() => validateRegistry(bad), /Cyclic/);
  const wrong = structuredClone(registry);
  wrong.opportunities[0].universityIds = ["does-not-exist"];
  assert.throws(() => validateRegistry(wrong));
  const instant = structuredClone(registry);
  instant.deadlines.find((d) => d.precision === "date-only").at =
    "2027-01-01T23:59:00Z";
  assert.throws(() => validateRegistry(instant), /Invented/);
  for (const value of [
    "javascript:alert(1)",
    "https://127.0.0.1/",
    "https://name:secret@example.com/",
    "http://example.com",
  ])
    assert.equal(safeUrl(value), false);
  assert.equal(validDate("2027-02-30"), false);
  assert.equal(validInstant("2027-02-30T10:00:00Z"), false);
});
test("Migration is versioned, backup gated, additive, and preserves the exact v2 bytes", () => {
  const m = memory(),
    raw = JSON.stringify({
      schema_version: 1,
      progress: { "sch-kaust-0": true, "goal-core-0": true },
      applications: { clarendon: "submitted", commonwealth: "skipped" },
      tracking: { kaust: "completed" },
      profile: null,
      notes: { kaust: "Private <note>" },
      pins: { kaust: true },
      preferences: { sortOrder: "worst-first" },
      lifecycle: {},
      history: {},
    });
  m.setItem(V2_KEY, raw);
  const store = createV3Store(() => {}, m);
  assert.equal(store.get().migrationPending, true);
  assert.throws(() =>
    store.setApplication("kaust", 2027, { stage: "preparing" }),
  );
  assert.equal(m.getItem(STORAGE_KEY), null);
  store.completeMigration();
  assert.equal(m.getItem(V2_KEY), raw);
  assert.equal(m.getItem("career-track:v3:pre-migration"), raw);
  assert.equal(
    store.get().state.v3.applications["clarendon:2027"].stage,
    "submitted",
  );
  assert.equal(
    store.get().state.v3.applications["commonwealth:2027"].decision,
    "not-pursuing",
  );
  assert.equal(store.get().state.notes.kaust, "Private <note>");
  assert.equal(store.get().state.progress["goal-core-0"], true);
});
test("Partial legacy state is filled safely; malformed values and prototype keys are rejected", () => {
  assert.equal(
    migrateV2({ progress: { "doc-cv": true } }).progress["doc-cv"],
    true,
  );
  assert.throws(() => migrateV2({ progress: { "doc-cv": "yes" } }));
  assert.throws(() => migrateV2(JSON.parse('{"__proto__":{},"progress":{}}')));
});
test("V3 complete backup roundtrip retains submissions, admissions, contacts, budgets and unknown records", () => {
  const store = createV3Store(() => {}, memory());
  store.setApplication("kaust", 2027, {
    stage: "submitted",
    decision: "apply",
  });
  store.setAdmission("oxford-acs", 2027, "submitted");
  store.setReference("ref-a", {
    name: "Private Test",
    email: "example@example.org",
  });
  store.setDocument("kaust-doc-0", { status: "ready", version: "v2" });
  store.change("progress", "goal-core-0", true);
  const parsed = parseBackup(JSON.stringify(store.export()));
  assert.deepEqual(parsed, store.get().state);
  const merged = mergeBackup(parsed, emptyState());
  assert.equal(
    merged.state.v3.admissions["oxford-acs:2027"].stage,
    "submitted",
  );
  assert.equal(mergeBackup(parsed, merged.state).newItems, 0);
});
test("No elapsed deadline or trash timer deletes V3 progress; explicit purge is scoped", () => {
  const s = createV3Store(() => {}, memory());
  s.change("progress", "sch-commonwealth-0", true);
  s.setApplication("commonwealth", 2027, { stage: "submitted" });
  s.lifecycle("delete", "commonwealth");
  s.reap();
  assert.equal(s.get().state.progress["sch-commonwealth-0"], true);
  s.lifecycle("restore", "commonwealth");
  assert.equal(
    s.get().state.v3.applications["commonwealth:2027"].stage,
    "submitted",
  );
  s.lifecycle("purge", "commonwealth");
  assert.equal(s.get().state.progress["sch-commonwealth-0"], undefined);
  assert.equal(s.get().state.v3.applications["commonwealth:2027"], undefined);
});
test("Storage failures retain exportable drafts and corrupted data cannot be overwritten", () => {
  const m = memory(),
    s = createV3Store(() => {}, m),
    write = m.setItem;
  m.setItem = () => {
    throw Error("quota");
  };
  s.change("progress", "doc-cv", true);
  assert.equal(s.get().storageFailed, true);
  assert.equal(s.export().state.progress["doc-cv"], true);
  m.setItem = write;
  s.sync();
  assert.equal(s.get().storageFailed, false);
  m.setItem(STORAGE_KEY, "broken");
  const corrupt = createV3Store(() => {}, m);
  assert.throws(() => corrupt.change("progress", "doc-cv", false));
  assert.equal(corrupt.export().raw_recovery, "broken");
  corrupt.recoverFromBackup(emptyState());
  assert.equal(m.getItem("career-track:v3:recovery"), "broken");
});
test("Two tabs preserve unrelated changes and never replace an unsaved failed draft", () => {
  const m = memory(),
    a = createV3Store(() => {}, m),
    b = createV3Store(() => {}, m);
  a.change("progress", "doc-cv", true);
  b.change("progress", "doc-passport", true);
  assert.equal(b.get().state.progress["doc-cv"], true);
  const write = m.setItem;
  m.setItem = () => {
    throw Error("quota");
  };
  b.change("notes", "kaust", "keep me");
  m.setItem = write;
  a.change("progress", "doc-certificate", true);
  b.reloadFromBrowser();
  assert.equal(b.get().draftProblem, true);
  assert.equal(b.get().state.notes.kaust, "keep me");
});
test("Calendar exports date-only markers without alarms and exact instants with four alarms", () => {
  const ics = buildV3Calendar(registry.deadlines, registry.sources);
  assert.match(ics, /DTSTART;VALUE=DATE:20261215/);
  assert.match(ics, /DTSTART:20270106T120000Z/);
  const events = ics.split("BEGIN:VEVENT").slice(1);
  for (const evt of events)
    assert.equal(
      (evt.match(/BEGIN:VALARM/g) || []).length,
      evt.includes("DTSTART;VALUE=DATE") ? 0 : 4,
    );
  assert.doesNotMatch(ics, /Earlier recorded deadline/);
});
test("Private context import is explicit and distinguishes Oxford admission from scholarship stage", () => {
  const raw = JSON.stringify({
    format: "career-track-private-context",
    version: 1,
    profile: {
      citizenship: "BD",
      cgpa: "3.80",
      graduationDate: null,
      researchAreas: ["efficient-ai"],
      feeStatus: "international",
    },
    applications: [
      {
        opportunityId: "commonwealth",
        intake: 2027,
        stage: "not-started",
        decision: "not-pursuing",
        blockedReason: "Nomination missed",
      },
    ],
    admissions: [
      { programmeId: "oxford-acs", intake: 2027, stage: "submitted" },
    ],
  });
  const current = emptyState(),
    p = previewContext(raw, current, registry);
  assert.equal(current.v3.admissions["oxford-acs:2027"], undefined);
  assert.equal(p.state.v3.admissions["oxford-acs:2027"].stage, "submitted");
  assert.equal(p.state.v3.applications["clarendon:2027"], undefined);
  assert.ok(p.changes.length > 1);
});
test("Untrusted source reports cannot create arbitrary links or unsupported status values", () => {
  const good = {
    format: "career-track-source-review",
    version: 1,
    checkedAt: "2026-10-16T00:00:00Z",
    items: [
      { id: "ubc-funding", status: "changed", title: "untrusted <script>" },
    ],
  };
  assert.equal(
    validateSourceReport(JSON.stringify(good), registry)["ubc-funding"].title,
    "Dated 2026–27 MSc/PhD stipend table",
  );
  good.items[0].id = "evil";
  assert.throws(() => validateSourceReport(JSON.stringify(good), registry));
});
