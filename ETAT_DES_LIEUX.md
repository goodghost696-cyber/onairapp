# État des lieux technique — ON AIR

**Date :** 2026-07-08
**Rédigé par :** Tech Lead (Claude Code)
**Destinataire :** Architecte logiciel (Gemini) — planification des prochaines étapes du SaaS marque blanche multi-salles

---

## Résumé exécutif

L'application actuelle est un **prototype fonctionnel front-end** (React SPA) avec une authentification réelle (Supabase Auth) mais **quasiment aucune donnée métier réellement persistée**. Les vues Membre affichent des données stockées en `localStorage`, et les vues Coach sont **entièrement mockées** (tableau JS en dur, aucune requête réseau). Il n'existe à ce jour **aucune notion de "salle de sport" (tenant)** dans le modèle de données ni dans le code — c'est le point bloquant n°1 avant de pouvoir vendre ceci comme SaaS multi-salles en marque blanche.

---

## 1. Stack technique

Lu depuis `package.json` (aucun `tsconfig.json`, aucun `prisma/schema.prisma` — projet **JavaScript pur**, pas TypeScript) :

| Catégorie | Techno | Version | Remarque |
|---|---|---|---|
| Framework | React | 18.2.0 | SPA classique (pas de Next.js/SSR) |
| Build tool | Vite | 5.1.0 | `vite dev` / `vite build` |
| Routing | react-router-dom | 6.22.0 | Routes déclaratives dans `App.jsx` |
| UI / CSS | CSS natif (fichiers `.css` par écran) | — | Pas de Tailwind, pas de librairie de composants. Design tokens dans `src/styles/global.css` (glassmorphisme, dark theme `#1a1012`, accent `#bf0603`) |
| Auth & DB | `@supabase/supabase-js` | 2.108.1 | Auth réelle ; DB très peu utilisée (voir §3) |
| État global | React Context API (pas de Redux/Zustand) | — | 4 contextes : `AppContext`, `AuthContext`, `LanguageContext`, `ThemeContext` |
| Persistance locale | `localStorage` (wrapper maison `src/utils/storage.js`) | — | **Source de vérité principale des données membre aujourd'hui** |
| Backend | Fonctions serverless Vercel (`/api/*.js`) | — | 3 endpoints proxy (voir §2) |
| Déploiement | Vercel | — | `vercel.json` configure rewrites SPA + fonctions |
| i18n | Maison (`LanguageContext.jsx`, 506 lignes) | — | FR / EN / ES codés en dur dans un objet JS |
| TypeScript | ❌ Absent | — | Aucun typage statique |
| Tests | ❌ Absent | — | Aucun framework de test configuré |

**Dépendances externes tierces (via les fonctions serverless) :**
- `ANTHROPIC_API_KEY` → proxy Claude pour le "Coach IA" et la génération de programmes (`/api/claude.js`)
- `NINJA_API_KEY` → API-Ninjas pour la bibliothèque d'exercices (`/api/exercises.js`) et les citations motivantes (`/api/quote.js`)
- Open Food Facts (appel direct côté client, sans clé) pour la recherche d'aliments dans `Nutrition.jsx`

---

## 2. Architecture et arborescence

