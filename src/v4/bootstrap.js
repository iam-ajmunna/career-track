if (new URLSearchParams(location.search).get("ui") === "3")
  location.replace("/classic/" + location.hash);
import { createV3Store, STORAGE_KEY } from "../v3/store.js";

const $ = (id) => document.getElementById(id);
let store,
  ui,
  mounted = false,
  lastEvent;

function gate() {
  $("appShell").hidden = true;
  $("workspaceGate").hidden = false;
  $("workspaceTitle").textContent = "Workspace unavailable";
  $("workspaceMessage").textContent =
    "Reload to retry. Your saved browser progress has not been changed.";
  $("workspaceRetry").hidden = false;
  $("gateExport").hidden = !store;
}

function render(event) {
  lastEvent = event;
  $("workspaceGate").hidden = true;
  $("appShell").hidden = false;
  if (!mounted) {
    ui.mountApp(store);
    mounted = true;
  }
  ui.updateWorkspace(event);
  document.body.classList.remove("workspace-loading");
  $("syncLabel").textContent = event.migrationPending
    ? "V2 progress loaded — finish migration"
    : event.storageFailed
      ? "Not saved — Retry"
      : "Saved on this device";
  $("syncBar").dataset.status = event.status;
  $("syncBar").dataset.state = event.status;
  $("syncRetry").hidden = !event.storageFailed || event.draftProblem;
  $("syncMessage").textContent = [event.cacheProblem, event.error]
    .filter(Boolean)
    .join(" ");
  $("syncMessage").hidden = !$("syncMessage").textContent;
  document
    .querySelectorAll(
      "[data-progress-key],[data-application-status],[data-toggle-working],[data-save-note],[data-pref-enabled],[data-pref-weight],[data-pref-sort],[data-track-status-id],[data-track-bulk],[data-commit-import],[data-commit-backup],#resetProgressForm button",
    )
    .forEach((node) => (node.disabled = event.draftProblem));
}

function exportProgress() {
  if (!store) return false;
  try {
    ui?.prepareExport?.();
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(store.export(), null, 2)], {
        type: "application/json",
      }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download =
      "career-track-" + new Date().toISOString().slice(0, 10) + ".json";
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return true;
  } catch {
    const message = mounted ? $("syncMessage") : $("workspaceMessage");
    message.hidden = false;
    message.textContent = "Export failed. Keep this tab open and retry.";
    return false;
  }
}

$("workspaceRetry").addEventListener("click", () => location.reload());
$("syncRetry").addEventListener("click", () => void store?.sync());
$("exportProgress").addEventListener("click", exportProgress);
$("gateExport").addEventListener("click", exportProgress);
document.addEventListener("click", (event) => {
  if (event.target.closest("[data-export-state]")) exportProgress();
});
window.addEventListener("storage", (event) => {
  if (event.key === STORAGE_KEY || event.key === null)
    store?.reloadFromBrowser();
});
window.addEventListener("beforeunload", (event) => {
  if (lastEvent?.storageFailed || document.querySelector("[data-note-dirty]")) {
    event.preventDefault();
    event.returnValue = "";
  }
});

(async () => {
  try {
    ui = await import("./workspace.js");
    store = createV3Store(render, ui.demoStorage?.());
    store.load();
    if ("serviceWorker" in navigator)
      navigator.serviceWorker.register("/sw.js").catch(() => {});
  } catch {
    gate();
  }
})();
