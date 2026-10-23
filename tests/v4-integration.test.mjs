import test from "node:test";
import assert from "node:assert/strict";
import {
  readV4,
  updateV4,
  validatedProfile,
  adapterState,
} from "../src/v4/state.js";
import {
  createV3Store,
  emptyState,
  STORAGE_KEY,
  validatePrivateState,
} from "../src/v3/store.js";
import { splitOpportunity } from "../scripts/v4-registry.mjs";
import { readFile } from "node:fs/promises";
import { registryEvents } from "../src/features/calendar/view.js";
import {
  documentKey,
  documentRecord,
  scholarshipDocuments,
} from "../src/features/documents/view.js";
import { buildDashboard } from "../src/features/dashboard/model.js";
import { researchPrompt, applicationPackage } from "../src/v3/prompt.js";
import { registry } from "../src/v3/catalog.js";
import { evaluateWindow, opportunityFacts } from "../src/v3/domain.js";
import { buildV4Calendar } from "../src/features/calendar/export.js";
import { createTicker } from "../src/app/ticker.js";
const memory = () => {
  const data = new Map();
  return {
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => data.set(k, v),
    data,
  };
};
test("real-epoch ticker updates seconds without an immediate minute-view rerender", () => {
  let now = Date.parse("2026-10-23T10:00:00Z"),
    tick;
  const counts = [0, 0];
  const ticker = createTicker({
    now: () => now,
    set: (fn) => {
      tick = fn;
      return 1;
    },
    clear: () => {},
    isHidden: () => false,
  });
  ticker.subscribe(() => counts[0]++, 1000);
  ticker.subscribe(() => counts[1]++, 60000);
  assert.deepEqual(counts, [1, 1]);
  now += 1000;
  tick();
  assert.deepEqual(counts, [2, 1]);
  now += 59000;
  tick();
  assert.deepEqual(counts, [3, 2]);
});
test("V4 extensions preserve V3 schema, original keys and backup round trips", () => {
  const storage = memory(),
    store = createV3Store(() => {}, storage);
  store.change("progress", "doc-transcript", true);
  store.change("notes", "kaust", "Fictional private note");
  const old = structuredClone(store.get().state);
  updateV4(store, {
    dismissedMatches: ["kaust"],
    tests: { target: "7.0", booking: "2026-12-01" },
    ui: { zone: "Asia/Dhaka" },
  });
  store.setProfile({ displayName: "Alex Morgan" });
  const saved = store.get().state;
  assert.equal(saved.schema_version, 3);
  assert.equal(readV4(saved).version, 1);
  assert.deepEqual(saved.progress, old.progress);
  assert.deepEqual(saved.notes, old.notes);
  assert.deepEqual(adapterState(saved).v4.dismissedMatches, ["kaust"]);
  const backup = store.parseBackup(JSON.stringify(store.export()));
  assert.deepEqual(backup, saved);
  assert.deepEqual(validatePrivateState(saved), saved);
  assert.equal(
    JSON.parse(storage.getItem(STORAGE_KEY)).v3.profile.displayName,
    "Alex Morgan",
  );
});
test("V4 optional preferences validate imported data without touching storage", () => {
  const s = emptyState();
  assert.deepEqual(readV4(s).dismissedMatches, []);
  s.v3.preferences.workspaceV4 = { version: 9 };
  assert.throws(() => readV4(s));
  const store = createV3Store(() => {}, memory());
  assert.throws(() => updateV4(store, { tests: { booking: "2026-02-30" } }));
  assert.throws(() => updateV4(store, { ui: { zone: "bad/timezone" } }));
  assert.deepEqual(readV4(store.get().state).tests, {});
});
test("profile validation owns optional fields and does not invent a name", () => {
  const f = new FormData();
  for (const [k, v] of Object.entries({
    displayName: " Alex Morgan ",
    programme: "MSc demo",
    citizenship: "bd",
    researchAreas: "machine learning, computer vision",
    preferredCountries: "gb,de",
    feeStatus: "international",
  }))
    f.set(k, v);
  const v = validatedProfile(f);
  assert.equal(v.profile.displayName, "Alex Morgan");
  assert.deepEqual(v.profile.researchAreas, [
    "machine-learning",
    "computer-vision",
  ]);
  assert.deepEqual(v.preferences.preferredCountries, ["GB", "DE"]);
  f.set("citizenship", "Bangladesh");
  assert.throws(() => validatedProfile(f));
});
test("registry split keeps all facts required by the domain and lazy guides losslessly", async () => {
  const items = JSON.parse(
    await readFile("data/v3/opportunities.json", "utf8"),
  );
  for (const o of items) {
    const { index, guide } = splitOpportunity(o);
    assert.deepEqual(guide, o.guide);
    assert.deepEqual(index.guide.steps, o.guide.steps);
    assert.equal(
      index.guide.supervisor.requirement,
      o.guide.supervisor.requirement,
    );
    assert.equal(index.guide.overview, undefined);
    assert.deepEqual(
      index.documentIndex.map((d) => d.name),
      o.guide.documents.map((d) => d.name),
    );
  }
});
test("shared document readiness keeps route-specific legacy records and honours expiry", () => {
  const s = emptyState(),
    doc = { name: "Official academic transcript" };
  assert.equal(documentKey(doc, "demo", 0), "dossier-transcript");
  s.v3.documents["demo-doc-0"] = {
    status: "ready",
    version: "old",
    updatedAt: "2026-10-01T00:00:00Z",
  };
  assert.equal(
    documentRecord(s, "dossier-transcript", "demo-doc-0").status,
    "ready",
  );
  s.v3.documents["dossier-transcript"] = {
    status: "submitted",
    version: "new",
    expires: "2026-10-01",
    updatedAt: "2026-10-20T00:00:00Z",
  };
  assert.equal(
    scholarshipDocuments(
      { id: "demo", documentIndex: [doc] },
      s,
      Date.parse("2026-10-23"),
    )[0].record.status,
    "expired",
  );
  const legacy = emptyState();
  legacy.v3.documents["imlex-doc-1"] = {
    status: "ready",
    version: "prior-CV",
    updatedAt: "2026-10-01T00:00:00Z",
  };
  const docs = scholarshipDocuments(
    splitOpportunity(registry.opportunities.find((o) => o.id === "imlex"))
      .index,
    legacy,
    Date.parse("2026-10-23"),
  );
  assert.equal(
    docs.find((d) => d.name === "Chronological CV").record.status,
    "ready",
  );
  assert.notEqual(
    docs.find((d) => d.name === "English-language certificate").record.status,
    "ready",
  );
});
test("hero excludes watch/unknown and suspended windows even when a tentative deadline exists", () => {
  const row = (id, status, deadline) => ({
      opportunity: { id, name: id },
      application: { decision: "apply", stage: "preparing" },
      lifecycle: "active",
      window: { status, deadline },
      eligibility: { status: "conditional" },
    }),
    deadline = { precision: "exact", at: "2026-12-01T00:00:00Z" };
  assert.equal(
    buildDashboard(
      [
        row("watch", "verification-required", deadline),
        row("no-date", "open", null),
      ],
      { now: Date.parse("2026-10-23") },
    ).hero,
    null,
  );
});
test("calendar preserves verified opens and private test date without inventing times", () => {
  const r = {
    deadlines: [],
    opportunities: [
      {
        id: "demo",
        name: "Demo",
        windows: [
          { intake: 2027, opens: "2026-11-01", verification: "verified" },
        ],
      },
    ],
  };
  const events = registryEvents(r, 2027, { booking: "2026-12-01" });
  assert.equal(events[0].type, "opens");
  assert.equal(events[1].personal, true);
  assert.equal(events[1].precision, "date-only");
  assert.equal(events[1].at, undefined);
});

