# Journal de bord — VOLTA (ex ON AIR)

Journal tenu à la fin de chaque session de travail avec Claude. Sert de contexte de reprise pour la session suivante : ce qui a été fait, ce qu'il reste à faire, et un état des lieux honnête de l'app.

Entrées les plus récentes en haut.

**Pour reprendre dans une nouvelle session** : ouvre une session sur le repo (le nom de la branche de travail change à chaque session — vérifie celle en cours plutôt que de te fier à un nom figé ici), et demande à Claude de lire ce fichier avant de continuer — il contient tout l'historique et l'état d'avancement.

## 2026-08-06 — Session 18 (suite 34) : logo coupé (vrai bug), splash trop rapide, recettes "hasardeuses"

Retour utilisateur avec capture d'écran de l'icône iPhone : le petit carré doré (le "point" de la flèche) était visiblement rogné sur son coin. Root cause confirmée : `viewBox="0 0 24 24"` mais le `<rect>` du mark va jusqu'à x=24.3 — 0.3 unité hors du cadre, invisible en dev à l'œil nu sur un rendu 40-70px mais flagrant sur l'icône iPhone en grand. Corrigé partout où le mark apparaît (`public/logo-volta.svg`, `Logo.jsx`, `SplashIntro.jsx`) en élargissant le viewBox à `-1 -1 26 26` (marge symétrique de 1 unité, aucune coordonnée déplacée) — puis régénéré `icon-192.png`/`icon-512.png` avec le mockup HTML corrigé (les PNG utilisaient le même SVG rogné).

**Animation d'intro trop rapide** : la demande initiale ("présence et autorité") avait été traduite en ~1.5-2s, jugé "archi rapide" à l'usage réel. Ralenti significativement : mot VOLTA visible à 200ms (fondu 700ms), tracé de la flèche démarre à 1000ms et dure 1800ms (easing "expo-out" `cubic-bezier(.16,1,.3,1)`, plus posé qu'un ease symétrique), carré doré qui pop à 1500ms dans le tracé, fondu de sortie à 3200ms/420ms. Total ressenti ~3.6s.

**Recettes "hasardeuses" (ex. œufs brouillés + épinards en petit-déj)** : pas un bug au sens strict — nutritionnellement cohérent avec un budget protéiné/léger pour ce moment de la journée — mais le prompt ne donnait au modèle que calories/macros/type de repas, rien d'autre. Sans signal de variété ni de préférence, Haiku converge systématiquement vers la réponse "sûre". Deux corrections sans migration DB :
- Rotation aléatoire d'un `styleHint` (méditerranéen / asiatique / healthy US / rapide minimaliste / etc.) injecté dans le prompt de génération auto, avec consigne explicite d'éviter de retomber sur les mêmes plats.
- Nouveau champ `why` dans la réponse JSON (les 3 chemins : auto/photo/lien) — une phrase expliquant pourquoi cette recette précise colle aux besoins réels, affichée sous le titre dans l'UI. Rend le raisonnement visible au lieu de juste balancer un résultat.

**Pas fait, à discuter avec Arnaud si le problème persiste** : la vraie personnalisation profonde demanderait un champ "préférences alimentaires / allergies / plats détestés" dans le profil (Réglages), câblé dans le prompt — ça implique une migration DB + UI, pas fait ici en autonome vu l'ampleur.

**Vérifié dans le build compilé** : `grep viewBox:"-1 -1 26 26"` trouve le mark corrigé dans le JS ; icône PNG relue visuellement (Read tool) — carré entier, plus rogné ; règles CSS `1.8s cubic-bezier(.16,1,.3,1)` et le texte `inspiration méditerranéenne` / `why": "Une phrase courte` confirmés dans le build. Pas de navigateur réel dans ce bac à sable pour vérifier le timing perçu ni le rendu recette en conditions réelles — à confirmer par toi.

## 2026-08-06 — Session 18 (suite 33) : animation d'intro VOLTA sur Landing

Demande : "Volta apparait en premier puis on voit le tracé de la flèche qui vers le haut" — un écran de démarrage animé, avant l'accueil. Questions posées d'abord (portée, durée, skip), réponses retenues : uniquement sur Landing, ~1.5-2s, skippable au tap.

**Ce qui a été fait :**
- Nouveau `src/components/SplashIntro.jsx` + `src/styles/splash.css` : overlay plein écran fond `#0A0A0A`, séquence VOLTA (fondu, ~0.4s) → trait de la flèche qui se dessine (`stroke-dashoffset` sur le `<polyline>`, `pathLength="1"` pour un calcul de durée indépendant de la géométrie réelle) → petit carré doré qui pop en fin de trait → fondu de sortie de tout l'overlay (~1.75s au total, tap n'importe où = passage immédiat à la suite).
- Respecte `prefers-reduced-motion` : saute directement au logo complet, tenu ~300ms, pas de tracé animé.
- Intégré dans `Landing.jsx` uniquement (`showSplash` state, `SplashIntro` monté par-dessus le contenu réel qui, lui, continue de se monter et lancer ses propres timers d'entrée en dessous — pas de délai supplémentaire une fois l'overlay disparu).
- Rejoue à chaque arrivée sur Landing (pas de flag "vu une fois" en localStorage) — cohérent avec "quand on entre sur l'app", pas un splash unique au premier lancement seulement.

**Vérifié dans le build compilé** : `grep splash-overlay/splash-mark.drawing` trouve bien les règles CSS attendues dans le CSS compilé, le composant est bien bundlé dans le JS. Comme toujours, pas de navigateur dans ce bac à sable pour confirmer le rendu/timing réel — à valider par toi sur le lien de prod.

## 2026-08-06 — Session 18 (suite 32) : rebranding complet ON AIR → VOLTA

Nouveau nom, nouveau logo. Demande explicite : "Nouveau Logo et nouveau nom pour l'application. Maintenant c'est : VOLTA !", avec la charte Figma "Style Athlevo application" — mark zigzag ascendant + terminal carré doré, typo Unbounded extra-bold pour le wordmark, trois déclinaisons (icône seule / lockup icône+texte / wordmark seul).

