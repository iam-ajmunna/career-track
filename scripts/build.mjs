import { build } from 'esbuild';
import { readFile, writeFile, mkdir, rm, cp } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { buildCalendar } from './lib/interim-calendar.mjs';

async function publicConfigFallback() {
  try {
    const project = JSON.parse(await readFile('supabase/project.json', 'utf8'));
    return { url: project.api_url ?? '', key: project.publishable_key ?? '' };
  } catch {
    return { url: '', key: '' };
  }
}

export async function buildSite({ outdir = 'dist', env = process.env } = {}) {
  const fallback = await publicConfigFallback();
  const url = (env.PUBLIC_SUPABASE_URL ?? '').trim() || fallback.url;
  const key = (env.PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '').trim() || fallback.key;
  if (url) {
    const parsed = new URL(url);
    if (parsed.origin !== url || !(parsed.protocol === 'https:' ||
        (parsed.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(parsed.hostname)))) throw new Error('Invalid public Supabase origin.');
  }
  if (key.startsWith('sb_secret_')) throw new Error('A secret Supabase key cannot be included in the browser.');
  if (key.startsWith('eyJ')) {
    const claims = JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString());
    if (claims.role !== 'anon') throw new Error('Only a publishable/anon key may be included in the browser.');
  } else if (key && !key.startsWith('sb_publishable_')) throw new Error('Expected a publishable Supabase key.');
  await rm(outdir, { recursive: true, force: true });
  await mkdir(`${outdir}/assets`, { recursive: true });
  await cp('index.html', `${outdir}/index.html`);
  await cp('assets/styles.css', `${outdir}/assets/styles.css`);
  const { deadlines } = JSON.parse(await readFile('deadlines.json', 'utf8'));
  await writeFile(`${outdir}/deadlines.ics`, buildCalendar(deadlines));
  await build({ entryPoints: { app: 'src/bootstrap.js', theme: 'src/theme.js' }, outdir: `${outdir}/assets`,
    bundle: true, splitting: true, format: 'esm', platform: 'browser', target: ['es2022'], minify: true,
    sourcemap: false, define: { __PUBLIC_CONFIG__: JSON.stringify({ url, key }) }, logLevel: 'warning' });
  const bytes = (await readFile(`${outdir}/assets/app.js`)).length;
  const gzip = gzipSync(await readFile(`${outdir}/assets/app.js`)).length;
  console.log(`Built browser entry: ${bytes} bytes (${gzip} gzip). Cloud configuration: ${url && key ? 'present' : 'missing; sign-in fails closed'}.`);
}
if (process.argv[1] && new URL(import.meta.url).pathname === process.argv[1]) await buildSite();
