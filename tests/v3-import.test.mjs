import test from "node:test";
import assert from "node:assert/strict";
import {
  emptyState,
  migrateV2,
  mergeBackup,
  parseBackup,
} from "../src/v3/store.js";

const application = (patch = {}) => ({
  opportunityId: "kaust",
  intake: 2027,
  stage: "preparing",
  decision: "watch",
  completedSteps: {},
  ...patch,
});

test("V3 import fills an unknown fee status without replacing an established profile", () => {
  const incoming = emptyState();
  incoming.v3.profile = {
    citizenship: "BD",
    cgpa: "3.80",
    graduationDate: null,
    feeStatus: "international",
    researchAreas: ["computer-vision"],
  };
  const merged = mergeBackup(incoming, emptyState());
  assert.deepEqual(merged.state.v3.profile, incoming.v3.profile);
  assert.equal(mergeBackup(incoming, merged.state).newItems, 0);
  const current = emptyState();
  current.v3.profile.feeStatus = "domestic";
  current.v3.profile.cgpa = "3.90";
  const kept = mergeBackup(incoming, current);
  assert.equal(kept.state.v3.profile.feeStatus, "domestic");
  assert.equal(kept.state.v3.profile.cgpa, "3.90");
});

test("V3 import unions completed application steps while retaining current decisions and notes", () => {
  const incoming = emptyState(),
    current = emptyState();
  incoming.v3.applications["kaust:2027"] = application({
    stage: "submitted",
    decision: "apply",
    completedSteps: { "prepare-cv": true, "request-references": false },
  });
  current.v3.applications["kaust:2027"] = application({
    completedSteps: { "prepare-cv": false, "request-references": true },
  });
  current.notes.kaust = "Keep the current private note.";
  incoming.notes.kaust = "An older private note.";
  const merged = mergeBackup(incoming, current);
  assert.deepEqual(merged.state.v3.applications["kaust:2027"].completedSteps, {
    "prepare-cv": true,
    "request-references": true,
  });
  assert.equal(merged.state.v3.applications["kaust:2027"].stage, "submitted");
  assert.equal(merged.state.v3.applications["kaust:2027"].decision, "watch");
  assert.equal(merged.state.notes.kaust, current.notes.kaust);
  assert.equal(merged.newTicks, 1);
  assert.equal(mergeBackup(incoming, merged.state).newItems, 0);
  assert.equal(mergeBackup(incoming, merged.state).newTicks, 0);
});

test("V3 admission import records submission but cannot downgrade an existing outcome", () => {
  const incoming = emptyState(),
    current = emptyState();
  incoming.v3.admissions["oxford-acs:2027"] = {
    programmeId: "oxford-acs",
    intake: 2027,
    stage: "submitted",
  };
  current.v3.admissions["oxford-acs:2027"] = {
    programmeId: "oxford-acs",
    intake: 2027,
    stage: "preparing",
  };
  assert.equal(
    mergeBackup(incoming, current).state.v3.admissions["oxford-acs:2027"].stage,
    "submitted",
  );
  for (const stage of [
    "interview",
    "offer",
    "awarded",
    "rejected",
    "withdrawn",
  ]) {
    current.v3.admissions["oxford-acs:2027"].stage = stage;
    assert.equal(
      mergeBackup(incoming, current).state.v3.admissions["oxford-acs:2027"]
        .stage,
      stage,
    );
  }
});

test("An older backup cannot erase a later application outcome or revive purged work", () => {
  const incoming = emptyState(),
    current = emptyState();
  incoming.v3.applications["kaust:2027"] = application({
    stage: "submitted",
    completedSteps: { "prepare-cv": true },
  });
  current.v3.applications["kaust:2027"] = application({ stage: "awarded" });
  assert.equal(
    mergeBackup(incoming, current).state.v3.applications["kaust:2027"].stage,
    "awarded",
  );
  delete current.v3.applications["kaust:2027"];
  current.lifecycle.kaust = {
    status: "purged",
    at: "2026-10-10T00:00:00.000Z",
  };
  assert.equal(
    mergeBackup(incoming, current).state.v3.applications["kaust:2027"],
    undefined,
  );
});

test("Pre-migration backup keeps Trash, original flags and future recoverability", () => {
  const old = {
    schema_version: 1,
    progress: {},
    applications: {},
    tracking: {},
    profile: null,
    lifecycle: {
      commonwealth: {
        status: "trash",
        at: "2026-10-10T00:00:00.000Z",
        purgeAt: "2026-10-20T00:00:00.000Z",
      },
    },
    history: {},
    ui: { unratedOpen: true },
    pins: {},
    notes: {},
  };
  const raw = JSON.stringify({
    format: "career-track-v2-export",
    version: 2,
    state: old,
    raw_recovery: JSON.stringify(old),
  });
  const migrated = parseBackup(raw);
  assert.deepEqual(migrated.lifecycle, old.lifecycle);
  assert.deepEqual(migrated.progress, {});
  assert.equal(migrated.ui.unratedOpen, true);
  assert.equal(
    mergeBackup(migrated, emptyState()).state.lifecycle.commonwealth.status,
    "trash",
  );
  assert.ok(mergeBackup(migrated, emptyState()).state.v3.migration);
  assert.equal(JSON.parse(raw).state.schema_version, 1);
});

test("Legacy Oxford application alias migrates additively to its canonical route", () => {
  const old = {
    schema_version: 1,
    progress: { "goal-oxford-0": true },
    applications: { oxford: "submitted" },
    profile: null,
  };
  const migrated = migrateV2(old);
  assert.equal(migrated.applications.oxford, "submitted");
  assert.equal(migrated.v3.applications["clarendon:2027"].stage, "submitted");
  assert.equal(migrated.progress["goal-oxford-0"], true);
  assert.equal(old.applications.clarendon, undefined);
});
