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
const axePath = process.env.CT_AXE_PATH;
const server = spawn(process.execPath, ["scripts/dev.mjs"], {
  env: { ...process.env, PORT: "8091" },
  stdio: ["ignore", "pipe", "pipe"],
});
await new Promise((resolve, reject) => {
  let s = "";
  server.stdout.on("data", (d) => {
    s += d;
    if (s.includes("http://")) resolve();
  });
  server.stderr.on("data", (d) => (s += d));
  server.on("exit", () => reject(Error(s)));
});
const browser = await chromium.launch({
  executablePath: process.env.CT_CHROMIUM_PATH,
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
  headless: true,
});
const base = "http://127.0.0.1:8091",
  checks = [],
  errors = [],
  requests = [],
  interceptedLaunches = [],
  a11y = [];
let page;
await mkdir("docs/v4/ux", { recursive: true });
const check = async (name, fn) => {
  await fn();
  checks.push({ name, status: "PASS" });
  console.log("PASS " + name);
};
const go = async (route = "dashboard", query = "") => {
  await page.goto(base + "/" + query + "#/" + route);
  await page.waitForSelector("#appShell:not([hidden])");
  await page.waitForSelector("[data-view]");
};
const stored = () =>
  page.evaluate(() => JSON.parse(localStorage.getItem("career-track:v3")));
