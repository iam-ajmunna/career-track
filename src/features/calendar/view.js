import { html } from "../../ui/html.js";
import { chip, emptyState } from "../../ui/components.js";
import { tabs, panel, label, select } from "../../ui/fields.js";
import { monthMatrix, monthLabel, toEvents, eventsByDay } from "./grid.js";
import { ymd, formatInZone } from "../dashboard/countdown.js";
export function registryEvents(registry, intake, tests = {}) {
  const events = registry.deadlines
    .filter((d) => d.intake === intake)
    .map((d) => ({
      ...d,
      name:
        registry.opportunities.find((o) => o.id === d.opportunityId)?.name ||
        d.title,
      type:
        d.type === "opening"
          ? "opens"
          : d.controlsWindow
            ? "closes"
            : "milestone",
    }));
  for (const o of registry.opportunities) {
    const w = o.windows.find((w) => w.intake === intake);
    if (w?.opens && w.verification === "verified")
      events.push({
        id: o.id + "-opens",
        opportunityId: o.id,
        name: o.name,
        type: "opens",
        precision: "date-only",
        date: w.opens,
        timezone: w.timezone,
      });
  }
  if (tests.booking)
    events.push({
      id: "personal-test",
      name: "English test · personal plan",
      type: "milestone",
      precision: "date-only",
      date: tests.booking,
      personal: true,
    });
  return events;
}
export function calendarView(ctx) {
  const today = ymd(ctx.now, ctx.zone),
    month = /^20\d{2}-(0[1-9]|1[0-2])$/.test(ctx.route.query.month || "")
      ? ctx.route.query.month
      : today.slice(0, 7),
    [year, m] = month.split("-").map(Number);
  const mode = ctx.route.query.view === "agenda" ? "agenda" : "month",
    scope = ctx.route.query.scope === "all" ? "all" : "mine",
    type = ctx.route.query.type || "all";
  const events = ctx.events.filter(
    (e) =>
      (scope === "all" || e.personal || ctx.mine.has(e.opportunityId)) &&
      (type === "all" || e.type === type),
  );
  const shown = events.filter((e) => e.day.startsWith(month)),
    byDay = eventsByDay(shown),
    matrix = monthMatrix(year, m);
  const eventButton = (e) =>
    e.personal
      ? html`<a class="cal__ev" data-type="milestone" href="#/documents/tests"
          >◆ ${e.name}</a
        >`
      : html`<button
          type="button"
          class="cal__ev"
          data-type="${e.type}"
          data-open-opportunity="${e.opportunityId}"
          title="${label(e.type)} · ${e.name}"
        >
          <span class="sr-only">${label(e.type)} </span>${e.name}
        </button>`;
  const agenda = shown.length
    ? html`<div class="agenda-list">
        ${shown.map(
          (e) =>
            html`<div class="row">
              <div>
                <p class="mono">${e.day}</p>
                ${e.personal ? html`<a href="#/documents/tests">${e.name}</a>` : html`<button type="button" class="text-button" data-open-opportunity="${e.opportunityId}">${e.name}</button>`}
                <p class="section__sub">
                  ${e.precision === "exact" ? formatInZone(e.at, ctx.zone) : e.precision === "tentative" ? "Tentative date · verify current call" : "Time not confirmed"}
                </p>
              </div>
              ${chip(label(e.type), e.type === "closes" ? "critical" : e.type === "opens" ? "success" : "info")}
            </div>`,
        )}
      </div>`
    : emptyState(
        "No events this month",
        scope === "mine"
          ? "Add a scholarship or switch to All matches."
          : "Try another month. Unconfirmed deadlines stay out of the calendar.",
      );
  return html`<section data-view="calendar">
    <div class="card cal">
      <div class="cal__bar">
        <h2 class="cal__title">${monthLabel(year, m)}</h2>
        <div class="hero__actions">
          <button
            type="button"
            class="btn btn--secondary btn--sm"
            data-month-prev
            aria-label="Previous month"
          >
            ‹</button
          ><button
            type="button"
            class="btn btn--secondary btn--sm"
            data-month-today
          >
            Today</button
          ><button
            type="button"
            class="btn btn--secondary btn--sm"
            data-month-next
            aria-label="Next month"
          >
            ›</button
          ><button
            type="button"
            class="btn btn--primary btn--sm"
            data-export-calendar
          >
            Export .ics
          </button>
        </div>
      </div>
      <div class="row calendar-controls">
        <div class="pill-row">
          <button
            type="button"
            class="btn btn--secondary btn--sm"
            data-calendar-scope="mine"
            aria-pressed="${scope === "mine"}"
          >
            My list</button
          ><button
            type="button"
            class="btn btn--secondary btn--sm"
            data-calendar-scope="all"
            aria-pressed="${scope === "all"}"
          >
            All matches
          </button>
        </div>
        ${tabs(
          [
            ["month", "Month"],
            ["agenda", "Agenda"],
          ],
          mode,
          "calendar-mode",
          "calendar",
        )}${select(
          "event-type",
          "Event type",
          [
            ["all", "All types"],
            ["opens", "Opens"],
            ["closes", "Closes"],
            ["milestone", "Milestones"],
          ],
          type,
        )}${select("zone", "Display timezone", ["Asia/Dhaka", "UTC", "Europe/London", "America/Toronto", "Australia/Sydney"], ctx.zone)}
      </div>
      <div
        id="calendar-mode-panel"
        role="tabpanel"
        aria-labelledby="calendar-mode-${mode}"
      >
        <div
          class="cal__grid${mode === "agenda" ? " is-agenda" : ""}"
          role="grid"
          aria-label="${monthLabel(year, m)}"
        >
          <div role="row" class="cal__week">
            ${["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => html`<div class="cal__dow" role="columnheader">${d}</div>`)}
          </div>
          ${matrix.map((week) => html`<div role="row" class="cal__week">${week.map((d) => html`<div role="gridcell" class="cal__cell" tabindex="${d.date === (today.startsWith(month) ? today : month + "-01") ? "0" : "-1"}" aria-label="${d.date}, ${(byDay.get(d.date) || []).length} events" data-day="${d.date}" data-out="${!d.inMonth}" data-today="${d.date === today}"><span class="cal__day">${d.day}</span>${(byDay.get(d.date) || []).map(eventButton)}</div>`)}</div>`)}
        </div>
        <div class="cal__agenda${mode === "agenda" ? " is-visible" : ""}">
          ${agenda}
        </div>
      </div>
      <p class="section__sub">
        Times in ${ctx.zone}. Date-only events keep their published date.
      </p>
    </div>
  </section>`;
}
