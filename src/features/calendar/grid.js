// Calendar maths without Date-local pitfalls: everything is computed from y/m/d integers in ONE timezone.
import { ymd } from "../dashboard/countdown.js";

/** 6x7 matrix of {date:'YYYY-MM-DD', inMonth:boolean, day:number}. weekStart: 0=Sun, 1=Mon. month: 1-12. */
export function monthMatrix(year, month, weekStart = 1) {
  const first = new Date(Date.UTC(year, month - 1, 1));
  const offset = (first.getUTCDay() - weekStart + 7) % 7;
  const start = Date.UTC(year, month - 1, 1 - offset);
  const rows = [];
  for (let r = 0; r < 6; r++) {
    const row = [];
    for (let c = 0; c < 7; c++) {
      const d = new Date(start + (r * 7 + c) * 86400000);
      row.push({
        date: d.toISOString().slice(0, 10),
        inMonth: d.getUTCMonth() === month - 1,
        day: d.getUTCDate(),
      });
    }
    rows.push(row);
  }
  return rows;
}
export const monthLabel = (year, month, locale = "en-GB") =>
  new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
export const shiftMonth = (year, month, delta) => {
  const t = year * 12 + (month - 1) + delta;
  return { year: Math.floor(t / 12), month: (t % 12) + 1 };
};

/**
 * Normalise registry deadlines + windows into calendar events.
 * input item: { id, opportunityId, name, type: 'opens'|'closes'|'milestone', precision, at?, date?, timezone? }
 * output: adds `day` = calendar day in the viewer's timezone (exact) or the published date (date-only).
 */
export function toEvents(items, viewerZone = "Asia/Dhaka") {
  return items
    .filter(
      (i) =>
        (i.precision === "exact" && i.at) ||
        (["date-only", "tentative"].includes(i.precision) && i.date),
    )
    .map((i) => ({
      ...i,
      day: i.precision === "exact" ? ymd(Date.parse(i.at), viewerZone) : i.date,
    }))
    .sort(
      (a, b) =>
        a.day.localeCompare(b.day) || (a.at || "").localeCompare(b.at || ""),
    );
}
export function eventsByDay(events) {
  const map = new Map();
  for (const e of events) {
    if (!map.has(e.day)) map.set(e.day, []);
    map.get(e.day).push(e);
  }
  return map;
}
/** Agenda grouped by month, future first. */
export function agenda(events, fromDay) {
  const groups = new Map();
  for (const e of events.filter((e) => e.day >= fromDay)) {
    const key = e.day.slice(0, 7);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(e);
  }
  return [...groups].map(([month, items]) => ({ month, items }));
}