test("published opening hours control the window and preserve calendar/ICS precision", () => {
  const opportunity = structuredClone(
    registry.opportunities.find((o) => o.id === "codas"),
  );
  opportunity.windows[0].checkedAt = "2026-12-01T00:00:00Z";
  const r = { ...registry, opportunities: [opportunity] };
  assert.equal(
    evaluateWindow(opportunity, r.deadlines, Date.parse("2026-12-01T06:59:59Z"))
      .status,
    "opening-soon",
  );
  assert.equal(
    evaluateWindow(opportunity, r.deadlines, Date.parse("2026-12-01T07:00:00Z"))
      .status,
    "open",
  );
  const event = registryEvents(r, 2027).find((e) => e.id === "codas-opens");
  assert.equal(event.precision, "exact");
  assert.equal(event.at, "2026-12-01T07:00:00Z");
  assert.match(
    buildV4Calendar(r, { intake: 2027, mine: new Set(["codas"]) }),
    /DTSTART:20261201T070000Z/,
  );
});

test("Erasmus current and future calls retain distinct dates and scholarship tiers", () => {
  const now = Date.parse("2026-10-23T10:00:00Z");
  const row = (id) =>
    opportunityFacts(
      registry.opportunities.find((o) => o.id === id),
      registry,
      emptyState(),
      now,
      2027,
    );
  assert.equal(row("deai").window.status, "open");
  for (const id of ["ipcvai", "imlex", "codas", "ediss"])
    assert.equal(row(id).window.status, "opening-soon", id);
  assert.equal(row("commonwealth-shared").window.status, "opening-soon");
  assert.equal(
    row("commonwealth-shared").window.deadline.at,
    "2026-12-08T16:00:00Z",
  );
  for (const id of ["maia", "emai"]) {
    assert.equal(row(id).window.status, "upcoming", id);
    assert.equal(row(id).window.deadline, undefined);
  }
  assert.equal(row("deai").window.deadline.at, "2027-01-11T12:00:00Z");
  assert.match(row("deai").window.reason, /maintenance/);
  assert.ok(
    registry.deadlines.some(
      (d) =>
        d.id === "codas-documents-2027" &&
        !d.controlsWindow &&
        d.at === "2027-01-12T13:00:00Z",
    ),
  );
});

