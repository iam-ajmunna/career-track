import { timingSafeEqual } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return res.status(405).json({ error: 'Method not allowed' }); }
  const secret = process.env.CRON_SECRET;
  if (!secret || !process.env.SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY) return res.status(503).json({ error: 'Not configured' });
  const actual = Buffer.from(req.headers.authorization ?? '');
  const expected = Buffer.from(`Bearer ${secret}`);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY,
      { auth: { persistSession: false, autoRefreshToken: false } });
    const { error } = await client.from('user_state').select('rev').limit(1).abortSignal(AbortSignal.timeout(10000));
    if (error) return res.status(503).json({ error: 'Database unavailable' });
    return res.status(200).json({ ok: true });
  } catch { return res.status(503).json({ error: 'Database unavailable' }); }
}
