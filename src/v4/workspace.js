import {
  registry,
  opportunityById,
  sourceById,
  countryName,
  loadGuide,
} from "./catalog.js";
import isoCodes from "../data/iso-codes.json" with { type: "json" };
import demoProfile from "../../data/demo/profile.json" with { type: "json" };
import { emptyState, STORAGE_KEY } from "../v3/store.js";
import { opportunityFacts, readiness, applicationFor } from "../v3/domain.js";
import { mergePrefs } from "../lib/requirements.js";
import { parseRoute, buildRoute, KEY_TO_VIEW } from "../app/router.js";
import { createTicker } from "../app/ticker.js";
import { toast, wireToasts } from "../app/toast.js";
import { html } from "../ui/html.js";
import { icons } from "../ui/icons.js";
import { hydrate } from "../ui/components.js";
import { createAdapter, profileFromState } from "./adapter.js";
import { readV4, updateV4, adapterState, validatedProfile } from "./state.js";
import { dashboard, countdownView } from "../features/dashboard/view.js";
import { countdownModel, pad2, ymd } from "../features/dashboard/countdown.js";
import { scholarships } from "../features/scholarships/countries-tiers.js";
import { drawerView } from "../features/scholarships/drawer.js";
import { calendarView, registryEvents } from "../features/calendar/view.js";
import { shiftMonth, toEvents } from "../features/calendar/grid.js";
import { documentsView, documentRecord } from "../features/documents/view.js";
import { settingsView } from "../features/settings/view.js";
import { buildV4Calendar } from "../features/calendar/export.js";
const $ = (id) => document.getElementById(id);
const api = createAdapter({ opportunityFacts, readiness, registry });
const titles = {
  dashboard: ["Dashboard", "Your next move, at a glance"],
  scholarships: ["Scholarships", "Where to apply and what you give up"],
  calendar: ["Calendar", "When things open and close"],
  documents: ["Documents", "Your application dossier"],
  settings: ["Settings", "Profile, data and preferences"],
};
const drafts = new Map(),
  formDrafts = new Map(),
  guides = new Map(),
  guideErrors = new Map(),
  fetching = new Set();
let currentIntake = 2027;
try {
  const value = Number(sessionStorage.getItem("career-track:intake"));
  if ([2027, 2028].includes(value)) currentIntake = value;
} catch {}
let store,
  event,
  route,
  ctx,
  drawerId,
  drawerTab = "overview",
  opener,
  mounted = false,
  importState,
  lastRoute = "",
  lastBand = "",
  dialogAction;
const ticker = createTicker();
export const isDemo = () =>
  new URLSearchParams(location.search).get("demo") === "1" ||
  new URLSearchParams(location.hash.split("?")[1]).get("demo") === "1";
