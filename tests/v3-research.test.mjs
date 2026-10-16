import test from "node:test";
import assert from "node:assert/strict";
import {
  robotsAllowed,
  fingerprint,
  fetchBounded,
  runReview,
} from "../scripts/research/source-review.mjs";
test("Source monitor observes most specific robots rules and never treats changes as verified claims", () => {
  assert.equal(
    robotsAllowed(
      "User-agent: *\nDisallow: /private\nAllow: /private/public",
      "/private/x",
    ),
    false,
  );
  assert.equal(
    robotsAllowed(
      "User-agent: *\nDisallow: /private\nAllow: /private/public",
      "/private/public/x",
    ),
    true,
  );
  assert.equal(
    robotsAllowed(
      "User-agent: CareerTrackSourceReview\nDisallow: /\nUser-agent: *\nAllow: /",
      "/any",
    ),
    false,
  );
  assert.equal(fingerprint(" a   b "), fingerprint("a b"));
});
test("Bounded source fetch rejects private DNS, unapproved hosts and redirects", async () => {
  const opts = {
    resolver: async () => [{ address: "127.0.0.1" }],
    fetcher: async () => {
      throw Error("should not fetch");
    },
  };
  await assert.rejects(
    fetchBounded(
      "https://official.example/",
      new Set(["official.example"]),
      opts,
    ),
    /non-public/,
  );
  await assert.rejects(
    fetchBounded("https://unapproved.example/", new Set(), opts),
    /allowlist/,
  );
  await assert.rejects(
    fetchBounded("https://official.example/", new Set(["official.example"]), {
      resolver: async () => [{ address: "8.8.8.8" }],
      fetcher: async () => ({ status: 302 }),
    }),
    /Redirect/,
  );
});
test("Scheduled report classifies initial, unchanged, changed, blocked and network failure", async () => {
  const sources = [
    { id: "a", url: "https://example.org/a", kind: "official" },
    { id: "b", url: "https://example.org/b", kind: "official" },
    { id: "c", url: "https://example.org/c", kind: "department" },
    { id: "d", url: "https://example.org/private", kind: "official" },
    { id: "e", url: "https://example.org/fail", kind: "official" },
    {
      id: "private-student",
      url: "https://reddit.com/private",
      kind: "student",
    },
  ];
  const fetchPage = async (url) =>
    url.endsWith("/robots.txt")
      ? "User-agent: *\nDisallow: /private"
      : url.endsWith("/fail")
        ? Promise.reject(Error("network unavailable"))
        : "new";
  const result = await runReview({
    sources,
    fetchPage,
    pause: async () => {},
    previous: {
      b: { hash: fingerprint("new") },
      c: { hash: fingerprint("old") },
    },
  });
  assert.deepEqual(
    result.report.items.map((i) => i.status),
    ["initial", "unchanged", "changed", "blocked", "error"],
  );
  assert.equal(
    result.report.items.some((i) => i.id === "private-student"),
    false,
  );
  assert.equal(result.report.format, "career-track-source-review");
});
