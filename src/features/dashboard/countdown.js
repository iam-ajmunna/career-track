// Countdown maths. Deadlines are UTC instants for precision "exact"; "date-only" has NO time of day.
export const SEC = 1000,
  MIN = 60 * SEC,
  HOUR = 60 * MIN,
  DAY = 24 * HOUR;

/** @returns {{d:number,h:number,m:number,s:number,totalMs:number}} all >= 0 */
export function splitRemaining(ms) {
  const t = Math.max(0, Math.floor(ms / SEC));
  return {
    d: Math.floor(t / 86400),
    h: Math.floor((t % 86400) / 3600),
    m: Math.floor((t % 3600) / 60),
    s: t % 60,
    totalMs: Math.max(0, ms),
  };
}
export const pad2 = (n) => String(n).padStart(2, "0");

/** Urgency bands (identical thresholds to the approved blueprint). Inclusive lower bound. */
export function urgency(ms) {
  if (ms <= 0) return { key: "closed", label: "Closed", rank: 0 };
  if (ms < 1 * DAY) return { key: "final", label: "Final hours", rank: 5 };
  if (ms < 3 * DAY) return { key: "critical", label: "Critical", rank: 4 };
  if (ms < 7 * DAY) return { key: "urgent", label: "Urgent", rank: 3 };
  if (ms < 14 * DAY) return { key: "high", label: "High", rank: 2 };
  if (ms < 30 * DAY) return { key: "attention", label: "Attention", rank: 1 };
  return { key: "normal", label: "", rank: 0 };
}

/**
 * View-model for the hero countdown.
 * deadline = { precision: 'exact'|'date-only'|'tentative'|'unknown', at?: ISO UTC, date?: 'YYYY-MM-DD', timezone?: IANA }
 */
export function countdownModel(
  deadline,
  now = Date.now(),
  dhakaDate = ymd(now, "Asia/Dhaka"),
) {
  if (!deadline) return { mode: "none", text: "Deadline not confirmed" };
  if (deadline.precision === "exact" && deadline.at) {
    const ms = Date.parse(deadline.at) - now;
    if (Number.isNaN(ms))
      return { mode: "none", text: "Deadline not confirmed" };
    if (ms <= 0) return { mode: "closed", text: "Closed", urgency: urgency(0) };
    return { mode: "live", parts: splitRemaining(ms), urgency: urgency(ms) };
  }
  if (
    deadline.precision === "date-only" &&
    /^\d{4}-\d\d-\d\d$/.test(deadline.date || "")
  ) {
    const today = ymd(now, deadline.timezone || "Asia/Dhaka");
    const days = Math.round(
      (Date.parse(deadline.date) - Date.parse(today)) / DAY,
    );
    if (days < 0)
      return { mode: "closed", text: "Closed", urgency: urgency(0) };
    // date-only: urgency from whole days, never from an invented time of day
    return {
      mode: "days",
      days,
      urgency: urgency(days * DAY + DAY - 1),
      caveat: "Closing time not confirmed",
    };
  }
  return { mode: "none", text: "Deadline not confirmed" };
}
export function ymd(ms, timeZone) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(ms));
}
/** Compact text for cards: "22d 04h" (>=3d), "2d 07h 12m", "07h 12m"; date-only -> "49 days". */
export function compactText(model) {
  if (model.mode === "closed") return "Closed";
  if (model.mode === "none") return model.text;
  if (model.mode === "days")
    return model.days === 0
      ? "Due today"
      : `${model.days} day${model.days === 1 ? "" : "s"}`;
  const { d, h, m } = model.parts;
  return d >= 3
    ? `${d}d ${pad2(h)}h`
    : d >= 1
      ? `${d}d ${pad2(h)}h ${pad2(m)}m`
      : `${pad2(h)}h ${pad2(m)}m`;
}

/** Show a UTC instant in an explicit IANA zone, e.g. "20 Oct 2026, 16:00 BST". */
export function formatInZone(iso, timeZone, locale = "en-GB") {
  return new Intl.DateTimeFormat(locale, {
    timeZone,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZoneName: "short",
  }).format(new Date(iso));
}
/** Date-only deadlines have no time of day: "8 Dec 2026". */
export function formatDateOnly(ymdText, locale = "en-GB") {
  return new Intl.DateTimeFormat(locale, {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(ymdText + "T00:00:00Z"));
}