test("international exclusions and closed Australian rounds never become applicant matches", () => {
  const state = emptyState();
  state.v3.profile.feeStatus = "international";
  const now = Date.parse("2026-10-23T10:00:00Z");
  const row = (id) =>
    opportunityFacts(
      registry.opportunities.find((o) => o.id === id),
      registry,
      state,
      now,
      2027,
    );
  assert.equal(row("toronto-msc").eligibility.status, "ineligible");
  for (const id of [
    "uts-rtp",
    "qut-rtp",
    "tasmania-rtp",
    "uq-rtp",
    "commonwealth",
  ])
    assert.equal(row(id).window.status, "closed", id);
  const eiffel = row("eiffel");
  assert.notEqual(eiffel.window.deadline?.precision, "exact");
});

test("GPT prompt includes the selected intake and checklist without private identity or notes", () => {
  const o = registry.opportunities.find((o) => o.id === "kaust"),
    state = emptyState();
  state.v3.profile.displayName = "Private Fictional Person";
  state.notes.kaust = "PRIVATE_NOTE_DO_NOT_SHARE";
  state.v3.references["private-ref"] = {
    name: "Private Referee",
    email: "private@example.org",
  };
  state.v3.applications["kaust:2028"] = {
    opportunityId: "kaust",
    intake: 2028,
    stage: "preparing",
    decision: "apply",
    completedSteps: { [o.guide.steps[0].id]: true },
  };
  const prompt = researchPrompt(o, registry, { state, intake: 2028 });
  assert.match(prompt, /for 2028/);
  assert.match(prompt, /\[x\]/);
  assert.match(prompt, /Selected application stage: preparing/);
  for (const privateValue of [
    "Private Fictional Person",
    "PRIVATE_NOTE_DO_NOT_SHARE",
    "Private Referee",
    "private@example.org",
  ])
    assert.ok(!prompt.includes(privateValue));
  assert.ok(!prompt.includes("Fall 2027 MS Round 2: 2027-01-03"));
  assert.match(
    applicationPackage(o, registry, state, 2028),
    /Research and verify only KAUST MSc Fellowship for 2028/,
  );
});
