import { createClient } from '@supabase/supabase-js';
import { applyCors, requireUser } from './_lib/auth.js';

// Lets an authenticated coach/admin fetch the current invite code to hand
// out to prospective members, without the code ever living in client source.
//
// Now reads from `gyms.invite_code` (multi-tenant foundation, 2026-08-10),
// scoped to the calling coach's OWN gym — a coach at gym B must never see
// gym A's code, which the old single-env-var version had no way to prevent.
export default async function handler(req, res) {
  applyCors(req, res, 'GET');
  if (req.method === 'OPTIONS') return res.status(200).end();

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
    console.error('[invite-code] gym lookup failed', error);
    return res.status(500).json({ error: 'Gym not found' });
  }

  return res.status(200).json({ code: gym.invite_code });
}
