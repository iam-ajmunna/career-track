import opportunities from "../../.generated/v4/opportunities.index.json" with { type: "json" };
import manifest from "../../data/v3/manifest.json" with { type: "json" };
import sources from "../../data/v3/sources.json" with { type: "json" };
import universities from "../../data/v3/universities.json" with { type: "json" };
import programmes from "../../data/v3/programmes.json" with { type: "json" };
import deadlines from "../../data/v3/deadlines.json" with { type: "json" };
import countries from "../../data/v3/countries.json" with { type: "json" };
import research from "../../data/v3/research.json" with { type: "json" };
import radar from "../../data/v3/radar.json" with { type: "json" };
export const registry = {
  ...manifest,
  opportunities,
  sources,
  universities,
  programmes,
  deadlines,
  countries,
  research,
  radar,
};
export const opportunityById = new Map(opportunities.map((o) => [o.id, o]));
export const sourceById = new Map(sources.map((o) => [o.id, o]));
const names = new Intl.DisplayNames("en", { type: "region" });
export const countryName = (code) =>
  code === "EU"
    ? "Europe · regional collection"
    : /^[A-Z]{2}$/.test(code || "")
      ? names.of(code)
      : "Country not confirmed";
const guides = new Map();
export async function loadGuide(id) {
  if (!opportunityById.has(id)) throw Error("Scholarship not found.");
  if (!guides.has(id))
    guides.set(
      id,
      fetch("/data/v4/guides/" + encodeURIComponent(id) + ".json")
        .then((r) => {
          if (!r.ok)
            throw Error(
              "Guide unavailable. Connect to the internet and retry.",
            );
          return r.json();
        })
        .catch((e) => {
          guides.delete(id);
          throw e;
        }),
    );
  return guides.get(id);
}
