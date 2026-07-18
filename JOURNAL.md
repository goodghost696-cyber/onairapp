# Journal de bord — ON AIR

Journal tenu à la fin de chaque session de travail avec Claude. Sert de contexte de reprise pour la session suivante : ce qui a été fait, ce qu'il reste à faire, et un état des lieux honnête de l'app.

Entrées les plus récentes en haut.

**Pour reprendre dans une nouvelle session** : ouvre une session sur le repo, branche `claude/charming-mendel-dj1GQ`, et demande à Claude de lire ce fichier avant de continuer — il contient tout l'historique et l'état d'avancement.

## 2026-07-17 — Session 11 : audit sécurité complet (demandé explicitement par l'utilisateur)

Audit mené directement sur la vraie base de prod (Supabase MCP — `list_tables`, `get_advisors`, requêtes `pg_policies`/`information_schema` en lecture) + revue de code de tout `api/*` et des points d'auth côté client. Pas un audit "sur le diff" : tout le périmètre actuel de l'app.

### 🔴 CRITIQUE — trouvé en vérifiant l'état réel de la base (pas juste le code)
**L'élévation de privilèges `profiles.role` closée en Session 3 (2026-07-10) est de nouveau exploitable en prod, là maintenant.** Vérifié par requête directe sur `information_schema.column_privileges` : le rôle Postgres `authenticated` (et même `anon`) a toujours le `GRANT UPDATE` sur la colonne `role` de `public.profiles`, et la policy RLS `"Users can update own profile"` ne restreint que la **ligne** (`auth.uid() = user_id`), pas les colonnes ni les valeurs (pas de `WITH CHECK`). Concrètement : **n'importe quel membre connecté peut s'auto-promouvoir coach ou admin** depuis la console du navigateur (`supabase.from('profiles').update({role:'admin'}).eq('user_id', monId)`), sans dépendre d'aucune UI. Une fois `coach`, la policy `"Coaches can view all profiles"` (via `is_coach()`, qui lit cette même colonne `role`) lui donne un accès en lecture à **tous** les profils (prénom, email, poids, taille, âge) — et l'accès `/coach` côté client suit automatiquement. Le SQL `revoke update (role) on public.profiles from authenticated, anon;` avait été donné et "confirmé exécuté" en Session 3 ; soit il n'a pas pris, soit il a été annulé depuis (peut-être en re-générant des GRANTs par défaut sur la table). Impact aujourd'hui limité à la table `profiles` (les autres tables — `repas`/`seances`/`activite_jour`/`objectifs` — n'ont pas de policy coach-wide, donc pas encore exposées par cette faille), mais c'est déjà une fuite de PII de tous les membres + un accès non autorisé à l'espace coach.
**Pas corrigé pendant cet audit** — je vous laisse valider avant de retoucher la base de prod (voir sprint ci-dessous).

