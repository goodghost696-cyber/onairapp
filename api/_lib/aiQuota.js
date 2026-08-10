import { createClient } from '@supabase/supabase-js';

// Plafond de coût IA — point 03 de l'audit du 2026-08-10.
//
// Le limiteur de rafale (rateLimit.js) empêche un utilisateur de marteler
// l'API sur quelques minutes. Il ne dit rien du budget : 15 appels/5min
// PAR utilisateur, c'est plusieurs milliers d'appels/mois pour une salle de
// 200 membres, sans aucune borne. Avec un abonnement mensuel FIXE par
// salle, le revenu est plat et le coût variable — une grosse salle peut
// coûter plus qu'elle ne rapporte. C'est ce trou-là que ce module ferme.
//
// Deux niveaux :
//   1. quota mensuel par salle (gyms.ai_quota_calls, NULL = illimité)
//   2. plafond plateforme, filet volontairement généreux contre
//      l'emballement (fuite, boucle, abus) — pas un frein au quotidien.
//
// Compté en APPELS parce que c'est ce qu'on peut expliquer à un coach
// ("2000 requêtes IA/mois"). Les tokens réels sont enregistrés à part, pour
// pouvoir recalibrer le quota sur le coût constaté.

const GLOBAL_MONTHLY_CALL_CAP = Number(process.env.AI_GLOBAL_MONTHLY_CALL_CAP || 50000);

function clientFor(req) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
  if (!token) return null;
  return createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}

// Vérifie ET consomme atomiquement (une seule RPC, verrou de ligne côté
// Postgres) : deux appels simultanés ne peuvent pas passer tous les deux
// au-dessus du quota.
export async function consumeAiQuota(req) {
  const supabase = clientFor(req);
  if (!supabase) return { ok: false, status: 401 };

  const { data, error } = await supabase.rpc('consume_ai_quota', {
    p_global_cap: Number.isFinite(GLOBAL_MONTHLY_CALL_CAP) ? GLOBAL_MONTHLY_CALL_CAP : null,
  });

  if (error) {
    // Fail-open délibéré, comme le limiteur de rafale : une panne du
    // compteur ne doit pas couper l'IA à des salles qui paient. Le risque
    // est borné (les pannes Supabase sont rares et courtes) et le vrai
    // garde-fou reste la visibilité — d'où le log explicite.
    console.error('[aiQuota] consume failed, allowing request', error);
    return { ok: true, degraded: true };
  }

  if (data?.allowed) return { ok: true, used: data.used, quota: data.quota };

  if (data?.reason === 'global_cap') {
    console.error('[aiQuota] PLAFOND PLATEFORME ATTEINT — toutes les salles sont bloquées');
    return {
      ok: false,
      status: 429,
      error: "Le service IA est temporairement saturé. Réessaie plus tard.",
    };
  }

  return {
    ok: false,
    status: 429,
    error: `Quota IA mensuel de la salle atteint (${data?.used}/${data?.quota}). Il se réinitialise le 1er du mois prochain.`,
  };
}

// Appelée après la réponse d'Anthropic : le coût réel n'est connu qu'à ce
// moment-là. Ne fait jamais échouer la requête — l'utilisateur a déjà sa
// réponse, ce serait absurde de la lui refuser parce que la comptabilité
// a raté.
export async function recordAiTokens(req, usage) {
  if (!usage) return;
  const supabase = clientFor(req);
  if (!supabase) return;
  const { error } = await supabase.rpc('record_ai_tokens', {
    p_input: usage.input_tokens || 0,
    p_output: usage.output_tokens || 0,
  });
  if (error) console.error('[aiQuota] record tokens failed', error);
}
