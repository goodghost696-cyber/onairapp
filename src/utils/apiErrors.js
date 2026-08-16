// Pendant de mapAuthError (utils/authErrors.js), pour les erreurs qui
// viennent des routes /api/* et du réseau plutôt que de Supabase Auth.
//
// Le problème constaté en Phase 3 : les écrans IA (Nutrition, Scan)
// affichaient `Erreur : ${err.message}` tel quel. Or `api/claude.js` renvoie
// ses erreurs en ANGLAIS et en langage technique — « Too many requests, try
// again shortly », « Quota exceeded », « Unauthorized », « API key not
// configured », voire le message brut renvoyé par l'API Anthropic. Un membre
// qui atteignait simplement le plafond IA de sa salle voyait donc un message
// anglais incompréhensible, dans une app par ailleurs entièrement en
// français.
//
// Choix de conception : on ne traduit QUE ce qu'on reconnaît, et tout le
// reste passe tel quel. L'app lève elle-même beaucoup de messages déjà en
// français (« Réponse incomplète, réessaie », « Aucune recette valide
// générée, réessaie »…) qu'il serait absurde de remplacer par un message
// générique. L'inverse — tout remplacer sauf une liste blanche — ferait
// perdre ces messages utiles.
const RULES = [
  { test: /failed to fetch|networkerror|network request failed|load failed/i, fr: 'Connexion impossible — vérifie ta connexion internet.' },
  { test: /quota exceeded|quota/i, fr: "La limite d'utilisation de l'IA de ta salle est atteinte. Réessaie plus tard." },
  { test: /too many requests|rate limit/i, fr: 'Trop de demandes coup sur coup — réessaie dans quelques instants.' },
  { test: /unauthorized|not authenticated/i, fr: 'Session expirée — reconnecte-toi.' },
  { test: /api key not configured|not configured/i, fr: 'Service temporairement indisponible. Réessaie plus tard.' },
  { test: /unsupported model|max_tokens/i, fr: 'Service temporairement indisponible. Réessaie plus tard.' },
  // « HTTP 500 », « HTTP 502 »… : jamais un message destiné à un utilisateur.
  { test: /^HTTP \d{3}$/i, fr: 'Service temporairement indisponible. Réessaie plus tard.' },
  { test: /anthropic error|api error|api unavailable/i, fr: 'Service temporairement indisponible. Réessaie plus tard.' },
]

export function mapApiError(error, fallback = 'Une erreur est survenue. Réessaie dans un instant.') {
  const message = (error?.message || (typeof error === 'string' ? error : '') || '').trim()
  if (!message) return fallback
  const rule = RULES.find(r => r.test.test(message))
  return rule ? rule.fr : message
}
