import { html } from "../../ui/html.js";
import { chip, ring } from "../../ui/components.js";
import { field, select, label, tabs, panel } from "../../ui/fields.js";
import { documents } from "../../data.js";
import { ymd } from "../dashboard/countdown.js";
export const DOC_STATUSES = [
  "not-started",
  "preparing",
  "ready",
  "submitted",
  "expired",
];
export const REF_STAGES = [
  "not-requested",
  "requested",
  "confirmed",
  "briefed",
  "submitted",
];
export const dossier = documents.map((d) => ({
  ...d,
  key: "dossier-" + d.id.toLowerCase(),
}));
export function documentKey(doc, id, index) {
  const n = doc.name.toLowerCase(),
    key = /passport|identity/.test(n)
      ? "passport"
      : /transcript|academic record/.test(n)
        ? "transcript"
        : /certificate|graduation/.test(n)
          ? "certificate"
          : /reference|referee/.test(n)
            ? "references"
            : /english|ielts|toefl/.test(n)
              ? "ielts"
              : /cv|résumé|resume/.test(n)
                ? "cv"
                : /statement|sop/.test(n)
                  ? "sopresearch"
                  : null;
  return key ? "dossier-" + key : id + "-doc-" + index;
}
export function documentRecord(state, key, legacyKey, now = Date.now()) {
  const latest = [state.v3.documents[key], state.v3.documents[legacyKey]]
    .filter(Boolean)
    .sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""))[0];
  const d = documents.find((d) => "dossier-" + d.id.toLowerCase() === key);
  const base = latest || {
    status: d && state.progress["doc-" + d.id] ? "ready" : "not-started",
    version: "",
    expires: "",
  };
  return {
    ...base,
    status:
      base.expires && base.expires < ymd(now, "Asia/Dhaka")
        ? "expired"
        : base.status,
  };
}
export function scholarshipDocuments(o, state, now) {
  return (o.documentIndex || []).map((d, i) => ({
    ...d,
    key: documentKey(d, o.id, i),
    legacyKey: o.id + "-doc-" + i,
    record: documentRecord(
      state,
      documentKey(d, o.id, i),
      o.id + "-doc-" + i,
      now,
    ),
  }));
}
const statusOptions = (value) =>
  DOC_STATUSES.map(
    (s) =>
      html`<option value="${s}" ${s === value ? html`selected` : ""}>
        ${label(s)}
      </option>`,
  );
