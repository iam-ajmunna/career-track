import { build } from 'esbuild';
import { readFile, writeFile, mkdir, rm, cp } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { buildCalendar } from './lib/interim-calendar.mjs';

export async function buildSite({ outdir = 'dist' } = {}) {
  await rm(outdir, { recursive: true, force: true });
  await mkdir(`${outdir}/assets`, { recursive: true });
  await cp('index.html', `${outdir}/index.html`);
  await cp('assets/styles.css', `${outdir}/assets/styles.css`);
  await cp('src/styles/countries.css', `${outdir}/assets/countries.css`);
  const { deadlines } = JSON.parse(await readFile('deadlines.json', 'utf8'));
  await writeFile(`${outdir}/deadlines.ics`, buildCalendar(deadlines));
  await build({ entryPoints: { app: 'src/bootstrap.js', theme: 'src/theme.js' }, outdir: `${outdir}/assets`,
    bundle: true, splitting: true, format: 'esm', platform: 'browser', target: ['es2022'], minify: true,
    sourcemap: false, logLevel: 'warning' });
  const bytes = (await readFile(`${outdir}/assets/app.js`)).length;
  const gzip = gzipSync(await readFile(`${outdir}/assets/app.js`)).length;
  console.log(`Built browser entry: ${bytes} bytes (${gzip} gzip). Device workspace; no authentication configuration required.`);
}
if (process.argv[1] && new URL(import.meta.url).pathname === process.argv[1]) await buildSite();

