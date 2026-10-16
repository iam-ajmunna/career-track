import { registry, opportunityById } from "./catalog.js";
import isoCountries from "../data/iso-codes.json" with { type: "json" };
const countryCatalog = [
  ...isoCountries,
  { code: "EU", name: "Europe · multi-country routes" },
];
import { emptyState, STORAGE_KEY } from "./store.js";
import { validDate } from "./schema.js";
import { inspectLegacy } from "../sync/import.js";
import {
  renderPersonalizedGoal,
  setGoalSelection,
  setGoalFilter,
  setGoalQuery,
} from "../personalized-goal.js";
import { researchPrompt, applicationPackage } from "./prompt.js";
import { buildV3Calendar } from "./calendar.js";
import { previewContext, validateSourceReport } from "./context-import.js";
import * as view from "./views.js";
const titles = {
  overview: "Overview",
  scholarships: "Scholarship Explorer",
  countries: "Country Explorer",
  universities: "University Explorer",
  research: "Research & Supervisors",
  pipeline: "Application Pipeline",
  documents: "Documents & References",
  calendar: "Calendar",
  sources: "Research & Sources",
  profile: "My Profile",
  goal: "Personalized Goal",
  library: "Archive & History",
  settings: "Settings",
};
const $ = (id) => document.getElementById(id);
let store,
  lastEvent,
  active = "overview",
  intake = 2027,
  params = new URLSearchParams(),
  routeId = null,
  timerHandle = null,
  lastSignature = "",
  comparison = new Set(),
  compareOpen = false,
  lastListHash = "#/scholarships",
  composing = false,
  rendering = false,
  pendingBackup = null,
  pendingLegacy = null;
const drafts = new Map(),
  selectedTracking = new Set();
