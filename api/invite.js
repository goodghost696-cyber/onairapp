import { createClient } from '@supabase/supabase-js';
import { applyCors, requireUser } from './_lib/auth.js';
import { checkMemoryRateLimit, checkRateLimit } from './_lib/rateLimit.js';

// Three call shapes on one file/path — kept under Vercel Hobby's 12-
// Serverless-Functions-per-deployment cap (see stripe-billing.js for the
// same reasoning; this repo sits exactly at that cap).
export default async function handler(req, res) {
  applyCors(req, res, 'GET, POST');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') return handleGetOwnCode(req, res);
  if (req.method === 'POST') return handlePost(req, res);
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

// Two very different POST calls share this path — distinguished by whether
// the caller has a session, which naturally matches the two real call
// sites: Login.jsx calls this BEFORE supabase.auth.signUp() (no session
// yet, just to show "code invalide" without creating an account), then
// AuthContext.register() calls it again AFTER signUp() succeeds (now
// authenticated) to actually join the gym.
async function handlePost(req, res) {
  const user = await requireUser(req);
  if (user) return handleCompleteSignup(req, res, user);
  return handleValidateCode(req, res);
}

// Public on purpose (called before the user has an account/session) — pure
// UX feedback ("code invalide"), no longer the thing that actually grants
// gym membership (see handleCompleteSignup below, 2026-08-10 suite 90:
// a client-supplied gym_id was trusted here before, closed now).
async function handleValidateCode(req, res) {
  const ip = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
  if (!checkMemoryRateLimit(`validate-invite:${ip}`, { max: 10, windowMs: 5 * 60 * 1000 })) {
    return res.status(429).json({ error: 'Too many attempts, try again shortly' });
  }

  const { code } = req.body || {};
  if (!code) return res.status(200).json({ valid: false });

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

  return res.status(200).json({ valid: !!gym });
}

// The actual gym-join, moved server-side (2026-08-10 suite 90) to close a
// real gap: register()'s old client-side profile upsert set gym_id
// straight from a value the client controlled — nothing stopped a raw
// REST insert with an arbitrary gym_id. Now gym_id is re-resolved from the
// code HERE, service_role, never trusting anything the client claims about
// which gym it validated earlier. One-shot like create-gym.js: only ever
// assigns gym_id to a profile that doesn't already have one, so an
// existing member/coach can't use this to hop gyms just by learning a code.
async function handleCompleteSignup(req, res, user) {
  const rateLimit = await checkRateLimit(req, 'complete-signup', { max: 5, windowMs: 10 * 60 * 1000 });
  if (!rateLimit.ok) return res.status(rateLimit.status).json({ error: 'Too many requests, try again shortly' });

  const { code } = req.body || {};
  if (!code) return res.status(400).json({ error: 'Code manquant' });

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    console.error('[invite] complete-signup: SUPABASE_SERVICE_ROLE_KEY not configured');
    return res.status(500).json({ error: 'Not configured' });
  }
  const admin = createClient(process.env.VITE_SUPABASE_URL, serviceRoleKey);

  const { data: existingProfile } = await admin.from('profiles').select('gym_id').eq('user_id', user.id).maybeSingle();
  if (existingProfile?.gym_id) {
    return res.status(409).json({ error: 'Ce compte est déjà rattaché à une salle' });
  }

  const { data: gym, error: gymError } = await admin.from('gyms').select('id').eq('invite_code', code).maybeSingle();
  if (gymError) console.error('[invite] complete-signup: gyms lookup failed', gymError);
  if (!gym) return res.status(400).json({ error: 'Code invalide' });

  const { error: upsertError } = await admin.from('profiles').upsert({
    user_id: user.id,
    gym_id: gym.id,
  }, { onConflict: 'user_id' });
  if (upsertError) {
    console.error('[invite] complete-signup: profile upsert failed', upsertError);
    return res.status(500).json({ error: "Erreur lors du rattachement à la salle" });
  }

  return res.status(200).json({ success: true, gym_id: gym.id });
}
