import { createClient } from '@supabase/supabase-js';
import { applyCors, requireUser } from './_lib/auth.js';
import { checkMemoryRateLimit } from './_lib/rateLimit.js';

// Merges the old invite-code.js (GET, authenticated coach reading their
// own gym's code) and validate-invite.js (POST, public — called before a
// signup even has a session) into one file. Not a natural pairing
// otherwise, done to stay under Vercel Hobby's 12-Serverless-Functions-
// per-deployment cap (this repo was already sitting exactly at that cap
// before Stripe billing needed a slot too — see stripe-billing.js).
// Dispatched on req.method, which the two never shared before either.
export default async function handler(req, res) {
  applyCors(req, res, 'GET, POST');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') return handleGetOwnCode(req, res);
  if (req.method === 'POST') return handleValidateCode(req, res);
  return res.status(405).json({ error: 'Method not allowed' });
}

// Lets an authenticated coach/admin fetch the current invite code to hand
// out to prospective members, without the code ever living in client
// source. Scoped to the calling coach's OWN gym (multi-tenant foundation,
// 2026-08-10) — a coach at gym B must never see gym A's code.
async function handleGetOwnCode(req, res) {
  const user = await requireUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
  const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, gym_id')
    .eq('user_id', user.id)
    .single();

  if (!profile || !['coach', 'admin'].includes(profile.role)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  if (!profile.gym_id) {
    return res.status(500).json({ error: 'No gym associated with this account' });
  }

  const { data: gym, error } = await supabase
    .from('gyms')
    .select('invite_code')
    .eq('id', profile.gym_id)
    .single();
  if (error || !gym) {
    console.error('[invite] own-code lookup failed', error);
    return res.status(500).json({ error: 'Gym not found' });
  }

  return res.status(200).json({ code: gym.invite_code });
}

// Public on purpose (called before the user has an account/session), but
// only ever reveals a boolean (+ which gym, needed by register() —
// not sensitive, a gym's own invite code already gates who gets this far).
// Uses the service role key because this runs before the caller has a
// session, so `gyms`' own "own gym only" RLS policy would otherwise
// reject the lookup.
async function handleValidateCode(req, res) {
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
    console.error('[invite] validate: SUPABASE_SERVICE_ROLE_KEY not configured');
    return res.status(500).json({ error: 'Not configured' });
  }

  const admin = createClient(process.env.VITE_SUPABASE_URL, serviceRoleKey);
  const { data: gym, error } = await admin
    .from('gyms')
    .select('id')
    .eq('invite_code', code)
    .maybeSingle();
  if (error) console.error('[invite] validate: gyms lookup failed', error);

  return res.status(200).json({ valid: !!gym, gym_id: gym?.id || null });
}
