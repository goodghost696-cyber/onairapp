import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { fetchConsentState, setCoachDataConsent } from '../utils/consent'

// Recueil du consentement au partage de données avec le coach.
//
// Un SEUL composant couvre les deux cas demandés, plutôt qu'un écran dans le
// formulaire d'inscription + un rattrapage séparé :
//   1. nouveau membre qui vient de rejoindre une salle (le rattachement se
//      fait uniquement au signup via code d'invitation — vérifié dans
//      Login.jsx -> register() -> /api/invite, c'est le seul chemin) ;
//   2. les 3 comptes déjà rattachés avant l'existence de ce dispositif, qui
//      doivent trancher à leur prochaine connexion plutôt que se voir
//      attribuer un consentement présumé.
// Dans les deux cas la condition est la même : le membre a une salle et n'a
// jamais fait de choix (`coach_data_consent_at IS NULL`). Un seul chemin,
// donc aucun parcours ne peut y échapper — ce qui n'aurait pas été garanti
// avec une case ajoutée au formulaire d'inscription.
//
// Non refermable tant que le choix n'est pas fait : pas de croix, pas de
// fermeture au clic sur le fond, pas d'échappement. Refuser est possible et
// s'enregistre comme un vrai choix (voir setCoachDataConsent).
export default function CoachConsentGate() {
  const { user } = useAuth()
  const [needed, setNeeded] = useState(false)
  const [checked, setChecked] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user?.id) return
    let cancelled = false
    fetchConsentState(user.id).then(state => {
      if (cancelled || !state) return
      setNeeded(state.hasCoach && !state.hasDecided)
    })
    return () => { cancelled = true }
  }, [user?.id])

  async function submit() {
    setSaving(true)
    setError('')
    const { success } = await setCoachDataConsent(user.id, checked)
    setSaving(false)
    if (success) {
      setNeeded(false)
    } else {
      // On ne referme surtout pas sur un échec d'écriture : sinon le membre
      // croirait avoir répondu alors que rien n'est enregistré, et la
      // question reviendrait au prochain lancement sans explication.
      setError("Impossible d'enregistrer ton choix — réessaie dans un instant.")
    }
  }

  if (!needed) return null

  return (
    <>
      <div className="consent-overlay" />
      <div className="consent-sheet" role="dialog" aria-modal="true" aria-labelledby="consent-title">
        <h2 id="consent-title" className="consent-title">Partager mes données avec mon coach</h2>

        <p className="consent-body">
          En activant cette option, vous acceptez que votre coach ait accès à vos
          données de nutrition, poids, activité, sommeil et entraînement
          enregistrées dans l'application, dans le cadre de votre suivi.
        </p>
        <p className="consent-body">
          Vous pouvez retirer cet accès à tout moment depuis vos réglages.
        </p>

        <label className="consent-checkbox-row">
          <input
            type="checkbox"
            checked={checked}
            onChange={e => setChecked(e.target.checked)}
          />
          <span>J'accepte que mon coach accède à mes données de suivi</span>
        </label>

        {error && <p className="consent-error">{error}</p>}

        {/* Un seul bouton de validation, qui enregistre le choix TEL QU'IL EST
            — coché ou non. C'est ce qui en fait un vrai opt-in : ne rien
            faire n'accorde rien, et refuser est un geste aussi simple
            qu'accepter. */}
        <button className="consent-submit" onClick={submit} disabled={saving}>
          {saving ? '...' : checked ? 'Valider et partager' : 'Valider sans partager'}
        </button>
      </div>
    </>
  )
}
