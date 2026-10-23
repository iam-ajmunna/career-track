import { html, raw, safeHref } from "./html.js";

export const flagEmoji = (code) =>
  /^[A-Za-z]{2}$/.test(code ?? "")
    ? [...code.toUpperCase()]
        .map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
        .join("")
    : "🏳️";

/** tone: neutral|brand|success|warning|danger|critical|info|unknown */
export const chip = (text, tone = "neutral") =>
  html`<span class="chip chip--${tone}">${text}</span>`;

/** Accessible progress bar. Width is applied by hydrate() from data-v (no inline style needed). */
export const progress = (value, label) => {
  const v = Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
  return html`<div
    class="progress"
    role="progressbar"
    aria-valuemin="0"
    aria-valuemax="100"
    aria-valuenow="${v}"
    aria-label="${label}"
  >
    <i data-v="${v}"></i>
  </div>`;
};
export const ring = (value, label) => {
  const v = Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
  return html`<div
    class="ring"
    data-p="${v}"
    role="img"
    aria-label="${label}: ${v}%"
  >
    <b>${v}%</b>
  </div>`;
};
export const avatar = (name) => {
  const initials =
    String(name ?? "")
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join("") || "?";
  return html`<span class="avatar" aria-hidden="true">${initials}</span>`;
};
export const meter = (met, total) =>
  html`<span
    class="meter"
    role="img"
    aria-label="${met} of ${total} requirements met"
    >${Array.from({ length: total }, (_, i) => html`<i class="${i < met ? "on" : ""}"></i>`)}</span
  >`;

export const emptyState = (title, hint, action) =>
  html`<div class="empty">
    <p><strong>${title}</strong></p>
    <p>${hint}</p>
    ${action ?? ""}
  </div>`;

/** Compact application card for the Dashboard board. */
export const appCard = ({ id, name, countries, text, urgencyKey, readiness }) =>
  html` <a
    class="appcard"
    href="#/scholarships/country/${countries?.[0] ?? "XX"}?focus=${id}"
    data-opportunity="${id}"
  >
    <span class="appcard__name">${name}</span>
    <span class="appcard__row"
      ><span>${flagEmoji(countries?.[0])} ${countries?.[0] ?? ""}</span
      ><span class="mono" data-urgency="${urgencyKey ?? "normal"}"
        >${text}</span
      ></span
    >
    ${readiness == null ? "" : progress(readiness, `${name} readiness`)}
  </a>`;

/** "Matches for you" card. matchResult = output of rankMatches() item. */
export const matchCard = ({ candidate: c, score, reasons, flags }) =>
  html` <article class="card match" data-match="${c.id}">
    <div class="match__top">
      <div>
        <h3>${c.name}</h3>
        <p class="muted">
          ${flagEmoji(c.countryCodes?.[0])} ${c.provider ?? ""}
        </p>
      </div>
      <span
        class="match__score"
        title="Fit with your interests (not a chance of winning)"
        >${score}</span
      >
    </div>
    <div class="match__why">
      ${reasons.slice(0, 3).map((r) => chip(r.text, r.key === "funding" ? "success" : "brand"))}${flags.slice(0, 2).map((f) => chip(f.text, f.key === "lead" ? "warning" : "danger"))}
    </div>
    <div class="match__actions">
      <button
        class="btn btn--primary btn--sm"
        type="button"
        data-add-to-list="${c.id}"
      >
        + Add to my list
      </button>
      <button
        class="btn btn--ghost btn--sm"
        type="button"
        data-dismiss-match="${c.id}"
      >
        Not interested
      </button>
      ${c.officialUrl ? html`<a class="btn btn--ghost btn--sm" href="${safeHref(c.officialUrl)}" target="_blank" rel="noopener noreferrer">Official page<span class="sr-only"> (opens in a new tab)</span></a>` : ""}
    </div>
  </article>`;

/** Apply widths after rendering: sets CSS custom properties through CSSOM (works with a strict CSP). */
export function hydrate(root = document) {
  root
    .querySelectorAll("[data-v]")
    .forEach((el) => el.style.setProperty("--v", el.dataset.v));
  root
    .querySelectorAll("[data-p]")
    .forEach((el) => el.style.setProperty("--p", el.dataset.p));
}