export function download(value, name, type = "application/json") {
  try {
    const blob = new Blob(
        [typeof value === "string" ? value : JSON.stringify(value, null, 2)],
        { type },
      ),
      url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return true;
  } catch {
    notice("Download could not start. Keep this tab open and retry.");
    return false;
  }
}
function notice(message) {
  const root = $("toastRoot");
  root.replaceChildren();
  const n = document.createElement("div");
  n.className = "toast";
  n.textContent = message;
  root.append(n);
  setTimeout(() => n.remove(), 4500);
}
function fail(error, form) {
  const text = error?.message || "Could not save. Export progress and retry.";
  if (form) {
    const n = form.querySelector("[data-form-error]");
    if (n) {
      n.textContent = text;
      n.id ||= "v3-error-" + Date.now();
      const field =
        [...form.querySelectorAll("input,select,textarea")].find(
          (x) => !x.validity.valid,
        ) || form.querySelector("input,select,textarea");
      if (field) {
        field.setAttribute("aria-invalid", "true");
        field.setAttribute("aria-describedby", n.id);
        field.focus();
      } else {
        n.tabIndex = -1;
        n.focus();
      }
      return;
    }
  }
  $("syncMessage").textContent = text;
  $("syncMessage").hidden = false;
}
function mutate(fn, success = "Saved on this device.") {
  try {
    fn();
    if (store.get().storageFailed) fail(Error(store.get().cacheProblem));
    else if (success) notice(success);
  } catch (error) {
    fail(error);
  }
}
function parseRoute() {
  const hash = location.hash.replace(/^#\/?/, "");
  const [path, query] = hash.split("?");
  params = new URLSearchParams(query || "");
  intake = params.get("intake") === "2028" ? 2028 : 2027;
  const bits = path.split("/");
  active = titles[bits[0]] ? bits[0] : "overview";
  routeId =
    active === "scholarships" && bits[1] && bits[1] !== "country"
      ? bits[1]
      : null;
  if (active === "scholarships" && bits[1] === "country") {
    if (params.get("focus") && opportunityById.has(params.get("focus")))
      routeId = params.get("focus");
    else params.set("country", bits[2] || "");
  }
  if (active === "scholarships" && !routeId)
    lastListHash = location.hash || "#/scholarships";
}
function setQuery(key, value) {
  const next = new URLSearchParams(params);
  if (value) next.set(key, value);
  else next.delete(key);
  if (key !== "page") next.delete("page");
  location.hash =
    "#/" +
    active +
    (routeId ? "/" + routeId : "") +
    (next.size ? "?" + next.toString() : "");
}
function preserve() {
  for (const n of document.querySelectorAll("[data-note-draft]")) {
    const key = n.dataset.v3Note || n.dataset.v3Essay;
    if (n.dataset.dirty === "true") drafts.set(key, n.value);
  }
}
export function prepareExport() {
  preserve();
  if (!drafts.size) return;
  const entries = [...drafts];
  store.changeMany(
    entries.map(([id, value]) => ({ bucket: "notes", key: id, value })),
  );
  drafts.clear();
}
function privateExport() {
  prepareExport();
  return store.export();
}
function restoreDrafts() {
  for (const n of document.querySelectorAll("[data-note-draft]")) {
    const key = n.dataset.v3Note || n.dataset.v3Essay;
    if (drafts.has(key)) {
      n.value = drafts.get(key);
      n.dataset.dirty = "true";
    }
  }
}
function render() {
  if (!store || rendering) return;
  rendering = true;
  preserve();
  const focused = document.activeElement;
  const selector = focused?.id
    ? "#" + CSS.escape(focused.id)
    : focused?.dataset.v3Step
      ? '[data-v3-step="' + CSS.escape(focused.dataset.v3Step) + '"]'
      : focused?.dataset.progressKey
        ? '[data-progress-key="' +
          CSS.escape(focused.dataset.progressKey) +
          '"]'
        : null;
  const state = store.get().state,
    now = Date.now();
  document
    .querySelectorAll(".view")
    .forEach((n) =>
      n.classList.toggle("active-view", n.id === "view-" + active),
    );
  document.querySelectorAll("#nav [data-view]").forEach((n) => {
    n.classList.toggle("active", n.dataset.view === active);
    if (n.dataset.view === active) n.setAttribute("aria-current", "page");
    else n.removeAttribute("aria-current");
  });
  $("pageTitle").textContent = titles[active];
  document.title =
    (routeId
      ? opportunityById.get(routeId)?.name || "Opportunity not found"
      : titles[active]) + " · Career Track V3";
  $("pageSubtitle").textContent =
    "2027+ · sourced opportunities, private application planning";
  let html = "";
  if (active === "overview") html = view.overview(state, intake, now);
  if (active === "scholarships") {
    const o = opportunityById.get(routeId);
    html = compareOpen
      ? view.comparisonView([...comparison], state, intake)
      : routeId
        ? o
          ? view.detail(o, state, intake, now)
          : '<div class="card empty"><h2>Opportunity not found</h2><a href="#/scholarships">Return to explorer</a></div>'
        : view.explorer(state, params, intake, now, comparison);
  }
  if (active === "pipeline") html = view.pipeline(state, params, intake, now);
  if (active === "countries")
    html = view.countryExplorer(
      params,
      state,
      intake,
      now,
      countryCatalog.map((c) => ({ code: c.code, name: c.name })),
    );
  if (active === "universities") html = view.universityExplorer(state, intake);
  if (active === "research") html = view.researchExplorer(state);
  if (active === "calendar") html = view.calendar(state, intake, now);
  if (active === "sources") html = view.sourcesView(state);
  if (active === "library") html = view.library(state, intake, now);
  if (active === "documents") html = view.documentsView(state);
  if (active === "profile") html = view.profileView(state);
  if (active === "settings") html = view.settings(store.get());
  if (active === "goal")
    html =
      '<div class="v3-alert"><strong>Preserved planning board</strong><p>Earlier checklists and progress are retained here. Its historical timing and funding summaries need rechecking; use the V3 explorer and guides for current verified availability.</p></div>' +
      renderPersonalizedGoal(
        state.progress,
        state.lifecycle,
        state.tracking,
        selectedTracking,
      );
  $("view-" + active).innerHTML = html;
  restoreDrafts();
  const disabled = store.get().draftProblem;
  document
    .querySelectorAll(
      "[data-v3-stage],[data-v3-decision],[data-v3-track],[data-v3-step],[data-v3-doc],[data-v3-admission],[data-v3-referee],[data-v3-refstage],[data-v3-pin],[data-v3-life],[data-progress-key],[data-v3-save-note],#v3Profile button,#v3Preferences button,[data-v3-reference] button,[data-v3-budget] button,[data-v3-blocker] button,#v3Reset button",
    )
    .forEach((n) => (n.disabled = disabled));
  if (!composing)
    $("globalSearch").value =
      active === "scholarships" ? params.get("q") || "" : "";
  $("searchClear").hidden = !$("globalSearch").value;
  if (selector) {
    const n = document.querySelector(selector);
    if (n && focused !== n) n.focus({ preventScroll: true });
  }
  if (active === "settings" && pendingBackup) showBackupPreview();
  tick();
  rendering = false;
}
function tick() {
  const now = Date.now();
  document.querySelectorAll(".active-view [data-v3-timer]").forEach((n) => {
    const d = registry.deadlines.find((d) => d.id === n.dataset.v3Timer);
    if (d) n.textContent = view.timer(d, now);
  });
}
function migrationBanner(event) {
  let n = $("v3Migration");
  if (!n) {
    n = document.createElement("section");
    n.id = "v3Migration";
    n.className = "v3-alert";
    $("syncMessage").after(n);
  }
  n.hidden = !event.migrationPending;
  if (event.migrationPending)
    n.innerHTML =
      '<strong>Your v2 progress is ready to migrate.</strong><p>Download a backup before enabling V3 edits. Your original v2 key will remain untouched.</p><button type="button" class="button secondary" data-v3-migrate>Download v2 backup & enable V3</button>';
}
export function mountApp(progressStore) {
  store = progressStore;
  for (const id of Object.keys(titles)) {
    if (!$("view-" + id)) {
      const section = document.createElement("section");
      section.id = "view-" + id;
      section.className = "view";
      $("view-settings").after(section);
    }
  }
  $("nav").innerHTML = Object.entries(titles)
    .map(
      ([id, title]) =>
        `<button type="button" class="nav-item" data-view="${id}"><span>${view.e(title)}</span>${{ overview: 1, scholarships: 2, pipeline: 3, documents: 4, profile: 5, settings: 6, goal: 7, library: 8 }[id] ? "<kbd>" + { overview: 1, scholarships: 2, pipeline: 3, documents: 4, profile: 5, settings: 6, goal: 7, library: 8 }[id] + "</kbd>" : ""}</button>`,
    )
    .join("");
  parseRoute();
  render();
  timerHandle = setInterval(() => {
    if (!document.hidden) {
      tick();
      if (Math.floor(Date.now() / 60000) !== Math.floor(lastClock / 60000)) {
        lastClock = Date.now();
        if (
          !document.querySelector("input:focus,textarea:focus,select:focus") &&
          !drafts.size
        )
          render();
      }
    }
  }, 1000);
}
let lastClock = Date.now();
export function updateWorkspace(event) {
  lastEvent = event;
  migrationBanner(event);
  const sig = JSON.stringify(event.state) + event.draftProblem;
  if (sig !== lastSignature) {
    lastSignature = sig;
    render();
  }
}
export function hideWorkspace() {
  clearInterval(timerHandle);
}
window.addEventListener("hashchange", () => {
  preserve();
  try {
    prepareExport();
  } catch (error) {
    fail(error);
  }
  compareOpen = false;
  pendingBackup = null;
  parseRoute();
  render();
  window.scrollTo({ top: 0, behavior: "instant" });
});
window.addEventListener("focus", tick);
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) tick();
});
function theme() {
  const dark = document.documentElement.dataset.theme !== "dark";
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  try {
    localStorage.setItem("scholarship-theme", dark ? "dark" : "light");
  } catch {}
  syncTheme();
}
function syncTheme() {
  const dark = document.documentElement.dataset.theme === "dark";
  $("themeToggle").setAttribute("aria-pressed", String(dark));
  $("themeToggle").setAttribute(
    "aria-label",
    dark ? "Switch to light theme" : "Switch to dark theme",
  );
}
$("themeToggle").addEventListener("click", theme);
syncTheme();
$("nav").addEventListener("click", (ev) => {
  const n = ev.target.closest("[data-view]");
  if (n) location.hash = "#/" + n.dataset.view;
});
function search() {
  if (composing) return;
  const next = new URLSearchParams(
    active === "scholarships" && !routeId ? params : undefined,
  );
  const query = $("globalSearch").value.slice(0, 120);
  if (query) next.set("q", query);
  else next.delete("q");
  next.delete("page");
  history.replaceState(
    null,
    "",
    "#/scholarships" + (next.size ? "?" + next : " ").trim(),
  );
  active = "scholarships";
  routeId = null;
  params = next;
  compareOpen = false;
  lastListHash = location.hash;
  render();
  $("globalSearch").focus({ preventScroll: true });
}
$("globalSearch").addEventListener(
  "compositionstart",
  () => (composing = true),
);
$("globalSearch").addEventListener("compositionend", () => {
  composing = false;
  search();
});
$("globalSearch").addEventListener("input", search);
$("searchClear").addEventListener("click", () => {
  $("globalSearch").value = "";
  search();
});
$("dialogClose").addEventListener("click", () =>
  $("scholarshipDialog").close(),
);
function confirmAction(title, description, action, fn) {
  const d = $("confirmDialog");
  $("confirmTitle").textContent = title;
  $("confirmDescription").textContent = description;
  $("confirmAction").textContent = action;
  $("confirmAction").onclick = () => {
    try {
      fn();
      d.close();
    } catch (error) {
      fail(error);
      d.close();
    }
  };
  d.showModal();
  d.querySelector('[value="cancel"]').focus();
}
function showText(title, text) {
  $("dialogContent").innerHTML =
    `<div class="dialog-body"><h2 id="scholarshipDialogTitle">${view.e(title)}</h2><p>Copy the text below or download it. No private profile or correspondence is included in this research prompt.</p><label class="field"><span>Research prompt</span><textarea class="resize-none" rows="16" readonly id="v3PromptText">${view.e(text)}</textarea></label><button type="button" class="button secondary" id="v3PromptDownload">Download prompt</button></div>`;
  $("scholarshipDialog").showModal();
  $("v3PromptText").select();
  $("v3PromptDownload").onclick = () =>
    download(text, "career-track-research-prompt.txt", "text/plain");
}
document.addEventListener("click", async (ev) => {
  if (!store) return;
  const target = ev.target.closest("button,a");
  if (!target || target.disabled) return;
  const d = target.dataset,
    state = store.get().state;
  if ("v3Migrate" in d) {
    if (
      download(store.migrationBackup(), "career-track-v2-before-migration.json")
    )
      store.completeMigration();
    return;
  }
  if (d.v3Pin) {
    mutate(() => store.change("pins", d.v3Pin, !state.pins[d.v3Pin]));
    return;
  }
  if (d.v3Life) {
    const id = d.id,
      o = opportunityById.get(id);
    if (d.v3Life === "delete" || d.v3Life === "purge") {
      const purge = d.v3Life === "purge";
      confirmAction(
        purge
          ? "Permanently purge " + o.name + "?"
          : "Move " + o.name + " to Trash?",
        purge
          ? "A complete backup downloads first. This permanently clears its private application progress from V3."
          : "Your notes and progress remain recoverable in Archive & History until an explicit purge.",
        purge ? "Export backup & purge" : "Move to Trash",
        () => {
          if (
            !purge ||
            download(privateExport(), "career-track-before-purge.json")
          )
            mutate(() => store.lifecycle(d.v3Life, id));
        },
      );
    } else
      mutate(
        () => store.lifecycle(d.v3Life, id),
        d.v3Life === "restore"
          ? "Restored."
          : "Archived. Restore from Archive & History.",
      );
    return;
  }
  if ("v3ClearFilters" in d) {
    location.hash = "#/scholarships?intake=" + intake;
    return;
  }
  if (d.v3Page) {
    setQuery("page", d.v3Page);
    return;
  }
  if ("v3ShowCompare" in d) {
    compareOpen = true;
    render();
    return;
  }
  if ("v3CompareBack" in d) {
    compareOpen = false;
    render();
    return;
  }
  if (d.v3Prompt || d.v3Gpt) {
    const o = opportunityById.get(d.v3Prompt || d.v3Gpt);
    if (!o) return;
    const prompt = researchPrompt(o, registry);
    if (d.v3Gpt) {
      const a = document.createElement("a");
      a.href = "https://chatgpt.com/?q=" + encodeURIComponent(prompt);
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.click();
    }
    try {
      await navigator.clipboard.writeText(prompt);
      notice("Scholarship-specific research prompt copied.");
    } catch {
      showText("Research prompt · " + o.name, prompt);
    }
    return;
  }
  if (d.v3Package) {
    const o = opportunityById.get(d.v3Package);
    download(
      applicationPackage(o, registry, state, intake),
      o.id + "-" + intake + "-private-application.md",
      "text/markdown",
    );
    return;
  }
  if (d.v3Ics) {
    const rows = registry.deadlines.filter(
      (x) =>
        x.intake === intake &&
        (d.v3Ics === "all" || x.opportunityId === d.v3Ics),
    );
    if (!rows.some((x) => ["exact", "date-only"].includes(x.precision))) {
      notice("No verified dates to export for this route.");
      return;
    }
    download(
      buildV3Calendar(rows, registry.sources),
      "career-track-" + intake + "-deadlines.ics",
      "text/calendar",
    );
    return;
  }
  if (d.v3SaveNote) {
    const key = d.v3SaveNote,
      n = document.querySelector(
        `[data-v3-note="${CSS.escape(key)}"],[data-v3-essay="${CSS.escape(key)}"]`,
      );
    if (!n) return;
    try {
      store.change("notes", key, n.value);
      drafts.delete(key);
      n.dataset.dirty = "false";
      notice(
        store.get().storageFailed
          ? "Note is only in this tab — Retry or export."
          : "Private note saved.",
      );
    } catch (error) {
      fail(error);
    }
    return;
  }
  if ("v3PickBackup" in d) {
    $("v3BackupFile").click();
    return;
  }
  if ("v3CommitBackup" in d && pendingBackup) {
    try {
      const b = pendingBackup;
      if (b.kind === "context") {
        if (
          !download(privateExport(), "career-track-before-context-import.json")
        )
          return;
        store.applyState(
          previewContext(b.raw, store.get().state, registry).state,
        );
      } else if (store.get().draftProblem) {
        if (
          !download(
            privateExport(),
            "career-track-recovery-before-restore.json",
          )
        )
          return;
        store.recoverFromBackup(b.state);
      } else store.applyState(store.previewBackup(b.state).state);
      pendingBackup = null;
      render();
      $("v3BackupReport").textContent = store.get().storageFailed
        ? "Imported into this tab; Retry or export before closing."
        : "Import saved. Existing v2 data is untouched.";
    } catch (error) {
      $("v3BackupReport").textContent = error.message;
    }
    return;
  }
  if ("v3CancelBackup" in d) {
    pendingBackup = null;
    $("v3BackupReport").textContent = "Import cancelled.";
    return;
  }
  if ("v3LegacyPreview" in d) {
    pendingLegacy = inspectLegacy(localStorage, state);
    $("v3LegacyReport").innerHTML =
      `<p>${pendingLegacy.newItems} items; ${pendingLegacy.newTicks} completed ticks. ${view.e(pendingLegacy.errors.join(" "))}</p>${pendingLegacy.changes.length ? '<button class="button secondary" type="button" data-v3-legacy-commit>Import older progress</button>' : ""}`;
    return;
  }
  if ("v3LegacyCommit" in d && pendingLegacy) {
    mutate(
      () =>
        store.changeMany(
          inspectLegacy(localStorage, store.get().state).changes,
        ),
      "Older browser progress imported.",
    );
    pendingLegacy = null;
    return;
  }
  if ("v3PickReport" in d) {
    $("v3ReportFile").click();
    return;
  }
  // Preserved planning board controls use the same validated storage.
  if (d.goalSelect) {
    setGoalSelection(d.goalSelect);
    render();
    return;
  }
  if (d.goalFilter) {
    setGoalFilter(d.goalFilter);
    render();
    return;
  }
  if (d.openScholarship) {
    location.hash = "#/scholarships/" + d.openScholarship;
    return;
  }
  if (d.openGpt) {
    const o = opportunityById.get(d.openGpt);
    if (o) showText("Research prompt", researchPrompt(o, registry));
    return;
  }
  if ("trackSelectVisible" in d) {
    document
      .querySelectorAll(".active-view [data-track-select]")
      .forEach((n) => selectedTracking.add(n.dataset.trackSelect));
    render();
    return;
  }
  if ("trackClearSelection" in d) {
    selectedTracking.clear();
    render();
    return;
  }
  if (d.trackBulk && selectedTracking.size) {
    mutate(() =>
      store.bulkTrack(
        [...selectedTracking],
        d.trackBulk === "none" ? null : d.trackBulk,
      ),
    );
    selectedTracking.clear();
    render();
    return;
  }
  if (d.lifeAction) {
    if (d.lifeAction === "delete")
      confirmAction(
        "Move this planning route to Trash?",
        "Progress remains recoverable until you explicitly purge it.",
        "Move to Trash",
        () => mutate(() => store.lifecycle("delete", d.lifeId)),
      );
    else mutate(() => store.lifecycle(d.lifeAction, d.lifeId));
    return;
  }
});
document.addEventListener("input", (ev) => {
  const n = ev.target;
  if (n.matches("[data-note-draft]")) {
    n.dataset.dirty = "true";
    drafts.set(n.dataset.v3Note || n.dataset.v3Essay, n.value);
  }
  if (n.id === "goalSearch" && !ev.isComposing) {
    const pos = n.selectionStart;
    setGoalQuery(n.value);
    render();
    const fresh = $("goalSearch");
    fresh?.focus();
    fresh?.setSelectionRange(pos, pos);
  }
});
document.addEventListener("change", (ev) => {
  if (!store) return;
  const n = ev.target,
    d = n.dataset;
  if (d.v3Filter !== undefined) {
    setQuery(n.name, n.value);
    return;
  }
  if (d.v3Intake !== undefined) {
    setQuery("intake", n.value);
    return;
  }
  if (d.v3PipelineStage !== undefined) {
    setQuery("stage", n.value);
    return;
  }
  if (d.v3Compare) {
    if (n.checked && comparison.size >= 4) {
      n.checked = false;
      notice("Compare up to four routes at a time.");
      return;
    }
    if (n.checked) comparison.add(d.v3Compare);
    else comparison.delete(d.v3Compare);
    render();
    return;
  }
  if (d.v3Stage)
    mutate(() => store.setApplication(d.v3Stage, intake, { stage: n.value }));
  if (d.v3Decision)
    mutate(() =>
      store.setApplication(d.v3Decision, intake, { decision: n.value }),
    );
  if (d.v3Track)
    mutate(() =>
      store.bulkTrack([d.v3Track], n.value === "none" ? null : n.value),
    );
  if (d.v3Step)
    mutate(
      () => store.setStep(d.id, intake, d.v3Step, n.checked),
      "Checklist saved.",
    );
  if (d.progressKey)
    mutate(
      () => store.change("progress", d.progressKey, n.checked),
      "Checklist saved.",
    );
  if(d.v3DocVersion)mutate(()=>store.setDocument(d.v3DocVersion,{status:store.get().state.v3.documents[d.v3DocVersion]?.status||'not-started',version:n.value}));
  if (d.v3Admission)
    mutate(() => store.setAdmission(d.v3Admission, intake, n.value));
  if (d.v3Doc)
    mutate(() =>
      store.setDocument(d.v3Doc, {
        ...store.get().state.v3.documents[d.v3Doc],
        status: n.value,
        version: store.get().state.v3.documents[d.v3Doc]?.version || "",
      }),
    );
  if (d.v3Referee)
    mutate(() =>
      store.setApplication(d.v3Referee, intake, { refereeId: n.value }),
    );
  if (d.v3Refstage)
    mutate(() =>
      store.setApplication(d.v3Refstage, intake, { referenceStage: n.value }),
    );
  if (d.trackSelect) {
    if (n.checked) selectedTracking.add(d.trackSelect);
    else selectedTracking.delete(d.trackSelect);
    render();
    return;
  }
  if (d.trackStatusId)
    mutate(() =>
      store.bulkTrack([d.trackStatusId], n.value === "none" ? null : n.value),
    );
});
document.addEventListener("change", async (ev) => {
  const n = ev.target;
  if (!["v3BackupFile", "v3ReportFile"].includes(n.id)) return;
  const file = n.files?.[0],
    report = $(n.id === "v3BackupFile" ? "v3BackupReport" : "v3ReportStatus");
  if (!file) return;
  report.textContent = "Checking " + file.name + "…";
  try {
    if (!file.size || file.size > 1048576 || !file.name.endsWith(".json"))
      throw Error("Choose one non-empty JSON file up to 1 MB.");
    const raw = await file.text();
    if (!n.isConnected) return;
    if (n.id === "v3ReportFile") {
      const notices = validateSourceReport(raw, registry);
      store.setNotifications(notices);
      notice("Source review report imported on this device.");
      render();
    } else {
      const parsed = JSON.parse(raw);
      pendingBackup =
        parsed?.format === "career-track-private-context"
          ? { kind: "context", raw, name: file.name }
          : { kind: "backup", state: store.parseBackup(raw), name: file.name };
      showBackupPreview();
    }
  } catch (error) {
    report.textContent = error.message;
    pendingBackup = null;
  }
  n.value = "";
});
function showBackupPreview() {
  const report = $("v3BackupReport"),
    b = pendingBackup;
  if (!report || !b) return;
  try {
    let text;
    if (b.kind === "context") {
      const p = previewContext(b.raw, store.get().state, registry);
      text =
        "<p>Private planning context proposes these explicit updates:</p><ul>" +
        p.changes.map((x) => "<li>" + view.e(x) + "</li>").join("") +
        "</ul><p>A complete current backup downloads before these updates.</p>";
    } else if (store.get().migrationPending)
      throw Error(
        "Finish the v2 backup/migration first, then choose this backup again.",
      );
    else if (store.get().draftProblem)
      text =
        "<p>Recovery replaces the unreadable V3 workspace with this validated backup. Recovery bytes download first and remain saved separately.</p>";
    else {
      const p = store.previewBackup(b.state);
      text = `<p>${p.newItems} items added, ${p.newTicks} completed ticks; ${p.keptValues} conflicts keep current values.</p>`;
    }
    report.innerHTML = `<h4>${view.e(b.name)}</h4>${text}<div class="card-actions"><button class="button secondary" type="button" data-v3-commit-backup>Apply previewed import</button><button class="button ghost" type="button" data-v3-cancel-backup>Cancel</button></div>`;
  } catch (error) {
    report.textContent = error.message;
  }
}
document.addEventListener("submit", (ev) => {
  const form = ev.target;
  if (!store) return;
  if (form.matches("[data-v3-country-search]")) {
    ev.preventDefault();
    const q = new FormData(form).get("q");
    location.hash = "#/countries" + (q ? "?q=" + encodeURIComponent(q) : "");
    return;
  }
  if (
    !form.matches(
      "#v3Profile,#v3Preferences,#v3Reset,[data-v3-budget],[data-v3-reference],[data-v3-blocker]",
    )
  )
    return;
  ev.preventDefault();
  const data = new FormData(form);
  try {
    if (store.get().draftProblem)
      throw Error("Finish migration or recovery before editing.");
    if (form.id === "v3Profile") {
      const citizenship = String(data.get("citizenship")).trim().toUpperCase(),
        graduationDate = String(data.get("graduationDate"));
      if (citizenship && !/^[A-Z]{2}$/.test(citizenship))
        throw Error("Use a two-letter citizenship code, such as BD.");
      if (graduationDate && !validDate(graduationDate))
        throw Error(
          "Choose a real graduation date or leave it blank until confirmed.",
        );
      store.setProfile({
        citizenship: citizenship || null,
        cgpa: String(data.get("cgpa")).trim() || null,
        graduationDate: graduationDate || null,
        feeStatus: String(data.get("feeStatus")),
        researchAreas: data.getAll("area"),
      });
    }
    if (form.id === "v3Preferences") {
      const countries = String(data.get("countries"))
        .toUpperCase()
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean);
      if (countries.some((c) => !/^[A-Z]{2}$/.test(c)))
        throw Error("Use comma-separated two-letter country codes.");
      store.setPreferences({
        preferredCountries: [...new Set(countries)],
        allowReturnHome: data.has("allowReturnHome"),
      });
    }
    if (form.dataset.v3Budget) {
      const b = {
        currency: String(data.get("currency")),
        assistantshipGuaranteed: data.has("assistantshipGuaranteed"),
      };
      for (const field of [
        "stipend",
        "grants",
        "assistantship",
        "tuition",
        "fees",
        "insurance",
        "living",
      ]) {
        const raw = String(data.get(field)).trim();
        b[field] = raw === "" ? null : Number(raw);
        if (
          b[field] !== null &&
          (!Number.isFinite(b[field]) || b[field] < 0 || b[field] > 1e9)
        )
          throw Error(
            "Use a non-negative annual amount or leave unknown values blank.",
          );
      }
      store.setBudget(form.dataset.v3Budget, b);
    }
    if (form.dataset.v3Reference) {
      const name = String(data.get("name")).trim(),
        email = String(data.get("email")).trim();
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        throw Error("Enter a valid email address or leave it blank.");
      store.setReference(form.dataset.v3Reference, { name, email });
    }
    if (form.dataset.v3Blocker)
      store.setApplication(form.dataset.v3Blocker, intake, {
        blockedReason: String(data.get("blockedReason")).trim(),
      });
    if (form.id === "v3Reset") {
      if (data.get("word") !== "RESET")
        throw Error("Type RESET exactly to clear this V3 copy.");
      confirmAction(
        "Reset this V3 workspace?",
        "A complete backup downloads first. Original v2 and older keys remain untouched.",
        "Export backup & reset",
        () => {
          if (download(privateExport(), "career-track-before-v3-reset.json"))
            store.applyState(emptyState());
        },
      );
      return;
    }
    notice(
      store.get().storageFailed
        ? "Changes remain in this tab. Retry or export before closing."
        : "Saved on this device.",
    );
  } catch (error) {
    fail(error, form);
  }
});
document.addEventListener("keydown", (ev) => {
  if (
    ev.isComposing ||
    ev.keyCode === 229 ||
    document.querySelector("dialog[open]") ||
    ["INPUT", "SELECT", "TEXTAREA"].includes(document.activeElement?.tagName) ||
    document.activeElement?.isContentEditable
  )
    return;
  const keys = [
    "overview",
    "scholarships",
    "pipeline",
    "documents",
    "profile",
    "settings",
    "goal",
    "library",
  ];
  if (/^[1-8]$/.test(ev.key)) location.hash = "#/" + keys[Number(ev.key) - 1];
  if (ev.key === "/") {
    ev.preventDefault();
    location.hash = "#/scholarships";
    $("globalSearch").focus();
  }
});
window.addEventListener("beforeunload", (ev) => {
  if (drafts.size) {
    ev.preventDefault();
    ev.returnValue = "";
  }
});
