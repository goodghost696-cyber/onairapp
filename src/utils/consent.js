import { supabase } from '../lib/supabase'

// Consentement du membre au partage de ses données de suivi avec le coach de
// sa salle (chantier juridique, JOURNAL.md 2026-08-16 puis 2026-08-17).
//
// Le vrai verrou est en RLS (migration coach_data_consent_optin) : sans
// consentement, les policies coach ne renvoient tout simplement rien sur
// profiles/repas/activite_jour/seances/objectifs. Ce module ne fait que
// lire et écrire le drapeau — il ne protège rien par lui-même, et ne doit
// jamais devenir le seul endroit où la règle est appliquée.

// `coach_data_consent_at` sert à distinguer trois états, là où le booléen
// seul n'en distingue que deux :
//   - at NULL                    -> le membre n'a JAMAIS fait de choix
//   - at renseigné + consent true  -> a accepté
//   - at renseigné + consent false -> a refusé, ou a retiré son accord
// C'est cette distinction qui permet de ne relancer que ceux qui n'ont
// jamais tranché, sans harceler ceux qui ont dit non en connaissance de
// cause.
export async function fetchConsentState(userId) {
  if (!userId) return null
  const { data, error } = await supabase
    .from('profiles')
    .select('gym_id, role, coach_data_consent, coach_data_consent_at')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) {
    console.error('[consent] fetchConsentState failed', error)
    return null
  }
  if (!data) return null
  return {
    // Pas de salle = pas de coach = rien à partager, donc rien à demander.
    hasCoach: !!data.gym_id && data.role === 'member',
    consent: !!data.coach_data_consent,
    decidedAt: data.coach_data_consent_at,
    hasDecided: data.coach_data_consent_at != null,
  }
}

// Un refus s'enregistre aussi (consent=false + horodatage) : c'est un choix
// explicite, pas une absence de réponse. Sans ça, refuser reviendrait à
// revoir la demande à chaque ouverture de l'app.
export async function setCoachDataConsent(userId, accepted) {
  if (!userId) return { success: false }
  const { error } = await supabase
    .from('profiles')
    .update({
      coach_data_consent: !!accepted,
      coach_data_consent_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
  if (error) {
    console.error('[consent] setCoachDataConsent failed', error)
    return { success: false, error }
  }
  return { success: true }
}
