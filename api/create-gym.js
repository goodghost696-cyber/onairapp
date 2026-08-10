import { createClient } from '@supabase/supabase-js';
import { applyCors, requireUser } from './_lib/auth.js';
import { checkRateLimit } from './_lib/rateLimit.js';

// Self-service coach/gym signup — the missing piece flagged in JOURNAL.md
// after the multi-tenant foundation (gyms table, gym_id, RLS rescoping):
// until now, a new gym could only exist by Arnaud creating it by hand in
// the SQL editor. A new coach signs up (CoachSignup.jsx calls
// supabase.auth.signUp() directly, same primitive as member registration),
// then hits this endpoint with the fresh session to create their gym and
// become its coach.
//
// Runs on service_role on purpose: profiles.role is protected by a column
// GRANT allowlist + trg_prevent_self_role_escalation (see
// supabase_schema.sql) specifically so a normal authenticated client can
// NEVER set role='coach' on themselves — that trigger only fires for
// auth.role() = 'authenticated', not service_role, so this elevated path
// is the intentional, narrow exception, not a bypass of that protection.
export default async function handler(req, res) {
  applyCors(req, res, 'POST');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const user = await requireUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  // Destructive-ish/one-shot action (creates a real tenant), same posture
  // as delete-account.js's rate limit.
  const rateLimit = await checkRateLimit(req, 'create-gym', { max: 3, windowMs: 10 * 60 * 1000 });
  if (!rateLimit.ok) return res.status(rateLimit.status).json({ error: 'Too many requests, try again shortly' });

  const { gymName, firstName } = req.body || {};
  const name = (gymName || '').trim();
  if (!name || name.length < 2 || name.length > 80) {
    return res.status(400).json({ error: 'Nom de salle invalide' });
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    console.error('[create-gym] SUPABASE_SERVICE_ROLE_KEY not configured');
    return res.status(500).json({ error: 'Not configured' });
  }
  const admin = createClient(process.env.VITE_SUPABASE_URL, serviceRoleKey);

  // Only ever for a genuinely fresh account — blocks an existing member or
  // coach from calling this later to spin up a second gym and re-attach
  // themselves to it, the same "single-shot, right after signUp()" posture
  // register() already has for member profiles.
  //
  // Tolerates one specific race: AuthContext's resolveRole() self-heals a
  // missing profile row the instant a session goes active (which signUp()
  // itself triggers, client-side, before this endpoint even runs) — that
  // self-heal never sets role or gym_id, so a blank shell profile can
  // legitimately exist here already. Only reject if the existing profile
  // is a REAL member/coach (already has a role or a gym) — a blank shell
  // gets overwritten by the upsert below instead of blocking signup.
  const { data: existingProfile } = await admin
    .from('profiles')
    .select('user_id, role, gym_id')
    .eq('user_id', user.id)
    .maybeSingle();
  if (existingProfile && (existingProfile.gym_id || existingProfile.role !== 'member')) {
    return res.status(409).json({ error: 'Ce compte a déjà un profil' });
  }

  // Random 8-char code, retried on the rare unique-constraint collision
  // rather than trying to guarantee uniqueness up front.
  function generateCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no O/0/I/1, easy to read aloud
    let code = '';
    for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
  }

  // 14-day free trial from creation — see JOURNAL.md 2026-08-10 for the
  // business decision (fixed monthly price per gym, coach access blocked
  // on expiry, members keep theirs). Just a constant: change the "14" here
  // if the real number ever needs to move.
  const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

  let gym = null;
  for (let attempt = 0; attempt < 5 && !gym; attempt++) {
    const { data, error } = await admin
      .from('gyms')
      .insert({ name, invite_code: generateCode(), trial_ends_at: trialEndsAt })
      .select('id, name, invite_code, trial_ends_at')
      .single();
    if (!error) { gym = data; break; }
    // 23505 = unique_violation (invite_code collision) — retry with a new
    // code. Any other error is real, don't loop on it.
    if (error.code !== '23505') {
      console.error('[create-gym] gyms insert failed', error);
      return res.status(500).json({ error: "Erreur lors de la création de la salle" });
    }
  }
  if (!gym) {
    console.error('[create-gym] exhausted retries generating a unique invite_code');
    return res.status(500).json({ error: "Erreur lors de la création de la salle" });
  }

  const { error: profileError } = await admin.from('profiles').upsert({
    user_id: user.id,
    prenom: firstName || null,
    email: user.email,
    role: 'coach',
    gym_id: gym.id,
  }, { onConflict: 'user_id' });

  if (profileError) {
    console.error('[create-gym] profile upsert failed', profileError);
    // Best-effort rollback so a half-created gym doesn't linger with no
    // coach attached — not wrapped in a real transaction (two separate
    // REST calls), but this is the failure path, worth trying.
    await admin.from('gyms').delete().eq('id', gym.id);
    return res.status(500).json({ error: 'Erreur lors de la création du profil coach' });
  }

  return res.status(200).json({ success: true, gym });
}
