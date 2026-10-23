import { html } from "../../ui/html.js";
import {
  chip,
  progress,
  ring,
  avatar,
  appCard,
  matchCard,
  flagEmoji,
  emptyState,
} from "../../ui/components.js";
import { leadCard } from "../radar/feed.js";
import { label } from "../../ui/fields.js";
import {
  countdownModel,
  formatInZone,
  formatDateOnly,
  pad2,
  ymd,
} from "./countdown.js";
export function countdownView(deadline, now) {
  const c = countdownModel(deadline, now);
  if (c.mode === "live")
    return html`<div
      class="countdown"
      role="timer"
      aria-live="off"
      aria-label="Time remaining"
    >
      ${Object.entries({ d: "Days", h: "Hours", m: "Minutes", s: "Seconds" }).map(([key, text]) => html`<div class="countdown__unit"><span class="countdown__num" data-u="${key}">${pad2(c.parts[key])}</span><span class="countdown__lbl">${text}</span></div>`)}
    </div>`;
  if (c.mode === "days")
    return html`<div
      class="countdown countdown--days"
      role="timer"
      aria-live="off"
      aria-label="Days remaining"
    >
      <div>
        <span class="countdown__num" data-u="days">${c.days}</span
        ><span class="countdown__lbl">Days</span>
      </div>
      ${chip("Time not confirmed", "warning")}
    </div>`;
  return html`<p class="mono">${c.text}</p>`;
}
export function zones(d, zone = "Asia/Dhaka") {
  if (d?.precision === "exact")
    return html`<p>
        Provider time · ${formatInZone(d.at, d.timezone || "UTC")}
      </p>
      <p>Your time · ${formatInZone(d.at, zone)}</p>`;
  if (d?.precision === "date-only")
    return html`<p>${formatDateOnly(d.date)} · Time not confirmed</p>`;
  return html`<p>Deadline not confirmed</p>`;
}
export function dashboard(ctx) {
  const { model, matches, profile } = ctx.dashboard;
  const state = ctx.state,
    hero = model.hero;
  const complete = Math.round(
    ([
      profile.displayName,
      profile.citizenship,
      state.v3.profile.programme,
      state.v3.profile.researchAreas.length,
      state.v3.profile.cgpa,
      profile.preferredCountries.length,
    ].filter(Boolean).length /
      6) *
      100,
  );
  const upcoming = ctx.events
    .filter(
      (e) => ctx.mine.has(e.opportunityId) && e.day >= ymd(ctx.now, ctx.zone),
    )
    .slice(0, 4);
  return html`<section data-view="dashboard">
    <div class="dash">
      <article
        class="card hero dash__hero"
        data-urgency="${hero?.countdown.urgency?.key || "normal"}"
      >
        ${
          hero
            ? html`<div>
                  <p class="eyebrow">Next deadline · in my list</p>
                  <h2 class="hero__title">
                    ${flagEmoji(hero.row.opportunity.countryCodes[0])}
                    ${hero.row.opportunity.name}
                  </h2>
                </div>
                <div class="hero__meta">
                  ${hero.countdown.urgency?.label ? chip(hero.countdown.urgency.label, "warning") : ""}${chip("Open", "success")}${chip(label(hero.row.opportunity.funding.classification), "brand")}
                </div>
                <div data-hero-countdown="${hero.row.opportunity.id}">
                  ${countdownView(hero.row.window.deadline, ctx.now)}
                </div>
                <div class="hero__zones">
                  ${zones(hero.row.window.deadline, ctx.zone)}
                </div>
                <div>
                  ${progress(hero.readiness, "Application readiness")}
                  <p class="section__sub">
                    ${ctx.api.stepsText(hero.row, state)}
                  </p>
                </div>
                <div class="hero__actions">
                  <button
                    type="button"
                    class="btn btn--primary"
                    data-open-opportunity="${hero.row.opportunity.id}"
                  >
                    Continue application</button
                  ><button
                    type="button"
                    class="btn btn--secondary"
                    data-open-opportunity="${hero.row.opportunity.id}"
                    data-open-tab="requirements"
                  >
                    View requirements
                  </button>
                </div>`
            : html`<p class="eyebrow">Your next move</p>
                <h2 class="hero__title">
                  ${ctx.mine.size ? "Your list is up to date" : "Add your first scholarship"}
                </h2>
                <p class="muted">
                  ${ctx.mine.size ? "No confirmed open deadline needs preparation. Explore matches or review your applications." : "Pick one from your matches below, or browse by country."}
                </p>
                <a class="btn btn--primary" href="#/scholarships"
                  >Browse scholarships</a
                >`
        }
      </article>
      <aside class="card profile-card dash__profile">
        <div class="profile-card__head">
          ${avatar(profile.displayName)}
          <div>
            <h2 class="section__title">
              ${profile.displayName || "Your profile"}
            </h2>
            <p class="section__sub">
              ${state.v3.profile.programme || "Your next degree"}
            </p>
          </div>
        </div>
        <div class="profile-card__completion">
          ${ring(complete, "Profile completeness")}
          <p class="section__sub">
            Profile completeness<br /><a href="#/settings/profile"
              >${complete ? "Edit profile" : "Complete your profile"}</a
            >
          </p>
        </div>
        <div class="profile-card__facts">
          <p>
            ${profile.citizenship ? flagEmoji(profile.citizenship) + " " + ctx.countryName(profile.citizenship) : "Nationality not set"}
          </p>
          <p>
            ${profile.researchAreas.map(label).join(" · ") || "Add your research interests"}
          </p>
          <p>
            ${profile.preferredCountries.map(flagEmoji).join(" ")}
            ${profile.preferredCountries.join(" · ")}
          </p>
        </div>
        <div class="stat-row">
          <span><b>${model.lanes.submitted.length}</b>Applied</span
          ><span><b>${model.lanes.applying.length}</b>Applying</span
          ><span
            ><b
              >${model.lanes.outcome.filter((r) => ["offer", "awarded"].includes(r.application.stage)).length}</b
            >Offers</span
          >
        </div>
      </aside>
      <div class="dash__kpis">
        ${model.kpis.map((k) => html`<a class="card kpi" href="${k.key === "closing" ? "#/calendar" : k.key === "matches" ? "#/dashboard?section=matches" : "#/scholarships/list" + (k.key === "submitted" ? "?stage=submitted" : "")}" data-kpi="${k.key}"><span class="kpi__value">${k.value}</span><span class="kpi__label">${k.label}</span></a>`)}
      </div>
      <section class="dash__board">
        <div class="section__head">
          <h2 class="section__title">My applications</h2>
          <a href="#/scholarships/list">View all</a>
        </div>
        <div class="board">
          ${Object.entries(model.lanes).map(
            ([key, rows]) =>
              html`<section class="lane">
                <h3 class="lane__head">
                  ${label(key)} <span>${rows.length}</span>
                </h3>
                ${rows.slice(0, 4).map((r) => {
                  const c = model.card(r);
                  return appCard({ ...c, urgencyKey: c.urgency.key });
                })}${rows.length ? "" : html`<p class="section__sub">${key === "applying" ? "Add a scholarship to begin." : "No applications here yet."}</p>`}${rows.length > 4 ? html`<a href="#/scholarships/list">View ${rows.length - 4} more</a>` : ""}
              </section>`,
          )}
        </div>
      </section>
      <section class="dash__upcoming">
        <div class="section__head">
          <h2 class="section__title">Opening & closing soon</h2>
        </div>
        <div class="card card--pad timeline">
          ${
            upcoming.length
              ? upcoming.map(
                  (e) =>
                    html`<div class="timeline__item">
                      <div class="timeline__date">
                        <b>${e.day.slice(-2)}</b
                        ><span
                          >${new Intl.DateTimeFormat("en", { month: "short", timeZone: "UTC" }).format(new Date(e.day))}</span
                        >
                      </div>
                      <div>
                        <button
                          type="button"
                          class="text-button"
                          data-open-opportunity="${e.opportunityId}"
                        >
                          ${e.name}
                        </button>
                        <p class="section__sub">
                          ${label(e.type)}${e.precision === "date-only" ? " · Time not confirmed" : ""}
                        </p>
                      </div>
                    </div>`,
                )
              : html`<p class="muted">No upcoming events in your list.</p>`
          }
        </div>
      </section>
      <section class="dash__matches" id="matches">
        <div class="section__head">
          <div>
            <h2 class="section__title">Matches for you</h2>
            <p class="section__sub">
              Open now and fitting your interests. One tap adds to your list.
            </p>
          </div>
          <a href="#/settings/profile">Edit interests</a>
        </div>
        <div class="matches">
          ${matches.length ? matches.map(matchCard) : emptyState("No new curated matches", "Browse countries or update your interests. New external leads require a configured provider.")}
        </div>
        ${
          ctx.radar.items.length
            ? html`<h3 class="section">Unverified leads</h3>
                <div class="matches">
                  ${ctx.radar.items
                    .filter((c) => !ctx.v4.dismissedMatches.includes(c.id))
                    .slice(0, 6)
                    .map((c) => leadCard(c, Boolean(ctx.v4.leads[c.id])))}
                </div>`
            : ""
        }
      </section>
    </div>
  </section>`;
}