```
onairapp/
├── api/                      # Fonctions serverless Vercel (proxys)
│   ├── claude.js             # Proxy Anthropic (Coach IA, génération de programme)
│   ├── exercises.js          # Proxy API-Ninjas (bibliothèque d'exercices)
│   └── quote.js              # Proxy API-Ninjas (citation du jour)
├── scripts/
│   └── supabase_schema.sql   # Seul artefact de schéma DB du repo (à exécuter manuellement dans Supabase)
├── src/
│   ├── App.jsx                # Déclaration des routes + garde ProtectedRoute
│   ├── main.jsx
│   ├── layouts/
│   │   └── MemberLayout.jsx   # Layout membre (BottomNav + FAB Coach IA/Messages)
│   ├── context/
│   │   ├── AuthContext.jsx    # Session Supabase → objet user (id, email, name, role, goals)
│   │   ├── AppContext.jsx     # État "métier" membre — 100% localStorage, aucune requête DB
│   │   ├── LanguageContext.jsx
│   │   └── ThemeContext.jsx
│   ├── screens/                       # 24 écrans, un fichier = un écran (pas de sous-dossiers par domaine)
│   │   ├── Landing.jsx, Login.jsx, Onboarding.jsx
│   │   ├── Dashboard.jsx, Nutrition.jsx, Workout.jsx, WorkoutSession.jsx,
│   │   │   WorkoutHistory.jsx, WorkoutLibrary.jsx, Run.jsx, Hydration.jsx,
│   │   │   Sleep.jsx, Weekly.jsx, Rings.jsx, Scan.jsx, AICoach.jsx,
│   │   │   Messages.jsx, Conversation.jsx, Settings.jsx      # ── Vues MEMBRE
│   │   └── CoachDashboard.jsx, ClientsList.jsx, MemberDetail.jsx,
│   │       CoachMessages.jsx, CoachSettings.jsx               # ── Vues COACH
│   ├── components/            # Composants partagés (BottomNav, CoachNav, CalorieRing,
│   │                           #   ExerciseModal, RestTimer, NutriscoreBadge, RunContent)
│   ├── hooks/
│   │   └── useExercises.js    # Hook fetch + cache localStorage 24h pour la bibliothèque d'exercices
│   ├── lib/
│   │   └── supabase.js        # Client Supabase (createClient), lit VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
│   ├── utils/
│   │   └── storage.js         # save/load/clearDay — wrapper localStorage préfixé "onair_"
│   └── styles/                # 1 fichier CSS par écran + global.css (design tokens)
├── public/                    # Icônes PWA, manifest.json, service worker (sw.js)
├── vercel.json
├── vite.config.js
└── package.json
```

**Points structurants à noter pour l'architecte :**
- Pas de séparation `pages/` vs `features/` vs `domain/` : tous les écrans sont à plat dans `screens/`, avec logique métier, fetch et style inline mêlés dans le même fichier JSX.
- Pas de couche `services/` ou `api/` côté client pour encapsuler les appels Supabase — les rares appels sont faits directement dans `AuthContext.jsx`.
- Le routing distingue bien deux espaces (`/…` membre vs `/coach/…`) avec un layout dédié pour le membre (`MemberLayout`), mais **aucun layout dédié pour le coach** (chaque écran coach importe son propre `CoachNav`).

---

## 3. Modèles de données

### 3.1 Schéma SQL déclaré (`scripts/supabase_schema.sql`)

C'est le **seul schéma de données existant**, à exécuter manuellement dans l'éditeur SQL Supabase (pas de migrations versionnées, pas de CLI Supabase/Prisma).

```sql
profiles        (id, user_id → auth.users, prenom, email, poids, taille, age, created_at)
objectifs       (id, user_id, calories_jour, proteines, glucides, lipides, eau_ml, pas_jour)
repas           (id, user_id, date, nom, calories, proteines, glucides, lipides, portion)
seances         (id, user_id, date, nom, duree_min, exercices jsonb, created_at)
activite_jour   (id, user_id, date, pas, eau_ml, sommeil_h, km_courus, updated_at)
```

Toutes les tables ont RLS activé avec des policies `auth.uid() = user_id` (bonne pratique respectée, mais uniquement pour un modèle **mono-tenant** — voir dette technique).

### 3.2 Entités réellement utilisées par le code

| Entité (déclarée en SQL) | Utilisée par le code ? | Détail |
|---|---|---|
| `profiles` | ✅ Oui | Écrite dans `AuthContext.register()` et `updateUserProfile()` |
| `objectifs` | ✅ Oui (écriture seule) | Écrite lors de l'onboarding / mise à jour profil, **jamais relue** — `AppContext` recalcule les objectifs depuis `localStorage`/`user_metadata`, pas depuis cette table |
| `repas` | ❌ Non | Table créée en SQL mais **aucun `supabase.from('repas')`** dans tout le code — `Nutrition.jsx` stocke les repas dans `appData.meals` (localStorage) |
| `seances` | ❌ Non | Idem — `Workout.jsx`/`WorkoutSession.jsx` utilisent `appData.sessionHistory` (localStorage) |
| `activite_jour` | ❌ Non | Idem — pas, eau, sommeil, km sont dans `appData` (localStorage) |

