import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { pathToFileURL } from "node:url";
import { safeUrl } from "../../src/v3/schema.js";
export const AGENT = "CareerTrackSourceReview";
export function robotsAllowed(text, path) {
  const groups = [];
  let group = { agents: [], rules: [] };
  let hasRules = false;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, "").trim();
    const m = /^([^:]+):\s*(.*)$/.exec(line);
    if (!m) continue;
    const field = m[1].trim().toLowerCase(),
      value = m[2].trim();
    if (field === "user-agent") {
      if (hasRules) {
        groups.push(group);
        group = { agents: [], rules: [] };
        hasRules = false;
      }
      group.agents.push(value.toLowerCase());
    } else if (["allow", "disallow"].includes(field) && group.agents.length) {
      group.rules.push({ allow: field === "allow", path: value });
      hasRules = true;
    }
  }
  groups.push(group);
  const specific = groups.filter((g) =>
      g.agents.some((a) => a !== "*" && AGENT.toLowerCase().includes(a)),
    ),
    selected = specific.length
      ? specific
      : groups.filter((g) => g.agents.includes("*"));
  const matches = selected
    .flatMap((g) => g.rules)
    .filter(
      (r) =>
        r.path &&
        new RegExp(
          "^" +
            r.path
              .split("*")
              .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
              .join(".*")
              .replace(/\\\$$/, "$"),
        ).test(path),
    )
    .sort(
      (a, b) =>
        b.path.length - a.path.length || Number(b.allow) - Number(a.allow),
    );
  return matches[0]?.allow ?? true;
}
export function fingerprint(body) {
  return createHash("sha256")
    .update(
      body
        .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
        .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
        .replace(/\s+/g, " ")
        .trim(),
    )
    .digest("hex");
}
function publicAddress(address) {
  return !(
    /^(127\.|10\.|192\.168\.|169\.254\.|0\.|172\.(1[6-9]|2\d|3[01])\.)/.test(
      address,
    ) ||
    address === "::1" ||
    /^(fc|fd|fe80):/i.test(address) ||
    /^::ffff:/i.test(address)
  );
}
export async function fetchBounded(
  url,
  hosts,
  { limit = 1500000, fetcher = fetch, resolver = lookup } = {},
) {
  const u = new URL(url);
  if (!safeUrl(url) || !hosts.has(u.hostname) || isIP(u.hostname))
    throw Error("Source URL is outside the approved allowlist.");
  const addresses = await resolver(u.hostname, { all: true });
  if (!addresses.length || addresses.some((row) => !publicAddress(row.address)))
    throw Error("Source DNS resolves to a non-public address.");
  const response = await fetcher(url, {
    headers: {
      "User-Agent":
        AGENT + "/3.0 (+https://github.com/iam-ajmunna/career-track)",
    },
    redirect: "manual",
    signal: AbortSignal.timeout(15000),
  });
  if (response.status >= 300 && response.status < 400)
    throw Error("Redirect requires manual review; no redirected URL fetched.");
  if (!response.ok) {
    const error = Error("HTTP " + response.status);
    error.status = response.status;
    throw error;
  }
  if (Number(response.headers.get("content-length")) > limit)
    throw Error("Source exceeds bounded retrieval size.");
  let size = 0,
    parts = [];
  for await (const part of response.body) {
    size += part.byteLength;
    if (size > limit) throw Error("Source exceeds bounded retrieval size.");
    parts.push(part);
  }
  return new TextDecoder().decode(Buffer.concat(parts));
}
export async function runReview({
  sources,
  previous = {},
  fetchPage = fetchBounded,
  pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  now = new Date().toISOString(),
} = {}) {
  const approved = sources.filter((s) =>
    ["official", "department"].includes(s.kind),
  );
  const hosts = new Set(approved.map((s) => new URL(s.url).hostname)),
    robots = new Map(),
    last = new Map(),
    items = [],
    state = { ...previous };
  for (const s of approved) {
    const url = new URL(s.url);
    try {
      if (!robots.has(url.origin)) {
        try {
          robots.set(
            url.origin,
            await fetchPage(url.origin + "/robots.txt", hosts),
          );
        } catch (error) {
          if (error.status === 404) robots.set(url.origin, "");
          else throw Error("Robots policy unavailable; source not fetched.");
        }
      }
      if (!robotsAllowed(robots.get(url.origin), url.pathname + url.search)) {
        items.push({
          id: s.id,
          status: "blocked",
          detail: "Robots policy disallows this path.",
        });
        continue;
      }
      const remaining = 1500 - (Date.now() - (last.get(url.hostname) || 0));
      if (remaining > 0) await pause(remaining);
      last.set(url.hostname, Date.now());
      if (/\.pdf(?:$|\?)/i.test(s.url)) {
        items.push({
          id: s.id,
          status: "skipped",
          detail: "PDF requires manual document review; no text fingerprint.",
        });
        continue;
      }
      const body = await fetchPage(s.url, hosts),
        hash = fingerprint(body),
        prior = previous[s.id]?.hash,
        status = !prior ? "initial" : hash === prior ? "unchanged" : "changed";
      items.push({ id: s.id, status, hash, previousHash: prior || null });
      state[s.id] = { hash, checkedAt: now };
    } catch (error) {
      items.push({
        id: s.id,
        status: "error",
        detail: String(error.message).slice(0, 250),
      });
    }
  }
  return {
    report: {
      format: "career-track-source-review",
      version: 1,
      checkedAt: now,
      scope:
        "Technical source fingerprints. Changed content requires manual claim verification; no deadlines or eligibility were automatically rewritten.",
      items,
    },
    state,
  };
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const out = process.argv[2] || "test-results/source-review";
  await mkdir(out, { recursive: true });
  const sources = JSON.parse(await readFile("data/v3/sources.json", "utf8"));
  let previous = {};
  try {
    previous = JSON.parse(await readFile(out + "/state.json", "utf8"));
  } catch {}
  const result = await runReview({ sources, previous });
  await writeFile(
    out + "/report.json",
    JSON.stringify(result.report, null, 2) + "\n",
  );
  await writeFile(
    out + "/state.json",
    JSON.stringify(result.state, null, 2) + "\n",
  );
  console.log(
    JSON.stringify(
      result.report.items.reduce(
        (t, i) => ((t[i.status] = (t[i.status] || 0) + 1), t),
        {},
      ),
    ),
  );
}
