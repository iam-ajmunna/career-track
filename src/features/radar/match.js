// Deterministic "matches for you" score. NOT an admission or award probability.
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

/**
 * candidate: { id, name, countryCodes:[ISO2], researchAreas:[], funding: 'full-cost-verified'|'tuition-stipend-net-pending'|'partial'|'tuition-only'|'unknown'|...,
 *              degreeTypes:[], status:'open'|'opening-soon'|'upcoming'|..., deadlineAt?:ISO, eligibility?:'confirmed'|'conditional'|'requires-assessment'|'ineligible',
 *              returnHome?:'yes'|'no'|'unknown', verified:boolean }
 * profile:   { researchAreas:[], preferredCountries:[ISO2], allowReturnHome:boolean, citizenship?:ISO2 }
 */
export function matchScore(candidate, profile, now = Date.now()) {
  const reasons = [],
    flags = [];
  let score = 0;

  const areas =
    candidate.researchAreas?.filter((a) =>
      profile.researchAreas?.includes(a),
    ) ?? [];
  if (areas.length) {
    score += Math.min(30, areas.length * 15);
    reasons.push({ key: "area", text: `Research match: ${areas.join(", ")}` });
  }

  const country = candidate.countryCodes?.some((c) =>
    profile.preferredCountries?.includes(c),
  );
  if (country) {
    score += 20;
    reasons.push({ key: "country", text: "In a preferred country" });
  }

  const fundingPoints = {
    "full-cost-verified": 25,
    "tuition-stipend-net-pending": 18,
    "competitive-assistantship": 12,
    partial: 8,
    "tuition-only": 6,
    "stipend-only": 6,
  };
  const fp = fundingPoints[candidate.funding] ?? 0;
  if (fp) {
    score += fp;
    reasons.push({
      key: "funding",
      text:
        candidate.funding === "full-cost-verified"
          ? "Fully funded (verified)"
          : "Funding available — check coverage",
    });
  }

  if (candidate.degreeTypes?.some((d) => /master|msc/i.test(d))) {
    score += 10;
    reasons.push({ key: "degree", text: "Masters level" });
  }

  if (candidate.status === "open") {
    score += 10;
    reasons.push({ key: "window", text: "Open now" });
  } else if (candidate.status === "opening-soon") {
    score += 6;
    reasons.push({ key: "window", text: "Opening soon" });
  }

  if (candidate.deadlineAt) {
    const days = (Date.parse(candidate.deadlineAt) - now) / 86400000;
    if (days >= 14 && days <= 120) {
      score += 5;
      reasons.push({ key: "time", text: "Enough time to prepare" });
    }
    if (days > 0 && days < 14)
      flags.push({ key: "tight", text: `Only ${Math.ceil(days)} days left` });
  }

  if (candidate.returnHome === "yes" && profile.allowReturnHome === false) {
    score -= 30;
    flags.push({ key: "return", text: "Return-home requirement" });
  }
  if (candidate.eligibility === "ineligible") {
    score = Math.min(score, 10);
    flags.push({ key: "ineligible", text: "Likely ineligible" });
  }
  if (!candidate.verified)
    flags.push({
      key: "lead",
      text: "Unverified lead — confirm on the official site",
    });

  score = clamp(Math.round(score), 0, 100);
  const band = score >= 70 ? "strong" : score >= 45 ? "good" : "possible";
  return { score, band, reasons, flags };
}

/** Rank matches, drop dismissed + already-listed, keep only open/opening-soon unless includeFuture. */
export function rankMatches(
  candidates,
  profile,
  {
    dismissed = new Set(),
    listed = new Set(),
    includeFuture = false,
    limit = 6,
    now = Date.now(),
  } = {},
) {
  return candidates
    .filter((c) => !dismissed.has(c.id) && !listed.has(c.id))
    .filter((c) => includeFuture || ["open", "opening-soon"].includes(c.status))
    .map((c) => ({ candidate: c, ...matchScore(c, profile, now) }))
    .filter((m) => m.band !== "possible" || m.score >= 30)
    .sort(
      (a, b) =>
        b.score - a.score ||
        Number(b.candidate.verified) - Number(a.candidate.verified),
    )
    .slice(0, limit);
}