### 🟠 HAUTE
- **`/api/claude` sans aucun garde-fou de coût** : tout membre authentifié (n'importe quel compte derrière le code d'invitation) peut poster n'importe quel `model`/`max_tokens`/`messages` — l'endpoint relaie tel quel vers Anthropic avec la clé API du projet. Pas de limite de débit, pas de plafond sur `max_tokens`, pas de liste de modèles autorisés. Un compte (ou un code d'invitation partagé/fuité) suffit pour faire exploser la facture Anthropic.
- **`/api/validate-invite` sans limite de débit** : endpoint public, non authentifié par nature (avant inscription), qui ne fait qu'une comparaison de chaîne. Rien n'empêche un brute-force scripté du code d'invitation — d'autant plus si `INVITE_CODE` n'a jamais été redéfini dans Vercel et retombe encore sur le fallback `ONAIR2026` déjà exposé publiquement par le passé (à reconfirmer, pas vérifiable depuis le code).
- **`/api/exercises` et `/api/food-search`** : mêmes endpoints tiers (API Ninjas, Open Food Facts) appelés sans limite de débit par utilisateur — impact financier plus faible que Claude mais même absence de garde-fou.

### 🟡 MOYENNE
- **Protection "mot de passe compromis" désactivée sur Supabase Auth** (confirmé via les security advisors Supabase) : les nouveaux mots de passe ne sont pas vérifiés contre la base HaveIBeenPwned. Bascule en un clic dans Supabase → Auth → Policies.
- **Logs de debug avec PII toujours en prod** (`AuthContext.jsx`, fonctions `register()`/`updateUserProfile()`) : `console.log` du profil complet (email, nom, poids, taille, objectifs) à chaque inscription/mise à jour de profil. Pas exploitable à distance, mais c'est la dette de debug de la Session 1 (2026-07-10) jamais nettoyée, comme prévu à l'époque.
- **`scripts/supabase_schema.sql` du repo obsolète par rapport à la vraie base** : ne contient ni la colonne `role`, ni `is_coach()`/la policy coach, ni les colonnes `nutriscore`/`type_repas`/`type` de `repas`, ni l'état réel des GRANTs. Ce fichier ne peut plus servir de source de vérité ni de script de recréation fiable — tous les correctifs appliqués à la main via l'éditeur SQL Supabase (comme celui de la faille critique ci-dessus) vivent uniquement en prod, nulle part dans git.

### 🔵 FAIBLE / INFO
- **`public.is_coach()` exécutable en RPC public** (`/rest/v1/rpc/is_coach`) même en anonyme, signalé par les advisors Supabase. Sans risque réel aujourd'hui (pas de paramètre utilisateur cible, renvoie `false` en anonyme puisque `auth.uid()` est nul), mais surface publique inutile — `revoke execute on function public.is_coach() from anon;` par propreté.
- **Données de santé en `localStorage` en clair** (`onair_profile`, `onair_user`, `onair_calorieGoal` — poids, taille, objectifs). Normal pour une PWA offline-first, bien nettoyé au logout (`AuthContext.logout()` vide déjà toutes les clés `onair_*`), mais reste lisible entre deux sessions sur un appareil partagé si l'utilisateur ne se déconnecte pas explicitement.
- **Points vérifiés sains** : `npm audit` → 0 vulnérabilité de dépendance ; aucun `dangerouslySetInnerHTML`/`eval`/`innerHTML` dans `src/` ; aucune clé API (`ANTHROPIC_API_KEY`, `NINJA_API_KEY`) ni code d'invitation dans le bundle de prod (vérifié directement dans `dist/assets/*.js` après build) ; CORS des endpoints `api/*` correctement restreint par allowlist (pas de wildcard `*`) ; service worker ne cache que les assets statiques et le HTML de navigation, jamais les réponses `/api/*`.

### Sprint sécurité 1 — urgent (bloque avant tout autre chantier)
- [x] **(2026-07-17) Faille `profiles.role` refermée, cette fois avec la vraie cause corrigée.** La cause racine de la récidive : un `REVOKE UPDATE (role)` ciblé sur une seule colonne **ne l'emporte jamais sur un GRANT UPDATE posé au niveau de toute la table** — et `authenticated`/`anon` avaient bien un grant table-entière sur `profiles` (probablement le grant par défaut que Supabase pose à la création de toute nouvelle table). C'est pour ça que le fix de la Session 3 n'a jamais vraiment tenu, malgré le "Success" affiché dans l'éditeur SQL à l'époque. Corrigé en 2 temps :
  1. `revoke update on public.profiles from authenticated, anon;` (retire le grant large) puis `grant update (prenom, email, poids, taille, age) on public.profiles to authenticated;` (liste blanche explicite des colonnes modifiables — `role`/`id`/`user_id`/`created_at` exclus). Revérifié par requête directe sur `information_schema.column_privileges` : `authenticated` n'a plus aucun privilège `UPDATE` sur `role`, `anon` n'a plus aucun `UPDATE` du tout.
  2. **Défense en profondeur** : trigger `trg_prevent_self_role_escalation` (`BEFORE UPDATE on profiles`) qui bloque tout changement de `role` initié en tant que `authenticated` sauf si l'appelant est déjà `coach`/`admin` — actif même si un futur `grant all on all tables` (réflexe classique de dépannage Supabase) rouvrait le grant par erreur. Ne s'applique pas aux opérations `service_role`/`postgres` (promotion manuelle via l'éditeur SQL toujours possible).
  - Migration appliquée directement en prod (`wdwdigqxqctkverkbxyb`) via le connecteur Supabase, trigger confirmé actif (`tgenabled = 'O'`).
- [x] **(2026-07-17) Variante de la faille trouvée sur `objectifs` et `activite_jour`.** Les 4 tables (`objectifs`, `repas`, `seances`, `activite_jour`) ont le même GRANT table-large `authenticated`/`anon` que `profiles` avait — mais l'impact dépend des policies RLS présentes par table :
  - `repas` et `seances` : **saines**. Aucune policy `UPDATE` n'existe (seulement insert/select/delete), donc RLS bloque tout `UPDATE` par défaut quel que soit le GRANT.
  - `objectifs` et `activite_jour` : policies `UPDATE` présentes mais **sans `WITH CHECK`** — exactement le même trou que `profiles.role` : la clause `USING` ne contrôle que quelle ligne peut être ciblée, pas ce qu'elle devient. Un membre pouvait donc changer le `user_id` de sa propre ligne `objectifs`/`activite_jour` pour la faire passer sous l'identité d'un autre membre — empoisonnement de données possible (objectifs caloriques, pas/sommeil/eau/km d'un autre membre faussés), pas une fuite de lecture. Corrigé par migration (`with check (auth.uid() = user_id)` ajouté aux deux policies `UPDATE`), revérifié par requête directe sur `pg_policies`.
- [x] **(2026-07-17) `/api/claude` plafonné** : `ALLOWED_MODELS` (liste blanche des 2 modèles réellement utilisés côté client — `claude-haiku-4-5-20251001`, `claude-fable-5`, déterminés en grepant tous les appels `/api/claude` du repo) + `MAX_TOKENS_CAP = 1500` (le plus gros usage actuel est 1200, sur `Nutrition.jsx`) rejettent toute requête hors de ces bornes en 400 avant même d'appeler Anthropic. Rate limiting ajouté par-dessus (15 requêtes / 5 min / utilisateur).
- [x] **(2026-07-17) Rate limiting ajouté sur `/api/validate-invite`** (10 tentatives / 5 min / IP, en mémoire — best-effort puisqu'il n'y a pas encore de compte à cette étape, donc pas de scoping par utilisateur possible). La vraie défense reste de configurer un `INVITE_CODE` long et aléatoire dans Vercel plutôt que de compter sur le rate limit seul — **pas vérifié si c'est déjà fait**, à confirmer côté Vercel.
- [x] **(2026-07-17) Infra de rate limiting réutilisable** : nouvelle table `api_rate_limit` (RLS scopée `auth.uid() = user_id`, pas de clé service-role nécessaire — même pattern bearer-token que `api/invite-code.js`) + `api/_lib/rateLimit.js` (`checkRateLimit()` pour les endpoints authentifiés, `checkMemoryRateLimit()` en repli mémoire pour les endpoints publics). Appliqué aussi à `/api/exercises` et `/api/food-search` (60 req / 5 min / utilisateur — usages moins coûteux que Claude, limite volontairement plus large pour ne pas gêner la recherche en direct/le parcours de la bibliothèque d'exercices).
- **Testé en conditions réelles** contre la vraie base de prod (la preview Vercel a la protection SSO activée, donc injoignable en curl direct — testé en appelant `api/claude.js` en local avec un vrai token Supabase à la place, sans `ANTHROPIC_API_KEY` local pour isoler la validation/rate-limit de l'appel Anthropic lui-même) : compte de test jetable créé, requête légitime → passe la validation+auth+rate-limit et échoue proprement sur "API key not configured" (preuve que tout le reste a fonctionné) ; modèle non autorisé → 400 ; `max_tokens` trop grand → 400 ; sans token → 401 ; rafale de 16 requêtes → bloquée pile à la 15ᵉ (429), confirmé aussi par un `select count(*)` direct sur `api_rate_limit` (15 lignes). Compte de test + lignes associées supprimés après coup (`on delete cascade`).

### Sprint sécurité 2 — dette (2026-07-17, 3/4 faits, 1 bloqué)
- [ ] **🔒 "Leaked Password Protection" — BLOQUÉ, pas juste "pas encore fait".** Utilisateur confirmé sur le **plan Supabase Free** (visible dans le dashboard). Cette fonctionnalité (vérification HaveIBeenPwned) est réservée au **plan Pro et supérieur** — l'option n'existe même pas dans l'UI sur Free, ce n'est pas un réglage caché à trouver. Pas contournable par du code (service géré par Supabase). Décision business à prendre par l'utilisateur : upgrade payant vers Pro, ou accepter ce risque résiduel (mots de passe compromis non filtrés à l'inscription — le reste des protections mot de passe, complexité/longueur, reste disponible sur Free si configuré). Laissé ouvert dans le journal comme rappel, pas comme tâche actionnable pour Claude tant que la décision n'est pas prise.
- [x] **Nettoyé les `console.log` de PII dans `AuthContext.jsx`** : supprimé les logs de debug de la Session 1 qui dumpaient l'objet utilisateur/profil complet (email, nom, poids, taille, objectifs) — et un qui dumpait carrément **la session Supabase complète, access token inclus** (`register(): signUp response`), le pire des trois. Les `console.error` sur les vrais échecs (upsert profiles/objectifs, signUp) sont conservés — utiles pour debug en prod, pas de PII qui fuit dedans. `supabase.js` vérifié sain (ne loggue que des booléens).
- [x] **`scripts/supabase_schema.sql` régénéré depuis l'état réel de la prod** (introspection directe — tables/colonnes/contraintes/policies/fonctions/triggers/grants). Contient maintenant `role`, `is_coach()`, le trigger anti-escalade, les `WITH CHECK` sur `objectifs`/`activite_jour`, le grant restreint par colonne sur `profiles`, et la nouvelle table `api_rate_limit`. Commentaires ajoutés pour expliquer *pourquoi* chaque contournement de GRANT/RLS existe (pour ne pas reproduire l'erreur "REVOKE colonne n'annule pas GRANT table" une 3ᵉ fois). Note ajoutée en tête de fichier : tout futur fix SQL appliqué en prod doit être répercuté ici dans le même changement.
- [x] **`revoke execute on function public.is_coach() from anon;`** — **piégé par la même leçon que `profiles.role`** : un revoke ciblé sur `anon` seul n'a rien changé, parce que Postgres accorde `EXECUTE` à `PUBLIC` par défaut sur toute nouvelle fonction, et `anon` en hérite implicitement. Vérifié avec `has_function_privilege('anon', ...)` → toujours `true` après le premier revoke. Corrigé en révoquant depuis `PUBLIC` directement puis en re-accordant explicitement à `authenticated` (nécessaire pour la policy `"Coaches can view all profiles"`). Revérifié : `anon` → `false`, `authenticated` → `true`.

*(Note hors-scope sécurité : les advisors Supabase ont aussi remonté des optimisations de performance RLS — `auth.uid()` réévalué ligne par ligne au lieu de `(select auth.uid())`, policies multiples sur `profiles` — sans impact à l'échelle actuelle (quelques lignes), à revisiter si la base grossit.)*

### Sprint design 1 — direction visuelle (2026-07-17)

**Itération 1 — Shader Landing (abandonnée pour ce projet, code gardé).** Inspiré d'un [ShaderGradient](https://shadergradient.co/customize?animate=on&axesHelper=off&bgColor1=%23000000&bgColor2=%23000000&brightness=1.2&cAzimuthAngle=180&cDistance=3.6&cPolarAngle=90&cameraZoom=1&color1=%23ff5005&color2=%23dbba95&color3=%23d0bce1&destination=onCanvas&embedMode=off&envPreset=city&format=gif&fov=45&frameRate=10&gizmoHelper=hide&grain=on&lightType=3d&pixelDensity=1&positionX=-1.4&positionY=0&positionZ=0&range=disabled&rangeEnd=40&rangeStart=0&reflection=0.1&rotationX=0&rotationY=10&rotationZ=50&shader=defaults&type=plane&uAmplitude=1&uDensity=1.3&uFrequency=5.5&uSpeed=0.4&uStrength=4&uTime=0&wireframe=false) vu en discutant du positionnement face à [bevel.health](https://bevel.health) (comparatif complet en Session 11) : fond noir, plan 3D animé, gradient chaud, grain. Implémenté en shader GLSL custom écrit à la main (`src/components/ShaderBackground.jsx`, ~4kB gzippé, lazy-loadé) plutôt qu'avec `@shadergradient/react`/`three.js` (centaines de kB pour un simple fond animé — le bundle avait déjà un warning >500kB). Testé et validé visuellement (screenshot envoyé, rendu correct après un vrai bug trouvé en testant : `React.StrictMode` double-invoque les effects en dev, et le cleanup forçait `WEBGL_lose_context` avant le second montage réel — corrigé en ne forçant plus la perte de contexte, laissée au garbage collector).
**Puis abandonnée** : l'utilisateur a vu deux autres références (Bevel, PELAGIO orange minimal, puis un style "bold flat" citron/bleu à bordures noires épaisses) et a tranché pour cette 3ᵉ direction. Le fichier `ShaderBackground.jsx` est **gardé dans le repo mais déconnecté de Landing** (plus importé nulle part) — disponible pour un usage futur (autre projet, état de chargement IA) sans repartir de zéro si besoin.

**Itération 2 — Style "bold flat" (en cours).** Cadrage obtenu avant de coder (4 questions posées, réponses de l'utilisateur) :
1. Périmètre : **Landing uniquement** pour l'instant.
2. Fond : **clair** (rupture avec le thème sombre de l'app partout ailleurs — assumé, Landing a sa propre identité visuelle fixe, indépendante du toggle dark/light du reste de l'app).
3. Palette : couleurs ON AIR gardées — fond crème chaud (`#FAF5EE`, nouvelle valeur propre à Landing, pas réutilisation du thème clair existant de l'app qui a une teinte différente), rouge `#bf0603` en accent (joue le rôle du bleu dans la référence), noir quasi pur pour bordures/texte.
4. Éléments repris de la référence (tous demandés) : bordures noires épaisses + ombre décalée façon sticker sur les boutons, typo bold avec glyphe détourné (kicker en `// REPOUSSE`, style commentaire de code), flèches obliques dans les CTA, soulignement noir épais sous le mot-accent du titre.

Premier jet implémenté (`Landing.jsx`, `landing.css` réécrits) et testé — screenshot envoyé à l'utilisateur.

**Retour utilisateur** : palette crème/rouge jugée "trop plate niveau couleur". Testé une variante avec les **vraies couleurs de la référence** (citron vif `#D6FA2E` en fond, bleu indigo `#2A1FE0` en accent — plus de rouge ON AIR du tout, à la demande explicite de l'utilisateur pour "voir"), structure/typo/bordures inchangées. Screenshot envoyé — **retour en attente** : garder ce mix citron/bleu tel quel, réintroduire le rouge ON AIR quelque part, ou autre ajustement de couleur.

---

## 2026-07-16 — Session 10 : suppression circuit map factice + nettoyage Run.jsx mort
- [x] **Circuit map factice retiré de `RunContent.jsx`** (le fichier réellement affiché à l'écran Course) : bloc SVG (tracé de route inventé + point animé) supprimé, ainsi que la constante `CIRCUIT_PATH` devenue inutile.
- [x] **`Run.jsx` (route `/run`) supprimé** : confirmé code mort (aucun `navigate('/run')`/lien nulle part dans l'app), validé avec l'utilisateur avant suppression. Route retirée d'`App.jsx`.
- Build validé (`npm run build`). PR #7 (draft, vers `claude/charming-mendel-dj1GQ`) déployée sur preview Vercel et **validée par l'utilisateur** ("c'est carré") — pas encore mergée.
- **Reste dans le backlog du 07-16** : navigation retour incohérente, lenteur suggestions recette IA, question stratégique fusion coach+IA SaaS.

### ✅ "Mes charges" (`Weekly.jsx`) branché sur les vraies séances
Nouveau `src/utils/liftProgress.js` (`fetchLiftProgress()`) : va chercher les 60 dernières `seances` de l'utilisateur, extrait par exercice la série la plus lourde de chaque séance (`bestSet()` — poids max, ou reps si tout est en poids du corps), et garde les 4 dernières occurrences des 4 exercices les plus pratiqués. Remplace le tableau `liftProgress` codé en dur (Bench Press/Squat/Deadlift/Pull-up fictifs) dans `Weekly.jsx`. Un exercice n'apparaît que s'il a été fait au moins 2 fois (une courbe a besoin d'au moins 2 points ; `LiftCurve` division par `n-1` plantait sinon). État vide ajouté si aucun exercice n'a encore 2 occurrences ("Pas encore assez de séances enregistrées…").
Build validé. **Pas encore testé en conditions réelles** (nécessite plusieurs vraies séances loguées avec le même nom d'exercice pour voir une courbe).

## ⚠️ Comptes de test — ne pas confondre (erreur commise le 2026-07-11, voir plus bas)
- **`goodghost696@gmail.com`** (id `15cdc63c-a54c-462a-bcbe-bd06e83bd437`) — compte de test avec des données d'onboarding **volontairement/accidentellement absurdes** (poids 454kg, taille 545cm) créées très tôt dans les tests. Objectifs corrigés à des valeurs génériques (2400/180/240/80) le 2026-07-11.
- **`arnaudmafuta148@gmail.com`** (id `a66b045c-0086-452d-9c93-808bc002d39b`) — compte de test avec un **vrai onboarding cohérent** (poids 80kg, taille 180cm, objectif "Performance" → 2938 kcal/180P/331G/82L). Compte utilisé pour le rôle admin.

## Idées / à faire — design & UI (liste vivante, pas datée)
- [ ] **Revoir l'UI de la partie Coach** — demandé le 2026-07-10, une fois l'accès coach confirmé fonctionnel. **Mis en pause** (voir "Orientation produit" ci-dessous) au profit du chantier IA côté membre. Pas encore cadré (pas de détails sur ce qui doit changer précisément) — à préciser avec l'utilisateur avant de reprendre.

## Retours utilisateur du 2026-07-16 (test réel de la PR #6) — backlog à trier
- [x] **(2026-07-16) Bug bloquant** : dans Workout, ajouter un exercice à sa séance renvoyait sur l'onglet Musculation/Course au lieu de rester sur la séance en cours (`WorkoutLibrary.jsx` naviguait vers `/workout` au lieu de `/workout/session`). **Corrigé** le jour même.
- [x] **(2026-07-16) Bug trouvé en marge** : dans le "Programme IA" (`Workout.jsx`), le poids suggéré par l'IA pouvait disparaître une fois l'exercice ajouté à la séance — `addExercisesToSession()` (`AppContext.jsx`) faisait `kg: ex.kg || ''`, qui transformait un poids **légitime de 0** (ex. exercice au poids du corps) en chaîne vide à cause du piège classique JS "zéro est falsy". **Corrigé** (`?? ''` au lieu de `|| ''`).
- [x] **(2026-07-16) Validation des données chiffrées dans toute l'app** (sprint 1, item 1) : nouveau `src/utils/validation.js` (bornes par champ : poids, taille, objectifs calories/protéines/eau/pas, pas, eau, km courus, heures de sommeil, grammage). Onboarding bloque désormais "Continuer" avec un message si poids/taille irréalistes ; la sheet d'édition Dashboard, les objectifs/sync santé de Settings, et le grammage dans Nutrition/Scan sont tous bornés.
- [x] **(2026-07-16) Nutrition — modification d'un repas après ajout** (sprint 1, item 2) : `repas` n'ayant pas de policy RLS update (seulement insert/select/delete), implémenté en "supprimer puis ré-ajouter" plutôt qu'une édition en place — nouveau `deleteMeal()` dans `AppContext.jsx`. **Itération UX demandée par l'utilisateur le même jour** (les boutons visibles + confirmation inline "c'est horrible") : remplacé par un composant réutilisable `src/components/SwipeableRow.jsx` (pointer events, marche à la souris et au tactile) — on glisse un repas vers la gauche pour révéler "Modifier"/"Supprimer". "Modifier" recalcule les calories/macros au prorata du nouveau grammage (extrait du nom du repas, ex. "Skyr (100g)") uniquement pour les repas ajoutés manuellement — un repas scanné ou une recette IA n'a pas de grammage exploitable, un message l'indique. **Validé par l'utilisateur sur le principe** ("ok"), pas encore retesté après le dernier fix mineur.
- [ ] **(2026-07-16) Navigation retour incohérente** : parmi les 5 écrans à onglet du bas (Dashboard/Nutrition/Workout/Weekly/Settings), seul Weekly (Bilan) a une flèche retour — qui ne sert à rien puisqu'on est déjà sur un onglet racine. Certains écrans poussés (`Run.jsx`, `Messages.jsx`) n'en ont pas non plus. À trancher : soit un retour cohérent sur tous les écrans poussés (et retirer celui de Weekly, redondant avec les onglets), soit une autre convention — à voir avec l'utilisateur.
- [x] **(2026-07-16) "Mes charges" (`Weekly.jsx`) toujours en données fictives** — **fait en Session 10** (2026-07-17, `src/utils/liftProgress.js`), voir cette entrée plus haut. Checkbox laissée non cochée par erreur au moment du fix, corrigée ici.
- [ ] **(2026-07-16) Lenteur des suggestions de recette IA (`Nutrition.jsx`)** — expliqué à l'utilisateur : modèle `claude-fable-5` (demandé explicitement pour les fonctionnalités "expert", plus gros/plus lent que le Haiku utilisé ailleurs dans l'app) + 1200 tokens de sortie (JSON complet : nom/ingrédients/instructions/macros) + pas de streaming (l'utilisateur attend la réponse complète avant de voir quoi que ce soit) + cold start Vercel possible. Décision à prendre : garder Fable 5 (qualité) avec un meilleur retour visuel pendant l'attente, ou basculer sur un modèle plus rapide pour cette fonctionnalité précise.
- [x] **(2026-07-16) ⚠️ Carte "Dénivelé"/circuit factice toujours visible — j'avais corrigé le mauvais fichier.** Il existe **deux implémentations séparées et dupliquées** de l'écran Course : `src/screens/Run.jsx` (route `/run`, déclarée dans `App.jsx` mais **jamais liée nulle part**) et `src/components/RunContent.jsx` (affiché dans `Workout.jsx` onglet "COURSE" — celui que l'utilisateur voit réellement). **Fait en Session 10** (2026-07-17) : circuit map factice retiré de `RunContent.jsx`, et `Run.jsx`/la route `/run` supprimés (code mort confirmé, validé avec l'utilisateur avant suppression).
- [ ] **(2026-07-16) Question stratégique posée par l'utilisateur : fusionner coach + IA dans une seule app premium, potentiellement en SaaS multi-salles** — voir section "Orientation produit" ci-dessous pour la réponse complète de Claude.

## Orientation produit — IA côté membre (décision du 2026-07-10)
L'utilisateur a proposé de mettre en pause le chantier UI coach pour se concentrer sur une app membre **fortement boostée par l'IA** (recettes, programmes salle/extérieur/maison, parcours marche/course, précision de pointe) — inspiré par une idée reçue d'une "star". Modèle demandé pour ces fonctionnalités expertes : **Fable 5** (`claude-fable-5`), plus poussé que le Haiku utilisé partout ailleurs dans l'app.

**Recommandation de Claude, validée et appréciée par l'utilisateur** : ne pas abandonner le coach humain définitivement. Le marché du "coaching fitness IA" est déjà très encombré (MyFitnessPal, Fitbod, Freeletics, Whoop, Zing Coach ont tous de la génération de programme par IA) — ce n'est plus un différenciateur en soi. Le vrai atout de cette app, c'est d'être **l'app d'une vraie salle physique avec un vrai coach** (ON AIR Clichy) — ça, aucun concurrent purement IA ne peut le copier. L'IA doit servir d'**amplificateur pour le coach**, pas de remplaçant :
1. L'IA prépare les propositions (programme, réponses), le coach garde la main pour valider/ajuster.
2. Résumés automatiques par membre pour le coach (au lieu de scroller 50 profils, il voit qui a besoin d'attention) — extension naturelle du bouton "Analyse IA" déjà présent dans `MemberDetail.jsx`.
3. Réponses suggérées dans la messagerie coach↔membre (une fois persistée en base).
4. Détection de décrochage / signaux faibles à partir des vraies données trackées (dépend des étapes 2-3 de la roadmap de persistance).
5. L'IA absorbe le volume de questions simples 24/7 (recettes, conseils basiques), le coach se concentre sur le relationnel et les corrections fines.

**2026-07-16 — Question complémentaire de l'utilisateur : fusionner coach + IA dans une seule app premium, éventuellement en SaaS revendu à d'autres salles.** Réponse de Claude : ça ne contredit pas la recommandation du 07-10, ça la complète. "Garder un vrai coach humain" et "vendre ça comme un produit premium unique" ne s'opposent pas — la salle physique + coach reste le différenciateur vis-à-vis des concurrents 100% IA, mais **l'unité vendable** peut devenir le produit tout entier (app membre + outils coach + IA) plutôt que juste l'app membre. Concrètement, ça change la cible : au lieu de vendre l'abonnement à un membre d'ON AIR Clichy, on vendrait la licence du produit complet à d'autres salles/coachs indépendants qui n'ont pas les moyens de construire ça eux-mêmes — un SaaS B2B (revenu récurrent par salle), pas juste du B2C. Élément qui va dans ce sens : `useGymConfig.js` (nom/ville/adresse de la salle via env vars) a été construit dès la session 1 explicitement "en préparant le terrain multi-tenant" — donc la direction white-label était déjà anticipée sans qu'on l'ait formalisée. Le prérequis technique est le même dans les deux cas (SaaS ou salle unique) : les étapes 5-6 de la roadmap de persistance (modèle relationnel coach↔membre, `gym_id` pour le multi-salle) — donc aucun travail n'est perdu si la décision finale change. C'est une décision business à part entière (pricing, onboarding d'autres salles, support) qui mérite d'être cadrée avec l'utilisateur avant d'engager du développement dessus.

**Statut** : le chantier coach reste donc "en pause", pas "abandonné" — à reconnecter à l'IA une fois les briques membre construites.

---

## 2026-07-16 — Session 9 : travail en double découvert + fix perf recherche aliments

### ⚠️ Travail en double avec une autre session (branche `claude/vibrant-franklin-wb7p67`)
Une session parallèle (sur `claude/vibrant-franklin-wb7p67`, sans visibilité sur les sessions 6-8 ci-dessus) a reproduit l'étape 1 de la roadmap (persistance des repas → table `repas`) **déjà faite ici** (commit `1dd4913`, session non journalisée sur cette branche), en repartant du point commun `fd9f934` sans savoir que `charming-mendel-dj1GQ` avait déjà avancé. Une PR (#4) a été ouverte puis testée en conditions réelles par l'utilisateur (avec un aller-retour sur des variables d'env Preview manquantes sur Vercel, corrigé au passage) — mais en comparant les deux branches, la version de production s'est avérée **plus complète** (elle synchronise en plus les objectifs calories/macros depuis `objectifs`, et une fonctionnalité de suggestion de recette IA a été construite par-dessus). **PR #4 fermée sans merge** pour ne pas régresser la prod — voir la PR pour le détail. Seul point resté valable : le fix de perf ci-dessous, réappliqué directement ici.

**Leçon pour la prochaine fois** : si une session reprend sur une branche autre que `claude/charming-mendel-dj1GQ`, vérifier d'abord si cette branche a un historique propre (`git log --oneline branche vs charming-mendel-dj1GQ`) avant de commencer une étape de la roadmap, pour éviter ce genre de doublon.

### Perf : recherche manuelle d'aliment (Nutrition) et lookup Scan trop lents
Signalé par l'utilisateur après test réel (recherche "oeuf entier"/"skyr" lente). Cause confirmée par mesure directe : `Nutrition.jsx` (recherche live) et `Scan.jsx` (`lookupOFF`) tapaient tous les deux sur l'ancien endpoint Open Food Facts `cgi/search.pl` (legacy MongoDB, 1 à 2s+ par requête, 503 observés par moments). Le nouvel endpoint d'Open Food Facts (`search.openfoodfacts.org`, search-a-licious/Elasticsearch) répond en quelques ms côté serveur — mais **premier essai raté** : appelé directement depuis le navigateur, il ne renvoie aucun header `Access-Control-Allow-Origin` (vérifié avec une vraie requête CORS preflight), donc le navigateur bloque la réponse — la recherche ne renvoyait plus rien du tout (pire qu'avant), pas juste plus lente. Corrigé en ajoutant un vrai fix : nouvelle fonction serverless `api/food-search.js` (même pattern que `api/claude.js`/`api/exercises.js` — CORS restreint aux domaines de l'app + auth Supabase requise) qui appelle `search-a-licious` côté serveur (pas de CORS entre deux serveurs) et relaie le JSON. `Nutrition.jsx`/`Scan.jsx` appellent maintenant `/api/food-search` au lieu de taper Open Food Facts directement.

### ✅ Roadmap — étapes 2, 3 et 4 faites (branche `claude/roadmap-steps-2-4`, PR séparée de la #5)
Suite de la session, sur une branche dédiée pour ne pas mélanger avec la PR #5 (fix de perf, en attente de test utilisateur) :

**Étape 2 — eau/pas/sommeil/course → `activite_jour`.** `AppContext.jsx` hydrate la ligne du jour (`pas`/`eau_ml`/`sommeil_h`/`km_courus`) au login, et la persiste à chaque changement de `water`/`steps`/`sleep`/`kmRun` — protégé par un flag `activiteLoaded` pour ne jamais réécrire les valeurs par défaut avant que le fetch initial soit arrivé (même risque de course que ce qu'on avait anticipé pour les repas). Les objectifs eau/pas (`objectifs.eau_ml`/`pas_jour`) sont maintenant synchronisés aussi, comme les calories/macros déjà en place. `Run.jsx` ne faisait *que* simuler un chrono sans jamais rien enregistrer nulle part — le bouton stop ajoute maintenant la distance parcourue au total du jour. `Hydration.jsx`/`Dashboard.jsx` n'ont pas eu besoin d'être touchés : ils passaient déjà par `updateData()`, qui persiste désormais automatiquement.

**Étape 3 — séances → table `seances`.** `addSessionToHistory()` insère maintenant la séance terminée dans `seances` (nom, durée, détail des exercices en jsonb) et récupère la vraie ligne. L'historique des séances et le compteur "séances cette semaine" sont hydratés depuis de vraies lignes `seances` au login — l'ancien compteur local ne se remettait d'ailleurs **jamais** à zéro d'une semaine à l'autre (bug pré-existant, corrigé au passage en devenant un vrai comptage sur les 7 derniers jours). `WorkoutHistory.jsx` comparait les ids avec `parseInt()` (fonctionnait avec les anciens ids `Date.now()`) — corrigé en comparaison de string, nécessaire puisque les ids sont maintenant de vrais UUID.

**Étape 4 — graphiques hebdo réels.** Nouveau `src/utils/weeklyStats.js` : agrège les 7 derniers jours (`repas` pour les calories, `activite_jour` pour pas/sommeil, `seances` pour les jours d'entraînement) côté client. `Weekly.jsx` et `Sleep.jsx` font maintenant ce fetch au montage au lieu d'utiliser des tableaux codés en dur. **Bug réel trouvé et corrigé au passage** : le stat "SOMMEIL MOY." de `Weekly.jsx` recalculait en fait une moyenne de *calories* depuis `appData.weeklyData` (reliquat de copier-coller, jamais du sommeil) — corrigé pour afficher une vraie moyenne d'heures de sommeil.

**Pas encore testé par l'utilisateur** — build validé (`npm run build` passe), mais aucun test end-to-end en conditions réelles (pas d'identifiants Supabase dans l'environnement distant). À tester sur la preview de la PR : eau/pas/sommeil/course dans Dashboard + Run, une séance complète dans Workout, puis vérifier Weekly/Sleep pour les graphiques réels.

**Roadmap de persistance : les 4 premières étapes sur 6 sont faites.** Reste : étape 5 (modèle relationnel coach↔membre) et étape 6 (écrans coach branchés sur les vraies données).

---

## 2026-07-12 — Session 8 : dashboard de suivi des tokens Anthropic (hors onairapp)

L'utilisateur a demandé un dashboard temps réel de sa consommation de tokens Anthropic — **globale au compte**, pas juste l'usage d'onairapp. Clarifié via questions :
- Périmètre : consommation Anthropic globale du compte (pas juste onairapp)
- Emplacement : outil séparé, hors du repo onairapp
- "Temps réel" = vue qui se rafraîchit automatiquement (pas du streaming littéral)
- Niveau de détail : totaux jour/semaine/mois
- Métriques : tokens **et** coût en $
- Hébergement : nouveau projet Vercel séparé

**Recherche technique (skill `claude-api` + doc officielle à jour)** :
- L'API qu'il faut est l'**Admin API — Usage & Cost** (`platform.claude.com/docs/en/manage-claude/usage-cost-api`), complètement distincte de la clé API utilisée par l'app.
- Deux endpoints : `GET /v1/organizations/usage_report/messages` (tokens, buckets `1m`/`1h`/`1d`) et `GET /v1/organizations/cost_report` (coût en $, buckets `1d` uniquement).
- Auth : header `x-api-key` avec une **Admin API key** (`sk-ant-admin01-...`), créée dans Console → Settings → Organization → API keys, réservée aux membres avec le rôle `admin`.
- **Point bloquant potentiel** : l'Admin API n'est pas disponible pour les comptes individuels — il faut que le compte Anthropic de l'utilisateur soit configuré en **organisation**. L'utilisateur ne sait pas encore si c'est le cas (réponse "je ne sais pas / compte individuel" à la question de cadrage) → **à vérifier avant de pouvoir déployer le dashboard.**
- Cette clé Admin ne doit jamais être exposée côté client (elle donne bien plus que la lecture d'usage) → le dashboard a besoin d'un petit backend (fonction serverless Vercel) qui la garde secrète et sert de proxy.
- Fraîcheur des données : ~5 min après une requête API. Polling recommandé : jusqu'à 1x/minute.

**Reste à faire (bloqué en attente de l'utilisateur)** :
- [ ] Utilisateur : vérifier dans Console Anthropic (Settings → Organization) si son compte est en mode organisation ; sinon le convertir.
- [ ] Utilisateur : créer une Admin API key (rôle `admin` requis) une fois l'organisation confirmée.
- [ ] Claude : construire le nouveau projet (page + fonction serverless proxy vers `usage_report/messages` et `cost_report`, agrégation jour/semaine/mois, auto-refresh), le pousser sur un nouveau repo GitHub, et guider le déploiement Vercel (variable d'env `ANTHROPIC_ADMIN_KEY`).

---

## 2026-07-11 — Session 7 : correction du mix-up "10800 kcal" (erreur de Claude)

L'utilisateur voyait toujours "Restant : 10800" après le fix du Session 6, et l'a signalé 3 fois en soupçonnant un problème de déploiement ("Staged"). Investigation complète :

- **Vérifié : ce n'était pas un problème de déploiement.** Le domaine servait un build frais (`age: 0`, `last-modified` du jour) contenant bien le code de fetch des objectifs.
- **Vraie cause : Claude avait corrigé le mauvais compte.** Le compte avec les vraies données absurdes (poids 454kg/taille 545cm/10800 kcal) est **`goodghost696@gmail.com`**, pas `arnaudmafuta148@gmail.com`. Le SQL de "correction" de la session précédente avait donc écrasé les **vrais** objectifs corrects d'`arnaudmafuta148` (2938 kcal, issus d'un onboarding cohérent : 80kg/180cm) avec des valeurs génériques (2400), sans jamais toucher au compte réellement cassé.
- **Diagnostic mené via requêtes REST directes** (login réel + lecture RLS avec le token de chaque compte) plutôt que via le connecteur Supabase (indisponible pendant toute cette investigation) — a permis de confirmer que la RLS/le fetch fonctionnaient parfaitement, et d'identifier lequel des deux comptes avait réellement le problème.
- **Corrections appliquées directement via l'API Supabase (token utilisateur, pas besoin du connecteur)** :
  - `goodghost696@gmail.com` : `objectifs` **et** `user_metadata` remis à 2400/180/240/80 (les deux sources — la table sert de vérité, les métadonnées servent de fallback local avant que le fetch résolve).
  - `arnaudmafuta148@gmail.com` : `objectifs` restauré à ses vraies valeurs d'onboarding (2938/160/331/82).
- Ajout d'une section "⚠️ Comptes de test — ne pas confondre" en haut de ce journal pour éviter de reproduire cette erreur.

**Aucun changement de code cette session** — c'était une erreur de données, pas un bug applicatif. La fonctionnalité "Idée recette" et la persistance des repas fonctionnent correctement depuis le début ; c'est la correction manuelle des objectifs qui avait ciblé le mauvais compte.

**Reste à faire** : l'utilisateur doit confirmer que `goodghost696@gmail.com` affiche bien ~2400 kcal restant maintenant (fermer/rouvrir complètement l'app). Puis reprendre où on s'était arrêté : cadrer la prochaine brique IA (programmes d'exercices ou parcours marche/course).

---

## 2026-07-10 — Session 6 : première brique IA membre — recettes personnalisées

**✅ "Idées recette" ajouté à `Nutrition.jsx`** — premier morceau concret de l'orientation "IA côté membre" décidée cette session (voir "Orientation produit" plus haut).

- Nouveau bouton "💡 Idée recette" au-dessus de la liste des repas du jour.
- Appelle `/api/claude` avec le modèle **`claude-fable-5`** (demandé explicitement par l'utilisateur pour les fonctionnalités expertes, contrairement au Haiku utilisé ailleurs) et un prompt basé sur les calories/macros **réellement restantes** aujourd'hui (`appData.calorieGoal - appData.calories`, etc. — rendu possible par la persistance des repas de l'étape 1) + l'objectif du membre (`user.goal`, depuis l'onboarding).
- Affiche nom de la recette, ingrédients, préparation, macros — avec bouton "Ajouter ce repas" qui appelle `addMeal()` (donc persiste réellement dans `repas`, comme tout le reste) et "Une autre idée" pour régénérer.
- Build validé. Commit `a5c8fbc`.

**Bug trouvé au premier test réel (capture d'écran utilisateur) et corrigé** : `Erreur : JSON Parse error: Unexpected EOF` — la réponse de l'IA était coupée avant la fin car `max_tokens: 700` était trop court pour nom + ingrédients + préparation + macros. Corrigé :
- `max_tokens` passé à 1200.
- Les valeurs de calories/macros "restantes" envoyées au prompt sont maintenant bornées à une plage réaliste pour **une** recette (300-1000 kcal, etc.) au lieu d'utiliser directement `calorieGoal - calories`, qui pouvait donner des valeurs aberrantes (voir bug objectifs ci-dessous) et pousser l'IA à générer une réponse trop longue.
- Message d'erreur plus clair en cas de nouvel échec de parsing (`"Réponse incomplète, réessaie"` au lieu de l'erreur JSON brute), avec le détail loggé en console pour debug.
- Commit `0035bfb`.

**Bug de données découvert au passage** : le compte `arnaudmafuta148@gmail.com` avait `calorieGoal = 10800` en base (`objectifs`), reliquat des données de test bidon saisies pendant l'onboarding (poids 454kg, taille 545cm). Ça faussait l'affichage "Restant" sur `Nutrition.jsx`. **SQL de correction donné à l'utilisateur, pas encore confirmé exécuté** (connecteur Supabase indisponible en fin de session) :
```sql
update public.objectifs
set calories_jour = 2400, proteines = 180, glucides = 240, lipides = 80
where user_id = (select id from auth.users where email = 'arnaudmafuta148@gmail.com');
```

**Reste à tester par l'utilisateur** :
1. Confirmer que le SQL de correction des objectifs ci-dessus a bien été exécuté (vérifier que "Restant" affiche ~2400 kcal, pas 10800).
2. Retester "Idée recette" après le fix `max_tokens` — vérifier que la suggestion apparaît sans erreur, est cohérente, et que "Ajouter ce repas" fonctionne (repas visible ET survit à un refresh complet de l'app).

**Prochaines briques possibles côté IA membre** (à cadrer une par une avant de coder, comme convenu) :
- Programmes d'exercices salle/extérieur/maison (existe déjà partiellement dans `Workout.jsx`, à approfondir/passer sur un modèle plus poussé)
- Parcours marche/course à pied (n'existe pas encore, `Run.jsx` ne fait que du suivi)

La roadmap de persistance (étapes 2-6, voir Session 4 plus bas) n'a pas avancé cette session — priorité donnée à la demande explicite de l'utilisateur sur les recettes.

**Fin de session** — reprendre au prochain démarrage par : vérifier le point 1 des tests ci-dessus, puis retester "Idée recette", puis cadrer la prochaine brique IA (programmes ou parcours course/marche) avant de coder.

---

## 2026-07-10 — Session 5 : étape 1 de la roadmap — repas persistés en base

**✅ Étape 1 terminée** (voir roadmap dans l'entrée Session 4 ci-dessous) : les repas sont maintenant réellement persistés dans la table `repas`.

- Migration `add_repas_nutriscore_and_type` : ajout des colonnes `nutriscore` et `type_repas` (absentes du schéma original, nécessaires pour l'UI existante).
- `AppContext.jsx` : au login, fetch des repas du jour (`repas` où `date = aujourd'hui`) + des objectifs réels (`objectifs`) pour remplacer les données de démo en dur. Nouvelle fonction `addMeal()` qui écrit dans `repas` (fallback local si erreur réseau, logué en console) et met à jour les totaux locaux.
- `Nutrition.jsx` (recherche manuelle) et `Scan.jsx` (scan photo/code-barre) utilisent maintenant tous les deux `addMeal()` au lieu d'écrire uniquement en local — les deux chemins d'ajout de repas persistent correctement.
- Testé en base avec un insert authentifié simulé avant de commit (ligne de test supprimée après vérification). Build validé.
- Commit `1dd4913`.

**Reste à tester par l'utilisateur** : ajouter un vrai repas dans l'app (recherche manuelle ET scan photo) et vérifier qu'il apparaît toujours après un refresh/nouvelle connexion (preuve que ça vient bien de la base, pas juste du localStorage).

**Prochaine étape (2/6)** : eau + pas + sommeil + course → table `activite_jour` (`Hydration.jsx`, `Sleep.jsx`, `Run.jsx`, `Rings.jsx`).

---

## 2026-07-10 — Session 4 : fix connexion coach + roadmap persistance complète

### Bug corrigé : connexion coach/admin atterrissait toujours sur le dashboard membre
`login()` dans `AuthContext.jsx` ne lisait le rôle que depuis `user_metadata` (toujours `'member'` pour un compte promu directement en base), au lieu du vrai rôle en table `profiles`. `Login.jsx` naviguait donc juste après connexion avec ce mauvais rôle, avant même que le listener `onAuthStateChange` ait eu le temps de corriger le rôle en arrière-plan. Résultat : un compte `admin`/`coach` atterrissait sur `/dashboard` (vue membre) après connexion, alors qu'un accès manuel à `/coach` fonctionnait (d'où l'incompréhension). Corrigé : `login()` résout maintenant le vrai rôle via `profiles` avant de retourner, comme le fait déjà la restauration de session. `admin` atterrit désormais sur `/coach` par défaut (comme `coach`). Commit `0a0ba12`.

### Diagnostic mené avant de trouver le bug (pour référence)
Vérifié en direct via l'API Supabase (curl) que ce n'était **ni** un problème de déploiement Vercel figé ("Staged") — le bundle JS servi contient bien le bypass admin — **ni** un problème de rôle en base (`role: "admin"` confirmé) — **ni** un problème de login (identifiants valides, HTTP 200). Le bug était uniquement dans `login()` comme décrit ci-dessus.

### Roadmap validée : persistance complète + connexion coach
L'utilisateur veut que **tout** soit fonctionnel : repas/calories, eau, séances, **+ sommeil, pas, course, graphiques hebdo (Weekly.jsx)**, **+ le côté coach connecté aux vraies données par membre**. Actuellement tout passe uniquement par `localStorage` via `AppContext.jsx` (`updateData()`) — les tables Supabase `repas`/`seances`/`activite_jour` existent avec RLS correcte mais ne sont jamais utilisées. Côté coach, aucune relation coach↔membre n'existe en base.

Découpage validé en 6 étapes indépendantes (une étape = une session, dans cet ordre — voir aussi le plan sauvegardé `/root/.claude/plans/effervescent-stargazing-popcorn.md` si encore présent) :
1. **Repas/calories → table `repas`** (`Nutrition.jsx`, `Scan.jsx` passe déjà par `updateData('meals', …)`)
2. **Eau + pas + sommeil + course → table `activite_jour`** (`Hydration.jsx`, `Sleep.jsx`, `Run.jsx`, `Rings.jsx` — même table, une ligne par jour/utilisateur)
3. **Séances → table `seances`** (`WorkoutSession.jsx`, `WorkoutHistory.jsx`)
4. **Graphiques hebdo réels** (`Weekly.jsx`, `Dashboard.jsx`) — dépend des étapes 1-3, remplace les tableaux `weeklyData`/`sleepData` codés en dur par de vraies agrégations
5. **Modèle relationnel coach↔membre en base** (nouvelle table/colonne + policies RLS coach sur `repas`/`seances`/`activite_jour`) — fondation nécessaire avant l'étape 6
6. **Écrans coach branchés sur les vraies données par membre** (`CoachDashboard.jsx`, `ClientsList.jsx`, `MemberDetail.jsx`) — dépend de l'étape 5

Pour chaque étape : hydrater `appData` depuis Supabase au montage, écrire à chaque action, `npm run build`, test manuel, commit+push, mise à jour de ce journal.

**Aucune étape commencée à la fin de cette session** — la session s'est arrêtée ici pour limiter le temps/tokens, à reprendre à l'étape 1.

---

## 2026-07-10 — Session 3 : compte admin, scan fiabilisé, audit sécurité

### Ce qui a été fait
- **Compte admin démo** : `role='admin'` bypass ajouté dans `ProtectedRoute` (`App.jsx`) pour qu'un seul compte accède à `/dashboard` **et** `/coach` sans double connexion. `arnaudmafuta148@gmail.com` passé en `role='admin'` en base (fait par l'utilisateur via SQL Editor). Commit `1fdd571`.
- **Diagnostic "connexion coach impossible"** : pas un bug — `coach@onair.fr` avait été créé via le signup normal, qui force toujours `role='member'` (pas de création de compte coach en self-service). L'utilisateur se connectait bien mais était redirigé vers l'espace membre.
- **Scan photo fiabilisé** : Claude n'invente plus les calories/macros. Il identifie juste le nom + grammage estimé de chaque aliment ; l'app recherche ensuite ce nom dans **Open Food Facts** pour remplacer l'estimation par de vraies valeurs au 100g (badge ✓ vérifié / ≈ estimé). **Le grammage est maintenant éditable** par l'utilisateur (photo de plat et code-barre), recalcul live des calories/macros. Commit `a704b2f`.
- **PWA installée sur iPhone** : l'app apparaît maintenant sur l'écran d'accueil avec l'icône ON AIR (confirmé par l'utilisateur) — cohérent avec `manifest.json` + les icônes uploadées par l'utilisateur + le fix du service worker de la session précédente.

### 🔴 Audit sécurité complet — trouvailles

**CRITIQUE — élévation de privilèges via `profiles.role`**
La policy RLS `"Users can update own profile"` autorise un utilisateur à modifier **n'importe quelle colonne** de sa propre ligne, y compris `role`. Concrètement : **n'importe quel membre connecté peut s'auto-promouvoir `coach` ou `admin`** en appelant directement `supabase.from('profiles').update({ role: 'admin' }).eq('user_id', monId)` depuis la console du navigateur — aucune UI ne le propose, mais rien ne l'empêche côté serveur. Une fois `coach`, il peut lire les profils de tous les membres (email, poids, taille) via la policy `is_coach()`. **Fix prêt, pas encore appliqué** (le connecteur Supabase était déconnecté pendant cette session) :
```sql
revoke update (role) on public.profiles from authenticated, anon;
```
Et pour rester cohérent avec le nouveau rôle admin :
```sql
create or replace function public.is_coach()
returns boolean language sql security definer set search_path = public stable as $$
  select exists (select 1 from public.profiles where user_id = auth.uid() and role in ('coach','admin'));
$$;
```
(sans ce 2e fix, le compte admin ne verra pas la liste des membres dans `/coach` car `is_coach()` ne reconnaît que `role='coach'` aujourd'hui.)

**HAUTE — endpoints `/api/*` ouverts à tout le monde, sans authentification**
`api/claude.js`, `api/exercises.js`, `api/quote.js` acceptent des requêtes de **n'importe qui sur internet** (CORS `Access-Control-Allow-Origin: '*'`, aucune vérification de session Supabase), et relaient directement vers Anthropic/API-Ninjas avec les clés serveur. `api/claude.js` transmet `req.body` tel quel (modèle, messages, max_tokens) sans validation — n'importe qui peut consommer le budget Anthropic du projet, sans même utiliser l'app. Pas encore corrigé — nécessite de vérifier le JWT Supabase (header `Authorization`) côté serveur avant de proxier, et de restreindre CORS au domaine de l'app.

**MOYENNE — code d'invitation en dur**
`ONAIR2026` visible en clair dans le bundle JS (`Login.jsx`, affiché aussi dans `CoachSettings.jsx`) — n'importe qui peut s'inscrire en l'inspectant. Connu depuis `ETAT_DES_LIEUX.md`, toujours pas corrigé.

**FAIBLE — pas de scoping coach/salle**
Un compte `coach` voit **tous** les membres (`CoachDashboard.jsx`, `ClientsList.jsx` font `select('*')` sur `profiles` sans filtre de salle) — cohérent pour une seule salle aujourd'hui, mais bloquant pour le multi-salle prévu. Déjà documenté dans `ETAT_DES_LIEUX.md`.

**Points sains vérifiés** : aucune clé API (`ANTHROPIC_API_KEY`, `NINJA_API_KEY`) exposée côté client ; aucun `dangerouslySetInnerHTML`/`eval`/`innerHTML` (pas de risque XSS identifié) ; aucun mot de passe ou token loggé dans les `console.log` ajoutés cette semaine ; Messages/Conversation restent 100% en mémoire (pas de fuite DB possible tant que non persistés) ; `objectifs`/`repas`/`seances`/`activite_jour` correctement scopés à `auth.uid() = user_id`, pas de colonne sensible équivalente à `role`.

### Suite immédiate (même session) : traitement des 4 points de l'audit
1. **Compte admin exclusif** — le vrai souci était l'escalade de privilèges (voir ci-dessus), pas le compte admin lui-même. **SQL prêt mais pas encore appliqué** (connecteur Supabase resté indisponible toute la session) :
   ```sql
   revoke update (role) on public.profiles from authenticated, anon;
   ```
   Une fois appliqué, plus personne ne pourra modifier son propre `role` depuis le client — seul un accès direct à la base (toi, ou moi via le connecteur) pourra le faire. **⚠️ À exécuter dès que possible, c'est la faille la plus critique.**
2. **Sécurisation des clés API — fait** (commit `0846fe8`) : `api/claude.js`, `api/exercises.js`, `api/quote.js` exigent maintenant une session Supabase valide (vérifiée côté serveur via `api/_lib/auth.js`), et le CORS est restreint aux domaines Vercel du projet + localhost au lieu de `*`. Tous les appels client (`Scan.jsx`, `AICoach.jsx`, `Workout.jsx`, `MemberDetail.jsx`, `useExercises.js`) envoient maintenant le token d'accès via un nouveau helper `authHeader()` dans `lib/supabase.js`.
3. **`is_coach()` doit reconnaître `admin` — même SQL que le point 1, pas encore appliqué** :
   ```sql
   create or replace function public.is_coach()
   returns boolean language sql security definer set search_path = public stable as $$
     select exists (select 1 from public.profiles where user_id = auth.uid() and role in ('coach','admin'));
   $$;
   ```
4. **Code d'invitation en dur — fait** (commit `0846fe8`) : `ONAIR2026` supprimé du bundle client (vérifié : 0 occurrence dans `dist/assets/*.js` après build). Validation déplacée côté serveur (`api/validate-invite.js`, ne renvoie qu'un booléen) ; `CoachSettings.jsx` récupère le code via `api/invite-code.js` (protégé, coach/admin uniquement) au lieu de l'afficher en dur. Configurable via la nouvelle env var `INVITE_CODE` (sinon fallback sur l'ancienne valeur). **Recommandation : définir une nouvelle valeur dans Vercel, l'ancienne `ONAIR2026` a déjà été exposée publiquement (bundles précédents, historique git).**

**✅ Points 1 et 3 appliqués par l'utilisateur** directement via le SQL Editor Supabase (le connecteur est resté indisponible toute la session côté Claude). Confirmé "Success. No rows returned" pour les deux commandes. Points 2 et 4 vérifiés live en production (curl direct) : `/api/claude` et `/api/exercises` renvoient bien `{"error":"Unauthorized"}` sans session, et `ONAIR2026` n'apparaît plus dans le bundle JS déployé.

**Bilan : les 4 points de l'audit sécurité du 2026-07-10 sont clos.**

---

## 2026-07-10 — Session 2 : résolution du bug `profiles` (point 1 du 07-09)

**Root cause trouvée et corrigée**, en base ET dans le code — ce n'était ni les env vars, ni les GRANTs, ni un problème d'auth :

1. **Récursion infinie RLS** : la policy `"Coaches can view all profiles"` sur `profiles` s'interrogeait elle-même (`SELECT ... FROM profiles` dans sa propre condition `USING`), ce qui déclenchait `infinite recursion detected in policy for relation "profiles"` sur **toute** requête touchant la table — y compris le `RETURNING *` implicite d'un `upsert()`. Résultat : l'INSERT du profil échouait et l'ensemble de la requête (y compris l'auth signup qui la précédait) était annulé. Confirmé noir sur blanc dans les logs Postgres (dizaines d'occurrences). **Fix appliqué en base** (migration `fix_profiles_coach_policy_infinite_recursion`) : la policy passe maintenant par une fonction `SECURITY DEFINER` (`public.is_coach()`) qui contourne le RLS au lieu de le redéclencher.
2. **Bug de code caché derrière le premier** : `src/context/AuthContext.jsx` appelait `.upsert()` sur `profiles`/`objectifs` **sans `onConflict: 'user_id'`**. Ces deux tables ont une PK auto-générée (`id`) séparée d'une contrainte `UNIQUE(user_id)` — sans préciser la cible du conflit, Supabase vise la PK par défaut, qui n'est jamais fournie par l'app, donc chaque upsert redevient un INSERT pur. Le premier passe, mais le **second** appel pour le même utilisateur (ex: `register()` puis `updateUserProfile()` à la fin de l'onboarding) percute la contrainte `UNIQUE(user_id)` et échoue avec `duplicate key value violates unique constraint`. **Corrigé** dans les 3 upserts concernés (`register()`, et les deux upserts de `updateUserProfile()`), commit `61557f1`.
3. **Données du compte `goodghost696@gmail.com` réparées manuellement** : sa ligne `profiles` (perdue à cause du bug n°1) a été recréée en base directement.

**Testé et validé en base** : simulation d'un upsert authentifié pour cet utilisateur, plus de récursion, ligne bien créée/mise à jour.

**Reste à faire** : ~~retester une inscription complète de bout en bout~~ **FAIT ET VALIDÉ** (voir ci-dessous).

### Validation en conditions réelles
- Test `coach@onair.fr` (08:41) : `profiles` + `objectifs` correctement remplis après signup + onboarding. ✅
- Test `arnaudmafuta148@gmail.com` (08:49, compte réel de l'utilisateur) : idem, `profiles` (prénom "Ghost", role member) + `objectifs` (2938 kcal/jour) bien créés. ✅
- **Le bug `profiles` du 07-09 est officiellement clos.**

### Effet de bord découvert pendant les tests : pas de "mot de passe oublié"
En testant la connexion au compte `goodghost696@gmail.com` (créé hier), mot de passe oublié → erreur "Invalid login credentials" (normal, sans rapport avec les bugs ci-dessus). Ça a révélé qu'**il n'existait aucune fonctionnalité de réinitialisation de mot de passe** dans l'app. Corrigé dans la foulée :
- `AuthContext.jsx` : `sendPasswordResetEmail(email)` / `updatePassword(newPassword)`
- `Login.jsx` : lien "Mot de passe oublié ?" sur l'onglet connexion
- Nouvel écran + route `/reset-password` : récupère la session de récupération envoyée par Supabase et permet de définir un nouveau mot de passe
- Traductions FR/EN/ES ajoutées
- Commit `760be3c` (rebasé en `69c1c7f` après un upload d'icônes PNG fait en parallèle sur GitHub)

**⚠️ Action requise côté utilisateur (aucun outil ne permet de le faire depuis Claude)** : vérifier dans **Supabase Dashboard → Authentication → URL Configuration** que `https://onairapp.vercel.app/reset-password` est bien dans les **Redirect URLs** (et que **Site URL** est réglé sur `https://onairapp.vercel.app`), sinon le lien reçu par email pour réinitialiser le mot de passe sera rejeté. **Pas encore testé de bout en bout** (réception réelle de l'email + clic sur le lien) à la fin de cette session.

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

---

## 2026-07-09 — Session (autre fil de travail)

### Ce qui a été fait

**Écran Landing (redesign)**
- Remplacé le splash logo auto-redirect par l'écran interactif à 2 CTA ("Rejoindre la salle" / "Accès coach"), conforme au design validé
- Créé `useGymConfig.js` (nom/ville/adresse du gym dynamiques via env vars, base pour le modèle white-label)
- `Login.jsx` pré-sélectionne maintenant l'onglet (inscription/connexion) selon le bouton cliqué
- Déployé et validé visuellement

**Bug critique résolu — Service Worker**
- `sw.js` utilisait une stratégie cache-first sans versioning : une fois l'app chargée une première fois, un navigateur restait figé sur cette version **indéfiniment**, peu importe les déploiements suivants
- Corrigé : network-first pour la navigation, cache-first uniquement pour les assets hashés, purge automatique des anciens caches à chaque activation
- Impact : ce bug touchait potentiellement **tous les utilisateurs déjà passés sur l'app avant aujourd'hui** — sans ce fix, aucun d'eux n'aurait jamais vu un futur déploiement

**Bug critique résolu — Domaine de production jamais promu**
- `onairapp.vercel.app` servait un build figé depuis **6+ jours**, malgré des dizaines de déploiements "Ready" derrière — le domaine principal n'était jamais ré-aliasé automatiquement (option "Require approval" probablement activée sur le projet Vercel)
- Résolu via "Promote to Production" manuel
- **Action encore ouverte de ton côté** : vérifier Project Settings → Git sur Vercel pour désactiver cette exigence d'approbation manuelle, sinon ce problème reviendra à chaque futur push

**Sécurité**
- RLS `profiles` corrigée : la policy coach était `qual = true` (n'importe qui pouvait lire tous les profils) → restreinte à `role = 'coach'`

**Process**
- Audit hebdomadaire programmé (calendrier, lundis 10h)
- Ce journal de bord instauré comme rituel de fin de session

### 🔴 Ce qui reste ouvert — à traiter en priorité

**Bug non résolu : inscriptions qui n'atteignent pas `profiles`**
- Confirmé en base : le compte `goodghost696@gmail.com` existe dans `auth.users` mais **aucune ligne correspondante dans `profiles`**
- Schéma, permissions (GRANT), RLS INSERT tous vérifiés corrects — la cause exacte reste non identifiée
- L'erreur console précise (`[Auth] register: profiles upsert failed`) n'a jamais été récupérée malgré plusieurs tentatives
- **Sans ce fix, aucune inscription réelle ne fonctionne correctement** — les utilisateurs peuvent se connecter mais leurs données ne persistent pas en base

**Reste à vérifier**
- Test complet sur iPhone pas encore refait après le fix Service Worker (dernier test confirmé : Chrome desktop uniquement)

### Bilan honnête sur l'avancement

L'app a un **design d'accueil désormais aligné** avec la direction validée, et deux bugs d'infrastructure sérieux (Service Worker, domaine non promu) sont réglés — ce sont des fondations qui auraient bloqué silencieusement *tous* les futurs déploiements si on ne les avait pas trouvés maintenant. C'est un vrai gain, même si la session a été frustrante à cause du temps perdu à diagnostiquer à l'aveugle.

Mais le point dur reste entier : **le pipeline d'inscription ne sauvegarde toujours pas les données en base**. Tant que ça n'est pas réglé, tester le reste du redesign (Dashboard, Nutrition, etc.) avec de vraies données Supabase n'a pas de sens — on teste avec des données par défaut/localStorage, pas la réalité. C'est la priorité de la prochaine session, avant de continuer sur le design des autres écrans.

### Prochaine session — priorités dans l'ordre
1. Résoudre le bug `profiles` upsert (bloquant pour tout test réaliste)
2. Vérifier/désactiver "Require approval" sur Vercel
3. Test complet iPhone post-fix
4. Reprendre le redesign Dashboard (déjà cadré : questions résolues sur l'icône logout et la carte séances)