**Ce qui a été fait :**
- Nouveau mark SVG (`public/logo-volta.svg`) : ligne brisée ascendante + petit carré plein en bout de trait (première tentative avait un coin en crochet façon icône "trending-up" classique — corrigée après 3 captures de référence plus nettes montrant un carré plein).
- Icônes PWA régénérées (`icon-192.png`, `icon-512.png`) via Chromium headless (pas de lib de rasterisation SVG dispo dans ce bac à sable) — fond dégradé radial sombre + mark doré centré, vérifié visuellement (Read tool) contre la référence.
- Nouveau composant `src/components/Logo.jsx` + `src/styles/brand.css` : gère les 3 déclinaisons de la charte (`variant="icon"`, `"wordmark"`, `"lockup"`, avec `orientation="row"|"column"` pour le lockup). Utilisé sur Landing (hero, lockup horizontal) et ResetPassword (lockup vertical, remplace l'ancien `<img src="/icon-onair.png">`).
- Police Unbounded (Google Fonts, poids 600-900) ajoutée dans `index.html`, appliquée uniquement à `.brand-wordmark` — pas de changement de police globale de l'UI.
- Renommage texte "ON AIR" → "VOLTA" dans tous les fichiers concernés : `LanguageContext.jsx` (9 chaînes fr/en/es), `AICoach.jsx` (message d'accueil + prompt système), `Onboarding.jsx`, `Dashboard.jsx`, `Messages.jsx`, `MemberDetail.jsx` (×2), `CoachDashboard.jsx`, `AppTour.jsx`, `Conversation.jsx`, `OnboardingTour.jsx`, `useGymConfig.js` (valeur par défaut), `manifest.json` (name/short_name), `index.html` (title, apple-mobile-web-app-title, favicon → `/logo-volta.svg`), `sw.js` (nom du cache + titre de notification push), `api/quote.js`, `api/cron/inactivity-nudge.js`, `package.json`, `README.md`.
- `CoachSettings.jsx` : le nom de salle affiché était en dur ("ON AIR Clichy") — câblé sur `useGymConfig()` (le hook white-label existant) au lieu d'un renommage bête en "VOLTA Clichy", ce qui règle un vrai bug au passage (le nom affiché ne reflétait jamais la vraie config de la salle).
- Nettoyage : suppression de `public/icon-onair.png`, `public/logo-onair.png`, `public/vite.svg` (plus référencés nulle part) et de `scripts/gen-icons.mjs` (script mort, dépendait de `canvas` — jamais dans les dépendances du projet — et dessinait encore l'ancien texte "ON AIR").

**Important — distinction conservée** : `useGymConfig()` reste un mécanisme *white-label* séparé (nom de la salle affiché, ex. pour un futur client autre que ce gym) — seul son fallback par défaut est devenu "VOLTA FITNESS". La marque de l'app elle-même (VOLTA, le logo, le titre) est maintenant codée en dur partout où c'était déjà le cas pour "ON AIR" — ce n'est pas passé par ce hook, cohérent avec l'architecture existante.

**Vérifié dans le build compilé** : `grep -o VOLTA dist/assets/*.js` trouve bien la marque ; `grep "ON AIR\|onair-app"` dans le JS compilé ne retourne plus rien ; `dist/index.html` a le bon titre, la bonne favicon et charge Unbounded. Comme d'habitude, je n'ai pas de navigateur dans ce bac à sable donc je n'ai pas pu vérifier visuellement le rendu réel des pages (juste les 2 icônes PNG, relues via le tool Read) — à confirmer par toi sur le lien de prod.

**Reste en attente** : tâche #27 "Direction visuelle futuriste premium" — pas encore confirmé si ce rebranding la couvre ou si c'est encore un chantier à part (à trancher avec Arnaud).

## 2026-08-06 — Session 18 (suite 31) : premier retour positif — Supadata confirmé fonctionnel + animation de chargement

**Confirmation en conditions réelles** : la génération de recette depuis un lien Reel fonctionne. Signalé comme lent (attendu — deux appels réseau séquentiels : transcript Supadata puis génération Claude).

### ✅ Animation de chargement (orbe + messages rotatifs)
"Génération en cours..." en texte plat remplacé par `.recipe-loading-orb` — même dégradé/pulsation que la sphère IA de la nav et l'orbe du mode vocal (`nutrition.css`), avec 3 messages qui tournent toutes les 1.8s ("Analyse en cours...", "Calcul des quantités...", "Presque prêt...") pour que l'attente plus longue du flux lien ne donne pas l'impression que l'app est figée/plantée.

Vérifié dans le CSS compilé avant de livrer.

---

## 2026-08-06 — Session 18 (suite 30) : vraie lecture vidéo via Supadata (API tierce)

Question directe : "comment je peux faire pour que la vidéo soit lue ? Le modèle est fiable ?" — expliqué que la version précédente (suite 29) ne lisait que la légende, pas la vidéo, et pourquoi (pas de pipeline téléchargement+audio+transcription dans l'app). Recherché 2-3 options réelles, l'utilisateur a choisi l'**API tierce payante**.

### ✅ Intégration Supadata (transcript vidéo réel)
[Supadata](https://supadata.ai) — API unifiée YouTube/TikTok/Instagram/X, transcript réel (parole → texte), free tier 100 requêtes/mois puis payant à l'usage. `api/recipe-from-link.js` l'appelle en priorité (`GET /v1/transcript?url=...&text=true&mode=auto`, header `x-api-key`), avec gestion du mode asynchrone (poll sur `jobId` si la vidéo est longue, borné pour rester dans le temps d'exécution de la fonction). **Repli automatique sur l'ancienne extraction de légende si `SUPADATA_API_KEY` n'est pas configurée** — la fonctionnalité continue de marcher (moins bien) sans configuration supplémentaire.

**⚠️ Action requise côté utilisateur, je ne peux pas la faire moi-même** : créer un compte sur supadata.ai, récupérer une clé API, et l'ajouter comme variable d'environnement `SUPADATA_API_KEY` dans les réglages du projet Vercel. Sans ça, le repli légende-seule reste actif silencieusement (pas d'erreur, juste moins fiable).

### Sur la fiabilité du modèle (réponse donnée, pas un changement de code)
Claude Haiku est fiable pour structurer un texte propre en JSON avec des garde-fous déjà en place (refuse d'inventer, champ "error" explicite) — mais les calories/macros restent une **estimation IA**, pas une valeur vérifiée en base contrairement à la recherche manuelle d'aliment (Open Food Facts). Positionné comme suggestion, pas comme source fiable à 100%.

Vérifié dans le build compilé avant de livrer — impossible de tester un vrai appel Supadata dans cet environnement (pas de clé API disponible ici), à confirmer une fois la clé configurée côté Vercel.

---

## 2026-08-06 — Session 18 (suite 29) : recette à partir d'un lien TikTok/Reel — dernier point de la liste de Myriam

"Reprend" — dernier point de la liste consignée en suite 26. La liste entière est maintenant traitée (7/9 en correctifs+features livrés, la direction visuelle reste explicitement pour après stabilisation).

### ✅ Recette à partir d'un lien TikTok/Reel — avec une vraie limite assumée
Nouvel `api/recipe-from-link.js` : extrait la légende de la vidéo (oEmbed public pour TikTok, scrape des meta tags `og:description`/`og:title` en repli, seul chemin possible pour Instagram faute d'un token Meta approuvé côté projet). **Pas de transcription vidéo/audio réelle** — ça ne fonctionne que si la recette est effectivement écrite dans la légende du post, ce qui est fréquent pour du contenu food mais pas garanti. Assumé explicitement plutôt que présenté comme une vraie analyse vidéo :
- Message d'attente honnête affiché avant même de lancer la génération ("Fonctionne seulement si la recette est écrite dans la légende").
- Si la légende est introuvable/trop courte, ou si l'IA juge qu'elle ne contient pas assez d'info pour une vraie recette, erreur claire plutôt qu'une recette inventée.
- Instagram en particulier sert souvent un texte générique ("X likes, Y commentaires") à une requête non connectée — limitation documentée dans le code, pas un bug.

Intégré au même flux que la photo (suite 28) : après le choix du repas, 3 options désormais — suggestion automatique / photo / lien.

Vérifié dans le CSS/build compilé avant de livrer, comme toujours — rendu réel et fiabilité de l'extraction TikTok/Instagram non vérifiables dans cet environnement (pas de vrai lien testé).

---

## 2026-08-06 — Session 18 (suite 28) : recette photo du frigo + 5 pages jamais rendues responsive

"On continue let's go" — recette à partir d'une photo, puis interruption avec une capture Landing sur grand écran : "pourquoi ce n'est pas responsive, quoi de compliqué à l'appliquer à toutes les pages ?"

### ✅ Recette à partir d'une photo du frigo/ingrédients
Le flux "Idée recette" a maintenant une étape intermédiaire après le choix du repas : suggestion automatique (comme avant) ou **depuis une photo**. Réutilise le pipeline vision déjà en place pour `Scan.jsx` (redécoupé en `utils/image.js` partagé) — la photo est envoyée à Claude avec le même budget calorique par repas que la suggestion auto (voir suite 27), et le prompt interdit explicitement d'inventer des ingrédients absents de la photo (renvoie une erreur claire plutôt qu'une recette qui nécessiterait d'aller faire des courses).

### 🐛 5 écrans jamais passés en responsive desktop — root cause trouvée
Landing, Login, ResetPassword, Onboarding et AppTour sont les seules routes de `App.jsx` qui ne passent ni par `MemberLayout` ni par `CoachLayout` — elles n'ont donc jamais reçu le traitement desktop que ces deux layouts appliquent (`member-shell`/`coach-shell` sur `#root`). Résultat visible sur une vraie capture : Landing plafonnée à 480px avec un immense vide noir de chaque côté sur grand écran, alors que le reste de l'app a été corrigé sur ce point plusieurs fois cette session. Corrigé avec exactement le même mécanisme : nouveau `PublicLayout.jsx` (classe `public-shell` sur `#root`), et `public.css` qui élargit et centre le bon conteneur pour chacun des 3 wrappers différents utilisés par ces 5 écrans (`.app-wrapper`, `.onboarding-screen`, `.landing`).

Vérifié dans le CSS compilé avant de livrer — rendu réel toujours non vérifiable dans cet environnement, ce changement touche les toutes premières pages qu'un visiteur voit donc à confirmer en priorité.

---

## 2026-08-06 — Session 18 (suite 27) : traitement de la liste de Myriam — 6 points sur 9 faits

"On commence let's go" — attaque de la liste consignée en suite 26, dans l'ordre annoncé. Les 2 fonctionnalités les plus lourdes (photo frigo, import TikTok/Reel) sont délibérément laissées pour une prochaine session dédiée plutôt que bâclées ici.

### ✅ Coach IA "ne répond pas" — root cause trouvée (logs Vercel)
`get_runtime_logs` : seulement 4 appels à `/api/claude` sur 7 jours, tous 200 — pas de panne serveur. En creusant le texte du tour d'inscription (`AppTour.jsx`), trouvé la vraie cause : la 5e slide décrivait encore l'ancien FAB unique ("le bouton en bas à droite ouvre le Coach IA ou la messagerie"), périmée depuis que Coach IA a été déplacé dans la sphère de la nav (suite 20) — le FAB restant n'ouvre plus QUE la messagerie humaine. Myriam a très probablement suivi cette instruction, tapé le bouton en bas à droite en s'attendant à l'IA, atterri dans la conversation avec le coach humain (qui ne répond évidemment pas en temps réel). Corrigé le texte du tour + celui d'`OnboardingTour.jsx` pour pointer vers la bonne sphère.

### ✅ Réglages n'affichait pas le vrai profil (bug confirmé, corrigé)
`Settings.jsx` initialisait `weight:'78', height:'180'` en dur et ne chargeait jamais `profiles.poids/taille`. Corrigé : chargement réel au montage + **ajout d'un bouton "Enregistrer" qui n'existait pas du tout** pour la carte Profil (elle avait des champs éditables qui ne sauvegardaient jamais rien, même bug de fond que les objectifs avant leur propre correctif).

### ✅ Refonte du budget calorique — BMR + activité réelle (façon Yazio)
Le point le plus gros de la liste. Nouveau `src/utils/metabolism.js`, centralisant ce qui était avant un calcul à usage unique dans `Onboarding.jsx` :
- **BMR (Mifflin-St Jeor)** à partir de poids/taille/âge réels — l'âge n'était jamais collecté avant (colonne `profiles.age` existait déjà en base, jamais utilisée) : ajouté comme 3e champ à l'étape "Ton corps" de l'inscription.
- **Objectifs multiples** : l'étape objectif passe de choix unique à sélection multiple ; le multiplicateur calorique moyenne les objectifs sélectionnés au lieu de n'en retenir qu'un.
- **Budget quotidien réellement dynamique** : `dailyRemainingCalories()` ajoute maintenant les calories brûlées par l'activité *réelle* du jour (pas + course, ~0.045 kcal/pas et ~1 kcal/kg/km couru) au budget de base, avant de soustraire ce qui a été mangé — recalculé en direct, pas figé à l'inscription. Affiché sur les cartes calories de Dashboard et Nutrition ("dont +XXX activité" quand pertinent), et la barre de progression suit le même dénominateur.
- **Corrige aussi le bug des idées recette à ~1000 kcal pour un snack** (root cause déjà identifiée en suite 26) : `generateRecipe()` utilise maintenant ce vrai budget restant, plafonné/planchonné **par type de repas** (collation : 100-300 kcal, repas complet : 250-700 kcal) au lieu d'une fourchette 300-1000 identique pour tout.
- Musculation pas encore incluse dans le calcul de dépense (pas de signal fiable durée/intensité par séance dans `appData` aujourd'hui) — steps + course couvrent l'exemple concret demandé ("2h de marche = 600 kcal").

### ✅ Contraste — deux correctifs
- "Idée recette" (carte teaser + contenu généré) : classes `.text-primary` explicites ajoutées partout où le texte reposait uniquement sur l'héritage CSS plutôt qu'une règle scoped garantie — pas pu reproduire le "noir sur noir" exact avec certitude depuis le code seul (pas de capture de cet écran précis), donc correctif défensif plutôt qu'un diagnostic confirmé à 100%. À reconfirmer si toujours cassé après ce correctif.
- `--surface` (dark) : `#1A1A1A` → `#232120`, trop proche de `--bg` (#0A0A0A) pour se distinguer ("ton sur ton" sur les cartes du Bilan, capture réelle à l'appui) — impact large intentionnel : ce token est utilisé par `.card` partout dans l'app (Réglages, tuiles CoachDashboard, lignes de messages...), pas seulement Bilan. `--border`/`--border-strong` légèrement renforcées en même temps.

### ⏳ Pas fait cette fois — pour une prochaine session dédiée
- **Recette à partir d'une photo du frigo** : faisable en réutilisant le pipeline vision déjà utilisé par `Scan.jsx`, mais mérite sa propre session plutôt qu'être casée en fin de batch.
- **Recette à partir d'un lien TikTok/Reel** : nettement plus dur — pas de pipeline de transcription vidéo dans l'app aujourd'hui. Piste réaliste : récupérer la légende/description de la vidéo (souvent la recette y est déjà écrite) plutôt qu'une vraie analyse vidéo/audio, à valider avec l'utilisateur avant de se lancer vu la complexité.
- Direction visuelle futuriste premium — explicitement pour après, non prioritaire.

⚠️ Comme toujours, rien de tout ça n'a été vérifié à l'écran (pas d'outil de rendu ici) — le changement `--surface` en particulier a un rayon d'impact large (tout l'app en thème sombre), à confirmer en priorité au prochain retour.

---

## 2026-08-06 — Session 18 (suite 26) : retour d'un vrai premier utilisateur (Myriam, amie du coach, vient de s'inscrire) — liste à traiter

⚠️ **Pas encore traité — étape 1 demandée explicitement : consigner ici avant de toucher au code.** La liste ci-dessous vient d'un vrai nouveau membre qui vient de s'inscrire, pas d'une capture générique. À reprendre dans l'ordre à la prochaine session, en commençant par les bugs confirmés (root cause déjà identifiée en relisant le code pendant qu'on consignait) puis les demandes de fond.

### 🐛 Bugs confirmés (root cause déjà trouvée dans le code)

1. **Le profil saisi à l'inscription n'est pas repris dans Réglages.** Myriam a entré 65kg / 1m60 à l'inscription, Réglages affiche 78kg / 1m80. Root cause trouvée : `Settings.jsx` initialise `profile` avec des valeurs **en dur** (`weight: '78', height: '180'`) au lieu de charger `profiles.poids`/`profiles.taille` depuis Supabase — les vraies valeurs saisies existent bien en base (l'onboarding les enregistre), Réglages ne les lit juste jamais.

2. **Les idées recette se calent systématiquement près de 1000 kcal, même pour une collation.** Root cause trouvée dans `Nutrition.jsx generateRecipe()` : `remainingKcal = Math.min(1000, Math.max(300, calorieGoal - calories))` — cette formule est **identique quel que soit le type de repas choisi** (Petit-déjeuner/Déjeuner/Dîner/Collation n'ont aucune incidence). Testé tôt dans la journée avec peu de calories déjà consommées → le calcul retombe quasi toujours sur le plafond de 1000, y compris quand on demande explicitement un snack. Il faut un budget par type de repas (une collation ne devrait jamais monter à 1000 kcal par définition).

### 🐛 Bugs à investiguer (pas encore de root cause)

3. **Coach IA qui ne répond pas.** Myriam a essayé de lui parler, aucune réponse. À vérifier en priorité — potentiellement lié aux changements récents (tool-use ajouté en suite 19), à une question de rôle/accès, ou à autre chose. Pas assez d'info pour diagnostiquer sans repro.

### 🎨 Lisibilité / contraste

4. **"Idée recette" — texte noir sur fond noir**, illisible (écran séparé du bug #2, celui-ci purement visuel).
5. **Écran Bilan (capture "Photo 1") — trop sombre, ton sur ton.** Les cartes SOMMEIL MOY./KM COURUS/PAS et la carte "Mes charges" (placeholder "pas assez de séances") sont en `.card` standard (`--surface` #1A1A1A sur `--bg` #0A0A0A) — un contraste très faible entre carte et fond, aggravé visuellement par le nouveau fond animé (suite 25) qui reste discret par design. À revoir : soit remonter `--surface`, soit ajouter une bordure plus visible sur ces cartes secondaires.

### 🍽️ Nutrition — refonte demandée (fond, pas juste un patch)

6. **Objectif multiple à l'inscription.** Le questionnaire ne permet qu'un seul choix (Perte de poids / Prise de masse / Nutrition / Performance) alors qu'un membre peut cumuler plusieurs objectifs à la fois → passer en sélection multiple.

7. **Calcul calorique bien plus précis et personnalisé, sur le modèle Yazio :**
   - Calculer le **métabolisme de base (BMR)** à partir des vraies métriques (poids/taille — déjà collectées à l'inscription, âge/sexe à ajouter si besoin pour une formule correcte type Mifflin-St Jeor) → donne le minimum calorique du membre au repos total (exemple donné : 1400 kcal pour Myriam).
   - Faire remonter les calories dépensées par l'activité réelle du jour (pas, course, séance) pour **ajouter** dynamiquement au budget calorique restant du jour — aujourd'hui `calorieGoal` est un chiffre fixe saisi une fois, jamais recalculé selon l'activité réelle.
   - Relier ce vrai "reste calorique du jour" (BMR + dépense d'activité − déjà mangé) à la génération de recette IA, à la place du calcul actuel — directement lié au bug #2 ci-dessus : avec un vrai budget par repas, l'IA arrêterait de proposer des collations à 1000 kcal.

8. **Idée — recette à partir d'une photo du frigo/des ingrédients disponibles.** Prendre en photo ce qu'on a sous la main (ex: blanc de poulet + sauce tomate + oignons + riz) → l'IA propose une recette avec exactement ça, quantités adaptées aux objectifs. Évite l'friction "il faut aller acheter des ingrédients qu'on n'a pas".

9. **Idée — lien TikTok/Reel Instagram → recette décodée.** Coller un lien de vidéo recette, l'IA en extrait les ingrédients/quantités et les adapte aux objectifs du membre.

### 🎨 Direction visuelle (après stabilisation des fonctionnalités)

10. Une fois les points ci-dessus traités et vérifiés : explorer une direction plus **futuriste, univers sport sombre mais premium** — explicitement noté comme secondaire par l'utilisateur ("faut d'abord stabiliser les features"), pas à faire avant le reste.

---

## 2026-08-06 — Session 18 (suite 25) : fond animé (motion manquant retrouvé) + première proposition d'ondes IA

L'utilisateur n'a pas l'image de référence "ondes/fréquence" sous la main — proposition d'un premier essai en attendant. Il rappelle aussi avoir demandé un fond animé ("motion dynamic") jamais vu.

### 🐛 Root cause du fond jamais animé
`#root::before` contenait les deux dégradés (or + violet) dans un seul `background` shorthand statique — un `background` combiné comme ça ne peut pas être animé par dégradé individuellement, seule la transformation/opacité de l'élément entier peut l'être. Résultat : la demande de mouvement, faite plus tôt, n'avait tout simplement jamais pu être satisfaite avec cette structure, quel que soit ce qui a été tenté depuis. Corrigé : séparé en `::before` (tache or) + `::after` (tache violette), chacune dérivant lentement et indépendamment (`translate`+`scale`+`opacity`, 24s/29s, `prefers-reduced-motion` respecté).

### 🚀 Première proposition — ondes autour de la sphère IA
Sans l'image de référence, ajouté deux anneaux qui pulsent et s'estompent en sortant de la sphère de la nav (façon ping sonar/fréquence), décalés d'un demi-cycle. Explicitement un premier jet, à retravailler dès que l'image de référence arrive.

Vérifié dans le CSS compilé avant de livrer — comme toujours, rendu réel non vérifiable dans cet environnement.

---

## 2026-08-06 — Session 18 (suite 24) : icône Salle méconnaissable + "API indisponible" en boucle sur Entraînement

Deux captures d'écran de la bibliothèque d'exercices : "Pourquoi l'API est indisponible ? L'icône pour la partie salle c'est quoi ça ??"

### 🐛 Icône "Salle" illisible
C'était une checklist abstraite (barres + points) — illisible à cette taille, contrairement à la maison (Maison) et au personnage qui court (Dehors). Remplacée par une silhouette d'haltère, sans ambiguïté pour une section musculation.

### 🐛 "API indisponible" — root cause trouvée via les logs Vercel
Vérifié `get_runtime_logs` : toutes les requêtes `/api/exercises` récentes renvoient **200**, donc pas de clé API manquante. Le vrai problème : `api/exercises.js` renvoyait toujours `res.status(200)` **quel que soit le statut réel** de l'API tierce (API Ninjas) — un 429 (quota dépassé) ou une erreur embarquée dans un corps 200 remontait invisible dans nos propres logs, alors que `useExercises.js` détectait bien l'erreur côté client et affichait le message de repli. Corrigé : le vrai statut est maintenant transmis. Cause probable du quota dépassé : jusqu'à **18 requêtes séquentielles** envoyées d'un coup rien que pour "Salle" (6 groupes musculaires × 3 pages) — réduit à 12 (2 pages), et surtout rendu résilient : avant, une seule requête ratée sur 18 jetait tout ce qui avait déjà été récupéré ; maintenant chaque page est indépendante, une page ratée n'enlève que ses ~5 exercices au lieu de vider toute la catégorie.

---

## 2026-08-06 — Session 18 (suite 23) : graphiques ajoutés au tableau de bord coach

Retour après la doc : côté coach, "ça ne ressemble vraiment à un SaaS" — le tableau de bord n'avait que 4 tuiles chiffrées + des listes, aucun vrai graphique.

### ✅ Deux graphiques ajoutés à CoachDashboard
- **Activité de la salle — 7 jours** : nouveau `fetchGymWeeklyActivity()` dans `coachStats.js` (2 requêtes, agrège séances + activité de tous les membres jour par jour), rendu en barres façon Bilan mais à l'échelle de la salle entière, pas d'un seul membre.
- **Répartition des membres** : barre segmentée ON TRACK / AT RISK / INACTIVE (statuts déjà calculés, juste jamais visualisés) avec légende et compteurs.

Violet plutôt que or pour ces deux cartes — cohérent avec le reste de l'identité côté coach vs le gold côté membre. MemberDetail avait déjà des vrais graphiques (barres séances + courbes de charges SVG) ; le manque était spécifiquement sur l'écran d'accueil coach.

---

## 2026-08-06 — Session 18 (suite 22) : double didacticiel corrigé, doc complète demandée

En préparant la documentation demandée par l'utilisateur, découvert en relisant `App.jsx` qu'un tunnel d'onboarding existait déjà avant mon `OnboardingTour.jsx` (suite 19) : `/onboarding` (questionnaire profil à l'inscription) puis `/welcome` → `AppTour.jsx` (tour en 5 écrans), déclenchés une fois via les flags `onair_just_registered`/`onair_show_tour`. Je n'avais pas vu ces deux écrans en construisant le didacticiel — un nouveau membre aurait donc vu **les deux** tours à la suite (AppTour puis, en arrivant sur Dashboard, mon overlay). Corrigé : `AppTour.finish()` marque maintenant aussi le flag `ob_seen_member_<userId>` d'`OnboardingTour`, donc un nouveau membre ne voit que le tour d'inscription (le plus adapté, avec le nom/objectif déjà renseignés) ; les membres existants qui n'ont jamais eu de tour continuent de voir `OnboardingTour` normalement.

---

## 2026-08-06 — Session 18 (suite 21) : animation d'entrée sur toutes les pages, sphère IA, bug de chevauchement FAB/mic

### 🐛 Régression immédiate : bouton "Mon Coach" chevauchant le micro sur AI Coach
En simplifiant le FAB (suite 20), j'ai retiré `/ai-coach` de la liste des routes où il se cache, en supposant à tort que ce n'était plus nécessaire puisque Coach IA n'y menait plus. Faux : c'est une collision de **position** (le FAB est en `bottom:96px, right:16px`, exactement sur la zone du micro/envoi d'AICoach), pas de pertinence — screenshot réel à l'appui. Remis `/ai-coach` dans `hideFAB`.

### ✅ Animation d'entrée appliquée à toutes les pages
`.card-animated`/`.screen-header` (fade+slide au montage, `src/styles/animations.css`) existaient déjà mais seulement sur Workout/Sleep/Hydration/ClientsList/WorkoutLibrary/Weekly/MemberDetail (partiellement). Étendu à Dashboard, Nutrition (carte calories, idée recette, ligne repas, sheets), Settings, CoachSettings, CoachDashboard (stats/alertes/liste membres), CoachMessages, Messages, et le reste de MemberDetail — avec un stagger cohérent (`--delay` croissant), plafonné sur les listes longues pour éviter un dernier élément qui apparaît plusieurs secondes après. `screen-header` (déjà une classe générique animée) ajoutée aux 4 écrans qui ne l'utilisaient pas encore (Dashboard, Weekly, Workout, Scan).

### ✅ Icône IA remplacée par une sphère (comme le mode vocal)
Le robot en ligne (stroke-icon) ajouté en suite 20 jugé "horrible"/"trop basique" par comparaison directe avec l'orbe du mode vocal. Remplacé : le bouton central de la nav utilise maintenant exactement le même dégradé radial que `.voice-mode-orb` (voicemode.css), sans aucune icône dessus — la sphère elle-même est l'indicateur IA, pas un pictogramme sur un fond doré plat.

Vérifié dans le CSS compilé (`grep` sur `dist/assets/*.css`) avant de livrer, comme d'habitude — mais rien de tout ça n'a été vu à l'écran, à confirmer au prochain retour.

---

## 2026-08-06 — Session 18 (suite 20) : Coach IA déplacé dans la nav, "Revoir le didacticiel"

Juste après la suite 19 : l'utilisateur trouve que le bouton flottant Coach IA prend trop de place côté membre, et veut checker le nouveau didacticiel sur son propre compte.

### ✅ Coach IA déplacé dans la nav bar, à la place du "+"
Le bouton flottant latéral (`fab-container` de `MemberLayout.jsx`) proposait "Coach IA" + "Mon Coach" dans un petit menu. Retiré : "Coach IA" est maintenant directement le bouton central élevé de la nav (à la place du "+", icône robot), "Mon Coach" reste seul sur le FAB latéral simplifié (un seul bouton direct, plus de menu à déplier). Le "+" ouvrait aussi un mini-menu "Nouveau repas"/"Nouvel exercice" — retiré sans perte réelle : "Nouveau repas" reste à un tap via le propre FAB de Nutrition, et un exercice isolé peut maintenant être loggé en le disant simplement au Coach IA (outil `log_quick_exercise` ajouté en suite 19).

### ✅ "Revoir le didacticiel" dans Réglages (membre + coach)
Impossible de réinitialiser le flag `ob_seen_*` du navigateur d'un utilisateur à distance — ajouté un bouton dans Réglages qui l'efface pour son propre compte et relance le tour immédiatement (navigation forcée en dur, nécessaire car `OnboardingTour` reste monté dans le layout et ne se remonte pas sur un simple changement de route react-router).

⚠️ Pas vérifié visuellement — l'icône robot dans la nav et le tour relancé via Réglages sont à confirmer en priorité au prochain retour.

---

## 2026-08-06 — Session 18 (suite 19) : bug de saisie nutrition, garde-fous anti-valeurs aberrantes, suppression de compte, didacticiel d'accueil, et premières actions concrètes de l'IA

L'utilisateur signale 4 choses en une fois sur une capture AI Coach : la barre du bas toujours étroite, veut démarrer le chantier des actions IA, veut un didacticiel d'accueil + suppression de compte, et signale une valeur de calories aberrante + un bug de saisie sur la quantité en Nutrition. Demande de prioriser.

### 🐛 Barre de saisie du Coach IA toujours étroite — résidu du 390px
`maxWidth: 358` codé en dur dans `AICoach.jsx` (= ancien plafond `#root` 390px − 32px de marge), jamais mis à jour quand le plafond global est passé à 480px la session précédente — c'était le seul endroit qui restait visiblement plus étroit que le reste de l'écran. Corrigé : `448` (= 480 − 32).

### 🐛 Bug de saisie confirmé — quantité (grammage) en Nutrition
Root cause trouvée : le champ grammage de l'étape 2 clampait la valeur à **chaque frappe**. Effacer "100" pour taper "200" passe par un état intermédiaire vide → `parseInt('')` → NaN → clamp retombe direct sur 1g, ce qui casse la saisie à chaque fois qu'on essaie de retaper une valeur perso. Corrigé en état texte libre, clampé seulement au calcul de l'aperçu et à la sauvegarde (`onBlur`) — même schéma que le champ grammage de "Modifier un repas", qui lui n'avait jamais eu ce problème.

### 🛡️ Garde-fou anti-valeurs aberrantes (ex: 222002656161 kcal)
Impossible de reproduire l'origine exacte dans le code actuel — les points de saisie existants (Scan, quantité Nutrition) étaient déjà bornés. Plutôt que de chasser un symptôme non reproductible, ajouté un verrou au point d'écriture central : `addMeal()` dans `AppContext.jsx` clampe désormais calories/macros avant tout insert, quel que soit l'écran ou la fonctionnalité qui l'appelle (ajout manuel, scan, recette IA, ou les nouvelles actions IA ci-dessous) — un seul endroit à garder juste au lieu de chaque champ. Même filet de sécurité ajouté sur les writes eau/pas/course/sommeil (`activite_jour`).

### ✅ Suppression de compte (Réglages, membre + coach)
Nouveau composant partagé `DeleteAccountButton.jsx` + endpoint `/api/delete-account` (clé service role, ne peut supprimer QUE le compte de l'appelant — identité résolue depuis son propre token, jamais un id passé en paramètre). Confirmation par saisie du mot "SUPPRIMER" avant tout appel, vu le caractère irréversible. La suppression du compte `auth.users` cascade automatiquement sur toutes les tables (déjà `on delete cascade` dans le schéma) — profils, repas, séances, objectifs, etc. effacés en un seul appel.

### ✅ Didacticiel d'accueil
`OnboardingTour.jsx` — overlay en bas d'écran, 4-5 slides, contenu différent membre/coach, affiché une seule fois **par compte réel** (pas par appareil — utile sur une tablette de salle partagée) au premier login, "Passer" toujours disponible.

### 🚀 Premier chantier des actions concrètes de l'IA — démarré
Tool-use Anthropic ajouté au Coach IA (`AICoach.jsx` + `api/claude.js`, qui proxyait déjà le body tel quel donc aucun changement serveur nécessaire). 6 outils pour une v1 utile plutôt qu'exhaustive : `log_water`, `log_steps`, `log_km_run`, `log_sleep`, `add_meal`, `log_quick_exercise`. L'IA peut maintenant écrire réellement dans les données à partir d'une phrase orale ou écrite ("j'ai bu 500ml", "ajoute une salade de 400 kcal au déjeuner", "j'ai fait 8000 pas") et confirme en une phrase avec le chiffre exact enregistré. Boucle de résolution d'outils côté client (jusqu'à 4 allers-retours), chaque écriture repasse par les fonctions AppContext existantes (donc par les mêmes garde-fous anti-valeurs aberrantes ci-dessus).
Volontairement pas dans cette v1 : séance complète, modification des objectifs, suppression de données — à étendre selon l'usage réel plutôt que de tout construire d'un coup.

⚠️ Rien de tout ça n'a été vérifié visuellement (pas d'outil de rendu dans cet environnement) — à tester en priorité : la saisie de grammage en Nutrition (le bug initial), la suppression de compte (tester avec un compte de test, pas un vrai), et une action vocale/texte à l'IA (ex: "j'ai bu 500ml").

---

## 2026-08-06 — Session 18 (suite 18) : root cause "toujours trop étroit" trouvée (vrai téléphone cette fois) + ton de l'IA corrigé

Capture d'écran d'un vrai téléphone (statusbar iOS, batterie/réseau) sur AI Coach : l'utilisateur signale que c'est "toujours le même problème" — trop étroit.

### 🐛 `#root` plafonné à 390px, sans condition, même sur mobile
Root cause enfin trouvée : `#root { max-width: 390px }` dans `global.css` était un plafond **fixe et inconditionnel**, appliqué à absolument toutes les tailles d'écran — y compris les vrais téléphones. Beaucoup de téléphones actuels ont une largeur logique **supérieure** à 390px (iPhone Pro Max/Plus ~428-430px, pas mal d'Android 400-480px) : sur ces appareils précis, l'app perdait de la place des deux côtés **nativement sur mobile**, pas seulement en desktop — ce qui explique le "toujours le même problème" alors que les correctifs précédents ne visaient que le desktop (`>=900px`).

**Corrigé** : plafond remonté à `480px` (couvre confortablement les téléphones actuels). Harmonisé sur toutes les feuilles modales qui utilisaient la même valeur en dur (`nav.css`, `dashboard.css`, `ExerciseModal.css`, `Settings.jsx`, `Nutrition.jsx` ×3, `BottomNav.jsx`) pour rester cohérent avec le contenu.

⚠️ Changement plus large que les précédents (touche `#root` sans condition, donc chaque écran à chaque taille) — à confirmer en priorité sur le prochain retour visuel.

### ✅ Ton de l'IA corrigé — trop familier avant
Le prompt système de `AICoach.jsx` demandait explicitement "parle comme un pote", donnait des exemples avec "mec" et "mode beast", encourageait les blagues — exactement ce que montrait la capture ("Ah mec, j'aimerais bien..."). Remplacé par des instructions de ton professionnel : direct, motivant, chaleureux mais sans familiarité ni surnoms.

### 💡 Demandé mais pas fait — actions concrètes de l'IA (remplir nutrition/entraînement à l'oral)
L'utilisateur veut que l'IA puisse **agir** sur les données de l'app (ajouter un repas, logger une séance) à partir de ce qui est dit à l'oral/à l'écrit, pas seulement suggérer. Nécessite du function calling côté `api/claude.js` (schémas d'outils, exécution des écritures Supabase réelles, confirmation à l'utilisateur) — un vrai chantier, pas une correction rapide. Volontairement pas commencé cette session : l'utilisateur a explicitement priorisé le problème d'écran et le ton de l'IA avant ("mais arrange en prio..."). À reprendre et cadrer avec l'utilisateur à la prochaine session.

---

## 2026-08-06 — Session 18 (suite 18) : root cause "toujours trop étroit" trouvée (vrai téléphone cette fois) + ton de l'IA corrigé

Capture d'écran d'un vrai téléphone (statusbar iOS, batterie/réseau) sur AI Coach : l'utilisateur signale que c'est "toujours le même problème" — trop étroit.

### 🐛 `#root` plafonné à 390px, sans condition, même sur mobile
Root cause enfin trouvée : `#root { max-width: 390px }` dans `global.css` était un plafond **fixe et inconditionnel**, appliqué à absolument toutes les tailles d'écran — y compris les vrais téléphones. Beaucoup de téléphones actuels ont une largeur logique **supérieure** à 390px (iPhone Pro Max/Plus ~428-430px, pas mal d'Android 400-480px) : sur ces appareils précis, l'app perdait de la place des deux côtés **nativement sur mobile**, pas seulement en desktop — ce qui explique le "toujours le même problème" alors que les correctifs précédents ne visaient que le desktop (`>=900px`).

**Corrigé** : plafond remonté à `480px` (couvre confortablement les téléphones actuels). Harmonisé sur toutes les feuilles modales qui utilisaient la même valeur en dur (`nav.css`, `dashboard.css`, `ExerciseModal.css`, `Settings.jsx`, `Nutrition.jsx` ×3, `BottomNav.jsx`) pour rester cohérent avec le contenu.

⚠️ Changement plus large que les précédents (touche `#root` sans condition, donc chaque écran à chaque taille) — à confirmer en priorité sur le prochain retour visuel.

### ✅ Ton de l'IA corrigé — trop familier avant
Le prompt système de `AICoach.jsx` demandait explicitement "parle comme un pote", donnait des exemples avec "mec" et "mode beast", encourageait les blagues — exactement ce que montrait la capture ("Ah mec, j'aimerais bien..."). Remplacé par des instructions de ton professionnel : direct, motivant, chaleureux mais sans familiarité ni surnoms.

### 💡 Demandé mais pas fait — actions concrètes de l'IA (remplir nutrition/entraînement à l'oral)
L'utilisateur veut que l'IA puisse **agir** sur les données de l'app (ajouter un repas, logger une séance) à partir de ce qui est dit à l'oral/à l'écrit, pas seulement suggérer. Nécessite du function calling côté `api/claude.js` (schémas d'outils, exécution des écritures Supabase réelles, confirmation à l'utilisateur) — un vrai chantier, pas une correction rapide. Volontairement pas commencé cette session : l'utilisateur a explicitement priorisé le problème d'écran et le ton de l'IA avant ("mais arrange en prio..."). À reprendre et cadrer avec l'utilisateur à la prochaine session.

---

## 2026-08-06 — Session 18 (suite 17) : dictée vocale pour le Coach IA

L'utilisateur a demandé de pouvoir dicter les messages au Coach IA, avec une référence visuelle (app santé "Docuverse" : écran plein écran, orbe animée, transcript en direct, bouton d'enregistrement).

### ✅ Mode vocal — nouveau, `VoiceMode.jsx`
Overlay plein écran déclenché par un bouton micro à côté du champ de saisie sur `AICoach.jsx` (bouton **non affiché** si le navigateur ne supporte pas la reconnaissance vocale — `src/utils/speech.js`, Web Speech API, non polyfillable, absente sur Firefox et inégale sur Safari iOS — pour ne jamais proposer un bouton qui ne ferait rien).
- Orbe animée en dégradé or/violet (pulsation pendant l'écoute), transcript en direct (texte final + interim en gris), bouton clavier pour revenir à la saisie texte, bouton d'envoi central.
- **Style adapté, pas copié** : la référence est une app santé en thème clair menthe/blanc — repris le langage d'interaction (orbe + transcript + gros bouton d'envoi) avec la palette sombre or/violet propre à ON AIR, même raisonnement que le rebrand Athlevo plus tôt (adapter l'esprit, pas copier une marque tierce).
- Gestion d'erreur : micro refusé, reconnaissance indisponible, échec de démarrage — chacun avec un message clair plutôt qu'un échec silencieux.
- Au clic sur "Envoyer" : arrête la reconnaissance et envoie directement le texte transcrit comme message au Coach IA (pas de repassage par le champ texte, envoi direct).

Pas encore vérifié visuellement — l'orbe et l'animation en particulier mériteraient un retour utilisateur.

---

## 2026-08-06 — Session 18 (suite 16) : nav bar — bloc noir derrière + reste trop petite sur grand écran

Nouvelle capture d'écran (Bilan, desktop) : le contenu remplit bien mieux l'écran maintenant. Deux problèmes distincts sur la nav repérés par l'utilisateur.

### 🐛 Bloc noir visible derrière la nav bar
`.bottom-nav` avait `background: var(--bg)` — un rectangle plein de 390px de large, même couleur que le fond de la page. Sur mobile, invisible (le rectangle ≈ toute la largeur visible). Sur grand écran, avec le fond de page maintenant un dégradé qui s'étend sur toute la largeur, ce même rectangle plein forme un "trou" plat visible juste derrière la pilule de nav — c'est le "bloc noir" vu par l'utilisateur. La pilule (`.nav-pill`) a déjà son propre fond opaque, ce conteneur extérieur n'avait pas besoin d'en avoir un. Corrigé : `background: transparent`.

### 🐛 La nav restait à 390px alors que le contenu s'est élargi
Choix volontaire de la suite 13/15 (ne pas toucher à la nav, historique de 3 redesigns ratés) — mais une fois le contenu élargi, une pilule à 390px sous une carte à 720px donne l'impression que la nav est restée "petite" plutôt que délibérément dimensionnée. Élargie pour suivre le contenu, **structure et icônes toujours non touchées** :
- Membre : `min(90vw, 720px)` (même valeur que le contenu).
- Coach : `720px` fixe (pas les 1600px du contenu — une pilule à 4-5 icônes étirée sur 1600px aurait l'air complètement vide, pas "responsive").

Vérifié dans le CSS compilé avant de livrer.

---

## 2026-08-06 — Session 18 (suite 15) : rebrand confirmé bon visuellement + contenu membre trop étroit sur grand écran

Première vraie capture d'écran du rebrand depuis l'utilisateur (Dashboard + Nutrition, desktop et mobile). **Bonne nouvelle : le style or/bleu-violet fonctionne bien** — cartes en dégradé lisibles, icônes circulaires, boutons corrects. Tous les calculs de contraste faits à l'aveugle cette session se confirment à l'œil.

### 🐛 `.app-wrapper` plafonné à 560px fixe — trop étroit sur grand écran
Même symptôme que le premier essai côté coach (une colonne étroite flottant dans un grand vide noir), cause différente cette fois : le fond lui-même remplit bien tout l'écran (le correctif `position:absolute` de la suite 13 fonctionne), c'est le **contenu** qui était plafonné trop bas. Corrigé avec la même leçon déjà payée côté coach : plafond fluide au lieu d'un plafond fixe — `max-width: min(90vw, 720px)` au lieu de `560px` fixe. Volontairement moins large que le coach (1600px) : les écrans membre sont une pile de cartes uniques, pas des grilles de type liste, donc pas besoin d'autant d'espace.

Vérifié dans le CSS compilé avant de livrer.

### Reste à valider
- Le thème clair (jamais montré dans la maquette d'origine, toujours pas vérifié visuellement).
- Le rendu du nouveau plafond fluide (720px) sur le prochain retour visuel.

---

## 📍 État au 2026-08-06 (fin de session 18) — à lire en premier

Tout ce qui suit dans cette entrée et les entrées d'en dessous a été fait et est **mergé sur `claude/charming-mendel-dj1GQ`** (vérifié avant de clore la session — plus de PR en attente, working tree propre).

**Fait dans cette dernière partie de session, dans l'ordre :**
1. Bug du fond décoratif décentré sur grand écran — trouvé et corrigé (`position: fixed` → `position: absolute` sur `#root::before`).
2. Responsive desktop étendu à la partie membre (même mécanisme que côté coach — `member.css` + classe `member-shell`).
3. **Rebrand complet** : nouvelle palette or/bleu-violet ("Style Athlevo", maquette exportée par l'utilisateur depuis Claude Design) appliquée sur toute l'app — cartes en dégradé, badges circulaires, nav recolorée. Détail complet juste en dessous.

**À faire en priorité à la prochaine session :**
- **Demander une capture d'écran du rendu réel** — tout le travail sur les couleurs/contrastes de cette session (rebrand + responsive) n'a été vérifié que par calcul et lecture du CSS compilé, jamais visuellement. En particulier :
  - Le rendu du rebrand sur les 3 écrans mockés (Accueil, Nutrition, Entraînement) et sur les écrans non mockés (Bilan, Hydratation, Sommeil, Réglages, côté coach).
  - Le **thème clair** — jamais couvert par la maquette (fond noir profond partout dans le mockup), adapté par extrapolation, à valider en priorité.
  - Le responsive desktop côté membre (nouveau, jamais vu).
- Si le rendu du rebrand ne convient pas sur certains points précis (nav bar, cartes d'activité Dashboard, absence de barre de recherche), voir la section "Décisions prises sans redemander" ci-dessous — ce sont des choix assumés, pas des oublis, mais négociables si l'utilisateur n'est pas d'accord.

---

## 2026-08-06 — Session 18 (suite 14) : rebrand complet — palette or/bleu-violet ("Style Athlevo")

L'utilisateur a exporté une maquette depuis Claude Design (`Fitness App - Style Athlevo.dc.html`, 3 écrans : Accueil, Nutrition, Entraînement) montrant une nouvelle direction visuelle inspirée d'Athlevo (Behance) : palette or/bleu-violet, cartes en dégradé (au lieu du glow subtil sur fond sombre), badges circulaires, nav flottante avec bouton central doré. Demande explicite : appliquer partout dans l'app, pas juste les 3 écrans montrés.

### ✅ Nouvelle palette — tokens CSS (`global.css`)
- `--accent` : `#D4FF00` (citron) → `#F0C14B` (or)
- `--accent-secondary` : `#0047FF` (bleu roi) → `#8B93E8` (bleu-violet)
- `--accent-ink` : `#0A0A0A` → `#1A1608` (encre chaude, exacte du mockup)
- Nouveau token `--accent-secondary-ink` (`#1C2050`) — nécessaire car le nouveau violet est **clair**, contrairement à l'ancien bleu roi (foncé) : le texte blanc qui fonctionnait sur l'ancien bleu devient illisible sur le nouveau violet, il faut du texte marine foncé à la place (exactement ce que fait le mockup).
- Thème clair : adapté en conservant le même principe qu'avant (teintes foncées pour un usage en texte/icône nu sur fond clair) — **pas couvert par le mockup** (fond noir profond partout), donc à valider visuellement en priorité.
- Balayé tout le code pour les couleurs codées en dur de l'ancienne palette (`#D4FF00`, `#0047FF`, et leurs équivalents `rgba(212,255,0,...)`/`rgba(0,71,255,...)`) — zéro occurrence restante, tout passe maintenant par les tokens ou leurs équivalents dorés/violets directs.

### 🐛 Bugs de contraste réels trouvés en convertissant — pas juste un changement de teinte
Le nouveau violet est **beaucoup plus clair** que l'ancien bleu roi, et l'or est clair par nature — plusieurs endroits qui fonctionnaient très bien avec les anciennes couleurs (foncées) sont devenus illisibles avec les nouvelles (claires) :
- Texte vert (`var(--success)`) sur fond or : **~1,1:1** de contraste (quasi invisible) — trouvé sur la carte calories de Nutrition. Remplacé par l'encre foncée partout où c'était utilisé sur une carte claire.
- Barres de progression (`var(--surface-2)`/`var(--accent)` comme piste/remplissage) : la piste blanche translucide devient invisible sur fond clair, et un remplissage doré sur fond doré est doré-sur-doré. Corrigé via une règle CSS ciblée (`.card-hero .progress-bar`/`.progress-fill`) qui couvre **automatiquement** tous les écrans utilisant ces classes partagées (Hydratation, Sommeil), sans avoir besoin de les corriger un par un.
- Texte blanc sur fond violet clair : `.today-session-btn` (Entraînement) et `.activity-card-accent` (carte "Eau" du Dashboard) utilisaient du texte blanc sur `var(--accent-secondary)` — fonctionnait avec l'ancien bleu foncé (~contraste correct), plus du tout avec le nouveau violet clair (~2,9:1, sous le seuil). Passé au texte marine foncé.
- Couleurs macro (Protéines/Glucides/Lipides, bleu clair/orange/violet clair) : l'orange en particulier tombe à ~1,15:1 sur fond or (même famille de teinte). Toutes les trois assombries pour rester lisibles comme éléments graphiques sur fond clair, tout en gardant la distinction de teinte par macro.
- `calBarColor()` (Bilan hebdo) : les 4 couleurs possibles (succès/accent/warning/vide) tombaient toutes entre ~1,1:1 et ~1,2:1 sur le nouveau fond or. Remplacées par des teintes foncées équivalentes.

Chaque contraste a été vérifié par calcul de luminance relative (formule WCAG), pas à l'œil — puisqu'aucune vérification visuelle n'est possible dans ce sandbox.

### ✅ Cartes en dégradé — nouvelles classes réutilisables
- `.card.card-hero` (global.css) : carte principale de chaque écran, dégradé or plein (`linear-gradient(120deg,#F0C14B,#F7DD8E 55%,#FFFFFF 130%)`) au lieu du glow subtil sur fond sombre d'avant. `color` posé sur la classe elle-même pour que tout texte hérité (sans couleur explicite) devienne automatiquement lisible, plus des surcharges `.text-primary/secondary/muted` pour les cas utilisant les classes utilitaires.
- `.card.card-violet` (nouveau) : variante violette pour les CTA secondaires ("Idée recette" sur Nutrition), même logique.
- Appliqué sur : Dashboard (carte calories, remplace l'ancien anneau `CalorieRing.jsx` — composant gardé mais plus utilisé, pour cohérence visuelle avec Nutrition qui utilisait déjà ce format plat), Nutrition (carte calories + "Idée recette" en violet), Workout/Weekly/Hydration/Sleep (déjà `.card-hero`, recolorées automatiquement + couleurs internes corrigées).

### ✅ Autres éléments repris de la maquette
- Avatar du header (Dashboard) et bouton central de la nav : dégradé or au lieu d'un aplat.
- Boutons "Ma séance du jour" (violet, texte marine)/"+ Programme IA" (contour doré) et onglet actif "Musculation" (fond doré) sur Workout.
- Nav bar : `border-radius` 30px→24px (rectangle légèrement moins arrondi, comme le mockup), bouton central passé en dégradé — **structure et icônes non touchées** volontairement (voir "décisions" ci-dessous).
- Nouvelle rangée d'icônes Matin/Midi/Soir/Snack sur Nutrition (n'existait pas avant) — pas juste décorative, ouvre la feuille d'ajout de repas avec le type pré-sélectionné.
- Badges d'icônes circulaires sur les cartes d'activité du Dashboard (icône dans un cercle plutôt que flottante).

### ⚠️ Décisions prises sans redemander (l'utilisateur avait dit d'agir, pas de questionner)
- **Nav bar** : forme/couleurs reprises, mais **icônes et disposition non touchées**. Après 3 tentatives ratées de redesign de la nav en session 16 (toutes annulées sur demande explicite de l'utilisateur), je n'ai pas pris le risque de retoucher la structure sans retour visuel — seule la couleur/forme du conteneur a changé.
- **Cartes d'activité du Dashboard (Pas/Course/Eau/Sommeil)** : le mockup montre des cercles icône-seul sans données. Gardé les cartes actuelles avec les vrais chiffres (pas/km/ml/heures) — remplacer par des boutons sans données aurait été une vraie régression fonctionnelle pour une app de suivi. Juste mis l'icône dans un badge circulaire pour se rapprocher du langage visuel du mockup sans perdre l'info.
- **Pas de barre de recherche ajoutée sur le Dashboard** : le mockup en montre une ("Rechercher un aliment, une séance…") qui n'existe pas dans l'app actuelle et n'a pas d'équivalent fonctionnel évident (chercher dans quoi exactement ?). Non ajoutée plutôt que de poser un champ de recherche non fonctionnel.
- **Icônes de navigation Nutrition/Entraînement du 2ᵉ bouton de la nav** : le SVG du mockup à cette position est ambigu (ressemble à un haltère, pas clairement à de la nutrition). Gardé l'icône assiette/fourchette actuelle de l'app, plus claire.

### Reste à valider
- **Tout ceci n'a pu être vérifié que par le calcul (contraste WCAG) et le CSS compilé, jamais visuellement** — capture d'écran nécessaire dès que possible pour confirmer le rendu réel, en particulier : le thème clair (jamais montré dans le mockup, adaptation de ma part), et les nouvelles couleurs de macros/barres.

---

## 2026-08-06 — Session 18 (suite 13) : fond décoratif décentré (root cause trouvée) + responsive desktop côté membre

Capture d'écran de l'utilisateur sur Entraînement (desktop) : le "carte héro" était bien visible cette fois, mais le dégradé décoratif de fond apparaissait plaqué à gauche de l'écran, déconnecté du contenu (qui, lui, restait bien centré).

### 🐛 `#root::before` — root cause trouvée : `position: fixed` + `inset:0` + `max-width` = coincé à gauche du viewport
Le dégradé décoratif (`#root::before`, `global.css`) était en `position: fixed` avec `inset: 0` et `max-width: 390px`. `position: fixed` est relatif au **viewport**, pas à `#root` — avec `left:0` et `right:0` tous les deux imposés par `inset:0` mais une largeur plafonnée à 390px, la combinaison est sur-contrainte : la spec CSS résout ça en gardant `left:0` et en ignorant `right`, donc l'élément se retrouve **collé au bord gauche du viewport**, peu importe où `#root` lui-même est réellement centré. Sur un écran plus large que 390px, le dégradé se détache visuellement du contenu (qui, lui, est correctement centré par `body`) — exactement ce que montrait la capture. Ce bug existait depuis le début, sur tous les écrans larges, coach compris — juste jamais remarqué avant faute de retour visuel.

**Corrigé** : `position: fixed` → `position: absolute` (relatif à `#root`, déjà `position: relative`) — le dégradé suit maintenant `#root` exactement, quelle que soit sa largeur ou son centrage. Permet aussi de supprimer la règle `#root.coach-shell::before { max-width: ... }` devenue redondante dans `coach.css` (le pseudo-élément suit `#root` automatiquement désormais, plus besoin de dupliquer la largeur).

### ✅ Responsive desktop étendu à la partie membre (même mécanisme que le coach)
L'utilisateur a demandé une vraie version "webapp" responsive pour la partie membre aussi, pas seulement le coach. Réutilisé exactement le pattern validé côté coach (deux itérations de bugs déjà payées et corrigées là-bas) :
- **`src/layouts/MemberLayout.jsx`** : ajoute la classe `member-shell` sur `#root` pendant qu'une route membre est montée (même mécanisme que `CoachLayout.jsx`).
- **`src/styles/member.css`** (nouveau) : scopé à `#root.member-shell` + `@media (min-width: 900px)` — zéro changement sur mobile, zéro changement côté coach. Contrairement au coach (listes/grilles de clients), les écrans membre sont une pile de "cartes héro" sans contenu de type grille — donc pas besoin de reflow en grille : juste `.app-wrapper` (présent sur quasi tous les écrans membre) plafonné à 560px et centré, dont hérite tout le contenu à l'intérieur.
- **Vérifié directement dans le CSS compilé** (`dist/assets/*.css`) avant de livrer : `position:absolute` confirmé sans `max-width` résiduel, règles `member-shell` présentes avec le bon contenu.

La nav du bas (`BottomNav.jsx`) n'a pas été touchée — même choix que pour la nav coach, reste une pilule flottante centrée sur la largeur totale de l'écran.

### 💬 Point en attente — changement de palette de couleurs
L'utilisateur a évoqué vouloir changer la palette de couleurs de l'app ("je pense qu'on va changer de couleur"), sans préciser vers quoi. Pas commencé — à clarifier (quelles couleurs, quelle direction) avant d'y toucher, contrairement aux corrections de layout qui sont objectivement vérifiables.

---

## 2026-08-05 — Session 18 (suite 12) : traitement "carte héro" étendu à tous les écrans membre restants

L'utilisateur a insisté, à raison, que le style devait couvrir toute l'app, pas être découvert incrément par incrément à chaque capture d'écran.

### ✅ `.card.card-hero` — nouvelle classe utilitaire globale (`global.css`)
Centralise le glow radial déjà utilisé sur Nutrition dans **une seule** règle réutilisable partout, plutôt que dupliquée par écran — avec la leçon de la suite 11 appliquée dès l'écriture (sélecteur `.card.card-hero`, spécificité garantie supérieure à `.card` seul, peu importe l'ordre du bundle). **Vérifié directement dans le CSS compilé** (`dist/assets/*.css`) avant de livrer, cette fois — plus question de se fier au seul fait que le build passe.

Appliquée sur la carte principale ("héro") de chaque écran membre qui en a une :
- `Hydration.jsx` (carte eau), `Sleep.jsx` (carte sommeil), `Weekly.jsx` (carte calories/graphique), `Workout.jsx` (carte séances de la semaine), `Nutrition.jsx` (consolidée sur la classe globale, remplace l'ancienne `.nutrition-hero-card` locale devenue redondante).

Dashboard avait déjà son propre traitement équivalent (session précédente) — non retouché. Écrans à grille de petites cartes (stats coach, fiche membre) volontairement laissés tels quels : un glow sur chaque petite tuile individuelle aurait l'air répétitif/criard plutôt que "héro".

---

## 2026-08-05 — Session 18 (suite 11) : le vrai bug — pas le cache, un écrasement CSS silencieux

L'utilisateur a vidé son cache complètement (suite au correctif précédent) et voyait **toujours exactement la même chose** sur Nutrition. Ça éliminait le cache comme cause — remis en question l'hypothèse et vérifié directement le CSS **compilé** (`dist/assets/*.css`) plutôt que de deviner encore.

### 🐛 `.nutrition-hero-card` et `.nutrition-recipe-card` étaient silencieusement écrasées par `.card`
Root cause confirmée en comparant la position des règles dans le fichier CSS final buildé : `.nutrition-hero-card` (une seule classe, spécificité 0-1-0) apparaissait **avant** `.card` (aussi 0-1-0) dans le bundle — à spécificité égale, la règle la **plus tardive dans le fichier gagne**, donc `.card` (background/border/border-radius) écrasait systématiquement mon style, sur chaque rendu, cache ou pas cache. La classe personnalisée était donc appliquée dans le HTML (`className="card nutrition-hero-card"`) mais n'avait **strictement aucun effet visuel** — d'où "aucun changement" vrai et reproductible, peu importe combien de fois le cache était vidé.

**Corrigé** : sélecteurs changés en `.card.nutrition-hero-card` / `.card.nutrition-recipe-card` (deux classes combinées = spécificité 0-2-0), qui bat `.card` seul **quel que soit l'ordre** dans le bundle — plus jamais dépendant de l'ordre d'import des fichiers CSS. Vérifié directement dans `dist/assets/*.css` après correction que la règle avec la bonne spécificité est bien celle qui s'applique.

**Balayé le reste du code** pour le même piège (une classe perso combinée à `.card` sur le même élément) — c'était le seul endroit concerné, tous les autres combos (`card card-animated`, etc.) n'ont pas de propriétés qui se chevauchent donc pas de conflit.

**Leçon** : la prochaine fois qu'un changement CSS semble "ne pas s'appliquer" malgré un build qui passe, vérifier le CSS **compilé** directement (`dist/assets/*.css`, position des règles, spécificité) avant de soupçonner le cache — le cache était une piste plausible et le correctif de la suite 10 reste légitime, mais ce n'était pas *ce* bug-ci.

---

## 2026-08-05 — Session 18 (suite 10) : root cause probable du "aucun changement" — cache HTTP de index.html jamais configuré

Après plusieurs rounds où l'utilisateur ne voyait aucun changement malgré des PR mergées et vérifiées par build, remis en question l'hypothèse "mes changements sont ratés" pour plutôt chercher pourquoi il ne verrait **rien du tout**, changement ou pas.

### 🐛 `index.html` n'avait aucune règle de cache HTTP explicite dans `vercel.json`
Seul `/assets/*` (fichiers JS/CSS avec hash Vite, cache long terme légitime) avait une règle. `index.html` — le point d'entrée qui référence ces fichiers hashés — n'en avait aucune, livré avec le comportement de cache par défaut de Vercel. Combiné à la stratégie "network-first" du service worker (`public/sw.js`) pour les requêtes de navigation, un `fetch()` "network-first" peut quand même être satisfait par le cache HTTP du navigateur lui-même si aucun en-tête n'interdit explicitement ça — l'utilisateur pouvait recharger autant de fois qu'il voulait, une ancienne version de `index.html` (pointant vers d'anciens fichiers JS/CSS) pouvait continuer à être servie indéfiniment, peu importe le nombre de déploiements réussis derrière.

**Corrigé** :
- `vercel.json` : nouvelle règle `Cache-Control: no-cache, no-store, must-revalidate` sur `/(.*)` (tout), avec la règle `/assets/(.*)` positionnée après pour la surcharger spécifiquement sur les fichiers hashés (qui, eux, doivent rester en cache long terme — sûr car leur nom change à chaque build).
- `public/sw.js` : nom de cache passé de `onair-v1` à `onair-v2` — force tout service worker déjà installé à vider son cache au prochain `activate`, en défense supplémentaire (ce nom n'avait jamais changé depuis la création du fichier).

**Si le problème persiste après ce correctif**, il faudra que l'utilisateur vide manuellement le cache de son navigateur/téléphone une fois (l'ancien service worker/cache peut survivre à ce déploiement lui-même, c'est le prochain qui sera garanti visible immédiatement).

---

## 2026-08-05 — Session 18 (suite 9) : capture d'écran Nutrition — "aucun changement", 2 vrais problèmes trouvés

L'utilisateur a envoyé une capture de la page Nutrition en disant "aucun changement". Deux causes réelles :

### 🐛 Le changement app-wide de la suite 8 était réel mais invisible sur cet écran précis
`.btn-accent` (le bouton qui a reçu le glow) n'apparaît nulle part sur l'écran Nutrition visible par défaut — il est caché dans la feuille "Ajouter un repas", fermée par défaut. Seule l'icône 🍽️ dans l'en-tête était visible, donc l'impression de "rien n'a changé" était légitime pour cet écran précis.

### 🐛 `nutrition.css` n'était jamais importé nulle part dans le code — trouvé en essayant d'ajouter du style à cet écran
Fichier existant depuis longtemps (`.macro-row`, `.meal-card`) mais **jamais chargé** — aucun écran ne l'importait. Mort depuis le début, aucune de ses règles n'avait jamais eu d'effet. Corrigé : import ajouté dans `Nutrition.jsx`.

### ✅ Traitement visible ajouté sur la carte calories + "Idée recette"
- Carte calories : glow radial subtil en coin (même langage que les CTA, mais discret — c'est une carte de données dense, pas un bouton), coins plus arrondis, chiffre principal agrandi (36px → 44px).
- "Idée recette" : icône dans un badge circulaire coloré (au lieu d'un simple emoji flottant), ombre portée, padding plus généreux.

---

## 2026-08-05 — Session 18 (suite 8) : style visuel étendu à toute l'app (pas juste le Dashboard)

L'utilisateur a signalé, à raison, que la suite 7 n'avait touché que le Dashboard alors que la demande était d'appliquer le style à toute l'application.

### ✅ Traitement "glow + icônes" étendu partout
- **`global.css` `.btn-accent`** : classe de bouton principal **partagée par la quasi-totalité de l'app** (Nutrition, Settings, MemberDetail, sheet d'ajout rapide, ResetPassword) — un seul changement ici propage le même glow radial (même logique de contraste vérifiée que sur le Dashboard) à tous les boutons d'action principaux de l'app d'un coup, plutôt que de dupliquer le style écran par écran.
- **`Workout.css` `.today-session-btn`** : ombre portée bleue assortie.
- **Icônes emoji ajoutées sur les en-têtes** de tous les écrans restants : Nutrition (🍽️), Workout (🏋️), Weekly (📊), Hydration (💧), Sleep (😴), Settings membre (⚙️), et côté coach : Dashboard (📋), Clients (👥), Messages (💬), Réglages (⚙️).

### 🔍 Recherche tendances 2026 (à la demande de l'utilisateur)
Recherche web sur les tendances actuelles de design d'app fitness : dark-mode natif + accents néon, dashboard en tuiles avec blocs de couleur, minimalisme, micro-interactions/animations de progression, personnalisation IA. ON AIR est déjà globalement aligné avec ces tendances (thème sombre + accent citron, cartes animées, Coach IA) — le travail de cette session (icônes + CTA plus affirmés) va dans le même sens. Rien d'autre appliqué depuis cette recherche, juste confirmation que la direction actuelle est cohérente.

---

## 2026-08-05 — Session 18 (suite 7) : Dashboard — inspiration visuelle d'une app référence, scopée à un ajustement contenu

L'utilisateur a partagé des captures Behance d'une app référence ("Athlevo" — une marketplace pour réserver coach/salle) en demandant ce que j'en pense côté style visuel. Précisé de ne pas copier tel quel : Athlevo utilise de grandes cartes CTA avec **photos** (coach, salle) — ON AIR n'a pas cet inventaire de photos (c'est du suivi personnel, pas une marketplace à parcourir), donc copier le pattern brut aurait laissé des cartes vides. Traduit l'énergie du style (cartes plus affirmées, glow, icônes) sans les photos :
- `.dashboard-cta-btn` ("Voir mon entraînement du jour") : passé d'une barre plate à une carte plus grande avec un glow radial `--accent-secondary` en coin (au lieu d'un dégradé plein lime→bleu — vérifié le contraste texte `--accent-ink` sur `--accent-secondary` : ~3.4:1, sous le seuil WCAG AA de 4.5:1, donc le bleu reste cantonné à un glow en arrière-plan, jamais sous le texte).
- Cartes d'activité (Pas/Course/Eau/Sommeil) : ajout d'une icône emoji par carte (👟🏃💧😴), dans l'esprit de la rangée d'icônes de catégories d'Athlevo.

Volontairement **pas** de refonte complète du Dashboard à l'aveugle — juste ces deux ajustements contenus, pour limiter le risque sans retour visuel possible ici.

### 💡 Idée notée pour plus tard — concept marketplace (réserver coach/salle)
Clarifié avec l'utilisateur : "garder l'idée de l'app" (en plus du style) faisait bien référence au concept marketplace d'Athlevo — plusieurs coachs/salles réservables, façon Calendly/Booksy, pas juste l'esthétique. **Rien construit** — l'utilisateur a précisé qu'il voulait seulement que l'idée soit notée pour une réflexion future, pas une exécution immédiate. Pour la prochaine fois où ce sujet revient : c'est un changement de direction produit majeur (le modèle actuel est "un seul coach par salle" — messagerie, dashboard coach, notes en dépendent tous), pas une fonctionnalité isolée. Nécessiterait de définir : cohabitation ou remplacement du modèle actuel, nombre de coachs/salles réels concernés, gestion des créneaux, paiement ou non — avant tout code.

---

## 2026-08-05 — Session 18 (suite 6) : tutoriel de bienvenue pour les nouveaux membres

L'utilisateur a fait remarquer qu'un nouveau membre termine l'inscription (`Onboarding.jsx`, qui ne collecte que le profil — prénom/objectif/poids/etc.) et atterrit directement sur le Dashboard sans aucune explication du fonctionnement de l'app.

### ✅ `AppTour.jsx` — nouveau, 5 écrans statiques affichés une seule fois
Volontairement **pas** une bulle/spotlight qui pointe sur les vrais boutons en direct — un positionnement précis par élément, sur toutes les tailles d'écran, sans pouvoir le vérifier visuellement, c'est exactement le genre de pari qui a mal tourné aujourd'hui sur le responsive coach. À la place : 5 écrans autonomes (Bienvenue, Dashboard, Nutrition, Entraînement, Coach), même structure visuelle que `Onboarding.jsx` (réutilise `Onboarding.css`), bouton "Passer" toujours disponible.

**Déclenchement** : `Onboarding.jsx` redirige maintenant vers `/welcome` (au lieu de `/dashboard`) à la fin, en posant un flag `onair_show_tour` — consommé une fois par `AppTour.jsx` puis navigation vers `/dashboard`. Route `/welcome` gardée par le même pattern que `/onboarding` (flag + rôle membre), donc impossible à revoir en tapant l'URL ou pour un compte créé directement en SQL sans être passé par l'inscription.

Pas encore vu par l'utilisateur — comme toujours, seul le raisonnement + le build ont pu être vérifiés ici, pas le rendu réel.

---

## 2026-08-05 — Session 18 (suite 5) : responsive coach — audit proactif + fond qui ne remplissait pas la largeur

Deux allers-retours supplémentaires avec l'utilisateur (deux nouvelles captures d'écran), plutôt que d'attendre qu'il trouve chaque bug un par un.

### 🔍 Audit proactif après la suite 4 — 2 zones non protégées trouvées et corrigées avant qu'elles posent problème
En réexaminant tous les écrans coach après le correctif `auto-fit`, deux blocs de contenu n'étaient enveloppés ni par `.coach-grid` ni par `.coach-narrow` et auraient donc hérité de la pleine largeur (~1600px) sans plafond :
- `CoachDashboard.jsx` : les 4 tuiles de stats (Clients/Séances/Alertes/Actifs) + le bouton "Voir tous mes clients" — un chiffre minuscule aurait fini perdu dans une carte énorme. Enveloppés dans une nouvelle classe `.coach-stats` (plafond 640px).
- `ClientsList.jsx` : la barre de recherche (`input` en `width:100%`) serait devenue une immense boîte de texte vide. Enveloppée dans `.coach-toolbar` (plafond 480px).

### 🐛 Le fond (dégradé + couleur de fond) ne remplissait pas toute la largeur
Nouvelle capture d'écran de l'utilisateur : au-delà du contenu, une bande sur les bords semblait "différente" du reste. Cause réelle : `#root.coach-shell` portait à la fois le fond (`--bg`, dégradé `::before`) **et** le plafond de largeur du contenu — au-delà du plafond, seul le fond plat de `body` (même couleur en théorie, mais le dégradé `::before` s'arrêtait net à la même limite, créant une coupure visible). Corrigé en séparant les deux responsabilités : `#root.coach-shell` (et son `::before`) repassent à 100% de la largeur pour que le fond soit continu jusqu'aux bords, et c'est maintenant `.screen` elle-même qui porte le plafond (`max-width: 1600px; margin: auto`) pour garder le contenu lisible et centré.

Tout dans `src/styles/coach.css` + 2 petits ajouts de classe dans `CoachDashboard.jsx`/`ClientsList.jsx`, aucun autre changement de balisage.

---

## 2026-08-05 — Session 18 (suite 4) : responsive coach — corrigé grâce à une vraie capture d'écran

L'utilisateur a envoyé une capture d'écran du dashboard coach sur ordinateur. Deux bugs réels confirmés (exactement le genre de chose que je ne pouvais pas voir tout seul) :

### 🐛 1. Énormes marges noires vides à gauche/droite
`#root.coach-shell` était plafonné à `max-width: 1100px` en dur — sur un écran large (la capture montrait clairement un moniteur bien plus large que ça), ça laisse un immense vide de chaque côté, pire visuellement que le problème que ça devait résoudre. Corrigé : `max-width: min(94vw, 1600px)` — s'adapte à la largeur réelle de la fenêtre au lieu d'un plafond fixe, toujours avec un cap généreux pour ne pas aller bord à bord sur un écran ultra-large.

### 🐛 2. Les cartes clients ("Arnaud"/"Gisèle") ne remplissaient pas la largeur
`.coach-grid` utilisait `grid-template-columns: repeat(auto-fill, minmax(320px, 1fr))`. Avec `auto-fill`, une ligne avec moins de cartes que ce qui tiendrait (ici 2) réserve quand même les colonnes vides comme si elles existaient — les vraies cartes restent bloquées à la largeur plancher (320px) au lieu de s'étirer. Corrigé : `auto-fit` à la place, qui supprime les colonnes vides et laisse `1fr` s'appliquer réellement aux cartes présentes.

Les deux corrections sont dans `src/styles/coach.css` uniquement — aucun changement de balisage, toujours scopé à `#root.coach-shell` (partie membre non affectée).

---

## 📍 État au 2026-08-05 (fin de session 18) — à lire en premier

Tout ce qui suit dans cette entrée et les entrées d'en dessous a été fait aujourd'hui et est **mergé sur `claude/charming-mendel-dj1GQ`** (vérifié avant de clore la session — plus de PR en attente, working tree propre).

**Fait aujourd'hui, dans l'ordre :**
1. Résolu le bug de scroll intempestif sur Nutrition (root cause : `autoFocus` sur un input toujours monté dans le DOM).
2. Ajouté les notifications push côté coach (symétrique du côté membre) + corrigé le toggle factice dans `CoachSettings.jsx`.
3. Décidé avec l'utilisateur de **ne pas** faire une bibliothèque d'exercices 100% IA pour l'instant.
4. Fait un premier passage responsive desktop pour la partie coach uniquement (le membre reste inchangé) — **non vérifié visuellement, à confirmer par capture d'écran**.
5. Supprimé les 4 toggles de rappel factices (3 dans `Settings.jsx`, 1 dans `CoachSettings.jsx`) qui ne faisaient rien.
6. Nettoyage sécurité : `prevent_self_role_escalation()` n'est plus appelable en RPC public.
7. Trouvé et réparé un compte membre réel (la mère de l'utilisateur) inscrit mais sans fiche profil (invisible côté coach) + ajouté une auto-réparation dans `AuthContext.jsx` pour que ça ne puisse plus arriver à personne d'autre sans intervention manuelle (voir détail plus bas).

**À faire en priorité à la prochaine session :**
- **Demander à l'utilisateur une capture d'écran du rendu desktop côté coach** (dashboard, clients, messages, fiche membre) avant d'aller plus loin — ce travail n'a jamais pu être vérifié visuellement dans ce sandbox et a un vrai risque de détails cassés.
- Une fois validé : décider si la nav coach doit devenir une sidebar sur grand écran (volontairement pas touchée cette session).
- Si un vrai système de rappels programmés (hydratation/séance/récap hebdo) est voulu un jour, c'est à reconstruire de zéro — les toggles factices ont été retirés plutôt que laissés à mentir sur leur effet.

---

## 2026-08-05 — Session 18 (suite 3) : compte membre orphelin (mère de l'utilisateur) réparé + self-healing ajouté

### 🐛 Un compte inscrit n'avait aucune fiche profil — trouvé en checkant le compte de la mère de l'utilisateur
L'utilisateur a demandé de vérifier le compte de sa mère (email `gmatondo354@gmail.com`, inscrite la veille sur son téléphone). Trouvé : le compte existait bien dans `auth.users` (créé, email confirmé, une connexion réussie) mais **aucune ligne dans `profiles`** — invisible pour le coach (`ClientsList`/`CoachDashboard` filtrent sur `profiles.role='member'`), sans nom, sans rien.

Vérifié que ce n'est **pas** un bug systémique : sur les 4 comptes existants, elle est la seule dans ce cas. Cause la plus probable : `register()` (`AuthContext.jsx`) fait `signUp()` puis, dans un second `await` séparé, l'upsert du profil — si la connexion coupe ou l'app est mise en arrière-plan pile entre les deux (plausible sur téléphone juste après avoir tapé "S'inscrire"), le compte auth existe mais le profil n'est jamais créé, et rien ne le retente jamais après coup.

**Réparé immédiatement** : ligne `profiles` créée à la main pour ce compte (prénom "Gisèle" récupéré depuis `user_metadata`), elle est maintenant visible côté coach.

**Corrigé pour que ça n'arrive plus à personne** : `resolveRole()` dans `AuthContext.jsx` — appelée à chaque restauration de session et à chaque connexion — vérifie maintenant l'existence du profil (`.maybeSingle()` au lieu de `.single()`, pour distinguer proprement "aucune ligne" d'une vraie erreur) et **recrée le profil manquant à la volée** si besoin, à partir des infos déjà connues (`user_metadata`). Auto-réparation silencieuse, sans action utilisateur.

---

## 2026-08-05 — Session 18 (suite 2) : toggles factices retirés + nettoyage sécurité RPC

### 🧹 Toggles de rappel factices — supprimés
Aucun des deux n'avait de logique de planification derrière (juste un `useState` local togglé sans effet) — laissés en place, ils auraient continué à faire croire à un vrai rappel programmé qui n'existe pas, à côté des vrais toggles push qui, eux, fonctionnent.
- **`src/screens/Settings.jsx`** (membre) : retiré "Rappel hydratation" / "Rappel séance" / "Récap hebdomadaire" + le state `notifs` associé.
- **`src/screens/CoachSettings.jsx`** (coach) : retiré "Alertes membres" + le state `notifs` associé.

### 🔒 Sécurité — `prevent_self_role_escalation()` n'est plus appelable en RPC public
Même défaut déjà corrigé sur `is_coach()` en session 11 : Supabase accorde `EXECUTE` par défaut à `PUBLIC` **et** explicitement à `anon`/`authenticated`/`service_role` à la création de toute fonction — deux couches de grant séparées, il faut révoquer les deux (un `revoke ... from public` seul ne suffit pas, vérifié en interrogeant `pg_proc.proacl` avant/après). Pas exploitable en pratique (Postgres refuse d'appeler une fonction trigger hors contexte trigger), corrigé par cohérence. Le déclenchement du trigger lui-même ne dépend pas du droit `EXECUTE` de l'appelant sur la fonction, donc rien n'a été re-accordé — vérifié après coup que seuls `postgres`/`service_role` ont encore `EXECUTE`. Deux migrations Supabase appliquées (`revoke_public_execute_on_role_escalation_trigger`, `revoke_role_escalation_trigger_execute_explicit`), `scripts/supabase_schema.sql` synchronisé.

---

## 2026-08-05 — Session 18 (suite) : premier passage responsive desktop, côté coach uniquement

### ✅ Layout desktop pour la partie coach — première passe, à valider visuellement
L'utilisateur a fait remarquer à juste titre que même si l'app est déjà accessible comme "webapp" sur ordinateur (même URL Vercel), la mise en page était une copie collée de la version téléphone (`#root { max-width: 390px }` partout, y compris sur grand écran). Décidé de traiter ça côté **coach uniquement** (recommandation, acceptée) — le membre reste mobile-first, cohérent avec l'usage attendu.

**Mécanisme** (`src/layouts/CoachLayout.jsx`, nouveau) : les 6 routes `/coach/*` sont maintenant enveloppées dans un layout qui ajoute la classe `coach-shell` sur `#root` pendant qu'il est monté (même technique que le forçage du thème sombre sur Landing), et la retire au démontage. Toutes les règles desktop (`src/styles/coach.css`, nouveau contenu) sont scopées à `#root.coach-shell` + `@media (min-width: 900px)` — donc **zéro changement pour le membre, à n'importe quelle taille d'écran**, et **zéro changement pour le coach sur mobile** (un coach qui checke depuis son téléphone garde la même colonne compacte qu'avant).

Ce qui change au-dessus de 900px de large, côté coach seulement :
- `#root` passe de 390px à 1100px de large.
- Les écrans-listes (`CoachDashboard` alertes + activité, `ClientsList`, `CoachMessages`) passent d'une colonne unique à une grille responsive (`repeat(auto-fill, minmax(320px,1fr))`) — le balisage de chaque carte n'a pas été touché, seul le conteneur qui les enveloppe change d'affichage (`display:grid`). Risque volontairement minimisé : aucune carte individuelle réécrite.
- Les écrans détail/formulaire (`MemberDetail`, `CoachSettings`, le fil de conversation coach dans `Conversation.jsx`) restent en colonne unique mais centrée à 720px au lieu d'être étirée sur 1100px (du texte/formulaire sur une ligne de 1100px serait illisible) — nouvelle classe utilitaire `.coach-narrow`.
- **La nav (`CoachNav.jsx`) n'a pas été touchée du tout** — elle reste la pilule flottante en bas de l'écran, centrée sur la largeur totale de la fenêtre (elle est en `position:fixed`, indépendante de la largeur de `#root`). Volontairement laissée de côté dans cette première passe : après plusieurs tentatives ratées de redesign de cette nav en session 16 (contraste cassé, centrage foireux, finalement revenue en arrière sur demande explicite), je préfère ne pas retoucher sa structure sans retour visuel de l'utilisateur d'abord.

**⚠️ Non vérifié visuellement** — comme toujours dans ce sandbox, aucune capture d'écran possible. Le raisonnement CSS a été vérifié pas à pas (spécificité, portée des sélecteurs, cascade) et le build passe, mais ce premier jet a un vrai risque de détails visuels à corriger une fois vu en vrai (espacements, alignement de la nav flottante par rapport au contenu élargi, etc.). **À faire en priorité la prochaine fois que l'utilisateur se connecte côté coach depuis un ordinateur : demander une capture d'écran avant d'aller plus loin.**

### Reste à trancher / faire
- Valider visuellement le responsive desktop ci-dessus (voir avertissement).
- Discuter si la nav coach doit devenir une sidebar sur grand écran une fois le reste validé (pas fait dans cette passe, volontairement).

---

## 2026-08-05 — Session 18 : bug de scroll Nutrition résolu + rappel process PR

### 🐛 Bug de scroll intempestif sur Nutrition — trouvé et corrigé
Root cause identifiée : dans `Nutrition.jsx`, la "Bottom Sheet" d'ajout de repas (`step === 1`) reste **toujours montée dans le DOM**, seulement masquée visuellement via `transform: translateY(100%)` — ce n'est pas un rendu conditionnel (`{sheetOpen && ...}`), c'est fait exprès pour permettre l'animation de glissement à l'ouverture. Son champ de recherche avait `autoFocus`, qui se déclenche donc **dès le montage du composant Nutrition**, c'est-à-dire littéralement au moment où on tape sur l'onglet — avant même que la feuille soit ouverte. Le navigateur tente alors de faire défiler la page vers cet input soi-disant "hors écran", d'où le scroll vers le bas systématique juste après le tap. C'est le seul `autoFocus` du fichier (et du projet) qui n'était pas protégé par un rendu conditionnel — comparé à `BottomNav.jsx`, `Dashboard.jsx`, le sheet "modifier repas" de `Nutrition.jsx` lui-même, qui sont tous bien conditionnels.

Corrigé : `autoFocus` retiré, remplacé par un `useEffect` qui appelle `.focus()` sur une ref, uniquement quand `sheetOpen && step === 1`, après un léger délai (340ms) le temps que l'animation d'ouverture (320ms) soit terminée.

### 📌 Rappel process — toujours merger avant de considérer une session terminée
La PR #18 (Session 17) était restée en **draft, jamais mergée**, ce qui fait qu'une nouvelle session ouverte juste après ne voyait aucun des changements/entrées de journal de la Session 17 en lisant `claude/charming-mendel-dj1GQ` (la branche de reprise). Corrigé en mergeant la PR #18. **Règle à appliquer systématiquement désormais : merger la PR avant de considérer un lot de travail comme terminé, pas seulement la pousser en draft.**

### ✅ Décision produit — bibliothèque d'exercices 100% IA : NON, pas pour l'instant
Discuté avec l'utilisateur. Décision : on garde la bibliothèque statique actuelle (48 exercices + API Ninjas en complément) telle quelle. Remplacer par une génération IA à la volée introduirait de la latence, un coût par appel, un risque de fiabilité (bibliothèque inutilisable si l'IA est lente/en panne) et surtout un risque de consignes de forme d'exécution erronées (plus sensible que pour une recette, risque de blessure). Une option intermédiaire (section "Suggestions IA" en haut de la bibliothèque, générée une fois et mise en cache, liste statique conservée en dessous) a été évoquée mais pas retenue pour l'instant faute de demande réelle des membres — à revisiter si le besoin se confirme en usage réel.

### ✅ Push notifications côté coach — fait (symétrique du côté membre)
Un membre qui écrit à son coach déclenche maintenant une vraie notif push côté coach, comme l'inverse existant depuis la session précédente.
- **RLS** (migration `member_can_view_coach_push_subscriptions`) : ajout de "Members can view coach push subscriptions" et "Members can delete stale coach push subscriptions", miroir exact des policies coach→membre déjà en place. `scripts/supabase_schema.sql` synchronisé.
- **`api/send-push.js`** : commentaires mis à jour (n'était plus "membre seulement", fonctionne dans les deux sens via les policies RLS ci-dessus — aucun changement de code nécessaire, l'endpoint était déjà générique).
- **`src/utils/messages.js`** : `sendMessage()` accepte désormais un 4ᵉ paramètre `meta = { senderIsCoach, senderName }`. `notifyReceiver()` construit le bon titre ("Ton coach t'a écrit" vs "`{prénom}` t'a écrit") et la bonne URL de destination selon le sens : `/messages/coach` pour un membre notifié, `/coach/messages/{memberProfileId}` pour un coach notifié — cette dernière nécessite une résolution `profiles.user_id → profiles.id` (la route coach est indexée sur l'id de profil, pas l'auth user_id), faite en lecture sur sa propre ligne donc sans souci RLS.
- **`src/screens/Conversation.jsx`** : `send()` passe désormais `{ senderIsCoach: isCoach, senderName: user?.name }` à `sendMessage()`.
- **`src/screens/CoachSettings.jsx`** : le toggle "Nouveaux messages" était **factice** (state local, ne faisait rien) — sans ça, le coach n'aurait eu aucun moyen de s'abonner au push malgré le reste fonctionnel. Remplacé par le même mécanisme réel que côté membre (`src/utils/push.js` : `isPushSupported`/`getPushSubscriptionState`/`subscribeToPush`/`unsubscribeFromPush`), générique et déjà compatible coach (RLS "Users can insert own push subscriptions" scope juste `auth.uid()`, sans notion de rôle).

### Reste à trancher
- `prevent_self_role_escalation()` : nettoyage GRANT RPC, sécurité, faible risque, toujours différé.
- 3 toggles de rappel factices dans `Settings.jsx` (hydratation/séance/récap hebdo) + 1 dans `CoachSettings.jsx` ("Alertes membres") à côté des vrais toggles push — incohérent visuellement, pas corrigé.
- **Question ouverte de l'utilisateur** : l'app fonctionne déjà comme "webapp" sur ordinateur (même URL Vercel, accessible dans n'importe quel navigateur desktop, pas besoin d'installer d'app native) — mais la mise en page n'est **pas responsive** : c'est une copie de la version téléphone, centrée dans une colonne étroite (`#root { max-width: 390px }`) avec de grandes marges vides de chaque côté sur un écran large. Ce n'est pas un vrai layout desktop. À discuter/trancher : faut-il un vrai responsive desktop (surtout pour la partie coach, plus susceptible d'être utilisée sur ordinateur) ?

---

## 2026-08-05 — Session 17 : audit complet demandé par l'utilisateur, plusieurs vrais bugs trouvés

L'utilisateur a signalé 3 problèmes précis et demandé explicitement d'inspecter tout le reste du code pour trouver quoi améliorer. Trois bugs confirmés et corrigés, un quatrième (scroll intempestif sur Nutrition) pas encore identifié avec certitude.

### 🐛 1. FAB "Coach IA/Mon Coach" en collision avec d'autres boutons — 3 endroits
Le FAB global (`MemberLayout.jsx`, `fab.css` : `bottom:96px, right:16px, z-index:95`) se superposait à d'autres boutons fixes utilisant presque exactement la même zone :
- **`Nutrition.jsx`** — le bouton "+" (Ajouter un repas) était à `bottom:90, right:16, zIndex:95`, quasi identique au FAB. C'est le bug signalé par l'utilisateur ("modifier les boutons messages et ajouter un repas"). Déplacé à gauche (`left:16` au lieu de `right:16`).
- **`AICoach.jsx`** — le bouton d'envoi du chat IA (`bottom:100, zIndex:90`) avait exactement le même souci que celui déjà corrigé sur `Conversation.jsx` en Session 16, mais jamais étendu à cet écran. `/ai-coach` ajouté à la liste des routes qui masquent le FAB dans `MemberLayout.jsx`.
- **`RestTimer.css`** (timer de repos pendant une séance) — même zone (`bottom:100px, z-index:90`). Comme `/workout/session` n'a pas de raison de masquer complètement le FAB, remonté son z-index à 96 (au-dessus du FAB) plutôt que d'exclure la route.

### 🐛 2. Bibliothèques d'exercices trop courtes + fiches détail cassées pour tout exercice venant de l'API
Deux problèmes cumulés qui expliquent le ressenti "pas assez d'exercices" :
- **`ExerciseModal.jsx`** ne connaissait que les 24 exercices locaux codés en dur (`EXERCISE_DATA[id]`) — pour n'importe quel exercice venant de l'API (`api/exercises.js`, API Ninjas), la fiche détail retournait `null` **silencieusement** : aucune erreur, la fiche ne s'ouvrait juste jamais. Concrètement, même quand l'API renvoyait plein d'exercices, cliquer dessus pour voir les instructions ne faisait rien. Corrigé : repli sur les champs propres de l'exercice (`muscles`/`instructions`/`equipment` fournis par `useExercises.js`) quand il n'y a pas de fiche française curatée.
- **`WorkoutLibrary.jsx`** : bibliothèque locale (utilisée si l'API est indisponible/lente/limitée) doublée de 8 à 16 exercices par section (Maison/Salle/Dehors), avec fiches détaillées françaises complètes ajoutées dans `ExerciseModal.jsx` pour chacun des 24 nouveaux.

### 🐛 3. Cinq couleurs codées en dur cassaient le thème clair — trouvées en auditant le reste des écrans
Même famille de bug que ceux déjà corrigés plusieurs fois cette session (Landing, nav coach, CoachDashboard) : des valeurs `rgba(255,255,255,...)` ou hex codées en dur au lieu des tokens `--surface-2`/`--text-muted`/`--accent-ink`, invisibles ou à contraste cassé en thème clair.
- `Dashboard.jsx` : label + piste de la barre des macros (`#8A8A8A`/`#232323`), piste de la barre "Séances cette semaine" (`rgba(255,255,255,0.1)`).
- `CalorieRing.jsx` : piste de fond de l'anneau de calories (`rgba(255,255,255,0.08)`) — l'anneau est affiché en gros sur tout le Dashboard, donc bien visible dès qu'on est en thème clair.
- `global.css` : `.progress-bar` (classe **partagée** par Hydratation/Bilan/liste clients coach/etc.) avait sa piste en blanc dur.
- `global.css` : `.scan-btn-sub` — bug à deux niveaux dans la même ligne : cassé en thème clair (comme les autres) **et** contraste texte-sur-accent jamais attrapé par l'audit de Session 12 (ce dernier cherchait `color:#fff`/`white`, pas la forme `rgba(255,255,255,0.6)`) — le sous-titre du bouton "Appareil photo" (fond citron) était en blanc translucide au lieu de `--accent-ink`. Séparé en 3 règles par variante (primary/secondary/tertiary) au lieu d'un défaut partagé ambigu.

### ⚠️ Bug non résolu — scroll intempestif sur Nutrition (précisions obtenues, à corriger en priorité la prochaine session)
L'utilisateur rapporte : "quand je clique dessus la page descend toute seule" sur la page Nutrition. Cherché `autoFocus`/`scrollIntoView`/`window.scrollTo` dans tout le composant et ses dépendances directes (`SwipeableRow`, `NutriscoreBadge`, `BottomNav`) — rien trouvé qui expliquerait un scroll automatique vers le bas avec certitude. **Pas corrigé** dans cette session, faute de budget pour creuser davantage.

**Précisions données par l'utilisateur, à exploiter dès le début de la prochaine session** :
- Ça arrive **systématiquement**, pas seulement parfois.
- Ça se déclenche **juste après avoir tapé sur le bouton/onglet Nutrition** (donc au moment de la navigation vers la page, pas après un clic sur un élément précis à l'intérieur — carte, bouton scanner, etc. écartés).

Pistes pas encore explorées à checker en premier : le comportement de `BottomNav.jsx` au changement d'onglet (son listener de scroll utilise une ref `lastScrollY` qui n'est jamais réinitialisée entre deux navigations, seulement l'effet qui se réattache — possible incohérence au premier scroll event après un changement de page) ; l'animation `headerIn` sur `.screen-header` (translateY(-10px)→0, rejouée à chaque montage) ; et surtout comparer avec les autres écrans à onglet (Dashboard/Workout/Weekly) pour voir si le bug est spécifique à Nutrition ou généralisé mais seulement remarqué là.

### 💡 Idée produit à trancher — la bibliothèque d'exercices devrait-elle être 100% IA ?
Question posée par l'utilisateur : plutôt que la bibliothèque actuelle (locale + API Ninjas tierce, qu'on vient de doubler et de déboguer), est-ce que ce ne serait pas mieux de ne garder **que de l'IA** pour proposer des exercices sur cette page — tout en gardant la possibilité de logger les exercices réellement faits dans la journée (le flux "séance"/`WorkoutSession.jsx` resterait inchangé, c'est bien la bibliothèque de découverte qui serait concernée). Pas tranché, pas commencé — juste évoqué en fin de session, à creuser avec l'utilisateur avant de coder quoi que ce soit (impact : remplacerait potentiellement tout le travail qu'on vient de faire sur `WorkoutLibrary.jsx`/`ExerciseModal.jsx`/`api/exercises.js`, donc à valider clairement avant de s'y lancer).

Build validé après chaque lot. Comme toujours, aucune vérification visuelle possible dans ce sandbox. **Session arrêtée ici faute de budget tokens restant** — PR #18 poussée et déployée sur preview, toujours en draft, pas mergée.

---

## 2026-08-04 — Session 16 (suite 6) : push notifications, côté membre uniquement

### ✅ Variables VAPID ajoutées par l'utilisateur dans Vercel
Les 4 variables (`VAPID_PUBLIC_KEY`, `VITE_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`) sont configurées sur Production + Preview. Push notifications membre normalement opérationnelles une fois ce commit déployé.

### ✅ Notification IA — relance après inactivité (le seul des 4 cas d'usage retenu)
Question posée par l'utilisateur : est-ce que l'IA peut aussi notifier un membre directement, et à quels moments ça aurait du sens ? Proposé 4 pistes (relance inactivité / récap hebdo IA / encouragement post-séance / rappel repas), l'utilisateur n'a retenu **que la première** — la seule avec une vraie donnée de détection déjà existante (le calcul ON TRACK/AT RISK/INACTIVE de `coachStats.js`) et un vrai enjeu business (rétention).

- **`api/cron/inactivity-nudge.js`** (nouveau) : job quotidien (Vercel Cron, `vercel.json`) qui pousse une notif aux membres passés INACTIVE (aucune activité depuis 5+ jours, même seuil que `computeStatus()` côté coach) — **une seule fois par épisode d'inactivité**, pas tous les jours tant qu'ils restent inactifs (nouvelle colonne `profiles.last_inactivity_nudge_at` pour le tracking).
- Utilise la **service_role key** (déjà présente dans les réglages Vercel du projet, contrairement aux clés VAPID) — c'est un job système sans utilisateur connecté à qui rattacher un token RLS, contrairement à `api/send-push.js` (déclenché par un coach qui écrit à un membre précis). Lit toutes les activités + tous les abonnements push, en bypassant RLS volontairement.
- Message volontairement simple/statique pour cette v1 ("Ça fait quelques jours qu'on ne t'a pas vu — une petite séance aujourd'hui ?"), pas généré dynamiquement par Claude à chaque envoi — évite un appel IA coûteux par notification pour un message qui n'a pas besoin d'être personnalisé pour être utile.

### ⚠️ Deuxième variable Vercel à ajouter : `CRON_SECRET`
En plus des 4 clés VAPID, il faut une 5ᵉ variable pour sécuriser l'endpoint cron (sinon n'importe qui trouvant l'URL pourrait déclencher des envois en masse) :
```
CRON_SECRET=466e56ae6c87d079447b7ed1eb01783b835f81f85c29125d
```
**Production uniquement suffit** (les cron jobs Vercel ne s'exécutent que sur les déploiements de production, jamais sur les previews). `SUPABASE_SERVICE_ROLE_KEY` était déjà présente en Production dans les réglages du projet (vue dans une capture d'écran de l'utilisateur) — rien à ajouter pour celle-là.

Demandé de démarrer les push notifications, **scopées côté membre uniquement** ("mais juste pour la partie membre") — un membre reçoit une vraie notification push quand son coach lui écrit. Pas de push côté coach dans cette passe.

### ⚠️ Bloquant à connaître : variables d'environnement Vercel non configurées
Je n'ai aucun outil pour ajouter des variables d'environnement dans Vercel — le code est complet et fonctionnel, mais **rien ne marchera tant que l'utilisateur n'a pas ajouté 4 variables manuellement** dans les réglages du projet Vercel (Production + Preview) :
```
VAPID_PUBLIC_KEY=BO6IQmSJEznpslPC0IzESOSwB1XYD1zBADFdCrKhugc9IVyd246VDiB_XIvw6hxicdLSqoRiOIEtft4r10VumwI
VITE_VAPID_PUBLIC_KEY=BO6IQmSJEznpslPC0IzESOSwB1XYD1zBADFdCrKhugc9IVyd246VDiB_XIvw6hxicdLSqoRiOIEtft4r10VumwI
VAPID_PRIVATE_KEY=5EyfgBPaZiNQBrC2eXhugcw0DnS0p5H18oRc-kUMaP0
VAPID_SUBJECT=mailto:contact@onairapp.com
```
`VAPID_PRIVATE_KEY` ne doit **jamais** être exposé côté client — seul `VITE_VAPID_PUBLIC_KEY` (même valeur que `VAPID_PUBLIC_KEY`, préfixe `VITE_` requis pour que Vite l'expose au bundle) l'est. Clés générées avec `web-push` (`generateVAPIDKeys()`), documentées aussi dans `.env.example`. **Sans ces variables sur Vercel, le bouton "Notifications push" dans Settings échouera silencieusement (`push not configured`).**

### ✅ Infrastructure
- Migration `add_push_subscriptions` : table `push_subscriptions` (une ligne par navigateur/appareil abonné). RLS : chacun gère ses propres abonnements (select/insert/update/delete), **plus** une policy `is_coach()` en lecture/suppression permettant à `api/send-push.js` de lire les abonnements d'un membre avec le **propre token du coach expéditeur** — pas besoin de `service_role` key, même logique déjà utilisée pour `objectifs`/`repas`/`seances`. Migration séparée `allow_coach_cleanup_stale_push_subscriptions` pour la suppression (oubliée dans la première passe, sinon le nettoyage des abonnements morts échouait silencieusement sous RLS).
- `api/send-push.js` (nouveau) : reçoit `{receiverId, title, body, url}`, authentifié (`requireUser`), utilise `web-push` avec les clés VAPID pour envoyer à tous les abonnements du destinataire. Nettoie automatiquement les abonnements expirés (404/410 du service de push).
- `src/utils/push.js` (nouveau) : `subscribeToPush()`/`unsubscribeFromPush()`/`getPushSubscriptionState()` — gère la permission navigateur + l'upsert/delete dans `push_subscriptions`.
- `public/sw.js` : gestion des événements `push` (affiche la notif) et `notificationclick` (focus/ouvre l'app sur l'URL pertinente).

### ✅ Déclencheur branché : nouveau message du coach
`sendMessage()` dans `messages.js` appelle maintenant `/api/send-push` en best-effort après l'insertion d'un message (jamais bloquant, jamais visible par l'utilisateur si ça échoue). Comme la lecture des abonnements côté serveur est gated par `is_coach()`, un membre qui écrit à son coach ne déclenche silencieusement aucun envoi (0 ligne lisible) — pas besoin d'un check de rôle explicite dans le code.

### ✅ UI réelle dans `Settings.jsx` (membre)
Nouveau toggle "Notifications push" tout en haut de la section Notifications — **contrairement aux 3 toggles existants juste en dessous (hydratation/séance/récap hebdo, toujours de purs placeholders locaux)**, celui-ci fait vraiment quelque chose : demande la permission navigateur, s'abonne/désabonne réellement, persiste en base. Affiche un message si l'utilisateur a bloqué les notifications au niveau du navigateur.

Build validé, `node --check` sur `api/send-push.js` (endpoint serverless, pas passé par le build Vite). Comme toujours, pas de vérification visuelle ni fonctionnelle réelle possible dans ce sandbox — **et cette fois, impossible de tester même une fois les clés ajoutées, sans un vrai appareil/navigateur qui accepte les notifications**, à valider entièrement par l'utilisateur une fois les variables Vercel configurées.

### Reste après cette session
- **Push côté coach** (un membre écrit → le coach reçoit une notif) — pas fait, scope explicitement limité au membre cette fois.
- **Les 3 toggles de rappels dans `Settings.jsx`** (hydratation/séance/récap hebdo) restent des placeholders — nécessiteraient une vraie logique de déclenchement programmée (cron), pas juste un événement en direct comme les messages.
- **`prevent_self_role_escalation()` public en RPC** — toujours pas nettoyé, pas urgent.

---

## 2026-08-04 — Session 16 (suite 5) : brief UI Coach — 5 points identifiés par Claude, à traiter

L'utilisateur n'avait jamais donné de brief concret sur "l'UI Coach à recadrer" (confirmé en relisant tout le journal — juste des confirmations répétées que ça devait être revu, jamais de détail). Demandé à Claude de proposer lui-même ce qui cloche, contenu (pas juste style). Liste ci-dessous validée par l'utilisateur ("je veux tout ce que tu viens de dire") :

1. **`ClientsList.jsx` — badge objectif toujours "-"** : le champ objectif qualitatif (ex. "Prise de masse") choisi à l'onboarding n'était jamais persisté dans `profiles` (uniquement dans `user_metadata`), donc le badge affiche "-" pour 100% des membres, en permanence — plus trompeur qu'utile.
2. **Aucune pastille de message non lu dans la nav coach.** Le coach n'a aucun moyen de savoir qu'un membre lui a écrit sans ouvrir l'onglet Messages à chaque fois.
3. **`MemberDetail.jsx` ne montre que des moyennes**, jamais le détail réel (quels repas, quelle séance) — utile pour repérer un problème précis, pas juste suivre une tendance.
4. **Pas de notes coach.** Aucun champ pour que le coach garde une note privée sur un membre (blessure, objectif particulier, etc.).
5. **Dashboard coach potentiellement vide la moitié du temps** — "Actifs aujourd'hui" n'affiche rien si personne n'a bougé depuis ce matin, pas de repli sur l'activité récente.

### ✅ 1. Objectif membre persisté + badge réel
- Migration `add_objectif_to_profiles` : nouvelle colonne `profiles.objectif` (text), backfillée pour les comptes existants depuis `raw_user_meta_data->>'goal'` (auth.users) là où elle était déjà connue.
- `AuthContext.jsx` (`updateUserProfile`) : `objectif` ajouté à l'upsert `profiles`, en plus de `user_metadata` — persisté aux deux endroits maintenant (Onboarding et modifications ultérieures dans Settings).
- `ClientsList.jsx` : badge lit `m.objectif` (vraie colonne) au lieu de `m.goal` (jamais rempli). Ajouté `'Nutrition'` à `GOAL_COLORS` (option d'onboarding manquante de la palette).

### ✅ 2. Pastille non-lu sur l'icône Messages du nav coach
- Nouveau `fetchUnreadCount(userId)` dans `src/utils/messages.js` (`count: 'exact', head: true` — pas de payload transféré, juste le nombre).
- `CoachNav.jsx` : petit point citron sur l'icône Messages si `unreadCount > 0`, rafraîchi au montage (la nav se remonte à chaque navigation entre écrans coach, donc reste à jour sans logique supplémentaire).

### ✅ 3. Détail des repas/séances récents dans `MemberDetail.jsx`
- Nouveau `fetchMemberRecentActivity(userId)` dans `coachStats.js` : 8 derniers repas + 8 dernières séances (lecture seule, mêmes policies déjà en place).
- Deux nouvelles sections "DERNIERS REPAS" / "DERNIÈRES SÉANCES" sous les stats agrégées existantes.

### ✅ 4. Notes coach privées
- Migration `add_coach_notes` : nouvelle table `coach_notes` (une note par paire coach↔membre, upsert). RLS stricte : **seul le coach auteur** peut lire/écrire sa note — même un autre coach ne la voit pas, et un membre n'y a jamais accès (aucune policy ne le permet).
- `MemberDetail.jsx` : nouvelle section "NOTES COACH" — textarea + bouton enregistrer, charge la note existante au montage.

### ✅ 5. Dashboard coach — repli sur l'activité récente si personne n'est actif aujourd'hui
- `CoachDashboard.jsx` : si `activeToday` est vide, la section bascule sur les 5 membres les plus récemment actifs (n'importe quand, pas juste aujourd'hui) sous le label "ACTIVITÉ RÉCENTE" au lieu de rester sur un écran quasi blanc.

Build validé après chaque lot. Comme toujours, pas de vérification visuelle possible dans ce sandbox — à confirmer sur la preview, en particulier les notes coach (nouvelle feature jamais vue) et le badge non-lu.

### 🐛 Retour utilisateur sur la preview : nav bar "dégueulasse", corrigé
`.nav-pill` avait `background: var(--bg)` — **exactement la même couleur que le fond de la page**, donc aucun contraste de surface propre (contrairement à toutes les autres cartes de l'app, qui utilisent `--surface` pour "monter" du fond noir). Quasi invisible en clair, complètement plat en sombre — la barre entière, et le bouton "Board" surélevé avec, se fondaient dans le fond. Passé à `var(--surface)`, bordure de découpe du bouton surélevé alignée dessus (`var(--surface)` au lieu de `var(--bg)`), ombre du bouton renforcée. Root cause identique à celle déjà documentée en Session 12 pour d'autres composants — un `--bg` copié-collé au lieu de `--surface` sur un composant réutilisé partout dans l'app.

### 🐛 Deuxième retour utilisateur (capture à l'appui) : le bouton "Board" restait décalé
Le fix de contraste ci-dessus était déployé et confirmé actif (vérifié via l'API Vercel — le SHA déployé correspondait bien au dernier commit), donc pas un souci de cache comme d'abord suspecté. La vraie cause, visible sur la capture envoyée par l'utilisateur : **le bouton surélevé n'était pas au centre de la barre**. `.nav-pill` utilisait `justify-content: space-between` sur 4 éléments à plat (2 tabs à gauche, le bouton élevé, 1 tab à droite) — le bouton se retrouvait 3ᵉ sur 4, donc visiblement décalé à droite. Ça fonctionnait par coïncidence côté membre (2+1+2=5, parfaitement symétrique), pas côté coach. Corrigé en enveloppant les tabs gauche/droite dans des conteneurs `flex:1` (`.nav-pill-side`) — le bouton élevé est maintenant garanti au centre visuel réel, peu importe le nombre d'icônes de chaque côté.

### 🔄 Troisième retour utilisateur : le bouton "Board" est maintenant centré mais les espacements restent bancals — nav bar revenue à un layout plat
Une fois vraiment centré, le nouveau souci est apparu sur la capture suivante : Clients/Messages collés serrés à gauche, un grand vide, le bouton élevé, un autre grand vide, Réglages tout seul à droite — techniquement centré mais visuellement déséquilibré (rythme d'espacement irrégulier). **L'utilisateur a tranché : revenir à la barre plate d'origine plutôt que continuer à chasser un espacement propre avec seulement 4 icônes** (contrairement au nav membre, qui a 5 éléments et se prête naturellement au 2+1+2). `CoachNav.jsx` repassé sur les 4 onglets à plat (Board, Clients, Messages, Réglages), espacés uniformément par `justify-content: space-between` — qui fonctionne bien avec un nombre pair d'éléments identiques, contrairement au mélange elevated+plat. Garde le fix de contraste (`--surface`) et la pastille non-lu sur Messages. `.nav-pill-side`/`.nav-tab-active` retirés de `nav.css` (plus utilisés) ; `.nav-btn-elevated` conservé, toujours utilisé par le bouton "+" membre.

**Conclusion pour la prochaine session si le sujet revient** : le style "bouton surélevé au milieu" ne marche proprement qu'avec un nombre impair d'icônes réparties symétriquement (comme les 5 du nav membre). Le nav coach en a 4 — soit on retire un onglet pour en avoir 5 avec un élément central logique, soit on garde la barre plate. Pas de solution intermédiaire propre trouvée.

---

## 2026-08-04 — Session 16 (suite 4) : nav bar coach alignée sur le style membre

Demande explicite de l'utilisateur : "je veux la même [nav] qu'il y a sur la partie membre". Le nav membre a 5 éléments (2 + bouton citron surélevé au milieu + 2) ; le nav coach n'en a que 4 (Board/Clients/Messages/Réglages), sans bouton central — question posée : que doit faire le bouton surélevé côté coach ? **Réponse : élever l'onglet "Board" (CoachDashboard) au milieu**, plutôt qu'un vrai bouton d'action "+" ou un simple alignement de style sans cercle.

### ✅ `CoachNav.jsx` réorganisé
- Nouvel ordre : Clients, Messages, **[Board surélevé]**, Réglages (2 + 1 + 1, la nav coach n'ayant que 4 items contre 5 côté membre — pas de symétrie parfaite possible, mais le traitement visuel est identique).
- Réutilise `.nav-btn-elevated` (même cercle citron 56px que le bouton "+" membre) mais **pas** la classe `.active` du "+" : celle-ci fait tourner l'icône à 135° (pensée pour transformer visuellement un "+" en croix de fermeture), ce qui aurait fait tourner l'icône grille de Board de façon incongrue sur un simple onglet de navigation. Nouvelle classe `.nav-tab-active` ajoutée dans `nav.css` : même surbrillance de bordure, sans rotation.

Build validé. Comme toujours, pas de vérification visuelle possible dans ce sandbox — à confirmer sur la preview.

---

## 2026-08-04 — Session 16 (suite 3) : tour côté coach, 2 bugs trouvés + reskin

Demandé un tour rapide de tout le côté coach avant de continuer. Deux vrais bugs trouvés (pas juste du visuel) :

### 🐛 `ClientsList.jsx` — stats jamais chargées, en silence
Contrairement à `CoachDashboard.jsx`/`MemberDetail.jsx`, cet écran ne récupérait que `profiles.*` et n'appelait jamais `fetchMemberActivitySummaries()` — chaque carte affichait "Vu — · — séances", barre de progression toujours à 0%, bordure de statut jamais colorée, et **les filtres TOUS/ON TRACK/AT RISK/INACTIVE ne matchaient jamais rien** puisque `m.status` était toujours `undefined`. Corrigé — même pattern que `CoachDashboard.jsx`.

### 🐛 `MemberDetail.jsx` — le bouton "Envoyer un message" simulait l'envoi
Modale locale (`setTimeout`, aucune écriture en base) qui datait d'avant la messagerie persistée — à l'époque un placeholder honnête, devenu un vrai piège une fois la vraie messagerie construite (le coach croit avoir envoyé un message, rien ne part). Remplacé par une navigation directe vers la vraie conversation (`/coach/messages/:id`). L'**analyse IA** juste en dessous, elle, fonctionne correctement (vraies stats du membre envoyées au prompt) — vérifié, rien à corriger dessus.

### ✅ Reskin Neon coach — dernière ligne droite
- `CoachDashboard.jsx` : label "ON AIR" était en citron (`.text-accent`) au lieu de bleu — même bug que Hydration/Sleep plus tôt cette session, corrigé en `var(--accent-secondary)`.
- `MemberDetail.jsx`, `CoachSettings.jsx` : bordures 0.5px → 2px pour matcher `.card`.
- `ClientsList.jsx`, `CoachMessages.jsx` : déjà propres après le fix ci-dessus / le fix email de tout à l'heure.

### Reste après cette passe
- ~~Design de la nav bar coach~~ — fait en Session 16 (suite 4), voir plus haut.
- **`CoachDashboard.jsx`** : le bouton "VOIR →" dans les alertes reste en citron (`.text-accent`) — laissé tel quel, lecture comme un lien d'action (CTA) plutôt qu'un label d'en-tête, pas le même bug que les labels.

---

## 2026-08-04 — Session 16 : comptes coach de test créés, messagerie en cours

### ⚠️ À faire — signalé par l'utilisateur, priorité
**Revoir le design de la nav bar côté coach** (`CoachNav.jsx`). Repéré en vérifiant la fiche `MemberDetail.jsx` sur la vraie preview — l'utilisateur veut que ce soit retravaillé, pas de détail donné sur la direction pour l'instant. À rattacher au chantier "UI Coach à recadrer" déjà en attente côté Coach (voir plus bas) — probablement la même discussion à avoir avec l'utilisateur sur ce qu'il veut voir changer.

### ✅ Comptes de test coach créés/corrigés en prod
- `coach@onairapp.com` (existait déjà, jamais utilisé) — mot de passe réinitialisé, reste `role='coach'`. C'est le compte à utiliser côté coach.
- `goodghost696@gmail.com` (Arnaud, compte principal de l'utilisateur) — temporairement promu `coach` par erreur puis **repassé `member`** immédiatement sur demande de l'utilisateur : il doit rester membre pour servir de compte de test côté membre pendant que `coach@onairapp.com` sert de compte coach.
- Vérifié en vrai sur la preview : connexion coach fonctionne, `MemberDetail.jsx` affiche bien les vraies données d'Arnaud (objectifs réels, séances 7j, etc.) — juste "INACTIVE"/valeurs à "—" car pas encore d'activité loggée récente, comportement normal.

### ✅ Messagerie persistée — testée bout en bout, fonctionnelle
Table `messages` + policies RLS (lecture par les deux participants, écriture limitée aux paires membre↔coach réelles, `read_at` modifiable par le destinataire uniquement) + branchement de `Conversation.jsx`/`CoachMessages.jsx`/`Messages.jsx` sur les vraies données avec abonnement realtime Supabase (deux appareils connectés voient les messages arriver sans refresh). **Confirmé par l'utilisateur en conditions réelles (ordi coach ↔ phone membre) après les correctifs ci-dessous.** Poussé sur la PR #12 (pas encore mergée dans `claude/charming-mendel-dj1GQ`).

### 🐛 Bugs trouvés en testant sur téléphone, corrigés
- **`CoachNav.jsx` cassée en CSS** — les icônes de la nav coach étaient enfants directs de `.bottom-nav`, qui n'a pas de `display:flex` propre (contrairement à `BottomNav` qui les enveloppe dans `.nav-pill`) : elles s'empilaient verticalement en bas à gauche au lieu d'une barre horizontale, et ce bloc mal formé passait *par-dessus* le champ de message de `Conversation.jsx` (z-index 100 vs 90) — impossible d'écrire un message côté coach, le champ existait mais était caché dessous. Corrigé en ajoutant le même wrapper `.nav-pill`. **Ce bug préexistait cette session, probablement déjà en prod depuis la Session 13** (nav jamais vérifiée en vrai sur mobile avant aujourd'hui).
- **Contours blancs sur Landing** — le thème clair activé ailleurs dans l'app persiste globalement (`data-theme` sur `<html>`, `localStorage`), et s'appliquait aussi à `body`/`#root` pendant que `Landing.jsx` reste volontairement toujours sombre (splash design) — d'où des marges blanches visibles autour de la colonne noire sur un écran plus large que 390px. `Landing.jsx` force maintenant `data-theme="dark"` le temps d'être monté, restaure la valeur précédente en la quittant. **Pas vérifié si Login/Onboarding ont le même souci** — pas de bug rapporté dessus pour l'instant, à surveiller.
- **RLS bloquait un membre de trouver "son" coach** — `profiles` n'avait qu'une policy coach→membres, jamais l'inverse ; `fetchPrimaryCoach()` côté membre renvoyait donc silencieusement rien (`Aucun coach disponible`). Nouvelle policy `SELECT` scopée aux lignes `role in ('coach','admin')` uniquement — un membre ne peut toujours pas lire le profil d'un autre membre par ce biais.
- **Deux profils "Arnaud" en base** (`goodghost696@gmail.com` + un compte de test fantôme `coach@onair.fr` jamais utilisé) — un message de test envoyé par erreur au mauvais "Arnaud", indiscernables dans la liste `CoachMessages`. Compte fantôme supprimé (cascade propre), et l'email est maintenant affiché sous le prénom dans la liste des conversations coach pour éviter que ça se reproduise avec de vrais clients homonymes.
- **FAB "Coach IA / Mon Coach" bloquait le bouton d'envoi côté membre** — le FAB global de `MemberLayout.jsx` (bottom:96px, z-index:95) se superposait exactement au bouton d'envoi de `Conversation.jsx` (bottom:100px, z-index:90), le rendant totalement inaccessible au clic. Masqué désormais sur les routes `/messages*` (redondant à cet endroit de toute façon).

### ✅ Reskin Neon membre terminé
`Scan.jsx`, `Hydration.jsx`, `Sleep.jsx`, `ResetPassword.jsx` — dernier glass remplacé par le style solide bordé, labels d'en-tête corrigés en bleu (`--accent-secondary`) comme sur les écrans principaux. PR #13, mergée dans `claude/charming-mendel-dj1GQ`. **Plus aucun écran membre en attente de reskin.**

### ⚠️ Toujours en attente
**Design de la nav bar coach à revoir** (demande initiale de l'utilisateur, voir plus haut) — le fix ci-dessus corrige la casse fonctionnelle (nav utilisable), pas le design lui-même.

---

## 2026-07-22 — Session 15 (suite 2) : PR #11 mergée, chantier découpé en deux (Membre / Coach)

**PR #11 mergée** dans `claude/charming-mendel-dj1GQ` (squash, commit `8b2e40c`) — thème clair Neon, navigation retour cohérente, modèle IA recette plus rapide, coach branché sur les vraies données, fix du choix de repas pour les recettes IA. Tout ce qui a été fait en Sessions 13-15 est maintenant sur la branche de dev principale.

**Décision organisationnelle de l'utilisateur** : diviser le reste du travail en deux chantiers séparés — **Membre** et **Coach** — plutôt qu'une liste unique. Répartition ci-dessous, état vérifié fichier par fichier au moment d'écrire ces lignes (notamment `CoachSettings.jsx`, jamais audité jusqu'ici : déjà sur données réelles — nom/email/code d'accès viennent du vrai compte, rien à corriger côté données là-dessus, juste du reskin visuel comme le reste du côté coach).

### 🧑 Chantier MEMBRE — reste à faire
- ~~Reskin Neon (`Scan.jsx`, `Hydration.jsx`, `Sleep.jsx`, `ResetPassword.jsx`)~~ — fait en Session 16 (PR #13, mergée) : glass restant remplacé par le style solide, labels d'en-tête corrigés en bleu. **Reskin membre entièrement terminé.**
- **Thème clair** : jamais vu en vrai sur la preview — la valeur d'accent assombrie (`#3D5200`) a été choisie par calcul de contraste, pas par l'œil, à valider ou ajuster.
- **Push notifications** : décidé "vraies push" (Session 14), rien construit. C'est principalement un chantier membre (c'est lui qui les reçoit) même si le déclenchement peut venir d'actions coach (ex. réponse à un message).
- ~~Messagerie persistée~~ — faite et testée en Session 16, voir plus haut.

### 🧑‍💼 Chantier COACH — reste à faire
- ~~Reskin Neon (`CoachDashboard.jsx`, `ClientsList.jsx`, `MemberDetail.jsx`, `CoachMessages.jsx`, `CoachSettings.jsx`)~~ — fait en Session 16 (suite 3, PR #14 mergée). **Reskin coach entièrement terminé**, plus rien en glass nulle part dans l'app.
- **UI Coach à recadrer** : l'utilisateur a confirmé qu'il faudra s'y mettre mais sans détail sur quoi changer précisément — nécessite un brief avant de coder quoi que ce soit. La **nav bar coach** (demandée Session 16) est réglée à part, voir plus haut — ne fait plus partie de ce point en attente.
- ~~Messagerie persistée~~ — faite et testée en Session 16, voir plus haut.
- **Nettoyage sécurité mineur** : `prevent_self_role_escalation()` (le trigger anti-escalade de rôle) est appelable en RPC public par `anon`/`authenticated` — même défaut déjà corrigé sur `is_coach()`. Concerne l'espace coach (protection des comptes coach/admin), pas exploitable en pratique, pas urgent.
- **Toggles de notifications non fonctionnels** : "Alertes membres"/"Nouveaux messages" dans `CoachSettings.jsx` ne font rien (état local seulement) — dépend du chantier push notifications ci-dessus.

### Transversal (ni purement membre, ni purement coach)
- Push notifications (déjà listé côté membre, le toggle de préférence existe aussi côté coach).

---

## 2026-07-22 — Session 15 (suite) : choix du type de repas avant de générer une recette IA

Retour utilisateur en testant la PR #11 : "Idée recette" proposait un repas au hasard, sans demander petit-déj/déjeuner/dîner/collation — le prompt envoyé à l'IA n'incluait jamais cette info alors que le sélecteur de type de repas existait déjà dans l'écran, mais seulement *après* la génération (pour classer la recette une fois créée, pas pour la générer).

### ✅ `Nutrition.jsx` — le type de repas est maintenant demandé avant de générer
- Nouvelle étape 1 dans la sheet "Idée recette" : liste des 4 types de repas à choisir (au lieu d'appeler l'IA immédiatement au clic sur le bouton).
- Le prompt envoyé à Claude inclut maintenant explicitement le repas concerné, avec l'instruction de proposer quelque chose de cohérent avec ce moment de la journée (pas un plat de dîner suggéré pour un petit-déjeuner).
- Le sélecteur redondant qui apparaissait après génération (pour reclasser la recette) est retiré — le choix fait en amont sert directement à classer le repas au moment de l'ajouter.
- Séparé cet état (`recipeMealType`) du `mealType` déjà utilisé par le flux d'ajout manuel d'aliment, pour éviter que les deux sheets ne se marchent dessus.

Build validé, poussé sur la PR #11 existante (pas de nouvelle PR).

---

## 2026-07-22 — Session 15 : audit complet + côté coach branché sur les vraies données

Demandé un audit complet de l'app. Points marquants trouvés :
- **Sécurité** : les correctifs critiques de Session 11 tiennent toujours. Nouveau point mineur : `prevent_self_role_escalation()` (le trigger anti-escalade) est appelable en RPC public par `anon`/`authenticated` — même défaut que celui déjà corrigé sur `is_coach()` (grant `PUBLIC` par défaut sur toute fonction). Pas exploitable en pratique (une fonction trigger appelée hors contexte trigger échoue), **pas encore corrigé** — à faire par cohérence, pas urgent.
- **`npm audit`** : 0 vulnérabilité en prod. 2 signalées côté outils de dev uniquement (vite/esbuild), n'affectent pas le build livré.
- **Découverte majeure : le côté coach donnait une fausse impression de marcher.** `ClientsList.jsx` interrogeait bien la vraie base, mais `CoachDashboard.jsx`, `MemberDetail.jsx` et `CoachMessages.jsx` tournaient tous sur des `MOCK_MEMBERS` codés en dur. C'était l'étape 5-6 de la roadmap de persistance (jamais faite), invisible tant qu'on n'avait pas vérifié fichier par fichier — une session qui n'aurait vérifié que `ClientsList.jsx` aurait conclu à tort que "le coach marche".

Utilisateur a validé de traiter la partie **données réelles** (repas/séances/activité/objectifs pour le coach) tout de suite, et de laisser la **messagerie persistée** (aucune table `messages` n'existe dans le schéma) comme chantier séparé, pas fait cette session.

### ✅ Migration Supabase — coachs en lecture seule sur les données membres (`add_coach_read_access_to_member_data`)
Nouvelles policies `SELECT` sur `objectifs`, `repas`, `seances`, `activite_jour`, gated par `is_coach()` — même pattern que la policy déjà existante sur `profiles`. **Lecture seule uniquement** : aucun GRANT INSERT/UPDATE/DELETE ajouté, un coach ne peut que consulter, jamais modifier les données d'un membre. Appliqué en prod puis vérifié directement via `pg_policies`. `scripts/supabase_schema.sql` mis à jour dans la foulée (comme prescrit en tête de ce fichier).

### ✅ `src/utils/coachStats.js` (nouveau) — calcul du statut réel par membre
- `fetchMemberActivitySummaries(userIds)` : 2 requêtes au total (pas une par membre) pour agréger `seances`/`activite_jour` sur tous les clients d'un coup — calcule un vrai `status` (ON TRACK / AT RISK / INACTIVE) à partir de la récence et du volume d'activité réels, plus `lastActiveDate`/`sessionsThisWeek`. Remplace entièrement les champs `status`/`lastSeen`/`sessions` fictifs des `MOCK_MEMBERS`.
- `fetchMemberDetailStats(userId)` : version détaillée pour la fiche d'un seul membre — moyennes calories/sommeil/pas sur les données réelles, dates de séances de la semaine pour le graphique, `objectifs` réels.
- **Note sur l'"objectif" qualitatif (ex. "Prise de masse")** : ce champ n'existe **nulle part en base** — il vit uniquement dans `user_metadata` de Supabase Auth (jamais persisté dans `profiles`), donc un coach ne peut pas le lire via le SDK client (ça nécessiterait `service_role`, volontairement pas exposé côté client). Remplacé par les vrais objectifs numériques de la table `objectifs` (calories/protéines/pas/eau) plutôt que d'essayer de faire semblant.

### ✅ `CoachDashboard.jsx`, `MemberDetail.jsx` branchés sur les vraies données
- Stats du tableau de bord (Clients/Séances 7j/Alertes/Actifs) toutes calculées depuis les vraies tables, plus de "Progression +12%" inventée.
- Fiche membre : poids/taille réels (`profiles`), séances/calories/sommeil/pas réels (moyennes calculées), graphique hebdo réel, objectifs réels. L'analyse IA envoie maintenant les vraies stats du membre au prompt au lieu des données mockées.

### ✅ `CoachMessages.jsx`/`Conversation.jsx` — dépendance à `MOCK_MEMBERS` retirée sans faire semblant
Comme la messagerie n'est pas persistée (décision : chantier séparé), remplacé la liste de conversations par les vrais clients (`profiles`) mais **sans inventer de faux derniers messages à côté d'un vrai prénom** — ç'aurait été pire que le mock initial (attribuer une fausse citation à une vraie personne). Affiche "Aucune conversation pour l'instant" à la place. `Conversation.jsx` récupère le vrai prénom du membre pour l'en-tête ; le contenu de la conversation reste un placeholder générique (plus haut de citer "Léo" alors que n'importe quel membre réel peut maintenant s'afficher dans ce header).

### 🐛 Bugs trouvés en marge, corrigés au passage
- `Conversation.jsx` référençait `<BottomNav />` sans jamais l'importer — plantage runtime garanti pour un membre ouvrant `/messages/coach` (le cas `isCoach=false`). Import ajouté.
- **Contraste** : `Conversation.jsx` (bulle de message + bouton envoyer) et `AICoach.jsx` (bouton envoyer) mettaient du texte/icône `'#000'`/`'#fff'` codé en dur sur fond `var(--accent)` — avec le thème clair qui inverse `--accent-ink` en blanc sur un fond citron assombri, un `'#000'` codé en dur y serait devenu noir-sur-noir. Basculé sur `var(--accent-ink)` partout, plus robuste aux deux thèmes.
- `Rings.jsx` supprimé (voir plus haut) confirmé mort ; profité de l'audit pour vérifier qu'aucun autre écran n'a le même problème.

Build validé. Toujours aucune vérification visuelle possible dans ce sandbox — **particulièrement important cette fois** : impossible de créer de vrais comptes coach/membre de test avec des séances/repas réels pour vérifier que les calculs de moyennes/statuts sont right, à tester en conditions réelles par l'utilisateur.

### Reste ouvert après cette session
- **Messagerie persistée** (nouvelle table + policies) — chantier séparé, pas commencé.
- **Push notifications** (décidé "vraies push" en Session 14) — pas commencé, nécessite VAPID + service worker + table d'abonnements + fonction d'envoi + décision sur les déclencheurs.
- Nettoyage sécurité mineur : `prevent_self_role_escalation()` public via RPC.
- Reskin Neon des écrans coach + Scan/Hydration/Sleep/ResetPassword (visuel uniquement, pas de données).
- UI Coach à recadrer avec l'utilisateur (contenu, pas juste le style).
- Thème clair : toujours pas vu en vrai sur la preview.

---

## 2026-07-22 — Session 14 : PR #10 mergée, thème clair Neon, navigation retour cohérente, décisions produit

**PR #10 mergée** dans `claude/charming-mendel-dj1GQ` (squash, commit `04e1106`) à la demande de l'utilisateur — tout le redesign Neon (Login → nav bar) est maintenant sur la branche de dev principale. Branche de session redémarrée proprement dessus (elle ne contenait plus que de l'historique déjà mergé).

L'utilisateur a répondu aux 7 points de la liste consolidée de la session précédente :

### ✅ 1. Thème clair migré vers Neon (`global.css`)
Le bloc `:root[data-theme="light"]` utilisait encore l'ancienne palette rouge/beige (`--accent:#bf0603`, `--accent-secondary:#C4956A`) — remplacé par une vraie variante claire du même système Neon :
- `--bg:#F2F2EF` (canvas gris clair neutre), `--surface:#FFFFFF` (cartes blanches qui "montent" du canvas — même logique inversée que le dark, où les cartes `#1A1A1A` montent du noir `#0A0A0A`).
- `--text-primary:#0A0A0A`, bordures/text-muted analogues en noir à faible opacité au lieu de blanc.
- `--accent-secondary:#0047FF` (même bleu qu'en dark, déjà lisible sur blanc, aucun changement nécessaire).
- **`--accent` assombri à `#3D5200`** (même famille citron, mais `#D4FF00` brut est quasiment invisible comme couleur de texte/bordure sur fond clair — c'est une teinte très proche du blanc). **`--accent-ink` inversé à blanc** pour ce thème (le texte sur un bouton citron doit être clair puisque le citron lui-même est maintenant foncé) — un bouton "citron" passe donc de *fond vif + texte foncé* en dark à *fond olive foncé + texte blanc* en clair, ce qui est le pattern habituel pour adapter un accent "néon" (pensé pour briller sur noir) à un fond clair.
- **Corrigé au passage** : `body { background: #0A0A0A }` était codé en dur (jamais lié à `--bg`) — sur un écran plus large que 390px, les marges autour de l'app seraient restées noires même en thème clair. Passé à `var(--bg)`.
- **⚠️ Seule valeur de cette session qui mériterait un vrai réglage à l'œil** : `#3D5200` a été choisi par calcul de contraste (accessible, ~3:1 sur blanc) plutôt que par sensation visuelle — impossible à vérifier dans ce sandbox. Si ça paraît trop terne/kaki une fois vu sur la vraie preview, c'est une seule variable à ajuster, pas une refonte.

### ✅ 2. Suggestions de notifications (réponse donnée, pas encore construit)
Voir réponse détaillée donnée à l'utilisateur en conversation — reste bloqué sur la même question qu'avant : notifications *in-app* (liste simple alimentée par les événements déjà trackés dans l'app, pas de vraie notif push) vs vraies push notifications (nécessite un service worker + une brique serveur d'envoi, bien plus gros chantier). Pas tranché, pas codé.

### ✅ 3. Navigation retour rendue cohérente
Convention appliquée : **les écrans racine (accessibles depuis un onglet de nav) n'ont pas de flèche retour ; tous les écrans "poussés" (ouverts depuis un autre écran) en ont une.**
- **Retirées** (redondantes, l'écran est une racine) : `Weekly.jsx` (onglet Bilan), `ClientsList.jsx` (onglet Clients côté coach).
- **Ajoutées** (poussés, n'en avaient pas) : `Settings.jsx` (n'est plus un onglet depuis la réorg de la nav bar — accessible uniquement via l'avatar du Dashboard, donc désormais "poussé"), `Messages.jsx` (liste des conversations, ouverte depuis le FAB Coach).
- **Déjà correctes, non touchées** : `WorkoutSession`, `WorkoutLibrary`, `WorkoutHistory`, `Scan`, `Hydration`, `Sleep`, `Conversation`, `MemberDetail`, `AICoach` (a bien un retour, juste une icône différente — repérée en vérifiant à la main après qu'un grep trop étroit l'ait ratée une première fois).
- **Repéré en marge, pas touché** : `Rings.jsx` a un bouton retour mais n'est référencé nulle part dans l'app (aucune navigation ne pointe vers `/rings`) — semble être du code mort du même genre que l'ancien `Run.jsx` supprimé en Session 10. Pas supprimé sans confirmation, à valider avec l'utilisateur.

### ✅ 4. Modèle plus rapide pour les recettes IA (`Nutrition.jsx`)
`claude-fable-5` → `claude-haiku-4-5-20251001` pour `generateRecipe()`. Comme plus rien n'utilise Fable 5 dans l'app, retiré de la liste blanche `ALLOWED_MODELS` dans `api/claude.js` (nettoyage, pas fonctionnel).

### 5. Leaked Password Protection — risque accepté
Décision de l'utilisateur enregistrée : on n'upgrade pas vers Supabase Pro pour l'instant, le risque résiduel (mots de passe compromis non filtrés à l'inscription) est accepté. Rien à coder, juste à ne plus proposer cette option tant que l'utilisateur ne revient pas dessus.

### 6. UI Coach — confirmé qu'il faudra s'y mettre, toujours pas cadré
L'utilisateur confirme qu'il faudra reprendre ce chantier, mais sans donner de détail sur ce qui doit changer précisément. Reste bloqué en l'état — il faudra lui redemander ce qu'il veut voir changer avant de coder quoi que ce soit.

### 7. Fusion coach + IA en SaaS multi-salles — réexpliqué à l'utilisateur
Il avait demandé de reformuler l'idée (voir réponse donnée en conversation, résumé de l'échange du 2026-07-16) : l'idée n'est pas d'abandonner le coach humain pour de l'IA, mais l'inverse — l'app avec un vrai coach humain (ON AIR Clichy) + IA en support est elle-même un produit qu'on pourrait, à terme, vendre en licence à d'autres salles/coachs indépendants plutôt que juste vendre un abonnement membre. Toujours pas de décision finale, juste reformulé pour clarifier.

Build validé après chaque lot de changements. Toujours aucune vérification visuelle possible dans ce sandbox — **le thème clair en particulier** (nouvelle fonctionnalité entière, jamais vue) mérite une vraie vérification sur la preview Vercel avant de considérer que c'est acquis.

---

## 2026-07-21 — Session 13 (suite 2) : le bouton central de la nav devient une action "+", réorganisation des onglets

Retour utilisateur après la preview : garder les icônes de nos 5 onglets mais les revoir ("carte blanche"), et surtout — le bouton citron central doit permettre d'ajouter **soit un repas, soit un exercice**, pas juste naviguer vers Workout. Questions posées avant de coder (le bouton ne peut plus être à la fois un lien direct vers Workout ET une action d'ajout) — réponses obtenues :
1. Icônes : carte blanche.
2. Au tap, un petit menu à 2 choix ("Nouveau repas" / "Nouvel exercice"). Pour "Nouvel exercice" : **pas question de repasser par tout le flow "démarrer une séance"** — cas d'usage réel donné par l'utilisateur : il a déjà fini sa séance et a juste oublié d'ajouter un exercice après coup. Doit être simple.
3. Le bouton Settings peut être retiré de la nav et déplacé ailleurs, discrètement.

### ✅ Réorganisation des 5 onglets (`BottomNav.jsx`, `nav.css`)
- **Nouvel ordre** : Dashboard, Nutrition, **[+ action]**, Bilan, **Workout** (remplace Settings à cette place).
- **Settings retiré de la nav** : accessible via l'avatar citron du header Dashboard (déjà ajouté plus tôt cette session, navigue vers `/settings`) — c'est la solution "discrète" demandée, pas de nouvel élément ajouté nulle part.
- **Icônes revues** : Bilan passe d'une ligne en zigzag à un vrai pictogramme bar-chart (3 barres pleines) pour être identifiable sans ambiguïté. Workout garde son icône haltère (déplacée, pas recréée). Dashboard/Nutrition inchangées (déjà claires — maison, fourchette+couteau).
- **Bouton central** : n'est plus un lien vers `/workout`, c'est maintenant une action "+" (icône plus simple) qui ouvre un petit menu (mêmes codes visuels que le FAB Coach IA déjà existant : pastilles arrondies qui apparaissent au-dessus, fond `#1A1A1A` bordé) avec deux choix.

### ✅ "Nouveau repas" → réutilise la sheet existante de Nutrition
`navigate('/nutrition', { state: { openAddMeal: true } })` — `Nutrition.jsx` consomme ce state au montage (`useEffect` sur `location.state`) pour ouvrir automatiquement la sheet d'ajout déjà existante (`openSheet()`), puis nettoie le state (`navigate(..., { replace:true, state:{} })`) pour ne pas la rouvrir sur un retour arrière ou un refresh.

### ✅ "Nouvel exercice" → nouvelle sheet légère, sans passer par une séance
Nouveau composant `QuickExerciseSheet` (dans `BottomNav.jsx`) : nom de l'exercice (texte libre, pas de bibliothèque à parcourir — volontairement simple comme demandé), séries/répétitions/poids. Nouvelle fonction `logQuickExercise()` dans `AppContext.jsx` :
- **Insère une ligne `seances` autonome** plutôt que de modifier une séance existante — `seances` n'a pas de policy `UPDATE` (décision volontaire du sprint sécurité de Session 11), donc éditer la "vraie" séance du jour après coup n'est pas possible sans migration. Insérer une nouvelle ligne reste possible (policy `INSERT` déjà là) et correspond bien au cas d'usage réel donné par l'utilisateur.
- **N'incrémente volontairement pas `weeklyWorkouts`** : ajouter un exercice oublié n'est pas "faire une séance de plus" — l'incrémenter aurait faussé le compteur "X/6 séances" affiché sur Dashboard/Workout/Weekly.
- Réutilise le même mapper `seanceFromRow()` que les vraies séances donc l'exercice ajouté apparaît normalement dans l'historique Workout et peut même alimenter "Mes charges" (`liftProgress.js`) s'il est refait plus tard — bénéfice secondaire, pas cherché activement.

Build validé. Toujours pas de vérification visuelle possible dans ce sandbox — à tester sur la preview Vercel, notamment : le menu "+" au-dessus de la nav bar, l'ouverture auto de la sheet Nutrition depuis le menu, et l'ajout d'un exercice rapide qui doit apparaître dans l'historique Workout sans changer le compteur de séances de la semaine.

**2026-07-22 — Retour utilisateur sur la preview : "Top !"** — la nav bar (menu +, réorganisation des onglets) est validée visuellement par l'utilisateur. PR #10 toujours en draft, pas mergée.

### 📋 Reste à faire — vue d'ensemble consolidée (à jour au 2026-07-22)
Cette liste remplace/complète les listes éparpillées plus bas dans le journal (Session 12, Session 11, etc. — laissées telles quelles comme historique, mais ne plus s'y fier pour savoir ce qui reste réellement à faire — se référer à celle-ci).

**Décisions produit à prendre par l'utilisateur (bloquent le travail tant qu'elles ne sont pas tranchées) :**
1. **Thème clair** : reste sur l'ancienne palette rouge, jamais migré vers Neon. À trancher : Neon aussi en clair, ou identité visuelle différente/désactivée ?
2. **Écran Notifications** : n'existe pas, présent dans le prototype. Nécessite de cadrer un vrai modèle de données (déclencheurs, persistance, lu/non lu) avant de coder quoi que ce soit — pas juste un reskin.
3. **Navigation retour incohérente** (backlog du 2026-07-16) : seul Weekly a une flèche retour parmi les écrans à onglet, ce qui est redondant. À trancher : convention unique pour tous les écrans poussés, ou on retire celle de Weekly.
4. **Lenteur des suggestions de recette IA** (Nutrition) : garder `claude-fable-5` (qualité, plus lent) avec un meilleur indicateur d'attente, ou basculer sur un modèle plus rapide pour cette fonctionnalité précise ?
5. **"Leaked Password Protection" Supabase** : bloqué sur le plan Free (fonctionnalité Pro uniquement). Décision business : upgrade payant ou accepter le risque résiduel.
6. **Revoir l'UI Coach** : demandé le 2026-07-10, mis en pause, jamais recadré depuis (pas de détail sur ce qui doit changer).
7. **Fusion coach + IA en SaaS multi-salles** : question stratégique long-terme posée par l'utilisateur le 2026-07-16, réponse de Claude donnée (voir plus bas), pas de décision finale ni de développement engagé.

**Travail de reskin Neon restant (une fois les décisions ci-dessus prises, ou en parallèle si l'utilisateur préfère avancer sans attendre) :**
- Écrans jamais vérifiés en détail cette session : `Scan.jsx` (un bouton en glass), écrans coach (`CoachDashboard.jsx`, `MemberDetail.jsx`, `ClientsList.jsx`, `CoachMessages.jsx`, `CoachSettings.jsx`), `Messages.jsx`, `Hydration.jsx`, `Sleep.jsx`, `Rings.jsx`. Bénéficient déjà partiellement des fix globaux (`.card`, `.btn-ghost`) mais pas passés en revue un par un.

**Projet séparé, hors périmètre onairapp :**
- Dashboard de suivi de conso tokens Anthropic (Session 8) — bloqué en attente que l'utilisateur vérifie si son compte Anthropic est en mode organisation (prérequis pour l'Admin API).

**Mise à jour (2026-07-22) :** PR #10 mergée dans `claude/charming-mendel-dj1GQ` — voir l'entrée Session 14 plus haut pour la suite (thème clair, navigation, décisions produit).

---

## 2026-07-21 — Session 13 (suite) : nav bar du bas restylée sur référence externe

L'utilisateur a envoyé un screenshot d'une référence externe (maquette générique, pas notre app) demandant explicitement de reprendre **seulement la nav bar du bas** (barre sombre, 5 icônes, bouton central surélevé dans un cercle citron), pas le reste du style de l'image (bold/flat citron-bleu-noir, déjà écarté en Session 11-12).

Clarifié avant de coder (l'utilisateur avait demandé qu'on lui pose des questions) :
1. Garder nos 5 onglets actuels (Dashboard/Nutrition/Workout/Bilan/Settings) plutôt que copier les icônes du screenshot (maison/check/+/cloche/profil) — **confirmé : on garde nos 5 onglets**, pas de nouvel écran Notifications à construire pour ça.
2. Quel onglet reçoit le traitement "cercle surélevé" — **Workout**, qui est déjà l'onglet du milieu dans notre ordre actuel donc aucune réorganisation nécessaire.

### ✅ `BottomNav.jsx` / `nav.css`
- Barre passée du style "pill flottante glass" (fond translucide + blur, centrée avec marge) à une **barre pleine largeur ancrée en bas**, fond `var(--bg)` solide bordé, cohérent avec l'abandon du glass partout ailleurs cette session.
- Icône Workout (déjà au milieu) surélevée dans un cercle citron 56px (`margin-top:-26px`, bordure `var(--bg)` 3px, ombre) — reproduit le bouton central du screenshot fourni, avec l'icône haltère existante à la place d'un "+" générique puisqu'on garde le sens réel de l'onglet.
- Couleurs icônes actif/inactif basculées sur `var(--text-primary)`/`var(--text-muted)` (théma-compatibles) au lieu des `rgba(255,255,255,...)` codés en dur.

Build validé. Pas de vérification visuelle possible dans ce sandbox (limitation déjà documentée) — à valider sur la preview Vercel, notamment le espacement avec le FAB Coach IA/Messages (bas-droite, `bottom:96px`) qui n'a pas été retouché et pourrait nécessiter un ajustement si ça chevauche visuellement la nouvelle barre.

---

## 2026-07-21 — Session 13 : Login/Auth passé à la charte Neon

**Contexte** : PR #8 (Session 12) a été mergée dans `claude/charming-mendel-dj1GQ` (commit `b74a0a5`) — la question "renommer ou découper la PR #8" du journal précédent est donc caduque, c'est déjà réglé. Demandé à l'utilisateur s'il voulait continuer directement sur les écrans restants ou attendre un retour sur la preview Vercel : réponse **continuer directement**, en commençant par Login.

### ✅ Login (`Login.jsx`) passé à la charte Neon
Récupéré le spec exact de l'écran Auth du prototype via `DesignSync`/`get_file` (le même fichier que Session 12) plutôt que de deviner :
- Titre "Bienvenue." (700 30px, `-0.02em`) à la place du bloc logo + "ORIGINAL FITNESS · CLICHY" (le logo/sous-titre reste sur Landing, pas besoin de le répéter ici).
- Tabs Connexion/Inscription : conteneur `#1A1A1A` bordé (`2px solid rgba(255,255,255,.15)`, `border-radius:16`), tab active fond citron **texte `--accent-ink` (foncé)** — **bug de contraste corrigé au passage** : l'ancien style mettait `color:'#fff'` sur l'onglet actif citron, exactement le défaut que l'audit de Session 12 avait pourtant traqué partout ailleurs (Login.jsx n'avait pas encore été comparé en détail, comme noté dans le journal précédent).
- Inputs : fond `#1A1A1A`, bordure `2px solid rgba(255,255,255,.15)`, `border-radius:14`, texte bold — remplace l'ancien style "glass" (blur transparent) qui ne correspondait plus à la charte Neon (le glass était un reliquat de l'ancien thème).
- Boutons de soumission (connexion, inscription, envoi lien reset) : passés en pill pleine largeur (`border-radius:999`) avec flèche "→", conformément au spec du prototype — différent du `.btn-accent` global (18px) utilisé partout ailleurs dans l'app, car le prototype réserve spécifiquement le pill total à l'écran Auth/Onboarding (Dashboard/Workout/Settings utilisent 16-18px, vérifié dans le fichier source).
- Placeholder text passé à `#9A9A9A` (valeur exacte du prototype) à la place de l'ancien `rgba(255,255,255,0.28)`.
- Champs signup (prénom/email/mot de passe/confirmation/code d'accès) et flux "mot de passe oublié" conservés tels quels (le prototype ne les a pas, c'est une simplification de démo) — seul le skin visuel a changé, la logique n'a pas bougé.

**Vérifié** : `npm run build` passe. **Tentative de vérification visuelle en local** (`vite preview` + Playwright, écran non-authentifié donc en théorie testable sans les limitations de screenshot connues) : échec, mais avec une cause différente de celle documentée en Session 12 — ce n'est pas un "loading" qui reste bloqué, c'est un crash JS immédiat (`supabaseUrl is required`) car `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` ne sont simplement pas configurées dans ce sandbox (pas de fichier `.env` local). Root cause différente mais conclusion identique à Session 12 : **impossible de vérifier visuellement dans ce sandbox**, à valider par l'utilisateur sur la preview Vercel (qui elle a les vraies variables d'env).

### ✅ Onboarding (`Onboarding.jsx`) passé à la charte Neon
Même méthode : spec exact déjà récupéré via `DesignSync` pendant cette session (même fichier prototype). Notre Onboarding réel a **6 étapes** (prénom/objectif/niveau/corps/fréquence/équipement) contre 3 dans le prototype (prénom/poids/objectif calorique, une démo simplifiée) — la structure reste la nôtre, seul le skin visuel + une brique manquante ont été alignés :
- Barre de progression : remplacée par des **segments individuels** (un par étape, `gap:6px`, `height:4px`, citron si atteint / `rgba(255,255,255,.15)` sinon) au lieu de l'ancienne barre continue à 2px — adapté du prototype (qui avait 3 segments fixes pour ses 3 étapes) pour rester correct avec nos 6 étapes.
- Libellé d'étape : `ON AIR — {n} / {total}` en citron, tel que le prototype.
- Titre 34px (au lieu de 26px), sous-titre en `--text-secondary` (0.55, au lieu de `--text-muted` à 0.35 — le prototype utilise bien la teinte la plus claire des deux pour le sous-titre).
- Inputs (texte, poids/taille) et cartes de choix (objectif/niveau/fréquence/équipement) : passés du style "glass" (blur transparent) au solide `#1A1A1A` bordé `2px rgba(255,255,255,.12-.15)`, cohérent avec Login et le reste de la charte.
- Bouton "Continuer/Commencer" passé en pill pleine (`border-radius:999`), comme le prototype. **État désactivé retravaillé plutôt que copié à l'identique** : le prototype garde un texte `#0A0A0A` (quasi noir) sur un fond `rgba(255,255,255,.15)` même désactivé — sur fond d'écran noir, ce fond translucide reste très sombre, donc le texte foncé y serait quasiment invisible. Corrigé en texte `rgba(255,255,255,.3)` (blanc cassé) sur ce même fond, cohérent avec l'esprit de l'audit de contraste de la Session 12 plutôt qu'une reproduction aveugle du prototype.
- **Ajouté un bouton "RETOUR"** (ghost, texte seulement) sous le bouton principal dès qu'on n'est plus à la première étape — présent dans le prototype mais absent de notre implémentation jusqu'ici (on ne pouvait pas revenir en arrière). Simple `setCurrentStep(s => s - 1)`, aucun état perdu puisque les réponses restent en mémoire.

Build validé après ce lot aussi. Toujours pas de vérification visuelle possible dans ce sandbox (même limitation Supabase), à valider sur la preview Vercel.

### L'utilisateur a dit d'enchaîner sur tout le reste ("tu peux tout faire, on corrige ensuite")
Continué sans repasser par une validation écran par écran. Détail ci-dessous.

### ⚠️ Découverte transversale : les labels d'en-tête d'écran étaient tous de la mauvaise couleur
Le prototype utilise **`#0047FF` (bleu, `--accent-secondary`)** pour le petit label d'en-tête de chaque écran principal ("ON AIR", "WORKOUT", "NUTRITION", "ACTIVITÉ") — vérifié dans les 4 sections du fichier prototype. Notre code utilisait `var(--accent)` (citron) partout, un reliquat probable du remplacement rouge→citron de la Session 12 qui n'avait pas fait cette distinction. **Corrigé sur les 4 écrans concernés** (Dashboard, Workout, Nutrition, Weekly) — c'est le genre d'erreur qu'une comparaison au pixel près avec le fichier source permet d'attraper, plutôt qu'une simple règle "rouge→citron".

### ✅ Dashboard (`Dashboard.jsx` + `dashboard.css`)
- Ring calories + macros regroupés dans une seule carte bordée `#1A1A1A` (au lieu de deux blocs séparés) — barres macro passées en bleu (`--accent-secondary`), comme le fait le prototype pour cette carte précise.
- Bouton logout remplacé par un **avatar rond citron avec l'initiale du prénom**, qui navigue vers `/settings` (le logout existe déjà là-bas, donc rien perdu) — reproduit l'avatar du prototype.
- Grille d'activité (pas/course/eau/sommeil) restylée en cartes solides bordées ; la carte **EAU** mise en bleu plein pour retrouver l'alternance citron/bleu du prototype (qui a "EAU" en bleu dans sa grille 3 stats).
- Ajouté le bouton **"Voir mon entraînement du jour →"** (citron, `border-radius:18`) qui navigue vers `/workout` — présent dans le prototype, absent de notre Dashboard jusqu'ici.
- **Bug trouvé en passant** : la bottom sheet d'édition (pas/eau/sommeil/course) avait encore un fond `#1e1214` — un vieux marron/rouge de l'ancien thème, oublié par l'audit de contraste de la Session 12 (qui cherchait des problèmes de texte-sur-accent, pas des couleurs de fond isolées). Corrigé en `#141414`.

### ✅ Workout (`Workout.jsx` + `Workout.css`)
- Tabs Musculation/Course : le prototype a un pattern **différent** de celui de Login/Onboarding pour ces tabs précises — pas fond citron/texte foncé, mais **fond `#0A0A0A` (le fond de l'écran) + texte citron** pour l'onglet actif, sur un conteneur `#1A1A1A`. Corrigé pour matcher exactement (j'avais failli reproduire le pattern Login par réflexe avant de re-vérifier le fichier source).
- Cartes (séances de la semaine, carte "PROGRAMME IA", historique) passées en bordure solide `2px`.
- Icônes de la bibliothèque (Maison/Salle/Dehors) : fond de la pastille icône teinté citron/bleu/citron en alternance, comme les carrés de couleur du prototype (au lieu d'un fond neutre uniforme).

### ✅ Nutrition (`Nutrition.jsx`)
- Bouton scanner (raccourci vers `/scan`) passé en bordure solide au lieu du glass.
- **Autre bug de contraste trouvé** (même famille que celui de Login en Session 12) : le sélecteur de type de repas (Petit-déj/Déjeuner/Dîner/Collation, présent dans 2 sheets — ajout manuel et recette IA) mettait `color:'#fff'` sur le bouton actif en fond citron. Corrigé en `var(--accent-ink)` aux deux endroits.

### ✅ Activité/Bilan (`Weekly.jsx` + `Weekly.css`)
- Bouton retour et cartes de progression de charges passés en bordure/fond solides.
- *(Le bouton retour lui-même — sa pertinence sur cet écran — reste une question UX ouverte et non traitée, voir le backlog du 2026-07-16 plus bas : seule sa couleur a été mise à jour ici.)*

### ✅ Settings (`Settings.jsx`)
- Label d'en-tête et bordure du bouton déconnexion mis à jour.
- `.btn-ghost` (classe globale partagée avec quelques écrans coach) repassée en bordure solide au lieu du glass — bénéficie aussi à `CoachDashboard.jsx`/`MemberDetail.jsx`/`Hydration.jsx` qui l'utilisent.

### ✅ Fix global : `.card` (classe partagée par presque tous les écrans, y compris coach) et `.btn-ghost`
Les deux repassés du style glass (fond translucide + blur + ombre) au style solide `#1A1A1A` bordé `2px`, cohérent avec tout ce qui a été fait cette session. Ça couvre automatiquement des écrans pas explicitement dans la liste (Hydration, Sleep, Messages, écrans coach) puisqu'ils utilisent la même classe `.card`.

### ⚠️ Découverte + correctif transversal : le thème clair aurait été cassé par mes changements
En écrivant Login/Onboarding/Dashboard, j'ai d'abord codé les bordures en dur (`rgba(255,255,255,.12)`/`.15`, valeurs exactes du prototype qui est dark-only). Avant d'aller plus loin, vérifié si le thème clair est vraiment accessible en prod — **oui** : `ThemeContext.jsx` + un toggle dans Settings, donc pas du code mort. Une bordure blanche à 12-15% d'opacité serait quasi invisible sur fond clair. Corrigé en ajoutant deux tokens de thème (`--border`, déjà existant à la bonne valeur en dark, et un nouveau `--border-strong`) dans les 3 blocs de `global.css` (`:root`, `[data-theme="dark"]`, `[data-theme="light"]`), puis remplacé toutes les valeurs codées en dur par ces variables dans Login/Onboarding/Dashboard/Workout/Nutrition/Weekly/Settings. Le thème clair reste sur son ancienne palette rouge (décision non tranchée, voir plus bas) mais au moins ses bordures/textes ne sont plus invisibles suite à ces changements.

### Build + vérifications
`npm run build` validé après chaque écran (7 fois en tout ce lot). Toujours aucune vérification visuelle possible dans ce sandbox (cause documentée en Session 12 puis affinée dans l'entrée Login ci-dessus). Tout poussé sur la PR #10 (draft, vers `claude/charming-mendel-dj1GQ`), en plusieurs commits séparés par écran pour faciliter une revue/rollback ciblé si besoin.

### Reste à faire / décisions en attente
- [ ] **Notifications** — écran qui n'existe pas dans l'app, présent dans le prototype (liste de notifs, une carte citron mise en avant). **Pas construit cette session** : contrairement aux 7 écrans ci-dessus qui étaient du reskin pur, celui-ci est une fonctionnalité entièrement nouvelle (route, nav, et surtout un vrai modèle de données — qu'est-ce qui déclenche une notif, persistance, lu/non lu — qui n'existe nulle part côté backend). Différent d'un simple ajustement visuel, à cadrer avec l'utilisateur avant de coder plutôt que de improviser un backend de notifications.
- [ ] **Décision thème clair** : reste sur l'ancienne palette rouge (voir Session 12). Est-ce qu'il doit aussi passer au citron/Neon, ou rester une identité visuelle différente/désactivée ? Pas tranché.
- [ ] **Écrans non touchés cette session** (pas dans le périmètre annoncé, glass encore présent par endroits) : `Scan.jsx` (un bouton), écrans coach (`CoachDashboard.jsx`, `MemberDetail.jsx`, `ClientsList.jsx`, `CoachMessages.jsx`, `CoachSettings.jsx`), `Messages.jsx`, `Hydration.jsx`, `Sleep.jsx`, `Rings.jsx` — bénéficient déjà partiellement des fix globaux (`.card`, `.btn-ghost`) mais pas vérifiés en détail écran par écran comme les 7 principaux.
- [ ] Item UX déjà en backlog depuis le 2026-07-16, toujours pas traité : navigation retour incohérente (voir plus bas dans ce journal).

---

## 2026-07-20 — Session 12 : import du design "ON AIR Neon" depuis claude.ai/design, début d'application

### Contexte : le chantier Landing "bold/flat" (Session 11 tardive) est abandonné
Avant cette session, on avait exploré une direction Landing seule "neo-brutalist" (fond clair, bordures noires épaisses, citron+bleu, puis comparatif de polices Anton/Bebas/Archivo Black/Unbounded/Big Shoulders/Space Grotesk/Syne/Oswald). **Tout ça est caduc.** L'utilisateur a fourni un vrai fichier de design complet ("On Air Neon - Interactive Prototype.dc.html") sur claude.ai/design et a demandé de l'implémenter tel quel dans toute l'app, pas juste Landing. Le shader animé (`src/components/ShaderBackground.jsx`) reste dans le repo mais **n'est plus utilisé nulle part** (retiré de `Landing.jsx`) — gardé "en mémoire" comme demandé par l'utilisateur, pas pour ce projet.

### Comment récupérer le design à nouveau si besoin
Outil `DesignSync` (MCP), méthodes `get_project`/`list_files`/`get_file` :
- `projectId`: `c5634942-7202-4975-aaac-df3e8747c79d` (projet claude.ai/design "Redesign application sport", owner "Ghost", `type: PROJECT_TYPE_PROJECT` donc pas un design-system — lecture seule pour nous, pas de push prévu)
- Fichier de référence implémenté : `On Air Neon - Interactive Prototype.dc.html` (prototype interactif complet : Splash, Auth, Onboarding 3 étapes, Home/Dashboard, Workout, Nutrition, Activité/Bilan semaine, Notifications, Settings)
- Autre fichier présent dans le même projet mais **pas encore regardé** : `On Air - Refonte Couleur.dc.html` — à checker si la direction actuelle ne convient pas.
- Des captures de référence (uploads WhatsApp) sont aussi dans le projet, pas encore consultées.

### La charte "ON AIR Neon" — palette et specs exactes du prototype
- Fond : `#0A0A0A` (quasi noir, plus sombre que l'ancien `#1a1012`)
- Cartes/surfaces : `#1A1A1A`, bordure `rgba(255,255,255,.12)` à `.15`
- **Accent primaire : citron `#D4FF00`** (remplace le rouge `#bf0603` comme couleur de marque principale) — texte foncé dessus, jamais blanc (voir plus bas)
- **Accent secondaire : bleu `#0047FF`** — utilisé par endroits précis dans le prototype (ex. carte "MA SÉANCE DU JOUR" en Workout est bleue avec texte blanc, pas citron — le prototype alterne délibérément citron/bleu selon le contexte, ce n'est pas un simple remplacement uniforme rouge→citron partout)
- Police : **Space Grotesk** (remplace Plus Jakarta Sans), poids 500/700 dans le prototype
- Boutons : pills pleines (`border-radius:999px`), pas de bordure épaisse ni d'ombre "sticker" (contrairement à l'exploration bold/flat abandonnée)
- Ring de calories circulaire, barres de macros fines bleues, grille 3 stats (séances/eau/pas) avec la carte du milieu en bleu, nav du bas avec un gros bouton "+" citron surélevé

### ✅ Fait cette session
- [x] **Tokens globaux** (`global.css`) : `--bg`, `--surface`, `--border`, `--accent` (citron), `--accent-secondary` (bleu), nouveau `--accent-ink` (`#0A0A0A`, texte à utiliser sur fond accent). Police Space Grotesk importée dans `index.html` (remplace Plus Jakarta Sans), `theme-color` et `manifest.json` mis à jour pour matcher le nouveau fond.
- [x] **Landing reconstruite** pour matcher l'esprit du splash du prototype (fond noir, "ON AIR" avec "AIR" en citron, sous-titre, CTA pills pleines) tout en gardant notre structure réelle à 2 CTA (rejoindre/coach) — le prototype fait un tap-anywhere avant un écran de login séparé, structure différente de notre besoin réel. **Confirmé visuellement par screenshot.**
- [x] **Audit de contraste texte-sur-accent dans toute l'app** : le rouge tolérait du texte blanc dessus, le citron non. Grepé et corrigé partout où `background: var(--accent)` était accompagné de `color: #fff`/`white` : `fab.css`, `ExerciseModal.css` (x2), `WorkoutSession.css` (x2), `dashboard.css`, `Onboarding.css` (bouton continuer + icône check sélection), `Workout.css` (x3, dont le bouton "séance du jour" repassé en bleu pour matcher le prototype), `Nutrition.jsx` (icône FAB scanner), `Rings.jsx` (ring calories rouge→citron). Tous les `rgba(191,6,3,...)` (ombres/glows liés à l'ancien rouge) remplacés par l'équivalent citron `rgba(212,255,0,...)`.
- [x] Build (`npm run build`) validé après chaque lot de changements.

### ⚠️ Limitation découverte : impossible de faire des captures d'écran authentifiées dans ce sandbox
Passé beaucoup de temps à essayer de screenshotter Dashboard/Workout/Nutrition (connecté) via Playwright pour vérifier visuellement, sans succès — **cause identifiée avec certitude, ce n'est pas un bug de l'app** :
- Le navigateur headless de ce sandbox ne peut pas atteindre Supabase directement (`ERR_CONNECTION_RESET`), même en configurant le proxy de l'environnement (`HTTPS_PROXY`) sur le contexte Playwright.
- En injectant une session valide directement dans `localStorage` (contournant le besoin de login réseau), l'app restait bloquée sur un écran vide. Diagnostic poussé (log temporaire dans `App.jsx`, retiré après) : `loading` restait bloqué à `true` pour toujours.
- **Cause précise** : dans `AuthContext.jsx`, le filet de sécurité `setTimeout(() => setLoading(false), 3000)` est annulé (`clearTimeout`) dès que `supabase.auth.getSession()` **résout** (avant même que `resolveRole()` — qui fait le lookup réseau vers `profiles` — ait fini). Dans ce sandbox, ce fetch vers `profiles` reste **en attente indéfiniment** (ni resolve ni reject, donc le `try/catch` dans `resolveRole()` ne se déclenche jamais) à cause du proxy réseau — sur un vrai navigateur/réseau, ce fetch échouerait proprement en quelques secondes et le `catch` s'en sortirait normalement.
- **Effet de bord potentiellement réel (pas juste un artefact sandbox)** : ce filet de sécurité de 3s ne protège que contre `getSession()` qui ne répond pas — pas contre `resolveRole()` qui traîne après. Sur un réseau mobile très dégradé/instable, un vrai utilisateur pourrait théoriquement rester bloqué sur un écran blanc indéfiniment si ce fetch spécifique reste en attente sans jamais échouer proprement. **Piste d'amélioration pas encore faite** : envelopper `resolveRole()` d'un timeout explicite (`Promise.race` avec un délai) pour garantir que `loading` repasse à `false` même si ce fetch traîne.
- **Conséquence pratique pour la suite** : ne pas reperdre de temps à essayer de screenshotter l'app connectée dans ce sandbox de la même façon — soit tester sur la vraie preview Vercel (qui elle-même a la protection SSO activée, donc pas accessible en curl direct non plus, à tester à la main par l'utilisateur), soit accepter de vérifier par lecture de code + build uniquement pour les écrans internes.

### Reste à faire — écrans pas encore adaptés à la charte Neon (prochaine session, dans cet ordre suggéré)
Les tokens globaux sont posés donc ces écrans héritent déjà des bonnes couleurs de base via `var(--accent)` etc., mais **pas encore vérifiés/structurés pour matcher précisément la mise en page du prototype** (ring, grille 3 stats avec carte bleue au milieu, cartes bordées, etc.) :
- [ ] **Login/Auth** (`Login.jsx`) — le prototype a un pattern précis : tabs pill (fond `#1A1A1A`, tab active citron), inputs `#1A1A1A` bordés, bouton submit pill citron pleine largeur. Pas encore comparé en détail à notre `Login.jsx` actuel.
- [ ] **Onboarding** (`Onboarding.jsx`) — le prototype a 3 étapes (prénom/poids/objectif calorique) avec barre de progression à 3 segments, très proche de ce qu'on a déjà côté structure — probablement juste des ajustements visuels fins.
- [ ] **Dashboard** (`Dashboard.jsx`) — carte kcal avec ring circulaire + macros (existe déjà via `CalorieRing`, à comparer précisément aux couleurs/proportions du prototype), grille 3 stats (séances/eau/pas — carte du milieu en bleu dans le prototype), gros bouton CTA citron "Voir mon entraînement du jour".
- [ ] **Workout** (`Workout.jsx`) — tabs Musculation/Course, carte "MA SÉANCE DU JOUR" (bleue, déjà fait) + "PROGRAMME IA" (fond sombre, texte citron), bibliothèque accordéon (Maison/Salle/Dehors).
- [ ] **Nutrition** (`Nutrition.jsx`) — carte kcal avec anneau/barres, liste repas du jour, bouton scanner.
- [ ] **Activité/Bilan** (`Weekly.jsx` ou `Rings.jsx`, à clarifier lequel correspond) — graphique en barres 7 jours (citron/bleu alternés dans le prototype), grille 2x2 stats (pas/course/eau/sommeil).
- [ ] **Settings** (`Settings.jsx`) — champs profil/objectifs éditables inline dans une carte, bouton enregistrer citron.
- [ ] **Notifications** — **écran qui n'existe pas encore dans notre app**, le prototype en a un (liste de notifs, une carte citron mise en avant pour la plus récente/importante). À évaluer si on le construit ou si ce n'est pas prioritaire.
- [ ] **Thème clair** (`:root[data-theme="light"]`) — volontairement pas touché cette session (le prototype Neon n'a pas de variante claire), reste sur l'ancienne palette rouge. À trancher : est-ce que le mode clair doit aussi passer au citron, ou rester différent/désactivé ?

### État git
Tout commité et poussé sur `claude/journal-review-iltjv9` (PR #8 — **le titre "Mes charges real lift progression" est maintenant très en décalage avec le contenu réel de la PR**, qui contient aussi tout le sprint sécurité 1+2 et maintenant le début du redesign Neon ; à renommer ou à découper en plusieurs PR si l'utilisateur préfère, pas fait spontanément). Working tree clean à la fin de cette session.

### ⏳ Deux points en attente de réponse de l'utilisateur — à traiter en priorité à la prochaine session
1. **PR #8** : renommer le titre pour refléter le contenu réel (sécurité + redesign, plus juste "Mes charges"), ou découper en plusieurs PR séparées (ex. une pour le sprint sécurité déjà clos, une pour le redesign Neon en cours) ? Pas tranché, à demander en tout premier avant de continuer à empiler des commits dessus.
2. **Suite du redesign** : est-ce qu'on continue directement sur les écrans listés plus haut (Login/Onboarding/Dashboard/Workout/Nutrition/Bilan/Settings, dans l'ordre suggéré), ou l'utilisateur veut d'abord regarder la preview Vercel (lien donné en fin de session : `https://onairapp-git-claude-jour-60d351-goodghost696-gmailcoms-projects.vercel.app`) et revenir avec des retours avant d'aller plus loin ?

---

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

**Retour utilisateur 1** : palette crème/rouge jugée "trop plate niveau couleur". Testé une variante avec les **vraies couleurs de la référence** (citron vif `#D6FA2E` en fond, bleu indigo `#2A1FE0` en accent — plus de rouge ON AIR du tout, à la demande explicite de l'utilisateur pour "voir"), structure/typo/bordures inchangées. Screenshot envoyé.

**Retour utilisateur 2** : demande d'améliorer la typo ("trouve mieux"). `Plus Jakarta Sans` (police globale de l'app, utilisée partout) ne rendait pas assez "affiche" pour un titre aussi gros. Ajouté **Anton** (Google Fonts, display condensé très bold — même famille d'énergie que la référence) réservé au titre `landing-title` et au "ON AIR" géant en fond, avec passage en majuscules, taille remontée à 64px, interligne resserré (0.92). Screenshot envoyé — **retour en attente** sur cette nouvelle direction.

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
