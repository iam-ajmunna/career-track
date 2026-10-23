import { leadCard } from "../radar/feed.js";
import { html } from "../../ui/html.js";
import {
  buildCountryView,
  evaluateCountry,
  sacrificeHeadline,
} from "../../lib/scoring.js";
import {
  REQUIREMENTS,
  mergePrefs,
  LEVEL_SYMBOL,
  LEVEL_TEXT,
} from "../../lib/requirements.js";
import { chip, flagEmoji, meter, emptyState } from "../../ui/components.js";
import { label, tabs, panel, external } from "../../ui/fields.js";
import { countdownModel, compactText } from "../dashboard/countdown.js";
import { inMyList } from "../dashboard/model.js";
export const prefsOf = (state) => mergePrefs(state.preferences);
const tone = {
  met: "success",
  partial: "warning",
  unmet: "danger",
  unknown: "unknown",
};
export function requirements(ev, prefs) {
  return REQUIREMENTS.filter((r) => prefs.enabled[r.key]).map((r) =>
    chip(
      LEVEL_SYMBOL[ev.levels[r.key].level] +
        " " +
        r.short +
        ": " +
        LEVEL_TEXT[ev.levels[r.key].level],
      tone[ev.levels[r.key].level],
    ),
  );
}
export function normalizedCountries(ctx) {
  const codes = new Set([
    ...ctx.rows.flatMap((r) => r.opportunity.countryCodes),
    ...ctx.registry.countries.map((c) => c.code),
  ]);
  // The established ISO inventory supplies countries with no curated routes as unrated.
  for (const c of ctx.isoCountries) codes.add(c.code);
  return [...codes].map((code) => ({
    code,
    name: ctx.countryName(code),
    requirements:
      ctx.registry.countries.find((c) => c.code === code)?.fit || {},
    ...ctx.registry.countries.find((c) => c.code === code),
  }));
}
export function normalizedScholarships(ctx) {
  return ctx.rows.flatMap((r) =>
    r.opportunity.countryCodes.map((countryCode) => ({
      id: r.opportunity.id,
      countryCode,
      name: r.opportunity.name,
      funding:
        r.opportunity.funding.classification === "full-cost-verified"
          ? "full"
          : ["partial", "tuition-only", "stipend-only"].includes(
                r.opportunity.funding.classification,
              )
            ? "partial"
            : "unknown",
      funding_source_url: r.opportunity.officialUrl,
      funding_verified_on: r.opportunity.verification.checkedAt,
    })),
  );
}
export function priorities(state) {
  const p = prefsOf(state);
  return html`<details class="priorities">
    <summary class="btn btn--secondary">My priorities</summary>
    <div class="card card--pad priorities__panel">
      ${REQUIREMENTS.map(
        (r) =>
          html`<div class="row">
            <label
              ><input
                type="checkbox"
                data-priority-enabled="${r.key}"
                ${p.enabled[r.key] ? html`checked` : ""}
              />
              ${r.label}</label
            ><label
              ><input
                type="checkbox"
                data-priority-weight="${r.key}"
                ${p.weight[r.key] === 2 ? html`checked` : ""}
              />
              Important</label
            >
          </div>`,
      )}<label class="field"
        ><span>Order</span
        ><select data-priority-sort>
          <option
            value="best-first"
            ${p.sortOrder === "best-first" ? html`selected` : ""}
          >
            Best match first
          </option>
          <option
            value="worst-first"
            ${p.sortOrder === "worst-first" ? html`selected` : ""}
          >
            Least match first
          </option>
        </select></label
      >
    </div>
  </details>`;
}
function countryCard(ev, ctx) {
  const rows = ctx.rows.filter((r) =>
    r.opportunity.countryCodes.includes(ev.country.code),
  );
  return html`<a
    class="card country"
    href="#/scholarships/country/${ev.country.code}"
    ><div class="country__head">
      <span class="country__flag" aria-hidden="true"
        >${flagEmoji(ev.country.code)}</span
      >
      <h3 class="country__name">${ev.country.name}</h3>
      ${meter(ev.metCount, ev.total)}
    </div>
    <div>${chip("Provisional", "warning")}</div>
    <div class="country__chips">${requirements(ev, prefsOf(ctx.state))}</div>
    <p class="country__sacrifice">${sacrificeHeadline(ev)}</p>
    <div class="country__foot">
      <span
        >${rows.length} routes ·
        ${rows.filter((r) => r.window.status === "open").length} open</span
      ><span>View scholarships →</span>
    </div></a
  >`;
}
export function opportunityCard(row, ctx) {
  const o = row.opportunity,
    listed = inMyList(row, ctx.state.pins),
    c = countdownModel(row.window.deadline, ctx.now);
  return html`<article class="card oppcard" data-opportunity="${o.id}">
    <div>
      <h3 class="oppcard__name">
        <button
          class="text-button"
          type="button"
          data-open-opportunity="${o.id}"
        >
          ${o.name}
        </button>
      </h3>
      <p class="section__sub">${flagEmoji(o.countryCodes[0])} ${o.provider}</p>
      <div class="oppcard__meta">
        ${chip(label(row.window.status), row.window.status === "open" ? "success" : "neutral")}${chip(label(o.funding.classification), "brand")}${chip(o.degreeTypes.map(label).join(" · "))}${row.blockers.length ? chip("Prerequisite missed", "danger") : ""}
      </div>
    </div>
    <div class="oppcard__side">
      <p class="oppcard__time">${compactText(c)}</p>
      ${c.mode === "days" ? chip("Time not confirmed", "warning") : ""}<button
        class="btn btn--${listed ? "secondary" : "primary"} btn--sm"
        type="button"
        data-add-to-list="${o.id}"
        aria-pressed="${listed}"
      >
        ${listed ? "✓ In my list" : "+ Add to my list"}
      </button>
    </div>
  </article>`;
}
export function countryPage(ctx, code) {
  const country = normalizedCountries(ctx).find((c) => c.code === code) || {
    code,
    name: ctx.countryName(code),
  };
  const ev = evaluateCountry(
    country,
    normalizedScholarships(ctx).filter((s) => s.countryCode === code),
    prefsOf(ctx.state),
  );
  const selected = ["open", "soon", "future", "closed"].includes(
    ctx.route.query.window,
  )
    ? ctx.route.query.window
    : "open";
  const all = ctx.rows.filter((r) => r.opportunity.countryCodes.includes(code));
  const bucket = (r) =>
    r.window.status === "open"
      ? "open"
      : r.window.status === "opening-soon"
        ? "soon"
        : r.window.status === "closed"
          ? "closed"
          : "future";
  const groups = [
    ["open", "Open now"],
    ["soon", "Opening soon"],
    ["future", "Future & watch"],
    ["closed", "Closed"],
  ];
  return html`<p class="crumbs"><a href="#/scholarships">← All countries</a></p>
    <header class="card country-head">
      <div class="country__head">
        <span class="country__flag">${flagEmoji(code)}</span>
        <h2>${country.name}</h2>
        ${meter(ev.metCount, ev.total)}${chip("Provisional", "warning")}
      </div>
      <p>${sacrificeHeadline(ev)}</p>
      <div class="reqs">
        ${REQUIREMENTS.map(
          (r) =>
            html`<details>
              <summary>
                ${chip(LEVEL_SYMBOL[ev.levels[r.key].level] + " " + r.label, tone[ev.levels[r.key].level])}
              </summary>
              <p>${ev.levels[r.key].reason || "Not researched yet."}</p>
              ${(ev.levels[r.key].sourceIds || []).map((id) => {
                const s = ctx.sourceById.get(id);
                return s ? external(s.url, s.title || id) : "";
              })}
            </details>`,
        )}
      </div>
      ${
        country.postStudy
          ? html`<details>
              <summary>Country sources & conditions</summary>
              <div class="stack">
                ${["postStudy", "conditions", "studyWork", "transition", "returnHome"].map((k) => (country[k] ? html`<p>${country[k]}</p>` : ""))}${country.sourceIds.map(
                  (id) => {
                    const s = ctx.sourceById.get(id);
                    return s ? external(s.url, s.title || id) : "";
                  },
                )}
              </div>
            </details>`
          : ""
      }
    </header>
    ${tabs(
      groups.map(([key, name]) => [
        key,
        name + " (" + all.filter((r) => bucket(r) === key).length + ")",
      ]),
      selected,
      "country",
      "country",
    )}${panel(all.filter((r) => bucket(r) === selected).map((r) => opportunityCard(r, ctx)).length ? all.filter((r) => bucket(r) === selected).map((r) => opportunityCard(r, ctx)) : emptyState("No routes in this window", "Try Future & watch for calls awaiting confirmation."), selected, "country")}`;
}
export function scholarships(ctx) {
  const sub = ctx.route.segments[0],
    selected = ["list", "all", "universities"].includes(sub) ? sub : "country";
  let content;
  if (sub === "country" && ctx.route.segments[1])
    content = countryPage(ctx, ctx.route.segments[1]);
  else if (selected === "country") {
    const view = buildCountryView(
      normalizedCountries(ctx),
      normalizedScholarships(ctx),
      prefsOf(ctx.state),
    );
    const q = (ctx.route.query.q || "").toLowerCase();
    content = html`${priorities(ctx.state)}${view.groups.map(
        (g) =>
          html`<section class="tier">
            <header class="tier__head">
              <h2 class="tier__title">${g.label}</h2>
              <span class="muted">${g.count} countries</span>
            </header>
            ${g.subgroups.map((s) => {
              const items = s.items.filter((ev) =>
                (ev.country.name + ev.country.code).toLowerCase().includes(q),
              );
              return items.length
                ? html`<h3 class="compromise">
                      ${s.sacrifices.length ? "Compromise: " + s.sacrifices.map((x) => x.label + (x.level === "unknown" ? " (unknown)" : x.level === "partial" ? " (partly)" : "")).join(" · ") : "No compromise needed"}
                    </h3>
                    <div class="country-grid">
                      ${items.map((ev) => countryCard(ev, ctx))}
                    </div>`
                : "";
            })}
          </section>`,
      )}
      <details class="section">
        <summary>Not rated yet · ${view.unrated.length} countries</summary>
        <div class="unrated-grid">
          ${view.unrated.filter((e) => e.country.name.toLowerCase().includes(q)).map((ev) => html`<a href="#/scholarships/country/${ev.country.code}">${flagEmoji(ev.country.code)} ${ev.country.name}</a>`)}
        </div>
      </details>`;
  } else if (selected === "universities") {
    const q = (ctx.route.query.q || "").toLowerCase();
    content = html`<div class="country-grid">
      ${ctx.registry.universities
        .filter((u) =>
          (u.name + ctx.countryName(u.countryCode)).toLowerCase().includes(q),
        )
        .map(
          (u) =>
            html`<article class="card card--pad stack">
              <h2 class="section__title">
                ${flagEmoji(u.countryCode)} ${u.name}
              </h2>
              ${external(u.url, "Official university page")}${ctx.registry.programmes
                .filter((p) => p.universityIds.includes(u.id))
                .map(
                  (p) =>
                    html`<div>
                      <h3>${p.name}</h3>
                      <p class="section__sub">
                        ${p.duration} ·
                        ${p.researchAreas.map(label).join(" · ")}
                      </p>
                      ${external(p.url, "Programme requirements")}<a
                        class="btn btn--ghost"
                        href="/classic/#/universities?university=${u.id}"
                        >Admission tracker</a
                      >
                    </div>`,
                )}${ctx.registry.research
                .filter((r) => r.universityId === u.id)
                .map(
                  (r) =>
                    html`<details>
                      <summary>
                        ${r.name || r.group || "Research & supervisors"}
                      </summary>
                      <p>${r.summary || r.fit || r.detail || ""}</p>
                      ${r.url ? external(r.url, "Research page") : ""}
                    </details>`,
                )}
            </article>`,
        )}
    </div>`;
  } else {
    const q = (ctx.route.query.q || "").normalize("NFKC").toLowerCase();
    const filtered = ctx.rows
      .filter(
        (r) =>
          !["purged", "expired", "trash", "archived"].includes(r.lifecycle),
      )
      .filter((r) =>
        selected === "list"
          ? inMyList(r, ctx.state.pins)
          : ctx.route.query.window === "all" || r.window.status === "open",
      )
      .filter(
        (r) =>
          !ctx.route.query.stage ||
          (ctx.route.query.stage === "submitted"
            ? [
                "submitted",
                "under-review",
                "interview",
                "offer",
                "awarded",
                "rejected",
                "withdrawn",
              ].includes(r.application.stage)
            : r.application.stage === ctx.route.query.stage),
      )
      .filter((r) =>
        [
          r.opportunity.name,
          r.opportunity.provider,
          ...r.opportunity.countryCodes.map(ctx.countryName),
          ...r.opportunity.researchAreas,
        ]
          .join(" ")
          .normalize("NFKC")
          .toLowerCase()
          .includes(q),
      );
    const size = 12,
      page = Math.min(
        Math.max(1, Number(ctx.route.query.page) || 1),
        Math.max(1, Math.ceil(filtered.length / size)),
      );
    content = html`<div class="row">
        <p class="muted">
          ${filtered.length} scholarships${q ? " matching “" + q + "”" : ""}
        </p>
        ${selected === "all" ? html`<button type="button" class="btn btn--secondary" data-show-all>${ctx.route.query.window === "all" ? "Show open only" : "Include future & closed"}</button>` : ""}
      </div>
      <div class="stack">
        ${filtered.length ? filtered.slice((page - 1) * size, page * size).map((r) => opportunityCard(r, ctx)) : emptyState("No scholarships here yet", q ? "Clear search or try another country." : "Add a match to start your list.", html`<a href="#/scholarships" class="btn btn--primary">Browse scholarships</a>`)}
      </div>
      ${filtered.length > size ? html`<div class="row"><button type="button" class="btn btn--secondary" data-page="${Math.max(1, page - 1)}" ${page === 1 ? html`disabled` : ""}>Previous</button><span>Page ${page} of ${Math.ceil(filtered.length / size)}</span><button type="button" class="btn btn--secondary" data-page="${page + 1}" ${page * size >= filtered.length ? html`disabled` : ""}>Next</button></div>` : ""}`;
  }
  if (selected === "list" && Object.keys(ctx.v4.leads).length)
    content = html`${content}
      <section class="section">
        <h2 class="section__title">Tracked leads</h2>
        <div class="matches stack">
          ${Object.keys(ctx.v4.leads).map((id) => {
            const lead = ctx.radar.items.find((x) => x.id === id);
            return lead
              ? leadCard(lead, true)
              : html`<article class="card card--pad">
                  <h3>Previously tracked lead</h3>
                  <p>
                    ${ctx.v4.leads[id].note || "Verify on the official site"}
                  </p>
                  <p class="section__sub">
                    No longer in the current feed. Your tracking record is
                    preserved.
                  </p>
                </article>`;
          })}
        </div>
      </section>`;
  return html`<section data-view="scholarships">
    ${tabs(
      [
        ["country", "By country"],
        ["list", "My list"],
        ["all", "All open"],
        ["universities", "Universities"],
      ],
      selected,
      "scholarships",
      "scholarships",
    )}${panel(content, selected, "scholarships")}
  </section>`;
}