### 3.3 Entités qui manquent totalement au modèle actuel

Ces entités sont indispensables pour l'ambition "SaaS marque blanche multi-salles" mais **n'existent nulle part** (ni SQL, ni code) :

- **`gyms` / `tenants`** — aucune notion de salle de sport, d'organisation ou de marque blanche. Un seul environnement Supabase = un seul client aujourd'hui.
- **`coach_member` (relation)** — rien ne relie un coach à ses membres en base ; côté coach, tout est mocké (`MOCK_MEMBERS`, voir §4).
- **`messages`** — la messagerie coach↔membre (`Conversation.jsx`) est un tableau de messages en mémoire, non persisté.
- **`workout_programs` / `exercises` (catalogue interne)** — le catalogue d'exercices vient exclusivement de l'API externe API-Ninjas (avec cache localStorage 24h), il n'y a pas de table `exercises` propre à ON AIR permettant à un coach de créer des programmes personnalisés.
- **`invite_codes` / `subscriptions`** — l'inscription est filtrée par un code d'invitation **codé en dur côté client** (`ONAIR2026` dans `Login.jsx`), pas de gestion d'abonnement/facturation.

### 3.4 Modèle "utilisateur" réel (dérivé de Supabase Auth, pas d'une table dédiée)

```js
// src/context/AuthContext.jsx — sessionToUser()
{
  id, email,
  name: user_metadata.name,
  role: user_metadata.role,        // 'member' | 'coach' — string libre, pas d'enum contrainte
  goal, calorieGoal, proteinGoal, carbGoal, fatGoal   // dupliqués depuis user_metadata
}
```
Le rôle et les objectifs nutritionnels vivent dans `auth.users.raw_user_meta_data` (JSON libre), pas dans une table relationnelle — fragile pour des requêtes/agrégations côté coach ou admin.

---

## 4. État d'avancement des fonctionnalités

### 4.1 Vues Membre (`src/screens/`, sous `MemberLayout`)

