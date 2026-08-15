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

  // Pré-filtre (PAS la garantie) — évite de créer une salle pour rien dans le
  // cas courant. La garantie réelle est le claim atomique plus bas : ce
  // read-then-write est un TOCTOU, confirmé par test réel le 2026-08-16 (deux
  // POST concurrents avec le même token frais -> 200 tous les deux, DEUX salles
  // créées, dont une orpheline avec son propre code d'invitation et son propre
  // essai de 14 jours). Ce n'est pas un scénario théorique : à chaque
  // inscription coach, CoachSignup.jsx et le self-heal de resolveRole()
  // (AuthContext.jsx) appellent tous les deux cet endpoint quasi simultanément.
  //
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

  // Claim atomique du profil — c'est LUI qui tranche entre deux appels
  // concurrents, pas la lecture ci-dessus.
  //
  // Chemin 1 (compte tout frais, aucune ligne) : INSERT. La contrainte UNIQUE
  // (user_id) fait perdre le second appelant en 23505, qui bascule alors sur
  // le chemin 2 et se fait refuser par ses conditions.
  //
  // Chemin 2 (ligne coquille déjà créée par le self-heal de resolveRole) :
  // UPDATE conditionné à `gym_id is null AND role = 'member'` — sous READ
  // COMMITTED, le second UPDATE attend le premier puis ré-évalue son WHERE sur
  // la version à jour de la ligne, y voit gym_id/role déjà posés, et met à
  // jour 0 ligne. Un seul gagnant possible.
  const claimFields = {
    prenom: firstName || null,
    email: user.email,
    role: 'coach',
    gym_id: gym.id,
  };

  let claimed = false;
  let writeFailed = false;
  const { error: insertError } = await admin
    .from('profiles')
    .insert({ user_id: user.id, ...claimFields });
  if (!insertError) {
    claimed = true;
  } else if (insertError.code === '23505') {
    const { data: updatedRows, error: updateError } = await admin
      .from('profiles')
      .update(claimFields)
      .eq('user_id', user.id)
      .is('gym_id', null)
      .eq('role', 'member')
      .select('user_id');
    if (updateError) {
      console.error('[create-gym] profile claim update failed', updateError);
      writeFailed = true;
    } else {
      claimed = updatedRows && updatedRows.length > 0;
    }
  } else {
    console.error('[create-gym] profile claim insert failed', insertError);
    writeFailed = true;
  }

  if (!claimed) {
    // Salle créée mais profil non revendiqué : soit un appel concurrent a
    // gagné, soit une vraie erreur d'écriture. Dans les deux cas la salle qu'on
    // vient de créer est orpheline — on la supprime plutôt que de la laisser
    // traîner avec son code d'invitation (best-effort : deux appels REST
    // distincts, pas une vraie transaction, mais c'est le chemin d'échec).
    await admin.from('gyms').delete().eq('id', gym.id);
    return writeFailed
      ? res.status(500).json({ error: 'Erreur lors de la création du profil coach' })
      : res.status(409).json({ error: 'Ce compte a déjà un profil' });
  }

  return res.status(200).json({ success: true, gym });
}
