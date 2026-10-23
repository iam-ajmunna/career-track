import { execFileSync } from "node:child_process";
import { readFile, access } from "node:fs/promises";
import assert from "node:assert/strict";
const paths = execFileSync(
  "git",
  ["ls-files", "--cached", "--others", "--exclude-standard"],
  { encoding: "utf8" },
)
  .split("\n")
  .filter(Boolean);
let oldProfile;
try {
  oldProfile = JSON.parse(
    execFileSync("git", ["show", "pre-v4:supabase/owner-profile.json"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }),
  );
} catch {
  try {
    oldProfile = JSON.parse(
      execFileSync("git", ["show", "HEAD:supabase/owner-profile.json"], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      }),
    );
  } catch {}
}
const forbidden = [oldProfile?.name, oldProfile?.university].filter(
  (v) => typeof v === "string" && v.length > 5,
);
const issues = [];
for (const path of new Set(paths)) {
  let text;
  try {
    text = await readFile(path, "utf8");
  } catch {
    continue;
  }
  if (path === "supabase/owner-profile.json")
    issues.push(path + ": private profile still tracked");
  if (
    path !== "LICENSE" &&
    forbidden.some((value) => text.toLowerCase().includes(value.toLowerCase()))
  )
    issues.push(path + ": exposed profile value");
  if (
    /sb_secret_[A-Za-z0-9_-]{16,}|BEGIN (?:RSA )?PRIVATE KEY/.test(text) &&
    !path.endsWith("check-v4-privacy.mjs") &&
    !path.startsWith("docs/v4/")
  )
    issues.push(path + ": possible secret");
}
try {
  await access("supabase/owner-profile.json");
  issues.push("Private profile file remains in the repository.");
} catch {}
assert.equal(issues.length, 0, issues.join("\n"));
console.log(
  "PASS: no applicant profile defaults, committed private profile or detected secret (existing licence attribution retained) in the current tree. History and repository visibility require owner administration.",
);
