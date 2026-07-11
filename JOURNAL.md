# Journal de bord — ON AIR

Journal tenu à la fin de chaque session de travail avec Claude. Sert de contexte de reprise pour la session suivante : ce qui a été fait, ce qu'il reste à faire, et un état des lieux honnête de l'app.

Entrées les plus récentes en haut.

**Pour reprendre dans une nouvelle session** : ouvre une session sur le repo, branche `claude/charming-mendel-dj1GQ`, et demande à Claude de lire ce fichier avant de continuer — il contient tout l'historique et l'état d'avancement.

## ⚠️ Comptes de test — ne pas confondre (erreur commise le 2026-07-11, voir plus bas)
- **`goodghost696@gmail.com`** (id `15cdc63c-a54c-462a-bcbe-bd06e83bd437`) — compte de test avec des données d'onboarding **volontairement/accidentellement absurdes** (poids 454kg, taille 545cm) créées très tôt dans les tests. Objectifs corrigés à des valeurs génériques (2400/180/240/80) le 2026-07-11.
- **`arnaudmafuta148@gmail.com`** (id `a66b045c-0086-452d-9c93-808bc002d39b`) — compte de test avec un **vrai onboarding cohérent** (poids 80kg, taille 180cm, objectif "Performance" → 2938 kcal/180P/331G/82L). Compte utilisé pour le rôle admin.

## Idées / à faire — design & UI (liste vivante, pas datée)
- [ ] **Revoir l'UI de la partie Coach** — demandé le 2026-07-10, une fois l'accès coach confirmé fonctionnel. **Mis en pause** (voir "Orientation produit" ci-dessous) au profit du chantier IA côté membre. Pas encore cadré (pas de détails sur ce qui doit changer précisément) — à préciser avec l'utilisateur avant de reprendre.

## Orientation produit — IA côté membre (décision du 2026-07-10)
L'utilisateur a proposé de mettre en pause le chantier UI coach pour se concentrer sur une app membre **fortement boostée par l'IA** (recettes, programmes salle/extérieur/maison, parcours marche/course, précision de pointe) — inspiré par une idée reçue d'une "star". Modèle demandé pour ces fonctionnalités expertes : **Fable 5** (`claude-fable-5`), plus poussé que le Haiku utilisé partout ailleurs dans l'app.

**Recommandation de Claude, validée et appréciée par l'utilisateur** : ne pas abandonner le coach humain définitivement. Le marché du "coaching fitness IA" est déjà très encombré (MyFitnessPal, Fitbod, Freeletics, Whoop, Zing Coach ont tous de la génération de programme par IA) — ce n'est plus un différenciateur en soi. Le vrai atout de cette app, c'est d'être **l'app d'une vraie salle physique avec un vrai coach** (ON AIR Clichy) — ça, aucun concurrent purement IA ne peut le copier. L'IA doit servir d'**amplificateur pour le coach**, pas de remplaçant :
1. L'IA prépare les propositions (programme, réponses), le coach garde la main pour valider/ajuster.
2. Résumés automatiques par membre pour le coach (au lieu de scroller 50 profils, il voit qui a besoin d'attention) — extension naturelle du bouton "Analyse IA" déjà présent dans `MemberDetail.jsx`.
3. Réponses suggérées dans la messagerie coach↔membre (une fois persistée en base).
4. Détection de décrochage / signaux faibles à partir des vraies données trackées (dépend des étapes 2-3 de la roadmap de persistance).
5. L'IA absorbe le volume de questions simples 24/7 (recettes, conseils basiques), le coach se concentre sur le relationnel et les corrections fines.

**Statut** : le chantier coach reste donc "en pause", pas "abandonné" — à reconnecter à l'IA une fois les briques membre construites.

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
