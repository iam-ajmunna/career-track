// Local-only fixture for UI verification. Never included in dist or a deployment.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, sep, extname } from 'node:path';
import { buildSite } from '../scripts/build.mjs';
import { EMPTY_STATE } from '../src/sync/model.js';
const port = Number(process.env.PORT ?? 8081);
const origin = `http://127.0.0.1:${port}`;
await buildSite({ outdir: '.local-test/dist', env: { PUBLIC_SUPABASE_URL: origin, PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_local_fixture_only' } });
const owner = '11111111-1111-4111-8111-111111111111';
const stranger = '22222222-2222-4222-8222-222222222222';
const users = [owner, stranger].map(id => ({ id, aud: 'authenticated', role: 'authenticated', email: `${id === owner ? 'owner' : 'other'}@example.invalid`, app_metadata: { provider: 'google', providers: ['google'] }, user_metadata: {}, created_at: new Date().toISOString() }));
const token = id => [Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url'), Buffer.from(JSON.stringify({ sub: id, role: 'authenticated', exp: Math.floor(Date.now() / 1000) + 86400 })).toString('base64url'), 'test-fixture-signature'].join('.');
const sessions = users.map(user => ({ access_token: token(user.id), token_type: 'bearer', refresh_token: 'fixture-refresh', expires_in: 86400, expires_at: Math.floor(Date.now() / 1000) + 86400, user }));
const root = resolve('.local-test/dist');
let row = { owner_id: owner, state: { ...structuredClone(EMPTY_STATE), profile: { name: 'Fixture Applicant', degree: 'Test degree', university: 'Test university', cgpa: '4.00', highlights: [], positioning: {} } }, rev: 0, updated_at: new Date().toISOString() };
let failWrites = false;
const server = createServer(async (req, res) => {
  const url = new URL(req.url, origin);
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin ?? origin);
  res.setHeader('Access-Control-Allow-Headers', 'authorization,apikey,content-type,x-client-info,prefer,x-supabase-api-version');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,OPTIONS');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
  const json = (status, data) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(data)); };
  if (url.pathname === '/fixture') {
    res.setHeader('Content-Type', 'text/html');
    return res.end(`<!doctype html><title>Local test fixture</title><h1>Local test fixture</h1><p>Synthetic identities and data only. This page is excluded from production.</p>
      <button id="owner">Open owner fixture</button><button id="other">Open restricted account fixture</button><button id="guest">Open signed-out fixture</button>
      <form method="POST" action="/fixture/failure"><button name="mode" value="fail">Fail saves</button><button name="mode" value="success">Restore saves</button></form>
      <script>const key=${JSON.stringify('career-track-auth:' + new URL(origin).host)};const sessions=${JSON.stringify(sessions)};
      document.querySelector('#owner').onclick=()=>{localStorage.setItem(key,JSON.stringify(sessions[0]));location.href='/'};
      document.querySelector('#other').onclick=()=>{localStorage.setItem(key,JSON.stringify(sessions[1]));location.href='/'};
      document.querySelector('#guest').onclick=()=>{localStorage.removeItem(key);location.href='/'};</script>`);
  }
  if (url.pathname === '/fixture/failure' && req.method === 'POST') {
    let body = ''; for await (const part of req) body += part;
    failWrites = new URLSearchParams(body).get('mode') === 'fail'; res.writeHead(303, { Location: '/' }); return res.end();
  }
  if (url.pathname.startsWith('/auth/')) {
    if (url.pathname.endsWith('/logout')) return json(200, {});
    return json(200, users[0]);
  }
  if (url.pathname.startsWith('/rest/')) {
    const access = req.headers.authorization?.slice(7);
    const user = sessions.find(session => session.access_token === access)?.user;
    if (!user) return json(401, { code: 'PGRST301', message: 'Fixture access denied' });
    if (url.pathname.endsWith('/rpc/get_career_state')) return json(200, { snapshot: user.id === owner ? row : null, server_time: new Date().toISOString() });
    if (req.method === 'PATCH') {
      if (failWrites) return json(503, { message: 'Forced fixture failure' });
      if (user.id !== owner || url.searchParams.get('rev') !== `eq.${row.rev}`) return json(200, []);
      let body = ''; for await (const part of req) body += part;
      row = { ...row, state: JSON.parse(body).state, rev: row.rev + 1, updated_at: new Date().toISOString() }; return json(200, [row]);
    }
    return json(404, {});
  }
  try {
    const target = resolve(root, '.' + (url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname)));
    if (!target.startsWith(root + sep)) return json(403, {});
    const body = await readFile(target);
    res.setHeader('Content-Type', ({ '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.ics': 'text/calendar' })[extname(target)] ?? 'application/octet-stream'); res.end(body);
  } catch { json(404, { error: 'Not found' }); }
});
server.listen(port, '0.0.0.0', () => console.log(`Synthetic browser fixture: ${origin}/fixture`));
