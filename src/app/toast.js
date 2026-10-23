import { html } from "../ui/html.js";
let timeout, undo;
export function toast(message, action, persistent = false) {
  const root = document.getElementById("toastRoot");
  clearTimeout(timeout);
  undo = action;
  root.innerHTML = html`<div class="toast">
    <span>${message}</span
    >${action ? html`<button type="button" data-toast-undo>Undo</button>` : ""}<button
      type="button"
      data-toast-close
      aria-label="Dismiss notification"
    >
      ×
    </button>
  </div>`;
  if (!persistent)
    timeout = setTimeout(() => root.replaceChildren(), action ? 5000 : 4000);
}
export function wireToasts() {
  document.getElementById("toastRoot").addEventListener("click", (e) => {
    if (e.target.closest("[data-toast-undo]")) {
      const fn = undo;
      undo = null;
      fn?.();
    }
    if (e.target.closest("button"))
      document.getElementById("toastRoot").replaceChildren();
  });
}
