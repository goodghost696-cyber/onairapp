import { createClient } from '@supabase/supabase-js';
import { applyCors } from './_lib/auth.js';
import { checkMemoryRateLimit } from './_lib/rateLimit.js';

// Public on purpose (called before the user has an account/session), but
// only ever reveals a boolean (+ which gym, needed by register() below —
// not sensitive, a gym's own invite code already gates who gets this far).
//
// Codes now live per-gym in the `gyms` table (multi-tenant foundation,
// 2026-08-10) instead of a single INVITE_CODE env var — resolving a code
// also resolves WHICH gym a new member should join. Uses the service role
// key because this runs before the caller has a session, so `gyms`' own
// "authenticated only" RLS policy would otherwise reject the lookup.
export default async function handler(req, res) {
  applyCors(req, res, 'POST');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // No user identity exists yet at this point — best-effort IP-based
  // deterrent against scripted brute-forcing (see rateLimit.js for caveats).
  const ip = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
  if (!checkMemoryRateLimit(`validate-invite:${ip}`, { max: 10, windowMs: 5 * 60 * 1000 })) {
    return res.status(429).json({ error: 'Too many attempts, try again shortly' });
  }

  const { code } = req.body || {};
  if (!code) return res.status(200).json({ valid: false, gym_id: null });

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    console.error('[validate-invite] SUPABASE_SERVICE_ROLE_KEY not configured');
    return res.status(500).json({ error: 'Not configured' });
  }

  const admin = createClient(process.env.VITE_SUPABASE_URL, serviceRoleKey);
  const { data: gym, error } = await admin
    .from('gyms')
    .select('id')
    .eq('invite_code', code)
    .maybeSingle();
  if (error) console.error('[validate-invite] gyms lookup failed', error);

  return res.status(200).json({ valid: !!gym, gym_id: gym?.id || null });
}
