import {
  registry,
  countryName,
  sourceById,
  programmeById,
  universityById,
} from "./catalog.js";
import {
  opportunityFacts,
  globalCounts,
  filterOpportunities,
  readiness,
  daysTo,
  deadlinePassed,
  preferenceFit,
  freshness,
  applicationFor,
  appKey,
  fundingBalance,
} from "./domain.js";
import {
  STAGES,
  DECISIONS,
  CATEGORIES,
  FUNDING,
  WINDOWS,
  safeUrl,
} from "./schema.js";
import { escapeHtml } from "../sync/model.js";
import { documents, englishPlan, referees, refereeStages } from "../data.js";
export const e = escapeHtml;
export const label = (value) =>
  String(value || "unknown")
    .replaceAll("-", " ")
    .replace(/\b\w/g, (x) => x.toUpperCase());
export const link = (url, text) =>
  safeUrl(url)
    ? `<a href="${e(url)}" target="_blank" rel="noopener noreferrer">${e(text)} ↗</a>`
    : e(text);
export const pill = (text, kind = "neutral") =>
  `<span class="pill ${kind}">${e(text)}</span>`;
export const select = (name, values, value, caption, attrs = "") =>
  `<label class="field"><span>${e(caption)}</span><select name="${name}" ${attrs}>${values
    .map((v) => {
      const [id, title] = Array.isArray(v) ? v : [v, label(v)];
      return `<option value="${e(id)}" ${value === id ? "selected" : ""}>${e(title)}</option>`;
    })
    .join("")}</select></label>`;
export const sourceLinks = (ids) =>
  `<div class="v3-sources">${[...new Set(ids)]
    .map((id) => {
      const s = sourceById.get(id);
      return s ? link(s.url, s.title) : "";
    })
    .join(" · ")}</div>`;
const routeWithIntake = (path, intake) =>
  "#/" + path + (path.includes("?") ? "&" : "?") + "intake=" + intake;
export const routeLink = (o, intake = 2027) =>
  `#/scholarships/${o.id}?intake=${intake}`;