| Écran | Statut UI | Données |
|---|---|---|
| Landing / Login / Onboarding | ✅ Complet | Auth réelle (Supabase), onboarding calcule les objectifs (BMR/TDEE) et les pousse en `user_metadata` + table `objectifs` |
| Dashboard | ✅ Complet (design system appliqué) | 100% `localStorage` (calories, macros, pas, sommeil, séances hebdo) |
| Nutrition | ✅ Complet | Recherche d'aliments **réelle** (Open Food Facts API), mais les repas ajoutés sont stockés en `localStorage` uniquement |
| Workout / WorkoutSession / WorkoutHistory / WorkoutLibrary | ✅ Complet | Bibliothèque d'exercices réelle (API-Ninjas + cache), séances/historique en `localStorage`. Génération de programme IA réelle via `/api/claude` |
| Hydration / Sleep / Run / Rings / Weekly | ✅ UI complète | Données 100% `localStorage`, certaines valeurs (ex: `weeklyData`, `runSessions`, `sleepData` dans `AppContext.jsx`) sont **des tableaux hardcodés en dur** utilisés comme données par défaut |
| Scan | ✅ UI complète | Scan à valider (probablement mocké/placeholder — à vérifier avec l'équipe produit) |
| AI Coach | ✅ Fonctionnel | Appel réel à `/api/claude` (Anthropic) |
| Messages / Conversation (côté membre) | ✅ UI complète | Messages **en mémoire uniquement** (`useState`), perdus au rechargement, aucune table `messages` |
| Settings | ✅ Complet (design system appliqué) | Profil/objectifs en `localStorage` + écriture Supabase ; sync santé (pas/sommeil) = formulaire manuel, pas d'intégration Apple Health/Google Fit réelle |

### 4.2 Vues Coach (`src/screens/Coach*.jsx`, `ClientsList`, `MemberDetail`)

| Écran | Statut UI | Données |
|---|---|---|
| CoachDashboard | ✅ UI complète | **100% mocké** — `export const MOCK_MEMBERS = [...]` (15 membres hardcodés) défini directement dans `CoachDashboard.jsx` et importé par les 4 autres écrans coach |
| ClientsList | ✅ UI complète | Filtre côté client sur `MOCK_MEMBERS`, aucune requête réseau |
| MemberDetail | ✅ UI complète | Lit `MOCK_MEMBERS` par `id`, objectifs (`MOCK_OBJECTIVES`) et données hebdo hardcodés. Bouton "analyse" présent mais logique IA à vérifier |
| CoachMessages / Conversation (isCoach) | ✅ UI complète | Même limitation que côté membre — messages en mémoire |
| CoachSettings | ✅ UI complète | Non vérifié en détail, probablement similaire à `Settings.jsx` membre |

**Conclusion §4 : aucune donnée coach n'est réelle.** L'espace coach est un habillage UI complet sur un jeu de données factices partagé entre écrans via un `export const` — il n'y a **aucun moyen actuel de faire apparaître un vrai membre inscrit dans l'espace coach**, ni de lier un coach à "ses" membres.

---

## 5. Authentification & sécurité

- **Auth :** Supabase Auth (email/mot de passe) via `supabase.auth.signInWithPassword` / `signUp`. Session persistée par le SDK Supabase (localStorage interne au SDK), restaurée au chargement dans `AuthContext`.
- **Garde de route :** `ProtectedRoute` dans `App.jsx` — vérifie `user` non null et compare `user.role` au `requiredRole` de la route. Redirige vers `/login` ou vers le dashboard de l'autre rôle.
  ```jsx
  function ProtectedRoute({ children, requiredRole }) {
    const { user } = useAuth()
    if (!user) return <Navigate to="/login" replace />
    if (requiredRole && user.role !== requiredRole) {
      return <Navigate to={user.role === 'coach' ? '/coach' : '/dashboard'} replace />
    }
    return children
  }
  ```
- **Attribution du rôle :** `register()` force toujours `role: 'member'` (`AuthContext.jsx:70`). **Il n'existe aucun flow applicatif pour créer un compte coach** — cela doit être fait manuellement en éditant `user_metadata` dans le dashboard Supabase. Bloquant pour un onboarding coach en self-service.
- **Contrôle d'accès à l'inscription :** un code d'invitation **codé en dur côté client** (`code !== 'ONAIR2026'` dans `Login.jsx:39`) sert de "gate" — trivialement visible dans le bundle JS, aucune valeur de sécurité réelle, et non lié à une salle/organisation précise.
- **RLS Supabase :** activé sur les 5 tables SQL avec policies `auth.uid() = user_id` — correct pour isoler les données *d'un* utilisateur, mais **ne prévoit aucune notion de tenant/salle** : un membre ne peut voir que ses propres lignes, mais rien n'empêche structurellement un coach de la Salle A de voir (au niveau modèle, si une UI le permettait) les données d'un membre de la Salle B, puisque cette frontière n'existe pas en base.
- **Sécurité des clés API :** `ANTHROPIC_API_KEY` et `NINJA_API_KEY` sont bien côté serveur (fonctions Vercel `/api/*.js`), jamais exposées au client — **bonne pratique respectée**. En revanche `VITE_SUPABASE_ANON_KEY` est (normalement) publique par design Supabase, cohérent avec RLS.
- **Timeout de sécurité :** `AuthContext` a un timeout de 3s pour débloquer l'app si Supabase ne répond pas (évite l'écran blanc en cas de mauvaise config des env vars) — pragmatique mais masque silencieusement une éventuelle panne d'auth.

---

## 6. Dette technique et points de blocage

