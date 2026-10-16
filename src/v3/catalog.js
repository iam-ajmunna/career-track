import manifest from "../../data/v3/manifest.json" with { type: "json" };
import sources from "../../data/v3/sources.json" with { type: "json" };
import universities from "../../data/v3/universities.json" with { type: "json" };
import programmes from "../../data/v3/programmes.json" with { type: "json" };
import opportunities from "../../data/v3/opportunities.json" with { type: "json" };
import deadlines from "../../data/v3/deadlines.json" with { type: "json" };
import countries from "../../data/v3/countries.json" with { type: "json" };
import experiences from "../../data/v3/experiences.json" with { type: "json" };
import research from "../../data/v3/research.json" with { type: "json" };
import screened from "../../data/v3/screened.json" with { type: "json" };
import changes from "../../data/v3/changes.json" with { type: "json" };
import accessLog from "../../data/v3/accessLog.json" with { type: "json" };
import { validateRegistry } from "./schema.js";
export const registry = validateRegistry({
  ...manifest,
  sources,
  universities,
  programmes,
  opportunities,
  deadlines,
  countries,
  experiences,
  research,
  changes,
  accessLog,
  screened,
});
export const opportunityById = new Map(
  opportunities.map((row) => [row.id, row]),
);
export const universityById = new Map(universities.map((row) => [row.id, row]));
export const programmeById = new Map(programmes.map((row) => [row.id, row]));
export const sourceById = new Map(sources.map((row) => [row.id, row]));
const countryNames = new Intl.DisplayNames("en", { type: "region" });
export const countryName = (code) =>
  code === "EU"
    ? "Europe · regional collection"
    : countryNames.of(code) || code;
for (const row of opportunities)
  row.searchText = [
    row.name,
    row.provider,
    ...row.countryCodes.map(countryName),
    ...row.researchAreas,
    ...row.universityIds.map((id) => universityById.get(id).name),
    ...row.programmeIds.map((id) => programmeById.get(id).name),
    row.category,
    row.funding.classification,
  ]
    .join(" ")
    .normalize("NFKC")
    .toLowerCase();