export function documentsView(ctx) {
  const active = ["references", "tests"].includes(ctx.route.segments[0])
    ? ctx.route.segments[0]
    : "dossier";
  let content;
  if (active === "dossier") {
    const rows = dossier.map((d) => ({
        ...d,
        record: documentRecord(ctx.state, d.key, null, ctx.now),
      })),
      ready = rows.filter((d) =>
        ["ready", "submitted"].includes(d.record.status),
      ).length;
    content = html`<div class="dossier-grid">
      <div class="card">
        ${rows.map(
          (d) =>
            html`<div class="doc-row" data-document="${d.key}">
              <div>
                <h2 class="document-name">${d.label}</h2>
                <p class="section__sub">
                  ${d.group} · Needed by
                  ${ctx.rows.filter((r) => scholarshipDocuments(r.opportunity, ctx.state, ctx.now).some((x) => x.key === d.key)).length}
                  routes
                </p>
                ${d.record.status === "expired" ? chip("Expired", "danger") : ""}
                <details>
                  <summary>Version & expiry</summary>
                  <div class="stack">
                    <label class="field"
                      ><span>Version or private note</span
                      ><input
                        maxlength="120"
                        data-doc-version="${d.key}"
                        value="${d.record.version}" /></label
                    ><label class="field"
                      ><span>Expiry date</span
                      ><input
                        type="date"
                        data-doc-expiry="${d.key}"
                        value="${d.record.expires || ""}"
                    /></label>
                  </div>
                </details>
              </div>
              <div class="stepper" aria-hidden="true">
                ${[0, 1, 2, 3].map((i) => html`<i class="${DOC_STATUSES.indexOf(d.record.status) >= i && d.record.status !== "expired" ? "on" : ""}"></i>`)}
              </div>
              <label class="field"
                ><span class="sr-only">${d.label} status</span
                ><select data-document-status="${d.key}">
                  ${statusOptions(d.record.status)}
                </select></label
              >
            </div>`,
        )}
      </div>
      <aside class="card card--pad readiness-card">
        ${ring((ready / rows.length) * 100, "Dossier readiness")}
        <h2 class="section__title">Dossier readiness</h2>
        <p class="muted" data-doc-ready>
          ${ready} of ${rows.length} documents ready
        </p>
        <div>
          <p class="eyebrow">Next missing</p>
          <p>
            ${rows.find((d) => !["ready", "submitted"].includes(d.record.status))?.label || "Everything is ready"}
          </p>
        </div>
      </aside>
    </div>`;
  } else if (active === "references") {
    const refs = Object.entries(ctx.state.v3.references);
    content = html`<div class="country-grid">
        ${refs.map(
          ([id, r]) =>
            html`<form
              class="card card--pad stack"
              data-reference-form="${id}"
              novalidate
            >
              <h2 class="section__title">${r.name || "Private referee"}</h2>
              ${field("name", "Name", r.name)}${field("email", "Email", r.email, "email", 254)}${select("stage", "Follow-up stage", REF_STAGES, r.stage || "not-requested")}
              <p class="form-error" role="alert" hidden></p>
              <button class="btn btn--secondary" type="submit">
                Save referee
              </button>
            </form>`,
        )}
      </div>
      <form class="card card--pad stack section" data-new-reference novalidate>
        <h2 class="section__title">Add a referee</h2>
        <div class="form-grid">
          ${field("name", "Name", "")}${field("email", "Email", "", "email", 254)}
        </div>
        <p class="form-error" role="alert" hidden></p>
        <button class="btn btn--primary" type="submit">Add referee</button>
      </form>
      ${
        refs.length && ctx.mine.size
          ? html`<div class="table-wrap section">
              <table>
                <caption>
                  References for your scholarships
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Scholarship</th>
                    ${refs.map(([, r]) => html`<th scope="col">${r.name}</th>`)}
                  </tr>
                </thead>
                <tbody>
                  ${ctx.rows
                    .filter((r) => ctx.mine.has(r.opportunity.id))
                    .map(
                      (r) =>
                        html`<tr>
                          <th scope="row">${r.opportunity.name}</th>
                          ${refs.map(([id]) => html`<td>${r.application.refereeId === id ? label(r.application.referenceStage || "not-requested") : "Not assigned"}</td>`)}
                        </tr>`,
                    )}
                </tbody>
              </table>
            </div>`
          : ""
      }`;
  } else {
    const t = ctx.v4.tests;
    content = html`<form
      class="card card--pad stack"
      data-tests-form
      novalidate
    >
      <h2 class="section__title">English test</h2>
      <p class="section__sub">
        Your preparation targets; check each programme’s current requirements.
      </p>
      <div class="form-grid">
        ${field("target", "Target score", t.target || "")}${field("booking", "Test date", t.booking || "", "date")}${field("result", "Result or reporting note", t.result || "")}${field("expires", "Result expiry", t.expires || "", "date")}
      </div>
      ${t.expires && t.expires < ymd(ctx.now, ctx.zone) ? chip("Result expired", "danger") : ""}
      <p class="form-error" role="alert" hidden></p>
      <button class="btn btn--primary" type="submit">Save test plan</button>
    </form>`;
  }
  return html`<section data-view="documents">
    ${tabs(
      [
        ["dossier", "Dossier"],
        ["references", "References"],
        ["tests", "Tests"],
      ],
      active,
      "documents",
      "documents",
    )}${panel(content, active, "documents")}
  </section>`;
}
