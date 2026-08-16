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

  // La photo de profil, elle, ne part PAS avec le compte : storage.objects
  // n'a aucune clé étrangère vers auth.users (juste une colonne `owner` en
  // uuid nu), donc aucune cascade ne l'atteint. Mesuré en test réel le
  // 2026-08-16 : après un delete-account renvoyant 200 et un auth.users
  // bien supprimé, le fichier restait dans le bucket ET restait servi
  // publiquement en HTTP 200 (la policy SELECT du bucket `avatars` est
  // `bucket_id = 'avatars'`, sans contrôle de propriétaire). L'écran de
  // confirmation promet pourtant « Toutes tes données seront effacées pour
  // toujours ». Il n'existe par ailleurs AUCUNE policy DELETE sur
  // storage.objects — un client authentifié ne peut donc pas nettoyer
  // derrière lui, seul ce chemin service_role le peut.
  //
  // Fait AVANT la suppression du compte, à dessein : si ça échoue, on
  // s'arrête et le compte existe toujours, donc l'utilisateur peut
  // réessayer. Dans l'ordre inverse, un échec ici laisserait un fichier
  // orphelin que plus rien ne rattache à personne.
  const { data: avatarFiles, error: listError } = await admin.storage.from('avatars').list(user.id);
  if (listError) {
    console.error('[delete-account] avatar list failed', listError);
    return res.status(500).json({ error: 'Deletion failed, try again' });
  }
  if (avatarFiles?.length) {
    const paths = avatarFiles.map(f => `${user.id}/${f.name}`);
    const { error: removeError } = await admin.storage.from('avatars').remove(paths);
    if (removeError) {
      console.error('[delete-account] avatar remove failed', removeError);
      return res.status(500).json({ error: 'Deletion failed, try again' });
    }
  }

  const { error } = await admin.auth.admin.deleteUser(user.id);

  if (error) {
    console.error('[delete-account] deleteUser failed', error);
    return res.status(500).json({ error: 'Deletion failed, try again' });
  }

  return res.status(200).json({ success: true });
}
