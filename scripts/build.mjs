import { build } from "esbuild";
import { readFile, writeFile, mkdir, rm, cp, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { gzipSync } from "node:zlib";
import { prepareV4Registry } from "./v4-registry.mjs";
import { buildV3Calendar } from "../src/v3/calendar.js";

export async function buildSite({ outdir = "dist" } = {}) {
  await rm(outdir, { recursive: true, force: true });
  await mkdir(`${outdir}/assets`, { recursive: true });
  await mkdir(`${outdir}/classic`, { recursive: true });
  await mkdir(`${outdir}/next`, { recursive: true });
  await cp("index.html", `${outdir}/classic/index.html`);
  await cp("next/index.html", `${outdir}/next/index.html`);
  await cp("src/styles/tokens.css", `${outdir}/assets/tokens.css`);
  await cp("src/styles/app.css", `${outdir}/assets/app4.css`);
  await cp("manifest.webmanifest", `${outdir}/manifest.webmanifest`);
  await cp("assets/icon.svg", `${outdir}/assets/icon.svg`);
  for (const size of [192, 512])
    await cp(`assets/icon-${size}.png`, `${outdir}/assets/icon-${size}.png`);
  await prepareV4Registry(outdir);
  await cp("assets/styles.css", `${outdir}/assets/styles.css`);
  await cp("src/styles/countries.css", `${outdir}/assets/countries.css`);
  await cp("src/styles/intelligence.css", `${outdir}/assets/intelligence.css`);
  const deadlines = JSON.parse(
    await readFile("data/v3/deadlines.json", "utf8"),
  );
  const sources = JSON.parse(await readFile("data/v3/sources.json", "utf8"));
  await writeFile(
    `${outdir}/deadlines.ics`,
    buildV3Calendar(
      deadlines.filter((d) => d.intake === 2027),
      sources,
    ),
  );
  const result = await build({
    entryPoints: {
      app: "src/bootstrap.js",
      app4: "src/v4/bootstrap.js",
      theme: "src/theme.js",
    },
    outdir: `${outdir}/assets`,
    bundle: true,
    splitting: true,
    format: "esm",
    platform: "browser",
    target: ["es2022"],
    minify: true,
    entryNames: "[name]-[hash]",
    metafile: true,
    sourcemap: false,
    logLevel: "warning",
  });
  const entryPath = (entry) => {
    const output = Object.entries(result.metafile.outputs).find(
      ([, metadata]) => metadata.entryPoint === entry,
    )?.[0];
    if (!output) throw Error("Missing browser entry: " + entry);
    return "/assets/" + output.split("/").at(-1);
  };
  const appPath = entryPath("src/bootstrap.js");
  const themePath = entryPath("src/theme.js");
  const classicHtml = (await readFile(`${outdir}/classic/index.html`, "utf8"))
    .replace('src="/assets/app.js"', `src="${appPath}"`)
    .replace('src="/assets/theme.js"', `src="${themePath}"`);
  await writeFile(`${outdir}/classic/index.html`, classicHtml);
  let v4Html = (await readFile(`${outdir}/next/index.html`, "utf8"))
    .replace(
      'src="/assets/app4.js"',
      `src="${entryPath("src/v4/bootstrap.js")}"`,
    )
    .replace('src="/assets/theme.js"', `src="${themePath}"`);
  const preload = Object.entries(result.metafile.outputs).find(
    ([, m]) => m.entryPoint === "src/v4/workspace.js",
  );
  if (preload)
    v4Html = v4Html.replace(
      "</head>",
      `<link rel="modulepreload" href="/assets/${preload[0].split("/").at(-1)}"></head>`,
    );
  await writeFile(`${outdir}/next/index.html`, v4Html);
  await writeFile(
    `${outdir}/index.html`,
    v4Html
      .replace('<meta name="robots" content="noindex">', "")
      .replace(" (next)", ""),
  );
  const walk = async (dir) =>
    (
      await Promise.all(
        (await readdir(dir, { withFileTypes: true })).map(async (d) =>
          d.isDirectory() ? walk(dir + "/" + d.name) : [dir + "/" + d.name],
        ),
      )
    ).flat();
  const staticPaths = [
    "/",
    "/next/",
    "/classic/",
    ...(await walk(outdir)).map((p) => p.slice(outdir.length)),
  ];
  const digest = createHash("sha256");
  for (const path of staticPaths)
    digest.update(
      await readFile(
        outdir + (path.endsWith("/") ? path + "index.html" : path),
      ),
    );
  const cacheName = "career-track-static-" + digest.digest("hex").slice(0, 16);
  const worker = `const CACHE=${JSON.stringify(cacheName)},FILES=${JSON.stringify(staticPaths)};
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('career-track-static-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{const url=new URL(event.request.url);if(event.request.method!=='GET'||url.origin!==self.location.origin||!FILES.includes(url.pathname))return;
if(event.request.mode==='navigate')event.respondWith(fetch(event.request).then(response=>{if(response.ok){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(url.pathname,copy)));}return response;}).catch(()=>caches.match(url.pathname).then(r=>r||caches.match(url.pathname.startsWith('/classic')?'/classic/':url.pathname.startsWith('/next')?'/next/':'/'))));
else event.respondWith(caches.match(event.request,{ignoreSearch:true}).then(cached=>cached||fetch(event.request)));
});`;
  await writeFile(`${outdir}/sw.js`, worker);
  const initial = new Set();
  const include = (output) => {
    if (!output || initial.has(output)) return;
    initial.add(output);
    for (const item of result.metafile.outputs[output].imports)
      if (result.metafile.outputs[item.path] && item.kind !== "dynamic-import")
        include(item.path);
  };
  for (const entry of [
    "src/v4/bootstrap.js",
    "src/v4/workspace.js",
    "src/theme.js",
  ])
    include(
      Object.entries(result.metafile.outputs).find(
        ([, m]) => m.entryPoint === entry,
      )?.[0],
    );
  const initialFiles = await Promise.all(
    [...initial].map(async (path) => ({
      path: "/assets/" + path.split("/").at(-1),
      gzip: gzipSync(await readFile(path)).length,
    })),
  );
  const budget = {
    limitGzip: 150 * 1024,
    totalGzip: initialFiles.reduce((sum, f) => sum + f.gzip, 0),
    files: initialFiles,
    guides: "loaded on demand",
  };
  if (budget.totalGzip > budget.limitGzip)
    throw Error("V4 initial JS exceeds 150 KB gzip.");
  await mkdir("docs/v4", { recursive: true });
  await writeFile(
    "docs/v4/bundle-budget.json",
    JSON.stringify(budget, null, 2) + "\n",
  );
  const bytes = (await readFile(outdir + entryPath("src/v4/bootstrap.js")))
    .length;
  const gzip = gzipSync(
    await readFile(outdir + entryPath("src/v4/bootstrap.js")),
  ).length;
  console.log(
    `Built browser entry: ${bytes} bytes (${gzip} gzip). Device workspace; no authentication configuration required.`,
  );
}
if (process.argv[1] && new URL(import.meta.url).pathname === process.argv[1])
  await buildSite();