const hash = async (value) => {
  await page.evaluate((h) => (location.hash = h), value);
  await page.waitForTimeout(90);
};
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion: "reduce",
  });
  page = await context.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  context.on("request", (r) => requests.push(r.url()));
  await go();
  await check(
    "Clean local startup, five navigation links and empty hero without sign-in",
    async () => {
      assert.equal(await page.locator("#mainNav a").count(), 5);
      assert.match(
        await page.locator(".hero").innerText(),
        /Add your first scholarship/,
      );
      assert.equal(await page.locator("#accountAvatar").innerText(), "?");
      assert.equal(
        await page.getByRole("button", { name: /sign in/i }).count(),
        0,
      );
    },
  );
  await check(
    "Search is URL-restored, IME-safe and has a working clear action",
    async () => {
      const search = page.locator("#globalSearch");
      await search.fill("not-a-real-scholarship");
      await search.dispatchEvent("compositionstart");
      await page.locator("#searchForm").dispatchEvent("submit");
      assert.match(page.url(), /dashboard/);
      await search.dispatchEvent("compositionend");
      await search.press("Enter");
      await page.waitForSelector('[data-view="scholarships"]');
      assert.match(
        await page.locator("#main").innerText(),
        /No scholarships here yet/,
      );
      await page.reload();
      await page.waitForSelector("#searchClear:not([hidden])");
      await page.locator("#searchClear").click();
      assert.equal(await search.inputValue(), "");
      assert.ok(!page.url().includes("q="));
    },
  );
  await go();
  await check(
    "A match adds to My list and survives reload; dismissal supports Undo",
    async () => {
      const first = page.locator("[data-match]").first(),
        id = await first.getAttribute("data-match");
      await first.locator("[data-add-to-list]").click();
      assert.equal(
        (await stored()).v3.applications[id + ":2027"].decision,
        "apply",
      );
      await page.reload();
      await page.waitForSelector(".appcard");
      assert.equal(
        await page.locator('.appcard[data-opportunity="' + id + '"]').count(),
        1,
      );
      const dismissed = await page
        .locator("[data-dismiss-match]")
        .first()
        .getAttribute("data-dismiss-match");
      await page.locator("[data-dismiss-match]").first().click();
      assert.ok(
        (await stored()).v3.preferences.workspaceV4.dismissedMatches.includes(
          dismissed,
        ),
      );
      await page.locator("[data-toast-undo]").click();
      assert.ok(
        !(await stored()).v3.preferences.workspaceV4.dismissedMatches.includes(
          dismissed,
        ),
      );
    },
  );
  await check(
    "Country tiers show exact compromises, country tabs and unrated destinations",
    async () => {
      await go("scholarships");
      assert.ok((await page.locator(".country").count()) > 10);
      assert.match(
        await page.locator(".country").first().innerText(),
        /You sacrifice:/,
      );
      assert.ok((await page.locator(".compromise").count()) > 0);
      await page.locator('a.country[href="#/scholarships/country/GB"]').click();
      await page.waitForSelector(".country-head");
      assert.equal(await page.locator('[data-tab="country"]').count(), 4);
      await page.locator('[data-tab="country"][data-value="future"]').click();
      assert.match(page.url(), /window=future/);
    },
  );
  await check(
    "Drawer deep links load six tabs, lazy guides and restore focus with Escape",
    async () => {
      await go("scholarships/country/SA?focus=kaust");
      await page.waitForSelector("#drawer:not([hidden])");
      assert.equal(await page.locator('#drawer [role="tab"]').count(), 6);
      assert.equal(
        await page.locator("#appShell").evaluate((n) => n.inert),
        true,
      );
      await page
        .locator('[data-tab="drawer"][data-value="requirements"]')
        .click();
      await page.waitForSelector("#drawer .guide-loading", {
        state: "detached",
      });
      assert.ok(requests.some((u) => u.includes("/guides/kaust.json")));
      await page.locator("[data-application-step]").first().check();
      assert.ok(
        Object.values(
          (await stored()).v3.applications["kaust:2027"].completedSteps,
        ).some(Boolean),
      );
      await page.keyboard.press("Escape");
      await page.waitForSelector("#drawer[hidden]", { state: "attached" });
      assert.equal(
        await page.locator("#appShell").evaluate((n) => n.inert),
        false,
      );
    },
  );
  await check(
    "Date-only hero shows days and a caveat, while exact hero ticks without rerendering the shell",
    async () => {
      await page.evaluate(() => {
        const s = JSON.parse(localStorage.getItem("career-track:v3"));
        s.v3.applications = {
          "kaust:2027": {
            opportunityId: "kaust",
            intake: 2027,
            stage: "preparing",
            decision: "apply",
            completedSteps: {},
          },
        };
        localStorage.setItem("career-track:v3", JSON.stringify(s));
      });
      await page.reload();
      await go();
      assert.match(
        await page.locator(".hero").innerText(),
        /Time not confirmed/,
      );
      assert.equal(await page.locator('[data-u="s"]').count(), 0);
      await go("scholarships/country/AE?focus=mbzuai");
      await page.locator('#drawer [name="decision"]').selectOption("apply");
      await page.keyboard.press("Escape");
      await go();
      assert.equal(await page.locator('[data-u="s"]').count(), 1);
      const before = await page.locator('[data-u="s"]').innerText();
      await page.locator("#main > section").evaluate((el) => {
        el.dataset.timerProbe = "stable";
      });
      await page.waitForFunction(
        (value) =>
          document.querySelector('[data-u="s"]')?.textContent !== value,
        before,
        { timeout: 5000 },
      );
      assert.equal(
        await page.locator('[data-timer-probe="stable"]').count(),
        1,
      );
    },
  );
  await check(
    "Private note drafts survive navigation and are included in complete export",
    async () => {
      await go("scholarships/country/SA?focus=kaust");
      await page
        .locator('[data-private-note="kaust"]')
        .fill("Fictional test note <script>safe</script>");
      await page.keyboard.press("Escape");
      await hash("#/settings/data");
      const download = page.waitForEvent("download");
      await page.locator("#main [data-export-state]").click();
      const file = await download,
        exported = JSON.parse(await readFile(await file.path(), "utf8"));
      assert.equal(
        exported.state.notes.kaust,
        "Fictional test note <script>safe</script>",
      );
    },
  );
  await check(
    "Profile editing validates country codes, updates the avatar and persists preferences",
    async () => {
      await go("settings/profile");
      await page.locator('[name="displayName"]').fill("Alex Morgan");
      await page.locator('[name="citizenship"]').fill("B");
      await page
        .locator('[name="researchAreas"]')
        .fill("machine-learning, computer-vision");
      await page
        .getByRole("button", { name: "Save profile", exact: true })
        .click();
      assert.match(
        await page.locator("#main .form-error").innerText(),
        /two-letter/,
      );
      await page.locator('[name="citizenship"]').fill("BD");
      await page.locator('[name="feeStatus"]').selectOption("international");
      await page.locator('[name="preferredCountries"]').fill("GB, DE, CA");
      await page
        .getByRole("button", { name: "Save profile", exact: true })
        .click();
      assert.equal(await page.locator("#accountAvatar").innerText(), "AM");
      assert.equal((await stored()).v3.profile.displayName, "Alex Morgan");
    },
  );
  await check(
    "Shared document status and expiry update the dossier and scholarship checklist",
    async () => {
      await go("documents");
      await page
        .locator('[data-document-status="dossier-transcript"]')
        .selectOption("ready");
      assert.match(await page.locator("[data-doc-ready]").innerText(), /1 of/);
      await go("scholarships/country/SA?focus=kaust&tab=documents");
      await page.waitForSelector(
        '#drawer [data-document-status="dossier-transcript"]',
      );
      assert.equal(
        await page
          .locator('#drawer [data-document-status="dossier-transcript"]')
          .inputValue(),
        "ready",
      );
      await page.keyboard.press("Escape");
      await go("documents");
      await page
        .locator('[data-document="dossier-transcript"] summary')
        .click();
      await page
        .locator('[data-doc-expiry="dossier-transcript"]')
        .fill("2020-01-01");
      await page
        .locator('[data-doc-expiry="dossier-transcript"]')
        .dispatchEvent("change");
      assert.match(
        await page.locator('[data-document="dossier-transcript"]').innerText(),
        /Expired/,
      );
    },
  );
  await check(
    "Referee and English test plans persist and private milestones export without false source attribution",
    async () => {
      await go("documents/references");
      await page
        .locator('[data-new-reference] [name="name"]')
        .fill("Example Referee");
      await page
        .locator('[data-new-reference] [name="email"]')
        .fill("referee@example.org");
      await page
        .getByRole("button", { name: "Add referee", exact: true })
        .click();
      assert.equal(Object.keys((await stored()).v3.references).length, 1);
      await go("documents/tests");
      await page.locator('[name="target"]').fill("7.0");
      await page.locator('[name="booking"]').fill("2026-12-01");
      await page
        .getByRole("button", { name: "Save test plan", exact: true })
        .click();
      await go("calendar?month=2026-12&view=agenda");
      assert.match(
        await page.locator(".cal__agenda").innerText(),
        /English test/,
      );
      const promise = page.waitForEvent("download");
      await page.locator("[data-export-calendar]").click();
      const d = await promise,
        text = await readFile(await d.path(), "utf8");
      assert.match(text, /UID:personal-test/);
      assert.match(text, /DTSTART;VALUE=DATE:20261201/);
      assert.doesNotMatch(
        text.split("UID:personal-test")[1].split("END:VEVENT")[0],
        /URL:/,
      );
    },
  );
  await check(
    "Calendar grid supports Monday-start dates, arrows, type filters and agenda mode",
    async () => {
      await go("calendar?month=2026-10&scope=all");
      assert.equal(
        await page.locator("[data-day]").first().getAttribute("data-day"),
        "2026-09-28",
      );
      await page.locator('[data-day="2026-10-01"]').focus();
      await page.keyboard.press("ArrowRight");
      assert.equal(
        await page.locator(":focus").getAttribute("data-day"),
        "2026-10-02",
      );
      await page.locator('[name="event-type"]').selectOption("closes");
      assert.match(page.url(), /type=closes/);
      await page.locator('[data-tab="calendar"][data-value="agenda"]').click();
      await page.waitForSelector(".cal__grid.is-agenda", { state: "attached" });
      assert.equal(await page.locator(".cal__grid").isVisible(), false);
    },
  );
  await check(
    "Archive, Trash and restore retain application notes and never purge on a clock",
    async () => {
      await go("scholarships/country/SA?focus=kaust");
      await page.locator('[data-lifecycle="delete"]').click();
      await page.locator('#actionDialog button[type="submit"]').click();
      await go("settings/archive");
      assert.match(await page.locator("#main").innerText(), /KAUST/);
      assert.equal(
        (await stored()).notes.kaust,
        "Fictional test note <script>safe</script>",
      );
      await page.locator('[data-lifecycle="restore"]').click();
      assert.equal((await stored()).lifecycle.kaust, undefined);
    },
  );
  await check(
    "Backup, typed reset and typed restore round-trip the entire private workspace",
    async () => {
      await go("settings/data");
      const promise = page.waitForEvent("download");
      await page.locator("#main [data-export-state]").click();
      const d = await promise,
        raw = await readFile(await d.path(), "utf8"),
        before = JSON.parse(raw).state;
      await page.locator("[data-reset-workspace]").click();
      await page.locator('#actionDialog [name="confirmation"]').fill("RESET");
      const resetDownload = page.waitForEvent("download");
      await page.locator('#actionDialog button[type="submit"]').click();
      await resetDownload;
      assert.deepEqual((await stored()).v3.applications, {});
      await page.locator("[data-import-file]").setInputFiles({
        name: "demo-backup.json",
        mimeType: "application/json",
        buffer: Buffer.from(raw),
      });
      await page.locator("[data-restore-import]").click();
      await page.locator('#actionDialog [name="confirmation"]').fill("RESTORE");
      const restoreDownload = page.waitForEvent("download");
      await page.locator('#actionDialog button[type="submit"]').click();
      await restoreDownload;
      assert.deepEqual(await stored(), before);
    },
  );
  await check(
    "Legacy routes, numeric keys, avatar menu and tab arrows stay keyboard operable",
    async () => {
      await go("overview");
      assert.match(page.url(), /dashboard/);
      await page.locator("#pageTitle").focus();
      await page.keyboard.press("2");
      await page.waitForSelector('[data-view="scholarships"]');
      await page
        .locator('[data-tab="scholarships"][data-value="country"]')
        .focus();
      await page.keyboard.press("ArrowRight");
      await page.waitForSelector(
        '[data-tab="scholarships"][data-value="list"][aria-selected="true"]',
      );
      await page.locator("#accountBtn").click();
      await page.keyboard.press("End");
      assert.match(await page.locator(":focus").innerText(), /Sources/);
      await page.keyboard.press("Escape");
      assert.equal(
        await page.locator(":focus").getAttribute("id"),
        "accountBtn",
      );
      await go("scholarships/kaust");
      await page.waitForSelector("#drawer:not([hidden])");
      assert.match(page.url(), /scholarships\/detail\/kaust/);
      await page.keyboard.press("Escape");
    },
  );
  await check(
    "Single and bulk research tracking persist across pages and reload without submitting applications",
    async () => {
      await go("scholarships/all?window=all");
      const selected = await page
        .locator("[data-select-opportunity]")
        .evaluateAll((nodes) =>
          nodes.slice(0, 2).map((n) => n.dataset.selectOpportunity),
        );
      const before = (await stored()).v3.applications;
      for (const id of selected)
        await page.locator('[data-select-opportunity="' + id + '"]').check();
      await page.getByRole("button", { name: "Next", exact: true }).click();
      await page.waitForTimeout(100);
      const extra = await page
        .locator("[data-select-opportunity]")
        .first()
        .getAttribute("data-select-opportunity");
      selected.push(extra);
      await page.locator('[data-select-opportunity="' + extra + '"]').check();
      await page
        .getByRole("button", { name: "Mark researching", exact: true })
        .click();
      await page.reload();
      await page.waitForSelector("[data-view]");
      for (const id of selected)
        assert.equal((await stored()).tracking[id], "researching");
      await go("scholarships/all?window=all&tracking=researching");
      for (const id of selected)
        await page.locator('[data-select-opportunity="' + id + '"]').check();
      await page
        .getByRole("button", { name: "Mark completed", exact: true })
        .click();
      for (const id of selected)
        assert.equal((await stored()).tracking[id], "completed");
      assert.deepEqual((await stored()).v3.applications, before);
      await go("scholarships/all?window=all&tracking=completed");
      assert.equal(await page.locator(".oppcard").count(), selected.length);
      await page
        .locator('[data-open-opportunity="' + selected[0] + '"]')
        .click();
      await page
        .locator('#drawer [name="tracking"]')
        .selectOption("researching");
      assert.equal((await stored()).tracking[selected[0]], "researching");
      assert.deepEqual((await stored()).v3.applications, before);
      await page.keyboard.press("Escape");
    },
  );
  await check(
    "GPT launch and copy fallback exclude private data; application package includes the private draft",
    async () => {
      await go("scholarships/country/SA?focus=kaust");
      const privateNote = "Fictional private package-only note";
      await page.locator('[data-private-note="kaust"]').fill(privateNote);
      await page.evaluate(() =>
        Object.defineProperty(navigator, "clipboard", {
          configurable: true,
          value: {
            writeText: async () => {
              throw Error("Clipboard denied fixture");
            },
          },
        }),
      );
      await page.locator("[data-copy-prompt]").click();
      await page.waitForSelector("#actionDialog[open] textarea");
      const copied = await page.locator("#actionDialog textarea").inputValue();
      assert.match(copied, /KAUST/);
      assert.ok(!copied.includes(privateNote));
      assert.ok(!copied.includes("Alex Morgan"));
      await page.locator("#actionDialog [data-cancel-action]").click();
      await context.route("https://chatgpt.com/**", (request) => {
        interceptedLaunches.push(request.request().url());
        return request.fulfill({
          contentType: "text/html",
          body: "<title>Intercepted GPT launch</title>",
        });
      });
      const opened = context.waitForEvent("page");
      await page.locator("#drawer [data-open-gpt]").click();
      const popup = await opened;
      await popup.waitForLoadState("domcontentloaded");
      assert.equal(new URL(popup.url()).searchParams.get("q"), copied);
      await popup.close();
      await page.locator("#actionDialog [data-cancel-action]").click();
      const downloaded = page.waitForEvent("download");
      await page.locator("[data-application-package]").click();
      const file = await downloaded;
      const content = await readFile(await file.path(), "utf8");
      assert.match(content, /KAUST/);
      assert.ok(content.includes(privateNote));
      assert.equal((await stored()).notes.kaust, privateNote);
      await page.keyboard.press("Escape");
    },
  );
  await check(
    "Saving one form preserves an unsaved form on another route",
    async () => {
      await go("settings/profile");
      await page
        .locator('[name="displayName"]')
        .fill("Unsaved fictional profile");
      await hash("#/documents/tests");
      await page.locator('[name="target"]').fill("8.0");
      await page.locator("[data-tests-form] button[type=submit]").click();
      await hash("#/settings/profile");
      assert.equal(
        await page.locator('[name="displayName"]').inputValue(),
        "Unsaved fictional profile",
      );
      assert.notEqual(
        (await stored()).v3.profile.displayName,
        "Unsaved fictional profile",
      );
      await page.locator('[name="displayName"]').fill("Alex Morgan");
      await page
        .getByRole("button", { name: "Save profile", exact: true })
        .click();
    },
  );
  await check(
    "Every registry opportunity renders all six drawer tabs with a loaded guide",
    async () => {
      const items = JSON.parse(
        await readFile("data/v3/opportunities.json", "utf8"),
      );
      await go("scholarships");
      for (const item of items) {
        await hash("#/scholarships/detail/" + item.id);
        await page.waitForSelector("#drawer:not([hidden])");
        await page.waitForSelector("#drawer .guide-loading", {
          state: "detached",
        });
        for (const tab of [
          "overview",
          "requirements",
          "funding",
          "documents",
          "timeline",
          "sources",
        ]) {
          await page
            .locator('[data-tab="drawer"][data-value="' + tab + '"]')
            .click();
          assert.equal(
            await page
              .locator('#drawer [data-tab="drawer"][aria-selected="true"]')
              .getAttribute("data-value"),
            tab,
            item.id,
          );
          assert.ok(
            !(await page.locator("#drawer").innerText()).includes(
              "Guide unavailable",
            ),
            item.id,
          );
        }
      }
      await page.keyboard.press("Escape");
    },
  );
  await check(
    "Guide failure retries and a delayed earlier guide cannot replace a later drawer",
    async () => {
      const primary = page,
        isolated = await browser.newContext({ serviceWorkers: "block" });
      page = await isolated.newPage();
      page.on("pageerror", (error) => errors.push(error.message));
      await page.route("**/data/v4/guides/ipcvai.json", (route) =>
        route.fulfill({ status: 503, body: "unavailable" }),
      );
      await go("scholarships/detail/ipcvai");
      await page.waitForSelector("[data-retry-guide]");
      await page.unroute("**/data/v4/guides/ipcvai.json");
      await page.locator("[data-retry-guide]").click();
      await page.waitForSelector("#drawer .guide-loading", {
        state: "detached",
      });
      assert.equal(await page.locator("[data-retry-guide]").count(), 0);
      await page.route("**/data/v4/guides/emai.json", async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 500));
        await route.continue();
      });
      await hash("#/scholarships/detail/emai");
      await hash("#/scholarships/detail/imlex");
      await page.waitForTimeout(700);
      assert.match(await page.locator("#drawer").innerText(), /IMLEX/);
      assert.ok(!(await page.locator("#drawer").innerText()).includes("EMAI"));
      await isolated.close();
      page = primary;
    },
  );
  await check(
    "Demo mode isolates all edits and theme choices from saved owner storage",
    async () => {
      const before = await page.evaluate(() =>
        localStorage.getItem("career-track:v3"),
      );
      await go("settings/profile", "?demo=1");
      await page.locator('[name="displayName"]').fill("Demo Change");
      await page
        .getByRole("button", { name: "Save profile", exact: true })
        .click();
      await page.locator("#themeToggle").click();
      assert.equal(
        await page.evaluate(() => localStorage.getItem("career-track:v3")),
        before,
      );
    },
  );
  await check(
    "All five views fit 1440, 1024, 768, 390 and 320 pixels in both themes",
    async () => {
      for (const width of [1440, 1024, 768, 390, 320]) {
        await page.setViewportSize({ width, height: 900 });
        for (const theme of ["light", "dark"]) {
          await page.evaluate(
            (t) => (document.documentElement.dataset.theme = t),
            theme,
          );
          for (const route of [
            "dashboard",
            "scholarships",
            "calendar",
            "documents",
            "settings",
          ]) {
            await hash("#/" + route);
            const overflow = await page.evaluate(
              () =>
                document.documentElement.scrollWidth > window.innerWidth + 1,
            );
            assert.equal(overflow, false, route + " " + width + " " + theme);
            if ([1440, 390].includes(width))
              await page.screenshot({
                path:
                  "docs/v4/ux/" + route + "-" + width + "-" + theme + ".png",
                fullPage: true,
              });
          }
        }
      }
    },
  );
  if (axePath)
    await check(
      "Axe reports zero serious or critical issues on all five views in light and dark",
      async () => {
        await page.setViewportSize({ width: 1440, height: 900 });
        for (const theme of ["light", "dark"]) {
          await page.evaluate(
            (t) => (document.documentElement.dataset.theme = t),
            theme,
          );
          for (const route of [
            "dashboard",
            "scholarships",
            "calendar",
            "documents",
            "settings",
          ]) {
            await hash("#/" + route);
            await page.addScriptTag({ path: axePath });
            const result = await page.evaluate(() =>
              axe.run(document, {
                runOnly: {
                  type: "tag",
                  values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"],
                },
              }),
            );
            const violations = result.violations.filter((v) =>
              ["serious", "critical"].includes(v.impact),
            );
            a11y.push({
              theme,
              route,
              violations: violations.map((v) => ({
                id: v.id,
                nodes: v.nodes.map((n) => n.target),
              })),
            });
            assert.equal(violations.length, 0, JSON.stringify(a11y.at(-1)));
          }
        }
      },
    );
  await check(
    "Service worker keeps root, next and classic shells distinct offline",
    async () => {
      await go("dashboard", "?demo=1");
      await page.evaluate(() => navigator.serviceWorker.ready);
      await page.waitForFunction(() => navigator.serviceWorker.controller);
      await context.setOffline(true);
      await page.reload();
      await page.waitForSelector('[data-view="dashboard"]');
      await page.goto(base + "/next/?demo=1#/documents");
      await page.waitForSelector('[data-view="documents"]');
      await page.goto(base + "/classic/#/settings");
      await page.waitForSelector("#v3BackupFile", { state: "attached" });
      await context.setOffline(false);
    },
  );
  await context.close();
  await check(
    "Quota failure preserves in-memory work, export and retry",
    async () => {
      const c = await browser.newContext();
      page = await c.newPage();
      await page.addInitScript(() => {
        const original = Storage.prototype.setItem;
        window.restoreStorage = () => (Storage.prototype.setItem = original);
        Storage.prototype.setItem = function (key, value) {
          if (key === "career-track:v3")
            throw new DOMException("quota", "QuotaExceededError");
          return original.call(this, key, value);
        };
      });
      await go("scholarships/country/SA?focus=kaust");
      await page.locator('#drawer [name="decision"]').selectOption("apply");
      assert.match(await page.locator("#syncLabel").innerText(), /Not saved/);
      await page.keyboard.press("Escape");
      await page.evaluate(() => window.restoreStorage());
      await page.locator("#syncRetry").click();
      assert.equal(
        (await stored()).v3.applications["kaust:2027"].decision,
        "apply",
      );
      await c.close();
    },
  );
  await check(
    "Corrupt storage blocks writes and retains exportable recovery bytes",
    async () => {
      const c = await browser.newContext();
      page = await c.newPage();
      await page.addInitScript(() =>
        localStorage.setItem("career-track:v3", "broken-json"),
      );
      await go("scholarships/country/SA?focus=kaust");
      await page.waitForSelector("#drawer .guide-loading", {
        state: "detached",
      });
      assert.equal(
        await page.locator('#drawer [name="decision"]').isDisabled(),
        true,
      );
      assert.equal(
        await page.locator('#drawer [name="tracking"]').isDisabled(),
        true,
      );
      assert.equal(
        await page.locator("#drawer [data-private-note]").isDisabled(),
        true,
      );
      assert.equal(
        await page.evaluate(() => localStorage.getItem("career-track:v3")),
        "broken-json",
      );
      await c.close();
    },
  );
  assert.equal(errors.length, 0, errors.join("\n"));
  console.log(
    "External HTTP requests",
    JSON.stringify([
      ...new Set(
        requests.filter(
          (u) =>
            /^https?:/.test(u) &&
            !u.startsWith(base) &&
            !interceptedLaunches.includes(u),
        ),
      ),
    ]),
  );
  assert.equal(
    requests.some(
      (u) =>
        /^https?:/.test(u) &&
        !u.startsWith(base) &&
        !interceptedLaunches.includes(u),
    ),
    false,
    "Unexpected external request",
  );
  await writeFile(
    "docs/v4/ux/browser-results.json",
    JSON.stringify(
      {
        checks,
        accessibility: a11y,
        consoleErrors: errors,
        thirdPartyRequests: requests.filter(
          (u) =>
            /^https?:/.test(u) &&
            !u.startsWith(base) &&
            !interceptedLaunches.includes(u),
        ),
        interceptedGptLaunchCount: interceptedLaunches.length,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(checks.length + " V4 browser checks passed.");
} catch (e) {
  if (page && !page.isClosed()) {
    await page.screenshot({ path: "docs/v4/ux/failure.png", fullPage: true });
    console.error((await page.locator("body").innerText()).slice(0, 2500));
  }
  console.error(errors);
  throw e;
} finally {
  await browser.close();
  server.kill();
}
