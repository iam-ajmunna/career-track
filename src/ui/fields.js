import { html, safeHref } from "./html.js";
export const label = (value) =>
  String(value ?? "Not confirmed")
    .replaceAll("-", " ")
    .replace(/^./, (c) => c.toUpperCase());
export const option = (value, text, current) =>
  current === value
    ? html`<option value="${value}" selected>${text}</option>`
    : html`<option value="${value}">${text}</option>`;
export const select = (name, caption, values, value, hook = name) =>
  html`<label class="field"
    ><span>${caption}</span
    ><select name="${name}" data-field="${hook}">
      ${values.map((v) => {
        const [id, text] = Array.isArray(v) ? v : [v, label(v)];
        return option(id, text, value);
      })}
    </select></label
  >`;
export const field = (name, caption, value = "", type = "text", max = 120) =>
  html`<label class="field"
    ><span>${caption}</span
    ><input
      name="${name}"
      type="${type}"
      maxlength="${max}"
      value="${value ?? ""}"
  /></label>`;
export const external = (url, text) =>
  html`<a href="${safeHref(url)}" target="_blank" rel="noopener noreferrer"
    >${text}<span class="sr-only"> (opens in a new tab)</span></a
  >`;
export function tabs(items, active, id = "view", hook = "route") {
  return html`<div class="tabs" role="tablist" aria-label="${id}">
    ${items.map(([key, text]) => html`<button class="tab" type="button" role="tab" id="${id}-${key}" aria-controls="${id}-panel" aria-selected="${key === active ? "true" : "false"}" tabindex="${key === active ? "0" : "-1"}" data-tab="${hook}" data-value="${key}">${text}</button>`)}
  </div>`;
}
export const panel = (content, active, id = "view") =>
  html`<div
    class="stack"
    id="${id}-panel"
    role="tabpanel"
    aria-labelledby="${id}-${active}"
  >
    ${content}
  </div>`;
