import { foldLine, wallTime } from "../../scripts/lib/interim-calendar.mjs";
import { safeUrl } from "./schema.js";
const escape = (value) =>
  String(value)
    .replace(/\\/g, "\\\\")
    .replace(/\r\n|\r|\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
export function buildV3Calendar(deadlines, sources, { alarms = true } = {}) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Career Track//V3 Verified Deadlines//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Career Track V3",
  ];
  const seen = new Set();
  for (const d of deadlines) {
    if (
      !["exact", "date-only"].includes(d.precision) ||
      !d.date ||
      seen.has(d.id)
    )
      continue;
    seen.add(d.id);
    const source = sources.find((s) => d.sourceIds.includes(s.id));
    if (!source || !safeUrl(source.url))
      throw Error("Missing calendar provenance.");
    lines.push(
      "BEGIN:VEVENT",
      `UID:${d.id}-${d.intake}@career-track-v3`,
      `DTSTAMP:${d.checkedAt.replace(/[-:]/g, "").replace(/\.\d{3}/, "")}`,
      "SEQUENCE:0",
      `SUMMARY:${escape(d.title)}`,
    );
    if (d.precision === "exact") {
      lines.push(`DTSTART:${d.at.replace(/[-:]/g, "")}`, "DURATION:PT1M");
    } else {
      const end = new Date(Date.parse(d.date) + 86400000)
        .toISOString()
        .slice(0, 10);
      lines.push(
        `DTSTART;VALUE=DATE:${d.date.replaceAll("-", "")}`,
        `DTEND;VALUE=DATE:${end.replaceAll("-", "")}`,
      );
    }
    const timing =
      d.precision === "exact"
        ? `${d.date} ${d.time} ${d.timezone}. Dhaka: ${wallTime(d.at, "Asia/Dhaka")}.`
        : "Official date only; closing time unconfirmed. All-day marker is not an exact cutoff.";
    lines.push(
      `DESCRIPTION:${escape(`${timing} ${d.derived ? "Derived from published timing rule. " : ""}${d.action} Checked ${d.checkedAt}. Source: ${source.url}`)}`,
      `URL:${source.url}`,
      "TRANSP:TRANSPARENT",
    );
    if (alarms && d.precision === "exact")
      for (const trigger of ["-P7D", "-P3D", "-P1D", "-PT3H"])
        lines.push(
          "BEGIN:VALARM",
          "ACTION:DISPLAY",
          `TRIGGER:${trigger}`,
          `DESCRIPTION:${escape(d.title)}`,
          "END:VALARM",
        );
    lines.push("END:VEVENT");
  }
  return [...lines, "END:VCALENDAR"].map(foldLine).join("\r\n") + "\r\n";
}
