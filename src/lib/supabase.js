import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('[Supabase] Missing env vars at client init', {
    VITE_SUPABASE_URL: supabaseUrl ? 'set' : 'undefined',
    VITE_SUPABASE_ANON_KEY: supabaseAnonKey ? 'set' : 'undefined',
  })
}

export const supabase = createClient(
  supabaseUrl || '',
  supabaseAnonKey || ''
)

// Écrit sur SA PROPRE ligne `profiles` sans jamais passer par upsert().
//
// Pourquoi : PostgREST traduit un upsert en `INSERT ... ON CONFLICT DO UPDATE
// SET <toutes les colonnes du payload>` — clé de conflit `user_id` comprise.
// Or `user_id` n'est délibérément PAS dans l'allowlist de colonnes UPDATE de
// `profiles` (migration 20260717095610, re-posée le 2026-08-16 après l'escalade
// de privilèges) : Postgres exige donc UPDATE(user_id) et refuse la requête
// entière en 42501 « permission denied for table profiles », AVANT toute
// évaluation RLS. Résultat mesuré en test réel le 2026-08-16 : les trois
// upserts profiles du client échouaient à 100% (nouveau membre enregistré sans
// prénom ni email, édition du profil sans effet). Élargir le GRANT à
// `user_id` rouvrirait exactement le trou que cette allowlist existe pour
// fermer — on corrige donc côté client.
//
// UPDATE d'abord (ne touche que des colonnes autorisées), INSERT seulement si
// aucune ligne n'existe. Le 23505 est un cas réel, pas théorique : register()
// et le self-heal de resolveRole() écrivent vraiment en concurrence à
// l'inscription.
export async function upsertOwnProfile(userId, fields) {
  const payload = Object.fromEntries(
    Object.entries(fields).filter(([, value]) => value !== undefined)
  )
  if (Object.keys(payload).length === 0) return { error: null }

  const { data, error } = await supabase
    .from('profiles')
    .update(payload)
    .eq('user_id', userId)
    .select('user_id')
  if (error) return { error }
  if (data && data.length > 0) return { error: null }

  const { error: insertError } = await supabase
    .from('profiles')
    .insert({ user_id: userId, ...payload })
  if (insertError && insertError.code === '23505') {
    const { error: retryError } = await supabase
      .from('profiles')
      .update(payload)
      .eq('user_id', userId)
    return { error: retryError }
  }
  return { error: insertError }
}

// Attaches the current user's Supabase access token so our /api/* proxies
// (claude, exercises, quote) can verify the caller before spending API budget.
export async function authHeader() {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}
}
