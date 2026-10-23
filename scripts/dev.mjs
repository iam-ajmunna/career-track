import { gzipSync } from "node:zlib";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, sep, extname } from "node:path";
import { buildSite } from "./build.mjs";
try {
  process.loadEnvFile(".env");
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
await buildSite();
const root = resolve("dist");
const types = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".ics": "text/calendar",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".webmanifest": "application/manifest+json",
};
const server = createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(
      new URL(req.url, "http://localhost").pathname,
    );
    const target = resolve(
      root,
      "." +
        (pathname.endsWith("/")
          ? pathname + "index.html"
          : ["/classic", "/next"].includes(pathname)
            ? pathname + "/index.html"
            : pathname),
    );
    if (!target.startsWith(root + sep)) {
      res.writeHead(403);
      return res.end();
    }
    let body = await readFile(target);
    const compressed =
      /gzip/.test(req.headers["accept-encoding"] || "") &&
      /\.(html|js|css|json|svg|webmanifest)$/.test(target);
    if (compressed) body = gzipSync(body);
    res.writeHead(200, {
      "Content-Type": types[extname(target)] ?? "application/octet-stream",
      "Cache-Control": "no-store",
      ...(compressed
        ? { "Content-Encoding": "gzip", Vary: "Accept-Encoding" }
        : {}),
    });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
});
server.listen(Number(process.env.PORT ?? 8080), "0.0.0.0", () =>
  console.log("Career Track at http://localhost:" + server.address().port),
);
