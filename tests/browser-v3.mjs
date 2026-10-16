import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import assert from "node:assert/strict";
const require = createRequire(import.meta.url),
  { chromium } = require(
    process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES
      ? process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES + "/playwright"
      : "playwright",
  );
const evidence = "docs/v3/ux";
await mkdir(evidence, { recursive: true });
const checks = [],
  errors = [],
  requests = [],
  server = spawn(process.execPath, ["scripts/dev.mjs"], {
    env: { ...process.env, PORT: "8086" },
    stdio: ["ignore", "pipe", "pipe"],
  });
await new Promise((res, rej) => {
  let out = "";
  server.stdout.on("data", (d) => {
    out += d;
    if (out.includes("http://")) res();
  });
  server.stderr.on("data", (d) => (out += d));
  server.on("exit", () => rej(Error(out)));
});
const browser = await chromium.launch({
  executablePath: process.env.CT_CHROMIUM_PATH || undefined,
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
});
let page;
async function check(name, fn) {
  try {
    await fn();
    checks.push({ name, status: "PASS" });
    console.log("PASS " + name);
  } catch (error) {
    if (page && !page.isClosed()) {
      await page.screenshot({
        path: evidence + "/failure.png",
        fullPage: true,
      });
      console.error((await page.locator("body").innerText()).slice(0, 5000));
    }
    console.error(errors);
    throw error;
  }
}
const base = "http://127.0.0.1:8086";
const go = async (hash) => {
  await page.goto(base + hash);
  await page.waitForSelector("#appShell:not([hidden])");
};
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "reduce",
  });
  page = await context.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  context.on("request", (r) => requests.push(r.url()));
  await go("");
  await check(
    "No-login startup and global counts include urgency without a top-five cap",
    async () => {
      assert.equal(
        await page.locator("#syncLabel").innerText(),
        "Saved on this device",
      );
      assert.ok(
        Number(await page.locator('[data-count="open"] strong').innerText()) >
          5,
      );
      assert.ok(
        Number(await page.locator('[data-count="urgent"] strong').innerText()) >
          0,
      );
      assert.equal(
        await page.getByRole("button", { name: /sign in|sign out/i }).count(),
        0,
      );
      assert.equal(
        requests.some((x) => /supabase|accounts.google/.test(x)),
        false,
      );
      assert.doesNotMatch(
        await page.locator(".v3-next").innerText(),
        /Toronto/,
      );
    },
  );
  await check(
    "Explorer filters, local search, clear and URL restoration",
    async () => {
      await go("/#/scholarships");
      await page.selectOption('[data-v3-filter][name="country"]', "CA");
      await page.waitForURL("**country=CA");
      assert.ok((await page.locator(".active-view .v3-op").count()) >= 5);
      assert.equal(
        await page
          .locator(".active-view .v3-op")
          .filter({ hasText: "University of Sydney" })
          .count(),
        0,
      );
      await page.locator("#globalSearch").fill("Atlantis");
      assert.match(
        await page.locator("#v3ResultCount").innerText(),
        /^0 matching/,
      );
      await page.locator("#searchClear").click();
      assert.match(
        await page.locator("#v3ResultCount").innerText(),
        /5 matching/,
      );
      await page.reload();
      assert.equal(
        await page.locator('[name="country"][data-v3-filter]').inputValue(),
        "CA",
      );
      await page.locator("[data-v3-clear-filters]").first().click();
      await page.waitForURL("**intake=2027");
      await page.waitForFunction(
        () =>
          document.querySelector('[name="country"][data-v3-filter]')?.value ===
          "",
      );
    },
  );
  await check(
    "Detailed playbook has A–Q, independent stages, checklist and escaped private notes",
    async () => {
      await go("/#/scholarships/kaust");
      assert.equal(await page.locator(".v3-guide-section").count(), 17);
      await page.selectOption('[data-v3-stage="kaust"]', "submitted");
      await page.selectOption('[data-v3-track="kaust"]', "completed");
      await page.locator('[data-progress-key="sch-kaust-0"]').check();
      const notes = page
        .locator(".v3-guide-section")
        .filter({
          has: page.locator("summary", { hasText: "My decision & notes" }),
        });
      await notes.locator("summary").click();
      await page
        .locator('[data-v3-note="kaust"]')
        .fill("<img src=x onerror=alert(1)> private");
      await page.locator('[data-v3-save-note="kaust"]').click();
      await page.reload();
      assert.equal(
        await page.locator('[data-v3-stage="kaust"]').inputValue(),
        "submitted",
      );
      assert.equal(
        await page.locator('[data-v3-track="kaust"]').inputValue(),
        "completed",
      );
      assert.ok(
        await page.locator('[data-progress-key="sch-kaust-0"]').isChecked(),
      );
      await page
        .locator(".v3-guide-section summary", {
          hasText: "My decision & notes",
        })
        .click();
      assert.equal(
        await page.locator('[data-v3-note="kaust"]').inputValue(),
        "<img src=x onerror=alert(1)> private",
      );
      assert.equal(await page.locator(".active-view img").count(), 0);
      await go("/#/pipeline");
      assert.match(await page.locator("#view-pipeline").innerText(), /KAUST/);
      await go("/#/scholarships/kaust?intake=2028");
      assert.equal(
        await page.locator('[data-v3-stage="kaust"]').inputValue(),
        "not-started",
      );
    },
  );
  await check(
    "University admission is independent from funding stage and excluded routes remain discoverable",
    async () => {
      await go("/#/scholarships/clarendon");
      await page.selectOption('[data-v3-admission="oxford-acs"]', "submitted");
      assert.equal(
        await page.locator('[data-v3-stage="clarendon"]').inputValue(),
        "not-started",
      );
      await go("/#/profile");
      await page.locator('[name="citizenship"]').fill("BD");
      await page.locator('[name="cgpa"]').fill("3.80");
      await page.selectOption('[name="feeStatus"]', "international");
      await page.locator("#v3Profile button").click();
      await go("/#/scholarships/toronto-msc");
      assert.match(
        await page.locator(".v3-detail-head").innerText(),
        /Ineligible/,
      );
      await go("/#/scholarships/princeton-mse");
      assert.match(
        await page.locator(".v3-detail-head").innerText(),
        /Suspended/,
      );
    },
  );
  await check(
    "Funding calculator rejects incomplete net and excludes conditional assistantship",
    async () => {
      await go("/#/scholarships/ubc-msc");
      await page
        .locator(".v3-guide-section summary", { hasText: "Funding reality" })
        .click();
      const f = page.locator('[data-v3-budget="ubc-msc:2027:1"]');
      assert.match(await f.locator("output").innerText(), /Net unavailable/);
      for (const [name, value] of Object.entries({
        stipend: "30000",
        grants: "0",
        assistantship: "10000",
        tuition: "10000",
        fees: "1000",
        insurance: "2000",
        living: "20000",
      }))
        await f.locator('[name="' + name + '"]').fill(value);
      await f.getByRole("button", { name: "Save year 1 calculation" }).click();
      await page
        .locator(".v3-guide-section summary", { hasText: "Funding reality" })
        .click();
      assert.match(
        await page
          .locator('[data-v3-budget="ubc-msc:2027:1"] output')
          .innerText(),
        /CAD -3,000.*conditional assistantship excluded/,
      );
    },
  );
  await check(
    "Documents, private contacts, completed ticks and goal-board progress remain functional",
    async () => {
      await go("/#/documents");
      await page.locator('[data-progress-key="doc-cv"]').check();
      const ref = page.locator('[data-v3-reference="ref-a"]');
      await ref.locator('[name="name"]').fill("Example Referee");
      await ref.locator('[name="email"]').fill("referee@example.org");
      await ref.locator("button").click();
      await page.reload();
      assert.ok(await page.locator('[data-progress-key="doc-cv"]').isChecked());
      assert.equal(
        await page
          .locator('[data-v3-reference="ref-a"] [name="name"]')
          .inputValue(),
        "Example Referee",
      );
      await go("/#/goal");
      await page.locator('[data-progress-key="goal-core-0"]').check();
      await page.reload();
      assert.ok(
        await page.locator('[data-progress-key="goal-core-0"]').isChecked(),
      );
    },
  );
  await check(
    "Calendar contains date-only markers and alarms only on exact deadlines",
    async () => {
      await go("/#/calendar");
      const pending = page.waitForEvent("download");
      await page.locator('[data-v3-ics="all"]').click();
      const text = await readFile(await (await pending).path(), "utf8");
      assert.match(text, /DTSTART;VALUE=DATE:20261215/);
      assert.match(text, /DTSTART:20270106T120000Z/);
      for (const evt of text.split("BEGIN:VEVENT").slice(1))
        assert.equal(
          (evt.match(/BEGIN:VALARM/g) || []).length,
          evt.includes("DTSTART;VALUE=DATE") ? 0 : 4,
        );
    },
  );
  await check(
    "Archive, Trash confirmation and restore preserve submitted work past deadlines",
    async () => {
      await go("/#/scholarships/kaust");
      await page.locator('[data-v3-life="archive"]').click();
      await go("/#/library");
      const row = page
        .locator(".active-view article")
        .filter({ has: page.locator("a", { hasText: "KAUST" }) })
        .first();
      await row.locator('[data-v3-life="restore"]').click();
      await go("/#/scholarships/kaust");
      assert.equal(
        await page.locator('[data-v3-stage="kaust"]').inputValue(),
        "submitted",
      );
      await page.locator('[data-v3-life="delete"]').click();
      await page.locator('#confirmDialog [value="cancel"]').click();
      await page.locator('[data-v3-life="delete"]').click();
      await page.locator("#confirmAction").click();
      await go("/#/library");
      await page
        .locator(".active-view article")
        .filter({ has: page.locator("a", { hasText: "KAUST" }) })
        .first()
        .locator('[data-v3-life="restore"]')
        .click();
      await go("/#/scholarships/kaust");
      assert.ok(
        await page.locator('[data-progress-key="sch-kaust-0"]').isChecked(),
      );
    },
  );
  await check(
    "Full export/import roundtrip works in a clean browser without touching v2",
    async () => {
      await go("/#/settings");
      const pending = page.waitForEvent("download");
      await page.locator(".active-view [data-export-state]").click();
      const path = await (await pending).path(),
        raw = await readFile(path, "utf8");
      const clean = await browser.newContext();
      const imported = await clean.newPage();
      await imported.goto(base + "/#/settings");
      await imported.waitForSelector("#v3BackupFile", { state: "attached" });
      await imported
        .locator("#v3BackupFile")
        .setInputFiles({
          name: "backup.json",
          mimeType: "application/json",
          buffer: Buffer.from(raw),
        });
      await imported.locator("[data-v3-commit-backup]").click();
      await imported.goto(base + "/#/scholarships/kaust");
      assert.equal(
        await imported.locator('[data-v3-stage="kaust"]').inputValue(),
        "submitted",
      );
      assert.equal(
        await imported.evaluate(() => localStorage.getItem("career-track:v2")),
        null,
      );
      await clean.close();
    },
  );
  await check(
    "Private planning context previews Oxford admission and missed nomination separately",
    async () => {
      await go("/#/settings");
      const raw = JSON.stringify({
        format: "career-track-private-context",
        version: 1,
        profile: {
          citizenship: "BD",
          cgpa: "3.80",
          graduationDate: null,
          researchAreas: ["efficient-ai"],
          feeStatus: "international",
        },
        applications: [
          {
            opportunityId: "commonwealth",
            intake: 2027,
            stage: "not-started",
            decision: "not-pursuing",
            blockedReason: "Mandatory nomination missed",
          },
        ],
        admissions: [
          { programmeId: "oxford-acs", intake: 2027, stage: "submitted" },
        ],
      });
      await page
        .locator("#v3BackupFile")
        .setInputFiles({
          name: "private.json",
          mimeType: "application/json",
          buffer: Buffer.from(raw),
        });
      await page.locator("[data-v3-commit-backup]").waitFor();
      assert.match(
        await page.locator("#v3BackupReport").innerText(),
        /nomination missed/,
      );
      await page.locator("[data-v3-commit-backup]").click();
      await go("/#/scholarships/commonwealth");
      assert.match(
        await page.locator(".active-view .v3-alert.danger").innerText(),
        /nomination missed/,
      );
      assert.equal(
        await page.locator('[data-v3-decision="commonwealth"]').inputValue(),
        "not-pursuing",
      );
      await go("/#/scholarships/clarendon");
      assert.equal(
        await page.locator('[data-v3-admission="oxford-acs"]').inputValue(),
        "submitted",
      );
      assert.equal(
        await page.locator('[data-v3-stage="clarendon"]').inputValue(),
        "not-started",
      );
    },
  );
  await check(
    "Country navigation, all regions, universities, sources and research leads render",
    async () => {
      for (const route of [
        "countries",
        "countries?country=CA",
        "countries?country=BD",
        "universities",
        "research",
        "sources",
      ]) {
        await go("/#/" + route);
        assert.ok(
          (await page.locator(".active-view").innerText()).length > 100,
        );
      }
      await go("/#/countries");
      await page
        .locator('[data-v3-country-search] [name="q"]')
        .fill("Bangladesh");
      await page.locator("[data-v3-country-search] button").click();
      await page.waitForFunction(
        () =>
          document.querySelectorAll(".active-view .v3-country").length === 1,
      );
      await page.locator(".v3-country").click();
      await page.waitForFunction(() =>
        document
          .querySelector(".active-view")
          ?.innerText.includes("not verified"),
      );
    },
  );
  await check(
    "Keyboard shortcuts, IME-safe search, and narrow/light/dark screens have no page overflow",
    async () => {
      await go("/#/overview");
      await page.keyboard.press("2");
      await page.waitForURL("**/#/scholarships");
      await page.locator("#globalSearch").dispatchEvent("compositionstart");
      await page.locator("#globalSearch").fill("vision");
      assert.equal(new URL(await page.url()).hash, "#/scholarships");
      await page.locator("#globalSearch").dispatchEvent("compositionend");
      assert.match(await page.url(), /q=vision/);
      const visualContext = await browser.newContext({
        viewport: { width: 1440, height: 1000 },
        reducedMotion: "reduce",
      });
      page = await visualContext.newPage();
      page.on("pageerror", (e) => errors.push(e.message));
      await go("/#/overview");
      for (const width of [1440, 390])
        for (const theme of ["light", "dark"]) {
          await page.setViewportSize({ width, height: 1000 });
          if (
            (await page.evaluate(
              () => document.documentElement.dataset.theme,
            )) !== theme
          )
            await page.locator("#themeToggle").click();
          for (const route of [
            "overview",
            "scholarships",
            "scholarships/ubc-msc",
            "countries",
            "pipeline",
            "documents",
            "profile",
            "sources",
            "settings",
            "goal",
            "library",
            "calendar",
            "universities",
            "research",
          ]) {
            await go("/#/" + route);
            assert.equal(
              await page.evaluate(
                () => document.documentElement.scrollWidth > innerWidth + 1,
              ),
              false,
              route + " overflow " + width,
            );
            if (
              [
                "overview",
                "scholarships",
                "scholarships/ubc-msc",
                "countries",
              ].includes(route)
            )
              await page.screenshot({
                path: `${evidence}/${route.replaceAll("/", "-")}-${theme}-${width}.png`,
                fullPage: true,
              });
          }
        }
    },
  );
  await check(
    "Funding comparison, prompt/package exports and source-report notices work",
    async () => {
      await go("/#/scholarships");
      await page.locator('[data-v3-compare="ubc-msc"]').check();
      await page.locator('[data-v3-compare="sydney-rtp"]').check();
      await page.locator("[data-v3-show-compare]").click();
      assert.match(
        await page.locator(".active-view h2").innerText(),
        /Funding comparison/,
      );
      assert.equal(await page.locator(".v3-compare-grid>section").count(), 2);
      await page.locator("[data-v3-compare-back]").click();
      await go("/#/scholarships/ubc-msc");
      const pending = page.waitForEvent("download");
      await page.locator('[data-v3-package="ubc-msc"]').click();
      const pkg = await readFile(await (await pending).path(), "utf8");
      assert.match(pkg, /UBC Computer Science/);
      assert.match(pkg, /application package/);
      await go("/#/sources");
      const report = JSON.stringify({
        format: "career-track-source-review",
        version: 1,
        checkedAt: "2026-10-16T00:00:00Z",
        items: [{ id: "ubc-funding", status: "changed" }],
      });
      await page
        .locator("#v3ReportFile")
        .setInputFiles({
          name: "report.json",
          mimeType: "application/json",
          buffer: Buffer.from(report),
        });
      await page.waitForFunction(() =>
        document.querySelector(".active-view")?.innerText.includes("changed"),
      );
      assert.match(
        await page.locator(".active-view").innerText(),
        /Dated 2026/,
      );
    },
  );
  await check(
    "Previously loaded workspace reloads offline from static cache",
    async () => {
      await go("/#/overview");
      await page.evaluate(async () => {
        await navigator.serviceWorker.ready;
      });
      await page.reload();
      await page.waitForFunction(() =>
        Boolean(navigator.serviceWorker.controller),
      );
      await page.context().setOffline(true);
      try {
        await page.reload();
        await page.waitForSelector('[data-count="open"]');
        assert.ok(
          Number(await page.locator('[data-count="open"] strong').innerText()) >
            5,
        );
        await page.locator('#nav [data-view="scholarships"]').click();
        await page.waitForSelector(".active-view .v3-op");
      } finally {
        await page.context().setOffline(false);
      }
    },
  );
  await check(
    "V2 migration requires an export, preserves original bytes, notes and submitted status",
    async () => {
      const old = await browser.newContext();
      const raw = JSON.stringify({
        schema_version: 1,
        progress: { "sch-kaust-0": true, "doc-cv": true },
        applications: { clarendon: "submitted" },
        notes: { kaust: "old note" },
        profile: null,
        tracking: { kaust: "completed" },
        lifecycle: {},
        history: {},
      });
      await old.addInitScript((raw) => {
        if (!sessionStorage.getItem("seeded")) {
          localStorage.setItem("career-track:v2", raw);
          sessionStorage.setItem("seeded", "yes");
        }
      }, raw);
      const migrated = await old.newPage();
      await migrated.goto(base + "/#/scholarships/clarendon");
      await migrated.waitForSelector("[data-v3-migrate]");
      assert.ok(
        await migrated.locator('[data-v3-stage="clarendon"]').isDisabled(),
      );
      const pending = migrated.waitForEvent("download");
      await migrated.locator("[data-v3-migrate]").click();
      await pending;
      assert.equal(
        await migrated.evaluate(() => localStorage.getItem("career-track:v2")),
        raw,
      );
      assert.equal(
        await migrated.locator('[data-v3-stage="clarendon"]').inputValue(),
        "submitted",
      );
      assert.equal(
        await migrated.locator('[data-v3-stage="clarendon"]').isDisabled(),
        false,
      );
      await migrated.reload();
      assert.equal(await migrated.locator("[data-v3-migrate]").count(), 0);
      await old.close();
    },
  );
  await check(
    "Corrupt state blocks edits and recovery keeps raw bytes exportable",
    async () => {
      const c = await browser.newContext();
      await c.addInitScript(() => {
        if (!sessionStorage.getItem("seeded")) {
          localStorage.setItem("career-track:v3", "{broken");
          sessionStorage.setItem("seeded", "yes");
        }
      });
      const p = await c.newPage();
      await p.goto(base + "/#/documents");
      await p.waitForSelector('[data-progress-key="doc-cv"]');
      assert.equal(
        await p.locator('[data-progress-key="doc-cv"]').isDisabled(),
        true,
      );
      assert.match(
        await p.locator("#syncMessage").innerText(),
        /could not be read/,
      );
      await p.goto(base + "/#/settings");
      const pending = p.waitForEvent("download");
      await p.locator(".active-view [data-export-state]").click();
      const exported = JSON.parse(
        await readFile(await (await pending).path(), "utf8"),
      );
      assert.equal(exported.raw_recovery, "{broken");
      await c.close();
    },
  );
  await check(
    "Blocked storage keeps edits in memory and exportable, then Retry saves",
    async () => {
      const c = await browser.newContext();
      await c.addInitScript(() => {
        window.originalSet = Storage.prototype.setItem;
        Storage.prototype.setItem = function () {
          throw Error("quota");
        };
      });
      const p = await c.newPage();
      await p.goto(base + "/#/documents");
      await p.waitForSelector('[data-progress-key="doc-cv"]');
      await p.locator('[data-progress-key="doc-cv"]').check();
      assert.equal(
        await p.locator("#syncLabel").innerText(),
        "Not saved — Retry",
      );
      await p.evaluate(() => (Storage.prototype.setItem = window.originalSet));
      await p.locator("#syncRetry").click();
      assert.equal(
        await p.locator("#syncLabel").innerText(),
        "Saved on this device",
      );
      assert.ok(await p.locator('[data-progress-key="doc-cv"]').isChecked());
      await c.close();
    },
  );
  assert.deepEqual(errors, []);
  await writeFile(
    evidence + "/browser-checks.json",
    JSON.stringify(
      {
        checkedAt: new Date().toISOString(),
        checks,
        errors,
        authRequests: requests.filter((x) =>
          /supabase|accounts.google/.test(x),
        ),
      },
      null,
      2,
    ) + "\n",
  );
  console.log(checks.length + " browser checks passed.");
} finally {
  await browser.close();
  server.kill();
}
