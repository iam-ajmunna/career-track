// Hash router. Route shape: #/<view>[/<sub>...][?k=v&k2=v2]   e.g. #/scholarships/country/GB?focus=cw
export const VIEWS = [
  "dashboard",
  "scholarships",
  "calendar",
  "documents",
  "settings",
];
export const DEFAULT_VIEW = "dashboard";

/** Real V3 view names (verified in src/v3/workspace.js @ 8eec65b) -> new route. */
export const LEGACY = {
  overview: ["dashboard"],
  countries: ["scholarships"],
  universities: ["scholarships", "universities"],
  research: ["scholarships", "universities"],
  pipeline: ["dashboard"],
  sources: ["settings", "sources"],
  profile: ["settings", "profile"],
  goal: ["settings", "planning"],
  library: ["settings", "archive"],
};
const SCHOLARSHIP_SUBS = ["country", "list", "all", "universities", "detail"];

export function parseRoute(hash = "") {
  const raw = String(hash).replace(/^#\/?/, "");
  const [path = "", qs = ""] = raw.split("?");
  const seg = path
    .split("/")
    .filter(Boolean)
    .map((s) => {
      try {
        return decodeURIComponent(s);
      } catch {
        return s;
      }
    });
  const query = Object.fromEntries(new URLSearchParams(qs));
  let [view = DEFAULT_VIEW, ...rest] = seg;
  let redirected = false;
  if (!VIEWS.includes(view)) {
    if (LEGACY[view]) {
      [view, ...rest] = [...LEGACY[view], ...rest];
      redirected = true;
    } else {
      view = DEFAULT_VIEW;
      rest = [];
      redirected = true;
    }
  }
  // V3 detail URLs: #/scholarships/<id>  ->  #/scholarships/detail/<id>
  if (
    view === "scholarships" &&
    rest[0] &&
    !SCHOLARSHIP_SUBS.includes(rest[0])
  ) {
    rest = ["detail", rest[0]];
    redirected = true;
  }
  return {
    view,
    segments: rest,
    query,
    redirected,
    canonical: buildRoute(view, rest, query),
  };
}

export function buildRoute(view, segments = [], query = {}) {
  const path = ["#", view, ...segments.map(encodeURIComponent)].join("/");
  const q = new URLSearchParams(
    Object.entries(query).filter(
      ([, v]) => v !== undefined && v !== null && v !== "",
    ),
  ).toString();
  return q ? `${path}?${q}` : path;
}
export const countryRoute = (code, focus) =>
  buildRoute("scholarships", ["country", String(code).toUpperCase()], {
    focus,
  });

/** Number keys 1..5 jump to the five primary views (only when focus is not in a text field). */
export const KEY_TO_VIEW = {
  1: "dashboard",
  2: "scholarships",
  3: "calendar",
  4: "documents",
  5: "settings",
};
