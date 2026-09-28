import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/keepalive.js';
function response() { return { headers: {}, setHeader(key, value) { this.headers[key] = value; }, status(code) { this.code = code; return this; }, json(data) { this.data = data; return this; } }; }
test('keepalive rejects unsupported methods and missing/incorrect authorization without network calls', async () => {
  const old = { ...process.env };
  try {
    delete process.env.CRON_SECRET; const noConfig = response();
    await handler({ method: 'GET', headers: {} }, noConfig); assert.equal(noConfig.code, 503);
    process.env.CRON_SECRET = 'test-only-not-a-real-secret'; process.env.SUPABASE_URL = 'https://example.supabase.co'; process.env.SUPABASE_SECRET_KEY = 'test-only';
    const method = response(); await handler({ method: 'POST', headers: {} }, method); assert.equal(method.code, 405);
    const noAuth = response(); await handler({ method: 'GET', headers: {} }, noAuth); assert.equal(noAuth.code, 401);
    const bad = response(); await handler({ method: 'GET', headers: { authorization: 'Bearer wrong' } }, bad); assert.equal(bad.code, 401);
    assert.equal(bad.headers['Cache-Control'], 'no-store'); assert.doesNotMatch(JSON.stringify(bad), /test-only/);
  } finally { process.env = old; }
});
