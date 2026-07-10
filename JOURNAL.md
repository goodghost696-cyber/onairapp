# Journal de bord — ON AIR

Journal tenu à la fin de chaque session de travail avec Claude. Sert de contexte de reprise pour la session suivante : ce qui a été fait, ce qu'il reste à faire, et un état des lieux honnête de l'app.

Entrées les plus récentes en haut.

---

## 2026-07-10 — Session 1

### Ce qu'on a fait aujourd'hui
- **Fix critique auth/onboarding** (`src/App.jsx`) : la route `/onboarding` ne vérifiait que le flag localStorage `onair_just_registered`, sans vérifier que l'utilisateur était réellement connecté → un visiteur non authentifié pouvait atterrir sur l'onboarding. Corrigé pour exiger flag **+** utilisateur connecté **+** `role === 'member'`. PR #3 créée puis mergée dans `claude/charming-mendel-dj1GQ`.
- **Fix rôle utilisateur non fiable** (`src/context/AuthContext.jsx`) : le rôle était lu uniquement depuis `user_metadata` (peu fiable pour les comptes créés manuellement). Ajout d'un fetch vers la table `profiles` pour récupérer le vrai rôle, avec fallback sur metadata puis `'member'` si le fetch échoue.
- **Fix `Onboarding.jsx handleComplete()`** : générait un email fictif (`prenom@onair.fr`) et un id `Date.now()`, et appelait un `login(profile)` qui n'existe pas dans `AuthContext` (écrasait le vrai user Supabase avec des données localStorage). Corrigé pour utiliser le vrai `id`/`email` du user authentifié et ne s'appuyer que sur `updateUserProfile()`.
- **Investigation "signup ne crée aucun user Supabase Auth"** : ajout de logs explicites (`console.error`/`console.log`) à chaque étape du flux signup (`supabase.js`, `AuthContext.jsx` — `register()`, `updateUserProfile()`, `applySession()`), plus détection des erreurs silencieusement avalées (upserts `profiles`/`objectifs` dont le champ `error` n'était jamais lu). **Piste principale identifiée** : aucune requête `/signup` n'apparaît dans les logs Auth Supabase sur 24h → la requête n'atteint probablement jamais l'API, cohérent avec des env vars `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` absentes ou mal configurées sur l'environnement testé. **Pas encore confirmé/résolu.**
- **Refonte de l'écran Landing** (`src/screens/Landing.jsx`) : remplacement du splash logo auto-redirect (2.8s) par un écran interactif à 2 CTA ("Rejoindre la salle" / "Accès coach") qui pré-sélectionne l'onglet correspondant sur `/login`. Ajout de `src/hooks/useGymConfig.js` (nom/ville/adresse de la salle, configurable via `VITE_GYM_NAME`/`VITE_GYM_CITY`/`VITE_GYM_ADDRESS`, préparant le terrain multi-tenant). CSS ajouté dans `landing.css`.
- **Fix service worker** (`public/sw.js`) : l'ancien SW était cache-first pour tout (y compris la navigation/HTML), sans `skipWaiting()`, sans `activate`, avec un nom de cache statique jamais changé → les navigateurs restaient bloqués indéfiniment sur d'anciennes versions après chaque déploiement. Corrigé : network-first pour la navigation (fallback cache seulement offline), cache-first conservé pour `/assets/*` (hashés par Vite), `skipWaiting()` + `activate` qui purge les vieux caches + `clients.claim()`.
- **Diagnostic "je n'ai pas la dernière version"** : après le fix du SW, le domaine `onairapp.vercel.app` continuait de servir un build vieux de plusieurs jours (contenant même un ancien composant `OnboardingGuard` supprimé depuis longtemps du code, ce qui expliquait une redirection fantôme vers `/onboarding`). Cause réelle trouvée : **le projet Vercel a un mode de déploiement "Staged"** — les déploiements production ne sont pas auto-promus sur le domaine principal, il faut cliquer "Promote to Production" manuellement à chaque fois. L'utilisateur a promu le déploiement `ae10a11` manuellement depuis le dashboard.

### Commits poussés aujourd'hui (branche `claude/charming-mendel-dj1GQ`, sauf mention contraire)
1. `34c37f3` / `7ed4995` (PR #3, mergé en `d15e624`) — auth guard sur `/onboarding`
2. `150622d` — `Onboarding.jsx` utilise le vrai user Supabase
3. `3113223` — logging du flux auth/signup
4. `45d5521` — nouveau Landing (2 CTA)
5. `ae10a11` — fix service worker

### À faire — priorité haute
- [ ] **Confirmer si le signup crée bien des users dans Supabase Auth maintenant.** Retester une inscription complète et lire les nouveaux logs console (ajoutés aujourd'hui) pour voir si `signUp()` est appelé et ce qu'il retourne. Si l'hypothèse "env vars manquantes" se confirme, vérifier/configurer `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` dans Vercel (Project Settings → Environment Variables), pour tous les environnements (Production **et** Preview).
- [ ] **Vérifier si le mode "Staged" de Vercel doit être désactivé.** Sinon, chaque futur déploiement restera bloqué sur l'ancien build tant que quelqu'un ne clique pas "Promote to Production" manuellement. Aller dans Project Settings → Git (ou Deployments) pour trouver l'option et la désactiver si on veut un auto-déploiement classique.
- [ ] **Vérifier en navigation privée** que `onairapp.vercel.app` affiche bien le nouveau Landing après la promotion manuelle d'aujourd'hui (pas encore confirmé par l'utilisateur avant la fin de session).

### À faire — priorité moyenne / autres idées évoquées
- [ ] Toast "Nouvelle version disponible, recharger ?" côté client (écoute de `navigator.serviceWorker` → event `controllerchange`) pour rendre visible la mise à jour auto — proposé à l'utilisateur, pas encore demandé/fait.
- [ ] Nettoyer les logs de debug ajoutés dans `AuthContext.jsx`/`supabase.js` une fois le problème de signup confirmé résolu (ou les garder si utiles, à trancher avec l'utilisateur).

### Bilan / état d'avancement de l'app
Repris de l'audit technique existant (`ETAT_DES_LIEUX.md`, rédigé le 2026-07-08) + mises à jour du jour :

- **Stack** : React 18 + Vite (SPA, pas de SSR), react-router-dom, Supabase (Auth + Postgres), déploiement Vercel, fonctions serverless pour proxy Anthropic/API-Ninjas. Pas de TypeScript, pas de tests.
- **Auth** : réelle via Supabase (email/mdp). Aujourd'hui corrigée pour utiliser le vrai rôle (table `profiles`) au lieu de `user_metadata` seul, et pour ne plus laisser un visiteur non connecté accéder à l'onboarding. **Reste un doute non résolu sur le fonctionnement réel du signup en production** (voir "à faire" ci-dessus) — c'est le point le plus urgent à vérifier à la prochaine session.
- **Données membre** : très majoritairement en `localStorage` (nutrition, séances, hydratation, sommeil, pas) — les tables SQL `repas`/`seances`/`activite_jour` existent mais ne sont jamais utilisées par le code. `profiles` et `objectifs` sont les deux seules tables réellement écrites.
- **Espace Coach** : historiquement 100% mocké (`MOCK_MEMBERS`) — à vérifier si le commit "Connect CoachDashboard and ClientsList to real Supabase profiles" (visible dans l'historique Vercel, antérieur à cette session) est bien fonctionnel ; pas audité aujourd'hui.
- **Landing / onboarding / auth** : refaits/corrigés aujourd'hui, cohérents avec le nouveau design validé.
- **Service worker / mise à jour de l'app** : corrigé aujourd'hui, ne devrait plus jamais bloquer les utilisateurs sur une ancienne version après un déploiement (sous réserve que "Staged" soit aussi désactivé côté Vercel, sinon le problème peut se reproduire sous une autre forme).
- **Dette technique structurante** (non traitée aujourd'hui, toujours d'actualité) : pas de notion de tenant/salle (`gym_id`) dans le schéma, pas de lien coach↔membres en base, code d'invitation `ONAIR2026` codé en dur, pas de flow de création de compte coach en self-service. Voir `ETAT_DES_LIEUX.md` pour le détail complet.

### Notes techniques utiles pour la prochaine session
- Branche de dev/prod : `claude/charming-mendel-dj1GQ` (c'est aussi la branche que Vercel déploie en production).
- Projet Supabase : `wdwdigqxqctkverkbxyb` (région eu-west-1).
- Projet Vercel : `prj_L471Fry411QBM6vxcv9oo4JRSzm8`, équipe `team_wMcBlfAFn8HgOcSNdYEnprfi`, domaine principal `onairapp.vercel.app`.
- Le projet a un mode de promotion manuelle ("Staged") — y penser si "la dernière version n'apparaît pas" revient.
