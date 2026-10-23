import { record, safeId, validDate, validZone } from "../v3/schema.js";
export const V4_VERSION = 1;
export function readV4(state) {
  const saved = state.v3?.preferences?.workspaceV4;
  if (!saved)
    return {
      version: V4_VERSION,
      dismissedMatches: [],
      leads: {},
      ui: {},
      tests: {},
    };
  if (
    !record(saved) ||
    saved.version !== V4_VERSION ||
    !Array.isArray(saved.dismissedMatches) ||
    saved.dismissedMatches.length > 1000 ||
    !saved.dismissedMatches.every(
      (x) => typeof x === "string" && x.length <= 150,
    ) ||
    !record(saved.leads) ||
    !record(saved.ui) ||
    !record(saved.tests)
  )
    throw Error(
      "Unsupported V4 preferences. Export your backup and open the classic workspace.",
    );
  if (
    Object.keys(saved.leads).length > 1000 ||
    Object.entries(saved.leads).some(
      ([id, row]) =>
        !/^radar:[a-z0-9-]{1,100}$/.test(id) ||
        !record(row) ||
        typeof row.addedAt !== "string" ||
        !Number.isFinite(Date.parse(row.addedAt)) ||
        (row.note !== undefined &&
          (typeof row.note !== "string" || row.note.length > 1000)),
    )
  )
    throw Error("Invalid tracked scholarship lead.");
  if (
    Object.entries(saved.tests).some(
      ([key, value]) =>
        !["target", "booking", "result", "expires"].includes(key) ||
        typeof value !== "string" ||
        value.length > 120 ||
        (["booking", "expires"].includes(key) &&
          value !== "" &&
          !validDate(value)),
    )
  )
    throw Error("Invalid test plan.");
  if (
    saved.ui.density &&
    !["comfortable", "compact"].includes(saved.ui.density)
  )
    throw Error("Invalid display density.");
  if (saved.ui.zone && !validZone(saved.ui.zone))
    throw Error("Invalid calendar timezone.");
  return structuredClone(saved);
}
export const adapterState = (state) => ({ ...state, v4: readV4(state) });
export function updateV4(store, patch) {
  const current = readV4(store.get().state);
  const next = { ...current, ...patch, version: V4_VERSION };
  readV4({ v3: { preferences: { workspaceV4: next } } });
  store.setPreferences({ workspaceV4: next });
}
export function validatedProfile(data) {
  const displayName = String(data.get("displayName") || "").trim();
  const programme = String(data.get("programme") || "").trim();
  const citizenship =
    String(data.get("citizenship") || "")
      .trim()
      .toUpperCase() || null;
  const researchAreas = String(data.get("researchAreas") || "")
    .split(",")
    .map((x) => x.trim().toLowerCase().replace(/\s+/g, "-"))
    .filter(Boolean);
  const preferredCountries = String(data.get("preferredCountries") || "")
    .split(",")
    .map((x) => x.trim().toUpperCase())
    .filter(Boolean);
  const graduationDate = String(data.get("graduationDate") || "") || null;
  if (
    displayName.length > 80 ||
    programme.length > 120 ||
    researchAreas.length > 20 ||
    !researchAreas.every(safeId)
  )
    throw Error(
      "Use a name up to 80 characters and up to 20 comma-separated research interests.",
    );
  if (
    (citizenship && !/^[A-Z]{2}$/.test(citizenship)) ||
    !preferredCountries.every((x) => /^[A-Z]{2}$/.test(x))
  )
    throw Error("Use two-letter country codes, such as BD, GB, DE or CA.");
  if (graduationDate && !validDate(graduationDate))
    throw Error("Enter a valid graduation date.");
  return {
    profile: {
      displayName,
      programme,
      citizenship,
      researchAreas,
      cgpa: String(data.get("cgpa") || "").trim() || null,
      graduationDate,
      feeStatus: String(data.get("feeStatus") || "unknown"),
    },
    preferences: {
      preferredCountries,
      allowReturnHome: data.get("allowReturnHome") === "on",
    },
  };
}