export function windowPill(w) {
  return (
    pill(
      label(w.status),
      w.status === "open"
        ? "success"
        : w.status === "closed" || w.status === "suspended"
          ? "neutral"
          : "warn",
    ) + (w.urgent ? pill("Urgent", "danger") : "")
  );
}
export function deadlineText(d) {
  if (!d) return "Official deadline unconfirmed";
  if (d.precision === "exact")
    return `${d.date} ${d.time} ${d.timezone} · Dhaka ${new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Dhaka", dateStyle: "medium", timeStyle: "short" }).format(new Date(d.at))}`;
  return `${d.date || "Date unconfirmed"} · ${d.precision === "date-only" ? "closing time unconfirmed" : label(d.precision)}`;
}
export function timer(d, now) {
  const days = daysTo(d, now);
  if (days === null) return "Time unconfirmed";
  if (deadlinePassed(d, now)) return "Deadline passed";
  if (d.precision === "date-only")
    return days === 0
      ? "Due today · time unconfirmed"
      : `${days} calendar days · time unconfirmed`;
  const sec = Math.max(0, Math.floor((Date.parse(d.at) - now) / 1000));
  return `${Math.floor(sec / 86400)}d ${String(Math.floor(sec / 3600) % 24).padStart(2, "0")}h ${String(Math.floor(sec / 60) % 60).padStart(2, "0")}m ${String(sec % 60).padStart(2, "0")}s`;
}
export function opRow(
  row,
  intake,
  { compare = false, selected = new Set() } = {},
) {
  const {
    opportunity: o,
    window: w,
    application: a,
    eligibility,
    blockers,
    prerequisites,
  } = row;
  return `<article class="card v3-op" data-opportunity="${o.id}"><div class="v3-op-main"><div class="v3-kicker">${e(o.countryCodes.map(countryName).join(" · "))} <span> / </span> ${e(label(o.category))}</div><h3><a href="${routeLink(o, intake)}">${e(o.name)}</a></h3><p>${e(o.funding.summary)}</p><div class="tag-row">${windowPill(w)}${pill(label(eligibility.status), eligibility.status === "ineligible" ? "danger" : "neutral")}${pill(label(a.stage))}${pill(label(a.decision))}${blockers.length ? pill("Route blocked", "danger") : prerequisites.length ? pill("Prerequisite unconfirmed", "warn") : ""}</div></div><div class="v3-op-side"><strong>${e(label(o.funding.classification))}</strong><span>${e(w.deadline?.date || "Deadline unconfirmed")}</span><small>${e(freshness(o))} · ${e(o.verification.checkedAt.slice(0, 10))}</small><div class="card-actions"><a class="button secondary" href="${routeLink(o, intake)}">Application guide</a><button class="button ghost" type="button" data-v3-pin="${o.id}" aria-pressed="${Boolean(selected.has(o.id))}">${selected.has(o.id) ? "Pinned" : "Pin"}</button>${compare ? `<label class="mini-check"><input type="checkbox" data-v3-compare="${o.id}" ${compare.has?.(o.id) ? "checked" : ""}>Compare</label>` : ""}</div></div></article>`;
}
export function overview(state, intake, now) {
  const counts = globalCounts(registry, state, now, intake),
    all = registry.opportunities.map((o) =>
      opportunityFacts(o, registry, state, now, intake),
    );
  const active = all.filter(
    (r) =>
      r.actionable &&
      ![
        "submitted",
        "under-review",
        "interview",
        "offer",
        "awarded",
        "rejected",
        "withdrawn",
      ].includes(r.application.stage),
  );
  active.sort(
    (a, b) =>
      Boolean(state.pins[b.opportunity.id]) -
        Boolean(state.pins[a.opportunity.id]) ||
      (daysTo(a.window.deadline || {}, now) ?? 999) -
        (daysTo(b.window.deadline || {}, now) ?? 999),
  );
  const next = active[0];
  const upcoming = all.filter((r) =>
    ["opening-soon", "upcoming"].includes(r.window.status),
  );
  const pending = all.filter((r) =>
    ["submitted", "under-review", "interview"].includes(r.application.stage),
  );
  const dependency = all.filter(
    (r) => r.blockers.length || r.prerequisites.length,
  );
  return `<div class="v3-intro"><div><p class="eyebrow">${intake} intake · evidence before action</p><h2>Your next move, with the facts attached.</h2><p class="muted">Application windows, funding and your progress are independent. Global counts include every route, including history.</p></div>${select(
    "intake",
    [
      ["2027", "2027 intake"],
      ["2028", "2028 intake"],
    ],
    String(intake),
    "Planning intake",
    "data-v3-intake",
  )}</div>
 <div class="v3-metrics" aria-label="Global opportunity counts">${[
   ["open", "Open now"],
   ["urgent", "Urgent · also open"],
   ["upcoming", "Opening next"],
   ["submitted", "Awaiting outcome"],
   ["verification", "Need verification"],
   ["notPursuing", "Not pursuing"],
 ]
   .map(
     ([key, title]) =>
       `<a class="card v3-metric" href="${routeWithIntake(key === "submitted" ? "pipeline?stage=submitted" : key === "notPursuing" ? "scholarships?decision=not-pursuing" : key === "open" ? "scholarships?window=open" : key === "urgent" ? "calendar" : key === "upcoming" ? "scholarships?window=opening-soon" : "sources", intake)}" data-count="${key}"><span>${e(title)}</span><strong>${counts[key]}</strong></a>`,
   )
   .join("")}</div>
 <div class="v3-coverage">${counts.total} curated routes · ${counts.eligible} meet currently assessed or conditional eligibility · ${counts.closed} closed · ${counts.preparing} in preparation · <a href="#/sources">Coverage and limitations</a></div>
 ${next ? `<section class="card v3-next"><div><p class="eyebrow">${state.pins[next.opportunity.id] ? "Pinned priority" : "Next verified deadline"}</p><h2>${e(next.opportunity.name)}</h2><p>${e(next.window.reason)}</p><div class="tag-row">${windowPill(next.window)}${pill(label(next.opportunity.funding.classification))}</div>${next.window.deadline ? `<p class="v3-timer" data-v3-timer="${next.window.deadline.id}" aria-live="off">${e(timer(next.window.deadline, now))}</p><p class="small">${e(deadlineText(next.window.deadline))}</p>` : "<p>Open consideration; exact course deadline still needs confirmation.</p>"}</div><div><a class="button" href="${routeLink(next.opportunity, intake)}">Review requirements</a><p class="small muted">Checked ${e(next.opportunity.verification.checkedAt.slice(0, 10))}. Confirm prerequisites and the live portal before committing.</p></div></section>` : `<section class="card card-pad"><h2>No verified route is ready for a new submission.</h2><p>Review verification gaps, prerequisite steps or the next intake. Submitted work remains in your pipeline.</p><a href="#/sources" class="button secondary">Review sources</a></section>`}
 <section class="section"><div class="section-head"><h2 class="section-title">Do now / this week</h2><a href="#/scholarships?window=open">All ${counts.open} open windows</a></div><div class="v3-list">${
   active
     .slice(0, 4)
     .map((r) =>
       opRow(r, intake, {
         selected: new Set(
           Object.keys(state.pins).filter((k) => state.pins[k]),
         ),
       }),
     )
     .join("") || '<p class="empty">No additional verified active routes.</p>'
 }</div></section>
 <div class="grid grid-2 section"><section class="card card-pad"><h2 class="section-title">Dependency checks</h2><p class="section-sub">A provider portal can be open while a required earlier stage is unavailable.</p>${
   dependency
     .slice(0, 4)
     .map(
       (r) =>
         `<p><a href="${routeLink(r.opportunity, intake)}">${e(r.opportunity.name)}</a><br><small>${e([...r.blockers, ...r.prerequisites].map((d) => d.title).join("; "))}</small></p>`,
     )
     .join("") || "<p>No missed deadline dependencies recorded.</p>"
 }</section><section class="card card-pad"><h2 class="section-title">Submitted / awaiting outcome</h2>${pending.map((r) => `<p><a href="${routeLink(r.opportunity, intake)}">${e(r.opportunity.name)}</a> · ${e(label(r.application.stage))}</p>`).join("") || "<p>No funding submissions recorded for this intake. University admission stages are separate in each guide.</p>"}<h3 class="section-title">Opening next</h3>${
   upcoming
     .slice(0, 3)
     .map(
       (r) =>
         `<p><a href="${routeLink(r.opportunity, intake)}">${e(r.opportunity.name)}</a> · ${e(r.opportunity.windows.find((w) => w.intake === intake)?.opens || "Opening date unconfirmed")}</p>`,
     )
     .join("") ||
   "<p>No confirmed future opening in this curated set. Unannounced cycles remain in verification.</p>"
 }</section></div>`;
}
export function explorer(state, params, intake, now, comparison) {
  const filters = Object.fromEntries(params);
  const rows = registry.opportunities.map((o) =>
    opportunityFacts(o, registry, state, now, intake),
  );
  let matches = filterOpportunities(rows, filters);
  const sort = filters.sort || "deadline";
  matches.sort(
    sort === "name"
      ? (a, b) => a.opportunity.name.localeCompare(b.opportunity.name)
      : sort === "match"
        ? (a, b) =>
            preferenceFit(b.opportunity, state).score -
            preferenceFit(a.opportunity, state).score
        : (a, b) =>
            (daysTo(a.window.deadline || {}, now) ?? 9999) -
            (daysTo(b.window.deadline || {}, now) ?? 9999),
  );
  const page = Math.max(
      1,
      Math.min(Math.ceil(matches.length / 12) || 1, Number(filters.page) || 1),
    ),
    start = (page - 1) * 12,
    shown = matches.slice(start, start + 12);
  const countryCodes = [
    ...new Set(registry.opportunities.flatMap((o) => o.countryCodes)),
  ].sort((a, b) => countryName(a).localeCompare(countryName(b)));
  return `<div class="v3-intro"><div><h2>Scholarship & funded Masters explorer</h2><p class="muted">Research degrees, scholarships, assistantships and partial awards. “Open” describes the window, not your eligibility or an award guarantee.</p></div>${select(
    "intake",
    [
      ["2027", "2027"],
      ["2028", "2028"],
    ],
    String(intake),
    "Intake",
    "data-v3-intake",
  )}</div><form id="v3Filters" class="card v3-filters" novalidate>
 ${select("country", [["", "All countries"], ...countryCodes.map((c) => [c, countryName(c)])], filters.country || "", "Country", "data-v3-filter")}${select("category", [["", "All mechanisms"], ...CATEGORIES], filters.category || "", "Funding mechanism", "data-v3-filter")}${select("window", [["", "All windows"], ...WINDOWS], filters.window || "", "Application window", "data-v3-filter")}${select("funding", [["", "All funding"], ...FUNDING], filters.funding || "", "Funding coverage", "data-v3-filter")}
 <details class="v3-filter-more" ${["eligibility", "stage", "decision", "returnHome", "degree", "area", "university", "supervisor", "english", "before", "after", "includeInactive"].some((k) => filters[k]) ? "open" : ""}><summary>Eligibility, research & personal filters</summary><div class="v3-filter-grid">${select("eligibility", [["", "All eligibility"], "confirmed", "conditional", "requires-assessment", "ineligible"], filters.eligibility || "", "Eligibility", "data-v3-filter")}${select("stage", [["", "All stages"], ...STAGES], filters.stage || "", "Personal funding stage", "data-v3-filter")}${select("decision", [["", "All decisions"], ...DECISIONS], filters.decision || "", "My decision", "data-v3-filter")}${select(
   "returnHome",
   [
     ["", "Any return-home condition"],
     ["yes", "Return required"],
     ["no", "No verified restriction"],
     ["unknown", "Terms unconfirmed"],
   ],
   filters.returnHome || "",
   "Career restriction",
   "data-v3-filter",
 )}${select("degree", [["", "All Masters types"], "research-master", "taught-master"], filters.degree || "", "Degree type", "data-v3-filter")}${select("university", [["", "All universities"], ...registry.universities.map((u) => [u.id, u.name])], filters.university || "", "University", "data-v3-filter")}${select("area", [["", "All research areas"], ...["machine-learning", "computer-vision", "efficient-ai", "multimodal-learning", "ai-systems"]], filters.area || "", "Research area", "data-v3-filter")}${select("supervisor", [["", "Any supervisor requirement"], "required", "not-required", "unknown"], filters.supervisor || "", "Supervisor", "data-v3-filter")}${select("english", [["", "Any English verification"], "verified", "unconfirmed"], filters.english || "", "English rules", "data-v3-filter")}<label class="field"><span>Deadline from</span><input type="date" name="after" value="${e(filters.after || "")}" data-v3-filter></label><label class="field"><span>Deadline through</span><input type="date" name="before" value="${e(filters.before || "")}" data-v3-filter></label>${select(
   "includeInactive",
   [
     ["", "Active records"],
     ["yes", "Include archived / deleted"],
   ],
   filters.includeInactive || "",
   "Record visibility",
   "data-v3-filter",
 )}</div></details>
 <div class="v3-filter-footer">${select(
   "sort",
   [
     ["deadline", "Nearest verified deadline"],
     ["match", "My research preferences"],
     ["name", "Name"],
   ],
   sort,
   "Sort",
   "data-v3-filter",
 )}<button type="button" class="button ghost" data-v3-clear-filters>Clear filters</button></div></form>
 <div class="section-head section"><p id="v3ResultCount" role="status">${matches.length} matching · ${shown.length ? start + 1 : 0}–${start + shown.length} shown · ${globalCounts(registry, state, now, intake).open} globally open</p><button type="button" class="button secondary" data-v3-show-compare ${comparison.size ? "" : "disabled"}>Compare funding (${comparison.size}/4)</button></div>
 <div class="v3-list">${shown.map((r) => opRow(r, intake, { compare: comparison, selected: new Set(Object.keys(state.pins).filter((k) => state.pins[k])) })).join("") || '<div class="card empty"><h3>No routes match these filters.</h3><p>Clear filters or change intake. Global totals remain independent of this result.</p><button type="button" class="button secondary" data-v3-clear-filters>Clear filters</button></div>'}</div><nav class="v3-pagination" aria-label="Opportunity pages"><button type="button" class="button secondary" data-v3-page="${page - 1}" ${page === 1 ? "disabled" : ""}>Previous</button><span>Page ${page} of ${Math.ceil(matches.length / 12) || 1}</span><button type="button" class="button secondary" data-v3-page="${page + 1}" ${start + 12 >= matches.length ? "disabled" : ""}>Next</button></nav>`;
}
function section(letter, title, body, open = false) {
  return `<details class="card v3-guide-section" ${open ? "open" : ""}><summary><span>${letter}</span>${e(title)}</summary><div class="v3-guide-body">${body}</div></details>`;
}
export function detail(o, state, intake, now) {
  const f = opportunityFacts(o, registry, state, now, intake),
    a = f.application,
    r = readiness(o, a, state),
    g = o.guide;
  const ds = registry.deadlines.filter(
    (d) => d.opportunityId === o.id && d.intake === intake,
  );
  const experience = registry.experiences.filter((x) =>
    x.scope === "opportunity"
      ? x.targetId === o.id
      : x.scope === "university" && o.universityIds.includes(x.targetId),
  );
  const fit = preferenceFit(o, state);
  return `<a href="#/scholarships?intake=${intake}" class="v3-back">← All opportunities</a><div class="v3-detail-head"><div><p class="v3-kicker">${e(o.countryCodes.map(countryName).join(" · "))} / ${e(label(o.category))}</p><h2>${e(o.name)}</h2><p>${e(o.provider)} · ${e(freshness(o))} · checked ${e(o.verification.checkedAt)}</p><div class="tag-row">${windowPill(f.window)}${pill(label(f.eligibility.status))}${pill(label(a.stage))}</div></div><div class="v3-detail-actions"><button type="button" class="button secondary" data-v3-prompt="${o.id}">Copy research prompt</button><button type="button" class="button secondary" data-v3-gpt="${o.id}">Open GPT ↗</button><button type="button" class="button secondary" data-v3-package="${o.id}">Export application package</button></div></div>
 ${f.blockers.length ? `<div class="v3-alert danger"><strong>Route blocked</strong><p>${e(f.blockers.map((d) => d.title).join("; "))}</p><p>This does not change the provider’s application-window status or erase your history.</p></div>` : ""}${f.prerequisites.length ? `<div class="v3-alert"><strong>Required prerequisite needs confirmation</strong><p>${e(f.prerequisites.map((d) => d.title).join("; "))}</p></div>` : ""}
 <section class="card v3-personal"><h3>My ${intake} application</h3><div class="v3-filter-grid">${select("stage", STAGES, a.stage, "Funding application stage", `data-v3-stage="${o.id}"`)}${select("decision", DECISIONS, a.decision, "Personal decision", `data-v3-decision="${o.id}"`)}${select(
   "tracking",
   [
     ["none", "Not tracked"],
     ["researching", "Researching"],
     ["completed", "Completed"],
   ],
   state.tracking?.[o.id] || "none",
   "Research / completion tracking",
   `data-v3-track="${o.id}"`,
 )}</div><p>Submission means your funding application was sent. University admission is tracked separately below. “Completed” research does not mean “Submitted”.</p><div class="tag-row">${pill(`${r.done}/${r.total} required preparation steps`)}${r.percent === null ? "" : pill(`${r.percent}% checklist readiness`)}${pill(r.verifiedComplete ? "Verified checklist complete" : "Requirements still need review", r.verifiedComplete ? "success" : "warn")}</div>${a.legacyScope ? `<p class="small v3-alert">${e(a.legacyScope)} Check the admission and scholarship records before changing a submitted stage.</p>` : ""}
 ${o.programmeIds
   .map((id) => {
     const p = programmeById.get(id);
     return `<div class="v3-admission"><strong>${e(p.name)}</strong>${select("admission", STAGES, state.v3.admissions[appKey(id, intake)]?.stage || "not-started", "University admission stage", `data-v3-admission="${id}"`)}</div>`;
   })
   .join(
     "",
   )}<div class="card-actions"><button type="button" class="button ghost" data-v3-pin="${o.id}" aria-pressed="${Boolean(state.pins[o.id])}">${state.pins[o.id] ? "Unpin priority" : "Pin priority"}</button><button type="button" class="button ghost" data-v3-life="archive" data-id="${o.id}">Archive</button><button type="button" class="button danger-outline" data-v3-life="delete" data-id="${o.id}">Move to Trash</button></div></section>
 ${section("A", "Overview", `<p>${e(g.overview)}</p><p>${e(o.funding.summary)}</p><p>Degree type: ${e(o.degreeTypes.map(label).join(", "))}. Research tags are a starting point; verify the selected course and faculty.</p>`, true)}
 ${section("B", "Current status", `<div class="tag-row">${windowPill(f.window)}</div><p>${e(f.window.reason || "Application details need review.")}</p><p>Last verified ${e(o.verification.checkedAt)}. ${e(freshness(o))}. A closed window does not remove submitted records.</p>${sourceLinks(o.sourceIds)}`, true)}
 ${section("C", "Eligibility", `<ul>${f.eligibility.rules.map((rule) => `<li>${pill(label(rule.assessment))} ${e(rule.label)}</li>`).join("")}</ul><p>Residence, degree equivalence, graduation evidence, CGPA/classification, prerequisite subjects, work experience, financial need, age and prior international study must be checked where the scheme uses them.</p><p>Unlisted restrictions remain unconfirmed. ${e(fit.label)}</p><ul>${fit.reasons.map((x) => `<li>${e(x)}</li>`).join("")}</ul><a href="#/profile">Edit my private profile and preferences</a>`)}
 ${section("D", "Funding reality", fundingTable(o) + budgetForm(o, state, intake, 1) + budgetForm(o, state, intake, 2))}
 ${section(
   "E",
   "Programme selection",
   o.programmeIds.length
     ? o.programmeIds
         .map((id) => {
           const p = programmeById.get(id);
           return `<p><strong>${e(p.name)}</strong> · ${e(p.degree)} · ${e(p.duration)}<br>${link(p.url, "Official programme instructions")}</p>`;
         })
         .join("")
     : "<p>Current eligible course list has not been confirmed. This is a discovery lead until the official list is checked.</p>",
 )}
 ${section("F", "Application portals", `<ol>${g.portals.map((p) => `<li>${link(p.url, p.label)}<br><small>${e(p.role)}</small></li>`).join("")}</ol><p>External portal submission happens on the provider’s site. This tracker does not submit an application for you.</p>`)}
 ${section("G", "Chronological preparation checklist", `<div class="checklist">${g.steps.map((s) => `<label class="check-row v3-check"><input type="checkbox" ${s.legacyKey ? `data-progress-key="${s.legacyKey}"` : `data-v3-step="${s.id}" data-id="${o.id}"`} ${(s.legacyKey ? state.progress[s.legacyKey] : a.completedSteps?.[s.id]) ? "checked" : ""}><span>${e(s.text)}${s.legacyKey ? "<small>Original checklist preserved; verify current instructions.</small>" : ""}</span></label>`).join("")}</div>`, true)}
 ${section(
   "H",
   "Document matrix",
   `<div class="v3-table-wrap"><table><caption>Official constraints are explicit; unverified fields are not submission instructions.</caption><thead><tr><th>Document</th><th>Requirement & issuer</th><th>Format / limits</th><th>Submission / preparation</th></tr></thead><tbody>${g.documents
     .map((d, i) => {
       const key = o.id + "-doc-" + i,
         privateDoc = state.v3.documents[key] || {
           status: "not-started",
           version: "",
         };
       return `<tr><th>${e(d.name)}</th><td>${d.required ? "Required" : "Optional"}<br>${e(d.issuer)}<br>Attestation: ${e(d.attestation)}<br>Translation: ${e(d.translation)}</td><td>${e(d.format)}<br>${e(d.limit)}<br>Template: ${e(d.template)}</td><td>${e(d.method)}<br>${e(d.deadline)}${select("doc-status", ["not-started", "preparing", "ready", "submitted", "expired"], privateDoc.status, "Preparation", `data-v3-doc="${key}"`)}<label class="field"><span>Private document version</span><input maxlength="120" data-v3-doc-version="${key}" value="${e(privateDoc.version||'')}"></label></td></tr>`;
     })
     .join(
       "",
     )}</tbody></table></div><a href="#/documents">Open document and referee planner</a>`,
 )}
 ${section("I", "Referee plan", `<p><strong>${g.references.count ?? "Unconfirmed number of"} referees</strong>. ${e(g.references.types)}</p><dl class="v3-definition"><dt>Submission</dt><dd>${e(g.references.method)}</dd><dt>Email</dt><dd>${e(g.references.email)}</dd><dt>Format</dt><dd>${e(g.references.format)}</dd><dt>Deadline</dt><dd>${e(g.references.deadline)}</dd></dl><p>Planning reminders: ask about 21 days before the verified deadline, brief at 14 days, and gently follow up at 7 and 3 days. These are your planning targets, not official deadlines. Obtain consent and avoid repeated reminders after a referee confirms submission.</p>${select("referee", [["", "No primary referee assigned"], ...Object.entries(state.v3.references).map(([id, row]) => [id, row.name || id])], a.refereeId || "", "Primary referee for this opportunity", `data-v3-referee="${o.id}"`)}${select("refstage", ["not-requested", "requested", "confirmed", "briefed", "submitted"], a.referenceStage || "not-requested", "Reference follow-up stage", `data-v3-refstage="${o.id}"`)}<p><a href="#/documents">Maintain private referee contacts</a></p>`)}
 ${section("J", "English language", `<p>${pill(label(g.english.status))}</p><h4>University admission</h4><p>${e(g.english.admission)}</p><h4>Scholarship</h4><p>${e(g.english.scholarship)}</p><p>Do not assume an MOI exemption or reuse a score beyond its accepted validity. A portfolio target is not a provider’s formal minimum.</p>`)}
 ${section("K", "SOP, essays & research proposal", g.essays.map((essay) => `<article><h4>${e(essay.name)}</h4><p><strong>${e(essay.limit)}</strong></p><p>${e(essay.purpose)}</p><p>${e(essay.evidence)}</p><label class="field"><span>Private outline / evidence plan</span><textarea class="resize-none" rows="5" maxlength="8000" data-v3-essay="${o.id}-essay-${g.essays.indexOf(essay)}" data-note-draft>${e(state.notes?.[o.id + "-essay-" + g.essays.indexOf(essay)] || "")}</textarea></label><button class="button secondary" type="button" data-v3-save-note="${o.id}-essay-${g.essays.indexOf(essay)}">Save outline</button></article>`).join(""))}
 ${section(
   "L",
   "Nomination & supervisor dependencies",
   `<p><strong>Supervisor: ${e(label(g.supervisor.requirement))}</strong>. ${e(g.supervisor.detail)}</p><p>${e(g.nomination)}</p>${ds
     .filter((d) => d.blocksRoute)
     .map(
       (d) =>
         `<label class="check-row"><input type="checkbox" data-v3-step="${d.id}" data-id="${o.id}" ${a.completedSteps?.[d.id] ? "checked" : ""}><span>${e(d.title)} — mark complete only with confirmation.</span></label>`,
     )
     .join(
       "",
     )}<form data-v3-blocker="${o.id}" novalidate><label class="field"><span>Private blocker (e.g. missed nomination)</span><input name="blockedReason" maxlength="500" value="${e(a.blockedReason || "")}"></label><p data-form-error role="status"></p><button class="button secondary" type="submit">Save blocker</button></form>`,
 )}
 ${section("M", "Deadlines & critical path", `<div class="v3-list">${ds.map((d) => `<article class="v3-deadline"><h4>${e(d.title)}</h4><p>${e(deadlineText(d))}${d.derived ? " · Derived date from official rule" : ""}</p><p class="v3-timer" data-v3-timer="${d.id}" aria-live="off">${e(timer(d, now))}</p><small>${d.dependsOn.length ? "Depends on: " + e(d.dependsOn.join(", ")) : "Independent stage"} · verified ${e(d.checkedAt.slice(0, 10))}</small>${sourceLinks(d.sourceIds)}</article>`).join("") || "<p>Official dates are unconfirmed.</p>"}</div><ol><li>Do now: check eligibility, funding and the earliest prerequisite.</li><li>This week: secure supervisor/nomination feasibility and prepare source documents.</li><li>Before requesting references: confirm referee type, direct-submission method and deadline.</li><li>Before admission: complete course-specific requirements.</li><li>Before funding: complete every separate scholarship or nomination form.</li><li>Final 48 hours: inspect uploads, reference receipts and payment/waiver status; save confirmation.</li><li>After submission: retain receipts, monitor official requests and record interviews/offers.</li></ol><button type="button" class="button secondary" data-v3-ics="${o.id}">Export these calendar dates</button>`)}
 ${section("N", "Risks & unresolved requirements", `<ul>${[...g.risks, ...g.unconfirmed].map((x) => `<li>${e(x)}</li>`).join("")}</ul>`)}
 ${section(
   "O",
   "Official sources & field provenance",
   `${sourceLinks(o.sourceIds)}<dl class="v3-definition">${Object.entries(
     o.claims,
   )
     .map(
       ([field, claim]) =>
         `<dt>${e(label(field))}</dt><dd>${e(label(claim.certainty))} · ${e(claim.checkedAt)}${sourceLinks(claim.sourceIds)}</dd>`,
     )
     .join("")}</dl>`,
 )}
 ${section("P", "Student experiences", experience.length ? experience.map(experienceCard).join("") : '<p>No relevant firsthand account has been verified for this route yet. Official rules above remain the basis for decisions. <a href="#/sources">See evidence gaps and access limits.</a></p>')}
 ${section("Q", "My decision & notes", `<p>Apply, research, watch, low priority and not pursuing are personal decisions. They do not change the provider’s window or funding policy.</p><label class="field"><span>Private application notes</span><textarea class="resize-none" rows="7" maxlength="8000" data-v3-note="${o.id}" data-note-draft>${e(state.notes?.[o.id] || "")}</textarea></label><button type="button" class="button secondary" data-v3-save-note="${o.id}">Save notes</button><p class="small">Only saved in this browser; use Export progress for a backup.</p>`)}
 <div class="v3-alert"><strong>Verify before submitting</strong><p>The guide records checked facts and explicit unknowns. The live official portal and the written award offer govern your application.</p></div>`;
}
export function fundingTable(o) {
  return `<p>${pill(label(o.funding.classification))}</p><p>${e(o.funding.summary)}</p><div class="v3-table-wrap"><table><thead><tr><th>Component</th><th>Verified coverage / amount</th><th>Condition</th></tr></thead><tbody>${o.funding.components.map((c) => `<tr><th>${e(c.label)}</th><td>${e(c.detail)}</td><td>${c.conditional ? "Conditional — excludes assumed guaranteed income" : "See published terms"}</td></tr>`).join("") || '<tr><td colspan="3">Itemised funding is not verified for this route.</td></tr>'}</tbody></table></div><h4>Uncovered or unknown</h4><ul>${o.funding.uncovered.map((x) => `<li>${e(x)}</li>`).join("")}</ul><p>${e(o.funding.renewal)}</p><h4>Career restriction</h4><p>${pill(o.obligations.returnHome === "yes" ? "Return-home requirement" : o.obligations.returnHome === "no" ? "No verified restriction" : "Return-home terms unconfirmed", o.obligations.returnHome === "yes" ? "warn" : "neutral")} ${e(o.obligations.detail)}</p><p>${e(o.obligations.employment)}</p>`;
}
export function budgetForm(o, state, intake, year) {
  const key = `${o.id}:${intake}:${year}`,
    b = state.v3.budgets[key] || {
      currency: o.funding.currency || "USD",
      stipend: null,
      grants: null,
      assistantship: null,
      tuition: null,
      fees: null,
      insurance: null,
      living: null,
      assistantshipGuaranteed: false,
    },
    balance = fundingBalance(b);
  return `<form class="v3-budget" data-v3-budget="${key}" novalidate><h4>Year ${year} · private funding calculation</h4><p>Enter annual amounts in one currency. Blank means unknown; enter 0 only for a confirmed zero. Provider tables above are not copied into your budget automatically.</p><div class="v3-filter-grid">${select("currency", ["USD", "CAD", "AUD", "GBP", "EUR", "AED", "CHF", "NZD", "NOK", "SEK", "BDT", "JPY", "KRW", "HUF", "TRY"], b.currency, "Currency")}${["stipend", "grants", "assistantship", "tuition", "fees", "insurance", "living"].map((field) => `<label class="field"><span>${e(label(field))} / year</span><input type="number" name="${field}" min="0" max="1000000000" step="0.01" inputmode="decimal" value="${b[field] ?? ""}"></label>`).join("")}</div><label class="mini-check"><input type="checkbox" name="assistantshipGuaranteed" ${b.assistantshipGuaranteed ? "checked" : ""}>Assistantship amount is guaranteed in my written offer</label><p><output>${balance.net === null ? "Net unavailable — missing " + balance.missing.join(", ") : `${b.currency} ${balance.net.toLocaleString("en", { maximumFractionDigits: 2 })} after listed annual costs${balance.conditionalExcluded ? " · conditional assistantship excluded" : ""}`}</output></p><p data-form-error role="status"></p><button type="submit" class="button secondary">Save year ${year} calculation</button><p class="small">No live exchange-rate feed is configured. Different currencies are not ranked or converted using stale rates. Tax and payments require offer-specific review.</p></form>`;
}
export function experienceCard(x) {
  return `<article class="v3-experience"><p>${pill("Student experience · anecdotal", "info")} ${e(x.programme)}</p><p>${e(x.summary)}</p><p><strong>Interpretation:</strong> ${e(x.interpretation)}</p><p><strong>Limits:</strong> ${e(x.limitations)}</p><small>Nationality: ${e(x.nationality)} · ${e(x.publicationNote)} · checked ${e(sourceById.get(x.sourceId).checkedAt)}</small>${sourceLinks([x.sourceId])}</article>`;
}
export function pipeline(state, params, intake, now) {
  const stage = params.get("stage") || "";
  const rows = registry.opportunities
    .map((o) => opportunityFacts(o, registry, state, now, intake))
    .filter((r) =>
      stage === "submitted"
        ? ["submitted", "under-review", "interview"].includes(
            r.application.stage,
          )
        : stage
          ? r.application.stage === stage
          : r.application.stage !== "not-started" ||
            ["apply", "not-pursuing"].includes(r.application.decision) ||
            state.tracking?.[r.opportunity.id],
    );
  return `<div class="v3-intro"><div><h2>Applications stay visible through every outcome.</h2><p class="muted">Availability, personal decisions, admissions and funding applications are separate records.</p></div>${select(
    "intake",
    [
      ["2027", "2027"],
      ["2028", "2028"],
    ],
    String(intake),
    "Intake",
    "data-v3-intake",
  )}</div>${select("stage", [["", "All recorded applications"], ...STAGES], stage, "Funding stage", "data-v3-pipeline-stage")}<div class="v3-list section">${rows.map((r) => opRow(r, intake, { selected: new Set(Object.keys(state.pins).filter((k) => state.pins[k])) })).join("") || '<div class="card empty"><h3>No applications recorded for this selection.</h3><p>Choose a route in the explorer and set your personal stage.</p><a class="button secondary" href="#/scholarships">Explore opportunities</a></div>'}</div><section class="card card-pad section"><h3>University admission records</h3>${
    Object.values(state.v3.admissions)
      .filter((a) => a.intake === intake)
      .map(
        (a) =>
          `<p>${e(programmeById.get(a.programmeId)?.name || a.programmeId)} · ${pill(label(a.stage))}</p>`,
      )
      .join("") ||
    "<p>No separate university admission stage recorded. Existing migrated funding stages are kept with a scope warning.</p>"
  }</section>`;
}
export function countryExplorer(params, state, intake, now, allCountries) {
  const code = params.get("country"),
    q = (params.get("q") || "").toLowerCase();
  const selected = registry.countries.find((c) => c.code === code);
  if (code) {
    const rows = registry.opportunities
      .filter((o) => o.countryCodes.includes(code))
      .map((o) => opportunityFacts(o, registry, state, now, intake));
    return `<a href="#/countries" class="v3-back">← All countries and territories</a><h2>${e(countryName(code))}</h2>${selected ? `<section class="card card-pad"><p>${pill(selected.verification === "official-information-unavailable" ? "Official details unavailable" : "Official policy checked", "info")} ${e(selected.checkedAt)}</p><h3>After the Masters</h3><p>${e(selected.postStudy)}</p><h3>Conditions that matter</h3><p>${e(selected.conditions)}</p><h3>Longer-term work route</h3><p>${e(selected.transition)}</p><p>${e(selected.longTerm)}</p><h3>During study</h3><p>${e(selected.studyWork)}</p><p>${e(selected.cost)}</p><p>${e(selected.language)}</p><p>${e(selected.returnHome)}</p>${sourceLinks(selected.sourceIds)}</section>` : '<div class="card card-pad"><h3>Country policy not verified in this release.</h3><p>There is no current immigration summary for this country. A lack of records is a coverage gap, not an eligibility or funding conclusion.</p></div>'}<h3 class="section-title section">${rows.length} curated funding routes</h3><div class="v3-list">${rows.map((r) => opRow(r, intake)).join("") || '<div class="card empty">No curated route yet. Use the source-discovery directory to research official calls.</div>'}</div>`;
  }
  const sorted = [...allCountries]
    .filter((c) => (c.name + " " + c.code).toLowerCase().includes(q))
    .sort((a, b) => {
      const prefs = state.v3.preferences.preferredCountries;
      return (
        prefs.includes(b.code) - prefs.includes(a.code) ||
        a.name.localeCompare(b.name)
      );
    });
  const limit = Math.max(40, Number(params.get("limit")) || 40);
  return `<h2>Country explorer</h2><p class="muted">All countries and territories remain discoverable. Eight priority destinations have current official policy notes; coverage is measured openly.</p><form data-v3-country-search class="v3-inline-search" novalidate><label class="field"><span>Find a country</span><input type="search" name="q" value="${e(params.get("q") || "")}" maxlength="120"></label><button class="button secondary" type="submit">Search countries</button>${q ? '<a class="button ghost" href="#/countries">Clear search</a>' : ""}</form><p>${sorted.length} matches · ${Math.min(limit, sorted.length)} shown</p><div class="v3-country-grid">${sorted
    .slice(0, limit)
    .map((c) => {
      const n = registry.opportunities.filter((o) =>
          o.countryCodes.includes(c.code),
        ).length,
        p = registry.countries.find((p) => p.code === c.code);
      return `<a class="card v3-country" href="#/countries?country=${c.code}"><h3>${e(c.name)}</h3><p>${n} curated routes</p><small>${p ? "Official policy notes · 16 Oct 2026" : "Policy verification pending"}</small></a>`;
    })
    .join(
      "",
    )}</div>${sorted.length > limit ? `<a class="button secondary section" href="#/countries?limit=${limit + 40}${q ? "&q=" + encodeURIComponent(q) : ""}">Load 40 more countries</a>` : ""}`;
}
export function universityExplorer(state, intake) {
  return `<h2>University explorer</h2><p class="muted">Funding guarantees, competitive awards and unavailable routes are distinct. Select a course’s guide to inspect the actual pathway.</p><div class="v3-country-grid">${registry.universities
    .map((u) => {
      const os = registry.opportunities.filter((o) =>
        o.universityIds.includes(u.id),
      );
      return `<article class="card card-pad"><p class="v3-kicker">${e(countryName(u.countryCode))}</p><h3>${e(u.name)}</h3><p>${link(u.url, "Official university / department")}</p>${os.map((o) => `<p><a href="${routeLink(o, intake)}">${e(o.name)}</a><br><small>${e(label(o.funding.classification))}</small></p>`).join("")}<a href="#/scholarships?university=${u.id}">Filter scholarship explorer →</a></article>`;
    })
    .join("")}</div>`;
}
export function researchExplorer(state) {
  const desired = state.v3.profile.researchAreas;
  return `<h2>Research & supervisor explorer</h2><p class="muted">${registry.research.length} official research directories and groups. Research overlap does not confirm an available supervisor, funded vacancy or admission.</p><div class="v3-list">${[
    ...registry.research,
  ]
    .sort(
      (a, b) =>
        b.researchAreas.filter((x) => desired.includes(x)).length -
        a.researchAreas.filter((x) => desired.includes(x)).length,
    )
    .map(
      (r) =>
        `<article class="card card-pad"><p class="v3-kicker">${e(universityById.get(r.universityId).name)}</p><h3>${link(r.url, r.name)}</h3><div class="tag-row">${r.researchAreas.map((a) => pill(label(a))).join("")}${pill("Recruitment unconfirmed", "warn")}</div><p>${e(r.detail)}</p><p>${e(r.funding)} ${e(r.contact)}</p><p class="small">Checked ${e(r.checkedAt)}. Preference overlap: ${e(
          r.researchAreas
            .filter((a) => desired.includes(a))
            .map(label)
            .join(", ") || "not configured",
        )}.</p>${sourceLinks(r.sourceIds)}</article>`,
    )
    .join(
      "",
    )}</div><section class="card card-pad section"><h3>Prepare a focused supervisor approach</h3><p>Read recent papers, identify one concrete research connection and verify the faculty’s contact instructions. Use a brief introduction, a specific question, a concise CV and truthful contribution evidence. Do not send mass messages or assume directory membership means recruitment.</p></section>`;
}
export function calendar(state, intake, now) {
  const rows = registry.deadlines
    .filter((d) => d.intake === intake)
    .sort((a, b) => (a.date || "9999").localeCompare(b.date || "9999"));
  return `<div class="v3-intro"><div><h2>Calendar & critical dependencies</h2><p class="muted">Original provider time and Dhaka time are preserved. Date-only calls never receive an invented 23:59 cutoff.</p></div><button type="button" class="button secondary" data-v3-ics="all">Export verified dates (.ics)</button></div><p class="v3-alert">Calendar alarms work after you import the file into a calendar app. Browser notices update only while this workspace is open. Scheduled source checks produce a review report; they do not send personal reminders.</p><div class="v3-list">${rows
    .map((d) => {
      const o = registry.opportunities.find((o) => o.id === d.opportunityId),
        a = applicationFor(state, o.id, intake),
        done = a.completedSteps?.[d.id];
      return `<article class="card card-pad v3-deadline"><div class="tag-row">${pill(label(d.type))}${pill(label(d.precision), ["tentative", "unknown"].includes(d.precision) ? "warn" : "neutral")}${done ? pill("Completed", "success") : ""}${d.blocksRoute ? pill("Required dependency", "warn") : ""}</div><h3><a href="${routeLink(o, intake)}">${e(o.name)}</a></h3><p><strong>${e(d.title)}</strong></p><p>${e(deadlineText(d))}</p><p class="v3-timer" data-v3-timer="${d.id}" aria-live="off">${e(timer(d, now))}</p>${d.derived ? "<p>Derived calendar date from the official relative timing rule; confirm the invitation.</p>" : ""}<p class="small">${d.dependsOn.length ? "Depends on: " + e(d.dependsOn.join(", ")) : "Independent milestone"} · verified ${e(d.checkedAt)}</p>${sourceLinks(d.sourceIds)}</article>`;
    })
    .join("")}</div>`;
}
export function sourcesView(state) {
  const classified = registry.opportunities.reduce(
    (n, o) => (
      (n[o.verification.state] = (n[o.verification.state] || 0) + 1),
      n
    ),
    {},
  );
  return `<h2>Research, sources & change review</h2><p class="muted">${registry.opportunities.length} curated routes · ${registry.sources.length} source records · ${registry.universities.length} universities · ${registry.research.length} research leads · ${registry.experiences.length} firsthand accounts. This registry is not exhaustive.</p><div class="card card-pad"><h3>What is verified</h3><p>${Object.entries(
    classified,
  )
    .map(([k, n]) => `${n} ${label(k)}`)
    .join(
      " · ",
    )}. A verified funding policy can coexist with an unconfirmed 2027 opening.</p><p>Field-level evidence appears in each application guide. “Checked” records a human/source review; a website fingerprint only reports technical content changes.</p><h3>Daily source monitoring</h3><p>A scheduled GitHub Actions workflow checks approved public official sources, observes robots rules, limits requests and saves a review report. It never silently rewrites dates, eligibility or award terms. A maintainer must review changed pages and publish verified claims.</p>${link("https://github.com/iam-ajmunna/career-track/actions/workflows/source-review.yml", "Source review runs and downloadable reports")}<p>Reports in this private repository require your GitHub access. Download a JSON report from a run and import it here to view source-change notices on this device.</p><button type="button" class="button secondary" data-v3-pick-report>Import source-check report</button><input type="file" id="v3ReportFile" accept=".json,application/json" hidden><p id="v3ReportStatus" role="status"></p></div>
 <section class="section"><h3>Reviewed changes</h3><div class="v3-list">${registry.changes.map((c) => `<article class="card card-pad"><p class="v3-kicker">${e(c.date)} · ${e(c.field)}</p><h4>${e(c.after)}</h4><p>Previous assumption: ${e(c.before)}</p><a href="#/scholarships/${c.opportunityId}">Review affected route →</a>${sourceLinks(c.sourceIds)}</article>`).join("")}</div>${Object.values(
   state.v3.notifications,
 )
   .map(
     (n) =>
       `<p class="v3-alert">${e(n.title || "Source notice")} · ${e(n.status || "review needed")} · ${e(n.checkedAt || "")}</p>`,
   )
   .join("")}</section>
 <details class="card card-pad section"><summary>Source register (${registry.sources.length})</summary><div class="v3-table-wrap"><table><thead><tr><th>Source</th><th>Evidence class</th><th>Last checked</th></tr></thead><tbody>${registry.sources.map((s) => `<tr><td>${link(s.url, s.title)}<br>${e(s.publisher)}</td><td>${e(label(s.kind))}</td><td>${e(s.checkedAt)}</td></tr>`).join("")}</tbody></table></div></details>
 <section class="section"><h3>Student experience evidence</h3><p>Firsthand reports provide context, not scholarship rules. No private group or inaccessible video was summarised.</p>${registry.experiences.map(experienceCard).join("")}<h4>Coverage gaps / access limits</h4>${registry.accessLog.map((x) => `<p>${e(x.platform)}: ${e(x.result)} ${link(x.url, "Source / access point")}</p>`).join("")}<p>US, UK and most individual scholarships still lack a verified practical firsthand account. No selection probability is inferred from social posts.</p></section>
 <section class="card card-pad section"><h3>Discover new routes from official directories</h3><p>Search government calls, university funding pages, funded thesis departments, project vacancies, assistantships and foundation awards. Validate nationality, current intake, full cost and course eligibility before promoting a lead.</p>${sourceLinks(registry.sources.filter((s) => ["legacy-erasmus-ai", "legacy-daad-master", "legacy-gks", "legacy-mext-university"].includes(s.id)).map((s) => s.id))}<p>Review cadence: near deadlines and open calls every few days; upcoming calls about every two weeks; immigration whenever a decision depends on it. Static claims age visibly until reviewed.</p></section>`;
}
export function library(state, intake, now) {
  const ids = new Set([
    ...Object.keys(state.lifecycle || {}),
    ...Object.keys(state.history || {}),
  ]);
  const inactive = [...registry.opportunities, ...registry.screened].filter(
    (o) => ids.has(o.id),
  );
  const closed = registry.opportunities
    .map((o) => opportunityFacts(o, registry, state, now, intake))
    .filter((r) => ["closed", "suspended"].includes(r.window.status));
  const outcomes = registry.opportunities
    .map((o) => opportunityFacts(o, registry, state, now, intake))
    .filter(
      (r) =>
        ["awarded", "rejected", "withdrawn"].includes(r.application.stage) ||
        r.application.decision === "not-pursuing" ||
        state.tracking[oId(r)] === "completed",
    );
  function oId(r) {
    return r.opportunity.id;
  }
  return `<h2>Archive & history</h2><p class="muted">Deadlines and elapsed time never erase V3 progress. Trash stays recoverable until you explicitly purge it after exporting a backup.</p><section class="section"><h3>Archived / Trash / prior history (${inactive.length})</h3><div class="v3-list">${inactive.map((o) => `<article class="card card-pad"><h4>${o.category ? `<a href="${routeLink(o, intake)}">${e(o.name)}</a>` : e(o.name)}</h4>${o.reason ? `<p>${e(o.reason)} · historical screening ${e(o.checkedAt.slice(0, 10))}</p>${link(o.url, "Retained official source")}` : ""}<p>${e(label(state.lifecycle[o.id]?.status || "history"))}</p><div class="card-actions"><button class="button secondary" type="button" data-v3-life="restore" data-id="${o.id}">Restore</button>${state.lifecycle[o.id]?.status === "trash" ? `<button class="button danger-outline" type="button" data-v3-life="purge" data-id="${o.id}">Export backup & permanently purge</button>` : ""}</div></article>`).join("") || '<p class="empty card">No archived or deleted records.</p>'}</div></section><section class="section"><h3>Not pursuing / completed / final outcomes (${outcomes.length})</h3><div class="v3-list">${outcomes.map((r) => opRow(r, intake)).join("") || '<p class="empty card">No final outcomes recorded.</p>'}</div></section><section class="section"><h3>Closed or suspended application windows (${closed.length})</h3><div class="v3-list">${closed.map((r) => opRow(r, intake)).join("")}</div></section><details class="card card-pad section"><summary>Earlier expired history and unmatched IDs</summary>${
    Object.entries(state.history || {})
      .map(([id, h]) => `<p>${e(h.name)} · ${e(h.deadline)} · ${e(id)}</p>`)
      .join("") || "<p>No prior expired history.</p>"
  }<p>Imported records with IDs absent from this curated registry remain in your complete backup.</p>${Object.entries(
    state.lifecycle || {},
  )
    .filter(
      ([id]) =>
        !registry.opportunities.some((o) => o.id === id) &&
        !registry.screened.some((o) => o.id === id),
    )
    .map(
      ([id, row]) =>
        `<p>${e(id)} · ${e(label(row.status))} <button type="button" class="button secondary" data-v3-life="restore" data-id="${e(id)}">Restore retained record</button></p>`,
    )
    .join(
      "",
    )}</details><details class="card card-pad section"><summary>Earlier screened-out leads (${registry.screened.length})</summary><p>Historical screening reasons are retained. Recheck the current official call before relying on them.</p>${registry.screened.map((s) => `<article><h4>${e(s.name)}</h4><p>${e(s.reason)}</p><p>Historical check: ${e(s.checkedAt)} · ${link(s.url, "Official research entry")}</p></article>`).join("")}</details>`;
}
export function documentsView(state) {
  return `<h2>Documents & references</h2><p class="muted">Original checklist meanings and progress keys are preserved. Course-specific requirements in each guide take precedence over planning suggestions.</p><div class="grid grid-2">${[
    ...new Set(documents.map((d) => d.group)),
  ]
    .map(
      (group) =>
        `<section class="card card-pad"><h3>${e(group)}</h3><div class="checklist">${documents
          .filter((d) => d.group === group)
          .map(
            (d) =>
              `<label class="check-row v3-check"><input type="checkbox" data-progress-key="doc-${d.id}" ${state.progress["doc-" + d.id] ? "checked" : ""}><span><strong>${e(d.label)}</strong><small>${e(d.detail)}</small></span></label>`,
          )
          .join("")}</div></section>`,
    )
    .join(
      "",
    )}</div><section class="card card-pad section"><h3>English preparation</h3><p>Portfolio planning target: ${e(englishPlan.target)}. Verify each course’s actual minimum and accepted test rules.</p>${englishPlan.steps.map((s) => `<label class="check-row"><input type="checkbox" data-progress-key="ielts-${s.id}" ${state.progress["ielts-" + s.id] ? "checked" : ""}><span>${e(s.label)}</span></label>`).join("")}</section><section class="section"><h3>Private referee planner</h3><p>Names and email addresses remain in this browser and your private exports. This tracker does not email referees.</p><div class="grid grid-3">${referees
    .map((ref) => {
      const row = state.v3.references["ref-" + ref.id.toLowerCase()] || {
        name: "",
        email: "",
      };
      return `<form class="card card-pad" data-v3-reference="ref-${ref.id.toLowerCase()}" novalidate><h4>Referee ${ref.id} · ${e(ref.role)}</h4><label class="field"><span>Name</span><input name="name" maxlength="120" value="${e(row.name)}" autocomplete="off"></label><label class="field"><span>Email</span><input type="email" name="email" maxlength="254" value="${e(row.email)}" autocomplete="off"></label><p data-form-error role="status"></p><button type="submit" class="button secondary">Save private contact</button><div class="checklist">${refereeStages.map((s) => `<label class="mini-check"><input type="checkbox" data-progress-key="ref-${ref.id}-${s.id}" ${state.progress[`ref-${ref.id}-${s.id}`] ? "checked" : ""}>${e(s.label)}</label>`).join("")}</div><p class="small">Track opportunity-specific request/submission stages in each guide.</p></form>`;
    })
    .join("")}</div></section>`;
}
export function profileView(state) {
  const p = state.v3.profile;
  return `<h2>My profile & priorities</h2><p class="muted">Private planning context drives transparent research matches. No score estimates admission, funding or permanent-residence probability.</p><form id="v3Profile" class="card card-pad" novalidate><div class="v3-filter-grid"><label class="field"><span>Citizenship (ISO two-letter code)</span><input name="citizenship" maxlength="2" value="${e(p.citizenship || "")}" placeholder="e.g. BD"></label><label class="field"><span>CGPA / classification</span><input name="cgpa" maxlength="32" value="${e(p.cgpa || "")}"></label><label class="field"><span>Confirmed graduation date</span><input type="date" name="graduationDate" value="${e(p.graduationDate || "")}"></label>${select("feeStatus", ["unknown", "international", "domestic"], p.feeStatus || "unknown", "Applicant fee / residence status")}</div><fieldset><legend>Research interests</legend><div class="tag-row">${["machine-learning", "computer-vision", "efficient-ai", "multimodal-learning", "model-compression", "edge-ai", "robotics", "ai-systems"].map((a) => `<label class="mini-check"><input type="checkbox" name="area" value="${a}" ${p.researchAreas.includes(a) ? "checked" : ""}>${e(label(a))}</label>`).join("")}</div></fieldset><p data-form-error role="status"></p><button type="submit" class="button secondary">Save private profile</button></form><form id="v3Preferences" class="card card-pad section" novalidate><h3>Destination & career preferences</h3><label class="field"><span>Preferred countries (comma-separated ISO codes)</span><input name="countries" value="${e(state.v3.preferences.preferredCountries.join(", "))}" maxlength="120"></label><label class="mini-check"><input type="checkbox" name="allowReturnHome" ${state.v3.preferences.allowReturnHome ? "checked" : ""}>Consider awards with return-home obligations</label><p>This preference affects matching explanations. It does not change eligibility or hide a route from global counts.</p><p data-form-error role="status"></p><button class="button secondary" type="submit">Save preferences</button></form>${state.profile ? `<section class="card card-pad section"><h3>Preserved legacy profile</h3><p>${e(state.profile.name)} · ${e(state.profile.degree)} · ${e(state.profile.university)} · ${e(state.profile.cgpa)}</p><p>${e(state.profile.highlights.join(" · "))}</p><p>Legacy self-assessment scores remain in the complete backup; they are not admissions predictions.</p></section>` : ""}<section class="card card-pad section"><h3>Evidence for research applications</h3><p>Maintain exact publication status, authorship, contribution, degree evidence and employment dates. Distinguish accepted/published work from experiments and unfinished projects. Explain the research question, your contribution and what you learned; do not fabricate leadership or numerical improvements.</p></section>`;
}
export function settings(event) {
  return `<h2>Settings & complete backups</h2><section class="card card-pad"><h3>Device workspace</h3><p>Version 3 saves locally without an account. Export before clearing browser data, changing devices or moving to another website address. Automatic cross-device sync is off.</p><button type="button" class="button secondary" data-export-state>Export complete progress</button><p>Original v2 data remains untouched. The pre-migration copy also remains available under the previous version.</p></section><section class="card card-pad section"><h3>Import / recover a backup</h3><p>Choose a v2 or v3 JSON export up to 1 MB. Preview first. Current text and conflicts are kept; completed work and missing records are added. Private planning-context imports show explicit proposed changes before you apply them.</p><button type="button" class="button secondary" data-v3-pick-backup>Choose backup / private context file</button><input type="file" id="v3BackupFile" accept=".json,application/json" hidden><div id="v3BackupReport" role="status" aria-live="polite"></div></section><section class="card card-pad section"><h3>Import older browser checklists</h3><p>Only the explicit preview reads pre-v2 checklist keys. Original browser keys are never overwritten.</p><button type="button" class="button secondary" data-v3-legacy-preview>Preview older browser import</button><div id="v3LegacyReport" role="status"></div></section><details class="card card-pad section danger-zone"><summary>Reset this V3 workspace</summary><p>Downloads a complete backup before clearing the V3 copy. Original v2 and older keys remain recoverable.</p><form id="v3Reset" novalidate><label class="field"><span>Type RESET to continue</span><input name="word" autocomplete="off"></label><p data-form-error role="status"></p><button type="submit" class="button danger-outline">Export backup & reset V3</button></form></details>${event.draftProblem ? '<p class="v3-alert">Edits are blocked during migration or recovery. Export recovery data, then finish migration or import a valid backup.</p>' : ""}`;
}
export function comparisonView(ids, state, intake) {
  return `<h2>Funding comparison</h2><p class="muted">Guaranteed and conditional funding are separate. Unknown costs remain unknown; different currencies are not converted using stale rates.</p><button class="button secondary" type="button" data-v3-compare-back>Back to results</button><div class="v3-compare-grid section">${ids
    .map((id) => {
      const o = registry.opportunities.find((o) => o.id === id);
      if (!o) return "";
      return `<section class="card card-pad"><h3><a href="${routeLink(o, intake)}">${e(o.name)}</a></h3>${fundingTable(o)}${[
        1, 2,
      ]
        .map((year) => {
          const b = state.v3.budgets[`${id}:${intake}:${year}`];
          const r = b && fundingBalance(b);
          return `<p><strong>Year ${year} net:</strong> ${r?.net !== null && r?.net !== undefined ? e(b.currency + " " + r.net.toLocaleString("en")) : "Unknown — complete the private annual budget in the guide."}</p>`;
        })
        .join("")}</section>`;
    })
    .join("")}</div>`;
}