### 🔴 Bloquant pour l'ambition "SaaS marque blanche multi-salles"
1. **Aucune notion de tenant (`gym_id`)** dans le schéma SQL ni dans `user_metadata`. C'est le changement structurant n°1 à planifier avec l'architecte avant tout autre développement : ajouter une table `gyms`, une colonne `gym_id` sur `profiles`/`objectifs`/futures tables, et réécrire toutes les policies RLS en conséquence.
2. **Espace Coach 100% mocké**, aucune table de liaison coach↔membres. Il faut concevoir `coach_members` (ou une colonne `coach_id` sur `profiles`) et migrer `MOCK_MEMBERS` vers de vraies requêtes Supabase.
3. **Schéma SQL non exploité à 60%** : les tables `repas`, `seances`, `activite_jour` existent mais ne sont jamais lues/écrites — tout l'historique membre vit dans `localStorage`, donc **perdu au changement d'appareil/navigateur, non consultable par un coach, non exploitable pour des analytics**.
4. **Code d'invitation en dur** (`ONAIR2026`) — à remplacer par un système de codes par salle/organisation lié à la future table `gyms`.
5. **Pas de flow de création de compte coach** — à concevoir (invitation par admin, rôle attribué côté serveur plutôt que `user_metadata` modifiable côté client).

### 🟠 Dette technique générale
6. **Pas de TypeScript** — aucun typage sur les objets `appData`, `user`, réponses API. Risque d'erreurs silencieuses en grandissant (ex. `member.calories` vs `calories_jour` en snake_case côté SQL vs camelCase côté JS — incohérence de convention déjà présente).
7. **Pas de tests** (unitaires, intégration, e2e) — aucun filet de sécurité avant refactor.
8. **Logique métier + fetch + style inline mélangés dans les composants d'écran** (fichiers de 200-300 lignes avec styles JS inline massifs) — pas de couche `services/api` réutilisable, ce qui va compliquer le passage de `localStorage` vers Supabase pour chaque écran.
9. **Incohérence de nommage FR/EN** dans le schéma (`poids`, `taille`, `pas_jour` en SQL vs `weight`, `height`, `steps` en JS) — à trancher avant d'écrire la couche de mapping.
10. **`README.md` obsolète** : mentionne des comptes de test `coach@onair.fr` / `membre@onair.fr` qui n'existent plus (l'app utilisait un ancien système d'auth localStorage avant migration Supabase), et une variable `VITE_ANTHROPIC_API_KEY` qui n'est plus celle réellement utilisée (`ANTHROPIC_API_KEY` côté serveur aujourd'hui).
11. **Pas de migrations versionnées** — le schéma vit dans un seul fichier `.sql` à exécuter manuellement, aucun historique de changements, aucune CLI Supabase configurée (pas de dossier `supabase/`).
12. **`i18n` en un seul fichier de 506 lignes** (`LanguageContext.jsx`) — tenable pour 3 langues mais à surveiller si l'app grossit.
13. **Aucun TODO/FIXME explicite dans le code** — la dette n'est pas documentée inline, elle n'est visible qu'en auditant les écrans un par un (ce rapport comble ce manque).

### 🟢 Points sains à noter
- RLS correctement activé partout où des tables existent.
- Clés API sensibles bien isolées côté serveur.
- Design system CSS cohérent et centralisé (`global.css`, tokens `--accent`/`--glass`/etc.) — bonne base pour du theming multi-marque (variables déjà en place, il "suffirait" de les rendre dynamiques par tenant).
- Séparation claire des routes membre/coach au niveau du routeur.

---

## Recommandation de priorisation pour la suite (à challenger avec l'architecte)

1. **Concevoir le modèle multi-tenant** (`gyms`, `gym_id` partout, RLS par tenant) — préalable à tout le reste.
2. **Brancher `AppContext` sur Supabase** pour `repas`/`seances`/`activite_jour` (les tables existent déjà, "il suffit" de remplacer les appels `localStorage` par des `supabase.from(...)`).
3. **Remplacer `MOCK_MEMBERS`** par une vraie relation coach↔membres et des requêtes réelles.
4. **Sécuriser l'onboarding** : codes d'invitation par salle, attribution de rôle côté serveur (Edge Function ou trigger SQL plutôt que `user_metadata` libre).
5. **Persister la messagerie** (table `messages` + policies RLS coach/membre).

---
*Ce document a été généré par analyse statique du code source (aucune exécution de requêtes en base, aucun accès aux données de production).*
