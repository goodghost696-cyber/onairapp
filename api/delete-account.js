import { createClient } from '@supabase/supabase-js';
import { applyCors, requireUser } from './_lib/auth.js';
import { checkRateLimit } from './_lib/rateLimit.js';

// Permanently deletes the CALLER's own account — never anyone else's.
// requireUser() resolves the caller's identity from their own bearer token
// only, so there is no way to pass a different user id in here; deleting
// auth.users cascades (on delete cascade, see supabase_schema.sql) through
// every table that references it — profiles, repas, activite_jour,
// seances, objectifs, push_subscriptions, etc. — so this one call is
// enough to erase all of a member's or coach's data, not just their login.
export default async function handler(req, res) {
  applyCors(req, res, 'POST');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const user = await requireUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  // Cheap deterrent against a buggy client retry-looping this — it's a
  // one-shot destructive action, not something anyone legitimately calls
  // more than once in a row.
  const rateLimit = await checkRateLimit(req, 'delete-account', { max: 3, windowMs: 10 * 60 * 1000 });
  if (!rateLimit.ok) return res.status(rateLimit.status).json({ error: 'Too many requests, try again shortly' });

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    console.error('[delete-account] SUPABASE_SERVICE_ROLE_KEY not configured');
    return res.status(500).json({ error: 'Not configured' });
  }

  const admin = createClient(process.env.VITE_SUPABASE_URL, serviceRoleKey);
  const { error } = await admin.auth.admin.deleteUser(user.id);

  if (error) {
    console.error('[delete-account] deleteUser failed', error);
    return res.status(500).json({ error: 'Deletion failed, try again' });
  }

  return res.status(200).json({ success: true });
}
