// Traduit les erreurs brutes de Supabase Auth (toujours en anglais, souvent
// trop techniques pour un utilisateur final) vers un message FR clair.
//
// Audit JOURNAL.md : les 4 endroits du flux auth (Login.jsx ×3,
// ResetPassword.jsx ×1) faisaient tous `result.error || fallbackFR`, où
// `result.error` vient de `error.message` (AuthContext.jsx) — cette chaîne
// n'est jamais vide dès qu'il y a une erreur, donc le fallback FR ne se
// déclenchait jamais et le message brut Supabase s'affichait tel quel.
//
// Mapping par mot-clé plutôt que par code exact : Supabase ne garantit pas
// un `error.code` stable et exploitable depuis le client sur toutes les
// versions du SDK — seul `error.message` est fiable à matcher ici.
const RULES = [
  { test: /invalid login credentials/i, fr: 'Email ou mot de passe incorrect.' },
  { test: /user already registered|already registered/i, fr: 'Un compte existe déjà avec cet email — connecte-toi plutôt.' },
  { test: /email not confirmed/i, fr: 'Confirme ton email avant de te connecter (vérifie ta boîte mail).' },
  { test: /rate limit|too many requests/i, fr: 'Trop de tentatives — réessaie dans quelques minutes.' },
  { test: /password.*(at least|should be|weak|characters)/i, fr: 'Mot de passe trop court ou trop faible (6 caractères minimum).' },
  { test: /user not found/i, fr: 'Aucun compte ne correspond à cet email.' },
  { test: /failed to fetch|network|fetch/i, fr: 'Connexion impossible — vérifie ta connexion internet.' },
]

export function mapAuthError(error) {
  const message = error?.message || (typeof error === 'string' ? error : '') || ''
  const rule = RULES.find(r => r.test.test(message))
  return rule ? rule.fr : 'Une erreur est survenue. Réessaie dans un instant.'
}
