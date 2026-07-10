import { createClient } from '@supabase/supabase-js';
import { applyCors, requireUser } from './_lib/auth.js';

// Lets an authenticated coach/admin fetch the current invite code to hand
// out to prospective members, without the code ever living in client source.
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
    .select('role')
    .eq('user_id', user.id)
    .single();

  if (!profile || !['coach', 'admin'].includes(profile.role)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  return res.status(200).json({ code: process.env.INVITE_CODE || 'ONAIR2026' });
}
