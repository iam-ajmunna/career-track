import { html } from "../../ui/html.js";
import { chip, progress, flagEmoji } from "../../ui/components.js";
import { label, select, external, tabs, panel } from "../../ui/fields.js";
import { STAGES, DECISIONS } from "../../v3/schema.js";
import { readiness } from "../../v3/domain.js";
import { zones } from "../dashboard/view.js";
import {
  scholarshipDocuments,
  DOC_STATUSES,
  REF_STAGES,
} from "../documents/view.js";
export const DRAWER_TABS = [
  ["overview", "Overview"],
  ["requirements", "Requirements"],
  ["funding", "Funding"],
  ["documents", "Documents"],
  ["timeline", "Timeline"],
  ["sources", "Sources"],
];
export function guideSection(value, key = "") {
  if (value === null || value === undefined || value === "") return "";
  if (typeof value !== "object") return html`<p>${String(value)}</p>`;
  if (Array.isArray(value))
    return html`<div class="stack">${value.map((v) => guideSection(v))}</div>`;
  return html`<dl class="guide-facts">
    ${Object.entries(value)
      .filter(
        ([k]) =>
          !["sourceIds", "id", "legacyKey", "url", "required"].includes(k),
      )
      .map(
        ([k, v]) =>
          html`<div>
            <dt>${label(k.replace(/([a-z])([A-Z])/g, "$1 $2"))}</dt>
            <dd>
              ${k.toLowerCase().includes("url") && typeof v === "string" ? external(v, "Official page") : guideSection(v, key)}
            </dd>
          </div>`,
      )}
  </dl>`;
}
export function drawerView(ctx, row, active, guide, error) {
  const o = row.opportunity,
    a = row.application,
    r = readiness(o, a, ctx.state);
  const sources = o.sourceIds
    .map((id) => ctx.sourceById.get(id))
    .filter(Boolean);
  let content;
  if (active === "overview")
    content = html`<dl class="facts">
        ${[
          ["Funding", label(o.funding.classification)],
          ["Deadline", zones(row.window.deadline, ctx.zone)],
          ["Degree", o.degreeTypes.map(label).join(" · ")],
          ["Eligibility", label(row.eligibility.status)],
          ["Return-home", label(o.obligations.returnHome)],
        ].map(
          ([term, value]) =>
            html`<div class="fact">
              <dt>${term}</dt>
              <dd>${value}</dd>
            </div>`,
        )}
      </dl>
      <div>
        ${progress(r.percent, "Readiness")}
        <p class="section__sub">
          ${r.done} of ${r.total} required
          steps${r.unresolved.length ? " · Requirements still need confirmation" : ""}
        </p>
      </div>
      <div class="hero__meta">
        ${chip(label(row.window.status), row.window.status === "open" ? "success" : "warning")}${row.blockers.map((d) => chip("Missed prerequisite: " + d.title, "danger"))}
      </div>
      <div class="form-grid">
        ${select("decision", "My decision", DECISIONS, a.decision)}${select("stage", "Application stage", STAGES, a.stage)}
      </div>
      <p class="section__sub">
        University admission and scholarship submission are separate. Record
        each in its own tracker.
      </p>
      <div class="hero__actions">
        ${o.officialUrl ? external(o.officialUrl, "Official application page") : ""}<a
          href="/classic/#/scholarships/${o.id}"
          >Advanced application tools</a
        >
      </div>
      <form class="stack" data-note-form="${o.id}" novalidate>
        <label class="field"
          ><span>Private application notes</span
          ><textarea name="note" maxlength="8000" data-private-note="${o.id}">
${ctx.drafts.get(o.id) ?? ctx.state.notes[o.id] ?? ""}</textarea>
        </label>
        <p class="form-error" role="alert" hidden></p>
        <button type="submit" class="btn btn--secondary">Save notes</button>
      </form>
      <div class="hero__actions">
        <button
          class="btn btn--ghost"
          type="button"
          data-lifecycle="archive"
          data-id="${o.id}"
        >
          Archive</button
        ><button
          class="btn btn--danger"
          type="button"
          data-lifecycle="delete"
          data-id="${o.id}"
        >
          Move to Trash
        </button>
      </div>`;
  else if (active === "requirements")
    content = html`<h3>Eligibility & prerequisites</h3>
      <ul class="readable-list">
        ${row.eligibility.rules.map((e) => html`<li>${e.label} ${chip(label(e.assessment), e.assessment === "ineligible" ? "danger" : "neutral")}</li>`)}
      </ul>
      <h3>Application checklist</h3>
      <div class="stack">
        ${o.guide.steps.map((s) => html`<label class="check-row"><input type="checkbox" data-application-step="${s.id}" ${a.completedSteps[s.id] || (s.legacyKey && ctx.state.progress[s.legacyKey]) ? html`checked` : ""} /><span>${s.text}${s.required ? html` <strong class="section__sub">Required</strong>` : ""}</span></label>`)}
      </div>
      ${
        guide
          ? html`<h3>Programme requirements</h3>
              ${guideSection(guide.eligibility)}${guideSection(guide.english)}${guideSection(guide.supervisor)}`
          : ""
      }`;
  else if (active === "funding")
    content = html`<h3>${label(o.funding.classification)}</h3>
      <p>${o.funding.summary}</p>
      ${o.funding.components.map(
        (c) =>
          html`<div class="fact">
            <h3>${c.label}</h3>
            <p>${c.detail}</p>
            ${c.conditional ? chip("Conditional", "warning") : ""}
          </div>`,
      )}
      <h3>What is not covered</h3>
      <ul>
        ${o.funding.uncovered.map((c) => html`<li>${c}</li>`)}
      </ul>
      <p>${o.funding.renewal}</p>
      <h3>Return-home obligation</h3>
      <p>${o.obligations.detail}</p>
      <a class="btn btn--secondary" href="/classic/#/scholarships/${o.id}"
        >Open private funding calculator</a
      >`;
  else if (active === "documents")
    content = html`<h3>Scholarship checklist</h3>
      <p class="section__sub">
        Shared document statuses also update your dossier.
      </p>
      ${scholarshipDocuments(o, ctx.state, ctx.now).map(
        (d, i) =>
          html`<div class="fact stack">
            <h3>${d.name}</h3>
            <label class="field"
              ><span>Preparation</span
              ><select data-document-status="${d.key}">
                ${DOC_STATUSES.map((s) => html`<option value="${s}" ${s === d.record.status ? html`selected` : ""}>${label(s)}</option>`)}
              </select></label
            >${guide?.documents?.[i] ? guideSection(guide.documents[i]) : ""}
          </div>`,
      )}${select("referee", "Primary referee", [["", "No primary referee assigned"], ...Object.entries(ctx.state.v3.references).map(([id, r]) => [id, r.name || id])], a.refereeId || "")}${select("referenceStage", "Reference follow-up", REF_STAGES, a.referenceStage || "not-requested")}<a
        href="#/documents/references"
        >Manage referees</a
      >`;
  else if (active === "timeline")
    content = html`<h3>Independent deadlines</h3>
      ${ctx.registry.deadlines
        .filter((d) => d.opportunityId === o.id && d.intake === ctx.intake)
        .map(
          (d) =>
            html`<div class="fact stack">
              <h3>${d.title}</h3>
              <div class="hero__zones">${zones(d, ctx.zone)}</div>
              ${d.precision === "tentative" ? chip("Tentative · verify current call", "warning") : ""}
              <p>${d.action}</p>
              ${d.blocksRoute ? chip("Mandatory prerequisite", "danger") : ""}
            </div>`,
        )}${guide ? guideSection(guide.timeline) : ""}`;
  else
    content = html`<h3>Official sources</h3>
      ${sources.map(
        (s) =>
          html`<div class="fact">
            ${external(s.url, s.title || s.id)}
            <p class="section__sub">
              Checked ${s.checkedAt?.slice(0, 10) || "Not confirmed"}
            </p>
          </div>`,
      )}
      <h3>Application guide</h3>
      ${
        guide
          ? html`<p>${guide.overview}</p>
              ${Object.entries(guide)
                .filter(
                  ([k]) =>
                    ![
                      "overview",
                      "steps",
                      "documents",
                      "english",
                      "supervisor",
                      "eligibility",
                      "timeline",
                      "portals",
                    ].includes(k),
                )
                .map(
                  ([k, v]) =>
                    html`<details>
                      <summary>${label(k)}</summary>
                      <div class="stack">${guideSection(v)}</div>
                    </details>`,
                )}${(guide.portals || []).map((p) => external(p.url, p.label))}`
          : ""
      }`;
  if (!guide && active !== "overview")
    content = html`${content}${
      error
        ? html`<div class="inline-error" role="alert">
            <p>${error}</p>
            <button class="btn btn--secondary" type="button" data-retry-guide>
              Retry guide
            </button>
          </div>`
        : html`<div class="guide-loading" role="status">Loading guide…</div>`
    }`;
  return html`<div class="drawer__head">
      <div>
        <p class="eyebrow">
          ${flagEmoji(o.countryCodes[0])}
          ${o.countryCodes.map(ctx.countryName).join(" · ")}
        </p>
        <h2 id="drawerTitle">${o.name}</h2>
      </div>
      <button
        type="button"
        class="icon-btn"
        data-close-drawer
        aria-label="Close details"
      >
        ×
      </button>
    </div>
    <div class="drawer__body">
      ${tabs(DRAWER_TABS, active, "detail", "drawer")}${panel(content, active, "detail")}
    </div>`;
}
