// Safe templating. Every interpolated value is escaped unless explicitly wrapped with raw().
// Usage: html`<p class="x">${userText}</p>`  -> string (a SafeHtml instance coerces to string).
const ESC = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
  "`": "&#96;",
};
export const escapeHtml = (v) =>
  String(v ?? "").replace(/[&<>"'`]/g, (c) => ESC[c]);

class SafeHtml {
  constructor(s) {
    this.s = s;
  }
  toString() {
    return this.s;
  }
}
export const raw = (s) => new SafeHtml(String(s));
const part = (v) => {
  if (v instanceof SafeHtml) return v.s;
  if (Array.isArray(v)) return v.map(part).join("");
  if (v === false || v === null || v === undefined) return "";
  return escapeHtml(v);
};
export function html(strings, ...values) {
  let out = strings[0];
  for (let i = 0; i < values.length; i++)
    out += part(values[i]) + strings[i + 1];
  return new SafeHtml(out);
}
/** Only http(s) URLs may reach href attributes. Returns '#' otherwise. */
export function safeHref(url) {
  try {
    const u = new URL(url);
    return u.protocol === "https:" ? u.href : "#";
  } catch {
    return "#";
  }
}
