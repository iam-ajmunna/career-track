import { html } from "../../ui/html.js";
import { chip } from "../../ui/components.js";
import { field, select, external, label } from "../../ui/fields.js";
import { priorities } from "../scholarships/countries-tiers.js";
export const SETTINGS = [
  ["profile", "Profile"],
  ["appearance", "Appearance"],
  ["notifications", "Notifications"],
  ["data", "Backup & export"],
  ["sources", "Sources & coverage"],
  ["planning", "Planning board"],
  ["archive", "Archive & history"],
];
export function settingsView(ctx) {
  const active = SETTINGS.some(([id]) => id === ctx.route.segments[0])
    ? ctx.route.segments[0]
    : "profile";
  let content;
  const p = ctx.state.v3.profile,
    pref = ctx.state.v3.preferences;
  if (active === "profile")
    content = html`<form class="stack" data-profile-form novalidate>
        <h2 class="section__title">Profile</h2>
        <p class="section__sub">
          Used for your dashboard and to rank matches. Saved on this device.
        </p>
        <div class="form-grid">
          ${field("displayName", "Name", p.displayName || "", "text", 80)}${field("programme", "Programme", p.programme || "")}${field("citizenship", "Citizenship · two-letter code", p.citizenship || "", "text", 2)}${field("cgpa", "Academic grade or equivalence", p.cgpa || "", "text", 32)}${field("graduationDate", "Graduation date", p.graduationDate || "", "date")}${select("feeStatus", "Fee status", ["unknown", "international", "domestic"], p.feeStatus || "unknown")}${field("researchAreas", "Research interests · comma separated", p.researchAreas.join(", "), "text", 1000)}${field("preferredCountries", "Preferred countries · two-letter codes", pref.preferredCountries.join(", "), "text", 200)}
        </div>
        <label class="check-row"
          ><input
            name="allowReturnHome"
            type="checkbox"
            ${pref.allowReturnHome ? html`checked` : ""}
          />
          Willing to meet a return-home obligation</label
        >
        <p class="form-error" role="alert" hidden></p>
        <button class="btn btn--primary" type="submit">Save profile</button>
      </form>
      <div class="section">${priorities(ctx.state)}</div>`;
  else if (active === "appearance")
    content = html`<h2 class="section__title">Appearance</h2>
      <div class="row">
        <div>
          <h3>Theme</h3>
          <p class="section__sub">Uses your existing saved preference.</p>
        </div>
        <button class="btn btn--secondary" type="button" data-toggle-theme>
          Switch to
          ${document.documentElement.dataset.theme === "dark" ? "light" : "dark"}
          theme
        </button>
      </div>
      <label class="field"
        ><span>Density</span
        ><select data-density>
          <option
            value="comfortable"
            ${ctx.v4.ui.density !== "compact" ? html`selected` : ""}
          >
            Comfortable
          </option>
          <option
            value="compact"
            ${ctx.v4.ui.density === "compact" ? html`selected` : ""}
          >
            Compact
          </option>
        </select></label
      >`;
  else if (active === "notifications")
    content = html`<h2 class="section__title">Notifications</h2>
      <div class="row">
        <div>
          <h3>Calendar feed</h3>
          <p class="section__sub">
            Exact deadlines include reminders at 7 days, 3 days, 24 hours and 3
            hours.
          </p>
        </div>
        <a class="btn btn--secondary" href="/deadlines.ics" download
          >Download calendar</a
        >
      </div>
      <p class="section__sub">
        Import into your calendar app to receive its reminders. The site does
        not send closed-tab alerts.
      </p>
      <div class="row">
        <div>
          <h3>Personal milestones</h3>
          <p class="section__sub">
            Your English test date appears in Calendar and its export.
          </p>
        </div>
        <a href="#/documents/tests">Edit test plan</a>
      </div>`;
  else if (active === "data")
    content = html`<h2 class="section__title">Backup & export</h2>
      <div class="row">
        <div>
          <h3>Export everything</h3>
          <p class="section__sub">
            Applications, checklists, notes, profile and history.
          </p>
        </div>
        <button class="btn btn--secondary" type="button" data-export-state>
          Export progress
        </button>
      </div>
      <form class="stack" data-import-form novalidate>
        <label class="field"
          ><span>Import a V2 or V3 backup</span
          ><input
            type="file"
            accept=".json,application/json"
            name="backup"
            data-import-file
        /></label>
        <p class="section__sub">
          Preview before restoring. Your current workspace is downloaded first.
        </p>
        <div data-import-preview></div>
        <p class="form-error" role="alert" hidden></p>
      </form>
      <div class="row">
        <div>
          <h3>Sync across devices</h3>
          <p class="section__sub">
            Off · export and import to move your workspace.
          </p>
        </div>
        ${chip("Local only")}
      </div>
      <p>
        <a href="/classic/#/settings"
          >Advanced import, context and recovery tools</a
        >
      </p>
      <section class="section danger-zone">
        <h3>Danger zone</h3>
        <p class="section__sub">
          Type RESET to confirm. We download a backup first.
        </p>
        <button type="button" class="btn btn--danger" data-reset-workspace>
          Reset progress
        </button>
      </section>`;
  else if (active === "sources")
    content = html`<h2 class="section__title">Sources & coverage</h2>
      <p>
        ${ctx.registry.opportunities.length} curated routes ·
        ${ctx.registry.sources.length} source records
      </p>
      <p class="section__sub">
        Current-cycle facts and older leads have separate verification dates.
        Country policy ratings remain provisional.
      </p>
      <details class="section">
        <summary>Official sources</summary>
        <div class="stack">
          ${ctx.registry.sources.map(
            (s) =>
              html`<div class="fact">
                ${external(s.url, s.title || s.id)}
                <p class="section__sub">
                  Checked ${s.checkedAt?.slice(0, 10) || "Not confirmed"}
                </p>
              </div>`,
          )}
        </div>
      </details>
      <div class="section">
        <h3>Scholarship radar</h3>
        <p class="section__sub">
          ${ctx.radar.generatedAt ? "Last collector run: " + ctx.radar.generatedAt : "External provider not configured. Curated matches are available."}
        </p>
      </div>
      <a href="/classic/#/sources">Source monitoring & research reports</a>`;
  else if (active === "planning")
    content = html`<h2 class="section__title">Planning board</h2>
      <p class="section__sub">
        Your historical checklist and all original progress keys are preserved.
      </p>
      <a class="btn btn--primary" href="/classic/#/goal">Open planning board</a>
      <p class="section__sub">
        Use the current scholarship guide when historical planning advice
        differs.
      </p>`;
  else {
    const items = ctx.rows.filter((r) =>
      ["archived", "trash", "purged", "expired"].includes(r.lifecycle),
    );
    content = html`<h2 class="section__title">Archive & history</h2>
      <p class="section__sub">
        Nothing is purged automatically. Archived and trashed records keep their
        progress.
      </p>
      <div class="stack">
        ${
          items.length
            ? items.map(
                (r) =>
                  html`<article class="fact stack">
                    <h3>${r.opportunity.name}</h3>
                    ${chip(label(r.lifecycle))}${["archived", "trash"].includes(r.lifecycle) ? html`<div class="hero__actions"><button type="button" class="btn btn--secondary" data-lifecycle="restore" data-id="${r.opportunity.id}">Restore</button>${r.lifecycle === "trash" ? html`<button type="button" class="btn btn--danger" data-lifecycle="purge" data-id="${r.opportunity.id}">Purge permanently</button>` : ""}</div>` : ""}
                  </article>`,
              )
            : html`<p class="muted">No archived or trashed scholarships.</p>`
        }
      </div>
      <a href="/classic/#/library">Open complete history</a>`;
  }
  return html`<section data-view="settings">
    <div class="settings">
      <nav class="card subnav" aria-label="Settings sections">
        ${SETTINGS.map(([id, name]) => html`<a href="#/settings/${id}" ${id === active ? html`aria-current="page"` : ""}>${name}</a>`)}
      </nav>
      <div class="card card--pad settings-panel">${content}</div>
    </div>
  </section>`;
}