export function demoStorage() {
  if (!isDemo()) return undefined;
  const state = emptyState();
  state.v3.profile = { ...state.v3.profile, ...demoProfile };
  state.v3.preferences = {
    ...state.v3.preferences,
    preferredCountries: demoProfile.preferredCountries,
    allowReturnHome: demoProfile.allowReturnHome,
  };
  const eligible = registry.opportunities
    .map((o) => opportunityFacts(o, registry, state, Date.now(), 2027))
    .filter((r) => r.window.status === "open")
    .slice(0, 4);
  eligible.forEach(
    (r, i) =>
      (state.v3.applications[r.opportunity.id + ":2027"] = {
        opportunityId: r.opportunity.id,
        intake: 2027,
        stage: i === 3 ? "submitted" : "preparing",
        decision: "apply",
        completedSteps: {},
      }),
  );
  const memory = new Map([[STORAGE_KEY, JSON.stringify(state)]]);
  return {
    getItem: (k) => memory.get(k) ?? null,
    setItem: (k, v) => memory.set(k, v),
    removeItem: (k) => memory.delete(k),
  };
}
function context() {
  const state = event.state,
    v4 = readV4(state),
    intake = currentIntake,
    now = Date.now(),
    zone = v4.ui.zone || "Asia/Dhaka";
  const d = api.dashboard(adapterState(state), { intake, now }),
    rows = d.rows,
    mine = new Set(
      Object.values(d.model.lanes)
        .flat()
        .map((r) => r.opportunity.id),
    );
  return {
    state,
    v4,
    intake,
    now,
    zone,
    route,
    api,
    registry,
    rows,
    mine,
    dashboard: d,
    drafts,
    countryName,
    sourceById,
    radar: registry.radar,
    events: toEvents(registryEvents(registry, intake, v4.tests), zone),
    isoCountries: isoCodes.map((c) =>
      typeof c === "string" ? { code: c } : c,
    ),
  };
}
function rememberForms() {
  if (!mounted || !lastRoute) return;
  for (const root of [$("main"), $("drawer")])
    for (const form of root.querySelectorAll("form[data-dirty]")) {
      const key =
        lastRoute +
        "|" +
        (form.dataset.profileForm !== undefined
          ? "profile"
          : form.dataset.testsForm !== undefined
            ? "tests"
            : form.dataset.referenceForm || "new-reference");
      formDrafts.set(
        key,
        [...form.elements]
          .filter((el) => el.name && el.type !== "file")
          .map((el) => [
            el.name,
            el.type === "checkbox" ? el.checked : el.value,
          ]),
      );
    }
}
function restoreForms() {
  for (const form of $("main").querySelectorAll("form")) {
    const key =
      route.canonical +
      "|" +
      (form.dataset.profileForm !== undefined
        ? "profile"
        : form.dataset.testsForm !== undefined
          ? "tests"
          : form.dataset.referenceForm || "new-reference");
    for (const [name, value] of formDrafts.get(key) || []) {
      const el = form.elements.namedItem(name);
      if (el) {
        if (el.type === "checkbox") el.checked = value;
        else el.value = value;
        form.dataset.dirty = "";
        form.dataset.noteDirty = "";
      }
    }
  }
}
function focusSnapshot() {
  const el = document.activeElement;
  if (!el?.matches("input,select,textarea,button")) return null;
  const attrs = [...el.attributes].filter(
    (a) => a.name.startsWith("data-") && a.name !== "data-note-dirty",
  );
  const selector = attrs.length
    ? "[" + attrs[0].name + '="' + CSS.escape(attrs[0].value) + '"]'
    : el.id
      ? "#" + el.id
      : null;
  return selector ? { selector, selection: el.selectionStart } : null;
}
function render({ focus = false } = {}) {
  if (!event) return;
  rememberForms();
  const snap = focusSnapshot();
  route = parseRoute(location.hash);
  if (route.redirected) {
    history.replaceState(
      null,
      "",
      location.pathname + location.search + route.canonical,
    );
  }
  ctx = context();
  const [title, sub] = titles[route.view];
  $("pageTitle").textContent = title;
  $("pageSub").textContent = sub;
  document.title = title + " · Career Track";
  document.querySelectorAll("[data-nav]").forEach((a) => {
    if (a.dataset.nav === route.view) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });
  $("globalSearch").value = route.query.q || "";
  $("searchClear").hidden = !$("globalSearch").value;
  const profile = profileFromState(ctx.state),
    name = profile.displayName || "Your profile";
  $("accountAvatar").textContent =
    profile.displayName
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((x) => x[0])
      .join("")
      .toUpperCase() || "?";
  $("accountName").textContent = name;
  $("intakeSelect").value = String(ctx.intake);
  $("navCountScholarships").textContent = ctx.mine.size;
  $("navCountScholarships").hidden = !ctx.mine.size;
  $("freshnessText").textContent =
    "Registry checked " +
    registry.opportunities
      .map((o) => o.verification.checkedAt.slice(0, 10))
      .sort()
      .at(-1);
  $("nextCheckText").textContent = "Review current calls before applying";
  document.documentElement.dataset.density = ctx.v4.ui.density || "comfortable";
  const view = {
    dashboard,
    scholarships,
    calendar: calendarView,
    documents: documentsView,
    settings: settingsView,
  }[route.view];
  const pending = event.migrationPending
    ? html`<div class="banner">
        <p>V2 progress is preserved. Download a backup to finish migration.</p>
        <button
          class="btn btn--secondary"
          type="button"
          data-complete-migration
        >
          Back up & continue
        </button>
      </div>`
    : event.draftProblem
      ? html`<div class="inline-error" role="alert">
          ${event.cacheProblem}<a href="/classic/#/settings"
            >Open recovery tools</a
          >
        </div>`
      : "";
  $("main").innerHTML =
    html`${isDemo() ? html`<div class="banner"><span>Demo mode · Alex Morgan · changes stay in this tab.</span><a href="${location.pathname}">Open my workspace</a></div>` : ""}${pending}${view(ctx)}`;
  restoreForms();
  hydrate($("main"));
  const wanted =
    route.query.focus ||
    (route.segments[0] === "detail" ? route.segments[1] : null);
  if (wanted && opportunityById.has(wanted)) {
    if (drawerId !== wanted) {
      opener = document.activeElement;
      drawerTab = [
        "overview",
        "requirements",
        "funding",
        "documents",
        "timeline",
        "sources",
      ].includes(route.query.tab)
        ? route.query.tab
        : "overview";
      drawerId = wanted;
    }
    renderDrawer();
  } else {
    if (wanted)
      toast("Scholarship not found. Browse countries to choose another.");
    hideDrawer();
  }
  document
    .querySelectorAll(
      '[data-add-to-list],[data-document-status],[data-application-step],[data-field],form button[type="submit"],[data-lifecycle],[data-reset-workspace]',
    )
    .forEach((n) => (n.disabled = event.draftProblem));
  lastRoute = route.canonical;
  if (focus && !drawerId) $("pageTitle").focus({ preventScroll: true });
  else if (snap) {
    const el = document.querySelector(snap.selector);
    el?.focus({ preventScroll: true });
    if (
      snap.selection !== null &&
      el?.setSelectionRange &&
      ["text", "search", ""].includes(el.type)
    )
      el.setSelectionRange(snap.selection, snap.selection);
  }
  if (route.query.section === "matches")
    $("matches")?.scrollIntoView({ block: "start" });
}
function renderDrawer() {
  const row = ctx.rows.find((r) => r.opportunity.id === drawerId);
  if (!row) return;
  const wasHidden = $("drawer").hidden,
    oldFocus = focusSnapshot();
  $("drawer").innerHTML = drawerView(
    ctx,
    row,
    drawerTab,
    guides.get(drawerId),
    guideErrors.get(drawerId),
  );
  $("drawer").hidden = false;
  $("scrim").hidden = false;
  $("appShell").inert = true;
  document.body.classList.add("has-drawer");
  hydrate($("drawer"));
  if (wasHidden) $("drawer").querySelector("[data-close-drawer]").focus();
  else if (oldFocus)
    $("drawer")
      .querySelector(oldFocus.selector)
      ?.focus({ preventScroll: true });
  if (
    drawerTab !== "overview" &&
    !guides.has(drawerId) &&
    !fetching.has(drawerId) &&
    !guideErrors.has(drawerId)
  )
    fetchGuide(drawerId);
}
async function fetchGuide(id) {
  fetching.add(id);
  try {
    guides.set(id, await loadGuide(id));
    guideErrors.delete(id);
  } catch (e) {
    guideErrors.set(id, e.message);
  } finally {
    fetching.delete(id);
    if (drawerId === id) {
      ctx = context();
      renderDrawer();
    }
  }
}
function hideDrawer() {
  if (!$("drawer").hidden) {
    $("drawer").hidden = true;
    $("scrim").hidden = true;
    $("appShell").inert = false;
    document.body.classList.remove("has-drawer");
    const target = opener?.isConnected
      ? opener
      : document.querySelector(
          '[data-open-opportunity="' + CSS.escape(drawerId || "") + '"]',
        );
    target?.focus({ preventScroll: true });
  }
  drawerId = null;
}
function query(patch, replace = false) {
  const q = { ...route.query, ...patch };
  const url = buildRoute(route.view, route.segments, q);
  if (replace) {
    history.replaceState(null, "", location.pathname + location.search + url);
    render();
  } else location.hash = url;
}
function openDrawer(id, tab) {
  if (!opportunityById.has(id)) return;
  opener = document.activeElement;
  drawerTab = tab || "overview";
  query({ focus: id, tab: drawerTab });
}
function closeDrawer() {
  const id = drawerId;
  query({ focus: null, tab: null }, true);
  if (route.segments[0] === "detail") location.hash = "#/scholarships";
  else
    document
      .querySelector('[data-open-opportunity="' + CSS.escape(id || "") + '"]')
      ?.focus({ preventScroll: true });
}
function saveNotice(message) {
  if (store.get().storageFailed)
    toast(
      "Could not save. Keep this tab open, export a backup and retry.",
      null,
      true,
    );
  else toast(isDemo() ? "Demo updated in this tab" : message);
}
function download(value, name, type = "application/json") {
  const a = document.createElement("a"),
    url = URL.createObjectURL(
      new Blob(
        [typeof value === "string" ? value : JSON.stringify(value, null, 2)],
        { type },
      ),
    );
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function prepareExport() {
  for (const [id, note] of drafts) {
    if (ctx.state.notes[id] !== note) store.change("notes", id, note);
  }
  drafts.clear();
  document
    .querySelectorAll("[data-private-note]")
    .forEach((n) => n.removeAttribute("data-note-dirty"));
}
function backup() {
  prepareExport();
  download(store.export(), "career-track-" + ymd(Date.now(), "UTC") + ".json");
}
function confirmAction(title, message, word, action) {
  dialogAction = action;
  $("actionDialog").innerHTML = html`<form
    method="dialog"
    class="stack"
    novalidate
  >
    <h2 id="actionTitle">${title}</h2>
    <p id="actionDescription">${message}</p>
    ${word ? html`<label class="field"><span>Type ${word} to confirm</span><input name="confirmation" autocomplete="off" data-confirm-word="${word}" /></label>` : ""}
    <p class="form-error" role="alert" hidden></p>
    <div class="hero__actions">
      <button type="button" class="btn btn--secondary" data-cancel-action>
        Cancel</button
      ><button type="submit" class="btn btn--danger">${title}</button>
    </div>
  </form>`;
  $("actionDialog").showModal();
  $("actionDialog").querySelector("[data-cancel-action]").focus();
}
function mutate(fn, message) {
  try {
    fn();
    if (message) saveNotice(message);
  } catch (e) {
    toast(e.message, null, true);
  }
}
function onClick(e) {
  const t = e.target.closest("button,a");
  if (!t) return;
  if (t.dataset.tab) {
    const key = t.dataset.value,
      kind = t.dataset.tab;
    if (kind === "drawer") {
      drawerTab = key;
      query({ tab: key }, true);
      $("detail-" + key)?.focus();
    }
    if (kind === "scholarships")
      location.hash = buildRoute(
        "scholarships",
        key === "country" ? [] : [key],
        { q: route.query.q },
      );
    if (kind === "country") query({ window: key });
    if (kind === "documents") location.hash = buildRoute("documents", [key]);
    if (kind === "calendar") query({ view: key });
    return;
  }
  if (t.dataset.openOpportunity) {
    openDrawer(t.dataset.openOpportunity, t.dataset.openTab);
    return;
  }
  if (t.hasAttribute("data-close-drawer")) {
    closeDrawer();
    return;
  }
  if (t.dataset.addToList) {
    const id = t.dataset.addToList;
    if (id.startsWith("radar:"))
      mutate(
        () =>
          updateV4(store, {
            leads: {
              ...ctx.v4.leads,
              [id]: {
                addedAt: new Date().toISOString(),
                note: "Verify on the official site",
              },
            },
          }),
        "Added to your list",
      );
    else
      mutate(
        () =>
          store.setApplication(id, ctx.intake, {
            decision: ctx.mine.has(id) ? "not-pursuing" : "apply",
          }),
        ctx.mine.has(id) ? "Removed from your list" : "Added to your list",
      );
    return;
  }
  if (t.dataset.dismissMatch) {
    const id = t.dataset.dismissMatch;
    mutate(() =>
      updateV4(store, {
        dismissedMatches: [...new Set([...ctx.v4.dismissedMatches, id])],
      }),
    );
    toast("Match dismissed", () =>
      mutate(() =>
        updateV4(store, {
          dismissedMatches: ctx.v4.dismissedMatches.filter((x) => x !== id),
        }),
      ),
    );
    return;
  }
  if (t.dataset.page) {
    query({ page: t.dataset.page });
    return;
  }
  if (t.hasAttribute("data-show-all")) {
    query({ window: route.query.window === "all" ? null : "all", page: null });
    return;
  }
  if (t.dataset.calendarScope) {
    query({ scope: t.dataset.calendarScope });
    return;
  }
  if (
    t.hasAttribute("data-month-prev") ||
    t.hasAttribute("data-month-next") ||
    t.hasAttribute("data-month-today")
  ) {
    moveMonth(
      t.hasAttribute("data-month-prev")
        ? -1
        : t.hasAttribute("data-month-next")
          ? 1
          : 0,
    );
    return;
  }
  if (t.hasAttribute("data-export-calendar")) {
    exportCalendar();
    return;
  }
  if (t.hasAttribute("data-toggle-theme")) {
    toggleTheme();
    return;
  }
  if (t.hasAttribute("data-retry-guide")) {
    guideErrors.delete(drawerId);
    fetchGuide(drawerId);
    return;
  }
  if (t.hasAttribute("data-complete-migration")) {
    download(store.migrationBackup(), "career-track-v2-before-migration.json");
    store.completeMigration();
    return;
  }
  if (t.hasAttribute("data-reset-workspace")) {
    confirmAction(
      "Reset progress",
      "We download your current workspace before resetting this device. The original V2 backup remains available.",
      "RESET",
      () => {
        backup();
        store.applyState(emptyState());
        formDrafts.clear();
        render();
      },
    );
    return;
  }
  if (t.dataset.lifecycle) {
    const action = t.dataset.lifecycle,
      id = t.dataset.id;
    if (["delete", "purge"].includes(action))
      confirmAction(
        action === "purge" ? "Purge permanently" : "Move to Trash",
        action === "purge"
          ? "This removes this scholarship’s private work. We download a backup first."
          : "Your work stays in Trash until you restore it or explicitly purge it.",
        action === "purge" ? "PURGE" : null,
        () => {
          if (action === "purge") backup();
          store.lifecycle(action, id);
          closeDrawer();
          saveNotice(
            action === "purge" ? "Scholarship purged" : "Moved to Trash",
          );
        },
      );
    else
      mutate(
        () => store.lifecycle(action, id),
        action === "restore" ? "Restored" : "Archived",
      );
    return;
  }
  if (t.hasAttribute("data-restore-import")) {
    confirmAction(
      "Restore backup",
      "We download your current state, then restore the previewed file on this device.",
      "RESTORE",
      () => {
        backup();
        store.applyState(importState);
        importState = null;
        formDrafts.clear();
        render();
        saveNotice("Backup restored");
      },
    );
  }
}
function change(e) {
  const t = e.target;
  if (t.dataset.applicationStep)
    mutate(
      () =>
        store.setStep(
          drawerId,
          ctx.intake,
          t.dataset.applicationStep,
          t.checked,
        ),
      "Checklist saved",
    );
  else if (
    t.dataset.documentStatus ||
    t.dataset.docVersion ||
    t.dataset.docExpiry
  ) {
    const id =
        t.dataset.documentStatus || t.dataset.docVersion || t.dataset.docExpiry,
      current = documentRecord(ctx.state, id);
    mutate(
      () =>
        store.setDocument(id, {
          ...current,
          status: t.dataset.documentStatus ? t.value : current.status,
          version: t.dataset.docVersion ? t.value : current.version,
          expires: t.dataset.docExpiry ? t.value : current.expires || "",
          updatedAt: new Date().toISOString(),
        }),
      "Document saved",
    );
  } else if (
    t.dataset.priorityEnabled ||
    t.dataset.priorityWeight ||
    t.hasAttribute("data-priority-sort")
  ) {
    const p = mergePrefs(ctx.state.preferences);
    if (t.dataset.priorityEnabled)
      p.enabled[t.dataset.priorityEnabled] = t.checked;
    else if (t.dataset.priorityWeight)
      p.weight[t.dataset.priorityWeight] = t.checked ? 2 : 1;
    else p.sortOrder = t.value;
    mutate(() =>
      store.changeMany(
        Object.entries(p).map(([key, value]) => ({
          bucket: "preferences",
          key,
          value,
        })),
      ),
    );
  } else if (t.hasAttribute("data-density"))
    mutate(() => updateV4(store, { ui: { ...ctx.v4.ui, density: t.value } }));
  else if (t.dataset.field === "event-type") query({ type: t.value });
  else if (t.dataset.field === "zone")
    mutate(() => updateV4(store, { ui: { ...ctx.v4.ui, zone: t.value } }));
  else if (
    drawerId &&
    ["stage", "decision", "referee", "referenceStage"].includes(t.dataset.field)
  )
    mutate(
      () =>
        store.setApplication(drawerId, ctx.intake, {
          [t.dataset.field === "referee" ? "refereeId" : t.dataset.field]:
            t.value,
        }),
      "Application saved",
    );
  else if (t.hasAttribute("data-import-file")) previewImport(t);
}
async function previewImport(input) {
  const form = input.closest("form"),
    err = form.querySelector(".form-error");
  try {
    const file = input.files[0];
    if (!file) return;
    if (file.size > 1048576) throw Error("Choose a backup up to 1 MB.");
    importState = store.parseBackup(await file.text());
    readV4(importState);
    form.querySelector("[data-import-preview]").innerHTML = html`<div
      class="fact stack"
    >
      <h3>Backup ready to restore</h3>
      <p>
        ${Object.keys(importState.v3.applications).length} applications ·
        ${Object.keys(importState.notes).length} notes ·
        ${Object.values(importState.progress).filter(Boolean).length} checklist
        ticks
      </p>
      <p>Your current workspace is exported before replacement.</p>
      <button type="button" class="btn btn--primary" data-restore-import>
        Restore this backup
      </button>
    </div>`;
    err.hidden = true;
  } catch (e) {
    importState = null;
    form.querySelector("[data-import-preview]").replaceChildren();
    err.hidden = false;
    err.textContent = e.message;
  }
}
function submit(e) {
  const form = e.target;
  if (!form.matches("form") || form.id === "searchForm") return;
  e.preventDefault();
  const data = new FormData(form),
    err = form.querySelector(".form-error");
  try {
    form.removeAttribute("data-dirty");
    form.removeAttribute("data-note-dirty");
    formDrafts.clear();
    if (form.hasAttribute("data-profile-form")) {
      const v = validatedProfile(data);
      store.setProfile(v.profile);
      store.setPreferences(v.preferences);
    } else if (form.hasAttribute("data-tests-form")) {
      const tests = Object.fromEntries(
        ["target", "booking", "result", "expires"].map((k) => [
          k,
          String(data.get(k) || "")
            .trim()
            .slice(0, 120),
        ]),
      );
      updateV4(store, { tests });
    } else if (form.dataset.noteForm) {
      const id = form.dataset.noteForm;
      store.change("notes", id, String(data.get("note") || ""));
      drafts.delete(id);
    } else if (
      form.hasAttribute("data-new-reference") ||
      form.hasAttribute("data-reference-form")
    ) {
      const name = String(data.get("name") || "").trim(),
        email = String(data.get("email") || "").trim();
      if (!name || (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)))
        throw Error(
          "Enter a referee name and a valid email, or leave email empty.",
        );
      const id = form.dataset.referenceForm || "ref-" + crypto.randomUUID();
      store.setReference(id, {
        ...ctx.state.v3.references[id],
        name,
        email,
        stage: String(data.get("stage") || "not-requested"),
      });
    } else return;
    saveNotice("Changes saved");
  } catch (e) {
    form.dataset.dirty = "";
    form.dataset.noteDirty = "";
    if (err) {
      err.id ||= "form-error-" + crypto.randomUUID();
      err.hidden = false;
      err.textContent = e.message;
      form
        .querySelector("input,textarea,select")
        ?.setAttribute("aria-describedby", err.id);
      form
        .querySelector("input,textarea,select")
        ?.setAttribute("aria-invalid", "true");
      form.querySelector("input,textarea,select")?.focus();
    }
    toast(e.message, null, true);
  }
}
function moveMonth(delta) {
  const today = ymd(Date.now(), ctx.zone),
    value = route.query.month || today.slice(0, 7),
    [y, m] = value.split("-").map(Number);
  query({
    month: delta
      ? Object.values(shiftMonth(y, m, delta))
          .map((n, i) => (i ? pad2(n) : n))
          .join("-")
      : today.slice(0, 7),
  });
}
function exportCalendar() {
  download(
    buildV4Calendar(registry, {
      intake: ctx.intake,
      mine: ctx.mine,
      all: route.query.scope === "all",
      tests: ctx.v4.tests,
    }),
    "career-track-calendar.ics",
    "text/calendar",
  );
}
function toggleTheme() {
  const next =
    document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = next;
  if (!isDemo())
    try {
      localStorage.setItem("scholarship-theme", next);
    } catch {
      toast("Theme applies in this tab. Browser storage is unavailable.");
    }
  themeLabel();
  if (route.view === "settings") render();
}
function themeLabel() {
  $("themeToggle").setAttribute(
    "aria-label",
    "Switch to " +
      (document.documentElement.dataset.theme === "dark" ? "light" : "dark") +
      " theme",
  );
}
export function mountApp(progressStore) {
  store = progressStore;
  $("icon-sprite").innerHTML = icons;
  wireToasts();
  mounted = true;
  for (const root of [$("main"), $("drawer")]) {
    root.addEventListener("click", onClick);
    root.addEventListener("change", change);
    root.addEventListener("submit", submit);
    root.addEventListener("input", (e) => {
      const el = e.target;
      if (el.tagName === "TEXTAREA") {
        el.style.height = "auto";
        el.style.height = Math.min(480, el.scrollHeight) + "px";
      }
      if (el.dataset.privateNote) {
        drafts.set(el.dataset.privateNote, el.value);
        el.dataset.noteDirty = "";
      } else if (el.closest("form") && el.type !== "file") {
        el.closest("form").dataset.dirty = "";
        el.closest("form").dataset.noteDirty = "";
      }
    });
  }
  $("themeToggle").addEventListener("click", toggleTheme);
  themeLabel();
  $("scrim").addEventListener("click", closeDrawer);
  let composing = false;
  $("globalSearch").addEventListener(
    "compositionstart",
    () => (composing = true),
  );
  $("globalSearch").addEventListener(
    "compositionend",
    () => (composing = false),
  );
  $("searchForm").addEventListener("submit", (e) => {
    e.preventDefault();
    if (e.isComposing || composing) return;
    location.hash = buildRoute("scholarships", ["all"], {
      q: $("globalSearch").value.trim(),
      window: "all",
    });
  });
  $("globalSearch").addEventListener(
    "input",
    () => ($("searchClear").hidden = !$("globalSearch").value),
  );
  $("searchClear").addEventListener("click", () => {
    $("globalSearch").value = "";
    $("searchClear").hidden = true;
    if (route.query.q) query({ q: null, page: null }, true);
    $("globalSearch").focus();
  });
  $("intakeSelect").addEventListener("change", (e) => {
    currentIntake = Number(e.target.value);
    try {
      sessionStorage.setItem("career-track:intake", e.target.value);
    } catch {}
    render();
  });
  $("accountBtn").addEventListener("click", () => {
    const open = $("accountMenu").hidden;
    $("accountMenu").hidden = !open;
    $("accountBtn").setAttribute("aria-expanded", String(open));
    if (open) $("accountMenu").querySelector('[role="menuitem"]').focus();
  });
  $("accountMenu").addEventListener("click", () => {
    $("accountMenu").hidden = true;
    $("accountBtn").setAttribute("aria-expanded", "false");
  });
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".account")) {
      $("accountMenu").hidden = true;
      $("accountBtn").setAttribute("aria-expanded", "false");
    }
  });
  $("actionDialog").addEventListener("click", (e) => {
    if (e.target.closest("[data-cancel-action]")) $("actionDialog").close();
  });
  $("actionDialog").addEventListener("submit", (e) => {
    e.preventDefault();
    const field = e.target.querySelector("[data-confirm-word]");
    if (field && field.value !== field.dataset.confirmWord) {
      const error = e.target.querySelector(".form-error");
      error.hidden = false;
      error.textContent =
        "Type " + field.dataset.confirmWord + " exactly to continue.";
      field.setAttribute("aria-invalid", "true");
      field.focus();
      return;
    }
    try {
      dialogAction?.();
      $("actionDialog").close();
    } catch (err) {
      toast(err.message, null, true);
    }
  });
  window.addEventListener("hashchange", () => render({ focus: true }));
  document.addEventListener("keydown", keyboard);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) ticker.onVisible();
  });
  ticker.subscribe((t) => {
    if (!ctx) return;
    const hero = ctx.dashboard.model.hero;
    if (hero && route.view === "dashboard") {
      const cd = countdownModel(hero.row.window.deadline, t),
        container = document.querySelector("[data-hero-countdown]");
      if (container) {
        if (cd.mode === "live" && container.querySelector('[data-u="s"]'))
          for (const u of ["d", "h", "m", "s"])
            container.querySelector('[data-u="' + u + '"]').textContent = pad2(
              cd.parts[u],
            );
        else if (
          cd.mode === "days" &&
          container.querySelector('[data-u="days"]')
        )
          container.querySelector('[data-u="days"]').textContent = cd.days;
        else if (cd.mode === "closed") {
          render();
          return;
        }
        const band = cd.urgency?.key;
        if (cd.mode === "live" && cd.parts.d === 0 && cd.parts.s === 0)
          $("timerStatus").textContent =
            "Time remaining: " +
            cd.parts.h +
            " hours " +
            cd.parts.m +
            " minutes";
        if (band !== lastBand) {
          $("timerStatus").textContent =
            cd.urgency?.label || "Deadline countdown updated";
          lastBand = band;
        }
      }
    }
  }, 1000);
  ticker.subscribe(() => {
    if (
      !document.querySelector("form[data-dirty],[data-note-dirty]") &&
      !drawerId
    )
      render();
  }, 60000);
}
function keyboard(e) {
  if (e.isComposing) return;
  if (e.key === "Escape") {
    if ($("actionDialog").open) return;
    if (drawerId) {
      e.preventDefault();
      closeDrawer();
    } else {
      $("accountMenu").hidden = true;
      $("accountBtn").setAttribute("aria-expanded", "false");
      $("accountBtn").focus();
    }
    return;
  }
  if (drawerId && e.key === "Tab") {
    const list = [
      ...$("drawer").querySelectorAll(
        'button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]',
      ),
    ].filter((x) => x.getClientRects().length);
    if (e.shiftKey && document.activeElement === list[0]) {
      e.preventDefault();
      list.at(-1)?.focus();
    } else if (!e.shiftKey && document.activeElement === list.at(-1)) {
      e.preventDefault();
      list[0]?.focus();
    }
    return;
  }
  const tab = e.target.closest('[role="tab"]');
  if (tab && ["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) {
    e.preventDefault();
    const tabs = [...tab.parentElement.querySelectorAll('[role="tab"]')],
      i = tabs.indexOf(tab),
      next =
        e.key === "Home"
          ? 0
          : e.key === "End"
            ? tabs.length - 1
            : (i + (e.key === "ArrowRight" ? 1 : -1) + tabs.length) %
              tabs.length;
    tabs[next].click();
    setTimeout(() => document.getElementById(tabs[next].id)?.focus(), 0);
    return;
  }
  if (
    !$("accountMenu").hidden &&
    ["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)
  ) {
    e.preventDefault();
    const items = [...$("accountMenu").querySelectorAll('[role="menuitem"]')],
      i = items.indexOf(document.activeElement);
    items[
      e.key === "Home"
        ? 0
        : e.key === "End"
          ? items.length - 1
          : (i + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length
    ]?.focus();
    return;
  }
  const cell = e.target.closest("[data-day]");
  if (
    cell &&
    ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Enter"].includes(e.key)
  ) {
    e.preventDefault();
    if (e.key === "Enter") {
      cell.querySelector("button,a")?.click();
      return;
    }
    const days =
        e.key === "ArrowLeft"
          ? -1
          : e.key === "ArrowRight"
            ? 1
            : e.key === "ArrowUp"
              ? -7
              : 7,
      next = new Date(Date.parse(cell.dataset.day) + days * 86400000)
        .toISOString()
        .slice(0, 10),
      target = document.querySelector('[data-day="' + next + '"]');
    if (target) {
      document.querySelectorAll("[data-day]").forEach((n) => (n.tabIndex = -1));
      target.tabIndex = 0;
      target.focus();
    } else query({ month: next.slice(0, 7) });
    return;
  }
  if (
    e.ctrlKey ||
    e.metaKey ||
    e.altKey ||
    e.target.closest('input,select,textarea,[contenteditable="true"]') ||
    drawerId ||
    $("actionDialog").open
  )
    return;
  if (KEY_TO_VIEW[e.key]) {
    e.preventDefault();
    location.hash = "#/" + KEY_TO_VIEW[e.key];
  } else if (e.key === "/") {
    e.preventDefault();
    $("globalSearch").focus();
  } else if (e.key.toLowerCase() === "t" && route.view === "calendar")
    moveMonth(0);
}
export function updateWorkspace(next) {
  event = next;
  try {
    render();
  } catch (e) {
    $("main").innerHTML = html`<div class="inline-error" role="alert">
      <h2>Workspace could not be displayed</h2>
      <p>${e.message}</p>
      <a href="/classic/#/settings">Open classic recovery tools</a
      ><button class="btn btn--secondary" type="button" data-export-state>
        Export progress
      </button>
    </div>`;
    console.error(e);
  }
}
export function hideWorkspace() {
  $("appShell").hidden = true;
}
