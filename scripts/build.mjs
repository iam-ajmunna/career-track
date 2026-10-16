import { build } from "esbuild";
import { readFile, writeFile, mkdir, rm, cp, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { gzipSync } from "node:zlib";
import { buildV3Calendar } from "../src/v3/calendar.js";

export async function buildSite({ outdir = "dist" } = {}) {
  await rm(outdir, { recursive: true, force: true });
  await mkdir(`${outdir}/assets`, { recursive: true });
  await cp("index.html", `${outdir}/index.html`);
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
  await build({
    entryPoints: { app: "src/bootstrap.js", theme: "src/theme.js" },
    outdir: `${outdir}/assets`,
    bundle: true,
    splitting: true,
    format: "esm",
    platform: "browser",
    target: ["es2022"],
    minify: true,
    sourcemap: false,
    logLevel: "warning",
  });
  const staticPaths = [
    "/",
    "/index.html",
    "/deadlines.ics",
    ...(await readdir(`${outdir}/assets`)).map((name) => "/assets/" + name),
  ];
  const digest = createHash("sha256");
  for (const path of staticPaths)
    digest.update(
      await readFile(outdir + (path === "/" ? "/index.html" : path)),
    );
  const cacheName = "career-track-static-" + digest.digest("hex").slice(0, 16);
  const worker = `const CACHE=${JSON.stringify(cacheName)},FILES=${JSON.stringify(staticPaths)};
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES))));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('career-track-static-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{const url=new URL(event.request.url);if(event.request.method!=='GET'||url.origin!==self.location.origin||!FILES.includes(url.pathname))return;
if(event.request.mode==='navigate')event.respondWith(fetch(event.request).then(response=>{if(response.ok){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put('/',copy)));}return response;}).catch(()=>caches.match('/')));
else event.respondWith(caches.match(event.request,{ignoreSearch:true}).then(cached=>cached||fetch(event.request)));
});`;
  await writeFile(`${outdir}/sw.js`, worker);
  const bytes = (await readFile(`${outdir}/assets/app.js`)).length;
  const gzip = gzipSync(await readFile(`${outdir}/assets/app.js`)).length;
  console.log(
    `Built browser entry: ${bytes} bytes (${gzip} gzip). Device workspace; no authentication configuration required.`,
  );
}
if (process.argv[1] && new URL(import.meta.url).pathname === process.argv[1])
  await buildSite();
