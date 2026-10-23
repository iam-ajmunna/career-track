import { buildV3Calendar } from "../../v3/calendar.js";
import { registryEvents } from "./view.js";
const escape = (value) =>
  String(value)
    .replace(/\\/g, "\\\\")
    .replace(/\r\n|\r|\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
export function buildV4Calendar(
  registry,
  { intake, mine, all = false, tests = {}, now = new Date().toISOString() },
) {
  const official = registry.deadlines.filter(
    (d) => d.intake === intake && (all || mine.has(d.opportunityId)),
  );
  const opens = registryEvents(registry, intake)
    .filter(
      (e) =>
        e.type === "opens" &&
        e.id.endsWith("-opens") &&
        (all || mine.has(e.opportunityId)),
    )
    .map((e) => ({
      ...e,
      intake,
      title: e.name + " · Opens",
      sourceIds: registry.opportunities.find((o) => o.id === e.opportunityId)
        .sourceIds,
      checkedAt: registry.opportunities.find((o) => o.id === e.opportunityId)
        .verification.checkedAt,
      action: "Verify the current application instructions before applying.",
    }));
  let text = buildV3Calendar([...official, ...opens], registry.sources);
  if (tests.booking) {
    const end = new Date(Date.parse(tests.booking) + 86400000)
      .toISOString()
      .slice(0, 10)
      .replaceAll("-", "");
    const event =
      [
        "BEGIN:VEVENT",
        "UID:personal-test@career-track-v4",
        "DTSTAMP:" + now.replace(/[-:]/g, "").replace(/\.\d{3}/, ""),
        "SUMMARY:English test · personal plan",
        "DTSTART;VALUE=DATE:" + tests.booking.replaceAll("-", ""),
        "DTEND;VALUE=DATE:" + end,
        "DESCRIPTION:" +
          escape(
            "Personal planning milestone. No official deadline or closing time is implied.",
          ),
        "TRANSP:TRANSPARENT",
        "END:VEVENT",
      ].join("\r\n") + "\r\n";
    text = text.replace("END:VCALENDAR\r\n", event + "END:VCALENDAR\r\n");
  }
  return text;
}
