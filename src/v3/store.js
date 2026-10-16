import { EMPTY_STATE, validateState, reconcile } from "../sync/model.js";
import { inspectBackup as inspectLegacyBackup } from "../sync/backup.js";
import {
  STAGES,
  DECISIONS,
  record,
  safeId,
  validDate,
  validInstant,
} from "./schema.js";
import { appKey } from "./domain.js";

export const STORAGE_KEY = "career-track:v3";
export const V2_KEY = "career-track:v2";
const LIMIT = 524288;
export function emptyState() {
  return {
    ...structuredClone(EMPTY_STATE),
    pins: {},
    preferences: {},
    ui: {},
    notes: {},
    schema_version: 3,
    v3: {
      version: 3,
      applications: {},
      admissions: {},
      documents: {},
      references: {},
      budgets: {},
      notifications: {},
      profile: {
        citizenship: null,
        cgpa: null,
        graduationDate: null,
        researchAreas: [],
        feeStatus: "unknown",
      },
      preferences: {
        preferredCountries: ["CA", "AU", "US", "GB"],
        allowReturnHome: true,
      },
      migration: null,
    },
  };
}
function safeTree(value, depth = 0) {
  if (depth > 16) throw Error("Saved data is nested too deeply.");
  if (value && typeof value === "object")
    for (const [key, item] of Object.entries(value)) {
      if (["__proto__", "constructor", "prototype"].includes(key))
        throw Error("Unsafe saved-data key.");
      safeTree(item, depth + 1);
    }
}
const validKey = (key) => /^[a-z0-9][a-z0-9-]{0,119}:20[2-4]\d$/.test(key);
export function validatePrivateState(value) {
  if (
    !record(value) ||
    value.schema_version !== 3 ||
    !record(value.v3) ||
    value.v3.version !== 3
  )
    throw Error("Unsupported V3 workspace.");
  if (new TextEncoder().encode(JSON.stringify(value)).length > LIMIT)
    throw Error("Workspace exceeds 512 KB. Export and reduce long notes.");
  safeTree(value);
  const { v3, ...legacy } = value,
    base = validateState({ ...legacy, schema_version: 1 });
  for (const bucket of [
    "applications",
    "admissions",
    "documents",
    "references",
    "budgets",
    "notifications",
  ]) {
    if (!record(v3[bucket]) || Object.keys(v3[bucket]).length > 1000)
      throw Error("Invalid private " + bucket + ".");
  }
  for (const [key, row] of Object.entries(v3.applications)) {
    if (
      !validKey(key) ||
      !record(row) ||
      !safeId(row.opportunityId) ||
      !STAGES.includes(row.stage) ||
      !DECISIONS.includes(row.decision) ||
      key !== appKey(row.opportunityId, row.intake) ||
      !record(row.completedSteps)
    )
      throw Error("Invalid private application.");
    for (const [id, done] of Object.entries(row.completedSteps))
      if (!safeId(id) || typeof done !== "boolean")
        throw Error("Invalid application step.");
    if (row.updatedAt && !validInstant(row.updatedAt))
      throw Error("Invalid application timestamp.");
    if (
      row.blockedReason !== undefined &&
      (typeof row.blockedReason !== "string" || row.blockedReason.length > 500)
    )
      throw Error("Invalid application blocker.");
    if (
      row.refereeId !== undefined &&
      row.refereeId !== "" &&
      !safeId(row.refereeId)
    )
      throw Error("Invalid assigned referee.");
    if (
      row.referenceStage !== undefined &&
      ![
        "not-requested",
        "requested",
        "confirmed",
        "briefed",
        "submitted",
      ].includes(row.referenceStage)
    )
      throw Error("Invalid reference stage.");
  }
  for (const [key, row] of Object.entries(v3.admissions))
    if (
      !validKey(key) ||
      !record(row) ||
      !safeId(row.programmeId) ||
      key !== appKey(row.programmeId, row.intake) ||
      !STAGES.includes(row.stage)
    )
      throw Error("Invalid university admission.");
  for (const [id, row] of Object.entries(v3.references))
    if (
      !safeId(id) ||
      !record(row) ||
      typeof row.name !== "string" ||
      row.name.length > 120 ||
      typeof row.email !== "string" ||
      row.email.length > 254
    )
      throw Error("Invalid private referee.");
  for (const [id, row] of Object.entries(v3.documents))
    if (
      !safeId(id) ||
      !record(row) ||
      !["not-started", "preparing", "ready", "submitted", "expired"].includes(
        row.status,
      ) ||
      typeof row.version !== "string" ||
      row.version.length > 120
    )
      throw Error("Invalid document record.");
  for (const [id, row] of Object.entries(v3.notifications))
    if (
      !safeId(id) ||
      !record(row) ||
      typeof row.title !== "string" ||
      row.title.length > 300 ||
      ![
        "changed",
        "unchanged",
        "initial",
        "blocked",
        "error",
        "skipped",
      ].includes(row.status) ||
      !validInstant(row.checkedAt)
    )
      throw Error("Invalid source notice.");
  for (const [key, year] of Object.entries(v3.budgets)) {
    if (!/^[a-z0-9-]+:20[2-4]\d:[1-5]$/.test(key) || !record(year))
      throw Error("Invalid private funding estimate.");
    for (const field of [
      "stipend",
      "grants",
      "assistantship",
      "tuition",
      "fees",
      "insurance",
      "living",
    ])
      if (
        year[field] !== null &&
        (typeof year[field] !== "number" ||
          !Number.isFinite(year[field]) ||
          year[field] < 0 ||
          year[field] > 1e9)
      )
        throw Error("Invalid funding amount.");
    if (
      typeof year.assistantshipGuaranteed !== "boolean" ||
      !/^([A-Z]{3})$/.test(year.currency)
    )
      throw Error("Invalid funding estimate metadata.");
  }
  if (
    !record(v3.profile) ||
    !record(v3.preferences) ||
    !Array.isArray(v3.profile.researchAreas) ||
    !v3.profile.researchAreas.every(safeId) ||
    !(
      v3.profile.citizenship === null ||
      /^[A-Z]{2}$/.test(v3.profile.citizenship)
    ) ||
    !(
      v3.profile.cgpa === null ||
      (typeof v3.profile.cgpa === "string" && v3.profile.cgpa.length <= 32)
    ) ||
    !(
      v3.profile.graduationDate === null || validDate(v3.profile.graduationDate)
    ) ||
    (v3.profile.feeStatus !== undefined &&
      !["unknown", "international", "domestic"].includes(
        v3.profile.feeStatus,
      )) ||
    !Array.isArray(v3.preferences.preferredCountries) ||
    !v3.preferences.preferredCountries.every((c) => /^[A-Z]{2}$/.test(c)) ||
    typeof v3.preferences.allowReturnHome !== "boolean"
  )
    throw Error("Invalid private profile or preferences.");
  return { ...base, schema_version: 3, v3: structuredClone(v3) };
}
export function migrateV2(value, now = new Date().toISOString()) {
  if (!record(value) || ![undefined, 1].includes(value.schema_version))
    throw Error("Unsupported legacy workspace.");
  safeTree(value);
  const legacy = validateState({
      ...structuredClone(EMPTY_STATE),
      ...value,
      schema_version: 1,
    }),
    next = emptyState();
  Object.assign(next, legacy, { schema_version: 3 });
  next.v3.migration = { from: 2, at: now };
  if (legacy.profile?.cgpa) next.v3.profile.cgpa = legacy.profile.cgpa;
  for (const bucket of ["lifecycle", "tracking", "pins", "notes"])
    if (
      legacy[bucket]?.oxford !== undefined &&
      next[bucket]?.clarendon === undefined
    ) {
      next[bucket] ||= {};
      next[bucket].clarendon = structuredClone(legacy[bucket].oxford);
    }
  for (const [id, stage] of Object.entries(legacy.applications))
    next.v3.applications[appKey(id)] = {
      opportunityId: id,
      intake: 2027,
      stage:
        stage === "submitted"
          ? "submitted"
          : stage === "preparing"
            ? "preparing"
            : "not-started",
      decision: stage === "skipped" ? "not-pursuing" : "research",
      completedSteps: {},
      updatedAt: now,
      legacyScope: "Submission scope not confirmed by legacy data.",
    };
  return validatePrivateState(next);
}
export function parseBackup(raw) {
  if (typeof raw !== "string" || new TextEncoder().encode(raw).length > 1048576)
    throw Error("Choose a Career Track JSON backup up to 1 MB.");
  let blob;
  try {
    blob = JSON.parse(raw);
  } catch {
    throw Error("This file is not valid JSON.");
  }
  if (blob?.format === "career-track-v3-export" && blob.version === 3)
    return validatePrivateState(blob.state);
  if (blob?.format === "career-track-v2-export" && blob.version === 2)
    return migrateV2(blob.state);
  throw Error("Choose a Career Track v2 or v3 progress export.");
}
export function mergeBackup(incoming, current) {
  const source = validatePrivateState(incoming),
    target = validatePrivateState(current);
  const legacy = inspectLegacyBackup(
    { ...source, schema_version: 1, v3: undefined },
    { ...target, schema_version: 1, v3: undefined },
  );
  const next = {
    ...legacy.state,
    schema_version: 3,
    v3: structuredClone(target.v3),
  };
  let added = legacy.newItems,
    kept = legacy.keptValues;
  for (const bucket of [
    "applications",
    "admissions",
    "documents",
    "references",
    "budgets",
    "notifications",
  ])
    for (const [key, value] of Object.entries(source.v3[bucket])) {
      if (
        bucket === "applications" &&
        ["purged", "expired"].includes(
          next.lifecycle[value.opportunityId]?.status,
        )
      )
        continue;
      if (next.v3[bucket][key] === undefined) {
        next.v3[bucket][key] = value;
        added++;
      } else if (JSON.stringify(next.v3[bucket][key]) !== JSON.stringify(value))
        kept++;
    }
  for (const [key, value] of Object.entries(source.v3.profile))
    if (
      (next.v3.profile[key] === null ||
        (Array.isArray(next.v3.profile[key]) &&
          !next.v3.profile[key].length)) &&
      value !== null &&
      JSON.stringify(next.v3.profile[key]) !== JSON.stringify(value)
    ) {
      next.v3.profile[key] = value;
      added++;
    }
  return {
    state: validatePrivateState(next),
    newItems: added,
    newTicks: legacy.newTicks,
    keptValues: kept,
  };
}
export function createV3Store(onChange, storage) {
  let state = emptyState(),
    failed = false,
    corrupt = false,
    dirty = false,
    conflict = false,
    migrationRaw = null,
    rawRecovery = null,
    baseRaw = null,
    problem = "";
  try {
    storage ||= globalThis.localStorage;
    baseRaw = storage.getItem(STORAGE_KEY);
    if (baseRaw !== null) {
      rawRecovery = baseRaw;
      state = validatePrivateState(JSON.parse(baseRaw));
    } else {
      const prior = storage.getItem(V2_KEY);
      if (prior !== null) {
        rawRecovery = prior;
        state = migrateV2(JSON.parse(prior));
        migrationRaw = prior;
      }
    }
  } catch (error) {
    failed = true;
    corrupt = Boolean(rawRecovery);
    problem = corrupt
      ? "Saved progress could not be read. Export recovery data before importing a valid backup."
      : "Browser storage is unavailable. Work stays in this tab; export before closing.";
  }
  const event = () => ({
    state,
    status: failed ? "failed" : "saved",
    authorized: true,
    pending: dirty ? 1 : 0,
    clockOffset: 0,
    conflicts: [],
    storageFailed: failed,
    cacheProblem: problem,
    draftProblem: corrupt || conflict || migrationRaw !== null,
    migrationPending: migrationRaw !== null,
  });
  const emit = () => onChange(event());
  function save() {
    dirty = true;
    try {
      storage ||= globalThis.localStorage;
      const raw = JSON.stringify(state);
      storage.setItem(STORAGE_KEY, raw);
      baseRaw = raw;
      dirty = false;
      failed = false;
      problem = "";
    } catch {
      failed = true;
      problem =
        "Progress is not saved. Allow/free browser storage and Retry, or export before closing.";
    }
    emit();
  }
  function mutate(update) {
    if (event().draftProblem)
      throw Error("Back up and finish migration or recovery before editing.");
    // Read another tab's last successful write before applying this operation.
    let current;
    try {
      current = storage?.getItem(STORAGE_KEY);
    } catch {
      failed = true;
    }
    if (current !== undefined && current !== baseRaw) {
      if (dirty) {
        conflict = true;
        failed = true;
        problem =
          "Another tab changed saved data while this tab has unsaved work. Export this tab before recovery.";
        emit();
        throw Error(problem);
      }
      if (current !== null)
        try {
          state = validatePrivateState(JSON.parse(current));
          baseRaw = current;
        } catch {
          rawRecovery = current;
          corrupt = true;
          failed = true;
          problem =
            "Saved data changed but could not be read. Export recovery data before restoring a backup.";
          emit();
          throw Error(problem);
        }
    }
    const next = structuredClone(state);
    update(next);
    state = validatePrivateState(next);
    save();
  }
  const store = {
    get: event,
    load: emit,
    stop() {},
    reap() {},
    async sync() {
      if (!event().draftProblem) save();
      else emit();
    },
    change(bucket, key, value) {
      store.changeMany([
        { bucket, key: bucket === "profile" ? "current" : key, value },
      ]);
    },
    changeMany(changes) {
      mutate((next) => {
        const v3 = next.v3;
        const changed = reconcile(
          { state: { ...next, schema_version: 1, v3: undefined }, rev: 0 },
          changes.map((c) => ({ ...c, baseRev: 0 })),
        ).state;
        Object.assign(next, changed, { schema_version: 3, v3 });
      });
    },
    applyState(next) {
      mutate((target) => Object.assign(target, validatePrivateState(next)));
    },
    setApplication(id, intake, patch) {
      if (!safeId(id)) throw Error("Invalid opportunity.");
      mutate((next) => {
        const key = appKey(id, intake);
        next.v3.applications[key] = {
          opportunityId: id,
          intake,
          stage: "not-started",
          decision: "research",
          completedSteps: {},
          ...next.v3.applications[key],
          ...patch,
          updatedAt: new Date().toISOString(),
        };
      });
    },
    setStep(id, intake, step, done) {
      if (!safeId(step) || typeof done !== "boolean")
        throw Error("Invalid application step.");
      const current = state.v3.applications[appKey(id, intake)];
      store.setApplication(id, intake, {
        completedSteps: { ...current?.completedSteps, [step]: done },
      });
    },
    setAdmission(programmeId, intake, stage) {
      mutate((next) => {
        next.v3.admissions[appKey(programmeId, intake)] = {
          programmeId,
          intake,
          stage,
          updatedAt: new Date().toISOString(),
        };
      });
    },
    setDocument(id, value) {
      mutate((next) => {
        next.v3.documents[id] = value;
      });
    },
    setReference(id, value) {
      mutate((next) => {
        next.v3.references[id] = value;
      });
    },
    setProfile(value) {
      mutate((next) => {
        next.v3.profile = { ...next.v3.profile, ...value };
      });
    },
    setPreferences(value) {
      mutate((next) => {
        next.v3.preferences = { ...next.v3.preferences, ...value };
      });
    },
    setBudget(key, value) {
      mutate((next) => {
        next.v3.budgets[key] = value;
      });
    },
    setNotifications(value) {
      mutate((next) => {
        next.v3.notifications = value;
      });
    },
    bulkTrack(ids, status) {
      mutate((next) => {
        next.tracking ||= {};
        for (const id of ids) {
          if (!safeId(id)) throw Error("Invalid tracking ID.");
          if (status === null) delete next.tracking[id];
          else next.tracking[id] = status;
        }
      });
    },
    lifecycle(action, id) {
      if (
        !safeId(id) ||
        !["archive", "delete", "restore", "purge"].includes(action)
      )
        throw Error("Invalid lifecycle action.");
      mutate((next) => {
        if (action === "restore") {
          delete next.lifecycle[id];
          if (id === "clarendon") delete next.lifecycle.oxford;
          return;
        }
        const at = new Date().toISOString();
        next.lifecycle[id] =
          action === "archive"
            ? { status: "archived", at }
            : action === "delete"
              ? {
                  status: "trash",
                  at,
                  purgeAt: new Date(Date.now() + 10 * 86400000).toISOString(),
                }
              : { status: "purged", at };
        // Purge is explicit and backup-gated by the UI. No elapsed deadline destroys progress.
        if (action === "purge") {
          const ids = id === "clarendon" ? ["clarendon", "oxford"] : [id];
          for (const item of ids) {
            for (const bucket of ["notes", "pins", "tracking", "applications"])
              for (const key of Object.keys(next[bucket] || {}))
                if (
                  key === item ||
                  (bucket === "notes" && key.startsWith(item + "-essay-"))
                )
                  delete next[bucket][key];
            for (const key of Object.keys(next.progress))
              if (
                key.startsWith("sch-" + item + "-") ||
                key.startsWith("goal-" + item + "-")
              )
                delete next.progress[key];
            for (const [key, row] of Object.entries(next.v3.applications))
              if (row.opportunityId === item) delete next.v3.applications[key];
          }
          for (const key of Object.keys(next.v3.budgets))
            if (key.startsWith(id + ":")) delete next.v3.budgets[key];
          for (const key of Object.keys(next.v3.documents))
            if (key.startsWith(id + "-doc-")) delete next.v3.documents[key];
        }
      });
    },
    recoverFromBackup(incoming) {
      const validated = validatePrivateState(incoming);
      if (!corrupt && !conflict) throw Error("Recovery is not needed.");
      storage.setItem(
        "career-track:v3:recovery",
        rawRecovery || JSON.stringify(state),
      );
      state = validated;
      corrupt = false;
      conflict = false;
      save();
    },
    migrationBackup: () => ({
      format: "career-track-v2-export",
      version: 2,
      exported_at: new Date().toISOString(),
      state: { ...state, schema_version: 1, v3: undefined },
      raw_recovery: migrationRaw,
    }),
    completeMigration() {
      if (migrationRaw === null) return;
      try {
        storage.setItem("career-track:v3:pre-migration", migrationRaw);
        migrationRaw = null;
        save();
      } catch {
        failed = true;
        problem =
          "Migration backup could not be saved. Your v2 key is untouched. Export it and retry.";
        emit();
      }
    },
    export: () => ({
      format: "career-track-v3-export",
      version: 3,
      exported_at: new Date().toISOString(),
      state,
      raw_recovery: corrupt ? rawRecovery : undefined,
    }),
    parseBackup,
    previewBackup: (incoming) => mergeBackup(incoming, state),
    reloadFromBrowser() {
      if (dirty) {
        failed = true;
        conflict = true;
        problem =
          "Another tab changed the workspace while this tab has unsaved work. Export this tab before reloading.";
        emit();
        return;
      }
      try {
        const raw = storage.getItem(STORAGE_KEY);
        if (raw === null && baseRaw === null) return;
        rawRecovery = raw;
        state =
          raw === null ? emptyState() : validatePrivateState(JSON.parse(raw));
        baseRaw = raw;
        corrupt = false;
        failed = false;
        problem = "";
        emit();
      } catch {
        corrupt = true;
        failed = true;
        problem =
          "Saved data changed but could not be read. Export recovery data before reloading.";
        emit();
      }
    },
  };
  return store;
}
