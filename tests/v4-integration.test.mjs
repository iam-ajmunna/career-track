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
const memory = () => {
  const data = new Map();
  return {
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => data.set(k, v),
    data,
  };
};
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
