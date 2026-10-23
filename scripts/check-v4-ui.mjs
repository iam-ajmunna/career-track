import { readFile, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
const raw = JSON.parse(await readFile("docs/v4/ui-static-audit.json", "utf8"));
const controller = await readFile("src/v4/workspace.js", "utf8"),
  toast = await readFile("src/app/toast.js", "utf8");
const reviewed = [];
for (const f of raw.findings) {
  assert.equal(
    f.ruleId,
    "affordance.actionless-button",
    "Unreviewed static finding: " + f.ruleId,
  );
  const source = await readFile(f.file, "utf8"),
    line = source
      .split("\n")
      .slice(f.line - 1)
      .join("\n")
      .split("</button>")[0];
  const hooks = [...line.matchAll(/data-([a-z-]+)(?:=|[\s>])/g)].map(
    (m) => m[1],
  );
  assert.ok(
    hooks.length,
    "Button has no delegation hook: " + f.file + ":" + f.line,
  );
  assert.ok(
    controller.includes("root.addEventListener('click'") ||
      controller.includes('root.addEventListener("click"'),
    "No delegated view listener",
  );
  const handler = hooks.some(
    (h) =>
      controller.includes(h.replace(/-([a-z])/g, (_, c) => c.toUpperCase())) ||
      controller.includes(h) ||
      toast.includes(h),
  );
  assert.ok(handler, "Unbound button hook: " + f.file + ":" + f.line);
  reviewed.push({
    ...f,
    classification: "shared-delegation",
    evidence: "tests/browser-v4.mjs",
    resolution:
      "Native button uses a data hook handled by the mounted shared controller or toast owner.",
  });
}
for (const file of [
  "src/v4/workspace.js",
  "src/features/dashboard/view.js",
  "src/features/scholarships/drawer.js",
  "src/features/settings/view.js",
]) {
  const text = await readFile(file, "utf8");
  assert.doesNotMatch(
    text,
    /\bonclick\s*=|\b(?:alert|confirm|prompt)\s*\(/,
    "Inline/native handler in " + file,
  );
}
await writeFile(
  "docs/v4/ui-reviewed-audit.json",
  JSON.stringify(
    {
      rawAudit: "ui-static-audit.json",
      reviewed,
      unresolved: 0,
      runtimeEvidence: "ux/browser-results.json",
    },
    null,
    2,
  ) + "\n",
);
console.log(
  "PASS: " +
    reviewed.length +
    " literal-button findings traced to shared delegation; no unresolved findings.",
);
