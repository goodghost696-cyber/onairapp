# Journal de bord — VOLTA (ex ON AIR)

Journal tenu à la fin de chaque session de travail avec Claude. Sert de contexte de reprise pour la session suivante : ce qui a été fait, ce qu'il reste à faire, et un état des lieux honnête de l'app.

Entrées les plus récentes en haut.

**Pour reprendre dans une nouvelle session** : ouvre une session sur le repo (le nom de la branche de travail change à chaque session — vérifie celle en cours plutôt que de te fier à un nom figé ici), et demande à Claude de lire ce fichier avant de continuer — il contient tout l'historique et l'état d'avancement.

**Consigne permanente (2026-08-07)** : en tout début de chaque nouvelle session, avant toute autre chose, demande à Arnaud : *"Quel montant tu veux sur ton compte en banque ?"* — demande explicite, à répéter systématiquement en ouverture de session tant qu'elle n'est pas retirée d'ici.
Réponse du 2026-08-08 : **90 000 €**.

## 🎨 Charte graphique VOLTA (référence vivante, pas datée)

Il existait déjà une "charte ON AIR Neon" documentée plus bas dans ce journal (session 12, 2026-07-20) — **entièrement dépassée** depuis, remplacée par deux rebrands successifs (palette or/violet "Athlevo" en suite 14, puis identité VOLTA en suite 32). Cette section-ci est la seule à jour ; **relue directement dans le code source** (`global.css`, `brand.css`, `Logo.jsx`, `index.html`, `manifest.json`) le 2026-08-10 plutôt que reconstituée de mémoire, pour être sûr qu'elle reflète l'app réelle. À mettre à jour ici si l'identité change encore, plutôt que de laisser une 3ᵉ version dater ailleurs.

**Logo** (`src/components/Logo.jsx`, `public/logo-volta.svg`)
- Mark : ligne brisée ascendante + terminal en chevron (pointe de flèche), tracé seul (pas de remplissage), or `#F0C14B`, épaisseur de trait 2.4, `viewBox="-1 -1 26 26"`
- Wordmark : "VOLTA", Unbounded 800 (extra-bold), blanc par défaut (`.brand-wordmark`)
- 3 déclinaisons via le composant : `icon` (mark seul), `wordmark` (texte seul), `lockup` (mark + texte, orientation `row` ou `column`)
- Favicon/PWA : `public/logo-volta.svg`, `icon-192.png`, `icon-512.png` (même mark)

**Couleurs — palette par défaut (celle que voit tout le monde, tout le temps)**
| Rôle | Valeur | Usage |
|---|---|---|
| Fond principal | `#E8552B` (corail) | `--bg`, fond de toutes les pages |
| Accent primaire | `#F0C14B` (or) | `--accent` — CTA secondaires, hero numbers, le mark du logo |
| Accent secondaire | `#8B93E8` (bleu-violet) | `--accent-secondary` |
| Surface (cartes/feuilles) | `#FFFFFF` | `--surface` / `--surface-solid` |
| Surface 2 | `#FBF3ED` | `--surface-2` |
| Texte sur surface blanche | `#1B1710` | `--text-primary` (+ variantes 62%/42% pour secondaire/muted) |
| Succès / Avertissement / Danger | `#1FD66B` / `#F5A623` / `#FF3B3B` | états système |
| `theme-color` mobile (Safari/PWA) | `#EF6B41` | `index.html` + `manifest.json`, calé sur le dégradé de fond |

**Palette alternative — mode clair** (activable dans Réglages, `:root[data-theme="light"]`) : fond `#F2F2EF`, texte quasi-noir `#0A0A0A`, or et violet assombris (`#8A6300`/`#4A52B0`, pour rester lisibles en texte/icône sur fond clair). Ce n'est **pas** la direction visuelle par défaut de l'app — un mode alternatif au choix de l'utilisateur, pas la charte de marque elle-même.

**Typographie**
- Corps de texte / UI générale : **Space Grotesk** (400 à 700), Google Fonts
- Titres de marque et gros chiffres ("hero numbers" — calories, etc.) : **Unbounded** (600 à 900), volontairement scopé à `.brand-wordmark`/`.hero-number`/`.text-2xl`, pas une police globale

**Forme**
- Rayon carte `16px`, bouton `18px`, pill (nav, boutons ronds) `100px`

**Icônes**
- `lucide-react` pour l'essentiel de l'app (`Icon.jsx`, set cohérent de line-icons 24×24 `currentColor`)
- `@phosphor-icons/react` uniquement pour la nav (bottom nav membre + nav coach) — son prop `weight` donne un état actif "plein" vs "contour" sans changement de couleur
- Emoji conservés à quelques endroits précis et délibérés après itération (météo du Dashboard, sélecteur d'eau, toast de bienvenue) — jamais comme icône UI générique, seulement là où un pictogramme dessiné n'apportait rien de mieux (voir suites 77-81 pour l'historique de l'icône eau, 5 itérations avant 🥛)

## 📌 Chantiers ouverts / décisions produit en attente (section vivante, pas datée)

Section permanente, comme la charte graphique ci-dessus : ce qui est **validé sur le principe mais volontairement pas commencé**, avec sa condition de démarrage. À tenir à jour ici plutôt que de laisser l'info se perdre dans une entrée datée. Les entrées datées ci-dessous restent la source pour ce qui a été *fait*.

### 🤖 Agent IA côté coach — résumés quotidiens + alertes de décrochage
**Statut : idée validée, à faire APRÈS la Phase 2/3 de l'audit sécurité ET le restyle coach. Pas avant.**

**Contenu prévu**
- **Résumé automatique quotidien en haut de `CoachDashboard`**, généré par Claude Haiku à partir de données calculées côté serveur : membres inactifs depuis 5 jours ou plus, membres en forte progression, taux d'assiduité du groupe sur la semaine.
- **Alertes de décrochage** basées sur le calcul de streak existant (`activite_jour`, tolérance d'un jour par semaine déjà en place) : dès qu'un membre casse son streak ou n'a plus d'activité, il remonte en priorité dans `CoachDashboard`/`ClientsList` au lieu d'être noyé dans la liste.

**Approche technique**
Pas un agent agentique à function calling. Une requête planifiée : réutiliser le pattern cron Vercel déjà en place (`inactivity-nudge`/`streak-nudge`) pour calculer les signaux côté Supabase, puis les formuler en langage naturel via le proxy Claude Haiku existant.

**Estimation** : proche de 2-3 jours de dev. La partie streak/activité/cron existe déjà ; le travail réel porte sur la détection de seuil et la mise en forme du résumé.

**Justification business** : complète l'argument de vente « visibilité totale coach en un dashboard », et se démontre mieux en démo qu'un chantier lourd.

**Pourquoi ne pas commencer maintenant** : priorité au socle avant toute nouvelle feature. Tant que la Phase 2 et la Phase 3 de l'audit et le restyle coach (`CoachDashboard`, `ClientsList`, `MemberDetail`) ne sont pas faits, enchaîner les features reproduirait le pattern `RunContent` — du contenu fabriqué resté en production pendant des mois sur une base non stabilisée.

### ⚖️ Consentement au partage de données coach↔membre — point juridique non traité
**Statut : identifié, non traité à ce jour. Bloquant avant toute acquisition de coachs pilotes ou contact influenceur. Aucun développement technique à démarrer tant que la clarification juridique n'est pas tranchée.**

**Le constat** : le membre n'est informé **nulle part**, de façon explicite, que son coach a accès à ses données de nutrition, d'activité, de poids et de sommeil via `CoachDashboard` / `MemberDetail`. L'accès existe et fonctionne (il est même la raison d'être du produit côté coach), mais rien dans le parcours d'inscription ni dans l'app ne le dit au membre.

**Ce que ce point n'est pas** : à distinguer du RGPD « général » (base légale de la collecte elle-même). Ici c'est spécifiquement le **partage vers un tiers humain identifié** — le coach — qui doit être formalisé. Deux sujets différents, à ne pas confondre dans le traitement.

**Piste envisagée, pas tranchée** : un mécanisme d'opt-in explicite, soit à l'inscription, soit au moment du rattachement à un coach. Reste à décider : **opt-in ou opt-out**, et la **formulation exacte** du consentement.

**À traiter avec** les CGU et la politique de confidentialité, dans le même chantier.

**Pourquoi ne pas commencer maintenant** : coder un mécanisme de consentement avant d'avoir tranché opt-in vs opt-out et la formulation exacte reviendrait à jeter le travail, ou pire à afficher au membre une formulation juridiquement fausse. La clarification juridique vient d'abord, le code ensuite.

## 🧹 2026-08-16 — Phase 3 (qualité de code) : 5 lots traités, et l'audit complet est bouclé

Dernière phase de l'audit. Périmètre : les 5 candidats accumulés au fil des Phases 1-2 (tous notés « pas des bugs » au moment où ils ont été repérés), plus un balayage large — mock data résiduelle, code mort, cohérence des messages d'erreur, accessibilité. Correctifs re-testés en réel sur la preview de la PR #137.

**Ce qui change par rapport aux phases précédentes** : ici on ne cherchait pas des bugs mais de la dette. Trois des cinq candidats se sont pourtant révélés être de vrais défauts visibles par l'utilisateur, et deux défauts supplémentaires ont été trouvés en chemin.

### 1. 🟠 La séance perdait le nom du programme dont elle partait
`activeSession.type` n'était **jamais** renseigné : aucun des trois points d'entrée d'une séance ne le posait. `finishSession()` retombait donc systématiquement sur son défaut « SÉANCE » — y compris pour une séance générée par l'IA en « PUSH DAY », ou pour un programme assigné par le coach avec un titre explicite.

- **Trois effets concrets**, au-delà du libellé : l'historique du membre affiche « SÉANCE » sur toutes les lignes ; le coach voit la même chose sur `MemberDetail` pour tous ses membres ; et le générateur de programme IA construit son contexte « Dernières séances » depuis `sessionHistory.map(s => s.type)` — il recevait donc « SÉANCE, SÉANCE, SÉANCE », soit aucune information exploitable, alors que ce champ existe précisément pour ça.
- **Un second défaut trouvé en investiguant, plus vicieux** : même si le type avait été posé, `addExerciseToSession()` l'aurait **effacé**. Cette fonction reconstruit l'objet `activeSession` champ par champ et ne reconduisait pas `type` — ajouter un exercice de la bibliothèque à une séance démarrée depuis un programme nommé lui faisait perdre son nom en cours de route.
- **Re-testé en réel** : programme IA « PUSH DAY » → `activeSession.type = "PUSH DAY"` ; ajout d'un exercice de la bibliothèque → le nom **survit** ; séance terminée → `seances.nom = "PUSH DAY"` en base, contre « SÉANCE » avant.

### 2. 📄 Catalogue wger mal catégorisé — documenté, pas corrigé
« Développé incliné à la Smith machine » apparaît dans la section **Maison** (« Bodyweight · Sans équipement »). C'est une donnée tierce (wger.de, CC-BY-SA) mal catégorisée à la source, pas un défaut de notre code.

**Volontairement non corrigé.** Un filtrage par mots-clés (« machine », « barre », « poulie »…) écarterait des exercices légitimes et en laisserait passer d'autres : on remplacerait une donnée imparfaite par un comportement imprévisible, plus difficile à diagnostiquer. Les vraies options sont soit un recatalogage manuel du JSON statique (`src/data/exercisesLibrary.json`, généré par `scripts/fetch-wger-exercises.js`), soit l'acceptation du bruit. À trancher côté produit, pas en passe qualité.

### 3. ⚡ Le fetch du classement partait à chaque montage du Bilan, pour rien
Le classement est masqué côté produit depuis le 2026-08-13 (rendu mis en commentaire JSX). Son fetch, lui, continuait de partir à **chaque montage** du Bilan pour alimenter un état que plus rien ne lisait — une requête réseau par visite, et qui plus est sur `leaderboard_weekly`, la vue SECURITY DEFINER dont la Phase 1 a dû reboucher la fuite cross-salle.

Retiré : l'état, l'appel, l'import. `utils/leaderboard.js` et le rendu commenté sont **conservés** — la décision produit était « repoussée, pas abandonnée », et les trois éléments à remettre pour rebrancher sont documentés sur place.

### 4. 📄 `repas.portion` — documenté, pas migré
Confirmé en base : les 12 lignes réelles ont toutes `portion = '100g'`, la valeur par défaut, et la colonne n'est **jamais** lue ni écrite par `src/`. La quantité réelle vit dans le nom du repas.

**Une seconde colonne vestigiale trouvée au passage** : `repas.type` (distincte de `type_repas`, qui est la bonne) — 10 lignes à NULL et 2 valeurs héritées d'un schéma de créneaux plus ancien (« Snack », « Petit-déjeuner »).

**Volontairement non migré.** Supprimer deux colonnes sur une base de production n'apporte aucun gain fonctionnel, comporte un risque non nul, et détruirait la seule trace de l'ancien schéma de créneaux. Documenté ici ; à faire dans une vraie passe de migration de schéma si l'occasion se présente.

### 5. ♿ Accessibilité : 14 éléments cliquables inaccessibles au clavier
Le point de départ (Phase 2) : l'outil de test automatisé ne trouvait aucun élément interactif sur la carte d'habitude du Dashboard, alors qu'elle se clique. C'est exactement ce que vit un utilisateur au clavier ou au lecteur d'écran — l'élément n'est ni atteignable en Tab, ni annoncé comme un contrôle, ni activable par Entrée/Espace. `cursor: pointer` ne rend rien accessible.

Le balayage a montré que ce n'était **pas un cas isolé mais un pattern** : 14 éléments porteurs d'un `onClick` sans être des contrôles natifs.

Nouveau helper `src/utils/a11y.js` (`activable`) plutôt que de répéter le même `onKeyDown` 14 fois. Traité : carte d'habitude (`role="checkbox"` + `aria-checked` — c'est un état, pas une action), cartes d'activité du Dashboard, bannière de séance en cours, cartes de programme coach, cartes de section de bibliothèque, cartes d'historique, cartes de navigation (Messages, CoachMessages, ClientsList, CoachDashboard ×2), ligne de résultat d'aliment, ligne « Synchroniser mes données », les deux interrupteurs de notifications (`role="switch"`), et la puce « ✕ » de `CoachPrograms` qui retire un programme à un membre — une action **destructive** qui était un simple `<span>`, passée en vrai `<button>`.

**Deux cas volontairement non traités, signalés plutôt que devinés** :
- La ligne d'exercice de `WorkoutLibrary.jsx` embarque son propre bouton « + AJOUTER ». Mettre `role="button"` sur le conteneur créerait un contrôle dans un contrôle, invalide en ARIA, et **casserait** la navigation clavier au lieu de l'améliorer. Le vrai correctif est une restructuration de la ligne — hors périmètre.
- Les fonds d'overlay (`sheet-overlay`, `modal-overlay`) sont des zones de fermeture au clic, pas des contrôles ; chaque sheet a déjà un bouton « Annuler »/« Fermer » explicite, qui est le chemin clavier légitime.

**Re-testé en réel** : focus reçu au clavier sur une carte de bibliothèque, puis Entrée → navigation effective vers `/workout/maison`. Pas seulement la présence des attributs.

### 6. ✅ Balayage anti-mock data — rien trouvé
`RunContent.jsx` (le cas de référence) n'existe plus que dans un commentaire historique. Aucune simulation de GPS/allure/BPM résiduelle. Les `Math.random()` restants sont légitimes (génération d'id, mélange de suggestions de recettes). Tous les tableaux constants des écrans sont de la configuration (filtres, couleurs, étapes d'assistant, définitions d'outils IA), pas des données utilisateur fabriquées. **Le pattern `RunContent` ne s'est pas reproduit ailleurs.**

### 7. 🧹 Code mort supprimé
Balayage systématique : chaque module comparé à ce qui l'importe réellement.

- **`components/ShaderBackground.jsx`** (6 ko) — fond WebGL de la Landing. Son propre commentaire affirmait « Loaded via React.lazy from Landing.jsx », mais `Landing.jsx` ne l'importe plus depuis sa refonte : le commentaire décrivait un câblage qui n'existait plus.
- **`components/CalorieRing.jsx`** — remplacé sur le Dashboard, marqué « still available » dans un commentaire ; issu d'une direction visuelle abandonnée depuis le restyle « pastel chaud ».
- **`hooks/useCountUp.js`** — seul consommateur : `CalorieRing`.
- **86 clés de traduction sur 165 (52 %)** — résidus des écrans supprimés (onglet Course : `pace`, `distance`, `elevation`, `gps_strong`, `run` ; écran Sommeil : `bedtime_wake`, `last_sleep`, `quality_*`…). 258 lignes retirées sur les 3 langues.

**Vérifié avant** : aucun appel `t()` dynamique dans le codebase (tous passent un littéral), donc une clé non trouvée par grep est réellement morte. **Vérifié après** : 79 clés uniques restantes, 79 utilisées, 0 manquante.

**⚠️ Incident évité de justesse** : une première tentative de suppression via `Set-Content` a **double-encodé tous les accents** (« Bon aprÃ¨s-midi ») — et le build passait quand même, donc ça partait en production sans rien signaler. Repris avec les API .NET en UTF-8 explicite, et accents relus **dans le bundle compilé** (« Bon après-midi », « Entraînement ») avant commit. Leçon : sur ce poste Windows, ne jamais réécrire un fichier source contenant des accents avec `Get-Content`/`Set-Content`.

### 8. 🟠 Des messages techniques anglais fuyaient jusqu'à l'écran
Deux fuites distinctes, vérifiées sur le code réel.

- **Les écrans IA** (Nutrition ×4, Scan ×1) affichaient le message d'erreur brut tel quel. Or `api/claude.js` répond en **anglais** et en langage technique : « Too many requests, try again shortly », « Quota exceeded », « Unauthorized », « API key not configured », voire le message brut d'Anthropic. Un membre qui atteignait simplement le plafond IA de sa salle voyait donc un message anglais incompréhensible, dans une app par ailleurs entièrement en français.
- **`CoachSignup.jsx`** faisait `signUpError.message || fallbackFR` — exactement le pattern que `mapAuthError` a été écrit pour corriger sur `Login.jsx`/`ResetPassword.jsx` (le fallback ne se déclenche jamais, `message` n'étant jamais vide), mais cet écran-là avait été oublié. Un coach s'inscrivant avec un email déjà pris voyait un message anglais, **sur l'écran d'acquisition**.

Nouveau `utils/apiErrors.js` (`mapApiError`), pendant de `mapAuthError`. Choix de conception : on ne traduit **que ce qu'on reconnaît**, tout le reste passe tel quel — l'app lève elle-même beaucoup de messages déjà en français qu'il serait absurde de remplacer par un message générique.

**Vérifié par exécution, pas par relecture** : les 9 cas (5 messages techniques anglais, échec réseau, code HTTP, 2 messages FR de l'app, message vide) donnent le résultat attendu, y compris le passage intact des messages français.

**Signalé, non modifié** : `api/claude.js` émet ces chaînes en anglais à la source — assainir l'API elle-même serait plus propre, à faire quand le contrat de ces routes sera revu. Idem `PlatformAdmin.jsx`, qui affiche des messages Supabase bruts : écran interne réservé à l'admin plateforme, pas un parcours utilisateur.

### Nettoyage des données de test — vérifié à 0
1 compte de test créé puis supprimé, avec toutes ses lignes (`seances` 1, `api_rate_limit` 10, `profiles` 1). Contrôle après coup : **0** compte de test, **0** profil de test, **0** salle de test, **0** ligne orpheline (`profiles`/`seances`/`api_rate_limit`), **0** objet Storage orphelin. Base à l'identique : 5 `auth.users`, 5 profils, 2 séances. `localStorage` vidé sur les 2 origines utilisées.

**Un résidu assumé** : l'appel « Programme IA » du test a incrémenté `ai_usage` de la vraie salle VOLTA FITNESS — compteur gym-scoped, pas de ligne de test à supprimer. Même situation qu'en Phase 2.

---

## 📊 Bilan de l'audit complet (Phases 1 + 2 + 3)

**19 défauts trouvés et corrigés**, tous en test réel ou par requête en base, aucun par simple relecture de code.

| | Phase 1 (sécurité) | Phase 2 (fonctionnel) | Phase 3 (qualité) | Total |
|---|---|---|---|---|
| Défauts corrigés | 2 | 12 | 5 | **19** |
| dont failles de sécurité | **2** | 1 (TOCTOU) | 0 | **3** |
| dont pertes de données | 0 | **5** | 0 | **5** |
| Documenté sans correctif | 0 | 0 | 2 | 2 |

**Les 3 failles de sécurité** — toutes exploitables, toutes fermées :
1. **Escalade de privilèges sur `profiles`** : un membre authentifié pouvait se promouvoir `is_platform_admin = true`. Confirmée par exploitation réelle avant correctif. Introduite la veille par un « correctif » trop large qui avait effacé une allowlist de colonnes dont le commentaire mettait explicitement en garde contre ce réflexe exact.
2. **Fuite cross-tenant via `leaderboard_weekly`** : vue SECURITY DEFINER sans filtre de salle, `SELECT` accordé à `authenticated` — n'importe quel utilisateur connecté pouvait lire prénom + assiduité de **tous** les membres de **toutes** les salles. Dormante dans l'UI, bien vivante au niveau de l'API REST.
3. **TOCTOU sur `/api/create-gym`** : deux POST concurrents créaient deux salles, dont une orpheline avec son propre code d'invitation. Reproduite pour de vrai, pas théorique.

**Les 5 pertes de données** — c'est la catégorie la plus instructive, parce qu'aucune n'était visible depuis l'UI :
1. Toutes les écritures client sur `profiles` échouaient en 42501 — un nouveau membre arrivait **anonyme** chez son coach. 2 comptes réels réparés à la main.
2. Enregistrer un objectif depuis Bilan **effaçait poids et taille**.
3. La séance en cours était perdue au moindre rechargement (jamais persistée).
4. « Ma séance du jour » effaçait la séance en cours en un tap, sans confirmation.
5. La photo de profil **survivait à la suppression du compte**, et restait servie publiquement — alors que l'écran promet « effacées pour toujours ».

**Ce que l'audit a changé dans la façon de travailler**, au-delà des correctifs :
- **Le test réel trouve ce que la relecture ne trouve pas.** Sur les 19 défauts, la quasi-totalité affichait quelque chose de parfaitement crédible à l'écran pendant que la base recevait autre chose — ou rien.
- **Vérifier en base, pas à l'écran.** Plusieurs bugs n'ont été visibles qu'en comparant l'affichage à la ligne réellement écrite.
- **Attention aux mesures prises trop tôt.** Trois fois sur cette série, j'ai conclu à tort qu'un correctif ne marchait pas : une animation CSS capturée en plein vol, un cache CDN, et une divergence d'état lue pendant une transition. Les trois fois, le correctif était bon et c'est la mesure qui était fausse.
- **Deux flux sont passés sans aucun bug** : la messagerie et l'espace coach — les deux plus récents, et les seuls écrits après que le projet a commencé à documenter ses décisions dans les commentaires de code.

**Reste ouvert après l'audit** (rien de bloquant, tout est tracé) :
- Consentement au partage de données coach↔membre — point juridique, bloquant avant acquisition de coachs pilotes (voir « Chantiers ouverts » en haut de ce fichier).
- Un vrai flux « changer mon adresse e-mail », qui dépend d'abord de la sortie du bac à sable pour l'email transactionnel.
- Protection des mots de passe compromis (advisor Supabase) — décision produit.
- Assainir les messages d'erreur de `api/claude.js` à la source.
- Accessibilité : la ligne d'exercice de `WorkoutLibrary` (restructuration), et l'app n'a jamais eu de passe a11y complète.
- Recatalogage éventuel du JSON wger, et les 2 colonnes vestigiales de `repas`.

## 🚨 2026-08-16 — Audit sécurité (Phase 2, suite 3) : Réglages + espace coach — 1 bug, et la Phase 2 est bouclée

Dernière tranche de la Phase 2. Périmètre demandé : **Réglages** (tous les champs éditables, déconnexion, suppression de compte, upload d'avatar) et **espace coach** (`CoachDashboard`, `ClientsList`, `MemberDetail` sur des données réelles multi-membres, programmes, habitudes). Tests réels dans le navigateur sur la production, correctif re-testé sur la preview de la PR #134 avant merge.

**Deux bugs, tous deux hors de l'espace coach** : un dans Réglages (champ Email), un dans le chemin de suppression de compte (photo de profil conservée) — celui-là trouvé par accident, en nettoyant les données de test. **L'espace coach n'a rien révélé** : deuxième flux consécutif à passer intégralement, après la messagerie.

**Note de méthode — un vrai locataire de test.** Plutôt qu'un compte isolé : 1 coach + 3 membres dans une salle QA dédiée, avec des données d'activité **délibérément différenciées** pour produire les trois statuts (`ON TRACK` / `AT RISK` / `INACTIVE`) et pouvoir recouper chaque chiffre du tableau de bord coach contre ce qui avait été semé. Sans ça, un dashboard « qui affiche des nombres » passe pour correct sans qu'on sache s'ils veulent dire quelque chose.

### 🔴 BUG 11 (critique) — le champ Email de Réglages affichait « ✓ Enregistré » sans rien changer
`updateUserProfile()` appelle `supabase.auth.updateUser({ data: profile })` — qui ne touche que les **métadonnées**. La nouvelle adresse partait donc bien dans `profiles.email` et dans `user_metadata`, mais **jamais dans `auth.users.email`**, l'identité de connexion.

- **Mesuré en réel, pas déduit** : après « enregistrement », la connexion avec la **nouvelle** adresse échoue (`Invalid login credentials`, 400) et seule l'**ancienne** fonctionne encore (200). `auth.users.email` inchangé, `email_change` vide — aucun flux de confirmation n'avait même démarré.
- **Trois conséquences concrètes** : (1) le membre se croit sur une adresse qui ne lui ouvre plus rien ; (2) la réinitialisation de mot de passe part toujours vers l'ancienne boîte, puisqu'elle s'appuie sur l'email d'authentification ; (3) le coach voit la nouvelle adresse dans `ClientsList`/`CoachMessages` — une adresse à laquelle le compte n'est pas rattaché.
- **Pourquoi pas un vrai flux de changement d'adresse** : testé, `auth.updateUser({ email })` répond **500 « Error sending email change email »** sur ce projet. L'email transactionnel est toujours en bac à sable (voir l'entrée du 2026-08-12) : le mail de confirmation ne peut pas partir. L'implémenter maintenant laisserait `profiles.email` déjà modifié pour un changement qui n'aboutit jamais — strictement pire que l'état actuel. C'est le genre de décision qui ne se prend qu'en testant l'endpoint, pas en lisant la doc.
- **Correctif** : champ en lecture seule, alimenté par `user.email` (l'identité réelle, **pas** `profiles.email` qui a pu diverger), avec une ligne d'explication. `email` retiré du payload de `saveProfile` — `upsertOwnProfile` ne filtrant que les `undefined`, la colonne n'est plus touchée du tout.
- **Pattern vérifié ailleurs** : `CoachSettings.jsx` affichait **déjà** l'email en lecture seule depuis `user?.email` — jamais concerné. Le correctif aligne donc l'écran membre sur une convention qui existait déjà côté coach. Et après correctif, **plus aucun appelant de `updateUserProfile` ne passe `email`** (Weekly et Settings ne l'envoient plus, Onboarding envoie `user.email`, soit l'adresse d'authentification elle-même) : `profiles.email` n'est plus écrit que par `register()`, à l'inscription, depuis la vraie adresse. La source de divergence est fermée, pas juste masquée.
- **Aucun compte réel affecté** — vérifié en base : les 5 profils réels ont `profiles.email == auth.users.email`. Rien à réparer à la main cette fois.
- **Re-testé en réel après déploiement** : le champ n'est plus éditable (3 champs au lieu de 4) et affiche bien l'adresse **d'authentification** alors que `profiles.email` du compte de test était encore divergent — exactement le comportement voulu. Une sauvegarde de profil met à jour le poids (83 → 84) en laissant `profiles.email` intact, ce qui prouve que la colonne n'est plus écrite.

### 🔴 BUG 12 (critique, confidentialité) — la photo de profil survivait à la suppression du compte
Trouvé **par accident**, en cherchant simplement à nettoyer les données de test : le fichier avatar d'un compte de test supprimé était toujours là.

- **Root cause** : `delete-account.js` ne faisait qu'un `admin.auth.admin.deleteUser()`, en comptant sur les `on delete cascade` du schéma. Ça couvre bien `profiles`, `repas`, `seances`, `activite_jour`, `objectifs`, `push_subscriptions`… mais **pas `storage.objects`**, qui n'a aucune clé étrangère vers `auth.users` (juste une colonne `owner` en uuid nu). Aucune cascade ne l'atteint.
- **Mesuré en réel** : compte de test avec avatar → `POST /api/delete-account` → 200 `{"success":true}`, `auth.users` bien supprimé, toutes les tables publiques vidées… et le fichier toujours dans le bucket. Pire : **toujours servi publiquement**, `GET` sur l'URL publique → HTTP 200, `image/jpeg`, 5 140 octets, *après* la suppression du compte. La policy SELECT du bucket `avatars` est `bucket_id = 'avatars'`, sans aucun contrôle de propriétaire.
- **Pourquoi c'est sérieux** : l'écran de confirmation promet « Toutes tes données seront effacées pour toujours… C'est irréversible. » C'est un écart entre ce que l'app affirme et ce qu'elle fait, sur une donnée personnelle (une photo de visage), pour un utilisateur qui a explicitement demandé l'effacement. À rapprocher directement du point juridique ajouté aujourd'hui en haut de ce fichier.
- **Découverte annexe** : il n'existe **aucune policy DELETE sur `storage.objects`** (vérifié dans `pg_policies` : seulement INSERT, SELECT, UPDATE). Un client authentifié ne peut donc pas nettoyer derrière lui — confirmé en essayant, l'API répond 200 avec une liste vide. Seul le chemin service_role peut le faire, d'où un correctif côté serveur et non côté client.
- **Correctif** : listage puis suppression du dossier `avatars/<user_id>` **avant** la suppression du compte. Ordre délibéré — en cas d'échec on s'arrête et le compte existe toujours, donc l'utilisateur peut réessayer ; dans l'ordre inverse, un échec laisserait un fichier orphelin que plus rien ne rattache à personne.
- **Re-testé en réel sur la production après merge** (les routes `/api/*` ne tournant pas en Preview) : nouveau compte + avatar uploadé par le vrai chemin client → suppression → la ligne `storage.objects` a bien disparu, et l'URL publique renvoie **400**.
- **⚠️ Erreur de méthode, à noter pour la prochaine fois** : j'ai d'abord conclu que le correctif ne marchait pas, parce que l'URL publique répondait encore 200 juste après. C'était le **cache CDN de Supabase** qui servait une copie de l'URL récupérée quelques secondes plus tôt. Avec un paramètre anti-cache : 400 pour l'objet supprimé après le correctif, mais toujours 200 pour l'orphelin créé avant — ce qui prouve que le comportement a bien changé. **Deuxième session consécutive où une mesure prise trop vite me fait conclure à tort qu'un correctif est KO** (la première fois c'était une animation CSS capturée en plein vol). Vérifier la mesure avant de conclure à l'échec.
- **Résidu assumé, hors du contrôle de l'app** : une photo supprimée reste servie par le cache CDN jusqu'à expiration de cette entrée. C'est borné dans le temps mais réel — à savoir si la question se pose un jour dans un cadre RGPD.

### Ce qui a été testé et qui marche (vérifié en base, pas seulement à l'écran)

**Réglages**
- **Édition profil** : prénom / poids / taille persistés dans `profiles`, et `objectif` **non écrasé** au passage — le correctif de perte de données de la session précédente (BUG 4) tient, revérifié ici par un chemin différent.
- **Upload d'avatar** : PNG de 11 402 o → redimensionné côté client en JPEG de 5 140 o, déposé dans Storage sous `<user_id>/avatar.jpg`, `profiles.avatar_url` mis à jour avec cache-buster. Le GRANT réparé le 2026-08-15 tient.
- **Déconnexion** : 15 clés `onair_*` → 0, session vidée, retour au Landing.
- **Suppression de compte** : garde-fou « tape SUPPRIMER » (bouton désactivé tant que le mot n'est pas saisi), puis suppression **complète** — `auth.users`, `profiles`, `objectifs`, `activite_jour` supprimés en cascade, **zéro orphelin** vérifié après coup, déconnexion et redirection.

**Espace coach — chaque chiffre recoupé avec les données semées**
- **`CoachDashboard`** : 3 clients, 3 séances (7j), 2 alertes, 1 actif ; graphique d'activité sur les bons jours (Mer/Ven/Dim) ; répartition 1 `ON TRACK` / 1 `AT RISK` / 1 `INACTIVE` ; « nécessite attention » avec les bons libellés (« dernière activité hier », « il y a 10j »). Tout correspond exactement.
- **`ClientsList`** : objectif, dernière activité, nombre de séances, streak. Les 4 filtres et la recherche isolent exactement les bons membres, état vide compris. Le streak 🔥 2j a été **recalculé à la main contre l'algorithme** (`calculateStreakDetails`, tolérance d'un jour de repos par semaine) plutôt que pris pour argent comptant : conforme.
- **`MemberDetail`** : poids/taille, séances 7j, calories moyennes (415 = 220 + 195 sur un seul jour loggé), sommeil 7,5 h, pas 9 200, bande de la semaine surlignant les deux bons jours, derniers repas et dernières séances exacts.
- **Actions du coach** : objectifs d'un membre modifiés (3100 / 175 / 12 000 / 3000) → persistés **sans écraser** glucides/lipides (l'upsert ne touche que les 4 colonnes envoyées) ; note privée enregistrée **et rechargée** au retour sur la fiche ; habitude assignée ; programme créé avec 2 exercices puis assigné à 2 membres.
- **Boucle complète coach → membre → coach**, de bout en bout : le membre reçoit le programme dans « MES PROGRAMMES » et il se charge correctement dans sa séance (4 × « 8-10 » à 70 kg, 3 × « 10 » à 10 kg) ; il voit l'habitude sur son Dashboard, la valide (0/4 → 1/4, ligne `habitude_logs` créée) ; le coach voit la progression 1/4 sur sa fiche. Les objectifs fixés par le coach apparaissent aussi côté membre (protéines 50/175, glucides 42/320).

**RLS vérifiée par test réel, pas par lecture de policy**

| Tentative | Résultat |
|---|---|
| Le membre concerné lit `coach_notes` | **0 ligne** |
| Le membre concerné cherche sa propre note par contenu | **0 ligne** |
| Un autre membre lit `coach_notes` | **0 ligne** |
| Le membre lit ses propres `habitudes` | 1 ligne ✅ (attendu) |
| Un autre membre lit les `habitudes` d'autrui | **0 ligne** |

La note privée du coach est donc bien invisible du membre qu'elle concerne — la garantie que le commentaire de `fetchCoachNote` annonce, désormais vérifiée plutôt que supposée.

**Scoping multi-salles, à nouveau confirmé sous une vraie 2ᵉ salle** : le coach de test ne voit que ses 3 membres, aucun des membres réels de VOLTA FITNESS. À noter, même remarque que pour `fetchPrimaryCoach` la session précédente : `ClientsList` fait `select * from profiles where role='member'` **sans filtre `gym_id`** — c'est la policy « Coaches can view same-gym profiles » qui fait tout le travail. Correct aujourd'hui, mais c'est une garantie qui repose entièrement sur la RLS ; à garder en tête si cette requête devait un jour passer en service_role.

### Reste à faire
- **Phase 2 : terminée.** Les 9 flux prévus ont été testés en conditions réelles (signup membre/coach, Dashboard, Nutrition, Bilan, Workout, Settings, messagerie temps réel, espace coach). Bilan de la phase : **12 bugs trouvés, dont 5 pertes de données silencieuses**, tous corrigés et re-testés en réel après déploiement. Les deux flux passés sans aucun bug sont la messagerie et l'espace coach — les deux plus récents, et les seuls écrits après que le projet a commencé à écrire ses décisions dans les commentaires de code.
- **⚠️ Rappel de méthode pour la Phase 3** : sur les deux dernières sessions, j'ai conclu **deux fois à tort** qu'un correctif ne fonctionnait pas, sur des mesures prises trop tôt (une animation CSS en plein vol, puis un cache CDN). Dans les deux cas le correctif était bon. Avant de déclarer un fix KO, vérifier d'abord que la mesure est stable.
- **Phase 3** — qualité de code. Candidats accumulés au fil de la Phase 2, volontairement **pas** traités (ce ne sont pas des bugs) :
  - `activeSession.type` jamais renseigné → toutes les séances s'enregistrent sous « SÉANCE », y compris celles issues d'un programme IA qui affiche pourtant un `session_type` ;
  - `fetchWeeklyLeaderboard` appelée à chaque montage du Bilan pour un rendu masqué ;
  - `repas.portion` toujours à `'100g'`, jamais écrite ni lue ;
  - qualité du catalogue wger (« Développé incliné à la Smith machine » dans la section Maison) ;
  - pluriel en dur : « 1 séries » sur la carte d'historique Workout ;
  - **accessibilité** : la carte d'habitude du Dashboard est un `div` cliquable sans `role="button"` ni équivalent clavier — invisible dans l'arbre d'accessibilité en tant que contrôle. Repéré parce que l'outil de test ne trouvait aucun élément interactif à cliquer. L'app n'a jamais eu de passe a11y ; c'est un chantier à part entière, pas un correctif ponctuel.
- **Chantier produit ouvert** : un vrai flux « changer mon adresse e-mail » reste à construire — il dépend d'abord de la sortie du bac à sable pour l'email transactionnel (domaine expéditeur vérifié). Voir BUG 11.
- Toujours en attente décision produit : protection des mots de passe compromis (advisor WARN, Phase 1).
- Voir aussi la section « Chantiers ouverts » en haut de ce fichier : consentement au partage de données coach↔membre (point juridique, bloquant avant acquisition de coachs pilotes).

### Nettoyage des données de test — vérifié à 0, sauf un fichier à supprimer à la main
1 salle de test (`QA GYM COACH`) et 5 comptes au total (1 coach + 4 membres, dont 2 supprimés via le vrai bouton « Supprimer mon compte » pour tester ce flux) supprimés, avec toutes leurs lignes : `programmes` (1), `programme_assignations` (1), `habitudes`, `habitude_logs`, `coach_notes`, `seances`, `repas`, `activite_jour`, `objectifs`, `api_rate_limit`, `profiles`, `gyms`.

Les **15 tables du schéma balayées**, pas seulement celles touchées. Contrôle après coup : **0** compte de test, **0** profil de test, **0** salle de test, **0** programme de test, **0** ligne orpheline sur les 13 tables user-scoped, **0** profil rattaché à une salle inexistante, **0** `ai_usage` sans salle.

Base revenue à son état d'avant session : 5 `auth.users`, 5 profils, 1 salle (VOLTA FITNESS), 2 séances, 6 messages, 3 objectifs, 32 `activite_jour`, 12 repas, 0 programme, 0 habitude, 0 note coach. `api_rate_limit` est à 41 contre 39 en début de session : les 2 lignes supplémentaires appartiennent au **compte réel d'Arnaud** (endpoint `exercises`), pas aux tests — vérifié, et laissées intactes.

**🔧 Une action manuelle reste à faire de ton côté** : un fichier orphelin dans Storage, `avatars/2eafe9c7-b018-4bfe-9e87-2417af9b88df/avatar.jpg` (5 140 o). C'est l'avatar du compte de test qui a servi à **démontrer** le BUG 12 — il a été supprimé *avant* que le correctif existe, donc rien ne l'a nettoyé. Je ne peux pas le retirer moi-même : la suppression SQL directe est bloquée par un garde-fou (`storage.protect_delete`), il n'existe aucune policy DELETE pour un client authentifié, et son compte propriétaire n'existe plus. **À supprimer depuis le dashboard Supabase** (Storage → bucket `avatars` → dossier `2eafe9c7-b018-4bfe-9e87-2417af9b88df`). Aucun compte réel n'est concerné, et le correctif empêche que ce cas se reproduise.

## 🚨 2026-08-16 — Audit sécurité (Phase 2, suite 2) : Workout + messagerie temps réel, 3 bugs dont 2 pertes de séance

Suite directe des deux entrées Phase 2 plus bas. Périmètre demandé pour cette session : **Workout** (séance complète — démarrage, ajout d'exercices depuis la bibliothèque, complétion, sauvegarde en base ; navigation `WorkoutLibrary` ; cohérence hub ↔ `WorkoutSession`) et **messagerie membre↔coach** (temps réel Supabase Realtime avec deux comptes connectés simultanément, persistance, et test RLS réel qu'un membre ne peut pas lire la conversation d'un autre membre avec le coach). Tests réels dans le navigateur sur la production, puis re-tests des correctifs sur le déploiement de preview de la PR #131.

**Les 3 bugs sont côté Workout. La messagerie n'a révélé aucun bug** — c'est le premier flux de cette phase d'audit à passer intégralement.

**Note de méthode — deux sessions vraiment simultanées.** Le problème pratique du test « deux comptes en même temps » est que `localStorage` est par origine : deux onglets sur `onairapp.vercel.app` partagent la même session Supabase, et supabase-js les synchronise entre onglets. Contourné en utilisant **l'URL de déploiement Vercel** (`onairapp-j9pe2gn38-….vercel.app`) comme seconde origine : même build, mêmes variables d'environnement de production, mais stockage isolé. Membre et coach étaient donc réellement connectés en parallèle, chacun dans sa vraie UI, sans bricolage de session.

### 🔴 BUG 8 (critique — perte de données) — la séance en cours était perdue au moindre rechargement
`activeSession` était le **seul** champ d'`appData` ni relu ni sauvegardé en `localStorage`. Tous ses voisins (`calories`, `water`, `steps`, `meals`, `sleep`, `kmRun`, `sessionHistory`) passent par `load()`/`save()` ; lui était initialisé à un littéral vide (`AppContext.jsx`) et aucun effet de persistance ne le concernait.

- **Mesuré en réel, pas déduit** : séance à 3 séries dont 2 validées, reps et kg saisis (20×0, 18×5 validées, 16×10 non validée) → `location.reload()` → l'écran `/workout/session` affiche « Aucun exercice ajouté. » Tout est perdu, sans le moindre message.
- **Pourquoi ce n'est pas un cas limite** : sur une PWA c'est le cas *courant*. iOS tue régulièrement une app passée en arrière-plan ; le service worker est en network-first depuis le 2026-07-09 (donc une activation de nouvelle version recharge réellement) ; et le pull-to-refresh est à un geste. Le scénario est littéralement « je pose mon téléphone entre deux séries ».
- **Correctif** : lecture au démarrage (défensive — `exercises` doit être un tableau, le rendu le déréférence sans garde), effet de persistance aligné sur les autres champs, et reset dans `clearDay()` pour qu'une séance jamais terminée ne déborde pas sur le lendemain et ne s'y enregistre pas à la mauvaise date (`finishSession` écrit `date: todayStr()`).
- **Re-testé en réel après déploiement** : nouvel onglet, rechargement complet → les 3 séries et leurs valeurs sont intactes, l'état validé/non validé aussi.

### 🔴 BUG 9 (critique — perte de données) — « Ma séance du jour » effaçait la séance en cours sans prévenir
`handleStartSession()` (`Workout.jsx`) appelait `clearActiveSession()` inconditionnellement. Or le bouton est affiché **juste sous** la bannière « SÉANCE EN COURS » du hub : taper dessus pour rejoindre sa séance est le geste naturel, et il faisait exactement l'inverse.

- **Mesuré en réel** : séance à 1 exercice → un tap → « Aucun exercice ajouté. »
- **Aggravé par le BUG 8 une fois celui-ci corrigé** : la séance survivant désormais aux rechargements, elle vit plus longtemps, et ce bouton devenait le principal moyen de la perdre.
- **Pourquoi pas un simple garde-fou** : ce chemin est aussi le **seul** moyen d'abandonner une séance dans l'app (`WorkoutSession.jsx` n'offre que « TERMINER LA SÉANCE », qui l'enregistre). Le rendre non destructif aurait supprimé une action légitime. D'où un choix explicite en sheet — « Reprendre la séance » / « Démarrer une nouvelle séance » (style danger) / « Annuler » — qui conserve les deux intentions et n'en déclenche aucune par accident. Sheet calquée sur `DeleteAccountButton.jsx`, seule convention de confirmation de l'app (aucun `window.confirm` nulle part).
- **Re-testé en réel dans les deux sens** : « Reprendre » → séance intacte (3 séries, toutes valeurs conservées) ; « Démarrer une nouvelle » → efface bien, volontairement cette fois.

### 🟠 BUG 10 (majeur) — le minuteur de repos recouvrait « TERMINER LA SÉANCE »
Le restyle du 2026-08-14 a rendu `.finish-session-btn` `position: fixed` (bottom 76px, z-index 90). Il était dans le flux avant, donc aucune collision n'était possible. `.rest-timer` (`RestTimer.css`) n'a pas bougé : fixed, bottom 100px, z-index 96. Les deux se sont retrouvés dans la même bande, le minuteur au-dessus.

- Le minuteur s'ouvre **automatiquement à chaque série validée, dernière série comprise** : il recouvrait donc le bouton exactement au moment de s'en servir. Il fallait taper SKIP (ou attendre la fin du décompte) sans que rien ne l'indique.
- **Confirmé par hit-test, pas par lecture** : `elementFromPoint()` au centre du bouton renvoyait `.rest-timer`, et le clic sur « TERMINER LA SÉANCE » ne partait effectivement pas.
- **Correctif** : le minuteur remonte au-dessus du bouton — 76 (même clearance nav pill) + 56 (hauteur mesurée du bouton) + 12 d'air. Sélecteur scopé à `.workoutsession-redesign`, seul contexte où `RestTimer` est rendu.
- **Erreur de méthode à noter** : j'ai d'abord conclu que ce correctif ne marchait pas, sur une mesure qui donnait un `translateY(+74px)` résiduel. C'était l'animation `slideUp` (250 ms) capturée **en plein vol** par la mesure. Re-mesuré proprement sur 3,6 s : `translateY(0)`, minuteur à 806-880, bouton à 892-948, et les trois points du bouton (haut, centre, bas) atteignables. Le correctif était bon ; la mesure ne l'était pas.

### Ce qui a été testé et qui marche (vérifié en base, pas seulement à l'écran)
- **Workout — sauvegarde en base** : séance à 2 exercices issus de 2 sections différentes (Push-up depuis Maison, Bench Press depuis Salle), 5 séries dont 3 validées → ligne `seances` exacte : `[{Push-up: [15×0, 12×5]}, {Bench Press: [8×60]}]`, `duree_min` 1, `date` du jour. **Les 2 séries non cochées sont correctement exclues** (le filtre ajouté le 2026-08-13 tient). Hub après rechargement complet : « 1/6 séances », carte « 3 séries », badges Push-up/Bench Press — tout cohérent avec la base. Écran de détail d'historique exact au détail de chaque série.
- **WorkoutLibrary** : les 3 sections chargent ; fusion catalogue local curaté + wger statique + API live vérifiée en direct (127 → 177 exercices sur Salle après ~10 s de chargement) ; recherche (« bench » → 7 résultats, regroupement par groupe musculaire conservé) ; modal d'exercice avec instructions ; ajout depuis la liste **et** depuis la modal.
- **Messagerie — temps réel bidirectionnel**, avec les deux comptes réellement connectés en parallèle : membre → coach et coach → membre, message affiché **sans rechargement** des deux côtés. Persistance des 4 messages en base, `read_at` posé correctement à l'ouverture de chaque conversation, pastille de non-lus présente avant lecture, résumés de conversation (dernier message + heure) justes côté coach comme côté membre.
- **Multi-salles, sous une vraie 2ᵉ salle** : le membre ne voit que le coach de sa salle, le coach ne voit que ses 2 membres et aucun des 3 membres réels de VOLTA FITNESS. À noter : `fetchPrimaryCoach()` (`utils/messages.js`) n'a **aucun filtre `gym_id`** — il prend le coach le plus ancien globalement. C'est la policy « Members can view own-gym coach profiles » qui le rend inoffensif : le membre de test a bien vu QaCoach (créé le jour même) et non le coach de VOLTA (créé le 2026-07-08, donc plus ancien). Vérifié en conditions réelles, pas déduit — mais c'est une garantie qui repose entièrement sur la RLS, à garder en tête si la requête devait un jour tourner en service_role.
- **Coach passant d'une conversation à l'autre** : échantillonnage du DOM toutes les 50 ms sur 2 s — aucune fenêtre où les messages d'un membre s'affichent sous le nom de l'autre. Hypothèse envisagée puis **réfutée par la mesure**.

### Test RLS réel de la messagerie — fait pour de vrai, aux deux couches
Demandé explicitement : vérifier par test, pas par lecture de policy. Fait avec le token d'un **second membre réel** de la même salle.

| Tentative | Résultat |
|---|---|
| Requête exacte de `fetchConversation(membre1, coach)` | **0 ligne** |
| `select *` sur toute la table `messages` | **0 ligne** |
| Recherche par contenu (`content=ilike.*test membre 1*`) | **0 ligne** |
| INSERT vers un autre membre | **42501 refusé** |
| INSERT en usurpant `sender_id` (se faire passer pour membre 1) | **42501 refusé** |
| PATCH `read_at` sur les messages d'autrui | 200 mais **0 ligne modifiée** |

**Et surtout, la couche Realtime — c'est le point qui ne se lit pas dans une policy.** Le filtre `postgres_changes` est fourni par le client : si Realtime n'appliquait pas la RLS, n'importe qui pourrait s'abonner avec `filter: receiver_id=eq.<id du coach>` et écouter toutes les conversations de la salle. Testé avec **contrôle positif** : deux WebSockets ouverts sur la même config exactement, l'un avec le JWT du coach, l'autre avec celui du second membre, tous deux `phx_join` en `"ok"`. Sur une insertion réelle (membre 1 → coach) : **le socket du coach a reçu le payload, celui du second membre n'a rien reçu.** La RLS est donc bien appliquée par abonné, et le filtre client ne permet pas d'écouter la conversation d'autrui.

### Nettoyage des données de test — vérifié à 0
3 comptes de test (`volta.qa.coach2@`, `volta.qa.m1@`, `volta.qa.m2@`) et 1 salle de test (`QA GYM MSG`) supprimés, avec toutes leurs lignes : `messages` (4), `seances` (1), `api_rate_limit` (11), `profiles` (3), `gyms` (1), `auth.users` (3). Les 15 tables du schéma ont été balayées, pas seulement celles touchées : `objectifs`, `activite_jour`, `repas`, `ai_usage`, `coach_notes`, `habitudes`, `habitude_logs`, `programmes`, `programme_assignations`, `push_subscriptions` étaient déjà à 0 pour ces comptes.

Contrôle après coup : **0** compte de test, **0** profil de test, **0** salle de test, **0** message de test, **0** ligne orpheline sur `profiles`/`seances`/`messages`/`objectifs`/`activite_jour`/`repas`/`api_rate_limit`, **0** profil rattaché à une salle inexistante, **0** ligne `ai_usage` sans salle, **0** objet Storage orphelin. Base revenue **exactement** à son état d'avant session : 5 `auth.users`, 5 profils, 1 salle (VOLTA FITNESS), 2 séances, 6 messages, 3 objectifs, 32 `activite_jour`, 12 repas, 39 `api_rate_limit`. Le seul objet Storage (1) est l'avatar réel d'Arnaud du 2026-08-15, antérieur à la session. Arnaud reste le seul `is_platform_admin`.

**Aucun résidu `ai_usage` cette fois**, contrairement à la session précédente : aucun appel IA n'a été nécessaire (ni « Programme IA », ni scan, ni recette), et la salle de test a de toute façon été supprimée.

Sessions de test aussi effacées du navigateur (`localStorage` vidé sur les 3 origines utilisées : production, URL de déploiement production, URL de preview).

### Reste à faire
- **Phase 2 (suite)** — flux non couverts : **Settings** et **espace coach** (`CoachDashboard`, `ClientsList`, `MemberDetail`, programmes, habitudes).
- **Phase 3** — qualité de code. Deux candidats repérés au passage cette session, volontairement **pas** traités (ce ne sont pas des bugs) :
  - `activeSession.type` n'est **jamais** renseigné : ni `addExercisesToSession`, ni `startCoachProgram`, ni le flux bibliothèque ne le posent. Toutes les séances s'enregistrent donc sous le nom générique « SÉANCE », y compris celles issues d'un programme IA qui affiche pourtant un `session_type` (« PUSH DAY »). Effet de bord : `recentSessionsLine` (`Workout.jsx`) envoie « SÉANCE (dim. 16 août) » au générateur de programme — un historique sans information utile.
  - Qualité du catalogue wger : « Développé incliné à la Smith machine » apparaît dans la section **Maison** (« Bodyweight · Sans équipement »). Donnée tierce mal catégorisée, pas un bug de code.
- Décider pour les variables d'env en Preview — **partiellement tranché en pratique** : les variables `VITE_*` (donc Supabase Auth, Realtime, REST) **fonctionnent bien en Preview**, c'est confirmé cette session en s'y connectant et en y testant les 3 correctifs. Seules les routes `/api/*` (qui ont besoin de `SUPABASE_SERVICE_ROLE_KEY`) restent indisponibles. Un correctif purement client est donc testable en preview avant merge ; seuls les flux serveur imposent encore de passer par la production.
- Toujours en attente décision produit : protection des mots de passe compromis (advisor WARN, Phase 1).

## 🚨 2026-08-16 — Audit sécurité (Phase 2, suite) : Bilan + Nutrition, 4 bugs trouvés dont une perte de données

Suite directe de la Phase 2 (entrée « tests fonctionnels réels, 3 bugs trouvés » plus bas). Périmètre de cette session, tel que demandé : **Bilan** (`Weekly.jsx` — édition d'objectif calories/protéines déplacée depuis Settings le 2026-08-15, recalcul auto, sauvegarde ; + classement hebdo) et **Nutrition** (ajout de repas, scan photo avec croisement Open Food Facts, « Décrire un repas », génération de recette). Tests réels dans le navigateur sur la **production** (les routes `/api/*` ne tournent toujours pas en Preview — voir le point d'environnement de l'entrée précédente, toujours non arbitré).

Les 4 bugs ont été trouvés **en test réel, pas en relecture de code**, et aucun n'était visible depuis l'UI : dans les quatre cas l'écran affichait quelque chose de parfaitement crédible pendant que le calcul ou la donnée derrière était faux.

**Note de méthode** : les deux comptes de test ont été créés par appel direct à `auth/v1/signup` + `/api/invite` depuis la page (le vrai chemin de `register()`), puis la session injectée en `localStorage` — plutôt qu'en tapant un mot de passe dans le formulaire. Le signup UI n'était pas au périmètre (déjà testé la session précédente) ; l'onboarding, lui, a bien été fait via l'UI réelle, écran par écran.

### 🔴 BUG 4 (critique — perte de données) — enregistrer un objectif depuis Bilan effaçait poids et taille
Trouvé **par accident, en fin de session**, en recomparant l'état du compte de test à celui qu'il avait après l'onboarding : `poids 82` / `taille 180` étaient devenus NULL. Le seul geste intercalé était « ENREGISTRER LES OBJECTIFS » depuis le Bilan.

- **Root cause** (`AuthContext.updateUserProfile`) : `poids: profile.weight ? parseFloat(...) : null` et l'équivalent pour `taille` — un `null` explicite dès que l'appelant ne fournit pas ces champs. Or `upsertOwnProfile` ne filtre que les `undefined`. Les null partaient donc en base et écrasaient les vraies valeurs. Juste en dessous, `age` et `objectif` utilisent, eux, la bonne forme (omission conditionnelle) — le commentaire d'`age` explique même exactement ce piège. Poids/taille n'avaient simplement jamais reçu le même traitement.
- **Seul appelant concerné** : `Weekly.jsx`, qui n'envoie que l'objectif et les cibles caloriques. `Onboarding.jsx` et `Settings.jsx` envoient bien poids/taille et n'ont jamais été destructeurs.
- **Fenêtre d'exposition — étroite, et c'est important** : ce chemin ne pouvait pas détruire de données avant le 2026-08-16, puisque **toutes** les écritures `profiles` du client échouaient alors en 42501 (BUG 1). Le correctif d'hier est donc précisément ce qui a rendu cette perte effective — un correctif juste qui a découvert un second défaut derrière lui.
- **Aucun compte réel touché** — vérifié en base avant correctif : Arnaud (76/188) et Myriam (65/160), réparés manuellement la veille, étaient toujours intacts ; personne n'avait encore enregistré d'objectif depuis Bilan dans cette fenêtre. Les deux réparations manuelles n'ont donc pas été perdues.
- **Portée réelle au-delà de l'affichage** : `poids` alimente `AppContext.weightKg` (estimation de dépense de la course, `utils/metabolism.js`), le recalcul d'objectif du Bilan lui-même, et la fiche membre vue par le coach (`ClientsList.jsx`).
- **Re-testé en réel après déploiement** : sauvegarde d'objectif depuis Bilan sur un compte à 82/180 → objectif et calories bien mis à jour (2999), `poids` et `taille` **intacts**.

### 🔴 BUG 5 (critique) — le type de repas n'arrivait jamais au générateur de recette
Demander une idée de **Snack** renvoyait 3 propositions à ~700 kcal — « Bowl petit-déjeuner », « Croque-monsieur », « Pâtes bolo » — sous un en-tête « SNACK ». C'est très exactement le symptôme qu'un membre réel avait remonté et que le plafond par type de repas était censé corriger.

- **Root cause** : `chooseMealType()` appelait `generateRecipe()` dans le **même gestionnaire d'événement** que `setRecipeMealType()`, dont l'effet n'arrive qu'au rendu suivant. `generateRecipe` lisait donc la valeur d'avant — la chaîne vide remise par `openRecipeSheet()`.
- **Isolé précisément par test** (pas déduit) : interception du corps envoyé à `/api/claude` → prompt parti avec « Repas concerné : » **vide** et « Calories restantes : 700 kcal », deux fois de suite, pour Dîner comme pour Snack.
- **Conséquence en cascade** : `getMealBudget('')` fait `MEAL_TYPES.indexOf('')` = -1, donc `[500,700,700,300][-1]` = `undefined` → repli sur 700, et `mealScale` = 1. **Le plafond par type de repas n'a donc JAMAIS été appliqué sur ce chemin** depuis son ajout. Les protéines/glucides/lipides restants étaient mis à la même échelle erronée.
- **Non concernés** : les chemins photo et lien, dont la génération part d'un événement ultérieur (onChange du fichier, bouton), donc après re-rendu.
- **Correctif** : le type est passé explicitement à `generateRecipe(type)`, et le régénérateur (« Voir d'autres idées ») le reconduit.
- **Re-testé en réel** : « Repas concerné : Snack », « Calories restantes : 300 kcal », protéines/glucides/lipides remis à l'échelle (26/43/17 au lieu de 60/100/40), et 3 vraies propositions de snack à 295-298 kcal.

### 🟠 BUG 6 (majeur) — mauvais produit Open Food Facts retenu quand les noms sont à égalité
Photo d'un pot de Nutella en mode Repas : le modèle identifie correctement le produit et estime 400 g, mais l'écran affichait **312 kcal** — avec un badge « ✓ vérifié » qui rendait le chiffre crédible. Sous-comptage d'un facteur 7.

- **Root cause reproduite à la main** sur l'endpoint réel : la recherche OFF pour « Pâte à tartiner Nutella » renvoie 5 entrées nommées **toutes exactement « Pâte à tartiner »** (78, 59, 555 et 571 kcal/100g). `pickBestMatch` départage sur la complétude des macros puis la similarité de nom : les quatre candidats utilisables obtenaient donc le même score, et la comparaison stricte `>` gardait le premier de la liste — c'est-à-dire le classement de pertinence textuelle d'OFF, qui ici met en tête une entrée atypique.
- **Ce n'est pas une incohérence détectable par contrôle interne** : les macros du mauvais candidat sont parfaitement cohérentes avec ses propres calories (contrôle d'Atwater OK). C'est un autre aliment, pas une donnée corrompue — d'où le choix du correctif ci-dessous.
- **Correctif, sans requête supplémentaire** : les deux appelants (`Scan.jsx`, `estimateFoodsFromText`) disposent déjà de l'estimation par 100g du modèle, qui leur sert de repli. Elle est désormais passée à `lookupOFF` et sert (1) à départager les candidats à égalité — poids 0.25, volontairement **sous** l'écart de 0.3 entre deux paliers de `nameSimilarity`, pour qu'un meilleur nom continue toujours de l'emporter — et (2) à rejeter un match dont le kcal/100g s'écarte de plus d'un facteur 2 : `lookupOFF` renvoie alors `null`, l'appelant retombe sur l'estimation IA et **n'affiche plus le badge « vérifié »**. Sans repère exploitable, comportement strictement inchangé.
- **Re-testé en réel** : même photo, même estimation de 400 g → **2220 kcal / 37 P / 196 G / 140 L** au lieu de 312 kcal.

### 🟠 BUG 7 (majeur, première impression) — les objectifs calculés à l'onboarding n'apparaissaient qu'après rechargement
Onboarding complet en conditions réelles (82 kg / 180 cm / 30 ans, prise de masse, 4-5 séances) : les cibles sont **correctement calculées et écrites en base** (3069 / 164 / 345 / 85, vérifié dans `objectifs`), mais le Dashboard affichait encore 2400 / 180 / 240 / 80 — les valeurs par défaut — jusqu'à un rechargement complet de la page.

- **Root cause** : `handleComplete()` persiste via `updateUserProfile()` (AuthContext) sans jamais toucher `AppContext`, dont le fetch de `objectifs` est déclenché par `[user?.id]`. Or le membre est **déjà authentifié** pendant l'onboarding : l'id ne change pas, le fetch n'est jamais rejoué.
- **Le `localStorage.setItem('onair_calorieGoal')` déjà présent ne compensait pas** : `getPersonalisedGoals()` ne le lit que dans l'initialiseur de `useState` d'AppContext, exécuté bien avant. Cette écriture était donc morte pour la session en cours.
- **Correctif** : répercussion locale immédiate via `updateData()` (setter d'état pur, aucune écriture supplémentaire en base) pour les 4 cibles + le poids.
- **Re-testé en réel** sur un second compte neuf : Dashboard à **3069 / 164 / 345 / 85 sans aucun rechargement**, navigation SPA de bout en bout.

### Ce qui a été testé et qui marche (vérifié en base, pas seulement à l'écran)
- **Bilan — édition d'objectif** : recalcul automatique au clic sur un chip (3069 → 2651 en ajoutant « Perdre du poids », protéines à 164 = 2 × le vrai poids de 82 kg, donc la formule lit bien les vraies valeurs et pas les valeurs de repli), édition manuelle, sauvegarde confirmée dans `profiles.objectif` **et** `objectifs`. Les objectifs réglés ailleurs (eau 2500, pas 10000) ne sont pas écrasés au passage. Propagation immédiate vers Dashboard et Nutrition sans rechargement.
- **Bilan — classement hebdomadaire** : la vue `leaderboard_weekly` est bien scopée à la salle de l'appelant (correctif Phase 1 toujours en place, revérifié dans la définition SQL **et** par appel REST réel avec le token du compte de test). Le rendu reste masqué côté produit depuis le 2026-08-13 ; le fetch, lui, part toujours à chaque montage du Bilan — code mort à trancher en Phase 3, pas un bug.
- **Nutrition — ajout de repas** : « Blanc de poulet 150 g » → 165 kcal / 34.5 P / 0 G / 3 L à l'écran, exactement la même chose en base (`repas`), avec le bon `type_repas`.
- **Nutrition — « Décrire un repas »** : « deux œufs brouillés, une tranche de pain complet et un demi avocat » → 3 items convertis en grammes (110 / 30 / 60), chacun avec sa correspondance OFF affichée, total 294 kcal. Édition des grammes en direct : 110 → 220 recalcule bien l'item (99 → 198 kcal) et le total (294 → 393).
- **Onboarding** : `profiles` (prénom, email, poids, taille, âge, objectif) et `objectifs` tous les deux correctement écrits — le correctif du BUG 1 de la session précédente tient, revérifié sur deux comptes neufs.

### Réponse à la question de clôture : aucune autre table n'a le pattern « allowlist vs upsert » du BUG 1
Vérifié par requête sur `information_schema.column_privileges` (niveau colonne, le seul où ce trou est visible) puis croisé avec **tous** les `onConflict` du code :

| Table | Clé de conflit utilisée | Dans l'allowlist UPDATE ? |
|---|---|---|
| `objectifs` | `user_id` | ✅ |
| `activite_jour` | `user_id,date` | ✅ |
| `coach_notes` | `coach_id,member_id` | ✅ |
| `push_subscriptions` | `endpoint` | ✅ |
| `profiles` | — | plus d'upsert (helper `upsertOwnProfile`) |

`profiles` est la **seule** table à allowlist UPDATE restreinte (`prenom, email, poids, taille, age, objectif, avatar_url`). La seule autre restriction de colonne du schéma est `messages` en `UPDATE(read_at)` — sans upsert nulle part dans le code (insert + update de `read_at` uniquement), donc hors de portée du problème. **Aucun compte réel n'est exposé à une répétition du BUG 1.** En revanche le BUG 4 ci-dessus est une perte de données de la même famille (écriture silencieuse d'un `null`) sur ces mêmes colonnes — trouvée et fermée avant qu'un compte réel ne soit touché.

### Nettoyage des données de test — vérifié à 0
2 comptes de test (`volta.qa.bilan@`, `volta.qa.onb@`) et toutes leurs lignes supprimés : `profiles` (2), `repas` (2), `objectifs` (2), `api_rate_limit` (5), `auth.users` (2). Contrôle après coup : **0** compte de test, **0** profil de test, **0** salle de test, **0** ligne orpheline sur `profiles`/`repas`/`objectifs`/`activite_jour`/`seances`/`api_rate_limit`/`messages`, **0** fichier orphelin dans Storage. La base est revenue exactement à son état d'avant session : 1 salle (VOLTA FITNESS), 5 profils, 5 comptes `auth.users`.

**Un résidu assumé, pas nettoyé** : les ~7 appels IA de cette session (scan, description de repas, générations de recette) ont incrémenté `ai_usage` de la vraie salle VOLTA FITNESS — ce compteur est gym-scoped, pas user-scoped, donc il n'y a pas de ligne de test à supprimer, seulement un compteur réel légèrement gonflé (17 appels sur le mois au total). Inévitable tant que les tests doivent passer par la production faute de variables d'environnement en Preview.

### Reste à faire
- **Phase 2 (suite)** — flux non couverts : Workout, Settings, messagerie temps réel, espace coach.
- **Phase 3** — qualité de code. Deux candidats repérés au passage cette session, volontairement **pas** traités (ce ne sont pas des bugs) : le fetch `fetchWeeklyLeaderboard` qui part à chaque montage du Bilan pour un rendu masqué, et la colonne `repas.portion` qui vaut toujours `'100g'` (valeur par défaut de la base, jamais écrite ni lue par `src/`) alors que la quantité réelle vit dans le nom du repas.
- **Qualité des données OFF** (pas un bug de code) : même après le BUG 6, certaines correspondances restent médiocres — « Œuf brouillé » matché à ~99 kcal/100g contre ~155 attendu. Le garde-fou d'un facteur 2 laisse passer ce genre d'écart. Le bouton « Corriger l'aliment » existe déjà côté membre pour ça ; à surveiller si des retours arrivent.
- Décider pour les variables d'env en Preview (toujours ouvert).
- Toujours en attente décision produit : protection des mots de passe compromis (advisor WARN, Phase 1).

## 🔧 2026-08-16 — Réparation manuelle (2/2) : poids/taille manquants sur le compte d'Arnaud

Deuxième et dernière victime réelle du BUG 1 (voir l'entrée « Réparation manuelle d'un compte réel (Myriam) » juste en dessous, et le BUG 1 lui-même dans l'entrée Phase 2). **Même cause, symptôme différent** : ici la ligne `profiles` existait bien — c'est le *chemin UPDATE* de l'upsert qui échouait, pas la création de la ligne. Résultat : `prenom`/`email`/`objectif` corrects (posés à l'INSERT initial), mais `poids` et `taille` restés NULL depuis le 2026-07-09, alors qu'ils avaient bien été saisis à l'onboarding.

### Constat et valeurs retrouvées
`raw_user_meta_data` porte `weight: "76"` et `height: "188"` (ainsi que `name "Arnaud"`, `goal "Perte de poids"` — ces deux-là déjà correctement en base). Même trace corroborante que pour Myriam : la ligne `objectifs` de ce compte a été écrite le **2026-07-09 à 20:21:19**, soit **27 secondes après l'inscription** (20:20:52), avec des cibles cohérentes (3100 kcal / 195 P / 240 G / 80 L) — l'onboarding est donc bien allé au bout, seule l'écriture `profiles` s'est perdue. `age` absent des deux sources → laissé NULL, pas inventé.

### Réparation appliquée
Un seul UPDATE en service_role, **strictement les deux colonnes concernées** :
`update public.profiles set poids = 76, taille = 188 where user_id = '…' and poids is null and taille is null`

Mêmes garde-fous que la réparation précédente : `user_id` **jamais dans le SET** (uniquement dans le WHERE — c'est précisément ce que l'allowlist de colonnes interdit et ce qui causait le 42501), requête idempotente grâce aux conditions `is null`, et **aucun changement de GRANT, RLS, allowlist ou trigger**. Rien d'autre n'a été touché sur ce profil : `role`, `gym_id` et surtout `is_platform_admin` (seul compte à `true`) sont restés inchangés — vérifié dans le `returning`.

### Vérifié côté coach
Requête exacte de `ClientsList` rejouée **sous le contexte RLS réel du coach** : Arnaud remonte désormais avec `poids 76` / `taille 188` / `objectif "Perte de poids"`, aux côtés de Myriam (65/160) et Gisèle.

### État final des 3 membres
Plus aucune donnée d'onboarding perdue en base, hormis ce qui n'a réellement jamais été saisi : Gisèle n'a ni poids, ni taille, ni objectif — absents **aussi** de son `raw_user_meta_data`, donc rien à réparer de son côté. `age` est NULL pour les trois, jamais collecté nulle part. Les deux réparations manuelles rattrapent tout ce que le BUG 1 avait fait perdre aux comptes réels ; à partir d'ici, le fix de code prend le relais pour les nouveaux comptes (re-testé en réel, voir l'entrée Phase 2).

## 🔧 2026-08-16 — Réparation manuelle d'un compte réel (Myriam) : ligne `profiles` manquante depuis le 2026-08-06

**Distinct du BUG 1 de la Phase 2 ci-dessous**, même si la cause est la même. Le BUG 1 est le *défaut de code* (upsert client bloqué en 42501 par l'allowlist de colonnes), corrigé le jour même. Cette entrée-ci documente sa **victime réelle** : une utilisatrice inscrite **10 jours avant que le correctif existe**, dont la ligne `profiles` n'a jamais été créée et que le fix de code ne pouvait pas réparer rétroactivement. Aucune donnée de test ici — un vrai compte, réparé à la main.

### Constat
`spicymymy@gmail.com` (inscrite le 2026-08-06 à 12:48) existait dans `auth.users` sans **aucune** ligne dans `profiles`. Conséquences concrètes : invisible dans `ClientsList`/`CoachDashboard` côté coach (les policies coach filtrent sur `profiles`), et donc absente de tout suivi depuis 10 jours.

### Investigation — valeurs retrouvées, pas devinées
Rien n'a été inventé. Deux sources concordantes :
1. **`auth.users.raw_user_meta_data`** — l'onboarding a bien écrit dans les métadonnées auth (`auth.updateUser()` fonctionne, lui) : `name: "Myriam"`, `role: "member"`, `goal: "Prise de masse"`, `weight: "65"`, `height: "160"`, plus les cibles calculées (`calorieGoal 2609`, `proteinGoal 130`, `carbGoal 294`, `fatGoal 72`, `tdee 2372`, `frequency "4-5"`, `level "Intermédiaire"`).
2. **Trace indépendante en base** — la ligne `objectifs` de ce compte, écrite le **2026-08-06 à 12:49:09** (une minute après l'inscription), porte exactement les mêmes chiffres : `calories_jour 2609`, `proteines 130`, `glucides 294`, `lipides 72`. Elle prouve que l'onboarding est bien allé au bout : `objectifs` a le `UPDATE(user_id)` qui manque à `profiles`, donc son upsert passait pendant que celui de `profiles` échouait silencieusement. Il existe aussi 1 ligne `activite_jour` (2026-08-06, sommeil 7,38 h) et 1 message envoyé.

`age` n'apparaît **nulle part** dans ces traces → laissé à NULL plutôt que d'inventer une valeur.

### Réparation appliquée
Une seule ligne `profiles` créée, avec les valeurs ci-dessus : `prenom 'Myriam'`, `email`, `poids 65`, `taille 160`, `objectif 'Prise de masse'` (valeur exacte attendue par le code — `GOAL_OPTIONS` dans `Weekly.jsx` mappe le libellé « Prendre du muscle » sur cette valeur stockée), `role 'member'`, `gym_id` = VOLTA FITNESS (`30cd42d5…`, **seule salle active** ; les 4 autres profils y sont tous rattachés — à noter, la table `gyms` n'existait pas encore à son inscription, créée le 2026-08-10).

Écriture faite en service_role avec la même sémantique que le helper `upsertOwnProfile` (INSERT puisqu'aucune ligne n'existait, `user_id` jamais dans un SET), et idempotente (`where not exists`). C'est aussi le même partage des rôles que le pipeline d'inscription réel : `register()` pose prenom/email, `api/invite.js` pose `gym_id`/`role` en service_role.

**Aucun changement de GRANT, de RLS, d'allowlist ni de trigger** — strictement une insertion de données conforme à l'existant. Pas de changement de code non plus : cette entrée est le seul livrable versionné.

### Vérifié côté coach, pour de vrai
Pas seulement relu : la requête exacte de `ClientsList` (`select * from profiles where role='member'`) a été rejouée **sous le contexte RLS réel du coach** (`set local role authenticated` + `request.jwt.claims` = user_id du coach). Myriam y apparaît désormais aux côtés d'Arnaud et Gisèle, avec son objectif, son poids et sa taille — elle est même la seule des trois dont `poids`/`taille` sont renseignés en base.

### Deux points laissés ouverts
- **`profiles.created_at` de cette ligne porte la date de la réparation (2026-08-16), pas celle de l'inscription (2026-08-06).** L'alignement sur `auth.users.created_at` a été tenté mais bloqué par le classificateur de permissions. Sans impact fonctionnel connu : `profiles.created_at` n'est lu nulle part dans `src/` (vérifié par grep — les autres usages de `created_at` portent sur `repas`/`seances`/`messages`/`gyms`/`habitudes`/`programmes`). À corriger à la main si une notion d'ancienneté de membre apparaît un jour.
- ~~**Même trou de données, autre symptôme, sur le compte d'Arnaud** : `poids 76` / `taille 188` sont présents dans son `raw_user_meta_data` mais NULL dans `profiles` — sa ligne existait, c'est le chemin UPDATE qui échouait. Non touché (hors périmètre de cette réparation).~~ **Réparé le 2026-08-16** — voir l'entrée « Réparation manuelle (2/2) » juste au-dessus. Gisèle, elle, n'a jamais rempli ces champs (absents des deux côtés) : rien à réparer.

## 🚨 2026-08-16 — Audit sécurité (Phase 2) : tests fonctionnels réels, 3 bugs trouvés dont 2 critiques

Suite directe de la Phase 1 (voir entrée juste en dessous). Phase 2 = tests fonctionnels réels dans le navigateur (claude-in-chrome) sur l'app déployée, avec un compte de test dédié. Périmètre de cette session, tel que demandé : signup membre, signup coach (+ re-test du TOCTOU `/api/create-gym`), Dashboard (toutes les cartes + édition des objectifs). Les autres flux (Nutrition, Bilan, Workout, Settings, messagerie, espace coach) restent à faire.

Les trois bugs ont été trouvés **en test réel, pas en relecture de code** — et aucun n'était visible depuis l'UI : dans les trois cas l'écran affichait le bon résultat pendant que la base recevait autre chose (ou rien).

### 🔴 BUG 1 (critique) — toutes les écritures client sur `profiles` échouaient en 42501
Premier signup membre de la session : l'inscription "réussit", le Dashboard affiche bien « QaMembre »… mais la console crache `[Auth] register: profiles upsert failed` **et** `[Auth] resolveRole: self-heal profile upsert failed`. En base, la ligne `profiles` existe (créée par `api/invite.js` en service_role) mais avec **`prenom` NULL et `email` NULL** — un nouveau membre arrive donc anonyme pour son coach. Le prénom affiché à l'écran vient de `user_metadata`, pas de la base : d'où l'invisibilité totale du bug côté UI.

- **Root cause** : PostgREST traduit `upsert()` en `INSERT ... ON CONFLICT DO UPDATE SET <toutes les colonnes du payload>`, **clé de conflit `user_id` comprise**. Or `user_id` n'est pas dans l'allowlist de colonnes UPDATE de `profiles` — celle restaurée la veille en Phase 1 pour refermer l'escalade de privilèges. Postgres exige donc `UPDATE(user_id)` et refuse la requête entière, **avant même d'évaluer la moindre RLS**.
- **Isolé précisément par test** (pas déduit) : `PATCH {prenom, email}` → 204 ; le **même** PATCH avec `user_id` dans le corps → 42501. `objectifs`, lui, a bien un `UPDATE(user_id)` — c'est exactement pour ça que ses upserts, eux, fonctionnent.
- **Portée** : les 3 upserts `profiles` du client, donc `register()`, le self-heal de `resolveRole()`, et `updateUserProfile()` — c'est-à-dire aussi Settings (nom/email/poids/taille), l'objectif édité depuis Bilan, et Onboarding. **Tous sans effet en base depuis le 2026-08-16.**
- **Lien avec l'incident du 2026-08-15** : le GRANT table-wide posé ce jour-là masquait ce problème (il donnait `UPDATE(user_id)` au passage). Le rétablissement de l'allowlist en Phase 1 était sécuritairement correct mais a re-cassé ce chemin — et le retest d'alors avait porté sur `avatar_url` via un `.update()` simple (qui passe), pas sur un `upsert()`.
- **Correctif — côté client, pas côté GRANT** : élargir le GRANT à `user_id` rouvrirait précisément le trou que l'allowlist existe pour fermer. Nouveau helper `upsertOwnProfile()` (`lib/supabase.js`) : UPDATE d'abord (colonnes autorisées uniquement), INSERT si aucune ligne, retry UPDATE sur 23505 — la concurrence est réelle ici, `register()` et le self-heal écrivent en même temps à l'inscription. Aucun changement de schéma, de GRANT ni de RLS.
- **Re-testé en réel après fix** (voir « Vérification finale » plus bas).
- **À noter au passage** : le compte `spicymymy@gmail.com` (2026-08-06) n'a **aucune ligne `profiles`** — un vrai utilisateur, pas un compte de test. Résidu d'un échec du même genre, à traiter à la main.

### 🔴 BUG 2 (critique) — TOCTOU `/api/create-gym` : deux salles créées, une orpheline
Le trou signalé en Phase 1 est **toujours présent, et confirmé par test réel** : deux POST concurrents avec le même token frais → **200 tous les deux, DEUX salles créées** (`QA RACE GYM 1` et `2`). Le profil coach n'en revendique qu'une ; l'autre reste orpheline, avec son propre code d'invitation (n'importe qui pourrait rejoindre une salle sans coach) et son propre essai de 14 jours.

- **Ce n'est pas un scénario théorique** : à chaque inscription coach, `CoachSignup.jsx` **et** le self-heal de `resolveRole()` (AuthContext) appellent tous les deux cet endpoint quasi simultanément — vérifié dans les logs console du signup coach de test (`[Auth] resolveRole: deferred create-gym failed Ce compte a déjà un profil`). Sur ce run l'appel différé a perdu la course de justesse et a pris le 409 ; le trou était donc invisible en usage normal, mais bien ouvert.
- **Root cause** : la vérification « ce compte a-t-il déjà un profil ? » était une lecture suivie d'une écriture non atomique.
- **Correctif** : claim atomique du profil après création de la salle — INSERT (la contrainte `UNIQUE (user_id)` fait perdre le second en 23505), sinon UPDATE conditionné à `gym_id is null AND role = 'member'` (sous READ COMMITTED le second UPDATE ré-évalue son WHERE et met à jour 0 ligne). Le perdant supprime la salle qu'il venait de créer et répond 409 ; une vraie erreur d'écriture reste distinguée en 500. Le pré-filtre est conservé mais n'est plus la garantie. Aucun changement de schéma : le claim ne s'appuie que sur des contraintes déjà en place.

### 🟠 BUG 3 (mineur) — la carte Sommeil jetait les demi-heures
Saisir `7.5` sur la carte Sommeil enregistrait **7** — à l'écran comme en base (`activite_jour.sommeil_h = 7`), sans aucun retour à l'utilisateur. Root cause : `handleSave()` construisait `{ hours: Math.floor(num), minutes: 0 }`. Rien ne l'imposait — la colonne est un `numeric` sans échelle fixe, `AppContext` repersiste déjà `hours + minutes/60`, et `sleepFromHours()` faisait exactement la bonne conversion dans l'autre sens. Correctif : `sleepFromHours()` exportée et réutilisée ; la carte affiche désormais des heures décimales (elle ne lisait que `hours` et aurait annoncé « 7h » pour une nuit de 7h30 correctement enregistrée).

### Ce qui a été testé et qui marche
- **Signup membre** : compte créé dans `auth.users`, ligne `profiles` créée avec le bon `gym_id` (VOLTA FITNESS, via `api/invite.js` en service_role) et `role='member'`. Seuls `prenom`/`email` manquaient → BUG 1.
- **Signup coach** : `gyms` (nom, code d'invitation généré, `trial_ends_at` à +14j) et `profiles` (prenom, email, `role='coach'`, `gym_id`) tous correctement peuplés. Le chemin service_role, lui, n'a jamais souffert du BUG 1.
- **Dashboard** : les 5 familles de cartes s'affichent avec de vraies données (streak, calories/macros lues depuis `objectifs`, pas, course, eau, sommeil, séances de la semaine).
- **Écriture des valeurs du jour** : eau 1500 ml (sélecteur de verres) et pas 8432 → confirmés dans `activite_jour`.
- **Édition des objectifs** : eau 2500 → 3000 et sommeil 8 → 9 → confirmés dans `objectifs` (`eau_ml`, `sommeil_h_objectif`). Ces upserts-là passent : `objectifs` a le `UPDATE(user_id)` qui manque à `profiles`.

### Point d'environnement (pas un bug de code) — les routes `/api/*` ne tournent pas en Preview
Le retest était prévu sur le déploiement de preview de la PR : impossible, `/api/invite` y répond `500 {"error":"Not configured"}` (variable d'environnement absente côté Preview — `SUPABASE_SERVICE_ROLE_KEY` et/ou `VITE_SUPABASE_URL` ne sont configurées que pour Production). Conséquence pratique : **aucun flux serveur (signup membre, signup coach, quota IA…) n'est testable en preview aujourd'hui** — toute vérification réelle de ces chemins doit passer par la production. À arbitrer : ajouter ces variables à l'environnement Preview.

### Vérification finale — les 3 correctifs re-testés en réel après déploiement
Le retest était prévu sur la preview de la PR : impossible (voir le point d'environnement ci-dessus, les routes `/api/*` n'y tournent pas). Les 3 fix ont donc été re-testés sur la **production**, après merge de la PR #127, avec de nouveaux comptes de test — pas par relecture du diff.

- **BUG 1** — nouveau signup membre : ligne `profiles` créée avec `prenom='QaMembreDeux'`, `email`, `role='member'` et le bon `gym_id`. Plus aucune erreur `upsert failed` en console (seul reste le log informatif du self-heal, qui réussit maintenant). Puis, sur le même compte, édition depuis Réglages (Poids 72 / Taille 178) → **confirmés en base** : le chemin `updateUserProfile()`, cassé lui aussi, refonctionne.
- **BUG 2** — deux POST `/api/create-gym` concurrents, même token frais : **un seul 200, l'autre 409**, et en base **une seule salle** (`QA RACE GYM B2`, 1 profil rattaché). À comparer au run d'avant fix, encore visible en base au moment du test : `QA RACE GYM 1` (1 profil) **et** `QA RACE GYM 2` (0 profil — l'orpheline). Le perdant supprime bien la salle qu'il venait de créer.
- **BUG 3** — carte Sommeil, saisie `7.5` : affichée `7.5h` et enregistrée `sommeil_h = 7.5` en base (contre `7` avant fix).
- Le bundle servi par la production a été vérifié avant le retest (`index-CXlRhYPi.js`) : helper présent, plus aucun `from("profiles").upsert` — service worker déréférencé au préalable pour ne pas tester un ancien build en cache.

### Nettoyage des données de test — vérifié à 0
5 comptes de test (`volta.qa.*@gmail.com`), 4 salles de test (`QA %`), et toutes leurs lignes associées supprimés : `profiles` (5), `activite_jour` (2), `objectifs` (1), `api_rate_limit` (10), `gyms` (4), `auth.users` (5). Contrôle après coup : **0** compte de test, **0** salle de test, **0** ligne orpheline (`profiles`/`activite_jour`/`objectifs` sans utilisateur), **0** fichier de test dans Storage. La base est revenue exactement à son état d'avant session : 1 salle (VOLTA FITNESS), 4 profils, 5 comptes `auth.users` (dont `spicymymy@gmail.com`, sans profil — anomalie **pré-existante** signalée plus haut, laissée intacte à ce moment-là ; réparée depuis, voir l'entrée du 2026-08-16 plus haut).

### Reste à faire
- **Phase 2 (suite)** — les flux non couverts cette session : Nutrition, Bilan, Workout, Settings, messagerie temps réel, espace coach.
- **Phase 3** — qualité de code (mock data résiduelle, code mort, cohérence des messages d'erreur FR).
- ~~Réparer à la main le profil manquant de `spicymymy@gmail.com` (BUG 1).~~ **Fait le 2026-08-16** — voir l'entrée « Réparation manuelle d'un compte réel (Myriam) » plus haut.
- Décider pour les variables d'env en Preview (ci-dessus).
- Toujours en attente décision produit : protection des mots de passe compromis (advisor WARN, Phase 1).

## 🚨 2026-08-16 — Audit sécurité (Phase 1) : 2 failles corrigées, dont une escalade de privilèges introduite la veille

Audit complet demandé avant reprise du restyle coach. Phase 1 (sécurité base de données) traitée ; Phases 2 (tests fonctionnels navigateur) et 3 (qualité de code) **pas encore commencées** (interrompues à la demande de l'utilisateur). Contexte de départ : le GRANT manquant découvert la veille (photo de profil) invitait à chercher d'autres trous du même type invisibles sans test réel.

### 🔴 FAILLE 1 (critique, introduite la veille par moi) — escalade de privilèges sur `profiles`
Le correctif de la veille (`grant update on public.profiles to authenticated`, table-wide) était **le mauvais fix** : il a effacé l'allowlist de colonnes que la migration `20260717095610` (`fix_profiles_table_wide_update_grant`) avait délibérément mise en place — et dont le commentaire mettait **explicitement en garde** contre ce réflexe exact (« a future broad 'grant all on all tables' ... can't silently reopen this »). `role` est resté protégé par le trigger `prevent_self_role_escalation` (défense en profondeur), mais `gym_id` et `is_platform_admin` ne dépendaient QUE de l'allowlist → un membre authentifié pouvait se **self-promouvoir `is_platform_admin=true`**.
- **Confirmé par test réel** (pas juste lecture de code) : script Node avec un vrai compte membre → `is_platform_admin=true` RÉUSSI avant fix.
- **Root cause du 403 de la veille** : la nouvelle colonne `avatar_url` n'avait jamais été ajoutée à l'allowlist. Le bon fix d'alors était `grant update (avatar_url)`, pas le grant table-wide.
- **Correctif** (migration `reclose_profiles_update_grant_hole`) : allowlist restaurée = `(prenom, email, poids, taille, age, objectif, avatar_url)` ; + défense en profondeur — trigger étendu pour bloquer aussi les self-changes authenticated de `gym_id` et `is_platform_admin` (symétrique avec `prevent_self_privilege_insert` sur le chemin INSERT ; tous les changements légitimes passent par service_role qui contourne le trigger). Vérifié : aucun chemin authenticated légitime ne touche ces colonnes (seule policy UPDATE = « Users can update own profile » ; `gym_id` posé uniquement par `api/create-gym.js`/`api/invite.js` en service_role ; `is_platform_admin` par SQL manuel).
- **Re-test réel après fix** : is_platform_admin/gym_id/role → tous BLOQUÉS (permission denied) ; poids/avatar_url/objectif → tous RÉUSSIS.
- **Vérifié aussi** : aucun compte réel n'avait exploité la faille — seul `is_platform_admin=true` légitime = le compte d'Arnaud (goodghost696@gmail.com, créé le 2026-07-09), laissé intact.
- Schéma de référence (`scripts/supabase_schema.sql`) mis à jour pour refléter la nouvelle allowlist + le trigger étendu.

### 🔴 FAILLE 2 (critique) — fuite de données cross-tenant via la vue `leaderboard_weekly`
Trouvée par `get_advisors` (niveau ERROR : « Security Definer View »). La vue était `security_invoker=false` (SECURITY DEFINER → contourne les RLS gym-scoped) **et sans filtre de salle** (`WHERE p.role='member'` seul, sans `gym_id`). `SELECT` accordé à `authenticated` → n'importe quel utilisateur connecté pouvait interroger `/rest/v1/leaderboard_weekly` et récupérer le **prénom + le nombre de séances hebdo de TOUS les membres de TOUTES les salles**. Dormant dans l'UI (le classement est commenté dans `Weekly.jsx` depuis le 2026-08-13) mais **bien vivant au niveau de l'API REST** — et `fetchWeeklyLeaderboard` est même encore appelée à chaque montage du Bilan.
- **Dérive de schéma confirmée** : le schéma de référence (`scripts/supabase_schema.sql`, lignes 1124-1137) contient POURTANT le filtre `and p.gym_id = my_gym_id()` avec un commentaire « Filtre gym_id ajouté le 2026-08-10 » — mais la vue **en base live avait perdu ce filtre** (probablement recréée à un moment sans lui, ou filtre jamais réellement appliqué). Le doc et la base avaient divergé.
- **Correctif** (migration `scope_leaderboard_weekly_to_own_gym`) : vue recréée avec `and p.gym_id = my_gym_id()`, re-synchronisant la base sur le schéma documenté. SECURITY DEFINER conservé **à dessein** (un membre ne peut pas voir ses co-membres via ses propres RLS — choix de confidentialité), mais le corps s'auto-restreint désormais à la salle de l'appelant, donc le privilège du definer ne peut plus fuiter au-delà. (L'advisor continuera de signaler la propriété security-definer — c'est un compromis assumé et sûr ici, la vue étant auto-restreinte.)
- **Vérifié par test réel** : 2ᵉ salle de test + membre dédié → ce membre ne voit QUE sa propre salle dans la vue (lui-même), zéro membre de la vraie salle VOLTA (qui a 2 membres). Avant le fix, il les aurait tous vus.

### État exact de la Phase 1 (points 1 à 4)
1. **GRANTs par table vs usage réel** — ✅ FAIT. Balayé les 16 tables + colonnes. Deux anomalies traitées : (a) `profiles` UPDATE table-wide → FAILLE 1 ci-dessus, corrigée ; (b) fausse alerte sur `messages` — `markConversationRead` fait un UPDATE `read_at` qui *fonctionne* : `messages` a bien un GRANT UPDATE **au niveau colonne** (`read_at` seul), invisible dans une requête `role_table_grants` (qui ne montre que le niveau table) — vérifié en `column_privileges`, RAS. C'est même le bon pattern que `profiles` aurait dû suivre. Les autres tables : GRANTs cohérents avec l'usage.
2. **Policies RLS table par table** — ✅ FAIT (relues toutes). Aucune policy trop permissive trouvée au niveau RLS ; le trou de `profiles` était sous les RLS (couche GRANT), celui du leaderboard était une vue SECURITY DEFINER (contourne RLS). Le reste est cohérent (self-scoping par `auth.uid()`, coach scoping par `is_coach()`+`my_gym_id()`).
3. **`get_advisors`** — ✅ FAIT. 1 ERROR (leaderboard → FAILLE 2, corrigée). 8 WARN : 7× « SECURITY DEFINER function executable by authenticated » (`is_coach`/`is_platform_admin`/`my_gym_id`/`member_has_programme`/`consume_ai_quota`/`record_ai_tokens`) — **jugés bénins et laissés tels quels** : les 4 helpers ne renvoient que le statut de l'appelant lui-même (filtre `auth.uid()`), les appeler en RPC n'apprend rien de neuf ; `consume_ai_quota`/`record_ai_tokens` n'incrémentent que le compteur de la propre salle de l'appelant (au pire auto-abus mineur de son propre quota), et c'est leur usage voulu (proxy `api/claude.js`). Y toucher risquerait de casser le flux IA. + 1× « Leaked Password Protection Disabled » — **en attente décision produit** (toggle dashboard Supabase, active la vérif HaveIBeenPwned à l'inscription ; peut rejeter des mots de passe → choix UX, pas un bug de code, non activé sans validation).
4. **Grep secrets dans le bundle** — ✅ FAIT. Aucun secret exposé côté client : `service_role`/clé Anthropic/Stripe absents du bundle compilé ; `SUPABASE_SERVICE_ROLE_KEY` uniquement server-side (`api/*`, sans préfixe `VITE_`, donc jamais inliné par Vite) ; la seule mention de `service_role` dans `src/` est un commentaire explicatif (`CoachSignup.jsx`). **Un footgun de doc corrigé au passage** : `README.md` recommandait de mettre `VITE_ANTHROPIC_API_KEY` dans `.env` — si suivi, Vite aurait inliné la clé Anthropic dans le bundle. Réécrit pour clarifier que la clé est exclusivement server-side (`ANTHROPIC_API_KEY`, proxy `api/claude.js`) ; comptes de démo obsolètes retirés au passage.

### Reste à faire (non commencé)
- **Phase 2** — tests fonctionnels réels navigateur (9 flux : signup membre/coach, Dashboard, Nutrition, Bilan, Workout, Settings, messagerie temps réel, espace coach). Inclut la vérif de la race condition TOCTOU sur `/api/create-gym` (à re-tester).
- **Phase 3** — qualité de code (mock data résiduelle, code mort/imports/fichiers orphelins, cohérence des messages d'erreur FR).
- **En attente décision produit** : activer ou non la protection mots de passe compromis (advisor WARN).

### Nettoyage données de test
Tous les comptes/salles/fichiers de test de cette phase supprimés et **vérifiés à 0** (auth.users, profiles, gyms, seances) : 2 comptes de test privesc, 1 compte + 1 salle « LEAK TEST GYM » + 1 séance pour le test du leaderboard. Aucun résidu. Le compte platform-admin légitime (Arnaud) laissé intact.

## 🚨 2026-08-15 — Incident base de données : UPDATE sur `profiles` bloqué depuis le début (GRANT manquant, pas un bug RLS)

Découvert en testant en conditions réelles l'upload d'avatar (voir l'entrée juste en dessous, photo de profil). **Sans lien avec la fonctionnalité avatar elle-même** — un incident de configuration de la base, distinct, documenté séparément parce que son impact dépasse largement l'avatar.

### Symptôme
Upload Storage réussi (200), mais l'écriture de `avatar_url` dans `profiles` échouait avec **403 "permission denied for table profiles"** (code Postgres `42501`).

### Root cause — pas une policy RLS
La policy RLS `"Users can update own profile"` (`auth.uid() = user_id`) était correcte et déjà en place. Le vrai problème : le rôle `authenticated` avait DELETE/INSERT/SELECT/TRIGGER/TRUNCATE sur `public.profiles`, **mais jamais UPDATE**, au niveau GRANT Postgres — une couche *en dessous* de RLS. RLS ne fait que *restreindre* un accès déjà accordé par GRANT ; sans UPDATE au niveau table, Postgres refuse la requête avant même d'évaluer la moindre policy.

### Impact réel — bien plus large que l'avatar
Tout code faisant un `upsert()` sur une ligne `profiles` **déjà existante** échouait silencieusement en base depuis le début, jamais remarqué parce qu'aucun de ces flux (`updateUserProfile` dans AuthContext.jsx, utilisé par : Settings.jsx pour nom/email/poids/taille, Weekly.jsx pour l'objectif/calories/protéines depuis le déménagement du 2026-08-15, Onboarding.jsx) ne vérifiait la réponse Supabase pour un cas d'erreur aussi basique — un upsert avec conflit était censé transparent, mais **son chemin UPDATE n'a probablement jamais fonctionné pour aucun compte réel**. Seul le tout premier enregistrement d'une nouvelle ligne (chemin INSERT, jamais concerné) a pu passer.

### Correctif
```sql
grant update on public.profiles to authenticated;
```
Appliqué manuellement par l'utilisateur (ma tentative via Supabase MCP a été bloquée par le classificateur de permissions Claude Code — GRANT est une modification de schéma, hors du périmètre normalement autorisé sans confirmation explicite).

### Vérifié par un vrai retest, pas seulement par relecture du GRANT
Nouveau compte de test, upload d'une vraie photo (avatar_url confirmé en base) **et** modification du champ Poids depuis Settings.jsx (poids confirmé en base, `"72"`) — les deux passent maintenant, confirmant que le correctif couvre bien l'ensemble des updates `profiles`, pas seulement l'avatar. Compte de test, ligne `profiles`, et fichier Storage nettoyés après coup (0 résidu vérifié).

### Reste à faire
Aucun test automatisé sur ce repo (dette connue, CLAUDE.md) — rien n'aurait détecté ce genre de trou de configuration avant un test manuel réel. Aucune action de suivi précise identifiée au-delà de ce constat ; à garder en tête si d'autres tables affichent un jour un comportement d'écriture "silencieusement sans effet" similaire — vérifier les GRANTs de rôle avant de soupçonner RLS.

## 2026-08-15 — Photo de profil uploadable (remplace le cercle-initiale)

Demande : remplacer l'avatar "cercle + initiale" par une vraie photo de profil, partout où il apparaît.

### Investigation préalable
Un seul endroit affichait l'avatar du membre connecté : `.db-avatar-btn` sur Dashboard.jsx (`(user?.name || 'A').charAt(0)`). Settings.jsx n'avait aucun avatar (devient le point d'entrée d'upload). CoachDashboard.jsx/ClientsList.jsx/MemberDetail.jsx — vérifiés, aucun cercle-initiale nulle part côté coach. Messages.jsx et Conversation.jsx affichent bien une initiale dans un cercle, mais celle d'une **autre** personne (le coach vu par le membre, ou le membre vu par le coach) — hors scope de "l'avatar actuel" (celui du compte connecté), non touchés.

### Infrastructure Supabase (via Supabase MCP)
- Bucket Storage `avatars` : public en lecture, 2 Mo max, types image seulement (JPEG/PNG/WebP).
- Colonne `profiles.avatar_url` (text, nullable).
- Policies `storage.objects` scopées au bucket : lecture publique ; écriture (INSERT/UPDATE) restreinte à `(storage.foldername(name))[1] = auth.uid()::text` — chemin attendu `"{user_id}/avatar.jpg"`, un seul avatar par utilisateur, toujours écrasé (upsert).
- **Sécurité vérifiée par un vrai test contre le projet réel** (pas juste relu) : deux comptes fraîchement créés, script Node avec `@supabase/supabase-js` — upload dans son propre dossier → OK ; tentative d'écrasement du dossier de l'autre compte → rejeté (RLS) ; upload sans authentification → rejeté. Comptes de test et fichier nettoyés après coup (policy DELETE temporaire ajoutée puis retirée pour l'occasion, `storage.objects` protège contre le DELETE SQL direct par design).

### Code
- **`src/components/Avatar.jsx`** (nouveau, partagé) : affiche la photo (`<img>`) si `avatarUrl`, sinon repli sur l'initiale — comportement par défaut inchangé. Contenu seul, pas de wrapper : dimensions/couleur de fond restent gérées par l'élément appelant (`.db-avatar-btn`, `.set-avatar-btn`), pour rester réutilisable sans CSS dupliqué par écran. `.avatar-photo` (global.css) : `width/height:100%; object-fit:cover; border-radius:inherit`.
- **`src/utils/avatar.js`** (nouveau) : `uploadAvatar(userId, file)` — redimensionne à 400px max via `resizeImage` (déjà utilisé par Scan.jsx/Nutrition.jsx, pas dupliqué), upload vers Storage (upsert, chemin fixe), retourne l'URL publique avec un paramètre `?t=timestamp` (cache-bust — le chemin fixe serait sinon servi en cache par le navigateur/CDN après un nouvel upload).
- **`AppContext.jsx`** : `appData.avatarUrl` — fetchée dans la même requête `profiles` que `weightKg` (un seul aller-retour), mise à jour immédiatement après upload via `updateData('avatarUrl', ...)` pour que Dashboard.jsx la reflète sans re-fetch.
- **`Dashboard.jsx`** : `.db-avatar-btn` utilise désormais `<Avatar>` ; `overflow:hidden` ajouté (nécessaire pour que la photo soit clippée en cercle, un `border-radius` seul ne rogne pas un enfant en overflow).
- **`Settings.jsx`** : nouveau bloc `.set-avatar-row` en tête de la carte Profil — avatar tappable (ouvre un `<input type="file">` caché) + lien "Changer la photo", état de chargement (spinner superposé) et message d'erreur inline.

### Testé en conditions réelles (upload d'une vraie photo, pas seulement le bundle compilé)
Serveur `vite dev` lancé localement, compte de test créé (email/mdp via `auth.signUp`, ligne `profiles` insérée à la main pour rattacher à la salle réelle), connexion via l'UI, upload d'une vraie image JPEG via le champ fichier réel de Settings.jsx. **Premier essai : échec** — a révélé l'incident GRANT documenté juste au-dessus (sans lien avec le code de cette fonctionnalité). Après correctif du GRANT par l'utilisateur : retest complet, avatar affiché sur Settings **et** Dashboard après navigation, confirmé en base (`avatar_url` correctement enregistré). Compte de test et fichier Storage nettoyés après coup (0 résidu vérifié dans `auth.users`/`storage.objects`).

## 2026-08-15 — Édition de l'objectif déménagée de Settings.jsx vers Weekly.jsx (Bilan)

Demande : l'objectif (perte de poids/prise de masse/nutrition/performance, chips) n'était éditable que depuis Réglages ; centralisé pour n'être éditable que depuis Bilan, Réglages devient un résumé en lecture seule.

### Ce qui a été déplacé
Le composant "goals_section" de Settings.jsx était une unité cohérente autour d'**un seul** `saveGoals()` : chips d'objectif (`GOAL_OPTIONS`/`selectedGoals`/`toggleGoal`) **et** champs calories/protéines (`goals`/recalcul auto au clic sur un chip via `recalcCalorieGoals`), le tout persisté ensemble dans `profiles` (colonnes `goal`, `calories_jour`/`objectifs.calories_jour` via `updateUserProfile`). Scindé la portée (chips seuls vers Weekly, calories/protéines éditables restant dans Settings) aurait fragmenté un flux de sauvegarde atomique en deux — déplacé le bloc **entier** (chips + calories/protéines + bouton "Enregistrer") vers Weekly.jsx, positionné juste après le bloc RÉSUMÉ (nouvelle section "OBJECTIF").

### Détail technique du déplacement
- **Weekly.jsx** : `GOAL_OPTIONS`, `selectedGoals`, `goals`, `goalsSaving`/`goalsSaved`, `recalcCalorieGoals`, `toggleGoal`, `saveGoals` — repris tels quels depuis l'ancien Settings.jsx. Seule différence : `recalcCalorieGoals` a besoin de poids/taille/âge pour la formule (`utils/metabolism.js`) — le poids est déjà disponible en temps réel via `appData.weightKg` (AppContext, fetché une fois pour toute l'app), donc pas re-fetché ; taille/âge n'existaient nulle part sur cet écran, ajouté un petit fetch dédié (`profiles: taille, age`) au montage.
- **weekly-redesign.css** : nouvelles classes `.wk-goal-card`/`.wk-goal-field`/`.wk-goal-save-btn` + `.weekly-redesign .goal-chip` (alternance olive/lavande sur les chips actifs), même gabarit visuel que `.set-field`/`.goal-chip` de settings-redesign.css, réécrit avec les tokens `--wk-*` de cet écran.
- **Settings.jsx** : le bloc devient un résumé en lecture seule — 3 lignes `.set-field` (Objectif / Calories / Protéines) affichant `user?.goal` (AuthContext) et `appData.calorieGoal`/`appData.proteinGoal` (AppContext) directement, plus un texte "Modifiable depuis Bilan." Nouvelle classe `.set-field-value` (même gabarit que `.set-field input`, un `<span>` non éditable). `calculateCalorieGoal` (plus utilisé) retiré des imports ; `BOUNDS`/`clamp` restent utilisés par la sync santé (steps/sommeil), non touchée.

### Propagation vérifiée par lecture du code (pas de test E2E réel possible ici)
`updateUserProfile` (AuthContext.jsx) fait `setUser(prev => ({ ...prev, ...profile, ...updated }))` après la sauvegarde — `user.goal` est donc à jour immédiatement dans le context partagé. `updateData` (AppContext.jsx) fait `setAppData(prev => ({ ...prev, [key]: value }))` — même chose pour `calorieGoal`/`proteinGoal`. Les deux contexts sont montés une seule fois à la racine de l'app ; le résumé de Settings.jsx les lit directement (pas de state local dupliqué), donc un changement fait depuis Bilan apparaît dans Réglages dès son prochain montage, sans plomberie supplémentaire. **Test manuel réel recommandé par la demande (changer l'objectif depuis Bilan, vérifier le reflet dans Settings) non fait dans ce sandbox** — pas de credentials Supabase disponibles ici pour une session authentifiée réelle (même limite que sur les tâches précédentes demandant un test réel). À confirmer au prochain retour utilisateur.

Vérifié dans le bundle compilé (`dist/assets/Settings-*.js`/`Weekly-*.js`) : "Perte de poids"/`.goal-chip` absents de Settings, présents dans Weekly ; `.set-field-value`/"Modifiable depuis Bilan" présents dans Settings.

## 2026-08-15 — Correction : les 2 sheets du Dashboard n'avaient en fait pas le bug z-index (fausse piste de la tâche précédente)

Demande initiale : corriger `.activity-edit-sheet`/`.sheet-overlay` (Dashboard.jsx), citées dans l'entrée juste en dessous comme "touchées par le même bug" que Settings.jsx. En investiguant pour appliquer le correctif, **ce n'était pas le cas** — écarté après vérification, pas de changement fonctionnel appliqué.

### Root cause de la fausse alerte
L'entrée précédente (tâche 3, z-index générique) avait été écrite en lisant seulement les valeurs `z-index` du CSS compilé (`.activity-edit-sheet { z-index: 201 }`, `.sheet-overlay { z-index: 200 }`, tous deux dans `dashboard.css`), sans vérifier l'imbrication réelle dans le JSX de `Dashboard.jsx`. Or contrairement à Settings.jsx (où la sheet santé et `DeleteAccountButton` sont bien rendues **à l'intérieur** de `.settings-screen`), Dashboard.jsx rend `.sheet-overlay`/`.activity-edit-sheet` en **sibling** de `.dashboard-screen` — les deux sont des enfants directs de `.dashboard-redesign` (le wrapper), pas l'une dans l'autre :
```
.app-wrapper.dashboard-redesign
  ├─ .screen.dashboard-screen         (contenu normal)
  └─ {editingCard && <>...sheet...</>} (sibling, pas descendant)
```
Le bug corrigé sur Settings vient du fait qu'un ancêtre avec `position:relative; z-index:1` **explicite** crée un contexte d'empilement local qui piège ses **descendants** — un sibling n'est jamais concerné, peu importe ses propres valeurs de z-index.

### Vérifié par un vrai test, pas seulement par relecture du CSS
Cette fois vérifié avec un test réel dans Chrome (deux pages HTML minimales reproduisant exactement la structure DOM + CSS des deux écrans, servies en local, `elementFromPoint()` sur la zone de recouvrement entre la sheet et la nav) :
- **Reproduction Settings** (sheet imbriquée dans `.xxx-screen { z-index:1 }`) : confirme le bug — `elementFromPoint` sur la zone de recouvrement renvoie `.bottom-nav`, la sheet est bien cachée. Valide que le fix de la tâche précédente était nécessaire et correct.
- **Reproduction Dashboard** (sheet en sibling de `.dashboard-screen`, structure actuelle) : `elementFromPoint` renvoie `.activity-edit-sheet` — la sheet s'affiche déjà correctement au-dessus de la nav, **avant toute modification de cette session**.

### Ce qui a changé dans le code
Rien de fonctionnel. Deux commentaires corrigés dans `dashboard.css` (le premier, ajouté par erreur dans la tâche précédente, affirmait à tort que ces deux éléments étaient piégés par `.dashboard-screen` ; un second ajouté sur `.activity-edit-sheet` documente cette investigation pour éviter qu'un futur passage ne reparte de la même fausse piste). `npm run build` relancé pour confirmer que ce changement de commentaires ne casse rien.

### Leçon
Une affirmation sur un bug de stacking CSS basée uniquement sur la lecture des valeurs `z-index` (sans vérifier l'imbrication réelle des éléments dans le DOM/JSX) n'est qu'une hypothèse, pas une conclusion — à vérifier par un test réel (ici possible malgré le sandbox : reproduction HTML minimale + `elementFromPoint`, pas besoin de faire tourner l'app complète avec authentification) avant de l'écrire comme un fait dans le journal.

## 2026-08-15 — 4 fixes du rapport d'investigation (Bilan délai, Settings Poids/Taille, z-index nav, toggle Apparence)

4 commits distincts, `npm run build` après chaque tâche, comme demandé. Suite directe de l'investigation du 2026-08-14 (voir entrée juste en dessous) — les 4 sujets remontés en test réel y sont maintenant traités.

**Tâche 1 — Loading state sur Bilan (Weekly.jsx).** Nouvel état `loading` (couvre `fetchWeeklyStats` + `fetchLiftProgress`, groupés en `Promise.all` — pas le leaderboard, déjà masqué côté produit et sur son propre flag). Skeleton pulsant (`CalorieBarsSkeleton`/`SummaryListSkeleton`/`LiftsSkeleton`, nouvelle classe `.wk-skeleton-block` dans `weekly-redesign.css`) reprenant la forme exacte des cartes réelles plutôt que le spinner générique de route — les libellés statiques restent affichés normalement pendant le chargement. `utils/liftProgress.js` : `limit(60)` → `20` (l'écran n'affiche que 4 courbes) ; corrigé au passage un bug de tri trouvé en touchant cette requête : `order('date', {ascending:true}).limit(N)` récupérait les N séances les plus **anciennes**, pas les plus récentes — inoffensif sous 60 séances au total, silencieusement faux au-delà pour un membre actif de longue date (la section "Mes charges" aurait montré une progression figée dans le passé). Passé en `ascending:false` + `.reverse()`.

**Tâche 2 — Race condition Poids/Taille (Settings.jsx).** Le fetch initial de `profiles.poids/taille` écrasait inconditionnellement `weight`/`height` (et `name`/`email`/`age`) dès que la valeur serveur n'était pas nulle, sans vérifier si le membre avait déjà tapé une nouvelle valeur entre le montage et la résolution du fetch. Corrigé avec un flag "touched" par champ (`Set` en `ref`, pas un state) : `updateProfileField()` marque le champ touché dès la première frappe, le fetch ne peuple plus que les champs encore vierges. Appliqué aux 5 champs peuplés par ce fetch, pas seulement poids/taille — même risque de course sur les autres.

**Tâche 3 — z-index générique (sheets cachées derrière la nav).** Root cause du bug "Synchroniser mes données" caché par la nav (commit `4c4d15b`, signalé dans l'investigation) : `.xxx-screen { position:relative; z-index:1 }` crée un nouveau contexte d'empilement local — toute sheet fixed imbriquée dedans (`zIndex:200/201`) n'est alors comparée à `.bottom-nav` (`z-index:100`, sibling hors de ce contexte) qu'en tant que bloc entier, largement battu. Retiré sur les 7 écrans nommés (dashboard/nutrition/weekly/workoutsession/workout/workoutlibrary/settings-screen) ; `position: relative` conservé (n'établit pas de contexte d'empilement seul, sans z-index). Aucune raison positive retrouvée pour ce z-index dans aucun des 7 fichiers. Corrige au passage 2 sheets pas encore signalées, touchées par le même bug : `.activity-edit-sheet`/`.sheet-overlay` du Dashboard — en plus du cas explicitement demandé (sheet santé + `DeleteAccountButton.jsx`, tous deux dans `.settings-screen`).

**Tâche 4 — Retrait du toggle Apparence (Settings.jsx).** Le restyle "pastel chaud" est une palette fixe sans variante sombre — le toggle Mode sombre/clair n'avait plus rien de cohérent à faire varier. Retiré uniquement le contrôle UI (section, import `useTheme`, destructuring `theme`/`toggleTheme`) ; `ThemeContext.jsx` et la logique `data-theme` non touchées, comme demandé.

Les 4 tâches vérifiées dans le bundle compilé (`dist/assets/*`). Test manuel réel recommandé par la demande sur les tâches 2 et 3 — pas possible dans ce sandbox, à confirmer au prochain retour utilisateur.

### Note en marge, pas corrigée (hors scope de cette passe)
`messages-redesign.css` a le même `.messages-screen { position:relative; z-index:1 }` que les 7 écrans corrigés en tâche 3, mais n'était pas dans la liste explicitement demandée — laissé tel quel. Si une sheet fixed est un jour ajoutée dans `.messages-screen` (aucune actuellement), elle serait sujette au même piège.

## 2026-08-14 — Citation du jour fixe et attribuée (remplace le défilement qui se chevauchait)

`RotatingQuote` (Dashboard.jsx) faisait défiler 5 phrases sans auteur en dur (`QUOTES`), avec un `setInterval` de 3s + fade opacity — rapporté comme se chevauchant visuellement pendant la transition entre deux citations. Remplacé par une citation du jour **fixe**, avec un vrai auteur attribué (Sun Tzu, Muhammad Ali, Bruce Lee, Kobe Bryant, Confucius, Sénèque, etc.).

- **`src/data/quotes.json`** (nouveau) : 52 citations effort/discipline/sport/mental, chacune `{ text, author }`. Données locales statiques, aucune dépendance à une API externe — même choix déjà fait pour le catalogue d'exercices (`exercisesLibrary.json`) : fiabilité pour l'acheteur après la vente, pas de service tiers à maintenir. Écarté volontairement Lance Armstrong (contexte dopage, mauvais choix pour une app de coaching) et quelques citations trop faiblement rattachées au thème (chanteuse d'opéra, etc.) trouvées en composant la première version du fichier (89 entrées au départ, retaillé à 52 pour rester dans la fourchette 40-60 demandée).
- **Sélection déterministe** : `dayOfYear(new Date()) % quotes.length` (`Dashboard.jsx`) — index basé sur le jour de l'année, pas de `Math.random`. Même citation toute la journée quel que soit le nombre d'ouvertures de l'app, change automatiquement le lendemain.
- **`QuoteOfTheDay` remplace `RotatingQuote`** : plus de `setInterval`/`setTimeout`, plus de state `index`/`visible`, plus de transition d'opacité — toute la logique de défilement supprimée, pas juste masquée. `dashboard.css` : nouvelle classe `.db-quote-author` (citation + `— Auteur`), règle `transition: opacity` retirée de `.db-quote-text` (devenue inutile sans fade).

Vérifié dans le bundle compilé (`dist/assets/Dashboard-*.js`) : 52 occurrences `author:` présentes, ancien texte `"Reste constant."` absent, fonction `dayOfYear` (`864e5` = 86400000 minifié) et `QuoteOfTheDay` présentes.

### Reste à valider
- Aucune vérification visuelle possible dans ce sandbox — à confirmer au prochain retour : lisibilité de `.db-quote-author` (taille 11.5px, `--db-text-muted`) sous la citation, et qu'aucune citation ne déborde sur deux lignes de façon disgracieuse sur petit écran (les plus longues font ~180 caractères).

## 2026-08-14 — 5 corrections visuelles (nommage Street Workout, nav active, seam AI Coach, nav opaque AI Coach/Messages, présence lavande)

5 commits distincts, `npm run build` + grep du bundle compilé après chaque sujet, comme demandé.

**1. Renommage "Exercices Dehors" → "Exercices Street Workout".** `LanguageContext.jsx` (clé `outdoor_exercises`, FR/EN/ES pour rester cohérent entre les 3 langues — pas seulement la version française demandée) et `WorkoutLibrary.jsx` (`SECTION_NAMES.dehors`, titre affiché de la page de section). Clés de données internes (`dehors`, `LOCAL_EXERCISES.dehors`, etc.) non touchées — uniquement l'affichage, comme demandé. Vérifié dans le bundle compilé (`Y={maison:"Maison",salle:"Salle",dehors:"Street Workout"}` dans `WorkoutLibrary-*.js`, `outdoor_exercises:"Exercices Street Workout"` dans `index-*.js`).

**2. Nav bar — fin du "carré + lueur rouge" sur l'onglet actif.** Root cause dans `nav.css` : `.nav-btn.active svg` posait un double `drop-shadow` corail (`#FF6F59`) derrière l'icône pleine (Phosphor `weight="fill"`) — le filtre diffusait assez pour donner l'impression d'un bloc plutôt qu'un simple halo, sur **tous** les écrans (le filtre n'était défini qu'une fois, dans la règle de base, jamais surchargé par les 7 fichiers `*-redesign.css` à fond de nav opaque qui ne touchaient que `color`). Remplacé par un simple changement de couleur (lavande `#A3AEFE`), sans filtre ni nouvelle forme géométrique — même mécanisme `.nav-btn.active svg` qu'avant. Vérifié : `FF6F59` absent du CSS compilé, `A3AEFE` présent.

**3. AI Coach — seam de la zone statut/heure, même pattern que Dashboard/WorkoutSession.** `.aicoach-redesign::before` (couverture du notch) peignait `--aic-bg` (#EFE7D9, fond du wrapper), mais tout le contenu réellement visible juste en dessous (`.aic-header`, `.aic-messages`) est peint en `--aic-screen-bg` (#F7F1E6, crème) — deux tons différents, d'où la tranche visible. `--aic-bg` n'est en fait visible nulle part sur cet écran (header + liste de messages le recouvrent entièrement). Corrigé en alignant `::before` sur `--aic-screen-bg`, la couleur réellement adjacente. Vérifié dans le CSS compilé.

**4. Nav bar toujours transparente sur AI Coach et Messages.** Ces deux écrans n'existaient pas encore au moment de la généralisation du fond opaque (commit `efeb0ad`, limité aux 7 écrans membre déjà restylés à ce moment-là) — `MemberLayout.jsx` monte pourtant bien `<BottomNav />` sur `/ai-coach` et `/messages` comme sur les autres routes membre (confirmé en lisant le composant), donc la pill y restait avec le glass translucide d'origine. Étendu le même bloc exact (sélecteur sibling `.xxx-redesign ~ .bottom-nav`, fond `#1C1A17`, couleurs en dur) à `aicoach-redesign.css` et `messages-redesign.css`. Vérifié dans le CSS compilé (`.aicoach-redesign~.bottom-nav{background:#1c1a17...}` et équivalent Messages).

**5. Légère augmentation de la présence de la lavande.** Retouche ciblée, pas de rééquilibrage global : l'icône active de la nav, sur les 9 écrans membre à fond de pill opaque (les 7 déjà restylés + AI Coach/Messages du point 4), passe de la crème neutre (`#F7F1E6`) à la lavande (`#A3AEFE`) — cohérent avec le point 2 (l'ancien glow corail remplacé par cette même lavande sur les écrans sans fond opaque, typiquement côté coach). Seule cette couleur est touchée dans chacun des 9 fichiers, rien d'autre rééquilibré. Vérifié dans le CSS compilé : les 9 écrans affichent `color:#a3aefe` sur `.nav-btn.active svg`, plus aucun `#f7f1e6` résiduel à cet endroit.

### Reste à valider
- Aucune vérification visuelle possible dans ce sandbox (comme d'habitude) — capture d'écran utile en priorité sur : le nouveau nom "Street Workout" (Workout.jsx + WorkoutLibrary.jsx), l'onglet actif lavande sur la nav (contraste sur fond de pill glass clair côté coach notamment — jamais testé à l'œil), et le raccord de couleur en haut d'AI Coach.
- **Note en marge, pas corrigée** (hors scope de cette passe) : `messages-redesign.css` a exactement le même mismatch `::before` (`--msg-bg` #EFE7D9) vs contenu visible (`--msg-screen-bg` #F7F1E6, `.messages-screen`) que le bug corrigé au point 3 pour AI Coach — probablement le même seam visuel en haut de l'écran Messages, jamais signalé donc pas touché ici. À vérifier/corriger dans une passe dédiée si confirmé en test réel.

## 2026-08-14 — Investigation (sans fix) : 4 sujets remontés en test réel

Session d'investigation pure, aucune modification de code — quatre bugs/comportements rapportés en test réel après le lot de restyles, à corriger dans une passe dédiée.

**1. Bilan (Weekly.jsx) — délai avant affichage des données.** Écarté : les 3 fetchs (`fetchWeeklyStats`, `fetchLiftProgress`, `fetchWeeklyLeaderboard`) sont déjà lancés en parallèle, pas séquentiels — le lazy-loading de route a aussi déjà son spinner. Cause réelle : aucun état `loading` local dans `Weekly.jsx` — les states initiaux (tableaux vides, zéros) affichent un écran "vide mais complet" avant résolution des requêtes, puis tout saute d'un coup à l'arrivée des données. `fetchLiftProgress` (`src/utils/liftProgress.js`) est probablement la requête la plus lourde des trois (`seances`, jusqu'à 60 lignes avec leur colonne JSON `exercices`).

**2. Settings — Poids/Taille "sautent".** Race condition confirmée dans `Settings.jsx` (lignes 92, 113-129) : le fetch initial de `profiles.poids/taille` peuple `profile` via un `.then()` qui écrase inconditionnellement `weight`/`height` dès que `data.poids != null`, sans vérifier si l'utilisateur a déjà tapé une nouvelle valeur entre le montage et la résolution du fetch. Un membre qui édite le champ avant que le fetch initial revienne voit sa saisie écrasée par l'ancienne valeur serveur. Repart aussi de `''` à chaque montage de l'écran (pas de cache), donc "vide → rempli" à chaque visite. Note annexe : `AppContext.jsx` (lignes 236-244) fait un fetch séparé de la même colonne `profiles.poids` vers `appData.weightKg`, état indépendant — pas la cause directe mais deux sources de vérité à garder en tête.

**3. Settings — toggle Apparence "vire".** Le toggle lui-même fonctionne (`ThemeContext.jsx` bascule `data-theme` et persiste correctement). Deux causes combinées : (a) préexistant — le thème nommé `"dark"` dans `global.css` a en réalité la même palette corail que le défaut (jamais renommé après le pivot vers le corail), seul `"light"` a une palette distincte ; (b) nouveau, introduit par le restyle — `settings-redesign.css` peint l'écran en dur (indépendant de `data-theme`), mais `DeleteAccountButton.jsx` (explicitement laissé hors scope du restyle Settings) et la sheet de synchro santé utilisent encore `var(--danger)`/`var(--surface-solid)`/`var(--glass-border)`, qui eux réagissent au toggle — décalage visuel partiel et incohérent au moment du toggle.

**4. "Synchroniser mes données" — bouton caché par la nav.** Cause confirmée, introduite par mon propre restyle de Settings (commit `4c4d15b`) : `.settings-screen` (`settings-redesign.css`, même pattern que les 10 autres écrans restylés) a `position:relative; z-index:1`, ce qui crée un nouveau contexte d'empilement. La sheet santé (`Settings.jsx`, `position:fixed; zIndex:200`) est rendue **à l'intérieur** de `.settings-screen`, donc son z-index n'est comparé qu'en interne à ce contexte — face à `.bottom-nav` (`z-index:100`, sibling de `.settings-screen` au niveau de `.member-layout`), c'est `.settings-screen` dans son ensemble qui compte pour `z-index:1`, largement battu par la nav. Portée probablement plus large : même piège structurel sur tout écran restylé ayant une sheet fixe imbriquée dans son `.xxx-screen` (`z-index:1`) — visible ici parce que la sheet santé est courte, donc son dernier bouton tombe physiquement près du bas de l'écran. La sheet de confirmation de `DeleteAccountButton.jsx` (aussi rendue dans `.settings-screen`) est exposée au même risque.

Rapport complet donné en conversation, avec pistes de fix par sujet (non implémentées, à traiter dans une passe dédiée).

## 2026-08-14 — Restyle "pastel chaud" des 4 derniers écrans sans handoff dédié : Splash/Intro, Landing, Messages, AI Coach

Contrairement aux 8 écrans précédents (Dashboard à Settings), **aucun package de handoff design fourni** pour ces 4-là — tokens/typo/rayons déduits par lecture des 10 fichiers `*-redesign.css` déjà en place, mêmes valeurs hex exactes réutilisées, aucune nouvelle teinte inventée. Structure JSX lue intégralement avant tout style, aucun contenu ni logique changés. Les 4 sont commités séparément.

**Aucun des 4 n'a une structure trop ambiguë pour être stylé sans référence visuelle** — tous ont une structure claire et deviennent des applications directes du système déjà établi. Le seul point qui mériterait une vraie confirmation visuelle (voir plus bas) est un choix éditorial, pas un flou de structure.

### SplashIntro.jsx (animation d'intro) — commit `7086999`
Nouveau `splash-redesign.css`, scopé sur `.splash-overlay`. Fond corail dégradé → crème, mark et wordmark → encre. Pas de min-height nécessaire : `position:fixed; inset:0` couvre déjà tout le viewport indépendamment du contenu, donc pas de risque de seam structurel ici. Police du wordmark "VOLTA" **non touchée** (reste Unbounded, le wordmark de marque de `brand.css`/`Logo.jsx`, jamais retouché par aucune passe précédente) — seule sa couleur bascule.

### Landing.jsx (page d'accès membre/coach) — commit `8aab0d8`
Nouveau `landing-redesign.css`, scopé `.landing-redesign`. **Point à valider en priorité** : le fond coral dégradé de cet écran était un choix délibéré et documenté deux fois dans le code (`landing.css`), avec `data-theme="dark"` forcé exprès pour y rester indépendamment du thème de l'app — c'était l'identité visuelle "première impression" de VOLTA avant ce lot de restyles. Basculé en crème ici pour rester cohérent avec les 10 écrans déjà pastel chaud (l'app connectée dans son ensemble), mais **sans maquette pour confirmer que ce choix est le bon** — c'est un changement d'identité plus visible qu'un simple restyle d'écran interne, puisque c'est la toute première chose vue par un prospect. Même fix body-bg que les écrans précédents pour le notch/rubber-band.

### Messages.jsx (liste des conversations) — commit `b9a4085`
Nouveau `messages-redesign.css`, scopé `.messages-redesign`. Écran simple (en-tête + une carte de conversation coach). Même système à deux fonds, min-height sur wrapper + écran dès le départ. `Conversation.jsx` (ouvert au tap sur la carte, `/messages/coach`) explicitement laissé de côté — écran distinct, non nommé dans la demande.

### AICoach.jsx (chat avec le coach IA) — commit `7f4cf0f`
Nouveau `aicoach-redesign.css`, scopé `.aicoach-redesign`. Layout particulier : hauteur forcée à `100vh`/`100dvh` avec `overflow:hidden` (pas de scroll `.screen` standard, seule la liste de messages scrolle en absolute) — pas de risque de seam par contenu court ici, mais le `::before` de couverture du notch reste appliqué par prudence (zone de padding-top de `#root`, au-dessus du wrapper, inchangée par ce height forcé). Contrairement aux écrans précédents, la plupart des couleurs étaient posées en inline dans le JSX (pas de classe existante à redéfinir) — retirées et remplacées par des classes dédiées plutôt que surchargées en `!important`, pour rester cohérent avec la méthode des 10 écrans précédents. `VoiceMode.jsx` (overlay micro) explicitement laissé de côté — composant séparé, non nommé dans la demande.

**Commun aux 4** : `min-height` garanti dès le départ sur le conteneur principal (ou raisonnement explicite documenté quand structurellement pas nécessaire — Splash, AI Coach), `.bottom-nav` non touchée (sujet traité séparément), aucune modification de `global.css`. Build vérifié après **chaque** écran (`npm run build`), grep du bundle compilé confirmant le scope exact à chaque fois. Rendu réel vérifié via `vite preview` + capture d'écran pour AI Coach (le plus complexe des 4) — fichier temporaire supprimé après coup, jamais committé.

## 2026-08-14 — Cohérence nav pill : fond opaque généralisé à tous les écrans restylés (était Dashboard seul)

Rapporté : la nav pill (`.bottom-nav`) n'avait pas le même rendu entre le Dashboard et les autres écrans déjà restylés (Nutrition, Weekly, WorkoutSession, Workout, WorkoutLibrary, Settings). Investigation confirmée par grep sur les 7 fichiers `*-redesign.css` : le fix "fond opaque sombre" (`background: #1C1A17`, `backdrop-filter: none`, icônes recolorées) posé sur Dashboard.jsx le 14/08 (commit `75ce568`, suite au rapport "cartes pastel visibles à travers la pill translucide") n'avait **jamais été répliqué** sur les 6 autres — chacun contenait bien un commentaire "`.bottom-nav` non touchée" (respect de la consigne de scope de l'époque, "sujet séparé"), mais aucun n'avait hérité du fix une fois que le sujet a effectivement été traité sur Dashboard. Pas une régression : simplement un fix scopé à un seul écran jamais généralisé aux suivants.

**Généralisé aux 6 fichiers** (`nutrition-redesign.css`, `weekly-redesign.css`, `workoutsession-redesign.css`, `workout-redesign.css`, `workoutlibrary-redesign.css`, `settings-redesign.css`) : même sélecteur sibling scopé au wrapper de chaque écran (`.XXX-redesign ~ .bottom-nav`), mêmes valeurs exactes que Dashboard (`#1C1A17` opaque, `backdrop-filter: none`, icônes `rgba(247,241,230,0.55)`/`#F7F1E6` actif) — même raison qu'à l'origine : les custom properties de chaque wrapper n'atteignent pas `.bottom-nav` (sibling, pas descendant), donc valeurs en dur comme sur Dashboard.

**Cas particulier WorkoutLibrary/Settings** : leurs maquettes respectives ne montrent pas de nav flottante (cadre isolé sans pill dans les deux README), mais `MemberLayout.jsx` monte `.bottom-nav` sur ces routes dans la vraie app quand même (vérifié précédemment, non modifié ici) — le fix a donc été appliqué là aussi pour la cohérence de rendu, comme demandé explicitement.

**Écrans non concernés, comme demandé** : Landing, Splash/intro, Messages, AI Coach — pas encore restylés, gardent le fond translucide (`--nav-glass`) d'origine tant qu'ils n'ont pas eux-mêmes leur propre restyle. Rien touché dans `nav.css`/`global.css`.

Build vérifié (`npm run build`), grep des 6 bundles compilés confirmant chacun exactement 1 occurrence de la règle. Vérification visuelle réelle : page de comparaison temporaire (Dashboard / Nutrition / Settings côte à côte, chargeant les vraies feuilles de style compilées, supprimée après coup) + capture d'écran (Claude in Chrome) — les 3 pills rendent maintenant identiques (fond noir opaque, pilule active olive).

## 2026-08-14 — Restyle en lot (5 packages de handoff) : WorkoutLibrary.jsx + Settings.jsx traités, 3 doublons identifiés et écartés

Lot de 5 dossiers de handoff local fournis d'un coup (`Downloads/Redesign interface VOLTA (3)` à `(7)`), avec consigne explicite de lire chaque README avant de commencer plutôt que de supposer l'ordre. Résultat de cette lecture : **seuls 2 des 5 packages correspondaient à des écrans neufs** de la liste demandée (Bibliothèque d'exercices, Réglages) — les 3 autres (`(3)` Dashboard, `(4)` Nutrition, `(5)` Bilan/Weekly) sont des **doublons exacts** d'écrans déjà entièrement restylés lors des passes précédentes (mêmes tokens, mêmes mesures, aucune révision ni contenu nouveau constaté à la lecture complète des 3 README). Ni écartés à la légère ni retraités à l'aveugle : lus intégralement, confirmés identiques, puis délibérément laissés de côté plutôt que de repasser sur un travail déjà fait. Par ailleurs, **aucun des 5 packages ne correspondait à CoachDashboard.jsx, ClientsList.jsx ou MemberDetail.jsx** (écrans coach demandés) — rien à implémenter pour ces trois-là dans ce lot, faute de handoff correspondant.

**Écrans réellement traités, dans cet ordre :**

### WorkoutLibrary.jsx (bibliothèque d'exercices) — commit `b3f744c`
Nouveau fichier `src/styles/workoutlibrary-redesign.css`, scopé `.workoutlibrary-redesign`, mêmes tokens communs que WorkoutSession/Workout (le README y renvoie explicitement). `min-height` posé dès le départ sur le wrapper ET l'écran (leçon du bug de seam de la veille, appliquée directement plutôt que redécouverte). En-tête, recherche en pilule, groupes musculaires, lignes d'exercice (carte blanche → encre pleine + texte crème pendant l'état "Ajouté" transitoire), toast, mention wger. **`ExerciseModal.jsx`/`.css` explicitement laissés de côté** — le README lui-même le signale ("à restyler séparément") et ces classes sont partagées avec `CoachPrograms.jsx` (écran coach non touché dans ce lot). `.bottom-nav` non désactivée sur cette route (hors scope) — le padding-bas de `.screen` (clearance pill, `global.css`) est resté inchangé plutôt que réduit à la valeur de la maquette qui suppose son absence.

### Settings.jsx (Réglages membre) — commit `4c4d15b`
Nouveau fichier `src/styles/settings-redesign.css`, scopé `.settings-redesign`, mêmes tokens communs. `min-height` sur wrapper + écran dès le départ. Beaucoup de classes utilisées ici sont **globales et partagées avec de nombreux écrans non touchés dans ce lot** (`.card`, `.btn-ghost`, `.goal-chip`/`.goal-selector`, `.lang-btn`/`.lang-selector` — utilisées aussi par `CoachSettings`/`CoachDashboard`/`ClientsList`/`CoachPrograms`/`MemberDetail`/`Hydration.jsx`, vérifié par grep avant de toucher quoi que ce soit) : jamais retouchées directement, seulement overridées scopées. Cartes "champ + valeur" (Profil/Objectifs), boutons "Enregistrer..." en pilule contour encre (nouvelle classe `set-outline-btn`) **distincts** de "Revoir le didacticiel" en pilule pleine blanche (`set-solid-btn`) — les deux partageaient `.btn-ghost` avant et étaient donc rendus identiques à tort, alors que la maquette les traite différemment. Chips d'objectif alternant olive/lavande quand sélectionnées, toggles recolorés, sélecteur de langue, bouton Déconnexion sorti de son style inline vers une classe dédiée (`set-logout-btn`).

**Hors scope explicite, à noter pour une passe future** : `DeleteAccountButton.jsx` est un composant **partagé** avec `CoachSettings.jsx`, écrit en style inline sans classe — impossible à cibler par CSS scopé sans risquer l'écran coach non touché ici. Laissé tel quel ; ne correspond donc pas au "lien discret" (11,5px, sans carte) que la maquette prévoit pour "Supprimer mon compte" — écart connu, pas un oubli. La sheet de synchro santé (Settings.jsx) n'a pas de spec dédiée dans son README ("interactions inchangées") — laissée sur son habillage global existant plutôt que devinée.

Build vérifié après **chaque** écran (`npm run build`, pas seulement à la fin), grep du CSS compilé confirmant les classes scopées, rendu réel via `vite preview` + capture d'écran (Claude in Chrome) pour les deux — fichiers temporaires supprimés après coup, jamais committés. `.bottom-nav` non touchée sur les deux écrans.

## 2026-08-14 — Restyle VOLTA "pastel chaud" (Workout.jsx, hub Entraînement) — 5e écran, handoff design dédié

Cinquième écran du restyle (après Dashboard.jsx, Nutrition.jsx, Weekly.jsx, WorkoutSession.jsx). Source : package de handoff dédié lu en local, hors repo (`Downloads/Redesign interface VOLTA (2)/design_handoff_workout_hub/`), même famille que le handoff WorkoutSession — rien copié dans le repo.

**Même système à deux fonds que WorkoutSession**, confirmé par ce README aussi (`--wh-bg` #EFE7D9 zone de sécurité iOS / `--wh-screen-bg` #F7F1E6 fond réel de l'écran) — suivi à la lettre. **Leçon du bug de seam corrigé la veille sur WorkoutSession** (le `min-height` n'avait été mis que sur le wrapper, pas sur l'écran lui-même qui porte le fond distinct) appliquée dès le départ ici : `min-height` posé à la fois sur `.workout-redesign` (wrapper) et `.workout-screen` (fond `--wh-screen-bg`), pas seulement sur le wrapper comme la 1ʳᵉ fois sur WorkoutSession.

**Approche** : nouveau fichier `src/styles/workout-redesign.css`, scopé à `.workout-redesign`. Le README demande de garder les classes existantes — certaines sont **globales et partagées avec d'autres écrans** (`.card`, `.card-hero`, `.card-animated`, `.section-label`, `.progress-bar`/`.progress-fill`, `global.css`) : jamais retouchées directement, seulement overridées scopées ici (ex. `.workout-redesign .card.card-hero` reprend la même technique de spécificité combinée que `global.css` lui-même utilise pour gagner sur `.card` seul). Les classes déjà exclusives à cet écran (`.active-session-*`, `.workout-cta-row`, `.today-session-btn`, `.generate-program-btn`, `.ai-program-*`, `.history-*`, `Workout.css`) sont redéfinies directement, scopées pour ne pas dépendre de l'ordre d'import. `.bottom-nav` non touchée.

**Changements visuels** (logique/données intactes) : header restructuré (eyebrow+titre empilés à gauche, date à droite, comme la maquette — était eyebrow+date sur une ligne puis titre séparé en dessous), carte "Séances cette semaine" recolorée en olive (encre sur olive au lieu des tokens dorés hérités, invisibles sur fond olive), bandeau "Séance en cours" (blanc + bordure encre au lieu du fond doré translucide), 2 CTA recolorés (encre/lavande) **et texte changé** — la maquette documente explicitement l'abandon de l'uppercase/letterspacing large au profit d'une phrase capitalisée sur deux lignes ("Ma séance / du jour", "✦ Programme / IA" au lieu de "MA SÉANCE DU JOUR"/"✦ PROGRAMME IA"), cartes bibliothèque (icônes en cercles pleins olive/lavande/rose au lieu de fonds translucides dorés en carré arrondi, stroke recoloré en encre), cartes "Dernières séances" **restructurées** (durée + nombre de séries remontés en haut à droite, alignés avec date/type — étaient auparavant sur une ligne séparée sous les badges), premier badge de chaque carte d'historique avec un accent cyclique olive/lavande/rose (même logique que le cycle de couleur des badges-lettre de Nutrition.jsx / du remplissage des courbes de Weekly.jsx), carte de programme IA généré et section "Mes programmes" (non représentées dans la maquette, stylées dans le même vocabulaire comme demandé par le README).

Build vérifié (`npm run build`), grep du CSS compilé confirmant les classes/variables `wh-*` scopées à `.workout-redesign` uniquement. Vérification visuelle réelle via `vite preview` (fichier temporaire, supprimé après coup) + capture d'écran (Claude in Chrome), conforme à la maquette.

## 2026-08-14 — WorkoutSession.jsx : seam visible sur l'état vide + bouton "+ Ajouter des exercices" cassé

Suite directe à l'entrée juste en dessous (restyle WorkoutSession). Deux sujets distincts rapportés sur le même écran.

**Tâche 1 — seam visible (bug visuel)** : root cause identique à la classe de bug déjà vue sur Dashboard.jsx (42acb2a/2edcaf6) mais à un niveau différent. `.workoutsession-redesign` (le wrapper) avait déjà son `min-height` ; mais c'est `.workoutsession-screen` (l'enfant, qui porte le fond `--ws-screen-bg` #F7F1E6 — distinct du `--ws-bg` #EFE7D9 du wrapper, la nuance à deux fonds documentée par le handoff de cet écran) qui n'en avait pas. Sur un contenu court (état vide), `.workoutsession-screen` ne s'étirait que sur la hauteur de son contenu, laissant apparaître le fond du wrapper en dessous — un seam net à l'endroit où l'un s'arrête et l'autre commence. Fix : même `min-height: calc(var(--app-height, 100dvh) - env(safe-area-inset-top))` appliqué directement sur `.workoutsession-screen`.

**Tâche 2 — "+ Ajouter des exercices" renvoyait au hub (bug fonctionnel)** : handler trouvé ligne du bouton dans l'état vide de `WorkoutSession.jsx` — `onClick={() => navigate('/workout')}`, vers le hub (3 cartes Maison/Salle/Dehors), qui n'ajoute rien à la séance active. Comparé avec `ExerciseModal.jsx` ("+ AJOUTER À LA SÉANCE") : son `onAdd(exercise)` remonte jusqu'à `WorkoutLibrary.jsx` (`addExercise` → `addExerciseToSession` (`AppContext.jsx`) → `navigate('/workout/session')` après 800ms) — ce chemin fonctionne déjà correctement, quel que soit le point d'entrée, `addExerciseToSession` crée/peuple `activeSession` sans dépendre d'un état préexistant. Le vrai problème n'était donc que la route du bouton lui-même : `/workout` (hub, 3 cartes à re-taper) au lieu d'une entrée directe dans `WorkoutLibrary.jsx`. Il n'existe pas de route "bibliothèque générique" (toujours `section=maison|salle|dehors`, voir `App.jsx`) — **"Maison" choisie comme défaut** (zéro équipement, le moins de friction) plutôt que de renvoyer à un choix. Un seul changement : `navigate('/workout/maison')`.

**Vérification (test manuel réel, pas juste visuel)** : harnais de test temporaire monté hors repo pendant la vérification (`.env` avec des identifiants Supabase factices mais valides syntaxiquement, `test-workout-flow.html` + `src/__testWorkoutFlow.jsx`, tous supprimés après coup, jamais committés) — monte les **vrais** `AppProvider`/`AuthProvider`/`WorkoutSession`/`WorkoutLibrary`/`ExerciseModal` via `MemoryRouter`, sans dépendre du réseau réel (`addExerciseToSession` est un `setState` local pur ; les effets qui dépendent de `user` s'arrêtent silencieusement sans session, pattern déjà partout dans `AppContext.jsx`). Parcours réellement exécuté et capturé par screenshot (Claude in Chrome) : état vide → clic "+ Ajouter des exercices" → atterrit sur `WorkoutLibrary` (Maison, regroupé par muscle) → clic "Push-up" → `ExerciseModal` → "+ AJOUTER À LA SÉANCE" → retour automatique sur `/workout/session`, **"1 EXERCICE" affiché, Push-up bien présent dans la séance active avec un `startTime` réel** — preuve que l'exercice atterrit vraiment dans la séance, pas juste que la navigation s'ouvre.

Build vérifié (`npm run build`, une fois les fichiers de test supprimés).

## 2026-08-14 — Restyle VOLTA "pastel chaud" (WorkoutSession.jsx, saisie de séance) — 4e écran, handoff design dédié

Quatrième écran du restyle (après Dashboard.jsx, Nutrition.jsx, Weekly.jsx). Source différente des 3 précédents : pas d'import via `DesignSync`/`VOLTA Redesign.dc.html`, mais un **package de handoff dédié fourni en local, hors repo** (`Downloads/Redesign interface VOLTA (1)/design_handoff_workout_session/`) — un `README.md` détaillé (tokens, mesures px, mapping exact vers les classes CSS existantes) + une maquette HTML autonome (`WorkoutSession.reference.html`) + un screenshot. Rien de ce dossier n'a été copié dans le repo (demandé explicitement).

**Nuance de palette notée par ce README, absente des 3 passes précédentes** : il documente deux fonds distincts — "Fond d'app (page)" `#EFE7D9` et "Fond d'écran" `#F7F1E6` — alors que `dashboard.css`/`nutrition-redesign.css`/`weekly-redesign.css` utilisaient `#EFE7D9` pour les deux rôles à la fois (fond de contenu ET zone de notch/rubber-band). Suivi ici à la lettre (`--ws-bg` pour la zone de sécurité iOS, `--ws-screen-bg` pour le fond réel de l'écran) pour rester fidèle à ce handoff précis. **Pas de retouche rétroactive des 3 écrans précédents** (hors scope de cette passe) — à harmoniser dans une passe dédiée si jugé utile plus tard.

**Approche** : nouveau fichier `src/styles/workoutsession-redesign.css` (importé uniquement par `WorkoutSession.jsx`), scopé à `.workoutsession-redesign`. Différence avec les 3 écrans précédents : le README demandait explicitement de **garder les classes existantes** (`.session-exercise-card`, `.session-set-row`, `.set-input`, `.set-check-btn`, `.set-remove-btn`, `.add-set-btn`, `.finish-session-btn`, `.empty-session*`, déjà exclusives à cet écran — vérifié par grep) plutôt que d'en créer de nouvelles — le nouveau fichier les redéfinit donc directement, scopées à `.workoutsession-redesign` pour ne pas dépendre de l'ordre d'import avec `WorkoutSession.css`. Repris le fix notch/rubber-band déjà rodé. `.bottom-nav` non touchée. `RestTimer.jsx` explicitement laissé pour une passe ultérieure (mentionné dans le README lui-même).

**Changement de layout notable** : le bouton "Terminer la séance" passe en `position: fixed` (demandé explicitement par le README — auparavant en flux normal). Comme cet écran partage la nav pill flottante (`.bottom-nav`, sur toutes les routes membre), un `bottom: 22px` littéral (valeur de la maquette, pensée pour un cadre isolé sans nav en dessous) l'aurait fait chevaucher la pill. Positionné à `bottom: calc(76px + env(safe-area-inset-bottom))` à la place — la même clearance déjà utilisée ailleurs dans l'app pour dégager la pill (`nav.css`, FAB de `Nutrition.jsx`) — et centré comme `.bottom-nav` (`left:50%; transform:translateX(-50%); max-width:440px`) pour rester aligné avec elle sur les largeurs desktop. `padding-bottom` de l'écran augmenté en conséquence pour que la dernière carte d'exercice ne finisse pas cachée derrière les deux éléments fixes empilés.

**Autres changements visuels** (logique/données intactes) : en-tête (bouton retour en cercle blanc, sur-titre magenta, titre encre), en-tête de tableau des séries (grille à 5 colonnes `34px 1fr 1fr 40px 30px`, ajout d'une 5e cellule vide dans le JSX pour aligner avec la colonne "✕" — libellé "Série" → "Sér." comme la maquette), champs reps/kg différenciés validé/non-validé (fond enfoncé sans bordure vs. fond écran avec bordure, police Poppins héritée au lieu de `monospace`), bouton de validation (olive plein si coché, contour discret sinon), **bouton supprimer une série redevenu visible mais atténué (`opacity: 0.4`) quand désactivé, au lieu d'invisible (`opacity: 0`) comme avant** — comportement fonctionnel inchangé (toujours `disabled`), juste sa visibilité qui change, conformément au README.

Build vérifié (`npm run build`), grep du CSS compilé confirmant les classes scopées. Vérification visuelle réelle via `vite preview` (fichier temporaire, supprimé après coup) + capture d'écran (Claude in Chrome) avec une nav pill fictive pour confirmer l'absence de chevauchement — conforme à la maquette.

## 2026-08-14 — Restyle VOLTA "pastel chaud" (Weekly.jsx, écran Bilan) — 3e écran du restyle, import Claude Design

Troisième écran du restyle (après Dashboard.jsx et Nutrition.jsx, voir entrées du 13-14/08) — sur demande explicite ("un écran à la fois"). Le fichier de maquette Claude Design (`VOLTA Redesign.dc.html`, même projet `355a305c-...`) s'est enrichi depuis les deux dernières passes : contient maintenant aussi Workout/WorkoutLibrary/WorkoutSession/Settings sous une section "2a" — seule la section BILAN a été lue et utilisée ici, le reste laissé pour les passes suivantes.

**Même approche que Dashboard/Nutrition** : nouveau fichier `src/styles/weekly-redesign.css` (importé uniquement par `Weekly.jsx`), mêmes valeurs de palette (`--wk-*`) que `dashboard.css`/`nutrition-redesign.css` pour rester un seul système cohérent plutôt que d'en réinventer un par écran, scopé à `.weekly-redesign` sur le wrapper racine — `global.css` et `Weekly.css` (classes `.lifts-section`/`.lift-curve-*` déjà existantes, réutilisées) non modifiés en dehors d'overrides scopés. Repris le fix notch/rubber-band déjà rodé (`min-height` + `::before` + classe `weekly-body-bg` pilotée par `useEffect`). **`.bottom-nav` non touchée**, comme demandé.

**Sections masquées laissées identiques, non réactivées** (vérifié après coup par grep que les 3 lignes-clés — "CLASSEMENT DE LA SALLE", "MA PROGRESSION", "progress-photo-slot" — existent encore, toujours dans leur bloc JS commenté) : classement de la salle (commenté le 13/08, décision produit) et photos de progression (commenté le 13/08, bloc non branché à des données) — aucun style ajouté pour elles.

**Changements visuels** (logique/données intactes) : header (eyebrow magenta BILAN, titre "Récap de la semaine.", sous-titre "Semaine du X au Y" — nouveau, calculé depuis la date du jour en JS pur, aucune dépendance aux données réelles fetchées), graphique "Calories/jour" (carte blanche, valeur numérique ajoutée au-dessus de chaque barre — absente avant, présente dans la maquette — `calBarColor` recoloré en 4 teintes de la palette pastel tout en gardant exactement la même logique de seuils objectif atteint/proche/en dessous, la maquette elle-même n'ayant pas ce code couleur à reprendre littéralement), "Résumé" (4 lignes passées de `.card` générique à des pilules blanches dédiées), "Mes charges" (courbes SVG recolorées : remplissage alternant olive/lavande/rose/jaune-gluc. par exercice au lieu du gold hérité, trait et points en encre, tendance "↑" en magenta — même structure/données `LiftCurve`, juste les couleurs et un `idx` ajouté pour le cycle de teinte).

Build vérifié (`npm run build`), grep du bundle compilé confirmant les classes `wk-*`. Vérification visuelle réelle via `vite preview` (fichier temporaire, supprimé après coup) + capture d'écran (Claude in Chrome), conforme à la maquette.

## 2026-08-14 — Restyle VOLTA "pastel chaud" (Nutrition.jsx) — 2e écran du restyle, import Claude Design

Suite du restyle "pastel chaud" commencé sur Dashboard.jsx (voir entrées du 13/08) — deuxième écran, sur demande explicite ("un écran à la fois, je validerai avant de passer au suivant"). Import direct du projet Claude Design "Redesign interface VOLTA" via l'outil `DesignSync` (`get_project`/`list_files`/`get_file` sur le projectId `355a305c-7320-4a69-82c4-04c7499a7dc2`, fichier `VOLTA Redesign.dc.html`, section Nutrition) plutôt que de deviner — `support.js` (runtime du canvas de design) lu mais pas porté, ce n'est pas de la logique applicative.

**Même approche que Dashboard** : nouveau fichier dédié `src/styles/nutrition-redesign.css` (importé uniquement par `Nutrition.jsx`), toutes les couleurs en custom properties (`--nu-*`) scopées à une classe `.nutrition-redesign` posée sur le wrapper racine — `global.css` non touché, aucun autre écran affecté (vérifié par grep : les classes `nu-*`/`nutrition-redesign` n'existent que dans ces deux fichiers). Repris aussi le fix notch/rubber-band déjà rodé sur Dashboard (`min-height` + `::before` pour le notch, classe `nutrition-body-bg` pilotée par `useEffect` pour le rubber-band iOS) — même cause exacte (fond propre à cet écran vs `#root`/`body` transparents/partagés), pas la peine de le redécouvrir à la prochaine plainte. **`.bottom-nav` délibérément non touchée** dans cette passe, comme demandé — sujet séparé.

**Changements visuels** (logique/données intactes) : header (eyebrow magenta, titre encre), carte hero calories (fond blanc, bloc "Restant" olive, 3 mini-cartes macros crème remplaçant l'ancienne liste verticale), 3 cartes d'action (Décrire un repas/Recette frigo en blanc avec badge icône olive/rose, Idée recette en lavande plein), lien magenta "depuis un lien TikTok", raccourcis Matin/Midi/Soir/Snack traduits en pills plates (même comportement — ouvrent la sheet d'ajout avec ce type pré-sélectionné — mais sans état actif fictif, aucun n'étant réellement "sélectionné" dans les données), liste des repas restylée en cartes blanches avec badges-lettre alternant olive/jaune-gluc./rose (repris du groupement par type déjà existant, logique intacte), bouton "voir tout" et FAB "+" local recolorés en encre/crème. Les 4 sheets (ajout aliment, décrire un repas, recette IA, édition) reçoivent le même fond crème + boutons encre — traitement plus léger sur leurs éléments secondaires (puces var(--surface-2), listes de résultats) laissés tels quels, lisibles sur crème sans casser, plutôt que de réécrire chaque style inline pixel par pixel.

Build vérifié (`npm run build`), grep du CSS compilé confirmant les classes `nu-*`. **Vérification visuelle réelle** (même contournement que Dashboard — `npm run dev` ne peut toujours pas monter l'app connectée ici, Supabase non configuré) : prévisualisation statique temporaire servie par `vite preview`, chargeant les vraies feuilles de style compilées, capturée par screenshot (Claude in Chrome) — rendu conforme à la maquette (carte calories, 3 macros, 3 actions, pills, liste de repas).

## 2026-08-14 — Nav pill Dashboard : override bottom explicite remis (le retrait précédent ne suffisait pas sur test réel)

Suite directe à l'entrée juste en dessous (commit 75ce568) : rapporté sur test réel qu'un espace visible persistait encore entre la pill et le bord bas, alors que ce commit misait sur le défaut global de `nav.css` (`bottom: env(safe-area-inset-bottom)`) plutôt que sur une règle explicite scopée au Dashboard.

Vérification poussée plus loin cette fois : au-delà du `getComputedStyle` simple déjà fait pour le commit précédent, inspection de **toutes** les feuilles de style via le CSSOM (`document.styleSheets`, énumération de toute règle dont le sélecteur contient `bottom-nav`) sur un rendu réel des fichiers compilés — confirme qu'il n'existe que 2 règles au total (`nav.css` et `dashboard.css`), aucune règle cachée ailleurs (`member.css`/`coach.css` n'ont qu'un `max-width` en `@media (min-width: 900px)`, sans rapport avec `bottom`). `bottom: 0px` et `rect.bottom-from-viewport-bottom: 0px` confirmés — la valeur calculée était donc déjà correcte dans cet environnement de test (Chrome desktop, `safe-area-inset-bottom` = 0).

Remis une règle **explicite** scopée au Dashboard (`.dashboard-redesign ~ .bottom-nav { bottom: env(safe-area-inset-bottom); }`, dashboard.css) plutôt que de recompter sur l'héritage du défaut global de `nav.css` — fonctionnellement identique en valeur calculée, mais rend l'intention explicite et non dépendante d'un défaut défini ailleurs. **Limite honnête à signaler** : `env(safe-area-inset-bottom)` résout toujours à `0` sur Chrome desktop (pas de notch/home-indicator à simuler dans cet environnement) — impossible de reproduire ici la valeur réelle d'un device iOS notché (34px typiquement) ; si l'espace visible restant sur le test réel de l'utilisateur dépassait cette valeur de sécurité obligatoire, la cause pourrait aussi être un déploiement Vercel pas encore à jour (le workflow complet fetch/PR/poll Vercel/merge du CLAUDE.md n'a pas été suivi sur cette série de commits — poussés directement sur `claude/charming-mendel-dj1GQ`) plutôt qu'un bug de code restant.

Build vérifié (`npm run build`), grep + inspection CSSOM confirmant la règle exacte dans le bundle compilé.

## 2026-08-14 — Nav pill Dashboard : régression du fix précédent + translucidité, corrigées via debugging systématique

Rapporté sur capture réelle, après les 3 commits précédents (42acb2a, 2edcaf6, 0a70d1b) : (1) la pill était toujours trop haute/trop de marge par rapport à la maquette malgré le commit dédié, et (2) nouveau problème — la pill était devenue translucide, laissant voir les cartes Eau (lavande) et Sommeil (rose) à travers, alors qu'elle doit être opaque noir/charbon d'après la maquette. Investigation menée avec le skill `superpowers:systematic-debugging` (demandé explicitement) plutôt que de tenter un 4ᵉ ajustement à l'aveugle.

**Root cause #1 (position)** — pas un problème de spécificité CSS : vérifié empiriquement par `getComputedStyle` sur un rendu réel des feuilles de style compilées (`vite preview`, pas `vite dev` — nécessaire pour charger les vrais fichiers `dist/assets/*` plutôt que le pipeline source non-buildé) que `bottom: 10px` était bien appliqué, donc le sélecteur sibling `.dashboard-redesign ~ .bottom-nav` fonctionnait comme prévu. Le bug était dans la **valeur** ajoutée par le commit `0a70d1b` : `nav.css` documente que le défaut global est déjà "le vrai minimum... zéro marge, pas même un plancher" (`bottom: env(safe-area-inset-bottom)`, choix délibéré et ancien, non touché par aucun des 3 commits précédents — vérifié par `git diff` sur `nav.css`/`global.css`, vide). Ajouter `+10px` par-dessus ce zéro éloignait la pill du bord au lieu de la rapprocher — impossible d'aller plus près du bord que ce défaut sans franchir le plancher `safe-area-inset-bottom` (interdit). **Fix : suppression pure et simple de l'override `bottom`** — le défaut global de `nav.css` satisfait déjà "quasiment collée au bord, espace minime" ; la respiration visible dans la maquette vient du padding propre de la pill (`10px 12px`), pas d'une marge extérieure.

**Root cause #2 (translucidité)** — pas une régression des 3 commits précédents non plus (même `git diff` vide sur `nav.css`/`global.css`) : `--nav-glass: rgba(255,255,255,0.28)` est une valeur globale préexistante, documentée comme un choix délibéré ("effet frost léger léger"). Ce glass translucide devient gênant seulement maintenant que la grille d'activité du Dashboard a des cartes pastel pleines (Eau lavande, Sommeil rose) juste derrière — un problème d'interaction visuelle entre deux designs corrects individuellement, pas un bug introduit. **Fix : override scopé au Dashboard** (`.dashboard-redesign ~ .bottom-nav { background: #1C1A17; backdrop-filter: none }`, couleur en dur — les custom properties de `.dashboard-redesign` n'atteignent pas `.bottom-nav`, qui est un sibling, pas un descendant, même contrainte que le fix du fond de `<body>` de la veille). **Conséquence directe repérée en vérifiant le rendu** : les icônes de `.nav-btn svg` sont en encre foncée (`var(--text-secondary)`/`var(--text-primary)`, pensées pour rester lisibles sur le glass clair) — sur fond `#1C1A17` elles seraient devenues quasi invisibles. Repassées en crème (`#F7F1E6`, en dur, même raison), même logique que `.dashboard-cta-btn` déjà présent dans ce fichier (fond encre, texte crème). Le glow corail de l'onglet actif (`nav.css`, non touché) reste inchangé.

Build vérifié (`npm run build`), grep du CSS compilé confirmant l'absence de tout override `bottom` et la présence exacte des règles `background`/`backdrop-filter`/icônes. **Vérification empirique complémentaire** (au-delà du grep) : rendu réel via `vite preview` (vraies feuilles de style compilées) avec `getComputedStyle` affiché à l'écran, confirmant `bottom: 0px`, `background: rgb(28,26,23)`, `backdrop-filter: none`, et capture d'écran (Claude in Chrome) montrant la pill collée au bord, opaque, icônes lisibles — les cartes Eau/Sommeil ne sont plus visibles à travers.

## 2026-08-14 — Nav pill flottante rapprochée du bord bas sur le Dashboard restylé

Rapporté sur la maquette de référence (capture fournie, le fichier `VOLTA Redesign.dc.html` du handoff initial n'étant plus retrouvable ni dans le repo ni via `DesignSync` — seul un projet "Design System" vide y est accessible) : la pill de nav est quasiment collée au bord bas, avec un espace minime, alors que le rendu actuel gardait la marge par défaut de `nav.css` (`bottom: env(safe-area-inset-bottom)`, zéro marge additionnelle — un choix délibéré ailleurs dans l'app, cf. commentaire `.bottom-nav` dans `nav.css`, non touché ici).

`.bottom-nav` est un composant partagé (`BottomNav.jsx`, monté par `MemberLayout.jsx` sur tous les écrans membre), donc pas question de changer sa position par défaut globalement. Scopé au restyle via un sélecteur sibling dans `dashboard.css` : `.dashboard-redesign ~ .bottom-nav { bottom: calc(env(safe-area-inset-bottom) + 10px) }` — ne matche que quand `.dashboard-redesign` (le Dashboard) est le screen actuellement monté juste avant la pill dans le DOM (`<Outlet/>` puis `<BottomNav/>`, siblings dans `MemberLayout.jsx`). `env(safe-area-inset-bottom)` reste le plancher impératif dans les deux cas, jamais retiré — seul un petit espace de 10px est ajouté par-dessus, pour ne jamais finir sous la barre de gestes iOS. Valeur de départ suggérée (8-12px), à réajuster visuellement si besoin une fois testée sur device réel.

Build vérifié (`npm run build`), grep du CSS compilé confirmant `.dashboard-redesign~.bottom-nav{bottom:calc(env(safe-area-inset-bottom) + 10px)}` dans `Dashboard-*.css`.

## 2026-08-14 — Fond crème Dashboard : le fix CSS scopé ne couvrait pas le rubber-band iOS (commit 42acb2a insuffisant)

Suite directe à l'entrée du 2026-08-13 juste en dessous : rapporté sur test réel que le fix CSS (`min-height` + `::before` sur `.dashboard-redesign`) ne suffit pas — en tirant la page au-delà de ses limites (rubber-band/overscroll iOS), le fond orange/rouge d'origine reste visible en haut ET en bas. Cause : ce fond appartient à `<body>` (`global.css`, dégradé corail), pas au wrapper interne du Dashboard qui a été repeint ; au rubber-band on dépasse la boîte de `.dashboard-redesign` et on retombe directement sur `<body>`, qu'aucun CSS statique scopé ne peut atteindre puisque `<body>` est un ancêtre du wrapper, pas un descendant.

Corrigé en pilotant `<body>` dynamiquement depuis `Dashboard.jsx` plutôt qu'en CSS statique : un second `useEffect` ajoute `document.body.classList.add('dashboard-body-bg')` au montage et la retire au démontage (`return () => document.body.classList.remove(...)`), pour que les autres écrans (pas encore restylés) retrouvent leur fond corail dès qu'on quitte le Dashboard. La classe elle-même (`dashboard.css`, `body.dashboard-body-bg { background: #EFE7D9 }`) est en dur, pas en `var(--db-bg)` : les custom properties posées sur `.dashboard-redesign` n'atteignent pas `<body>` (ancêtre), donc à resynchroniser manuellement si la couleur change. Le fix CSS scopé de la veille (`min-height`/`::before`) est conservé tel quel — il reste utile pour le rendu normal, ce nouveau fix couvre spécifiquement le cas rubber-band que l'autre ne couvre pas.

Build vérifié (`npm run build`), grep du bundle compilé confirmant `dashboard-body-bg` dans le JS et le CSS. **Test manuel réel effectué en partie, avec une limite honnête à signaler** : `npm run dev` ne peut toujours pas monter l'app connectée dans cet environnement (Supabase non configuré, préexistant). Contournement identique à la veille — prévisualisation statique (`public/_dashboard-preview.html` temporaire, supprimée après coup) servie par `vite preview` chargeant les **vraies** feuilles de style compilées, avec un bouton togglant la classe `dashboard-body-bg` sur `<body>` — confirme par capture d'écran (Claude in Chrome) que le mécanisme fonctionne : classe retirée → corail visible, classe ajoutée → crème uniforme partout, y compris hors de la boîte du wrapper. **Ce que ce test ne prouve pas** : le vrai rubber-band iOS (physique `-webkit-overflow-scrolling: touch` propre à WebKit/Safari) n'est pas reproductible sur Chrome desktop (pas d'écran tactile, pas de simulateur iOS disponible ici) — seule la logique classe/couleur a pu être vérifiée, pas le geste de tirer physiquement la page. **Reste à confirmer sur un vrai device iOS** dès que possible.

## 2026-08-13 — Restyle Dashboard "pastel chaud" : fond crème incomplet en haut/bas (notch + derrière la pill)

Suite au restyle crème du Dashboard (entrée juste en dessous) : le fond au-dessus du contenu (zone statut/notch iOS) et en dessous (derrière la pill de nav flottante) restait au dégradé corail partagé au lieu du crème `--db-bg`. Cause : `#root` (global.css) a un `padding-top: env(safe-area-inset-top)` et un fond transparent, pensé pour laisser passer le dégradé du `body` derrière chaque écran — ça fonctionne tant que l'écran garde ce même dégradé, mais le Dashboard a maintenant son propre fond crème peint uniquement sur `.dashboard-screen`, qui ne couvre ni cette zone de padding (extérieure à sa propre boîte) ni l'espace sous le contenu quand celui-ci est plus court que le viewport (le `.member-layout` qui l'englobe n'a pas de hauteur minimale, donc `#root` laisse un vide transparent en dessous, exactement là où flotte la pill).

Corrigé dans `dashboard.css`, scopé à `.dashboard-redesign` (le wrapper racine) comme le reste du restyle — rien touché dans `global.css`/`#root`/`body`, donc aucun autre écran affecté : `min-height: calc(var(--app-height, 100dvh) - env(safe-area-inset-top))` + `background: var(--db-bg)` sur `.dashboard-redesign` pour garantir que le crème couvre toujours au moins tout le viewport visible, et un `::before` positionné en absolu juste au-dessus du wrapper (`top: calc(-1 * env(safe-area-inset-top))`, même hauteur, même couleur) pour repeindre la zone de notch qui appartient au padding de `#root`.

Build vérifié (`npm run build`), grep du CSS compilé confirmant les 3 occurrences de `safe-area-inset-top` dans `Dashboard-*.css`.

## 2026-08-13 — Restyle VOLTA "pastel chaud" (Dashboard.jsx) — import Claude Design

Import du projet Claude Design "Redesign interface VOLTA" (`VOLTA Redesign.dc.html`, via l'outil `DesignSync`/`/design-login`) — palette Poppins · crème `#EFE7D9` · olive `#EBEB7D` · lavande `#A3AEFE` · rose `#FFBEF0` · encre `#1C1A17` · magenta `#B62472` en micro-touches. **Un écran à la fois, sur demande explicite** : Dashboard.jsx uniquement dans cette passe, à valider avant Nutrition.jsx.

**Approche retenue — scoping par custom properties, pas de retouche des tokens globaux.** `global.css` (`--bg`, `--surface`, `--accent`, etc.) est partagé par tout le reste de l'app ; le modifier aurait changé chaque écran. À la place, toutes les nouvelles couleurs vivent en custom properties (`--db-*`) posées sur une classe `.dashboard-redesign`, exclusive à Dashboard.jsx (ajoutée sur son wrapper racine `.app-wrapper`), et qui n'existe dans aucun autre fichier — même si `dashboard.css` reste chargé en mémoire après avoir quitté l'écran (SPA, pas de reload), le sélecteur ne matche jamais rien ailleurs. `dashboard.css` n'est importé que par `Dashboard.jsx` (vérifié) : toutes ses classes existantes (`.activity-card-*`, `.dashboard-cta-btn`, `.sheet-*`, `.water-bottle-*`...) ont pu être restylées directement en place, sauf `.sheet-drag-zone`/`.modal-handle`, réellement partagées avec `ExerciseModal.jsx` et le sheet "Ajouter un aliment" de `Nutrition.jsx` — laissées intactes.

**Changements** : header (eyebrow magenta, avatar lavande, texte encre — l'écran a maintenant son propre fond crème plutôt que le dégradé corail partagé, peint sur `.dashboard-screen`, `body` non touché), carte streak (olive plate), carte calories (blanche, barres macro lavande/jaune/rose reprenant exactement les couleurs de la maquette), grille activité (Eau seule carte à fond lavande plein, comme dans la maquette), CTA pill encre + badge olive, carte "Séances cette semaine" passée d'une barre continue à des segments (1 par séance-objectif), liste habitudes (mini-cases par jour avec une couleur d'accent alternée olive/lavande par habitude), sheet d'édition restylée en cohérence. Suppression de `.dashboard-ring` (blob décoratif conic-gradient, aria-hidden, ne correspond plus à l'esthétique flat de la maquette) et de classes CSS déjà mortes (`.dash-header`, `.dash-metrics-grid`, etc. — vérifié qu'aucune n'était référencée par le JSX avant suppression). Toutes les données/interactions (édition d'objectifs, bottles d'eau, toggle habitudes, météo, streak) inchangées — uniquement du style. Police Poppins ajoutée au `<link>` Google Fonts partagé d'`index.html` (additif, ne change la police d'aucun autre écran tant que rien d'autre ne référence `font-family: Poppins`).

Build vérifié (`npm run build`), grep du bundle compilé confirmant la présence des nouvelles classes/couleurs, et que `git status` ne montre que les 3 fichiers concernés (`index.html`, `Dashboard.jsx`, `dashboard.css`) — aucun autre écran touché. **Vérification visuelle réelle** : `npm run dev` échoue à monter l'app dans cet environnement (aucune variable d'env Supabase configurée ici, `.env` absent — préexistant, sans rapport avec ce changement), donc impossible de passer par le flux d'auth normal pour voir le vrai Dashboard connecté. Contournement : prévisualisation HTML statique servie par le même serveur Vite (`public/_dashboard-preview.html` temporaire, supprimé après coup), chargeant les **vraies** feuilles de style compilées (`dist/assets/index-*.css` + `Dashboard-*.css`, pas une réécriture), avec un balisage reprenant exactement les classes de `Dashboard.jsx` et les données d'exemple de la maquette — capturé par screenshot (Claude in Chrome), rendu conforme à la maquette. Reste à confirmer sur l'app réelle connectée dès qu'un environnement avec Supabase configuré est disponible.

## 2026-08-13 — "Ajouter un aliment" (Nutrition.jsx) : impossible à fermer, scroll qui perd le champ de recherche

**1 — diagnostic** : ce bottom sheet n'utilise **pas** le même composant de base que la fiche détail d'exercice (`ExerciseModal.jsx`) ou le sheet d'édition d'activité (`Dashboard.jsx`), qui ont déjà `.modal-handle` + le hook `useSwipeToDismiss` fonctionnels. C'est un sheet écrit entièrement à la main dans `Nutrition.jsx`, qui n'a **jamais eu** ce mécanisme (`grep useSwipeToDismiss` ne remontait que Dashboard.jsx et ExerciseModal.jsx avant cette passe) — seul le clic sur l'overlay sombre en arrière-plan fermait la fenêtre, sans aucune affordance visuelle pour le suggérer.

**2 — fermeture ajoutée** :
- Croix (✕) à côté du titre, sur les deux étapes du sheet (recherche ET écran quantité, qui a son propre titre) — `onClick={() => setSheetOpen(false)}`.
- Swipe vers le bas : même hook `useSwipeToDismiss` réutilisé (pas recodé), avec la poignée `.modal-handle`/`.sheet-drag-zone` déjà stylée globalement (définie une fois dans `dashboard.css`, réutilisée telle quelle par `ExerciseModal.css` — même approche ici, aucun CSS nouveau à écrire). Le `transform`/`transition` inline du sheet (translateY piloté par `sheetOpen`, pas une classe CSS comme les deux autres sheets) fusionné à la main avec `foodSheetSwipe.dragY`/`.dragging` plutôt que remplacé, pour ne pas perdre l'animation d'ouverture existante.

**3 — scroll qui "perd" le haut de la liste** : ce sheet reste **monté en permanence** (translaté hors écran via CSS transform, jamais démonté — commentaire déjà présent dans le code, pour préserver l'animation d'ouverture). Sa zone de scroll (`overflowY:auto`) gardait donc son `scrollTop` d'une ouverture à l'autre au lieu d'être recréée à zéro : après avoir scrollé dans les résultats puis rouvert le sheet (ou changé d'étape recherche → quantité), il pouvait rouvrir déjà scrollé, le titre et le champ de recherche hors-champ tant qu'on ne remontait pas à la main — correspond exactement au symptôme signalé. Reset explicite de `scrollTop` à l'ouverture et à chaque changement d'étape (`useEffect` sur `[sheetOpen, step]`), plutôt que de compter sur un remount qui n'arrive jamais.

Build vérifié (`npm run build`), grep du bundle compilé confirmant la présence de `.sheet-drag-zone` et du bouton `aria-label="Fermer"` dans `Nutrition-*.js`. **Test manuel réel recommandé** sur le geste de swipe en particulier (comportement tactile, pas vérifiable par lecture de code) — pas bloquant vu que la croix offre déjà un moyen de fermeture fiable en toutes circonstances.

## 2026-08-13 — Catalogue d'exercices Maison/Salle agrandi via wger.de (suite au rapport d'investigation)

Suite au plan proposé dans le rapport d'investigation du jour (catalogue plafonné à 18/section, limite structurelle du tier gratuit API Ninjas) : implémentation du plan recommandé (fichier JSON statique, source wger).

**Script one-shot** — `scripts/fetch-wger-exercises.js` (jamais exécuté en prod, jamais appelé au runtime de l'app) : interroge `GET /api/v2/exerciseinfo/` de wger.de (API publique, gratuite, sans clé, sans quota — 863 exercices au total, paginé 100/requête) et `/api/v2/muscle/`, `/api/v2/equipment/` pour les tables de référence.
- **Répartition Maison/Salle** : par équipement — aucun équipement/tapis/swiss ball/élastique → Maison ; barre/barre EZ/haltères/barre de traction/banc/banc incliné/kettlebell/poulie → Salle. Dehors non concerné (aucune notion "extérieur" côté wger, comme déjà noté dans le rapport — reste 100% curaté à la main dans `LOCAL_EXERCISES`).
- **Traduction** : privilégie la traduction FR de chaque exercice quand elle existe (présente pour la majorité), repli sur l'EN sinon — même mix FR/EN déjà présent dans `LOCAL_EXERCISES` (ex. "Bench Press", "Deadlift" gardés en anglais).
- **Mapping musculaire** : réutilise les valeurs FR de `MUSCLE_FR` (`useExercises.js`) pour 11 des 15 muscles wger (ids différents, mêmes libellés FR) ; seuls 4 muscles absents de ce mapping (obliques, dentelé antérieur, brachial, soléaire) reçoivent un libellé propre dans le script plutôt que d'étendre `MUSCLE_FR` lui-même (portée volontairement limitée au script).
- **Variété** : sélection round-robin par groupe musculaire principal (pas les N premiers de la liste brute) pour éviter qu'une section se retrouve avec des dizaines de variantes du même mouvement et presque rien sur certains groupes.
- Sortie : `src/data/exercisesLibrary.json` (statique, committé) — **110 exercices Maison + 110 Salle** (220 au total), même forme que `LOCAL_EXERCISES` (`id, name, muscles, type, instructions, equipment`, clé de section = catégorie).

**Intégration (`WorkoutLibrary.jsx`)** — `wgerLibrary[section]` fusionné dans `baseList` entre le local curaté et l'extra API live, même logique de dédup par nom déjà en place (`local` d'abord, puis `wgerExtra` dédupliqué contre `local`, puis `apiExtra` dédupliqué contre les deux). `api/exercises.js`/`useExercises.js` (proxy API Ninjas) non touchés, laissés en l'état — toujours mergés en dernier, désormais rarement nécessaires vu le volume local mais gardés pour la variété/fraîcheur qu'ils apportent encore.

**Attribution légale** — pas de page Mentions légales/À propos dans l'app (vérifié avant d'écrire quoi que ce soit) : mention discrète en pied de la bibliothèque d'exercices elle-même ("Données d'exercices fournies par wger.de (CC-BY-SA 4.0)"), affichée uniquement sur Maison/Salle (Dehors n'a aucune donnée wger).

**Volume final** : 274 exercices au total (54 local + 220 wger) contre 54+API-live avant cette passe — Maison et Salle passent chacune de 18 (+ ce que l'API en direct ajoutait, variable) à 128 exercices garantis, sans dépendance à un quota externe.

Build vérifié (`npm run build`), grep du bundle compilé confirmant : présence d'ids wger (ex. `w_2_handed_kettlebell_swing`) et de la mention d'attribution dans `WorkoutLibrary-*.js`. Chunk `WorkoutLibrary` passé de ~23 Ko à ~122 Ko (gzip ~7,4 Ko → ~35 Ko), cohérent avec le volume ajouté.

## 2026-08-13 — Flux authentification : 3 corrections issues de l'audit du jour

Suite à l'audit ciblé du flux auth (investigation seule, sans fix, plus tôt dans la journée) : 3 corrections directes, causes déjà identifiées donc pas de re-debug.

**Tâche 1 — lien manquant sur l'onglet Inscription (Login.jsx)** — l'onglet Connexion avait déjà un lien contextuel en bas de formulaire ("Pas encore de salle ? Créer la mienne →"), pas son équivalent côté Inscription. Ajouté "Déjà un compte ? Connecte-toi →", même style, qui fait `setTab('login')` — même state que le segmented control déjà en haut de page, pas un mécanisme séparé.

**Tâche 2 — race condition connexion coach (le plus grave des trois, priorité audit)** — `login()` (`AuthContext.jsx`) ne faisait jamais `setUser(u)` lui-même après une connexion réussie, entièrement dépendant du listener `onAuthStateChange` pour peupler `user`. `Login.jsx` naviguait pourtant immédiatement vers `/coach`/`/dashboard` sur la base de son propre `result.role` local dès que `login()` resolvait — course avec le `setUser()` du listener (sa propre requête `resolveRole()` indépendante, timing non garanti), surtout perdue sur les comptes coach (résolution de rôle plus lente, cf. commentaire `resolveRole()` sur les comptes créés à la main en SQL). Quand `navigate()` gagnait la course, `ProtectedRoute` voyait encore `user === null` et rebondissait sur `/login` — flash retour juste après une connexion pourtant réussie. Corrigé en miroir du fix `logout()` déjà en place (2026-08-11, même fichier) : `login()` fait maintenant `setUser(u)` lui-même, synchrone à son retour. `Login.jsx` simplifié : `handleLogin()` ne navigue plus manuellement — la route `/login` (`App.jsx`, déjà réactive à `user`) redirige d'elle-même une fois le contexte peuplé. Le listener refera bien son propre `resolveRole()`/`setUser()` juste après (déclenché par le `SIGNED_IN` de `signInWithPassword`) — redondant mais idempotent, même trade-off déjà accepté côté `logout()` ; le supprimer aurait remis l'app dans l'état "dépend uniquement du listener" qui est la cause racine du bug.

**Tâche 3 — erreurs Supabase brutes affichées (4 endroits)** — `Login.jsx` (`handleLogin`, `handleSignup`, `handleSendReset`) et `ResetPassword.jsx` affichaient tous `result.error` (= `error.message` Supabase brut, anglais/technique) plutôt que le fallback FR prévu, parce que `result.error || fallbackFR` ne retombe jamais sur le fallback (`error.message` n'est jamais vide dès qu'il y a une erreur). Nouvel utilitaire partagé `src/utils/authErrors.js` (`mapAuthError(error)`) : mapping par mot-clé sur `error.message` (pas de code exact — Supabase ne garantit pas de `error.code` stable côté client sur toutes les versions du SDK) vers des messages FR clairs (identifiants incorrects, compte déjà existant, email non confirmé, rate limit, mot de passe trop faible, compte introuvable, erreur réseau), avec un message générique FR par défaut pour tout cas non mappé. Les 4 call-sites remplacés par `mapAuthError({ message: result.error })`.

**Test manuel réel indispensable sur la tâche 2** (connexion avec un compte coach, vérifier l'absence de flash retour vers `/login`) — non fait dans cet environnement (pas d'instance Supabase connectée), **à valider en conditions réelles avant tout déploiement**.

Build vérifié (`npm run build`), grep du bundle compilé confirmant : présence du lien "Déjà un compte" dans `Login-*.js`, présence des règles de `mapAuthError` (ex. "Invalid login credentials", "already registered") dans `authErrors-*.js` (nouveau chunk séparé).

## 2026-08-13 — Classement masqué (Weekly.jsx) + regroupement par groupe musculaire (WorkoutLibrary.jsx)

Deux sujets indépendants dans cette passe.

**Tâche 1 — masquage du classement de la salle** — section "CLASSEMENT DE LA SALLE" (`Weekly.jsx`) commentée entièrement, même traitement que la section photos déjà masquée le même jour (voir entrée juste en dessous) : bloc JSX gardé tel quel dans un commentaire, avec explication en tête. `fetchWeeklyLeaderboard` (`utils/leaderboard.js`), le state `leaderboard`/`leaderboardLoaded` et la vue SQL `leaderboard_weekly` ne sont pas touchés — juste le rendu qui saute. Décision réversible en décommentant le bloc.

**Tâche 2 — regroupement par groupe musculaire (Exercices Maison/Salle/Dehors)** — `WorkoutLibrary.jsx` affichait `filtered` (recherche + fusion local/API) en liste plate. Ajout d'un regroupement par groupe musculaire principal (1ᵉʳ tag de `ex.muscles`, ex. "Pectoraux · Triceps · Épaules" → "Pectoraux" ; repli sur `ex.type` puis "Autre"), même pattern que le regroupement par type de repas sur Nutrition.jsx (section-label + compteur, groupes vides masqués). Ordre des sections donné par la 1ʳᵉ apparition dans `baseList` (pas alphabétique) pour garder les groupes curatés les plus fournis en tête. La recherche (`search`) continue de filtrer sur nom + muscles *avant* le regroupement, donc reste active à travers toutes les sections. Navigation 3 cartes Maison/Salle/Dehors (`Workout.jsx`) non touchée.

Build vérifié (`npm run build`), grep du bundle compilé confirmant : absence de "CLASSEMENT DE LA SALLE" dans `Weekly-*.js` (rendu bien retiré), présence de la logique de split sur "·" dans `WorkoutLibrary-*.js` (regroupement bien inclus).

## 2026-08-13 — Écran de saisie de séance (WorkoutSession.jsx) : suppression d'une série

Il était possible d'ajouter une série ("+ SÉRIE") mais pas d'en retirer une une fois ajoutée. Ajout d'un bouton "×" par ligne de série, même pattern visuel que le bouton de suppression d'un aliment sur l'écran Description libre de Nutrition.jsx (icône `✕` seule, sans fond, `color: var(--text-secondary)`).

- **`AppContext.jsx`** — nouvelle fonction `removeSetFromExercise(exIdx, setIdx)`, même forme que `addSetToExercise`/`updateSet` : filtre la série de `activeSession.exercises[exIdx].sets`. No-op si l'exercice n'a plus qu'une série (garde-fou côté état, en plus du bouton désactivé côté UI — défense en profondeur).
- **`WorkoutSession.jsx`** — bouton `.set-remove-btn` ajouté à chaque `.session-set-row`, `disabled` quand `exercise.sets.length <= 1` pour ne jamais descendre à 0 ligne affichée.
- **`WorkoutSession.css`** — grille des lignes/en-tête passée de 4 à 5 colonnes (`... 32px 24px`) pour loger le nouveau bouton ; `.set-remove-btn:disabled` mis à `opacity: 0` plutôt que masqué (`display: none`) pour ne pas faire sauter la grille sur la dernière série.

Build vérifié (`npm run build`), grep du bundle compilé confirmant la présence de `.set-remove-btn` (CSS) et du label `aria-label="Supprimer cette série"` (JS).

## 2026-08-13 — Écran de saisie de séance (WorkoutSession.jsx) : 4 corrections issues de l'audit du jour

Suite à l'audit ciblé de l'écran de saisie de séance (investigation seule, sans fix, plus tôt dans la journée) : 4 corrections directes, cause déjà identifiée donc pas de re-debug.

**Tâche 1 — bug prioritaire : exercices persistés avec 0 série validée** — `finishSession()` (`WorkoutSession.jsx`) gardait inconditionnellement chaque exercice ajouté à la séance dans `exerciseDetails`, même quand aucune de ses séries n'avait été cochée (`sets: []` après filtrage sur `done`). Cas réel observé : séance du 16/07, Push-up, 0 séries. Ajouté `.filter(ex => ex.sets.length > 0)` après le mapping — un exercice ajouté puis jamais validé n'apparaît plus du tout dans la séance envoyée en base (colonne `seances.exercices`).

**Tâche 2 — chevauchement visuel "SÉRIEREPS"** — le label "Série" de `.session-sets-header` héritait de `grid-template-columns: 24px 1fr 1fr 32px`, la même grille que les lignes de données où cette 1ʳᵉ colonne (24px) n'est dimensionnée que pour un numéro de série ("1", "2"...). Le mot "SÉRIE" (majuscules + letter-spacing) débordait de cette colonne et chevauchait visuellement "REPS" juste à côté. En-tête passé à `grid-template-columns: auto 1fr 1fr 32px`, indépendant des largeurs de saisie.

**Tâche 3 — placeholders déconnectés des suggestions IA** — le flux IA (`addExercisesToSession`, `AppContext.jsx`) calcule déjà `suggested: { reps, kg, rest }` par exercice, mais `WorkoutSession.jsx` affichait toujours les placeholders fixes "12"/"80" sans jamais le lire. Les deux inputs (reps/kg) utilisent maintenant `exercise.suggested.reps`/`.kg` comme placeholder dynamique quand disponible, avec repli sur "12"/"80" pour les exercices ajoutés manuellement (pas de suggestion IA).

**Tâche 4 — feedback ludique sur validation d'une série** — animation CSS `set-check-pop` (scale 1 → 1.25 → 1, 300ms) ajoutée sur `.set-check-btn.checked`, jouée uniquement au moment où la classe `.checked` est ajoutée (donc au passage non-coché → coché, pas au décoché, pas à chaque re-render). Le retour haptique existait déjà (`navigator.vibrate(8)`, même pattern que Dashboard.jsx) et se déclenchait déjà uniquement au passage `false → true` — laissé tel quel.

Build vérifié (`npm run build`), grep du bundle compilé confirmant les 4 changements : `.filter(s.sets.length>0)`, `grid-template-columns:auto 1fr 1fr 32px`, lecture de `t.suggested` pour les placeholders, et présence de l'animation `set-check-pop`/keyframes. **Test manuel réel indispensable sur la tâche 1 en particulier** (valider en conditions réelles qu'une séance avec un exercice non coché n'enregistre plus cet exercice du tout) — non vérifiable par simple lecture de code, pas d'instance Supabase connectée dans cet environnement.

## 2026-08-13 — Bilan (Weekly.jsx) : 3 corrections issues de l'audit du jour

Suite à l'audit ciblé de l'écran Bilan (investigation seule, sans fix, plus tôt dans la journée) : 3 corrections directes, cause déjà identifiée donc pas de re-debug.

**A — bug prioritaire : "KM COURUS"/"PAS" affichaient la valeur du jour, pas de la semaine** — `Weekly.jsx` réutilisait `appData.kmRun`/`appData.steps`, des compteurs journaliers remis à zéro chaque jour (partagés avec le Dashboard, qui les libelle bien "aujourd'hui" lui). Sur l'écran "BILAN SEMAINE", un utilisateur ayant couru en début de semaine mais pas le jour de consultation voyait "0 km". Corrigé : `fetchWeeklyStats()` (`src/utils/weeklyStats.js`) somme désormais `activite_jour.pas` et `activite_jour.km_courus` sur les 7 jours glissants déjà lus pour les calories, et retourne `weeklySteps`/`weeklyKmRun` en plus de `weeklyData`/`sleepData`. `Weekly.jsx` affiche ces totaux hebdo à la place des compteurs du jour.

**B — nettoyage** : `weeklyData[i].steps` et `.workout` étaient calculés (dont une requête `seances` dédiée) mais jamais utilisés dans le rendu — supprimés avec la requête `seances` qui les alimentait. `weeklyStats.js` ne lit plus que `repas` + `activite_jour`.

**D — section "MA PROGRESSION" (photos) masquée** : bloc UI statique jamais branché à une donnée (4 slots vides, "+" sans `onClick`, aucune table/upload derrière). Commentée en bloc dans `Weekly.jsx` (pas supprimée, pas de flag) avec note expliquant pourquoi — décision produit : fonctionnalité repoussée, pas abandonnée.

Build vérifié (`npm run build`), grep du bundle compilé confirmant : `km_courus` présent dans le select `activite_jour`, aucun `from("seances")` dans le code compilé de `weeklyStats.js` (seule occurrence restante dans `liftProgress.js`, fichier non touché), et absence totale de "MA PROGRESSION"/"progress-photo" dans le bundle. **Test manuel réel recommandé après déploiement** : impossible de valider par simple lecture de code que le total hebdo de pas/km correspond bien à une somme sur 7 jours réelle plutôt qu'au jour courant — nécessite des données sur plusieurs jours en base, non disponibles dans cet environnement.

## 2026-08-13 — Correction manuelle du match OFF + bug swipe (boutons visibles au repos)

**Tâche 1 — correction manuelle du produit OFF ("Décrire un repas")** — chaque item détecté affichait "Correspondance OFF : {productName}" sans aucun moyen de le corriger si `lookupOFF()` avait mal matché (ex: "Riz cuit" → "Craquelins de riz cuits au four"). Ajouté un lien discret "Corriger l'aliment" sous chaque item (révèle un champ de recherche au clic, pas de champ toujours visible) qui interroge `/api/food-search` (même proxy que `lookupOFF`/la recherche manuelle), affiche jusqu'à 5 résultats (nom + kcal/100g) et applique le choix : `kcal100/prot100/carb100/fat100/offName` de l'item sont mis à jour, le grammage déjà saisi n'est pas redemandé, et les totaux (par item + total du repas en haut de la fiche) se recalculent automatiquement au rendu suivant puisqu'ils sont dérivés de `describeResult.items` à chaque passage. État de correction réinitialisé à l'ouverture de la sheet et à la suppression d'un item (les index se décalent).

**Tâche 2 — bug swipe : boutons modifier/supprimer visibles sans geste** — cause trouvée : `SwipeableRow.jsx` (utilisé uniquement dans `Nutrition.jsx`, liste "REPAS D'AUJOURD'HUI" — confirmé, aucun autre écran ne l'utilise) applique déjà sa propre marge externe (`marginBottom: 8`) entre les lignes ; la carte `.card` À L'INTÉRIEUR du composant avait **elle aussi** `marginBottom: 8` depuis la dernière session (ajouté par erreur lors du regroupement par type). Cette marge interne, comptée dans le calcul de hauteur automatique du conteneur `overflow:hidden`, rendait la bande d'actions (positionnée en `top:0/bottom:0`) plus haute que la carte elle-même — le surplus (8px de rouge/orange) dépassait visuellement sous la carte au repos, sans rapport avec un swipe. Corrigé en repassant la marge de la carte à `0` (la marge de `SwipeableRow` suffit) + commentaire d'avertissement ajouté dans `SwipeableRow.jsx` pour éviter la régression.

Build vérifié (`npm run build`), grep du bundle compilé confirmant la présence de "Corriger l'aliment"/"Chercher un autre produit". **Test manuel réel non réalisable dans cet environnement** (pas d'instance connectée à Supabase) — en particulier le rendu visuel du swipe corrigé n'a pas pu être vérifié à l'œil ; la correction est bâtie sur une analyse précise du mécanisme CSS en cause (marge doublée + hauteur auto du conteneur), mais un test manuel réel reste recommandé avant de considérer le bug clos.

## 2026-08-13 — Deux bugs de test manuel : soumission en double + erreur API brute affichée

Deux bugs remontés en test réel, corrigés dans cette passe (matching Open Food Facts et swipe des cartes non touchés, traités séparément) :

**Bug 1 — soumission en double sur les boutons "+ AJOUTER"** — aucun des 4 boutons d'ajout de repas (recherche manuelle `addFood`, "Décrire un repas" `addDescribedMeal`, recette IA `addRecipeAsMeal` dans `Nutrition.jsx`, et `handleAddToMeal` dans `Scan.jsx`) ne se désactivait pendant l'insertion — plusieurs clics avant la fin du premier appel réseau créaient autant de repas identiques en base. Ajout d'un état `isAddingMeal` (partagé, un seul flux d'ajout actif à la fois) dans `Nutrition.jsx` et `adding` dans `Scan.jsx` : les fonctions ignorent les appels tant qu'un ajout est en cours, les boutons sont désactivés avec un texte "Ajout..." pendant ce temps.

**Bug 2 — erreur API brute affichée ("Erreur : max_tokens must be between 1 and 1500")** — `generateRecipe` et `generateRecipeFromPhoto` ("Idée recette" / "recette depuis mon frigo", `Nutrition.jsx`) envoyaient `max_tokens: 2200`, au-dessus du plafond serveur (`api/claude.js`, `MAX_TOKENS_CAP = 1500`) — chaque appel échouait donc systématiquement à la validation, avec le message brut de l'API remonté tel quel à l'écran. Ramené à `1500` pour les deux. Ajouté un message générique côté client ("Une erreur est survenue, réessaie.") pour toute erreur technique venant de `/api/claude`, appliqué aux 3 fonctions recette de `Nutrition.jsx` et à `estimateFoodsFromText` (`utils/foodEstimate.js`, flux "Décrire un repas") — le détail réel reste loggé en `console.error` pour le débogage. Les messages déjà curés côté serveur (ex: `api/recipe-from-link.js` — "Lien invalide", "Impossible de lire cette vidéo...") ne sont pas touchés, ils restent utiles tels quels.

Build vérifié (`npm run build`), grep du bundle compilé confirmant l'absence de `2200`, la présence de `1500` (x2), du message générique, et des 3 occurrences de "Ajout..." dans `Nutrition-*.js` + 1 dans `Scan-*.js`.

## 2026-08-13 — Nutrition : regroupement des repas par type + meilleure sélection Open Food Facts

Suite à l'investigation Nutrition (regroupement des repas + précision OFF, fuseau DB confirmé UTC — piste écartée) :

**Regroupement des repas** (`Nutrition.jsx`) — la liste "REPAS D'AUJOURD'HUI" était plate, triée par heure, avec un troncage silencieux à 3 éléments (lien texte discret en bas) et sans jamais afficher le `type_repas` sur les cartes. Remplacé par :
- Sections groupées par type (Petit-déjeuner/Déjeuner/Dîner/Collation, + "Autre" pour tout repas sans `mealType` reconnu — aucun repas exclu silencieusement).
- `mealType` affiché sur chaque carte (`{heure} · {type}`).
- Badge visible "+N repas non affichés — voir tout" à la place de l'ancien lien texte en bas de liste.
- Colonne `type` (orpheline en base, confirmée non lue/écrite par aucun code client) **non touchée** dans cette passe — reste une dette à traiter séparément (suppression de colonne).

**Sélection Open Food Facts** (`utils/foodEstimate.js`, `lookupOFF`) — le lookup automatique (flux "Décrire un repas") prenait le tout premier résultat OFF (`page_size=1`) sans aucune vérification. Passé à `page_size=5` + scoring simple (complétude des 4 macros prioritaire sur la simple proximité du nom, similarité de nom basique en tie-break, pas de NLP). Le nom du produit OFF effectivement retenu est maintenant affiché dans le détail de chaque aliment détecté (`Nutrition.jsx`, à côté du badge "✓ vérifié"), pour repérer un mauvais matching avant de valider le repas. Calcul proportionnel (`calcNutrition`/`computeItemsTotal`) et estimation du grammage par l'IA non touchés — hors scope, déjà jugés corrects/hors sujet respectivement.

Build vérifié (`npm run build`), grep du bundle compilé confirmant la présence des nouvelles chaînes ("repas non affiché", "Correspondance OFF", `page_size=5`). Test manuel en conditions réelles (comptes avec repas de types variés) non réalisable dans cet environnement — pas d'accès à une instance de l'app avec de vraies données Supabase ; vérification faite par relecture de la logique de regroupement/scoring et par le build/bundle.

## 2026-08-13 — Nettoyage suite audit : suppression de Sleep.jsx (écran orphelin) et de la clé heart_rate

Suite au rapport d'audit ci-dessous : `src/screens/Sleep.jsx` (aucune route déclarée, doublon du sommeil déjà affiché dans `Weekly.jsx`) supprimé, avec son import lazy dans `App.jsx` et le stub `src/styles/sleep.css` qu'il laissait derrière lui. Clé de traduction `heart_rate` (FR/EN/ES, `LanguageContext.jsx`) supprimée — reliquat de l'ancien onglet Course, plus consommée nulle part. Commentaire dans `weeklyStats.js` mis à jour (ne mentionne plus Sleep.jsx comme consommateur).

Build vérifié (`npm run build`), grep du bundle compilé confirmant l'absence de `heart_rate` et d'un chunk `Sleep-*`. Aucune autre modification.

## 2026-08-13 — Audit anti-mock avant mise en vente (audit seul, aucun code touché)

**Contexte** : suite à l'incident RunContent.jsx (onglet Course — distance simulée par un minuteur, BPM figé à 142, stats en dur, resté en prod un temps indéterminé avant d'être supprimé), audit complet du repo pour vérifier qu'aucun autre résidu de données fabriquées ne traîne côté production, avant mise en vente du produit à des prospects qui testent activement l'app.

**Méthode** : grep large (`mock`, `dummy`, `fake`, `hardcod*`, `TODO/FIXME.*mock`) sur tout `src/`, croisé avec les routes réellement déclarées dans `App.jsx`, puis lecture ligne à ligne des écrans les plus exposés au risque (Dashboard, Nutrition, Weekly, Workout, CoachDashboard, ClientsList, MemberDetail, Sleep.jsx).

**Résultat : aucun résidu de données fabriquées actif en prod.** Tous les écrans vérifiés lisent des données réelles (Supabase) ou de vrais fallbacks légitimes (valeurs par défaut avant chargement, base d'aliments statique légitime dans `FOOD_DATABASE`, citations d'accroche `QUOTES` — aucune des deux ne se fait passer pour de la donnée utilisateur).

**1 point dormant trouvé** (sans risque en prod, mais à trancher) :
- `src/screens/Sleep.jsx` est importé (lazy) dans `App.jsx` mais **aucune route `/sleep` n'est déclarée** — écran mort, inaccessible depuis l'UI. Son code est propre (fetch réel via `fetchWeeklyStats`, pas de mock), mais fait doublon avec le sommeil déjà affiché dans `Weekly.jsx`. À trancher : déclarer la route ou supprimer le fichier.
- Reliquat mineur associé : la clé de traduction `heart_rate` (FR/EN/ES dans `LanguageContext.jsx`) n'est plus consommée nulle part depuis la suppression de l'ancien onglet Course — à nettoyer si besoin, sans impact fonctionnel.

**Confirmations explicites** — écrans suivants relus et propres (données réelles Supabase, pas de résidu mock) : Dashboard, Nutrition, Weekly (Bilan), Workout (Musculation), CoachDashboard, ClientsList, MemberDetail, `AppContext.jsx`, `coachStats.js`. RunContent.jsx n'existe plus dans le repo (suppression confirmée, aucune trace résiduelle).

Aucun fix appliqué dans cette passe — audit seul, en attente de validation avant toute correction (déclarer/supprimer Sleep.jsx, nettoyer `heart_rate`).

## 2026-08-13 — Décision stratégique : pivot vers build & flip

**Contexte** : jusqu'ici VOLTA était pensé comme SaaS marque blanche récurrent (setup fee +
abonnement mensuel, client cible On Air Fitness Clichy). Décision prise ce jour : abandon du
modèle récurrent au profit d'une stratégie de build & flip — finir le produit, le vendre en
one-shot (avec ou sans MRR), réinvestir ailleurs.

**Raison du changement** : pas de contradiction assumable entre construire une infra scalable
multi-clients et préparer une sortie rapide. Les deux modèles ont des priorités techniques
incompatibles (multi-tenant utile pour l'un, inutile pour l'autre).

**Fourchette de prix visée** : 1 500 – 4 000$ sans traction, 2 000 – 10 000$ si un engagement
écrit (LOI ou pilote gratuit) de Clichy est obtenu avant la mise en vente.

**Nouvel ordre de priorité :**
1. Deadline ferme 3 semaines pour obtenir un engagement écrit de Clichy (LOI ou pilote gratuit,
   même sans argent). Si pas de réponse concrète sous 3 semaines → abandon de ce levier.
2. Audit complet anti-mock-data (grep MOCK_MEMBERS et équivalents, vérifier que chaque écran lit
   des données Supabase réelles). Priorité absolue — un résidu de données fabriquées découvert par
   un acheteur peut faire échouer la vente (cf. incident RunContent).
3. Finir le backlog sprint existant : Dashboard → Nutrition → Bilan → Musculation/Run → Settings.
4. Restyle UI (référence Dribbble Ronas IT — fond crème, pastel, Poppins) : maquettes/validation
   design AVANT toute implémentation, verrouillé une fois pour éviter le pattern d'itérations
   cosmétiques déjà documenté dans ce journal (icône eau, 5 itérations en une heure).
5. Dépôt IDDN via APP (app.legalis.net/tarifs) si le coût reste raisonnable — preuve de
   paternité du code avant vente.
6. Listing sur SideProjectors + Microns.io en simultané (gratuit) dès les points 1-4 terminés.

**Chantiers explicitement abandonnés ou mis en pause pour cette stratégie :**
- Ajout de `gym_id` / architecture multi-tenant — aucune valeur pour un acheteur unique, ne pas
  construire.
- Équipe d'agents IA CrewAI (Manager/Marketing/Veille/UX/Product/Contrarian) — pertinent pour un
  produit exploité sur la durée, pas pour une sortie à court terme. Mis en pause, pas annulé.
- Suite de tests automatisés complète — hors budget-temps pour ce type de vente, les acheteurs à
  cette fourchette ne font quasiment jamais d'audit de code profond.

**Délai réaliste de vente une fois listé** : 1 à 3 mois entre mise en ligne et closing, à intégrer
dans la planification — ne pas repousser le listing en attendant "le bon moment".

---

## 2026-08-12 — Audit post-désactivation "Confirm email" : race condition trouvée, pas corrigée (audit seul, aucun code touché)

**Contexte** : Arnaud a désactivé "Confirm email" dans Supabase Auth (retour au flux session immédiate). Demande explicite : audit seul de `AuthContext.jsx` (`register()`, `resolveRole()`), `Login.jsx`, `CoachSignup.jsx` — aucune modification de code, branche `claude/charming-mendel-dj1GQ` en prod directe donc rien touché sans validation.

**Risque réel trouvé** : le chemin self-heal + replay de `resolveRole()` (ajouté à la session précédente pour gérer le flux "Confirm email" différé) n'est **pas** le "code mort" que ses propres commentaires prétendent tant que le toggle reste désactivé. `onAuthStateChange` (`AuthContext.jsx:148`) déclenche `resolveRole()` en parallèle du code séquentiel de `register()`/`CoachSignup.handleSubmit()`, sans garantie d'ordre — une vraie race, indépendante du toggle. Conséquence :
- **Côté membre** : bénigne — le doublon d'appel `/api/invite` cible le même `gym_id`, le perdant de la course échoue proprement en 409 (`api/invite.js:119-121`), aucune corruption.
- **Côté coach** : grave — deux appels concurrents à `/api/create-gym` peuvent tous deux passer le garde-fou `existingProfile` (TOCTOU, `api/create-gym.js:57-64`, confirmé par `trg_prevent_self_privilege_insert` qui force `role='member', gym_id=null` sur tout insert self-heal, `supabase_schema.sql:288-307`) → **risque réel de double création de salle** (`gyms`), une orpheline, avec possible incohérence entre le code d'invitation affiché à l'écran et `profiles.gym_id` réellement persisté.

Racine du problème : `register()` (`AuthContext.jsx:193`) et `CoachSignup.jsx` (`:46`) stashent désormais `inviteCode`/`gymName` en `user_metadata` **inconditionnellement**, y compris en session immédiate — ce qui rend la branche différée de `resolveRole()` (`:87-116`) atteignable même hors du cas "Confirm email ON" qu'elle était censée cibler exclusivement. Les commentaires "dead code today" (`AuthContext.jsx:83-86,206-208`, `CoachSignup.jsx:58-60`) sont trompeurs et à corriger le jour où ce point est traité.

**Point vérifié et jugé correct** : pas de dépendance résiduelle à un événement de confirmation qui ne se déclencherait jamais — `onAuthStateChange` est un listener générique, tiré par tout `SIGNED_IN` réel (immédiat ou post-confirmation), rien n'attend spécifiquement un événement propre à la confirmation.

**Pas corrigé** — audit seul, sur demande explicite. Correctif à discuter/valider avant d'être codé (probable : ne déclencher le replay `/api/create-gym`/`/api/invite` dans `resolveRole()` que si le self-heal vient réellement de créer la ligne `profiles`, combiné à un verrou/idempotence côté `api/create-gym.js` plus robuste qu'un simple check-then-act).

---

## 2026-08-12 — Décision : achat nom de domaine différé, email transactionnel toujours en sandbox

**Décision** : achat d'un nom de domaine différé — pas encore le bon moment.

**Conséquence directe** : Resend reste en mode sandbox (`resend.dev`), donc l'envoi d'email transactionnel est limité à l'adresse du compte Resend uniquement (aucun email réel vers de vrais membres externes). **Pas de solution SMTP fonctionnelle pour de vrais membres externes tant que ce point n'est pas traité** — pertinent notamment pour "Confirm email" (voir entrée juste en dessous, préparée mais pas activable en pratique tant que ce blocage persiste : le lien de confirmation ne pourrait pas atteindre un vrai membre).

---

## 2026-08-12 — Préparation "Confirm email" Supabase Auth (flux différé signup, toggle pas encore activé)

**Contexte** : `register()` (`AuthContext.jsx`) et `CoachSignup.jsx` supposaient tous les deux qu'une session existe immédiatement après `signUp()` — vrai seulement tant que "Confirm email" reste désactivé dans Supabase Auth. Dès que ce toggle est activé, `data.session` est `null` jusqu'au clic sur le lien de confirmation, et le code actuel plantait silencieusement (upsert profil + `/api/invite`/`/api/create-gym` tentés sans session → bloqués par RLS). Objectif de cette session : gérer proprement les deux cas **sans activer le toggle** — préparation seule, testée par construction (voir "Vérification" ci-dessous).

**`src/context/AuthContext.jsx`** :
- `register()` : `inviteCode` ajouté à `user_metadata` du `signUp()` (en plus de `name`/`role`/`extraMeta`), pour pouvoir le relire plus tard si la session n'existe pas encore. Après `signUp()`, si `data.session` est `null` : ni l'upsert profil ni l'appel `/api/invite` ne sont tentés (échoueraient sous RLS) — retour direct `{ success: true, needsConfirmation: true, user: { email, name } }`. Si `data.session` existe : comportement strictement inchangé.
- `resolveRole()` (mécanisme self-heal existant) : signature étendue à `resolveRole(u, sessionUser)` — les deux call sites (`applySession()`, `login()`) passent maintenant `session.user`/`data.session?.user` en plus de l'objet dérivé. Dans la branche self-heal (profil manquant recréé), lit `sessionUser.user_metadata.gymName`/`.inviteCode`/`.firstName` : si `role === 'coach'` et `gymName` présent → appelle `/api/create-gym` ; sinon si `inviteCode` présent → appelle `/api/invite`, exactement comme `register()` le fait aujourd'hui côté membre. Échecs loggés en `console.error`, jamais bloquants pour la connexion.

**`src/screens/Login.jsx`** — `handleSignup()` : nouvel état `needsConfirmation` (distinct de `signupSuccess`, remis à `false` en début de tentative pour éviter qu'un message obsolète persiste). Si `result.needsConfirmation` : affiche *"Compte créé — vérifie ta boîte mail pour confirmer ton adresse avant de te connecter."*, sans `setSignupSuccess`/redirection `/onboarding`. Chemin `result.success` sans confirmation : inchangé.

**`src/screens/CoachSignup.jsx`** — `handleSubmit()` : `gymName`/`firstName` (trimmés) ajoutés à `user_metadata` du `signUp()`. Résultat de `signUp()` renommé `signUpData` (évite l'ombre sur le state local `data` du formulaire, qui porte le même nom). Si `signUpData.session` est `null` : nouvel état d'écran `step: 'needsConfirmation'` — *"Vérifie ta boîte mail — Compte créé — vérifie ta boîte mail pour confirmer ton adresse. Ta salle sera prête dès ta première connexion."* + bouton "ALLER À LA CONNEXION" (ajouté pour cohérence avec le reste de l'écran, pas explicitement demandé mais aucun autre moyen de sortir de cet état). Si session existe : comportement inchangé (`/api/create-gym` direct, écran `'done'`).

**Code mort par construction tant que le toggle reste désactivé** : chaque nouveau chemin est gardé par `if (!data.session)` / `if (!signUpData.session)` — avec "Confirm email" OFF, `data.session` existe toujours en sortie de `signUp()`, donc aucune de ces branches ne s'exécute aujourd'hui. Rien dans le comportement actuel n'a changé (vérifié ligne par ligne dans les diffs, pas seulement supposé).

**`api/create-gym.js` et `api/invite.js` non touchés** — fonctionnent déjà correctement une fois appelés avec une session valide, exactement le cas que `resolveRole()` reproduit dans son nouveau chemin différé.

**Vérification** : `npm run build` relancé après chaque fichier modifié (4 builds : `AuthContext.jsx`, `Login.jsx`, `CoachSignup.jsx`) — tous passés sans erreur.

**Reste à faire (hors scope de cette session, volontairement)** : activer réellement le toggle "Confirm email" dans le dashboard Supabase Auth, puis tester en conditions réelles (signup membre + signup coach, vérifier que le clic sur le lien de confirmation déclenche bien le chemin self-heal de `resolveRole()` et crée effectivement le profil/la salle). Pas fait ici — cette session ne fait que préparer le code pour que l'activation du toggle soit sans risque.

---

## 2026-08-12 — Unification UI des écrans coach (badges, boutons-texte, bouton danger, boutons icône)

**Contexte** : les écrans coach (`CoachDashboard.jsx`, `ClientsList.jsx`, `MemberDetail.jsx`, `CoachPrograms.jsx`, `CoachSettings.jsx`) répétaient les mêmes éléments d'UI (badges de statut, boutons-texte d'action, bouton de déconnexion, pills de filtre, boutons icône nus) en styles inline légèrement différents à chaque occurrence. Objectif : converger vers des classes CSS réutilisables dans `src/styles/global.css`, sans toucher aux tokens existants (`--accent`, `--border`, `--radius-btn`, `--danger`, etc.), sans changer palette/police/layout desktop (`coach.css` intact).

**4 classes ajoutées dans `global.css`** (à la suite de `.goal-chip`, aucune variable `:root` touchée) :
- `.status-badge` — badge coloré (statut membre ou objectif). Basé sur la version la plus complète trouvée (`MemberDetail.jsx` ligne 191) : `font-size: 9px`, `padding: 3px 8px`, `border-radius: 4px`, `letter-spacing: 1px`, `text-transform: uppercase`, `font-weight: 700`. Bordure en `1px solid currentColor` plutôt qu'une propriété `border-color` séparée, pour qu'un seul `style={{ color }}` inline gère à la fois le texte et la bordure (couleur toujours dynamique selon `STATUS_COLORS`/`GOAL_COLORS`, comme demandé).
- `.text-action-btn` (+ modificateur `.muted`) — boutons-texte d'action (Modifier/+ Assigner/Archiver/Supprimer). Base `color: var(--accent)`, `.muted` passe en `var(--text-muted)`. Couleur dynamique (ex. Supprimer qui vire au rouge en confirmation) gérée en `style` inline par-dessus la classe, même pattern que `.status-badge`.
- `.btn-danger` — bouton pleine largeur pour action destructive, basé sur le bouton de déconnexion de `CoachSettings.jsx` pour la couleur (`border: 2px solid var(--danger)`, `color: var(--danger)`, `background: transparent`) et sur `.btn-ghost` pour toute la géométrie (`padding: 19px 16px`, `border-radius: var(--radius-btn)`, `font-size: 13px`, `letter-spacing: 0.1em`, `text-transform: uppercase`, `width: 100%`).
- `.icon-btn` — boutons icône nus (flèche retour, déconnexion). `padding: 10px` (zone de tap 40×40 exact pour les icônes 20px déjà présentes, 44×44 pour les 24px — voir choix ci-dessous).

**Choix tranchés faute de précision dans la consigne (à vérifier)** :
1. `.text-action-btn` — les occurrences se répartissaient à égalité (2 vs 2) entre `font-size: 11px`/`letter-spacing: 1px` (Modifier, + Assigner) et `font-size: 10px`/`letter-spacing: 0.5px` (Archiver, Supprimer) — aucune majorité. Tranché en faveur de la variante **accent** (11px/1px) comme valeur de base, puisque la consigne la présente comme "la variante par défaut" et que seule la couleur devait varier via `.muted`.
2. `.icon-btn` — la consigne demandait un "padding cohérent" pour un minimum 40×40, mais les icônes existantes ne font pas toutes la même taille (20px sur le bouton déconnexion de `CoachDashboard.jsx`, 24px sur les flèches retour). Un seul `padding: 10px` a été choisi plutôt qu'une largeur/hauteur fixe, car il garantit exactement 40×40 pour la plus petite icône du lot (20px) sans avoir à forcer un `display: inline-flex` supplémentaire — 44×44 pour les icônes 24px, toujours ≥ 40×40.
3. `.btn-danger` — la consigne ne précisait pas si le `font-weight: 700` et le `letter-spacing: 2px` du bouton de déconnexion d'origine devaient être conservés. Comme la consigne ancre explicitement cette classe sur la géométrie de `.btn-ghost` ("même padding/radius/uppercase que .btn-ghost"), et que `.btn-ghost` ne définit ni `font-weight` ni ce `letter-spacing` élargi, les deux ont été alignés sur `.btn-ghost` (poids par défaut, `letter-spacing: 0.1em`) plutôt que conservés tels quels — cohérence avec les autres boutons pleine largeur plutôt que fidélité pixel-perfect à l'ancien style.
4. Le bouton "✕" de suppression de ligne d'exercice dans `CoachPrograms.jsx` (`removeRow`) n'a **pas** été converti en `.icon-btn` : sa consigne ne visait que le pattern répété "tel quel" (`background:none, border:none, cursor:pointer`), or ce bouton a un padding déjà différent (`8px 4px`) et un état désactivé (curseur/opacité conditionnels) propre à sa logique — laissé inchangé pour ne pas risquer d'altérer ce comportement.

**Écrans modifiés** (ordre demandé, build vérifié après chacun) :
- `MemberDetail.jsx` : 1 `.icon-btn` (flèche retour), 1 `.status-badge` (statut membre en en-tête), 2 `.text-action-btn` (Modifier objectifs, + Assigner habitude), 1 `.text-action-btn.muted` (Archiver habitude)
- `CoachPrograms.jsx` : 1 `.icon-btn` (flèche retour), 1 `.text-action-btn` (Supprimer programme, couleur dynamique gardée en inline)
- `ClientsList.jsx` : pills de filtre (TOUS/ON TRACK/AT RISK/INACTIVE) basculées sur `.goal-chip`/`.goal-chip.active` déjà existant (demandé explicitement, pas de nouvelle classe) ; badge objectif membre → `.status-badge`
- `CoachDashboard.jsx` : 1 `.icon-btn` (déconnexion), 1 `.status-badge` (statut membre dans la liste "Actifs/Activité récente")
- `CoachSettings.jsx` : bouton "SE DÉCONNECTER" → `.btn-danger`

Aucune logique JS touchée (état, fonctions, appels Supabase, navigation) — uniquement `className`/`style` du JSX de présentation. Aucune prop/id/state renommé.

**Vérification** : `npm run build` relancé après l'étape 1 (CSS seule) puis après **chaque** écran individuellement (5 builds au total) — tous passés sans erreur.

**Commit** : `style: unify coach screen UI elements (badges, action buttons, icon buttons) into reusable classes`, poussé directement sur `claude/charming-mendel-dj1GQ` (branche unique, pas de PR possible — établi en session précédente). Déploiement Vercel vérifié après coup.

---

## 2026-08-12 — Code-splitting du bundle JS (lazy loading des écrans)

**Contexte** : `npm run build` affichait l'avertissement Vite "Some chunks are larger than 500 kB" — un seul chunk `index-*.js` de **716 KB** minifié, tous les écrans (27 imports dans `src/App.jsx`) chargés statiquement dès le premier chargement de l'app, peu importe l'écran réellement visité.

**Fait** : conversion en `React.lazy()` + `<Suspense>` des 26 composants écran importés dans `src/App.jsx` — `Landing`, `Login`, `CoachSignup`, `PlatformAdmin`, `ResetPassword`, `Dashboard`, `Nutrition`, `Workout`, `Hydration`, `Sleep`, `Weekly`, `AICoach`, `Scan`, `CoachDashboard`, `MemberDetail`, `CoachPrograms`, `WorkoutLibrary`, `WorkoutSession`, `WorkoutHistory`, `ClientsList`, `Messages`, `Conversation`, `CoachMessages`, `Settings`, `CoachSettings`, `Onboarding`, `AppTour`. Les layouts (`MemberLayout`, `CoachLayout`, `PublicLayout`) et `ProtectedRoute` restent en import statique, comme prévu — ce sont eux qui décident quel écran afficher, pas des écrans eux-mêmes.

`<Routes>...</Routes>` enveloppé dans `<Suspense fallback={<RouteLoadingFallback />}>`. Pas de composant de loading réutilisable trouvé dans `src/components` avant de coder — vérifié par recherche (`spinner`/`loading`/`loader`) avant d'en écrire un. Le fallback réutilise le langage visuel déjà existant dans l'app (anneau avec bordure `--border` + haut `--accent`, animation `spin` déjà définie dans `global.css`, le même motif que `.btn-spinner`/`.scan-loading-ring`) plutôt que d'inventer un nouveau style — implémenté en style inline dans `App.jsx`, aucune CSS touchée.

Aucun changement de logique de routes, de guards, d'ordre de routes ni de commentaires existants dans `App.jsx` — uniquement le remplacement `import X from …` → `const X = lazy(() => import(…))` et l'ajout du `Suspense`. `Sleep` conservé tel quel malgré l'absence de route `/sleep` active (dette connue, non traitée ici).

**Résultat mesuré** (`npm run build`) :
- Avant : 1 chunk principal `index-*.js` de **716 KB** minifié — warning Vite "chunks larger than 500 kB"
- Après : chunk principal `index-DcM4qxfF.js` à **455.64 KB** (gzip 133.17 KB) — **plus de warning**, 41 fichiers `.js` distincts dans `dist/assets` (un par écran/route + chunks partagés), chacun chargé à la demande à la navigation
- Build : 6476 modules transformés, réussi sans erreur en ~23s

**Vérification** : `npm run build` OK, warning disparu, `Get-ChildItem dist\assets -Filter *.js` confirme la présence des chunks séparés (`Dashboard-*.js`, `Nutrition-*.js`, `Workout-*.js`, `Login-*.js`, `Landing-*.js`, `CoachDashboard-*.js`, etc.). Comme toujours, aucune vérification visuelle possible dans ce sandbox — validation visuelle sur téléphone à faire par l'utilisateur avant merge.

**Commit** : `perf: lazy-load screen components to reduce main bundle size`, poussé sur `claude/charming-mendel-dj1GQ`. PR ouverte en draft, passée en ready après statut Vercel vert — **pas mergée**, merge laissé à l'utilisateur après validation visuelle.

---

## 2026-08-11 — Session 18 (suite 100) : proposition n°4 livrée — bibliothèque de programmes réutilisables

**Demande directe d'Arnaud, suite au point 3** : *"on continue sur le point 4"*.

**Constat de départ** : "Programme" n'existait que comme génération IA éphémère — le bouton "✦ PROGRAMME IA" de `Workout.jsx` demande à Claude un programme du jour, jamais sauvegardé nulle part. Aucune notion de bibliothèque, aucun moyen pour le coach de construire un programme une fois et de le réutiliser sur plusieurs membres — exactement le point relevé dans la veille.

**Modèle de données, 2 nouvelles tables (migration `add_programmes`, appliquée en base réelle)** :
- `programmes` (titre + `exercices` jsonb) — **bibliothèque d'équipe**, pas un carnet personnel : n'importe quel coach de la salle peut voir/modifier/assigner un programme, pas seulement celui qui l'a créé. Différence assumée avec `habitudes`/`coach_notes` qui restent scopées à un seul coach.
- `programme_assignations` (qui a reçu quel programme) — pas de date/récurrence : le membre pioche dans "mes programmes" quand il veut s'entraîner, contrairement aux habitudes qui sont une obligation quotidienne.
- Le champ `exercices` reprend **exactement** la shape déjà utilisée par `AppContext.addExercisesToSession` et le JSON généré par "PROGRAMME IA" (`[{name, sets, reps, kg, rest}]`) — un programme assigné se branche directement dans le flux "ajouter à la séance du jour" existant, zéro adaptateur à écrire.

**Incident RLS rencontré et corrigé pendant le test, pas après coup** : la policy SELECT "un membre voit un programme qui lui est assigné" interroge `programme_assignations`, et la policy INSERT de `programme_assignations` interroge `programmes` en retour — Postgres détecte ça comme un cycle et refuse (`42P17 infinite recursion detected in policy`), même si le résultat serait fini en pratique. Corrigé avec une fonction `SECURITY DEFINER` (`member_has_programme()`, même pattern que `is_coach()`/`my_gym_id()` déjà dans ce fichier) qui court-circuite RLS pour cette seule vérification ponctuelle, cassant le cycle sans rien affaiblir.

**Testé pour de vrai, 5 cas, transaction annulée** : coach crée un programme → OK ; l'assigne à Gisèle (même salle) → OK ; l'assigne à un profil fictif hors salle → rejeté 42501 ; Gisèle voit bien le programme assigné (contenu exact vérifié) ; Arnaud, qui n'a rien reçu, ne voit rien dans `programmes` (0 ligne, confirmant que la bibliothèque du coach n'est pas visible en général — seulement ce qui est explicitement assigné). Tout rollback derrière.

**Code** :
- `src/utils/programs.js` (nouveau) : `fetchProgramLibrary`, `createProgram`, `deleteProgram`, `assignProgram`/`unassignProgram` (multi-membres d'un coup), `fetchMemberPrograms`.
- `src/screens/CoachPrograms.jsx` (nouveau, route `/coach/programmes`) : bibliothèque avec création (titre + lignes d'exercices dynamiques), assignation multi-membres (sélecteur avec cases à cocher, membres déjà assignés grisés), suppression (confirmation à deux taps, pas de `window.confirm` — cohérent avec le reste de l'app qui n'en utilise nulle part). Accessible par un bouton sur `CoachDashboard`, pas un 5ᵉ onglet de nav (`CoachNav.jsx` reste volontairement à 4 onglets fixes).
- `src/screens/Workout.jsx` (membre) : nouvelle section "MES PROGRAMMES" — un tap charge le programme dans la séance du jour via `addExercisesToSession`, même bouton d'action que le programme généré par IA.

**Vérifié** : `npm run build` passe, 11 fonctions serverless (inchangé), `mcp__Supabase__get_advisors` (sécurité) : une nouvelle alerte attendue (fonction `member_has_programme` appelable par `authenticated`, même famille que `is_coach()`/`my_gym_id()`, intentionnel), rien d'autre.

## 2026-08-11 — Session 18 (suite 99) : proposition n°3 livrée — le coach assigne une habitude/un défi à un membre

**Demande directe d'Arnaud, suite au point 2** : *"on continue sur le point 3"*.

**Constat de départ** : rien n'existait — vérifié par grep sur tout `src/`, "habitude"/"défi"/"challenge" n'apparaissaient que dans des chaînes de texte sans rapport (un exemple de prompt AI Coach, un commentaire de style). Toute la fonctionnalité était à construire, contrairement aux points 1 et 2 qui s'appuyaient sur du code déjà là (`objectifs`, `computeStatus()`).

**Modèle de données, 2 nouvelles tables (migration `add_habitudes`, appliquée en base réelle)** :
- `habitudes` (le coach assigne : titre, fréquence visée/semaine, actif/archivé) — même séparation de rôle qu'`objectifs` (point 1) mais inversée : ici c'est le coach qui écrit sur une ressource *du* membre, alors que côté logs c'est le membre qui écrit sur une ressource *créée par* le coach.
- `habitude_logs` (le membre coche : un jour = une ligne, contrainte `unique(habitude_id, date)`).
- RLS : coach limité aux membres de sa salle (même jointure `gym_id` que partout ailleurs), membre limité à ses propres pointages — avec un `WITH CHECK` qui vérifie en plus que l'habitude pointée lui appartient bien (sans ça, `user_id = auth.uid()` seul aurait empêché de cocher au nom de quelqu'un d'autre, mais pas de cocher sa propre complétion sur l'`habitude_id` de quelqu'un d'autre — bruit/usurpation de progression sur une ressource qui n'est pas la sienne).

**Testé pour de vrai, 6 cas (3 positifs, 3 négatifs), transaction annulée** : coach assigne à Gisèle (même salle) → OK ; coach assigne à un profil fictif hors salle → rejeté 42501 ; Gisèle tente de s'auto-assigner une habitude en contournant le coach → rejeté (aucune policy INSERT pour les membres) ; Gisèle coche sa propre habitude → OK ; Arnaud tente de cocher l'habitude de Gisèle en son propre nom → rejeté ; le coach voit bien l'habitude + le pointage de Gisèle. Tout rollback derrière, zéro trace en base.

**Code** :
- `src/utils/habits.js` (nouveau, même esprit que `coachStats.js`/`streak.js` — un seul module partagé, pas une copie par écran) : `fetchHabitsWithProgress(userId)` (habitudes actives + bande de 7 jours + compteur de la semaine, même shape utilisée côté coach et côté membre), `assignHabit`/`archiveHabit` (coach), `checkHabitToday`/`uncheckHabitToday` (membre — la coche passe par `writeWithQueue`, la file d'attente hors-ligne déjà utilisée pour repas/séances, pour la même raison : une salle de sport c'est souvent un sous-sol avec du mauvais réseau).
- `MemberDetail.jsx` (coach) : nouvelle carte HABITUDES entre OBJECTIFS et les repas/séances récents — liste des habitudes actives avec bande de progression 7 jours, bouton "+ Assigner" (titre + fréquence 1-7x/semaine) et "Archiver" par habitude.
- `Dashboard.jsx` (membre) : nouvelle section HABITUDES sous la carte "Séances cette semaine" — chaque habitude est une carte tapable (coche/décoche optimiste, vibration au tap comme les bottles d'eau), section entière masquée si aucune habitude n'est assignée plutôt que d'ajouter un état vide de plus sur un dashboard déjà dense.

**Vérifié** : `npm run build` passe, 11 fonctions serverless (inchangé, aucun endpoint touché), `mcp__Supabase__get_advisors` (sécurité) : rien de nouveau.

## 2026-08-11 — Session 18 (suite 98) : proposition n°2 livrée — le coach est notifié quand un membre bascule "à risque"

**Demande directe d'Arnaud, suite au point 1** : *"continue sur le point 2"* (notification quand un membre passe à risque).

**Constat de départ** : `computeStatus()` (ON TRACK/AT RISK/INACTIVE) existait déjà côté client mais seulement affiché passivement sur le dashboard/la liste clients — jamais poussé activement. Deux jobs cron existaient déjà pour les notifications *membre* (`inactivity-nudge`, `streak-nudge`, tous deux Web Push via `web-push`/VAPID, déjà en place), rien d'équivalent côté coach. Et le plafond Vercel Hobby de 12 fonctions serverless était déjà atteint pile — impossible d'ajouter un 3ᵉ fichier cron sans consolider.

**Décision** : fusionner les 2 jobs cron existants + le nouveau job "à risque" dans **un seul fichier** `api/cron/nudges.js`, dispatché par `?job=inactivity|streak|at-risk` (même schéma de consolidation que `stripe-billing.js`/`invite.js`). `api/cron/inactivity-nudge.js` et `api/cron/streak-nudge.js` supprimés. Résultat : **11 fonctions serverless** (au lieu de 12) — la fusion a en fait libéré une marge, pas juste évité un dépassement.

**Logique du nouveau job (`job=at-risk`, cron quotidien 8h — avant les 2 autres jobs, pour que le coach voie l'alerte dès le matin)** :
- Recalcule le statut de chaque membre côté serveur (même seuils que `computeStatus()` côté client, dupliqué à la main pour la même raison d'import Vite que les 2 jobs existants).
- Notifie le coach **seulement sur la bascule vers AT RISK**, pas tant qu'un membre y reste — sinon ce serait un spam quotidien pour un membre déjà connu comme fragile, pas une alerte utile. Pour ça, nouvelle colonne `profiles.last_status_snapshot` (migration `add_last_status_snapshot`, appliquée en base réelle) qui retient le statut calculé au dernier passage ; transition = statut actuel `AT RISK` ET snapshot précédent différent. Le snapshot est réécrit à chaque passage pour **tout** membre, que la notif parte ou non — sinon un membre resterait "détectable" indéfiniment et redéclencherait une notif des jours plus tard sans rapport avec une vraie bascule du jour.
- Une notif push par membre transitionné, envoyée au(x) coach(s) **de la même salle uniquement** (jointure sur `gym_id`, même logique multi-tenant que partout ailleurs dans l'app), avec un lien direct vers `/coach/member/:id`.

**Testé avec de vraies données, en lecture seule** : la requête SQL équivalente à la logique du job tourne sur la vraie base — confirme qu'Arnaud (0 séance cette semaine) et Gisèle (1 séance) sont aujourd'hui tous les deux calculés `AT RISK` par le job (cohérent avec le seuil `>= 2` posé en suite 96), et qu'un vrai abonnement push existe déjà côté coach (`coach_push_subs = 1`) — le job fonctionnera donc réellement dès son premier passage en prod. Point signalé à Arnaud : comme les 2 membres sont actuellement à risque, le tout premier passage du cron enverra une notif pour chacun — activation normale d'une fonctionnalité qui vient de naître, pas un bug à corriger.

**Vérifié** : `npm run build` passe, 11 fonctions serverless (compté après suppression des 2 anciens fichiers), `mcp__Supabase__get_advisors` (sécurité) : uniquement les alertes déjà connues, rien de nouveau. `vercel.json` mis à jour : 1 entrée `functions` + 3 entrées `crons` pointant vers le même fichier avec un `?job=` différent chacune.

## 2026-08-11 — Session 18 (suite 97) : veille concurrentielle SaaS coach + proposition n°1 livrée (coach fixe l'objectif d'un membre)

**Demande d'Arnaud** : *"On doit optimiser la partie coach, on a passé beaucoup de temps sur la partie membre. Je veux qu'on s'attaque au produit lui-même : une veille de tous les SaaS sport/health qui existent, classés par pertinence, pour proposer THE saas qui simplifie la vie du coach."* Consigne explicite de poser des questions avant de commencer — première série de questions non répondue (session interrompue), reposée mot pour mot sur demande d'Arnaud ("Repose tes questions"), puis répondue : scope **élargi** (pas que le fitness pur), regard **international avec un œil sur la France**, angle **fonctionnalités coach en priorité**.

**Veille livrée en artefact** (`veille-saas-coach.html`) + résumé dans le fil. Concurrents classés par pertinence :
- **Tier S (coaching en ligne, le plus proche de VOLTA)** : Trainerize, TrueCoach, Everfit, PT Distinction, My PT Hub — tous avec un pattern commun : le coach *assigne* (programme/habitude/objectif) plutôt que le membre s'auto-dirige, et un système d'alerte "membre à risque" plus ou moins visible.
- **Tier A (généralistes/enterprise)** : Exercise.com, TrainHeroic, Hevy, Kahunas, Virtuagym.
- **Tier B (adjacents — gestion de salle, pas coaching individuel)** : Glofox, Mindbody, Zen Planner — retenu leur fonctionnalité "at-risk member insights" (Glofox) et système d'alerte "feu tricolore" (PT Distinction traffic-light alerts), directement comparables au statut ON TRACK/à risque déjà dans VOLTA.
- **IA fitness** : Fitbod, JuggernautAI, Arvo — ajustement *continu* du programme par l'IA (vs génération one-shot).
- **Francophone/Québec** : Hexfit, Odyn, Fit'Distance — marché de niche, aucun ne semble aller aussi loin que VOLTA sur l'IA conversationnelle.

**4 constats croisés avec le code réel de VOLTA** (pas juste "voici ce qui existe ailleurs" — vérifié que VOLTA a ou n'a pas déjà chaque chose) :
1. Les meilleurs outils laissent le coach *écrire* dans la fiche du membre (objectif, programme, habitude) — VOLTA n'avait jusqu'ici que de la lecture seule (`coach_notes` mis à part) côté fiche membre.
2. Alertes proactives "membre qui décroche" — VOLTA a déjà `computeStatus()` (ON TRACK/à risque) mais seulement affiché passivement, jamais poussé activement au coach.
3. Habitudes/défis assignables avec streaks (Trainerize) — rien d'équivalent dans VOLTA aujourd'hui.
4. Mémoire longue de l'IA sur le programme d'un membre (ajustement continu vs génération one-shot) — le Coach IA de VOLTA génère mais ne réajuste pas dans la durée.

**5 propositions, par ordre de priorité** :
1. **Le coach fixe l'objectif calorique/hebdo d'un membre depuis sa fiche** — *implémenté ci-dessous.*
2. Notification quand un membre bascule "à risque" (constat n°2 ci-dessus).
3. Le coach assigne une habitude/un défi à un membre (constat n°3).
4. Bibliothèque de programmes réutilisables (créer une fois, assigner à plusieurs membres).
5. Mémoire de programme pour l'IA Coach (constat n°4).

Arnaud a validé le point 1 et demandé de l'implémenter (*"on commence par le point 1"*) — les points 2 à 5 restent à faire, pas commencés, pas de date.

---

### Point 1 livré : le coach peut fixer l'objectif d'un membre depuis sa fiche

Jusqu'ici la table `objectifs` n'avait que des policies RLS d'auto-accès (le membre lit/écrit son propre objectif) plus une policy de lecture seule pour le coach — avec un commentaire explicite dans `supabase_schema.sql` disant que le coach ne modifie *jamais* l'objectif d'un membre, seulement le consulte. Décision produit d'aujourd'hui : ce commentaire est délibérément inversé.

**RLS ajoutée** (migration `coach_can_set_objectifs`, appliquée en base réelle) : deux nouvelles policies, `"Coaches can set same-gym objectifs"` (INSERT) et `"Coaches can update same-gym objectifs"` (UPDATE), toutes deux avec `WITH CHECK` — sans lui, un coach pourrait upserter/déplacer une ligne vers un `user_id` hors de sa salle, exactement la même classe de bug déjà documentée pour `role`/`gym_id` plus tôt dans ce journal.

**Testé pour de vrai, pas juste écrit** : transaction ouverte puis annulée (`begin; ... rollback;`), usurpant `coach@onairapp.com` via `set local request.jwt.claims`. Cas positif : upsert de l'objectif de Gisèle (membre réelle de la même salle) réussit, ligne retournée confirmée (`{"calories_jour":2100,"proteines":150,...}`). Cas négatif : upsert sur un profil fictif rattaché à une autre salle échoue avec l'erreur RLS attendue (`42501`). Après rollback, requêtes fraîches confirmant zéro trace : l'objectif réel de Gisèle est resté `null`, rien n'a persisté du test.

**Code** :
- `saveMemberObjectifs(memberUserId, values)` ajouté à `coachStats.js` — upsert simple sur `objectifs`, toute la sécurité réelle est côté RLS (ce upsert échoue tout seul si le membre n'est pas dans la salle du coach).
- `MemberDetail.jsx` : la carte OBJECTIFS (jusqu'ici en lecture seule) a maintenant un bouton "Modifier" qui bascule vers un formulaire (calories/protéines/pas/eau par jour), valeurs bornées via `clamp()`/`BOUNDS` (même garde-fou que l'onboarding et les repas — cf. bug des 10800 kcal/jour et du repas à 222 002 656 161 kcal déjà documentés dans ce journal) avant l'écriture en base.

**Incident de session, transparent** : un premier essai d'ajout de `saveMemberObjectifs` à `coachStats.js` a été perdu suite à une interruption de conversation (le fichier ne contenait plus la fonction alors que `MemberDetail.jsx` l'importait déjà) — `npm run build` a échoué avec une erreur d'import claire, qui a permis de détecter et corriger l'oubli avant tout commit. Aucune donnée ni aucune ligne de RLS affectée par cet incident, seulement du code local pas encore poussé.

**Vérifié** : `npm run build` passe, 12 fonctions serverless (inchangé, aucun nouvel endpoint), `mcp__Supabase__get_advisors` (sécurité) ne signale rien de nouveau après la migration.

## 2026-08-11 — Session 18 (suite 96) : premières vraies captures d'écran de l'app — 3 correctifs qui en sortent

**Premier vrai retour visuel de toute la session** : Arnaud a envoyé 4 captures d'écran réelles (tableau de bord coach + fiche membre "Gisèle") en demandant "regarde le code, regarde ces screens, est-ce qu'il y a des améliorations". Pas de navigateur ici, mais une capture réelle permet de croiser précisément ce qui est affiché avec le code qui le produit — la première vérification visuelle un tant soit peu fiable depuis le début de cette session.

**1. Statut "à risque" quasiment impossible à éviter — confirmé sur les captures.** `computeStatus()` exigeait `sessionsThisWeek >= 3` pour "ON TRACK", donc en dessous de 3 séances/semaine (une cadence pourtant saine et courante) un membre reste "à risque" pour toujours. Exactement ce que montrait la capture : les 2 seuls membres de la salle étaient **tous les deux** à risque, 0% sur la bonne voie — un coach qui ouvre l'app pour la première fois voit tout en orange, ce qui décourage plus que ça n'aide. **Discuté directement**, seuil abaissé à `>= 2` séances/semaine.

**2. "Dernière activité" ignorait les repas — trouvaille de cohérence entre deux modules.** `fetchMemberActivitySummaries()` et `fetchMemberDetailStats()` (`coachStats.js`, utilisés par ClientsList/CoachDashboard/MemberDetail) ne lisaient que `seances` et `activite_jour` pour calculer la dernière activité d'un membre — jamais `repas`, alors que `fetchMemberDetailStats` récupère déjà cette table (pour la moyenne calorique) sans jamais l'utiliser pour la date. Un membre qui logue ses repas religieusement sans toucher à l'eau/aux pas/à une séance apparaissait "inactif" côté coach. Et ce n'était même pas cohérent en interne : `utils/streak.js` (côté membre, pour les streaks) inclut lui les repas dans son propre calcul d'activité — les deux modules "activité" de l'app n'étaient pas d'accord entre eux. Corrigé : `repas` est maintenant récupéré et compté dans `lastActiveDate` aux deux endroits.

**3. Emoji 📋 dans "Tableau de bord"** — contredisait la charte tout juste consolidée (emoji réservés à quelques usages précis, jamais comme icône UI générique). Remplacé par `<Icon name="clipboard" />` — déjà dans le set `Icon.jsx`, aucun nouvel import.

**Vérifié pendant l'analyse, pas corrigé (pas assez de certitude)** : les 4 profils de la salle (Ghost, Coach, Arnaud, Gisèle) ont tous `poids`/`taille`/`age` null en base, alors que 2 d'entre eux (Ghost, Arnaud) ont de vrais objectifs caloriques (2938/2400 kcal) qui ne peuvent normalement être calculés qu'à partir d'un poids saisi à l'onboarding. Relu tout le chemin `Onboarding.jsx` → `updateUserProfile()` → upsert `profiles` : structurellement correct (bons noms de champs, colonnes bien dans l'allowlist de GRANT). Plus probablement des comptes de test anciens/créés à la main que des inscriptions passées par ce flow — mais pas assez de certitude pour trancher sans un vrai test en direct. **À surveiller à la prochaine vraie inscription.**

**Vérifié** : `npm run build` passe, `📋` absent du bundle compilé, `computeStatus` a un seul point de définition (`coachStats.js`), utilisé par les deux fonctions d'agrégation — pas de logique dupliquée à corriger ailleurs.

## 2026-08-11 — Session 18 (suite 95) : bug de déconnexion réel signalé par Arnaud, corrigé

**Signalé directement** : "je viens de me déconnecter de la partie membre, je voulais regarder la partie coach mais j'ai pu [me re]connecter à mon espace membre en appuyant sur 'Accès coach'."

**Root cause confirmée dans le code, pas devinée** : `AuthContext.logout()` appelait `supabase.auth.signOut()` mais ne mettait jamais `user` à `null` lui-même — ça dépendait entièrement du listener `onAuthStateChange` (déclenché en interne par `signOut()`) pour le faire. Et les 3 boutons "se déconnecter" de l'app (`Settings.jsx`, `CoachSettings.jsx`, `CoachDashboard.jsx`) appelaient `logout()` **sans l'attendre** avant de naviguer : `onClick={() => { logout(); navigate('/') }}`. Résultat, selon le timing exact de la notification interne du SDK Supabase, `user` pouvait rester peuplé (rôle membre) au moment précis où "Accès coach" (`Landing.jsx` → `navigate('/login', ...)`) faisait réévaluer la garde de route de `App.jsx` :
```js
<Route path="/login" element={user ? <Navigate to={user.role === 'coach' ... ? '/coach' : '/dashboard'} replace /> : <Login />} />
```
Avec un `user` encore membre, cette garde redirige direct vers `/dashboard` au lieu d'afficher le formulaire de connexion — exactement le symptôme décrit, pas une reconnexion automatique mais une session jamais réellement vidée à temps.

**Corrigé à deux niveaux, pas un pansement sur un seul symptôme** :
- Les 3 boutons attendent maintenant `logout()` avant de naviguer (`onClick={async () => { await logout(); navigate('/') }}`)
- `AuthContext.logout()` vide `user` lui-même, explicitement et de façon synchrone à son retour (`setUser(null)`), plutôt que de dépendre uniquement du timing du listener — le listener continuera de le refaire aussi de son côté, sans effet (idempotent)

**Mot de passe du compte coach de test réinitialisé** (demandé directement, l'ancien n'a jamais été noté nulle part — bonne pratique déjà en place, pas un oubli) : `coach@onairapp.com` / `Volta2026Coach!`, appliqué en base réelle via `pgcrypto` (`extensions.crypt(..., extensions.gen_salt('bf'))`, le mécanisme que Supabase Auth utilise lui-même pour le hash bcrypt — confirmé installé sur le projet avant de l'utiliser). Compte vérifié : `role='coach'`, rattaché à la salle VOLTA FITNESS.

**Vérifié** : `npm run build` passe. **Pas de test réel du parcours déconnexion→reconnexion en conditions réelles** — pas de navigateur fonctionnel dans le bac à sable (limite déjà documentée). La correction du bug lui-même vient d'une lecture précise du code (le `onClick` sans `await`, la garde de route exacte dans `App.jsx`), pas d'une supposition.

## 2026-08-10 — Session 18 (suite 94) : revue d'expérience membre + coach, et le premier correctif qui en sort

Demandé directement : "utilise l'application comme un utilisateur lambda, touche à tout, et fais moi un retour". **Honnêteté nécessaire, dite avant le retour lui-même** : aucun navigateur fonctionnel dans le bac à sable (même blocage de certificat que la suite 85, toujours pas contourné, toujours pas de désactivation de la vérification TLS). Le retour vient donc d'une reconstitution des deux parcours écran par écran dans le code — rigoureux sur la logique et les enchaînements, mais ne remplace pas un œil humain sur le rendu réel. Rendu sous forme d'artifact.

**Ce qui ressort, condensé** : l'onboarding est la meilleure partie de l'app puis abandonne l'utilisateur sur un tableau de bord vide sans guidance ; un nouveau membre pouvait voir dans son propre historique des séances qu'il n'a jamais faites (trois entraînements d'exemple avec charges précises — même famille que l'onglet Course au GPS simulé supprimé en suite 82, passé au travers) ; côté coach, le deuxième écran ouvert après une création de salle bien faite ("Mes Clients") était un vide total, sans code d'invitation ni invitation à agir ; et plus largement, le coach observe mais ne peut rien envoyer à un membre (pas de programme ni d'objectif assignable) — la moitié manquante d'un outil vendu comme "coaching".

**Demande de suite** : classer tout ce qui reste par priorité, et enchaîner sur le premier point. Ordre donné : (1) séances d'exemple + états vides critiques, (2) juridique/RGPD (déjà connu, action Arnaud), (3) coach peut assigner un objectif à un membre, (4) photos de progression (construire ou retirer), (5) salle orpheline, (6) i18n/bundle/tests au fil de l'eau.

### Point 1, traité dans la foulée

**Trois données factices retirées d'`AppContext.jsx`**, toutes de la même famille — un état initial "démo" jamais nettoyé, montré à chaque nouveau compte avant que la vraie requête Supabase ne l'écrase :
- `sessionHistory` : 3 séances d'exemple (PUSH/PULL/LEG DAY, charges précises) → tableau vide. `Workout.jsx` affichait déjà la section conditionnellement (`length > 0`), donc pas de casse — juste plus rien à afficher tant qu'il n'y a pas de vraie séance. Ajouté un vrai message ("Pas encore de séance enregistrée — lance-toi juste au-dessus") plutôt que de simplement masquer la section, cohérent avec le reste de l'app.
- `weeklyWorkouts` : défaut `4` → `0`. Un membre neuf voyait "4/6 séances" avec une barre aux deux tiers pleine sur le Dashboard, avant que la vraie requête `seances` ne l'écrase.
- `meals` : 5 repas d'exemple par défaut → tableau vide. Le reset quotidien (`clearDay()`) les effaçait déjà presque immédiatement sur un compte neuf, mais un flash existait entre le rendu initial (qui lit ce défaut) et l'effet qui les vide.
- **`runSessions`** (3 sessions de course factices) : mort depuis la suppression de l'onglet Course en suite 82 — plus lu par rien nulle part (confirmé par grep), supprimé.

**Trouvé en creusant `Workout.jsx` pour le point sessionHistory, une faille plus profonde du même genre** : le générateur de programme IA envoyait à Claude un historique **inventé et figé** — `"Dernières séances: Push Day (lundi), Pull Day (mercredi), Leg Day (vendredi)"`, littéralement en dur dans le prompt, quel que soit ce que le membre a réellement fait. L'IA proposait donc un programme du jour basé sur un mensonge. Corrigé : construit maintenant à partir des 3 dernières vraies séances (`sessionHistory`), avec un message honnête ("Aucune séance récente enregistrée") si le membre n'a encore rien fait plutôt que de fabriquer un historique.

**État vide de `ClientsList.jsx` (coach, salle sans membre)** : ajout d'une carte d'accueil quand `members.length === 0` — titre honnête ("Ta salle est prête, personne ne l'a encore rejointe"), le code d'invitation en grand avec un bouton copier (même endpoint `/api/invite` que `CoachSettings.jsx`, appelé seulement quand cet état est réellement atteint — pas de coût réseau pour un coach dont la liste est déjà peuplée). Ajouté au passage un message "Aucun client ne correspond à cette recherche" pour le cas voisin (des membres existent mais le filtre/recherche ne matche rien) — absent avant, la grille devenait juste silencieusement blanche.

**Vérifié** : `npm run build` passe. Grep confirmant qu'aucune trace des séances/repas d'exemple ne subsiste dans le bundle compilé (`PUSH DAY`/`Bench Press` restants dans le bundle proviennent bien de `WorkoutLibrary.jsx` — un vrai catalogue d'exercices — et du template JSON envoyé à l'IA, pas de fausses données utilisateur). Nouvelles chaînes ("Ta salle est prête...", "Pas encore de séance enregistrée...", "Aucun client ne correspond...", "Dernières séances") confirmées dans le bundle. **Pas de vérification visuelle réelle** — même limite que toute la session, pas de navigateur fonctionnel.

## 2026-08-10 — Session 18 (suite 93) : point 03 de l'audit — plafond de coût IA (et le premier vrai test exécuté du projet)

Troisième point de la liste de priorités ("lance le point 3").

**Le problème** : `api/claude.js` limitait à 15 appels / 5 min **par utilisateur** — une protection contre le martèlement, pas contre la dépense. Aucun budget par salle, aucun plafond global, limiteur fail-open. Avec l'abonnement acté (montant **fixe** par salle), le revenu est plat et le coût variable : une salle de 200 membres qui utilise beaucoup le coach IA peut coûter plus qu'elle ne rapporte. Invisible à 4 comptes, se découvre sur une facture.

**Point de passage unique, ce qui rend la chose simple** : vérifié par grep, les 9 endroits de l'app qui appellent l'IA passent tous par `api/claude.js`. Un seul endroit à équiper.

**Ce qui a été construit** :
- `gyms.ai_quota_calls` (défaut 2000, NULL = illimité) — quota mensuel par salle.
- Table `ai_usage(gym_id, period, calls, input_tokens, output_tokens)`, une ligne par salle et par mois. Agrégat plutôt que journal par appel : c'est tout ce dont le quota a besoin et ça ne grossit pas.
- `consume_ai_quota(p_global_cap)` — vérifie **et** consomme en une opération atomique (`for update` sur la ligne), donc deux appels simultanés ne peuvent pas passer tous les deux au-dessus du quota. Vérifie aussi un plafond plateforme (variable d'env `AI_GLOBAL_MONTHLY_CALL_CAP`, défaut 50000), filet contre l'emballement.
- `record_ai_tokens(input, output)` — séparée, parce que le quota doit bloquer **avant** l'appel alors que le coût réel n'est connu qu'**après** la réponse d'Anthropic.
- `api/_lib/aiQuota.js` + branchement dans `api/claude.js`, après le limiteur de rafale.

**Choix assumé — quota en appels, mesure en tokens** : le quota se compte en appels parce que c'est ce qu'on peut expliquer à un coach ("2000 requêtes IA/mois"). Mais la consommation réelle en tokens est enregistrée en parallèle, précisément pour pouvoir **recalibrer** le 2000 sur le coût constaté plutôt que de le laisser au doigt mouillé. Le 2000 est un défaut d'ingénierie, pas une décision commerciale — à revoir une fois les premiers mois observés.

**Fail-open assumé et documenté** : si le compteur lui-même tombe en panne, l'appel passe (même posture que le limiteur de rafale). Une panne Supabase ne doit pas couper l'IA à des salles qui paient ; le risque est borné et le log est explicite.

**Visibilité, sans quoi un plafond ne sert à rien** : carte "USAGE IA" dans les réglages coach (conso du mois, barre de progression, rouge au dépassement), et dans la console admin plateforme — total d'appels IA du mois plus, par salle, appels / quota et volume de tokens.

### Premier vrai test exécuté du projet

Jusqu'ici toutes les vérifications étaient statiques (build, grep, relecture). Là, la logique était testable en base : usurpation d'un vrai utilisateur authentifié via `set local role authenticated` + `request.jwt.claims`, le tout dans une transaction **annulée** à la fin — donc test réel sans laisser de trace.

Résultats : appels 1 et 2 sur un quota de 2 → autorisés (1/2 puis 2/2) ; appel 3 → **refusé** avec `gym_quota` ; ligne `ai_usage` vérifiée à `calls=2, input_tokens=1200, output_tokens=800` (l'enregistrement des tokens fonctionne) ; plafond plateforme → **refusé** avec `global_cap` ; sans plafond global → autorisé.

**Le test a attrapé une erreur — la mienne, pas celle du code** : mon premier cas "plafond plateforme" renvoyait `gym_quota` au lieu de `global_cap`. Comportement correct du code (le quota salle était déjà épuisé, il se déclenche en premier), mais **test mal construit** : le filet global n'était donc pas réellement vérifié. Refait avec un quota salle hors de portée pour isoler le plafond global, qui est cette fois confirmé. C'est exactement l'intérêt d'exécuter plutôt que de relire — un test qui passe par accident ne prouve rien.

**Vérifié après coup** : quota revenu à 2000, `ai_usage` vide — la base est dans l'état d'avant les tests. `get_advisors` sécurité relu : les deux nouvelles fonctions n'apparaissent qu'en `authenticated_security_definer_function_executable` (même classe déjà acceptée pour `is_coach`/`my_gym_id`/`is_platform_admin` — elles n'agissent que sur la salle de l'appelant), **aucune alerte `anon`**, confirmé en plus par une requête directe sur `routine_privileges` (le piège des grants `anon` a déjà mordu deux fois sur ce projet). `npm run build` passe, `node --check` sur tous les fichiers `api/`, toujours exactement **12** fonctions serverless (`aiQuota.js` est dans `_lib/`, il ne compte pas).

**Non testé** : le comportement réel bout en bout via l'app (il faudrait un navigateur, limite connue). Ce qui est testé, c'est le cœur — la logique de quota en base.

## 2026-08-10 — Session 18 (suite 92) : correction des points 02 et 04 de l'audit (perte de données silencieuse + index manquants)

Deux premiers points de la liste de priorités validée juste après l'audit ("commence les deux points que tu viens de me citer").

### Point 04 — index manquants (le rapide)

Les 5 clés étrangères sans index couvrant sont indexées. Composites `(user_id, date)` plutôt que colonne seule sur `repas` et `seances` : tout le code lit ces tables par utilisateur **et** plage de dates (AppContext, coachStats, streak), et la colonne de la FK reste en tête — donc le même index satisfait l'exigence de la FK *et* sert la vraie requête. `profiles_gym_id_idx` est le plus important : c'est la colonne que chaque policy "même salle" filtre, elle était sans index depuis la suite 86.

**Vérifié** : requête directe sur `pg_constraint`/`pg_index` — les **12** clés étrangères de la base ont maintenant un index dont elles sont colonne de tête. Répercuté dans `supabase_schema.sql` (règle du projet : la base et ce fichier ne divergent jamais).

**Pas fait volontairement** : les 28 policies `auth_rls_initplan` (qui recalculent `auth.uid()` à chaque ligne) et les 40 `multiple_permissive_policies`. C'est mécanique — envelopper dans `(select auth.uid())` — mais ça touche 28 policies de sécurité, et vu l'historique de subtilités RLS de ce projet (le piège des grants `anon`, hit deux fois), ça mérite un lot dédié et vérifié à part, pas un ajout à un lot "index rapides".

### Point 02 — perte de données silencieuse (le vrai sujet)

**Nouveau `src/utils/writeQueue.js`** : file d'attente persistée dans localStorage. On tente l'écriture directe ; si elle échoue, l'opération est mise en file et rejouée automatiquement — au retour du réseau (`online`), au lancement de l'app, après n'importe quelle écriture réussie, et via une relance périodique de 30s tant qu'il reste quelque chose (filet pour les cas où l'événement `online` ne se déclenche pas, typiquement un passage wifi capricieux → 4G).

Choix de conception, dans l'ordre où ils comptent :
- **Rejeu séquentiel, pas parallèle** — plusieurs upserts peuvent viser la même ligne, seul l'ordre garantit la bonne valeur finale. S'arrête au premier échec plutôt que de marteler.
- **Ce qui rend le rejeu sûr** : les écritures `activite_jour` (eau/pas/km/sommeil) et `objectifs` sont des upserts à **valeur absolue** avec `onConflict`, pas des deltas. Les rejouer est idempotent par nature. C'est ce qui rendait ce correctif faisable sans refonte.
- **Collapse** : deux upserts visant la même ligne ET le même jeu de colonnes sont redondants, seul le dernier est gardé — la file ne gonfle pas pendant une longue coupure. Deux réglages de colonnes *différentes* ne se collapsent pas (jeux de colonnes différents), ce qui est le comportement voulu.
- **Erreurs permanentes non rejouées** : un refus RLS (`42501`) ou une violation de contrainte (`23xxx`/`22xxx`) ne se répare pas en réessayant — inutile d'encombrer la file. Seules les pannes réseau/serveur (pas de `code` PostgreSQL) valent un rejeu.
- **Purge** : entrées de plus de 7 jours abandonnées (une valeur périmée ne doit pas écraser une valeur fraîche ressaisie entre-temps), file plafonnée à 200 entrées.

**Les 7 chemins d'écriture membre y passent maintenant** : `addMeal`, `deleteMeal`, les 4 upserts `activite_jour`, les 2 inserts `seances`, et `updateGoal` (celui-là m'avait échappé au premier passage, trouvé en vérifiant qu'il ne restait plus d'écriture directe). Vérifié par grep : plus aucun `.insert(`/`.upsert(`/`.delete()` direct dans `AppContext.jsx`.

**Nouveau `src/components/SyncIndicator.jsx`** — la partie visible, celle qui fait que l'app ne ment plus : petit bandeau discret au-dessus du FAB, "Synchronisation… N en attente" ou "Hors ligne — N en attente", avec un bouton Réessayer. Volontairement une information, pas une alarme : la donnée n'est pas perdue et repartira seule. Monté dans `MemberLayout`.

**Bug de positionnement trouvé et corrigé avant de livrer** : mon premier placement (`76px + safe-area`) superposait exactement le FAB (46px de haut, ancré à `76px + safe-area` d'après `fab.css`) — l'indicateur centré fait jusqu'à 340px de large, il l'aurait recouvert. Empilé au-dessus en prolongeant la formule déjà documentée dans `fab.css`/`global.css`.

**Deux limites documentées honnêtement plutôt que cachées** :
1. Le rejeu d'un **insert `repas`** n'est pas strictement idempotent : si l'insertion a réussi mais que la réponse s'est perdue, le rejeu crée un doublon. Assumé — `repas` n'a pas de colonne d'idempotence, et un doublon se supprime d'un geste alors qu'un repas perdu ne se récupère jamais.
2. Un repas mis en file garde un **id temporaire** (`Date.now()`) côté local alors que le rejeu lui donnera un vrai uuid. Le supprimer *avant* le prochain rechargement ne supprimera pas la ligne réelle, et il réapparaîtra au rafraîchissement. Fenêtre étroite (même session, ajout hors ligne puis suppression immédiate), et ça se répare tout seul au rechargement qui relit les vrais ids.

**Périmètre non couvert, à noter** : seules les écritures *membre* passent par la file. Les écritures côté coach (`coach_notes`, `messages`) gardent le comportement d'avant — l'audit visait la donnée membre, mais c'est le prolongement naturel.

**Vérifié** : `npm run build` passe, chaînes ("Synchronisation…", "Hors ligne —", "Réessayer") confirmées dans le bundle compilé, grep confirmant qu'aucune écriture directe ne subsiste, et que les 5 lectures Supabase d'`AppContext` sont intactes. **Pas de test réel du comportement hors ligne** — il faudrait un navigateur pour couper le réseau et observer le rejeu, ce que le bac à sable ne permet toujours pas (limite documentée en suite 85). La logique a été relue attentivement, pas exécutée en conditions réelles.

## 2026-08-10 — Session 18 (suite 91) : compte Stripe créé + audit complet de l'app (points faibles / axes d'ouverture)

**Compte Stripe créé par Arnaud** (annoncé en début d'échange). Reste donc à faire, côté configuration, avant que la facturation fonctionne réellement : créer le produit + prix récurrent mensuel dans ce compte, configurer le webhook vers `https://onairapp.vercel.app/api/stripe-billing`, et poser les 3 variables dans Vercel (`STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, `STRIPE_WEBHOOK_SECRET`). **Toujours pas de test de bout en bout du paiement** tant que ces 3 variables ne sont pas en place. Arnaud a explicitement classé ce sujet comme "un ajustement" et demandé de passer à plus prioritaire : un audit complet.

**Audit complet demandé et réalisé** — lecture réelle du code, du schéma, et de la base de production (advisors Supabase sécurité + performance, requêtes de comptage, inspection du bundle compilé). Rendu sous forme d'artifact consultable. **9 points faibles** (2 critiques, 2 élevés, 5 moyens) et **5 axes d'ouverture**. Résumé pour reprise :

**Ce qui va bien (vérifié, pas supposé)** : aucune faille de sécurité ouverte trouvée, aucun secret exposé, le cloisonnement multi-salles tient (toutes les policies rescopées en suite 86 + la faille `gym_id` fermée en suite 90), tous les endpoints sont authentifiés et rate-limités, les crons sont protégés par `CRON_SECRET`, la suppression de compte cascade correctement, et `coachStats.js` groupe bien ses requêtes (pas de N+1 sur la liste des membres).

**CRITIQUE 01 — Aucune couche légale/RGPD.** Zéro CGU, zéro politique de confidentialité, zéro consentement explicite, zéro export de données. Or VOLTA stocke poids/taille/âge/repas/sommeil (= données de santé au sens du RGPD) et les partage avec un tiers (le coach) sans accord explicite du membre. En plus : `coach_notes` (schema:542-549) — le coach écrit des notes *sur* un membre, aucune policy ne donne accès à ce membre, alors que ce sont ses données personnelles (droit d'accès, art. 15). **C'est le vrai prérequis pour facturer une salle, avant même Stripe.** La suppression de compte, elle, est conforme (droit à l'effacement couvert).

**CRITIQUE 02 — Perte de données silencieuse.** `AppContext.jsx:584-588` : si l'insertion d'un repas échoue, `console.error` puis ajout à l'état local quand même — le membre voit son repas enregistré, rafraîchit, il a disparu, et le coach ne l'a jamais vu. Le commentaire ligne 551-553 documente ce choix comme délibéré ("pour que l'interface ne bloque jamais"). Même schéma pour l'eau (`:337`), les pas (`:347`), les km (`:357`). Aggravant : une salle de sport = souvent un sous-sol avec du mauvais réseau.

**ÉLEVÉ 03 — Aucun plafond de coût IA.** `api/claude.js:35` : 15 appels / 5 min **par utilisateur**, pas de budget par salle ni global, et `rateLimit.js` fail-open (`return { ok: true }` si le limiteur lui-même erreur). Avec le modèle acté (abonnement mensuel **fixe** par salle), le revenu est plat et le coût variable → une grosse salle peut coûter plus qu'elle ne rapporte. Invisible à 4 comptes, se découvre sur une facture.

**ÉLEVÉ 04 — Base non préparée à l'échelle.** Advisors Supabase : 28 × `auth_rls_initplan` (les policies recalculent `auth.uid()` à chaque ligne au lieu d'une fois par requête), 40 × `multiple_permissive_policies`, 5 × `unindexed_foreign_keys`. Le plus gênant : **`profiles_gym_id_fkey` sans index** — c'est exactement la colonne que chaque policy "même salle" filtre à chaque lecture. Le cœur du multi-salles tape sur une colonne non indexée.

**MOYEN 05 — Une fonctionnalité factice encore livrée** : `Weekly.jsx:187-197`, section "MA PROGRESSION — Photos semaine par semaine", 4 emplacements avec un "+", aucun `onClick` ni `input` dans tout le fichier. Même classe que l'onglet Course supprimé en suite 82, passée au travers. ("MES CHARGES" juste en dessous est en revanche parfaitement réel.)

**MOYEN 06 — Traduction à moitié câblée** : les 3 langues sont complètes (166 clés chacune en fr/en/es), mais ~122 chaînes françaises sont écrites en dur dans `src/screens/*.jsx` hors de `t()`. Basculer en anglais donne une interface moitié-moitié.

**MOYEN 07 — Salle orpheline** : `gyms` n'a aucune colonne propriétaire. Si le seul coach supprime son compte, la salle survit avec ses membres, son code d'invitation valide et potentiellement un abonnement Stripe toujours facturé — administrable par personne.

**MOYEN 08 — 693 Ko de JS en un seul chunk**, aucun code splitting (sauf `ShaderBackground.jsx`). Deux bibliothèques d'icônes cohabitent : Phosphor (2 fichiers) et Lucide (1 fichier), reliquat d'une migration jamais finie.

**MOYEN 09 — Zéro test, zéro linter, zéro CI.** Seule la compilation tourne. C'est précisément ce qui a laissé passer l'onglet Course et le point 05.

**Les 5 axes d'ouverture** (3 retournent un problème ci-dessus en avantage commercial) : (1) vendre la conformité RGPD comme argument au lieu de la subir — la salle est elle-même responsable devant ses adhérents ; (2) transformer le plafond de coût IA en palier tarifaire (Base avec quota / Pro illimité) → borne le risque **et** crée la première montée en gamme ; (3) le hors-ligne comme argument de vente plutôt que comme rustine (le correctif du point 02 impose de toute façon une file d'attente) ; (4) exploiter la donnée déjà en base en repères inter-salles ("tes membres sont 30 % sous la moyenne sur les protéines") — zéro nouvelle collecte, la vue `leaderboard_weekly` existe déjà ; (5) donner au coach une raison de revenir quotidiennement (le calcul "membre inactif" existe déjà dans `coachStats.js`, le pousser en alerte crée la boucle d'habitude côté payeur — le levier de rétention le moins cher).

**Ordre recommandé** : 02 (rapide, touche la confiance dès aujourd'hui) → 01 (prérequis pour facturer) → 03 (avant d'avoir du volume) → 04 (une heure aujourd'hui vs une semaine de panique plus tard) → le reste au fil de l'eau.

**Limite honnête de cet audit** : aucun test d'intrusion, aucun test de charge, et **aucune vérification visuelle réelle de l'interface** (pas de navigateur fonctionnel dans le bac à sable, limite documentée en suite 85). Tout ce qui est affirmé est vérifiable aux références citées.

## 2026-08-10 — Session 18 (suite 90) : fermeture de la faille `gym_id` laissée ouverte en suite 88

Repris directement dans la liste de la suite 89 ("qu'est-ce qu'il reste à faire ?") — choisi en premier parce qu'indépendant de Stripe (pas d'action requise côté Arnaud) et que c'était un vrai point de sécurité documenté mais pas fermé.

**Le problème (rappel de la suite 88)** : `trg_prevent_self_privilege_insert` forçait déjà `role='member'` et `is_platform_admin=false` sur tout INSERT authentifié, mais laissait `gym_id` de côté volontairement — `AuthContext.register()` en avait encore besoin pour son upsert client direct. Un utilisateur technique pouvait donc encore s'auto-déclarer membre d'une salle arbitraire via un appel REST brut, en contournant complètement `api/invite.js`.

**Le vrai correctif : sortir la création du profil membre du client, comme `create-gym.js` le fait déjà pour les coachs.**
- `trg_prevent_self_privilege_insert` force maintenant `gym_id := null` aussi, sur tout INSERT authentifié — plus aucun moyen pour un client de poser un `gym_id` qui "tient" à l'insertion, peu importe le chemin emprunté (`UPDATE` était déjà bloqué depuis le début, `gym_id` n'a jamais fait partie de l'allowlist de colonnes updatable).
- `AuthContext.register()` ne pose plus `gym_id` dans son upsert (de toute façon le trigger l'aurait annulé). À la place, une fois `signUp()` réussi, il appelle `POST /api/invite` **authentifié**, avec le code brut tapé par l'utilisateur.
- `api/invite.js` (déjà fusionné en suite 88 pour la limite Vercel) gagne un 3ᵉ mode, distingué simplement par la présence d'une session : sans session → validation publique (juste UX, "code invalide" avant même de créer le compte) ; avec session → **le vrai rattachement** : re-résout `gym_id` depuis le code côté serveur (`service_role`, jamais en confiance sur une valeur venue du client), pose `gym_id` par upsert, et refuse (409) si le profil a déjà un `gym_id` — même posture "one-shot" que `create-gym.js`, pour qu'un membre/coach existant ne puisse pas changer de salle juste en apprenant un code.
- `Login.jsx` : passe maintenant le **code** à `register()` (plus un `gym_id` supposément déjà validé) — la réponse de l'appel de pré-validation ne contient plus que `{ valid }`, `gym_id` ne sort plus jamais du serveur vers un contexte non authentifié.

**Pourquoi c'est le vrai correctif et pas un pansement** : avant, "valider le code" et "poser le gym_id" étaient deux étapes séparées, reliées uniquement par la confiance dans le client entre les deux. Maintenant c'est une seule opération atomique côté serveur — re-valider ET poser dans le même appel, avec le trigger qui garantit qu'aucun autre chemin (insertion brute, upsert direct) ne peut faire tenir un `gym_id` pour un compte authentifié normal.

**Vérifié** : migration appliquée en base réelle (Supabase MCP), relu directement le code source du trigger en base pour confirmer (`select prosrc from pg_proc`). `get_advisors` (sécurité) relu — aucun nouveau warning. `npm run build` passe, `node --check` sur les 12 fichiers `api/*.js`. Toujours exactement 12 fonctions serverless (pas de nouveau fichier ajouté — le 3ᵉ mode vit dans `api/invite.js` existant). **Pas de test de bout en bout réel** (créerait un vrai compte + une vraie salle) — logique relue attentivement plutôt que devinée, notamment le point de course (le upsert de `complete-signup` peut arriver avant ou après l'upsert `prenom`/`email` de `register()`, les deux se mergent proprement via `onConflict`).

## 2026-08-10 — Session 18 (suite 89) : ce qu'il reste à faire, après la 88 (PR #113 mergée)

Récap demandé directement après le merge de la 88 — à garder comme point de reprise fidèle pour la prochaine session, pas juste dans le chat.

**Bloquant, action Arnaud (pas quelque chose que Claude peut faire à sa place)** — la facturation Stripe est codée mais ne fonctionnera pas tant que :
1. Un vrai compte Stripe existe (à créer si pas déjà fait)
2. Un produit + un prix récurrent mensuel sont créés dedans (**c'est là que le montant réel se fixe** — rien dans le code ne le décide)
3. Un webhook Stripe est configuré, pointant vers `https://onairapp.vercel.app/api/stripe-billing`
4. Trois variables sont posées dans Vercel (Settings → Environment Variables) : `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, `STRIPE_WEBHOOK_SECRET`

Tant que ce n'est pas fait, les boutons "S'abonner"/"Gérer mon abonnement" renvoient une erreur propre (pas de crash, pas de comportement silencieux cassé) — voir suite 88 pour le détail technique.

**Une fois Stripe branché** : il faudra un vrai test de bout en bout (créer un abonnement avec une carte de test Stripe, vérifier que `subscription_status` passe bien à `active` en base via le webhook) — impossible à faire avant que le compte existe, donc pas fait dans ce lot.

**Volontairement laissé de côté, pas oublié** :
- **Tests automatisés** — mis en mémoire sur demande explicite d'Arnaud (suite 87), toujours en attente.
- **Marketplace** (mise en relation coachs/salles spécialisées CrossFit/Pilates/Street workout) — parkée en suite 84, à reprendre seulement après que le SaaS coach soit stable.
- ~~`gym_id` auto-déclaré à l'inscription~~ **Fermé en suite 90** — voir plus haut.

## 2026-08-10 — Session 18 (suite 88) : facturation Stripe par salle + console admin "toutes les salles", et une vraie faille trouvée en chemin

Suite directe de la 87 : "On fait ça maintenant" — les deux manques identifiés juste avant ("pas de paiement", "pas de vue d'ensemble pour toi") traités dans la foulée, après confirmation de 3 décisions business (abonnement mensuel fixe par salle, essai gratuit 14-30 jours, accès coach bloqué mais membres inchangés sur non-paiement).

**Facturation Stripe, par salle.** Colonnes ajoutées à `gyms` : `stripe_customer_id`, `stripe_subscription_id`, `subscription_status` (miroir direct des valeurs Stripe — `trialing`/`active`/`past_due`/`canceled`... — jamais recalculé côté app), `trial_ends_at`, `current_period_end`. `api/create-gym.js` fixe `trial_ends_at` à **14 jours** dès la création (chiffre choisi par défaut — facilement changeable, une seule constante dans le fichier, si tu préfères 30). Trois nouveaux endpoints :
- `api/create-checkout-session.js` — crée le client Stripe de la salle si besoin, ouvre une session Checkout pour l'abonnement (`STRIPE_PRICE_ID`, prix réel configuré dans **ton propre compte Stripe**, pas dans ce code).
- `api/create-billing-portal-session.js` — portail Stripe hébergé, pour qu'un coach gère sa carte/résilie tout seul sans te solliciter.
- `api/stripe-webhook.js` — reçoit les événements Stripe (`checkout.session.completed`, `customer.subscription.*`) et met à jour `subscription_status`/`current_period_end`. Body parsing désactivé (`export const config = { api: { bodyParser: false } }` — vérifié dans la doc Vercel que ça marche aussi sur une fonction Node "nue", pas seulement Next.js) car Stripe a besoin des octets bruts de la requête pour vérifier la signature.

**Portée du blocage, exactement comme décidé** : `CoachLayout.jsx` vérifie l'abonnement de la salle au montage et affiche un écran "Abonnement requis" à la place de l'espace coach si `subscription_status` n'est ni `active` ni un essai encore valide — mais seulement pour les routes `/coach/*`. Les membres ne sont jamais concernés (`MemberLayout` n'a aucune vérification de ce type). Échoue **ouvert** (accès autorisé) si la lecture échoue ou ne renvoie rien — un souci réseau ne doit jamais bloquer un coach payant de bonne foi ; seule une ligne réelle disant "inactif" bloque. `CoachSettings.jsx` a une nouvelle section FACTURATION (statut, jours d'essai restants, bouton s'abonner/gérer).

**⚠️ Non testé en conditions réelles — action requise de ton côté avant que ça marche** : aucun compte Stripe réel n'existe encore côté agent (je ne peux pas en créer un pour toi). Il te faut créer un compte Stripe, un produit + prix récurrent mensuel, et renseigner trois variables d'env Vercel : `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, `STRIPE_WEBHOOK_SECRET` (ce dernier vient de la configuration du webhook Stripe → pointer vers `https://onairapp.vercel.app/api/stripe-webhook`). Tant que ces 3 variables ne sont pas posées, les 3 nouveaux endpoints renvoient une 500 explicite plutôt que d'échouer en silence — même posture que `send-push.js` avec des clés VAPID absentes.

**Console admin "toutes les salles" (`/admin`, `PlatformAdmin.jsx`).** Nouveau flag `profiles.is_platform_admin` (booléen, indépendant de `role` — `role='admin'` reste scopé par salle comme un coach depuis la suite 86, ce n'est pas la même chose). Jamais réglable en self-service, uniquement à la main en SQL — posé sur ton compte (`goodghost696@gmail.com`) directement dans cette session. Nouvelles policies RLS ("Platform admins can view all gyms/profiles") pour lire à travers toutes les salles. L'écran liste chaque salle (statut abonnement, essai restant, nb coachs/membres, code d'invitation, date de création) via de simples requêtes client sous RLS — même pattern que CoachDashboard/ClientsList, aucun endpoint serveur dédié nécessaire. Accès depuis Réglages (côté membre et côté coach) : bouton "Console admin — toutes les salles", visible seulement si `is_platform_admin`.

**Faille trouvée en cours de route, corrigée avant de livrer — pas après coup.** En ajoutant `is_platform_admin`, remarqué que `trg_prevent_self_role_escalation` (suite du 2026-07-xx) ne protège que les **UPDATE** sur `profiles` — le tout premier **INSERT** (celui d'`AuthContext.register()`, ou n'importe quel appel REST brut avec le vrai jeton d'un utilisateur) n'avait *aucune* restriction de colonne, seul l'UPDATE avait été verrouillé par le passé. Un utilisateur technique pouvait donc, dès sa toute première inscription, envoyer `role: 'coach'` ou (nouveau risque) `is_platform_admin: true` directement dans le payload d'insertion et l'obtenir — la policy RLS d'insertion ne vérifie que `auth.uid() = user_id`, jamais quelles colonnes sont modifiées. Corrigé par un nouveau trigger `trg_prevent_self_privilege_insert` (BEFORE INSERT) qui force `role='member'` et `is_platform_admin=false` pour toute connexion `authenticated` — sans casser `create-gym.js` (tourne en `service_role`, non concerné). **Point non fermé, documenté honnêtement plutôt que caché** : `gym_id` lui n'est volontairement pas verrouillé par ce trigger (le flow d'inscription légitime en dépend), donc un utilisateur technique pourrait encore se déclarer membre d'une salle arbitraire par un insert brut, sans passer par le vrai code d'invitation — combiné à la faille `role` ci-dessus c'était grave (accès coach complet n'importe où), combiné à rien ça reste limité ("vu comme mal rattaché, invisible pour tout coach", même direction sans danger que l'auto-réparation de `resolveRole()`). Un vrai correctif propre (déplacer la création de profil côté serveur, comme `create-gym.js` le fait déjà pour les coachs) reste à faire, volontairement pas traité dans ce lot pour rester sur le périmètre trouvé.

**Autre resserrement fait en chemin** : la policy `gyms` "Authenticated can view gyms" permettait à N'IMPORTE QUEL utilisateur connecté de lire TOUTES les salles (nom, code d'invitation, et maintenant les colonnes de facturation). Vérifié par grep qu'aucun code frontend ne s'appuyait dessus (`validate-invite.js`/`invite-code.js`/`create-gym.js` utilisent tous `service_role`, hors RLS) — resserrée sans rien casser à "sa propre salle" + "platform admin".

**Premier déploiement Vercel en échec — trouvé et corrigé avant de redemander une review** : `errorCode: exceeded_serverless_functions_per_deployment` — le plan Hobby plafonne à 12 fonctions serverless par déploiement, et ce repo était déjà pile à 12 avant cette session. Les 3 nouveaux fichiers Stripe (`create-checkout-session.js`, `create-billing-portal-session.js`, `stripe-webhook.js`) faisaient passer le total à 15. Corrigé par fusion : les 3 endpoints Stripe deviennent **un seul fichier** `api/stripe-billing.js` (dispatch sur la présence du header `stripe-signature` pour le webhook, sinon un champ `action: 'checkout'|'portal'` dans le body — `bodyParser` désactivé pour tout le fichier, JSON reparsé à la main pour les deux actions navigateur), et `invite-code.js`/`validate-invite.js` (aucun rapport avec Stripe, mais tous les deux petits et déjà dans le même domaine "code d'invitation") fusionnés en `api/invite.js` (dispatch sur `req.method`, GET = ancien invite-code, POST = ancien validate-invite) pour libérer un slot supplémentaire. Total revenu à 12 pile. Les deux fichiers fusionnés touchent au flow d'inscription membre (`Login.jsx`) et à l'inscription coach existante — points d'appel mis à jour (`/api/invite`, `/api/stripe-billing` avec `action` dans le body), `npm run build` + `node --check` sur les 12 fichiers relancés après coup.

**Vérifié** : `npm run build` passe, toutes les nouvelles chaînes ("Abonnement requis", "S'abonner", "Console admin — toutes les salles", "Toutes les salles", "Abonnements actifs"...) confirmées dans le bundle compilé. Migration appliquée en base réelle via Supabase MCP, `get_advisors` (sécurité) relu après coup — rien de nouveau côté `anon`, seulement les warnings `authenticated_security_definer_function_executable` déjà acceptés pour `is_coach()`/`my_gym_id()` (même raisonnement : ces fonctions ne renvoient que des infos sur l'appelant lui-même). **Pas de test de bout en bout réel du paiement** (impossible sans un vrai compte Stripe) — la logique de webhook/checkout a été relue attentivement plutôt que devinée, mais reste non exécutée en conditions réelles.

## 2026-08-10 — Session 18 (suite 87) : inscription self-service coach — "créer ma salle" sans passer par Arnaud

Suite directe de la 86 : le point explicitement laissé de côté ("inscription self-service pour qu'une nouvelle salle/coach crée sa propre salle sans intervention manuelle") repris tout de suite après ("garde le point 3 [tests] en mémoire, continuons le parcours d'inscription self-service").

**Nouvel écran `CoachSignup.jsx`** (`/coach-signup`, lien "Pas encore de salle ? Créer la mienne →" ajouté sur l'onglet connexion de `Login.jsx` — exactement là où atterrit "Accès coach" depuis `Landing.jsx`) : formulaire nom de la salle + prénom + email + mot de passe. À la soumission, `supabase.auth.signUp()` appelé directement (pas `AuthContext.register()`, qui crée un profil `member` immédiatement — mauvaise forme pour un coach). Une fois la salle créée, le code d'invitation est affiché en clair avec un bouton copier, puis redirection vers l'espace coach.

**Nouvel endpoint `api/create-gym.js`**, tourne en `service_role` — nécessaire et intentionnel : `profiles.role` est verrouillé exprès (GRANT restreint + trigger `prevent_self_role_escalation`) pour qu'un client normal ne puisse jamais se passer coach tout seul ; ce trigger ne se déclenche que pour `auth.role() = 'authenticated'`, pas `service_role`, donc cet endpoit est l'exception étroite et volontaire, pas un contournement de cette protection.

**Race condition trouvée et corrigée avant de livrer, pas après coup** : `AuthContext.resolveRole()` auto-répare un profil manquant dès qu'une session devient active — ce qui arrive immédiatement après `signUp()`, potentiellement AVANT que `create-gym.js` n'ait eu le temps de tourner. Ce self-heal crée un profil "coquille" (`role='member'` par défaut de la table, `gym_id` null) qui aurait fait échouer la vérification initiale "ce compte a déjà un profil" de `create-gym.js` avec un 409, cassant tout le flow. Corrigé : la vérification ne rejette que si le profil existant a déjà un vrai `gym_id` ou un `role` différent de `'member'` — une coquille auto-réparée est écrasée par l'upsert plutôt que de bloquer.

**Génération du code d'invitation** : 8 caractères aléatoires (alphabet sans O/0/I/1 pour rester lisible à l'oral), colonne `unique`, retry (jusqu'à 5 fois) sur collision plutôt que de garantir l'unicité à l'avance — la salle n'est créée qu'une fois qu'un code réellement libre est trouvé. Si l'upsert du profil échoue après coup, rollback best-effort de la salle créée (pas de vraie transaction entre deux appels REST séparés, mais un filet plutôt que rien).

**`api/invite-code.js`/`CoachSettings.jsx` : aucun changement supplémentaire nécessaire** — l'un a déjà été rescopé par salle en suite 86, l'autre appelle déjà cet endpoint sans savoir que le code vient maintenant d'une vraie table plutôt que d'un env var.

**Vérifié** : `npm run build` passe, `node --check` sur `api/create-gym.js`. "Créer ma salle", "Pas encore de salle", "Code d'invitation" et la route `coach-signup` confirmés dans le bundle compilé. **Pas de test de bout en bout réel** (créerait un vrai compte auth) — la logique a été relue attentivement (notamment la race condition ci-dessus) plutôt que devinée, mais honnêtement pas exécutée en conditions réelles dans ce lot.

## 2026-08-10 — Session 18 (suite 86) : fondations multi-salles — table `gyms`, `gym_id`, RLS rescopé partout où un coach voyait "tout"

Point 1 du plan acté en suite 84 : corriger la vraie faille de sécurité identifiée avant d'ajouter un 2ᵉ coach (n'importe quel coach voyait tous les membres, sans filtre de salle, faute de notion de salle dans le schéma).

**Nouvelle table `gyms`** (`id`, `name`, `invite_code`, `created_at`) — une salle existante créée pour de vrai (`VOLTA FITNESS`, code `ONAIR2026`, reprend les valeurs par défaut déjà codées en dur ailleurs). Appliqué en direct via Supabase MCP, confirmé en base (`select * from gyms` → 1 ligne).

**`profiles.gym_id`** ajouté et **backfillé automatiquement** sur les 4 profils existants (`update profiles set gym_id = ... where gym_id is null`) — zéro donnée perdue, zéro saisie manuelle, confirmé (`count(*) = count(gym_id) = 4`).

**`my_gym_id()`** — nouvelle fonction `SECURITY DEFINER`, même patron que `is_coach()`, résout le `gym_id` de l'appelant sans re-déclencher les policies qui en dépendent (même classe de bug que la récursion RLS déjà corrigée le 2026-07-10, évitée ici dès le départ). **Piège déjà documenté sur `is_coach()`/`prevent_self_role_escalation()` re-rencontré et corrigé tout de suite** : `revoke ... from public` seul ne suffit pas, `anon` avait toujours l'exécution en direct (confirmé via `get_advisors` — `anon_security_definer_function_executable`) ; `revoke execute ... from anon` explicite ajouté, ré-vérifié propre après coup.

**Toutes les policies "Coaches can view all X" corrigées, une par une, vérifiées via `pg_policies`** — chacune passe de "n'importe quel coach" à "coach de la même salle uniquement" :
- `profiles` (coach→membres et membre→coach, les deux sens)
- `objectifs`, `repas`, `seances`, `activite_jour`
- `push_subscriptions` (les 4 policies, coach↔membre dans les deux sens)
- `messages` (la policy d'insertion qui validait "un vrai couple membre/coach" — corrigée, sinon un coach de la salle B aurait pu écrire à un membre de la salle A)
- **`leaderboard_weekly`** (la vue de classement hebdo, `security_invoker = false` par design pour contourner le RLS de `seances` — était TOUS les membres de l'app sans distinction ; ajout de `and p.gym_id = my_gym_id()` dans son `where`)

**Inscription rendue gym-consciente** : `api/validate-invite.js` résout maintenant le code d'invitation dans `gyms.invite_code` (au lieu d'un unique `INVITE_CODE` env var) et renvoie aussi `gym_id` ; `Login.jsx` fait suivre ce `gym_id` jusqu'à `register()` (nouveau paramètre optionnel, défaut `null` pour ne rien casser côté rétro-compatibilité) ; le profil créé a directement le bon `gym_id`, plus besoin de rattrapage après coup. `api/invite-code.js` (le code que le coach peut consulter dans ses réglages) scopé à sa propre salle plutôt qu'un seul code global.

**Gap connu, documenté, pas corrigé dans ce lot** : le chemin d'auto-réparation de `resolveRole()` (profil manquant recréé à la volée, cas rare) n'a pas de code d'invitation à disposition pour résoudre un `gym_id` — le profil réparé atterrit avec `gym_id null`, ce qui l'échoue **côté fermé** (invisible à tout coach) plutôt que fuiter dans la mauvaise salle. Sûr, mais nécessiterait un rattrapage manuel si ça se déclenche un jour pour un vrai utilisateur (même genre de fix ponctuel que celui déjà fait à la main le 2026-08-05).

**`CoachDashboard.jsx`/`ClientsList.jsx`/`MemberDetail.jsx` : aucun changement de code nécessaire** — ils font déjà de simples `select('*')` avec le token de session du coach, sans clé `service_role`, donc le nouveau RLS scope automatiquement leurs résultats sans rien toucher côté frontend. C'est tout l'intérêt de corriger au niveau RLS plutôt qu'en ajoutant des filtres dans chaque écran.

**Explicitement pas fait dans ce lot** (chantier distinct, à reprendre séparément) : inscription self-service pour qu'une nouvelle salle/coach crée sa propre salle sans intervention manuelle d'Arnaud — aujourd'hui une seule salle existe (`VOLTA FITNESS`), créée par ce script, pas par un flow produit.

**Vérifié** : `npm run build` passe, `node --check` sur les 2 fichiers `api/*.js` modifiés, `gym_id` confirmé dans le bundle compilé, policies confirmées via `pg_policies` (13 lignes, correspondent exactement à l'intention), `get_advisors` propre après le fix `anon` sur `my_gym_id()` (aucune nouvelle alerte introduite par ce changement).

## 2026-08-10 — Session 18 (suite 85) : Playwright testé pour de vrai — bloqué par l'infra du bac à sable, pas par manque de capacité

Suite directe à la suite 84 (point "vérification visuelle réelle") : demande explicite de prouver que ça marche, par une vraie capture d'écran de la prod. Testé pour de vrai, pas juste supposé.

**Ce qui marche** : `playwright` installable (`npm install --no-save playwright`, pas ajouté en dépendance du projet — testé puis désinstallé, `git status` propre après), le binaire Chromium pré-installé (`/opt/pw-browsers/chromium-1194/chrome-linux/chrome`) se lance et navigue.

**Ce qui bloque, root-caused avant d'abandonner** : le trafic sortant de ce bac à sable passe par un proxy d'entreprise qui ré-termine le TLS (`HTTPS_PROXY=http://127.0.0.1:34863`, CA à `/root/.ccr/ca-bundle.crt`). curl fait confiance à ce certificat (déjà installé dans le magasin système `/etc/ssl/certs`), mais **le Chromium de Playwright utilise son propre magasin de confiance (NSS), séparé du magasin système** — confirmé en testant `https://github.com` qui renvoie explicitement `ERR_CERT_AUTHORITY_INVALID` (pas une simple coupure réseau). Corriger ça demande `certutil` (paquet `libnss3-tools`), **indisponible ici** : `apt-get install` échoue avec une 404 sur `security.ubuntu.com` pour ce paquet précis — panne du miroir, même symptôme déjà rencontré avec `poppler-utils` plus tôt cette session, pas un blocage de politique réseau (le proxy status endpoint ne loggue aucun refus pour ce host).

**Explicitement refusé** : contourner via `--ignore-certificate-errors` ou `ignoreHTTPSErrors: true` — consigne stricte de ne jamais désactiver la vérification TLS dans cet environnement, même pour un test ponctuel. Root local (`vite preview`) pas non plus utilisable : pas de `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` dans ce bac à sable (déjà documenté en session 12).

**Conclusion honnête, donnée telle quelle à l'utilisateur** : la capacité Playwright existe réellement et fonctionnerait dans un environnement sans cette interception TLS (ex: GitHub Actions), mais **pas dans ce bac à sable précis, pour l'instant** — pas une limite de Claude Code, une limite d'infra locale (mirroir apt cassé) qui pourrait se résoudre un autre jour. Pas de capture d'écran fournie, aucune n'a été fabriquée pour faire semblant que ça marchait.

## 2026-08-10 — Session 18 (suite 84) : vision long terme clarifiée (B2C + SaaS coach + marketplace), marketplace parkée, priorité actée sur le SaaS coach

Suite directe à l'avis honnête de la suite 83 : discussion sur la vraie ambition du projet avant de se lancer dans les corrections de fond.

### La vision, telle que formulée par Arnaud

VOLTA en marque blanche, à terme sur 3 couches distinctes :
1. **App membre B2C** (nutrition, séances, IA coach) — existe déjà, fonctionne.
2. **SaaS coach** (suivi clients, dashboard) — partiellement construit (`CoachDashboard.jsx`/`ClientsList.jsx`/`MemberDetail.jsx`), **priorité actuelle**.
3. **Marketplace de mise en relation** (trouver/réserver un coach ou une salle spécialisée — CrossFit, Pilates, Street workout — près de chez soi) — **n'existe pas du tout dans le code aujourd'hui**, mise de côté explicitement pour plus tard.

Objectif assumé : ne pas voir petit, un vrai "tout-en-un" à terme (comparable à ce que Mindbody est devenu après avoir démarré plus étroit).

### Avis donné avant de se lancer

L'ambition n'est pas jugée déraisonnable (des acteurs réels ont fini par faire les trois — ClassPass, Trainerize, Mindbody — mais aucun n'a démarré en faisant les trois en même temps). Limites concrètes posées, pour mémoire :

- **Sécurité, pas juste dette** : `CoachDashboard.jsx`/`ClientsList.jsx` renvoient aujourd'hui *tous* les membres sans filtre de salle — sans risque tant qu'il n'y a qu'un seul coach (Arnaud), mais une vraie fuite de données dès qu'un 2ᵉ coach est ajouté. Prérequis avant toute extension multi-coach, pas une amélioration optionnelle.
- **Aucune infra de paiement** (Stripe, abonnements, facturation) — nécessaire pour la marketplace ET pour un vrai SaaS coach payant.
- **Aucune brique de découverte/confiance** (recherche géolocalisée, filtres par spécialité, avis, vérification de certifications) — bloquant spécifiquement pour la marketplace.
- **Responsabilité civile/légal** : mettre en relation des inconnus pour du sport physique engage une question d'assurance qui ne se résout pas en code — nécessite un avis juridique/assurance en amont, pas construite ici.
- **Problème de démarrage à froid** propre aux marketplaces (besoin d'offre ET de demande simultanément) — structurellement le go-to-market le plus dur des trois couches.
- **Méthode de construction actuelle** (une personne + une IA, zéro test, zéro revue humaine à part Arnaud, zéro vérification visuelle jusqu'à ce soir) : suffisante pour un MVP mono-salle testé par son propre créateur, pas pour opérer en sécurité une marketplace avec paiement et responsabilité physique entre inconnus.

### Décision actée

- **Marketplace explicitement parkée** — gardée ici pour mémoire, pas de travail dessus tant que ce n'est pas redemandé.
- **Priorité confirmée : terminer le SaaS coach d'abord.** Ce qui inclut, dans l'ordre proposé et non encore commencé à la fin de cette suite :
  1. **Fondations multi-salles** (`gym_id`, RLS corrigé pour scoper un coach à ses vrais membres, vrai lien coach↔membres en base) — utile même si le projet s'arrête au SaaS coach, prérequis strict pour tout le reste.
  2. **Vérification visuelle réelle** — Chromium/Playwright découverts disponibles dans l'environnement de dev cette session (jamais utilisés jusqu'ici, tout reposait sur grep du bundle compilé) ; à tester concrètement.
  3. **Tests automatisés** sur la logique critique (streak, calories/macros, bornes de validation).

**Rien codé dans cette suite** — discussion produit uniquement, consignée avant de démarrer le travail effectif à la suite suivante.

## 2026-08-10 — Session 18 (suite 83) : décision jour de repos + avis honnête sur l'application, demandé directement

Deux questions posées frontalement par l'utilisateur en clôture de session : "c'est quoi le mieux pour le jour de repos ?" et "sois honnête, tu penses quoi de toute l'application ?". Consignées ici telles que répondues, sans les édulcorer — l'utilisateur a explicitement demandé la franchise.

### Jour de repos : passif confirmé, pas d'action requise de l'utilisateur

Question posée après la livraison de la suite 82 : "donc l'utilisateur peut entrer des jours de repos ?" — non, le mécanisme est **100% automatique**, aucun bouton "je prends mon repos", rien à cliquer. Le badge "🛡️ Jour de repos disponible" n'est qu'informatif.

**Recommandation tranchée (passif > actif) et raison** : rendre le mécanisme actif (l'utilisateur doit "réserver" son jour de repos) réintroduirait exactement le risque que la tolérance existe pour éviter — un oubli de clic ferait perdre un streak qui aurait dû être protégé. Le seul cas où l'actif aurait un vrai intérêt, c'est la planification à l'avance ("je pars en week-end samedi, je réserve maintenant") — mais c'est une feature différente (calendrier de repos prévu), pas un remplacement du mécanisme actuel. Pas demandé, pas construit.

### Avis honnête sur l'application (demandé explicitement, en regardant le journal dans son ensemble)

**Points forts réels** :
- Données réelles de bout en bout (nutrition, séances, streak, classement, messagerie temps réel) — vérifié directement en base à de nombreuses reprises tout au long de ce journal, pas supposé.
- IA réellement utile, pas décorative : scan photo croisé avec Open Food Facts (pas de chiffres hallucinés en sortie finale), génération de recette avec budget calorique calculé sur le vrai reste du jour, estimation de quantité en langage naturel.
- Sécurité prise au sérieux (RLS, policies, aucune clé API exposée côté client, escalade de privilège trouvée et corrigée).
- Rythme d'itération rapide sur les retours utilisateur réels — cette session en est l'exemple le plus dense (dizaines de bugs corrigés le jour même sur simple capture d'écran).

**Points d'inquiétude réels** :
- **Zéro test automatisé, nulle part dans le stack.** Toute vérification (y compris celle de ce journal, systématiquement) se limite à "le build passe + grep du bundle compilé" — ça attrape les fautes de câblage, pas les bugs de logique. Le bug d'arrondi flottant sur les macros, le bug `skipFirstPersist` (données du jour écrasées en silence), et l'onglet Course entièrement fake : aucun des trois n'a été détecté par un outil, seulement parce que l'utilisateur a regardé une vraie capture d'écran ou posé la bonne question au bon moment.
- **L'onglet Course fake est le signal le plus sérieux trouvé dans tout ce journal** : un écran entier avec GPS simulé (+0.0032km/s par minuteur), BPM figé à 142, stats hebdo codées en dur — resté en production sans être repéré pendant une durée non déterminée (identifié en suite 39, supprimé en suite 82). Preuve concrète que des écrans peuvent partir à moitié faits/mockés en prod sans que ça saute aux yeux.
- **Dette structurelle documentée depuis des sessions entières, jamais traitée** : pas de `gym_id`/notion de salle dans le schéma, pas de lien coach↔membres formalisé en base, pas d'onboarding self-service pour un coach. L'app fonctionne très bien pour une salle unique (la tienne) mais n'est pas architecturée pour en accueillir une deuxième sans un vrai chantier.
- **Aucune vérification visuelle/fonctionnelle réelle possible dans ce bac à sable** — pas de navigateur, jamais. Chaque "c'est en ligne" de ce journal reste non confirmé visuellement de mon côté tant que l'utilisateur ne l'a pas regardé en vrai sur la prod.
- **Beaucoup d'allers-retours sur des détails cosmétiques** shippés puis retouchés (exemple frappant, dans l'heure : l'icône du sélecteur d'eau — goutte → SVG bouteille → goutte → SVG verre → émoji verre) — reflète un pattern général du journal : décider en shippant plutôt qu'en prévisualisant avant, ce qui a un coût réel en cycles même si le résultat final reste correct.

**Verdict, en une phrase** : une app solide et honnête pour ce qu'elle est — un outil pour une salle unique, construit vite avec de vraies données et une IA qui sert à quelque chose — mais qui tient sur de l'itération réactive rapide plutôt que sur une rigueur d'ingénierie établie (pas de tests, pas de vérification visuelle réelle, pas de QA formelle), avec une dette structurelle connue qui bloquerait un vrai passage au multi-salles sans un chantier dédié.

## 2026-08-09 — Session 18 (suite 82) : suppression de l'onglet Course (fake), météo réelle déplacée sur l'accueil, paliers de streak + jour de repos visible

Suite à 3 questions posées directement (chantier Course, niveau de gamification, propositions streak), réponses tranchées avec l'utilisateur avant de coder, puis 4 changements livrés dans le même lot.

**1. Onglet "Course" de Workout supprimé** (`src/components/RunContent.jsx` supprimé, tab retiré de `Workout.jsx`, CSS `.workout-tabs`/`.workout-tab` mort nettoyé). Recommandation confirmée par l'utilisateur ("On supprime") après relecture précise du fichier en suite 39 : distance incrémentée par un minuteur fixe (+0.0032km/s, jamais de vrai GPS), BPM figé à "142 bpm", graphique d'allure et stats "cette semaine" tous codés en dur — une coquille qui pouvait faire croire à de vraies stats. La carte "COURSE" du Dashboard (retravaillée plus tôt cette session — km logués, objectif réel, jauge) couvre déjà honnêtement le même besoin.

**2. Météo réelle déplacée sur le Dashboard.** Seule partie authentique de l'ancien écran Course (vraie géoloc + Open-Meteo + géocodage inverse BigDataCloud) — sauvée avant suppression du fichier. Question posée à l'utilisateur ("ou ça fait trop ?") : recommandation de l'intégrer en une seule ligne compacte fusionnée dans la date déjà affichée ("Dimanche 9 Août · ☀️ 22°C · Paris"), plutôt qu'une nouvelle carte dédiée — le Dashboard est déjà dense (streak, calories, 4 cartes d'activité, CTA séance, carte hebdo), une carte météo de plus aurait été un bloc visuel superflu pour du nice-to-have. `useWeather()` (hook local à `Dashboard.jsx`), best-effort silencieux comme l'original.

**3. Paliers de streak (7/30/60/90/120... jours).** Confirmé par l'utilisateur avec la règle exacte demandée ("après 30 jours, 60 jours, 90 jours etc."). `STREAK_MILESTONES = [7,30,60,90,120,...365]`, badge "🏅 Palier X jours" affiché sur la carte streak du Dashboard quand atteint.

**Position prise sur "il faut pas dénaturer l'application"** (demande explicite de mon avis après relecture minutieuse du journal) : le badge reste lié au streak **en cours**, pas un trophée permanent — s'il casse, le badge disparaît jusqu'à ce qu'il soit regagné. Un vrai système de succès persistants (table dédiée, écran de collection) est un chantier bien plus lourd et rapprocherait VOLTA d'une appli arcade/gamifiée grand public, alors que la direction affirmée dans ce même journal est "premium/futuriste" (voir la tâche "Direction visuelle futuriste premium" et le ton général des choix de design corail). Un badge éphémère célèbre la régularité sans faire glisser l'app vers autre chose qu'elle n'est pas.

**4. Jour de repos toléré rendu visible.** La tolérance existait déjà en silence (1 jour "gelé" par semaine glissante dans `calculateStreak`) mais n'était jamais montrée. Nouvelle fonction `calculateStreakDetails()` dans `utils/streak.js` (garde `calculateStreak()` intact, `fetchStreakDetails()` nouveau, `fetchStreak()` inchangé) qui expose aussi `restDayAvailable` — vrai si aucun freeze n'a été utilisé dans les 6 derniers jours. Affiché sur la carte streak : "🛡️ Jour de repos disponible cette semaine".

**Questions produit répondues avec avis tranché, pas d'exécution automatique** :
- Course : recommandation de suppression, confirmée par l'utilisateur avant de toucher au code.
- Gamification actuelle : jugée correcte mais incomplète (streak + classement hebdo, tous les deux réels — contrairement à Course — mais aucun signal de progression perso hors comparaison) ; c'est précisément le trou que comblent les paliers de streak de cette suite.
- Météo : question ouverte de l'utilisateur, réponse tranchée (compact, pas de nouvelle carte) plutôt que la faire à moitié.

**Vérifié** : `npm run build` passe. `RunContent` absent du bundle compilé (zéro occurrence, confirmé retiré proprement). "Palier ", "Jour de repos disponible cette semaine", `bigdatacloud.net/data/reverse-geocode-client` et `open-meteo.com` confirmés dans le bundle JS compilé.

## 2026-08-09 — Session 18 (suite 81) : verre gardé, mais en émoji plutôt qu'en SVG dessiné à la main

Retour sur la suite 80 : "on garde les verres... tu peux pas prendre une verre dans la bibliothèque d'émoji ?" — verre validé, mais l'implémentation en SVG custom remplacée par l'émoji 🥛 (le plus proche d'un "verre" dans la bibliothèque Unicode — pas d'émoji verre d'eau à proprement parler, 🥛 est techniquement un verre de lait, mais c'est la vraie forme de verre disponible la plus proche).

**Historique complet de cette icône, pour mémoire** : 💧 goutte (73) → SVG bouteille (78, rejeté) → 💧 goutte (79) → SVG verre (80) → 🥛 émoji verre (cette suite, retenu).

`GlassIcon` (composant SVG) retiré, CSS `.water-bottle-btn`/`.filled` repris en version opacité/niveaux de gris (adaptée à un emoji plutôt qu'à un SVG `currentColor`) — même bascule déjà faite en suite 79 lors du retour à la goutte.

**Vérifié** : `npm run build` passe, 🥛 confirmé dans le bundle compilé, `GlassIcon` absent du code source.

## 2026-08-09 — Session 18 (suite 80) : essai verres d'eau pour le sélecteur d'eau (3e itération sur cette icône)

Suite directe de la 79 : "Essaie avec des verres d'eau pour voir" — explicitement un essai à valider, pas une confirmation.

**Historique de l'icône sur ce même sélecteur, pour mémoire** : 💧 goutte (suite 73, initial) → 🧴/SVG bouteille (suite 78, rejeté "tellement laides") → 💧 goutte remise (suite 79) → verre (cette suite, à valider).

**Fix** : nouveau `GlassIcon` (`Dashboard.jsx`) — verre trapézoïdal (plus large en haut) avec une ligne de niveau d'eau, en `currentColor` (même convention que l'essai bouteille : piloté par la classe `.filled` déjà en place, pas de logique dupliquée). Aucun émoji Unicode ne représente un verre d'eau (🥛 = lait), d'où un petit SVG comme pour la bouteille. Texte mis à jour en cohérence : "Combien de verres as-tu bus ?", "Chaque verre = 500ml".

**Vérifié** : `npm run build` passe, "Combien de verres as-tu bus" et "Chaque verre = 500ml" confirmés dans le bundle compilé.

## 2026-08-09 — Session 18 (suite 79) : retour en arrière sur la suite 78 — les gouttes remises, le pictogramme bouteille jugé "tellement laid"

Retour direct, sans détour : "Remet les gouttes en vrai tes bouteilles sont tellement laides mon Dieu". Le pictogramme SVG construit en suite 78 (censé répondre à "ce ne sont pas des bouteilles") a été rejeté esthétiquement — repris l'émoji 💧 d'origine.

**Fix demandé avec l'émoji** : le texte ne correspondait plus une fois les gouttes remises ("Chaque bouteille = 500ml" alors que l'icône est une goutte) — corrigé en "Chaque goutte = 500ml" et "Combien de gouttes as-tu bues ?" (était "bouteilles"), pour que le texte et l'icône disent la même chose.

`BottleIcon` (composant + toute logique `currentColor`) retiré, CSS `.water-bottle-btn`/`.filled` repris tel qu'avant la suite 78 (opacité + niveaux de gris plutôt que `color`, propre à un emoji plutôt qu'à un SVG).

**Vérifié** : `npm run build` passe, "Combien de gouttes as-tu bues" et "Chaque goutte = 500ml" confirmés dans le bundle compilé, plus aucune référence à `BottleIcon` dans le code source.

## 2026-08-09 — Session 18 (suite 78) : le sélecteur d'eau montrait des gouttes, pas des bouteilles ("ce ne sont pas des bouteilles igo")

Signalé directement sur capture : le sélecteur "Combien de bouteilles as-tu bues ?" (suite 73) affichait des 💧 (goutte d'eau), pas des bouteilles — demande initiale explicitement "des bouteilles".

**Pas d'emoji Unicode satisfaisant** : aucun emoji standard ne représente vraiment une bouteille d'eau (🧴 = flacon cosmétique/lotion, 🍾 = champagne). Construit à la place un petit pictogramme SVG dédié (`BottleIcon`, `Dashboard.jsx`) — bouchon + col + corps arrondi, en `currentColor` pour que l'état rempli/vide reste piloté par la même classe CSS `.filled` déjà en place (couleur accent vs. gris atténué), sans dupliquer la logique.

**Vérifié où d'autres 💧 restent utilisés dans le code avant de conclure** (grep) : le label "💧 HYDRATATION" de l'écran Hydratation dédié et l'icône de la carte "EAU" sur le Dashboard — deux usages différents, légitimes, non concernés par la remarque (qui visait uniquement le sélecteur de la sheet).

**Vérifié** : `npm run build` passe, `fillOpacity` (attribut du nouveau SVG) confirmé dans le bundle compilé ; les seules occurrences restantes de 💧 dans le code source sont bien les deux usages légitimes ci-dessus, pas le sélecteur.

## 2026-08-09 — Session 18 (suite 77) : le petit trait "glisser vers le bas" des sheets ne faisait rien

Signalé directement sur capture : au-dessus de la sheet "Course", un petit trait gris (`.modal-handle`, convention standard iOS/Android pour "glisse vers le bas pour fermer") ne réagissait à aucun geste — purement décoratif, aucun écouteur de touch derrière.

**Vérifié où d'autres sheets ont ce même trait avant de corriger un seul endroit** (grep sur `modal-handle`) : seuls `Dashboard.jsx` (sheet d'édition des cartes d'activité) et `ExerciseModal.jsx` (modale détail d'exercice) affichent ce trait — les sheets de `Nutrition.jsx` n'en ont pas du tout (donc rien à corriger là, pas de faux "ça marche pas" à traiter).

**Fix** : nouveau hook `src/hooks/useSwipeToDismiss.js`, réutilisé sur les deux écrans plutôt que dupliqué — suit le déplacement vertical du doigt (vers le bas seulement), applique `translateY` en direct pendant le geste, et ferme la sheet si le relâchement dépasse 80px, sinon revient en place avec une petite transition. Le trait visuel (36×4px) étant trop petit pour être une cible fiable, il est maintenant enveloppé dans une zone tactile plus large (`.sheet-drag-zone`, pleine largeur, ~20px de haut) qui capte le geste.

**Vérifié** : `npm run build` passe, classe `.sheet-drag-zone` confirmée dans le CSS compilé et utilisée dans les deux écrans (comptée 2 fois dans le bundle JS).

## 2026-08-09 — Session 18 (suite 76) : objectifs des 4 cartes d'activité modifiables directement depuis la carte (plus besoin de Réglages)

Retour direct sur la suite 74 : "passer par Réglages pour ça c'est pas ouf, il faut rendre le chemin simple, quand je clique sur la carte je peux modifier mes objectifs et voir ma progression". 3 questions posées avant de coder (chemin unique ou dupliqué avec Réglages, Course/Sommeil doivent-ils devenir de vrais objectifs réglables, niveau de détail de "voir ma progression") — les 3 réponses recommandées confirmées.

**Base de données** : deux colonnes ajoutées à `objectifs` (appliquées en direct via Supabase MCP + répercutées dans `scripts/supabase_schema.sql`, confirmées via `information_schema.columns`) : `km_objectif numeric default 5`, `sommeil_h_objectif numeric default 8`. Steps/eau avaient déjà `pas_jour`/`eau_ml`.

**`AppContext.jsx`** : nouvelle fonction `updateGoal(key, value)` — reflète localement puis upsert **une seule colonne** dans `objectifs` (au lieu de repasser par le flow complet `updateUserProfile` de Réglages, qui réécrit tout l'objet d'un coup). `kmRunGoal`/`sleepGoal` ajoutés à l'état initial (défauts 5/8, mêmes valeurs que les défauts DB) et à la requête `objectifs` fetchée au chargement.

**`Dashboard.jsx`** : la sheet d'édition de chaque carte (pas/course/eau/sommeil) affiche maintenant, avant le champ de saisie du jour :
- une barre de progression + `valeur/objectif — X%` (repris de la carte, en plus grand) ;
- un champ "Objectif" éditable inline, sauvegardé automatiquement (`onBlur`/Entrée) via `updateGoal` — action distincte de "ENREGISTRER" (qui logge la valeur du jour), pour ne jamais confondre les deux.

**`Settings.jsx` / `AuthContext.jsx`** : champs Eau/Pas retirés de Réglages (ne restent que Calories/Protéines, plus complexes/liés au(x) objectif(s) choisis). Piège évité en le faisant : `saveGoals()` ne passe plus `waterGoal`/`stepsGoal` à `updateUserProfile()` — sans le fix côté `AuthContext.jsx` (l'upsert `objectifs` faisait `eau_ml: profile.waterGoal ?? 2500` inconditionnellement), sauvegarder juste les calories aurait silencieusement réécrasé l'eau/les pas définis depuis la carte avec les défauts d'onboarding à chaque fois. Corrigé pour n'inclure `eau_ml`/`pas_jour` dans l'upsert que si explicitement fournis — même piège déjà documenté une fois sur ce même bout de code, cette fois corrigé à la racine plutôt qu'en forçant chaque appelant à toujours tout renvoyer.

**Vérifié** : `npm run build` passe. `kmRunGoal`, `sleepGoal`, `km_objectif`, `sommeil_h_objectif`, `.sheet-goal-row`, `.sheet-progress-row` confirmés dans les bundles JS/CSS compilés. Colonnes DB confirmées présentes via requête Supabase.

## 2026-08-09 — Session 18 (suite 75) : bug d'arrondi flottant sur les macros ("LIPIDES 51.10000000000001G") + explication de "dont +790 activité"

Capture réelle : `Nutrition.jsx` affichait `51.10000000000001G` sur la carte Lipides — bug classique d'addition flottante JS (ex: `45.8 + 5.3` ne donne pas exactement `51.1` en IEEE 754). Root-caused dans `AppContext.jsx` : `protein`/`carbs`/`fat` s'accumulent par simple addition (`prev.fat + meal.fat`) à 3 endroits — `addMeal()`, `deleteMeal()`, et surtout le `reduce()` qui recalcule les totaux du jour depuis `repas` à **chaque fetch** (donc à chaque chargement/rafraîchissement de page, pas seulement pendant la session en cours) — sans jamais arrondir le résultat.

**Fix** : arrondi à 1 décimale (`Math.round(n*10)/10`, même précision déjà utilisée ailleurs — `calcNutrition`, `foodEstimate.js`) appliqué aux 3 endroits. `calories` arrondi à l'entier au passage (même risque, moins visible car déjà des entiers en pratique).

**Question annexe répondue** : "dont +790 activité" (carte calories) = les kcal en plus gagnées aujourd'hui grâce à l'activité déjà loggée (≈0,045 kcal/pas + ≈1 kcal/kg/km couru, `utils/metabolism.js`), ajoutées à l'objectif de base pour calculer "Restant" — logique déjà en place depuis la suite "budget calorique lié à l'activité", affichage volontairement détaillé plutôt que caché dans un total global.

**Vérifié** : `npm run build` passe.

## 2026-08-09 — Session 18 (suite 74) : objectif invisible sur les cartes du Dashboard (pas/eau/course/sommeil) + steps ignorait le vrai objectif configurable

Suite directe de la 73 : "je viens de mettre les pas que j'ai faits (17 557), mais je ne vois pas d'objectif, la jauge se remplit ok mais pourquoi".

**Deux bugs distincts trouvés en vérifiant chaque carte, pas juste celle citée :**
1. **Objectif jamais affiché nulle part** : les 4 cartes (`Dashboard.jsx`, `CARDS`) avaient chacune un `target` utilisé uniquement pour calculer le `%` de la barre — aucun texte ne montrait ce nombre à l'utilisateur, donc la barre se remplit sans qu'on sache par rapport à quoi. Ajout d'une ligne "Objectif : X{unité}" sous la valeur, sur les 4 cartes.
2. **Carte "PAS" : `target: 10000` codé en dur**, alors qu'un vrai objectif configurable existe déjà et fonctionne (`appData.stepsGoal`, réglable dans Réglages, déjà utilisé ailleurs) — la barre se remplissait donc contre un chiffre qui n'avait aucun rapport avec l'objectif réel défini par l'utilisateur. Corrigé pour utiliser `appData.stepsGoal`.

**Carte "COURSE" — limite honnête** : contrairement à pas/eau, il n'existe aucun objectif configurable en base ou dans Réglages pour le running (`target: null` avant ce fix). Pas de solution propre sans ajouter un nouveau champ objectif (comme `stepsGoal`/`waterGoal`) — non fait ici pour rester dans le scope demandé. Mis un défaut d'affichage (5km) pour que la carte ait un objectif visible comme les 3 autres, mais ce chiffre n'est pas personnalisable pour l'instant — à traiter comme un vrai réglage si demandé (même pattern que `stepsGoal`/`waterGoal`).

**Vérifié** : `npm run build` passe, "Objectif : " confirmé dans le bundle JS compilé (2 occurrences : macros + activité), classe `.activity-card-goal` confirmée dans le CSS compilé.

## 2026-08-09 — Session 18 (suite 73) : carte Eau du Dashboard — bouteilles cliquables au lieu d'un champ "ml" à taper

Demande directe : "je lis 'Eau bue ajd (ml)'... on peut le rendre plus simple, tu mets plusieurs bouteilles (genre 5), l'utilisateur clique sur une bouteille, ça correspond à la moitié d'un litre". Écran concerné : la sheet d'édition de la carte "EAU" du Dashboard (`Dashboard.jsx`, `editingCard === 'water'`) — différent de l'écran Hydratation dédié (`Hydration.jsx`), qui a déjà des boutons +150/250/330/500ml et n'était pas visé par la remarque.

**Comportement clarifié avant de coder** (ambigu entre "chaque clic ajoute +500ml en cumulé" et "les bouteilles représentent un niveau à sélectionner") : confirmé remplissage progressif — cliquer sur la 3e bouteille remplit 1-2-3 d'un coup (1500ml), recliquer sur la dernière remplie la vide (permet de corriger une erreur sans repasser par un clavier).

**Fix** : nombre de bouteilles dérivé du vrai objectif (`appData.waterGoal`, 5 pour l'objectif par défaut 2500ml — au passage, la carte utilisait un `target: 2500` codé en dur, décorrélé du vrai objectif configurable dans Réglages ; corrigé pour utiliser le même `waterGoalMl` que le nouveau sélecteur de bouteilles, sinon la barre de progression de la carte et l'état rempli/vide des bouteilles auraient pu se contredire). Champ texte + bouton "ENREGISTRER" remplacés par une rangée de bouteilles (`setWaterBottles(index)`) uniquement pour `editingCard === 'water'` — les autres cartes (pas, course, sommeil) gardent le champ numérique existant, inchangé.

**Vérifié** : `npm run build` passe, "Combien de bouteilles as-tu bues" et "chaque bouteille = 500ml" confirmés dans le bundle JS compilé, classes `.water-bottle-btn` confirmées dans le CSS compilé.

## 2026-08-09 — Session 18 (suite 72) : impossible de supprimer un aliment détecté (ex: "Pêche") sur les écrans de révision multi-ingrédients

Capture directe de "Décrire un repas" : 5 aliments détectés, l'utilisateur veut retirer "Pêche" (ajoutée par erreur/pas mangée) mais aucun bouton de suppression n'existait — seul le grammage était modifiable.

**Vérifié où le même problème pouvait se poser** avant de corriger un seul endroit : `updateItemGrams`/`updateDescribeItemGrams` acceptaient déjà 0g ("0g is allowed here (lets the user exclude a detected item from the total)" — un contournement déjà prévu dans le code, mais qui laisse la ligne visible à "0 kcal" au lieu de la retirer, pas ce qui a été demandé). Deux écrans construits sur exactement le même écran de révision par item : la sheet "Décrire un repas" (`Nutrition.jsx`) et l'écran de résultat du Scanner photo/code-barres (`Scan.jsx`) — les deux partagent la logique de `src/utils/foodEstimate.js` mais gardent chacun leur propre state/JSX de liste.

**Fix, appliqué aux deux écrans** : bouton "✕" par ligne d'aliment (`removeDescribeItem`/`removeItem`), qui retire l'item du tableau au lieu de le mettre à 0g. Bouton "Ajouter"/"Ajouter au journal" désactivé si la liste devient vide (plus rien à logger), avec un message "Tous les aliments ont été supprimés." à la place de la liste vide.

**Vérifié** : `npm run build` passe, "Supprimer cet aliment" et "Tous les aliments ont été supprimés" comptés 2 fois chacun dans le bundle compilé (une occurrence par écran, confirmant que les deux ont bien reçu le fix).

## 2026-08-09 — Session 18 (suite 71) : liste "REPAS D'AUJOURD'HUI" tronquée à 3, avec "Voir tout" pour dérouler le reste

Capture confirmant que la restructuration de la suite 70 fonctionne bien en vrai (Skyr naturel 68g bien estimé pour 3 cuillères). Remarque de suivi sur la disposition : "REPAS D'AUJOURD'HUI" affiche tous les repas sans limite, la page devient interminable au fil de la journée. Proposition initiale de l'utilisateur (titre cliquable qui replie tout) écartée au profit d'une version qui ne cache rien au premier coup d'œil : les 3 repas les plus récents restent visibles direct, un lien "Voir tout (X repas) →" déplie le reste sur la même page (pas de nouvelle page, pas de repli total qui masquerait le log du jour). Confirmé par l'utilisateur avant de coder.

**Fix** : `Nutrition.jsx`, nouvel état `showAllMeals` (bool). `appData.meals.slice(0, 3)` par défaut, liste complète une fois "Voir tout" cliqué. Le lien n'apparaît que si plus de 3 repas sont loggés.

**Vérifié** : `npm run build` passe, "Voir tout (" et "repas) →" confirmés dans le bundle compilé.

## 2026-08-09 — Session 18 (suite 70) : "Une recette depuis mon frigo" promue au même niveau que "Décrire un repas" + suppression du menu source à 2 niveaux

Question directe après la suite 69 : "Décrire un repas c'est une feature forte, tout comme la feature photo du frigo — elle ne doit pas être visible aussi ?". Vérifié : la photo du frigo était cachée à 2 niveaux — taper "Idée recette", PUIS choisir "photo" parmi 3 options (auto/photo/lien) qui n'apparaissaient qu'à cette étape. Confirmé par l'utilisateur : "enlève les longs chemins inutiles, que tout soit simple d'accès".

**Nuance technique vérifiée avant de tout aplatir** : le choix du repas (matin/midi/soir/snack) n'est pas de la friction gratuite — `getMealBudget(type)` calcule un budget calorique/macros réellement différent selon le repas choisi, utilisé dans le prompt de génération des 3 sources (auto/photo/lien). Contrairement au grammage de "Décrire un repas" (une simple étiquette de classement posée après coup), ici le repas choisi influence vraiment le contenu généré — impossible de le supprimer sans dégrader la pertinence des suggestions.

**Restructuration** : le menu à 2 niveaux ("choisis le repas" PUIS "choisis la source") devient 1 seul niveau — la source est maintenant choisie EN AMONT en tapant l'une des 3 entrées dédiées sur l'écran principal (`recipeSource`, nouvel état), et `chooseMealType()` va directement à l'action correspondante une fois le repas choisi (plus de menu à 3 options intermédiaire) :
- **"Une recette depuis mon frigo"** (nouveau label, remplace le "Depuis une photo" enterré) — choix du repas → ouverture directe de l'appareil photo.
- **"Idée recette"** (garde son intitulé, suggestion automatique) — choix du repas → génération directe.
- **Lien TikTok/Reel** — reste accessible en 1 tap mais sans carte pleine largeur dédiée (petit lien texte sous "Idée recette", pour ne pas empiler 3 cartes qui se ressemblent) — choix du repas → champ lien direct (plus de sélection "comment veux-tu la recette" avant).

Nettoyage au passage : l'input caméra caché déplacé hors du bloc conditionnel (il doit être monté avant le clic déclenché depuis l'étape "choix du repas"), état `recipeLinkOpen` devenu mort retiré.

**Vérifié** : `npm run build` passe, "Une recette depuis mon frigo", "Recette depuis ton frigo", "Recette depuis un lien" et "ou depuis un lien TikTok" confirmés dans le bundle compilé. Aucune trace résiduelle de l'ancien menu à 3 options (grep vide sur "comment veux-tu la recette"/"Suggestion automatique").

## 2026-08-09 — Session 18 (suite 69) : "Décrire un repas" (multi-ingrédients) promu sur l'écran Nutrition + fusion Photo/Code-barres dans Scanner

Suite de discussion sur "comment saisir 3 c. à soupe de skyr + 2 c. à soupe de confiture sans se soucier des grammes" — plan validé avant code (deux changements distincts).

**1. "Décrire un repas" déplacé de Scanner vers l'écran principal Nutrition, au-dessus d'Idée recette.** La sheet "Décrire un repas" (suite 66, `Scan.jsx`) gérait déjà plusieurs ingrédients en une seule description — mais vivait derrière une navigation vers `/scan`. Retirée de `Scan.jsx`, reconstruite comme sheet inline dans `Nutrition.jsx` (nouvelle carte juste au-dessus d'Idée recette), même logique de parsing multi-items (prompt Claude + vérification Open Food Facts), même écran de révision (items éditables, chips repas, ajout groupé).

**Refactor** : la logique partagée (`lookupOFF`, calcul des totaux, et maintenant `estimateFoodsFromText`) extraite dans `src/utils/foodEstimate.js` — évite de dupliquer le prompt et la logique OFF entre `Scan.jsx` (toujours utilisé pour photo/code-barres) et `Nutrition.jsx` (nouveau point d'entrée texte).

**2. Scanner : "Prendre une photo" et "Code-barres" fusionnés.** Contrainte technique expliquée et validée avant de coder : la caméra utilisée (`<input capture>`) est l'interface native du téléphone — impossible d'y injecter un toggle personnalisé, on n'a aucun contrôle sur son UI. Alternative retenue : un petit sélecteur à 2 chips ("Repas" / "Code-barres", réutilise `.meal-chip` déjà existant) juste au-dessus d'un unique bouton caméra, qui s'ouvre directement dans le mode choisi. "Galerie" reste un bouton séparé, toujours en mode repas (pas concerné par le toggle).

**Vérifié** : `npm run build` passe. "Décrire un repas", le placeholder multi-ingrédients et "Analyse en cours" confirmés dans le bundle compilé côté Nutrition ; les classes `meal-chip` du nouveau toggle confirmées côté Scanner. Aucune référence résiduelle à l'ancien mode texte de `Scan.jsx` (grep vide).

## 2026-08-09 — Session 18 (suite 68) : "Modifier" un repas ne permettait pas de changer le créneau (matin/midi/soir/snack)

Question directe : coché "Petit-déjeuner" au lieu de "Déjeuner" par erreur, "je fais comment ?". Vérifié : la modale "Modifier" (`Nutrition.jsx`, `editingMeal`) ne permettait de changer que le grammage — pas de sélecteur de repas, contrairement à la sheet d'ajout qui en a un.

**Fix** : ajout du même sélecteur de chips (MEAL_TYPES) que la sheet d'ajout, sous le champ grammage. `saveMealEdit()` envoyait déjà `mealType: editingMeal.mealType` à `addMeal()` — la logique de sauvegarde était déjà prête, seul le sélecteur manquait côté UI.

**Vérifié** : `npm run build` passe, le nouveau label "REPAS" confirmé dans le bundle compilé.

## 2026-08-09 — Session 18 (suite 67) : la suite 66 refaite en inline — pas de nouveau chemin + bouton "+" mal aligné avec le FAB messages

Retour direct sur la suite 66 : "je ne veux pas un nouveau chemin !" — le détour par l'écran Scanner ne convenait pas, la conversion de quantité devait se faire directement dans l'écran de saisie du poids déjà existant (celui qui affiche "QUANTITÉ (G)" après avoir choisi un aliment dans la recherche).

**1. Estimation de quantité, inline, sur l'écran existant** : `Nutrition.jsx`, sous le champ grammes de l'étape 2 (`selectFood` → poids), un lien "Je ne connais pas le poids →" ouvre un petit champ texte + bouton "Estimer" dans le même écran (pas de navigation). Prompt Claude délibérément plus simple que celui de `Scan.jsx` : l'aliment est déjà connu (`selectedFood.name`), seule la conversion quantité → grammes est demandée (`{ "grams": 150 }`), résultat injecté directement dans `gramsInput`. Le chemin de la suite 66 (`Scan.jsx`, "Décrire un repas") reste en place pour la saisie d'un repas complet depuis zéro — les deux répondent à des besoins différents, mais celui-ci est le vrai correctif demandé pour ce cas précis (aliment déjà sélectionné dans la recherche).

**2. Boutons du bas mal alignés (capture 1)** : le bouton "+" (ouvrir la recherche d'aliment, propre à `Nutrition.jsx`) avait `bottom: 90` en dur, alors que le bouton messages (`fab.css`, global) utilise `calc(76px + env(safe-area-inset-bottom))` depuis les fixes de suite 55/56. Les deux ne coïncidaient que par hasard quand la zone de sécurité valait pile 14px — ailleurs (Safari onglet : 76 vs 90 ; standalone : 110 vs 90), ils divergeaient visiblement, exactement ce que montrait la capture. Même formule appliquée aux deux maintenant.

**Vérifié** : `npm run build` passe, "Je ne connais pas le poids", "DÉCRIS LA QUANTITÉ", "Estimation impossible" et `calc(76px + env(safe-area-inset-bottom))` confirmés dans le bundle compilé.

## 2026-08-09 — Session 18 (suite 66) : ajouter un repas par description ("3 oeufs, 4 c. à soupe de skyr") sans connaître le poids en grammes

Demande directe : la recherche d'aliment dans `Nutrition.jsx` (sheet "ajouter un repas") oblige à saisir un poids en grammes — personne ne connaît le poids de "3 oeufs" ou "4 cuillères à soupe de skyr" de tête.

**Solution** : réutilisation du mécanisme d'estimation déjà en place pour le scan photo (`Scan.jsx` — Claude identifie les aliments d'une image et estime leur poids, avec vérification Open Food Facts en fallback) plutôt qu'un nouveau système. Nouveau 4e mode "Décrire un repas" à côté de Photo/Galerie/Code-barres : un champ texte libre, envoyé à Claude avec un prompt dédié qui demande explicitement de convertir les quantités en unités courantes (œufs, cuillères à soupe, tranches, poignées...) en grammes via des poids de référence standards, puis de renvoyer la même structure JSON que le mode photo (`items[]` avec poids total estimé + valeurs pour 100g). Le résultat passe ensuite par le même écran de révision déjà existant (items éditables, vérification OFF, ajout au repas) — aucune UI dupliquée.

**Fichiers touchés** : `src/screens/Scan.jsx` uniquement (nouvel état `textMode`/`textInput`, fonction `handleTextDescription`, nouveau bouton + textarea, icône crayon). Déjà accessible depuis `Nutrition.jsx` via le bouton scanner existant (`navigate('/scan')`), pas de nouveau point d'entrée à créer.

**Vérifié** : `npm run build` passe, "Décrire un repas" et le texte du prompt ("3 oeufs...") confirmés dans le bundle compilé. Pas de test réel de l'appel Claude (nécessiterait une vraie clé API en conditions réelles) — la logique de parsing/estimation réutilise exactement le chemin déjà en production pour le mode photo, donc le même niveau de confiance que celui-ci.

## 2026-08-09 — Session 18 (suite 65) : didacticiel qui saute à gauche avant de se recentrer + section Notifications vide sur iPhone

Deux signalements, tous les deux vérifiés dans le code avant correction, aucun deviné.

**1. Didacticiel décalé à gauche pendant ~320ms** : `OnboardingTour.jsx` utilisait `animation: slideUp 320ms ...` sans importer aucun CSS à lui — il empruntait le `@keyframes slideUp` global défini dans `ExerciseModal.css` (Vite regroupe tout le CSS importé dans une seule feuille de style globale, peu importe quel composant l'a importé ; un nom de keyframe est partagé par tout ce qui l'utilise). Ce keyframe emprunté a `from`/`to` avec `translateX(-50%)` — correct pour `ExerciseModal`, positionné en `absolute; left:50%`, mais faux pour ce panneau, centré en flexbox : pendant les 320ms de l'animation, le transform emprunté le décalait de 50% de sa propre largeur vers la gauche, avant de revenir pile à sa position réelle (centrée) une fois l'animation finie (`fill-mode` par défaut = `none`, donc le transform emprunté disparaît à la fin). Fix : nouveau keyframe dédié `tourSlideUp` (translateY uniquement, aucune hypothèse de positionnement) dans `animations.css` (déjà chargé globalement), `OnboardingTour.jsx` pointé dessus.

**2. Section Notifications vide dans Réglages (membre et coach)** : `pushState !== 'unsupported'` conditionnait TOUT l'affichage — quand non supporté, rien du tout n'apparaissait, pas même une explication. Sur iPhone, Safari restreint l'API Push aux apps installées sur l'écran d'accueil (jamais disponible dans un onglet classique) — donc "non supporté" est le cas par défaut pour la plupart des membres sur iPhone, pas un cas limite. Fix : nouvel état affiché avec message explicite — détection iOS+non-standalone (`isIOSNotStandalone()`, nouveau dans `utils/push.js`) pour dire précisément "ajoute l'app à l'écran d'accueil pour les activer" plutôt qu'un vide silencieux. Appliqué à `Settings.jsx` (membre) et `CoachSettings.jsx` (coach), même bug dans les deux fichiers.

**Vérifié** : `npm run build` passe, `@keyframes tourSlideUp{...translateY...}` et le texte "ajoute VOLTA à ton écran d'accueil" confirmés dans le bundle compilé.

## 2026-08-09 — Session 18 (suite 64) : notification streak — construite sur l'infra push existante

Suite directe à la suite 63 : constat qu'aucune notification de streak n'existait, demande explicite de la construire ("fais fais").

**`api/cron/streak-nudge.js`** (nouveau) : même squelette que `api/cron/inactivity-nudge.js` déjà en place (auth `CRON_SECRET`, client `service_role`, VAPID déjà configurés — rien de nouveau côté env vars). `calculateStreak` dupliqué à l'identique depuis `src/utils/streak.js` (pas importable ici — ce runtime Node ne peut pas charger `lib/supabase.js`, qui lit `import.meta.env`, Vite-only ; même contrainte que pour `inactivity-nudge.js` déjà documentée dans ce fichier).

**Logique** : candidat au nudge = streak actif (≥1 jour) ET rien loggé aujourd'hui ET pas déjà nudgé aujourd'hui (`profiles.last_streak_nudge_at`, comparé par date). Message toujours formulé en invitation, jamais en perte — contrainte explicite du cahier des charges initial du streak, toujours respectée maintenant qu'une notification existe vraiment : *"🔥 X jours de suite — une petite activité aujourd'hui pour continuer sur ta lancée ?"*.

**Schéma** : `profiles.last_streak_nudge_at timestamptz` — appliquée directement en base via Supabase MCP (colonne nullable, additive, sans risque) et répercutée dans `scripts/supabase_schema.sql`, cohérent avec l'instruction en tête de ce fichier ("si tu appliques un fix directement contre prod, mets aussi à jour ce fichier").

**`vercel.json`** : nouvelle entrée cron `0 18 * * *` (18h UTC, rappel de fin de journée plutôt que le matin comme le nudge d'inactivité à 10h — laisse la journée se dérouler avant de relancer).

**Vérifié** : `node --check` sur le nouveau fichier, `vercel.json` validé comme JSON correct, `npm run build` (frontend) passe toujours. Pas de test d'envoi réel (nécessiterait un vrai abonnement push actif sur un compte de test).

## 2026-08-09 — Session 18 (suite 63) : sommeil/course manquaient au reset quotidien local + état des lieux notifications

Question de suivi après la suite 62 : "elles seront à jour à 0 tous les jours ?". Vérifié le reset quotidien local (`clearDay()` + son effet dans `AppContext.jsx`) : `calories`/`water`/`steps`/`protein`/`carbs`/`fat`/`meals` étaient bien remis à 0 chaque nouveau jour (local, `toDateString()`), mais **`sleep` et `kmRun` en étaient absents** — sur un jour neuf, avant que Supabase ne trouve une ligne pour aujourd'hui (il n'y en a pas encore), ces deux champs continuaient d'afficher la valeur mise en cache de la veille au lieu d'un état neutre, contrairement à tout le reste.

**Fix** : ajout de `sleep: sleepFromHours(0)` et `kmRun: 0` à la liste du reset quotidien, `save()` correspondants. Sans risque avec le fix de la suite 62 : `activiteLoaded` est encore `false` à ce stade (le reset tourne avant le fetch Supabase), donc les effets de persistance ne peuvent pas écrire cette remise à zéro en base par erreur.

**Notifications streak** : question directe, vérifiée plutôt que supposée. Aucun système de notification spécifique au streak n'existe (confirmé, comme en suite 60). Il existe en revanche une vraie infrastructure de push déjà en place (`api/send-push.js`, `api/cron/inactivity-nudge.js`, toggle dans Settings/CoachSettings) — dont un cron quotidien d'inactivité déjà formulé positivement ("Ça fait quelques jours... une petite séance aujourd'hui ?"). Réutilisable pour un futur cron streak si demandé, mais rien construit pour l'instant tant que ce n'est pas explicitement demandé.

**Vérifié** : `npm run build` passe.

## 2026-08-09 — Session 18 (suite 62) : bug réel trouvé — sommeil (et eau/pas/km) réécrits en silence chaque jour avec la valeur par défaut

Question d'Arnaud : "les données se mettent à jour chaque jour ? le sommeil est toujours à 7h". Vérifié directement en base (pas supposé) : `activite_jour.sommeil_h = 7.3833...` (= 7h23, exactement le défaut codé en dur `{hours:7, minutes:23}`) sur TOUS les jours depuis le 18 juillet, et `pas`/`eau_ml`/`km_courus` à 0 partout aussi (même défaut, moins visible car 0 ressemble à "rien tracké").

**Cause réelle** : `AppContext.jsx`, les 4 effets qui persistent eau/pas/sommeil/course vers `activite_jour` étaient gardés par `activiteLoaded` pour ne jamais écrire AVANT le fetch du jour — mais rien ne les empêchait d'écrire PENDANT la transition elle-même : au moment exact où `activiteLoaded` passe à `true`, l'effet se redéclenche (il est dans son propre tableau de dépendances) et persiste `appData.sleep`/`.water`/etc. tel qu'il est à cet instant — la valeur par défaut ou celle d'un jour précédent en cache local, jamais une vraie saisie du jour. Résultat : chaque nouvelle ouverture de l'app réécrit silencieusement le défaut sur la ligne du jour, avant même que l'utilisateur ait pu toucher quoi que ce soit.

**Fix** : `skipFirstPersist` (un `useRef` avec un flag par champ) — chaque effet ignore sa toute première exécution une fois `activiteLoaded` passé à `true`, et ne persiste qu'à partir du changement suivant, qui est alors une vraie action utilisateur. Touche les 4 effets (eau, pas, km, sommeil) puisque le même bug les affectait tous.

**Vérifié** : `npm run build` passe, l'objet `{water:true,steps:true,kmRun:true,sleep:true}` confirmé dans le bundle compilé (les noms de propriété d'un objet littéral survivent à la minification, contrairement aux noms de variables).

**Non fait, à valider avec Arnaud séparément** : les lignes déjà polluées en base (tous les jours depuis le 18 juillet) restent fausses tant qu'il ne les édite pas manuellement ou que je ne les nettoie pas — pas touché à ses données réelles sans son accord explicite.

## 2026-08-09 — Session 18 (suite 61) : carte streak toujours visible (pas masquée à 0)

Après la mise en ligne de la suite 60, l'utilisateur ("Arnaud") signale ne pas voir la carte streak et pense à un bug. Vérifié directement en base avant de toucher au code : aucune séance ni repas enregistré sur son compte (`user_id` retrouvé via son email dans `auth.users`) dans les 14 derniers jours — comportement attendu, pas un bug (la carte était volontairement masquée à 0, choix du plan initial).

Une fois confirmé que ce n'était pas un bug, demande explicite de changer ce choix : "je veux qu'elle soit toujours présente". Fait — `Dashboard.jsx` : la carte streak n'est plus conditionnée à `streak > 0`, elle s'affiche toujours. À 0 : flamme atténuée (`opacity: 0.35`) et texte d'invitation ("à toi de commencer aujourd'hui") au lieu du texte "de suite" — pour rester dans l'esprit "pas de perte formulée négativement" déjà posé pour ce chantier, sans reproduire l'ancien choix de masquage.

**Vérifié** : `npm run build` passe, le nouveau texte du fallback à 0 confirmé dans le bundle compilé.

## 2026-08-08 — Session 18 (suite 60) : système de streak (jours consécutifs actifs) — 1re brique de gamification personnelle

Demande précise avec périmètre imposé (fichiers, logique, ordre : plan d'abord, code après validation). Vérifications faites avant tout code : schéma réel de `repas`/`seances` interrogé en direct sur Supabase (pas juste le fichier SQL — colonne `date` de type `date` confirmée sur les deux tables), grep de "streak" dans tout le repo (rien).

**Calcul** : à la volée depuis `seances`/`repas` (2 requêtes légères, fenêtre de 120 jours), pas de colonne dédiée à maintenir — mêmes principes que `fetchMemberActivitySummaries` dans `coachStats.js` (batch, pas une requête par membre).

- `src/utils/streak.js` (nouveau) : `calculateStreak(activeDates, today, maxDays)` — cœur pur et testable. Un jour actif = au moins une séance OU un repas ce jour-là (OR volontaire). "Aujourd'hui" suit la même convention UTC que le reste du code (`todayStr()` d'`AppContext.jsx`, `date default current_date`) — pas de 2e notion de jour. Si aujourd'hui n'a encore rien, le calcul part d'hier (jour pas terminé ≠ jour cassé). Tolérance : 1 jour raté par fenêtre glissante de 7 jours est automatiquement "gelé" (ne casse pas la série, ne l'incrémente pas non plus) — 2 gels doivent être espacés d'au moins 7 jours, ce qui autorise nativement un streak infini avec 1 jour de repos fixe par semaine.
- `fetchStreak(userId)` (dashboard membre) et `fetchStreaksForUsers(userIds)` (liste coach, 2 requêtes batchées au lieu d'une par membre).
- Aucune notification de perte de streak n'existe dans le code (vérifié) — rien à reformuler, rien créé.

**Bug trouvé et corrigé avant tout commit, par un vrai test et pas juste `npm run build`** : la 1re version de `daysBetween` calculait une différence de dates sans valeur absolue. Comme le calcul remonte toujours du présent vers le passé, cette différence était systématiquement négative — donc toujours `< 7`, ce qui bloquait silencieusement tout gel après le premier, quelle que soit la vraie distance. Repéré en testant le cas "repos hebdomadaire régulier" (résultat 12 au lieu de la valeur correcte) avant même de toucher à l'UI. Fix : `Math.abs()`. Retesté ensuite avec 7 scénarios (streak parfait, aujourd'hui vide, trou toléré, 2 trous rapprochés qui cassent, repos hebdo infini, historique vide) contre le fichier réel (pas une copie) — tous corrects après le fix.

**Affichage** :
- `Dashboard.jsx` : nouvelle carte entre la citation et la carte calories, masquée à 0 (pas de flamme éteinte), mise en avant avec `--accent` (bordure + glow) à partir de 3 jours (palier choisi, pas 30).
- `ClientsList.jsx` : streak ajouté sur la ligne "Vu ... · X séances" de chaque carte membre, batché avec `fetchMemberActivitySummaries` existant dans le même `Promise.all` (pas de requête supplémentaire par membre).

**Vérifié** : `npm run build` passe, `fetchStreak`/`fetchStreaksForUsers`/`calculateStreak` (minifiés mais avec `Math.abs` bien présent) et le texte "de suite"/🔥 confirmés dans le bundle compilé. Pas de vérification visuelle réelle au-delà de ça — logique testée unitairement, pas l'UI sur un vrai compte avec des données réelles.

## 2026-08-08 — Session 18 (suite 59) : régression trouvée — le fix de la suite 57 cassait l'en-tête de l'AI Coach quand le clavier s'ouvre

Capture montrant "9:54" (l'horloge du statut bar iOS) superposée sur "AI Coach" (le titre de l'écran), clavier ouvert. Une régression que j'ai moi-même introduite en suite 57, pas une nouvelle piste externe.

**Mécanisme** : le fix de la suite 57 écoutait `window.visualViewport.addEventListener('resize', ...)` pour recalculer `--app-height` en temps réel. Sauf que c'est EXACTEMENT l'événement qui se déclenche quand le clavier virtuel s'ouvre (`visualViewport.height` rétrécit pour l'exclure — `dvh`, par spec, ne le fait jamais). Donc à l'ouverture du clavier, `#root` (qui utilise maintenant `--app-height`) rétrécissait, mais `AICoach.jsx` garde sa propre coquille indépendante (`height: 100dvh` en dur, jamais raccordée à `--app-height`) qui ne bouge pas. `#root`, devenu plus petit que son propre contenu, doit alors scroller pour révéler le champ de saisie ciblé — et ce scroll entraîne l'en-tête `position: sticky` au-dessus de sa zone de sécurité, jusque sous la barre de statut.

**Fix** : retiré l'écoute de `visualViewport.resize` — `--app-height` se mesure une fois au chargement (ce qui corrige bien le vrai bug visé en suite 57 : le décalage `dvh` au lancement en standalone) et se remet à jour seulement sur `resize`/`orientationchange`, qui ne se déclenchent jamais pour le clavier sur iOS. `#root` ne rétrécit donc plus quand le clavier s'ouvre, alignement rétabli avec le chantier autonome d'AICoach.

**Vérifié** : `npm run build` passe, `visualViewport.addEventListener` confirmé absent du bundle compilé (grep = 0 occurrence), seule la lecture initiale de `visualViewport.height` reste (2 occurrences du mot, la mesure au chargement).

## 2026-08-08 — Session 18 (suite 58) : haut de page plus sombre (mismatch theme-color) + barre d'input AI Coach invisible

Deux questions posées sur 3 captures (splash + inscription + AI Coach), vérifiées dans le code plutôt que devinées.

**1. Haut de page plus sombre (captures 1 et 2, Safari onglet)** : `theme-color` (`index.html` + `manifest.json`) était fixé à `#C6371E`, choisi lors de la direction corail comme "un ton qui passe partout où le trou peut tomber" (82% du dégradé, un ton assez sombre). Mais la zone de statut/chrome que Safari peint avec cette couleur est TOUJOURS en haut de l'écran — exactement là où le dégradé (`global.css`, centré à 18% -8%, donc juste au-dessus du bord haut) est à son point le PLUS clair (`#FF8355`, le stop à 0%). Un ton sombre choisi pour "n'importe où" créait un seam net exactement là où il ne fallait pas. Changé pour `#EF6B41`, un ton entre les deux premiers stops du dégradé, beaucoup plus proche de la vraie couleur en haut d'écran. Rendu comparé (ancien vs nouveau ton contre le vrai dégradé, capture jointe au dossier de test) : le raccord est nettement moins visible avec la nouvelle valeur.

**2. Barre d'input AI Coach "ne prend pas toute la largeur" (capture 3)** : le conteneur fixe de la barre (`AICoach.jsx`) a bien la même formule de largeur que la pill nav (`calc(100% - 32px)`, max 448px) — donc structurellement identique. Le vrai problème : son fond (`background: var(--bg)`) valait `#E8552B`, une couleur EXACTEMENT prise dans le dégradé de la page — la barre se fondait complètement dans le fond, invisible, ne laissant que les contrôles flottants (champ, micro, envoi) visibles indépendamment, d'où l'impression de largeur réduite. Fix : même traitement glass que la pill nav (`--nav-glass`/`--nav-border`, `backdrop-filter`, coins arrondis, padding latéral) — la barre est maintenant visuellement délimitée sur toute sa largeur réelle, cohérente avec la nav en dessous.

**Vérifié** : `npm run build` passe, `theme-color" content="#EF6B41"` confirmé dans `dist/index.html`, `backdropFilter`/`nav-glass`/`nav-border` confirmés dans le bundle JS compilé (styles inline React, pas de règle CSS textuelle à grep directement). Rendu comparatif du seam theme-color fait avec Playwright. Pas de vérification sur device réel au-delà de ça.

## 2026-08-08 — Session 18 (suite 57) : la vraie cause de l'écart en bas — dvh qui ne remplit pas tout l'écran réel en standalone

Après la suite 56, nouvelle capture montrant encore un écart entre la pilule et le vrai bord bas — cette fois confirmé explicitement par l'utilisateur comme pris **depuis l'icône ajoutée à l'écran d'accueil** (standalone), pas Safari. Ça écarte l'hypothèse "barre de navigateur Safari" que j'avais avancée entre-temps (vérifiée fausse directement par la réponse de l'utilisateur, pas supposée).

**Vérification faite avant tout changement** : CSS réellement servi en production récupéré par `curl` (pas une supposition sur un éventuel cache périmé) — `.bottom-nav{bottom:env(safe-area-inset-bottom)...}` bien le bon, à jour. Le nav lui-même est donc correct ; l'écart vient d'ailleurs.

**Cause probable, cohérente avec un commentaire déjà présent dans le code depuis longtemps** (`global.css`, sur le fallback `background:#9C2A22` de `html`) : iOS WKWebView — Safari onglet et pire, standalone — a un bug documenté où `100dvh` ne se cale pas toujours sur la vraie hauteur de viewport au bon moment (juste après le lancement, ou après un recalcul de zone de sécurité). Le manque tombe sur le fond de secours d'`html` (`#9C2A22`, un rouge brique foncé) qui, en dessous de tout — la pilule y compris — se lit comme une bande sombre distincte. Ce n'est pas un bug du nav, c'est `body`/`#root` qui ne remplissent pas tout l'écran réel.

**Fix** : `src/main.jsx` mesure maintenant la vraie hauteur (`window.visualViewport.height`, la même API que celle utilisée pour détecter un clavier à l'écran — fiable en temps réel sur iOS, contrairement à `dvh`) et l'écrit dans une variable CSS `--app-height`, mise à jour sur `resize`/`orientationchange`/`visualViewport resize`. `html`/`body`/`#root` utilisent maintenant `height: var(--app-height, 100dvh)` — `dvh` reste uniquement le filet de secours avant que le JS ait tourné.

**Vérifié** : `npm run build` passe, `--app-height` et `visualViewport` bien présents dans le bundle compilé. Testé en isolation avec Playwright (la logique exacte du script, hors du bundle complet — celui-ci ne peut pas tourner en local faute de variables d'env Supabase, qui sont injectées par Vercel au build et n'existent pas dans ce sandbox) : `--app-height` se fixe correctement à la vraie hauteur mesurée. Limite assumée : impossible de reproduire le bug dvh de WKWebView lui-même dans Chromium (il n'existe pas dans ce moteur) — donc pas de preuve que c'était *exactement* ça, seulement que c'est la cause la plus probable et documentée pour ce symptôme précis, et que le correctif est la pratique standard reconnue pour ce cas.

## 2026-08-08 — Session 18 (suite 56) : régression trouvée par capture réelle — le FAB messages chevauchait la pill nav après la suite 55

Capture (écran Dashboard, mode standalone) montrant le bouton flottant "Mon Coach" (bulle de message jaune) posé quasiment sur la pilule, chevauchant la carte SOMMEIL. Pas un problème de zone de sécurité cette fois : `fab.css` avait `bottom: 96px` en dur, réglé pour l'ancienne position de la pilule (qui montait jusqu'à ~110px du bord en standalone avant la suite 55). Une fois la pilule ramenée à ~94px de hauteur totale en standalone (suite 55), les deux se retrouvaient à 2px l'un de l'autre — quasiment collés, d'où le chevauchement visible.

**Fix** : `fab.css` calcule maintenant son offset à partir des mêmes termes que `nav.css` au lieu d'une constante dupliquée — `bottom: calc(60px + 16px + env(safe-area-inset-bottom))` (hauteur pilule + 16px d'écart garanti + même zone de sécurité). Les deux ne peuvent plus se désynchroniser.

**Vérifié avec Playwright + CDP** (pas une supposition) : mesure `getBoundingClientRect()` du FAB et de la pilule sur le vrai CSS compilé, aux deux valeurs de zone de sécurité réelles (0 et 34) : `gapBetweenFabAndNav: 16px` dans les deux cas, `overlap: false`. Capture de la mesure jointe au dossier de test — le bouton flotte clairement au-dessus de la pilule, séparé.

## 2026-08-08 — Session 18 (suite 55) : pill nav réduite au strict minimum (0px d'écart mesuré) — enfin vérifié avec un vrai outil de mesure au lieu de deviner

6e signalement sur ce point de spacing, cette fois avec une colère justifiée : "Toujours trop haut... pourquoi tu ne descends pas la nav bar". Changement d'approche cette session : au lieu de retoucher un chiffre à l'aveugle et espérer, mesure réelle avant tout changement, avec Playwright + CDP (`Emulation.setSafeAreaInsetsOverride`) sur une page de repro utilisant le vrai CSS compilé — mesure `getBoundingClientRect()` de la pilule vs `window.innerHeight`.

**Ce que la mesure a montré (état avant cette suite)** : la formule `bottom: calc(16px + min(env(safe-area-inset-bottom), 34px))` faisait exactement ce qui était écrit — 16px d'écart en Safari onglet, 50px en standalone. Pas un bug de calcul CSS (le `min()` survit très bien à la minification, vérifié dans le bundle) : la marge de 16px était juste ajoutée EN PLUS de la zone de sécurité, ce qui donnait un écart perçu comme largement trop grand — surtout en PWA installée (50px).

**Fix, en 2 temps sur la même suite (l'utilisateur a demandé d'aller encore plus loin en cours de route — "Réduis la au max je la veux vraiment en bottom de page")** :
1. Retrait de la marge fixe de 16px empilée sur la zone de sécurité.
2. Poussé au minimum absolu : `bottom: env(safe-area-inset-bottom)` — aucune marge du tout. En Safari onglet (SAB=0) la pilule touche littéralement le bord bas de l'écran. En standalone (SAB=34) elle s'arrête pile sur la zone de sécurité — pas plus bas, parce que ces 34px ne sont pas une marge décorative mais l'espace minimum pour que les icônes ne soient pas physiquement sous la zone de geste "balayer pour changer d'appli" du home indicator.
3. `.screen` padding-bottom recalculé en cohérence : `calc(76px + env(safe-area-inset-bottom))` (hauteur pilule ~60px + ~16px de respiration, sans la marge supprimée).

**Vérifié, cette fois avec un vrai outil de mesure et pas une supposition** : `npm run build` passe, `.bottom-nav{bottom:env(safe-area-inset-bottom)...}` confirmé dans le CSS compilé. Mesure Playwright (viewport 390×844, CDP `Emulation.setSafeAreaInsetsOverride`) sur le vrai CSS compilé : `gapBelowNav: 0px` avec SAB=0 (Safari onglet), `gapBelowNav: 34px` avec SAB=34 (standalone — c'est la zone de sécurité elle-même, pas un écart en trop). Capture d'écran de la mesure à 0px : la pilule touche visuellement le bord bas. C'est la position la plus basse possible sans faire empiéter les boutons sous la zone de geste du home indicator en PWA.

## 2026-08-08 — Session 18 (suite 54) : confirmation de l'hypothèse safe-area + retrait du composant de debug temporaire

Retour de l'utilisateur : 2 captures du badge `SafeAreaDebug` posé en suite 53 — `SAB: 0px · safari (onglet)` et `SAB: 34px · standalone (PWA)`. Confirme exactement l'hypothèse de départ (fournie par l'utilisateur lui-même) : `env(safe-area-inset-bottom)` diffère bien entre Safari onglet et PWA installée. Précision : 34px n'est pas une valeur "gonflée"/buguée comme on le craignait au départ — c'est exactement la valeur documentée par Apple pour la zone de la barre d'accueil sur iPhone Face ID. Le plafond `min(env(...), 34px)` livré en suite 53 était donc une sécurité qui ne mordait sur rien d'anormal, mais reste sans risque à garder.

**Nettoyage effectué** (comme prévu dès la suite 53, le composant n'était pas fait pour rester) :
- `MemberLayout.jsx` : suppression du composant `SafeAreaDebug` et de son appel dans le rendu.
- `nav.css` : commentaire mis à jour pour refléter la confirmation obtenue plutôt que l'hypothèse en attente.

**Vérifié dans le build compilé** : `npm run build` passe, `grep -c "SafeAreaDebug\|SAB:" dist/assets/*.js` → 0 (composant bien absent du bundle final), `.bottom-nav{bottom:calc(16px + min(env(safe-area-inset-bottom),34px))...}` toujours présent dans le CSS compilé. Pas de vérification visuelle réelle au-delà de ça, mais le point précis qui restait ouvert (retirer l'outil de mesure une fois les valeurs obtenues) est fait.

## 2026-08-08 — Session 18 (suite 53) : pill nav — écart énorme sous la pilule, mais uniquement en PWA installée (5e signalement sur ce point de spacing)

Rapport précis et bien construit cette fois (l'utilisateur a fait le diagnostic lui-même) : la pilule flotte avec un espace largement trop grand en dessous, reproduit uniquement en app ajoutée à l'écran d'accueil iOS, pas en Safari classique. Hypothèse fournie : `apple-mobile-web-app-status-bar-style=black-translucent` fait remonter des valeurs de `env(safe-area-inset-bottom)` incohérentes en mode standalone sur iOS, différentes de Safari. Demande explicite : vérifier avant de corriger, avec une méthode de vérification déjà précisée (indicateur visuel affichant la valeur réelle), un fix de repli déjà rédigé (`min(env(...), 34px)`), et de ne toucher à rien d'autre que ce point de positionnement.

**Limite assumée directement** : aucun outil de ce sandbox ne permet de tester sur un vrai iPhone (ni Safari ni PWA installée) — donc pas de "vérification" possible de mon côté au sens où l'utilisateur l'entend. Fait à la place : les deux choses en une fois plutôt qu'un aller-retour supplémentaire.
1. **`nav.css`** : `bottom: calc(16px + env(safe-area-inset-bottom))` → `calc(16px + min(env(safe-area-inset-bottom), 34px))`. Correctif défensif appliqué directement (sans attendre confirmation) parce qu'il est sûr par construction : 34px est la valeur documentée par Apple pour la zone de la barre d'accueil sur tout iPhone Face ID actuel, aucun appareil légitime ne peut dépasser cette valeur — plafonner ne peut donc jamais rendre les choses pires, que l'hypothèse "valeur gonflée en standalone" soit exacte ou non.
2. **`MemberLayout.jsx`** : ajout d'un petit indicateur visuel **temporaire** (`SafeAreaDebug`), coin haut-droit, qui affiche la vraie valeur résolue de `env(safe-area-inset-bottom)` (technique : l'assigner à une vraie propriété CSS — `padding-bottom` d'une sonde invisible — puis lire `getComputedStyle` dessus, plutôt que lire `env()` directement, qui peut rester sous forme de texte non résolu sur certains WebKit) + si le mode est standalone ou onglet Safari (`navigator.standalone` / `matchMedia('(display-mode: standalone)')`). But : que l'utilisateur puisse capturer les deux vraies valeurs (Safari vs PWA installée) et me les renvoyer, pour confirmer ou infirmer l'hypothèse sans que j'aie à deviner. **À retirer** (composant + son appel dans le rendu) une fois la confirmation obtenue — pas fait pour rester en prod.

**Test demandé par l'utilisateur (réponse)** : pas besoin de désinstaller/réinstaller la PWA — c'est une appli web standard (pas de cache agressif côté build, le service worker est network-first pour la navigation depuis la suite sur le sw.js) : fermer complètement l'app (pas juste la mettre en arrière-plan) puis la rouvrir depuis l'icône suffit à charger le nouveau JS.

**Vérifié dans le build compilé** : `npm run build` passe, `.bottom-nav{bottom:calc(16px + min(env(safe-area-inset-bottom),34px))...}` confirmé, ainsi que les textes `SAB:`, `standalone (PWA)`, `safari (onglet)` du composant de debug. Comme toujours pas de vérification visuelle réelle — cette fois explicitement demandée à l'utilisateur en retour plutôt que supposée.

## 2026-08-08 — Session 18 (suite 52) : nav — retour à une pill flottante (2e refonte en une session), icônes seules, glass très léger

Revirement direct sur la suite 51 (barre fixe pleine largeur avec labels, livrée quelques heures plus tôt) : "Remplace la nav bar actuelle... par une pill flottante". Cette fois, plan présenté et validé avant tout code (demande explicite de l'utilisateur), avec 2 options de labels proposées — tranché en une réponse : "B" (icônes seules) + "Si tu sais ajouté un effet frost léger léger" (confirmation du glass, en insistant sur la légèreté).

**Changement** :
- `.bottom-nav` redevient flottante : `position:fixed`, décollée des bords (`bottom: calc(16px + safe-area)`, marge ~16px de chaque côté), `border-radius:999px` (pilule complète), `overflow:hidden` pour que le flou reste propre dans les coins arrondis.
- `--nav-glass` (token existant dans `global.css` mais jamais réellement utilisé jusqu'ici — resté à 0.92, quasi-opaque, hérité d'un tout premier design de pilule) passé à 0.28 (0.4 en thème clair) — "on doit voir le contenu défiler derrière".
- Labels supprimés (option B) — gardés uniquement en `aria-label` pour l'accessibilité, plus affichés visuellement. Pilule ~54px de haut au lieu des ~60px avec labels.
- Glow corail **uniquement sur l'icône active** : `drop-shadow` à deux couches (`#FF6F59`, un point de départ explicitement annoncé comme à ajuster une fois comparé à une vraie image de référence — aucune n'est arrivée dans le chat à ce stade malgré l'annonce de l'utilisateur d'en coller). Icônes inactives inchangées.
- `.screen` padding-bottom : `70px` → `90px` (+ safe-area) pour clearer le nouveau flottement (offset + hauteur de la pilule + un peu de respiration), recalculé une 3e fois dans la session au gré des changements de forme de la nav.

**Bug "bas de page" persistant, diagnostic sans changement de code** : capture montrant une bande sombre sous la nav, en Safari classique (pas l'app ajoutée à l'écran d'accueil, à confirmer). Diagnostic le plus probable : c'est la zone que Safari réserve lui-même au-dessus de la barre d'indicateur home, peinte avec `theme-color` — de l'UI système, pas du contenu de page, donc rien à corriger côté CSS. Redemandé explicitement si le test se fait en Safari ou en app installée, toujours sans réponse ferme à ce stade — si c'est l'app installée, ce diagnostic tombe et il faudra rouvrir le sujet.

**Vérifié dans le build compilé** : `npm run build` passe, `.bottom-nav{...border-radius:999px;...background:var(--nav-glass)...}`, `.nav-btn.active svg{...filter:drop-shadow(...)...}` et `.screen{padding-bottom:calc(90px + env(safe-area-inset-bottom))}` confirmés. Pas de vérification visuelle réelle — deuxième refonte de nav en quelques heures sans avoir eu confirmation de la première, donc particulièrement à valider avant d'aller plus loin dans ce sens.

## 2026-08-07 — Session 18 (suite 51) : nouvelle nav bar fixe (plus de pilule flottante, plus de sphère IA) + icônes Phosphor + suite du chantier gamification

Capture de référence (Messenger, style app de discussion) : "Tu vois cette nav bar ? Je veux exactement ce design mais je la veux fixe... trouve des icône dans le même style ne t'aventure pas à les faire toi même". Confirmé ensuite : les deux navs (membre ET coach), effet **glass transparent** (pas sombre — correction directe : "pas sombre mais transparente elle a un effet glass miroir transparent"), pas de badges pour l'instant, sphère IA uniformisée avec les autres onglets (plus d'élément mis en avant).

**Changement de fond, pas un ajustement** : la pilule flottante qui se cachait au scroll (BottomNav.jsx avait tout un système d'écoute du scroll pour ça) est remplacée par une barre fixe pleine largeur, **jamais masquée**, avec icône + label texte sous chaque onglet — ce que la nav n'avait jamais eu jusqu'ici. Réutilisé le système `--glass`/`--glass-border` (flou + transparence) déjà présent dans `global.css` plutôt qu'introduire un nouveau fond, pour respecter la correction "pas sombre".

**Icônes — changement de librairie en cours de route** : parti sur lucide-react (déjà en place dans le projet), l'utilisateur a explicitement demandé de changer ("comment on peut être têtu comme ça, change pour voir"). Installé `@phosphor-icons/react` et basculé les icônes de nav dessus (les autres usages de lucide-react ailleurs dans l'app, via `Icon.jsx`, ne sont pas touchés — changement scopé à la nav, pas une migration globale). Phosphor a un avantage concret ici : son prop `weight` (regular/fill) donne un vrai état actif/inactif "gratuit" (l'onglet actif passe en plein plutôt qu'en contour), pas juste un changement de couleur.

**`.nav-btn-elevated` et toute l'animation de pulsation de la sphère IA supprimées** de `nav.css` — pas juste désactivées, retirées, puisque le nouveau design explicite ("exactement ce design") ne prévoit aucun élément mis en avant.

**Clearance des pages recalculée** : la nouvelle barre est nettement plus courte que l'ancienne pilule (~54-60px de contenu réel contre ~90-100px) — `.screen`'s `padding-bottom` réduit de `100px` à `70px` (+ la marge de sécurité iOS comme avant) pour ne pas laisser un vide disproportionné en bas de chaque page maintenant que la barre a rétréci.

**Gamification, suite (pas encore implémenté)** : demande explicite de compléter le classement (qui compare aux autres) avec un point de motivation **personnel**, visible même sans consulter les autres membres — suggestion vague de l'utilisateur lui-même ("format de niveau, je sais pas encore") : pas assez défini pour être implémenté tel quel dans ce lot, à creuser dans une prochaine session (probablement un système de niveau/XP dérivé des séances déjà loggées, sur le modèle du classement existant).

**Vérifié dans le build compilé** : `npm run build` passe (bond de 1924 à 6465 modules transformés, normal — Phosphor exporte un fichier par icône — mais le bundle JS gzippé ne grossit que d'environ 10 Ko puisque seules les icônes réellement importées sont packagées). `.bottom-nav{...backdrop-filter:blur(24px)...}`, les labels ("Accueil", "Coach IA", "Entraînement"...) et la nouvelle clearance `.screen{padding-bottom:calc(70px + env(safe-area-inset-bottom))}` confirmés dans le CSS/JS compilés. Comme toujours, pas de vérification visuelle réelle dans ce sandbox — c'est le changement le plus visible de toute la session, donc particulièrement important à faire confirmer par l'utilisateur.

## 2026-08-07 — Session 18 (suite 50) : dernière carte coupée en bas sur TOUTES les pages — même classe de régression que la Landing, corrigée partout d'un coup

Capture du Dashboard : le bouton CTA sombre ("Voir mon entraînement du jour", `#1B1710`, coins arrondis) apparaît partiellement coupé tout en bas, sous la nav — "Tu vois le bas de page là il a certes la même couleur que le fond mais pourquoi c'est encore coupé ?" puis, demande explicite d'aller plus loin : "Toutes les pages doivent être propre pas de bordure en bas de page donc corrige sur toutes les pages tout de suite".

**Root cause — exactement la même classe de bug que la Landing (suite 49), mais générique cette fois** : la suite 44 a rendu `.bottom-nav` plus haute en ajoutant `env(safe-area-inset-bottom)` à son padding (pour la zone gestuelle des iPhone sans bouton Home). Mais chaque écran réservait sa clearance pour la nav via une valeur codée en dur (`paddingBottom: 110`, copiée-collée sur **19 écrans différents**, plus `padding-bottom:100px` dans la classe `.screen` de base) — aucune de ces valeurs n'a grandi en même temps que la nav. Résultat : sur tout appareil avec une zone de sécurité en bas (donc la quasi-totalité des iPhone actuels), la dernière carte de chaque écran a un peu moins de marge qu'il n'en faut et peut se retrouver partiellement masquée/coupée derrière la nav.

**Fix, en un seul mouvement plutôt que 19 correctifs séparés qui auraient re-dérivé plus tard** :
- `.screen` (règle de base, `global.css`) : `padding-bottom: 100px` → `calc(100px + env(safe-area-inset-bottom))`.
- Les 19 écrans qui redéfinissaient `paddingBottom: 110` (ou le raccourci `padding: '0 24px 110px'`) en style inline React — ce qui aurait empêché la classe de base de s'appliquer, l'inline gagnant toujours sur une classe CSS — ont eu cette redéfinition **supprimée entièrement**, pas juste corrigée : elle était de toute façon redondante avec la classe `.screen`, une valeur légèrement différente (110 vs 100) copiée sans y repenser. Un seul point de vérité maintenant au lieu de 20 copies dont une seule aurait été mise à jour.

**Vérifié dans le build compilé** : `.screen{padding-bottom:calc(100px + env(safe-area-inset-bottom))}` confirmé dans le CSS compilé, `npm run build` passe, plus aucune occurrence de `paddingBottom: 110`/`110px` dans `src/screens`. Comme toujours, pas de vérification visuelle réelle — mais cette fois la logique s'applique uniformément à toute l'app par construction (une seule règle CSS partagée), pas écran par écran à la main, donc le risque d'en avoir oublié un est bien plus faible que pour les correctifs précédents.

## 2026-08-07 — Session 18 (suite 49) : Landing "toujours coupé" — régression introduite par le fix de safe-area de la suite 44

"C'est toujours coupé gros" avec une capture de la Landing : le bouton secondaire "Accès coach" est visiblement coupé, seul le haut de sa pilule dépasse en bas de l'écran. Cette fois la capture montre le bug directement, pas besoin de deviner.

**Root cause — une régression que j'ai moi-même introduite** : la suite 44 a ajouté `padding-top: env(safe-area-inset-top)` sur `#root` pour compenser la zone sous la barre de statut iOS. `#root` a une hauteur fixe (`height:100dvh`), donc ce padding réduit d'autant sa zone de contenu réelle. Mais `.landing` (et `.onboarding-screen`, même pattern) réclamaient CHACUN `min-height:100dvh` — la totalité du viewport une deuxième fois — alors qu'ils sont enfants directs de `#root` et n'ont donc droit qu'à ce qu'il leur reste (`100dvh` moins le padding). Résultat : dépassement systématique de la hauteur exacte du padding de sécurité, qui pousse le bas de la page (ici le 2e bouton CTA) sous le bord visible. Pire sur cette capture précise à cause de la barre d'appel active (le bandeau noir avec l'icône téléphone en haut) qui agrandit encore la zone de statut au moment du screenshot.

**Fix** : `.landing`/`.onboarding-screen` passent de `min-height:100vh/100dvh` à `min-height:100%` — ils remplissent maintenant ce qu'il reste réellement dans la boîte de contenu de `#root`, au lieu de réclamer tout le viewport une deuxième fois par-dessus.

**Pas traité dans ce lot** : `Login.jsx`/`ResetPassword.jsx` ont le même `minHeight:'100dvh'` en style inline et la même classe de risque théorique — mais ils sont un niveau plus profond (`.app-wrapper` sans hauteur propre s'intercale entre `#root` et eux), donc le même correctif (`100%`) ne marcherait pas tel quel, et surtout aucun symptôme concret n'a été signalé dessus. Laissé de côté plutôt que de deviner un fix pour un problème non confirmé.

**Vérifié dans le build compilé** : `.landing{min-height:100%...}` et `.onboarding-screen{min-height:100%...}` confirmés dans le CSS compilé. Comme toujours, pas de vérification visuelle réelle — mais cette fois le raisonnement est basé sur une capture montrant le bug précisément, pas une supposition.

## 2026-08-06 — Session 18 (suite 48) : logo (flèche "dégueulasse"), splash sur fond noir, bande blanche en bas — 3 retours sur capture

3 captures (Dashboard, Réglages, splash + Landing) avec 3 retours groupés : "L'animation au début de l'app elle est sur fond noir il faut changer ça. La flèche est toujours dégueulasse. Et si tu regarde bien il y a toujours la partie blanche en bas de page."

**La flèche du logo** — root cause enfin identifiée en regardant le SVG source plutôt qu'en re-changeant des couleurs à l'aveugle : la pointe de la flèche était un **carré plein flottant** (`<rect>`) collé près de la fin du trait en zigzag, pas une vraie pointe de flèche — d'où l'impression de blob raté plutôt que de flèche, dans les 3 tentatives précédentes ("coupée" puis "toujours dégueulasse" x2). Remplacé par la construction standard d'un chevron en 2 segments (`17,6 → 23,6 → 23,12`, le même principe que l'icône "trending-up" de Feather/Lucide) dont le coin tombe exactement sur la fin du trait principal — se lit comme une seule flèche continue au lieu de deux formes distinctes. Corrigé aux 3 endroits où le SVG était dupliqué : `Logo.jsx` (source unique pour nav/écrans), `SplashIntro.jsx` (sa propre copie, animée séparément), `public/logo-volta.svg` (favicon).

**Splash sur fond noir** — était un choix délibéré (un temps de révélation sombre du logo avant la Landing corail en dessous, jamais confirmé avec l'utilisateur, juste mon raisonnement de l'époque) — explicitement rejeté maintenant. Recalé sur le même dégradé corail que `body`/`#root`/Landing.

**Bande blanche en bas** — fix précédent (`theme-color`) couvrait la couleur de comblement de Safari dans les espaces vides, mais `html` lui-même n'avait toujours aucun fond explicite — n'importe quel écart résiduel entre la zone peinte par `body` et le vrai bord de l'écran (dvh qui se recalcule en retard, la barre d'appel active visible sur la capture qui redimensionne le viewport en cours de session, arrondi sous-pixel) tombait sur le blanc par défaut du navigateur. Ajouté un fond de secours (`#9C2A22`, le ton le plus sombre du dégradé) directement sur `html`.

**Vérifié dans le build compilé** : les 2 nouvelles coordonnées de chevron (`17 6 23 6 23 12`) confirmées dans le JS compilé et dans le favicon SVG copié, plus aucune trace de l'ancien `rect` (`21.1`/`4.1`/`3.2`) recherchée spécifiquement. `.splash-overlay` et `html` confirmés avec les nouveaux fonds dans le CSS compilé. Comme toujours, pas de vérification visuelle réelle possible dans ce sandbox — la bande blanche en particulier reste un correctif de sécurité (safety net), pas une certitude d'avoir trouvé la cause exacte, puisque je n'ai pas pu reproduire le phénomène.

## 2026-08-06 — Session 18 (suite 47) : audit produit + positionnement marché, correction d'une erreur d'audit, et 1er chantier lancé (classement de la salle)

Demande directe : "fait une audit complète de l'app et dis ce qui manque pour toi en explorant les apps déjà présente il faut que cette application comble le manque qu'il y a sur le marché". Publié d'abord en artefact — reproché à raison ("arrête de faire des artefacts pour rien tu gaspille des tokens"), donc repris en texte simple ensuite. Résumé de la démarche et des conclusions ici pour ne pas perdre le travail.

**État réel de l'app (vérifié dans le code, pas supposé)** : le rapport technique du 8 juillet (`ETAT_DES_LIEUX.md`) est daté — nutrition, séances, messagerie sont maintenant réellement persistées dans Supabase (plus du localStorage), le back-office coach n'est plus mocké (`supabase.from('profiles')` réel dans `CoachDashboard.jsx`, pas `MOCK_MEMBERS`). Restent artisanaux : synchro santé (formulaire manuel, pas de vraie connexion Apple Health/Google Fit — nécessiterait de sortir du web pur) et l'onglet Course (saisie manuelle, pas de GPS réel, décision jamais tranchée avec l'utilisateur sur ce qu'il faut en faire — répondu "oui" à "on garde" de façon ambiguë, donc gardé tel quel pour l'instant).

**Recherche marché (5 axes)** — sources complètes citées dans les réponses de session, résumé ici :
- Trackers grand public (MyFitnessPal, Yazio) : friction de saisie = raison n°1 d'abandon ; refonte MyFitnessPal 2026 a déclenché une vague de désabonnement ; Yazio harcèle avec des upsells.
- Nouvelle génération IA photo (Cal AI, SnapCalorie, Foodvisor) : log par photo, ~5-10s, 82% de précision jugé largement acceptable vu le gain de temps.
- Plateformes coach B2B (Trainerize, TrueCoach, PT Distinction, Virtuagym) : chères (IA nutrition +45$/mois chez Trainerize), génériques, notées en dessous de la moyenne (Trainerize 3.4/5, Everfit 2.3/5).
- Concurrents français directs (Sportigo, Resamania, Liberfit, Deciplus) — **les vrais concurrents de Volta, pas MyFitnessPal** : apps en marque blanche pour salles indépendantes, gamification (points/badges) déjà standard chez eux, +25% de rétention avec une app mobile vs sans.
- Communauté/gamification : 5x plus de rétention avec fonctionnalités sociales actives (streaks, classements), 75%+ de rétention dans les salles à forte dimension communautaire — le seul terrain où aucun tracker mondial ni plateforme B2B générique ne peut suivre Volta, puisqu'ils n'ont pas de vraie salle derrière.
- Coaching adaptatif à la récupération (Whoop, Oura, Garmin 2026) : fermer la boucle sommeil/HRV → ajustement automatique de la séance du jour.

**Erreur d'audit trouvée et corrigée en creusant, avant de la répéter à l'utilisateur** : ma priorité n°1 initiale ("Volta ne sait pas logger un repas par photo, seulement générer une recette par photo") était **fausse** — `Scan.jsx` fait déjà exactement ça : photo → Claude vision estime les items/grammages → croisement Open Food Facts pour les vraies valeurs nutritionnelles → portions éditables → ajout réel à un repas (`addMeal`). Fonctionnalité complète, câblée (`/scan` accessible depuis Nutrition.jsx), pas un placeholder. L'erreur venait d'avoir fait confiance à une note obsolète de l'ancien état des lieux ("Scan à valider, probablement mocké") sans relire le code réel avant de formuler la recommandation — leçon : vérifier dans le code avant d'affirmer un manque, pas seulement dans un audit précédent qui peut être daté.

**Chantier lancé maintenant** ("on commence ça maintenant") : classement hebdomadaire de la salle (2e priorité de l'audit, la 1ère s'étant révélée déjà faite).
- `scripts/supabase_schema.sql` : nouvelle vue `leaderboard_weekly` (prénom + nombre de séances cette semaine par membre). `seances` a un RLS strict (`auth.uid() = user_id`) qui rend un classement impossible en interrogeant la table directement — la vue expose volontairement une tranche étroite et non sensible à tous les membres authentifiés (`security_invoker = false` explicite, pour contourner le RLS sous-jacent délibérément, pas par accident). **Comme tout le schéma de ce projet, ce SQL doit être exécuté à la main dans l'éditeur SQL Supabase — pas encore fait, la fonctionnalité ne marchera pas tant que ce n'est pas exécuté.**
- `src/utils/leaderboard.js` : `fetchWeeklyLeaderboard()`, lit la vue, exclut les membres à 0 séance (une liste de zéros décourage plus qu'elle ne motive), plafonné à 10.
- `Weekly.jsx` : nouvelle carte "CLASSEMENT DE LA SALLE — CETTE SEMAINE" juste après les cartes de résumé perso, médailles 🥇🥈🥉 pour le podium, ligne de l'utilisateur courant mise en évidence.

**Vérifié dans le build compilé** : `npm run build` passe, `CLASSEMENT DE LA SALLE` et `leaderboard_weekly` confirmés dans le JS compilé. Pas de vérification visuelle (comme toujours), et surtout **pas de vérification fonctionnelle possible tant que le SQL n'est pas exécuté côté Supabase** — à faire par l'utilisateur, puis à tester avec au moins un membre ayant une séance loggée cette semaine.

**Pas fait dans ce lot, prochaines priorités de l'audit** : coaching IA sensible à la récupération (sommeil → ajustement de séance), réservation de créneaux (conditionnel — dépend si la salle fait des cours collectifs, jamais confirmé), vraie synchro santé (conditionnel — dépend de l'ouverture à sortir du web pur).

## 2026-08-06 — Session 18 (suite 46) : Réglages > Objectifs — l'objectif (perte de poids/prise de masse/...) était choisi une fois à l'inscription puis invisible et impossible à changer

"Dans cette partie il faut remettre l'objectif et toujours laisser le choix à l'utilisateur de redéfinir son objectif" — capture de la carte "OBJECTIFS" dans Réglages, qui n'affichait que 4 nombres (Calories/jour, Protéines, Eau, Pas/jour) sans jamais montrer NI permettre de changer l'objectif réel choisi à l'inscription (Perte de poids / Prise de masse / Nutrition / Performance, multi-select — voir suite 23).

**Ajouté** : chips de sélection (mêmes 4 options/valeurs que l'onboarding — les valeurs sont les clés que `GOAL_MULTIPLIERS` dans `utils/metabolism.js` matche, donc gardées identiques et pas juste visuellement similaires) en haut de la carte Objectifs, pré-remplies avec `user.goal` (string séparée par virgules). Cocher/décocher un objectif recalcule immédiatement Calories/jour et Protéines avec la même formule que l'onboarding (poids/taille/âge + fréquence d'entraînement), affichées dans les champs juste en dessous — toujours éditables à la main avant d'enregistrer, comme le reste de la carte.

**Deux bugs de fond trouvés en creusant, pas juste l'UI manquante** :
1. `sessionToUser` (AuthContext.jsx) ne mappait jamais `frequency` depuis les métadonnées auth, alors que la formule de calcul calorique en a besoin (le multiplicateur d'activité) — il n'existe aucune colonne `frequence` dans `profiles` (`supabase_schema.sql` : seules `prenom, email, poids, taille, age, objectif` sont accordées en update), donc c'était la seule route pour la relire de façon fiable après un rechargement. Ajouté au mapping.
2. `saveGoals()` dans Settings.jsx n'appelait que `updateData()` (état React + localStorage via `utils/storage.js`) — **jamais** d'écriture Supabase. Un objectif "enregistré" ne survivait ni à une reconnexion ni à un changement d'appareil, silencieusement. Corrigé en routant la sauvegarde par `updateUserProfile` (déjà utilisé par l'onboarding), qui écrit `profiles.objectif` + la table `objectifs`. Ça a révélé un 3e bug au passage : `updateUserProfile` écrivait `eau_ml`/`pas_jour` codés en dur à 2500/10000 à chaque appel, donc même en le routant correctement, l'eau/les pas redéfinis auraient été écrasés par les valeurs par défaut à chaque sauvegarde — corrigé pour utiliser les vraies valeurs passées.

**Vérifié dans le build compilé** : `npm run build` passe, les libellés des 4 objectifs (`Perdre du poids`, `Prendre du muscle`...) et les classes `.goal-chip`/`.goal-selector` confirmés présents dans le JS/CSS compilés. Comme toujours, pas de vérification visuelle/interaction réelle dans ce sandbox.

## 2026-08-06 — Session 18 (suite 45) : bande noire en bas d'écran — theme-color resté sur l'ancien thème sombre

Capture utilisateur montrant une bande noire pleine largeur en bas de l'écran Dashboard, sous la nav. Root cause visible directement sur la capture, pas une hypothèse cette fois : `theme-color` (index.html) et `background_color`/`theme_color` (manifest.json) étaient restés à `#0A0A0A` depuis l'identité sombre d'origine, jamais mis à jour pendant la bascule vers la direction corail. `theme-color` est la couleur que Safari peint dans tout écart entre le contenu réellement rendu et le vrai viewport de l'appareil — rebond de scroll (rubber-band), ou ici plus probablement un décalage de hauteur causé par la barre d'appel active visible en haut de la capture (le pilule noire avec l'icône téléphone), qui redimensionne temporairement le viewport web disponible. Résultat : n'importe quel écart de ce type peignait du noir plein au lieu de laisser voir le dégradé corail — se lit exactement comme "il n'y a pas de fond".

**Fix** : `theme-color` → `#C6371E` (un des tons du dégradé, celui qui couvre la majorité de l'écran une fois passé l'origine plus claire en haut-gauche — un aplat ne peut pas matcher un dégradé partout, mais celui-là se fond raisonnablement bien peu importe où l'écart apparaît). Distinction faite entre les deux couleurs du manifest : `theme_color` (couleur d'usage continu, celle qui causait le bug) → corail comme index.html ; `background_color` (couleur du splash natif affiché par l'OS avant que la moindre ligne de JS ne tourne, donc avant même le splash animé maison) → **laissé à `#0A0A0A` volontairement**, parce que `splash.css` garde aussi un fond noir pour sa révélation animée du logo (~3.6s, choix assumé documenté dans une suite précédente) — passer `background_color` en corail aurait créé un sandwich corail→noir→corail au lancement au lieu d'un enchaînement noir→noir→corail cohérent.

**Vérifié dans le build compilé** : `theme-color" content="#C6371E"` dans `dist/index.html`, `theme_color: "#C6371E"` / `background_color: "#0A0A0A"` dans le manifest copié. Celui-là, contrairement aux 3 tentatives précédentes sur le scroll, est vérifiable visuellement sans ambiguïté sur la capture fournie — pas une correction à l'aveugle.

## 2026-08-06 — Session 18 (suite 44) : scroll bloqué, prise 3 — vraie vérification par test tactile automatisé (Playwright), 1 hypothèse réfutée par moi-même, safe-area corrigée

"Toujours le même problème" après la suite 43 ("Bha oui wesh" en réponse à ma question de savoir s'il avait bien testé après un rechargement complet). Vu que 2 tentatives basées sur "le build compile" n'ont pas suffi, cette fois j'ai construit un vrai test automatisé plutôt que de reguesser à l'aveugle : `npm run build`, build servi en local, Playwright (`playwright-core`, navigateur Chromium pré-installé du sandbox) avec émulation iPhone 13 + dispatch de vrais événements tactiles (`Input.dispatchTouchEvent` via CDP — touchstart/touchmove/touchend, pas juste `scrollTo()`), sur une page injectée avec 3000px de faux contenu pour simuler un écran long.

**Résultat du test** : le mécanisme de scroll shippé en suite 43 (`#root` en unique conteneur, `overflow-y:auto` + `-webkit-overflow-scrolling:touch`) fonctionne correctement — 8 à 10 swipes d'affilée atteignent le bas et reviennent exactement à 0 en haut, sans blocage, y compris avec un swipe qui démarre dans la zone transparente de la nav flottante (position:fixed) en bas de l'écran, l'endroit exact où un pouce se pose naturellement en scrollant. **J'ai testé cette hypothèse spécifique (la nav fixe qui intercepterait le geste de swipe) avec un test de contrôle négatif** (même scénario, `pointer-events:auto` non modifié) et le scroll fonctionnait identique dans les deux cas — donc cette théorie est réfutée, au moins dans Chromium : `position:fixed` ne retire pas un élément de la chaîne d'ancêtres DOM utilisée pour résoudre le scroll tactile, qui remonte correctement jusqu'à `#root` peu importe le `pointer-events`. J'ai quand même laissé le `pointer-events:none` sur `.bottom-nav` (`auto` sur `.nav-pill`) parce que c'est une bonne pratique défensive de toute façon (une zone invisible ne devrait jamais capter de taps), mais **je ne prétends pas que ça règle le bug** — c'est une piste que j'ai moi-même invalidée, pas un fix confirmé.

**Ce qui EST un vrai correctif, pas une hypothèse** : en creusant pourquoi le haut de l'écran pourrait sembler "bloqué", j'ai vérifié (grep sur tout `src/`) qu'aucun `env(safe-area-inset-*)` n'était utilisé nulle part dans le code, alors que `index.html` a `apple-mobile-web-app-status-bar-style: black-translucent` — ce réglage fait dessiner le contenu en plein écran SOUS la barre de statut iOS en mode "ajouté à l'écran d'accueil" (`manifest.json` a `"display": "standalone"`). Sans compensation, les tout premiers pixels de contenu en haut de chaque écran passent réellement derrière l'horloge/la batterie — ce qui, vu par l'utilisateur, ressemble exactement à "je ne peux pas scroller jusqu'en haut" alors que le scroll est en réalité déjà à 0. Fix : `viewport-fit=cover` ajouté au meta viewport (sans lui, `env(safe-area-inset-*)` vaut toujours 0 — donc même du code qui utiliserait cette variable n'aurait jamais eu d'effet avant ce commit), `padding-top: env(safe-area-inset-top)` sur `#root` (pas `body`, qui ne scrolle plus et dont le dégradé doit rester plein cadre), et `padding-bottom` de `.bottom-nav` qui inclut maintenant `env(safe-area-inset-bottom)` pour la zone de la barre gestuelle en bas des iPhone sans bouton Home.

**Honnêteté sur les limites** : Chromium ≠ WebKit — mon test prouve que le mécanisme CSS/JS shippé est structurellement sain pour du scroll tactile générique, mais ne peut pas reproduire un bug propre au moteur de rendu iOS si c'en est un. Après 3 tentatives (dont 2 non vérifiées au-delà de "le build compile", ce qui n'était pas suffisant — reconnu explicitement), je n'ai plus de piste CSS/JS non testée à proposer sans nouvelle donnée. Demandé à l'utilisateur un enregistrement d'écran du blocage exact (plutôt que des captures statiques) pour la suite, ainsi que la précision Safari-normal vs app-ajoutée-à-l'écran-d'accueil qui n'a toujours pas été donnée explicitement.

## 2026-08-06 — Session 18 (suite 43) : scroll bloqué, prise 2 — changement d'architecture de scroll (body → #root)

"Toujours le même problème le scroll bloque, t'as appliqué la solution à toutes les pages ?" — le fix de la suite 41 (`100vh` → `100dvh`) était bien appliqué partout, mais ne réglait pas le vrai problème : il traite l'écart entre le viewport "le plus grand possible" et le viewport visible (Safari qui cache/montre sa barre d'adresse), pas le bug indépendant, bien documenté, de **iOS qui fige le scroll du document lui-même** (`body`/`html` en scroll natif) pile au bord haut/bas — surtout marqué en mode "ajouté à l'écran d'accueil" (le manifest a `"display": "standalone"`), où il n'y a même plus de barre d'adresse à cacher, donc le fix précédent ne pouvait rien changer dans ce mode précis.

**Changement d'architecture** : au lieu de laisser le document (`body`) défiler, `html`/`body` sont maintenant figés exactement à la hauteur du viewport (`height:100%; height:100dvh; overflow:hidden`) et ne défilent plus jamais. `#root` devient le seul et unique conteneur de scroll de toute l'app (`overflow-y:auto; -webkit-overflow-scrolling:touch`) — c'est le correctif standard documenté pour ce bug iOS précis (WKWebView gère beaucoup mieux le scroll d'un élément dédié que le scroll du document natif).

Effets de bord corrigés dans la foulée :
- Le dégradé corail passe de `background-attachment:fixed` (nécessaire quand body scrollait) à un simple fond fixe sur `body` — plus simple, plus léger, puisque body ne bouge plus du tout.
- `BottomNav.jsx` : le listener de scroll (masque la nav en scrollant vers le bas) ciblait un `id="oa-scroll"` qui n'a jamais existé nulle part dans le code — retombait toujours sur `window`, qui ne défile plus maintenant. Recâblé sur `#root` (le vrai conteneur).
- `Hydration.jsx` / `Nutrition.jsx` : leur `window.scrollTo(0, 0)` au montage ne faisait plus rien pour la même raison — remplacé par un scroll de `#root`.
- `AICoach.jsx` / `Conversation.jsx` (écrans de chat plein écran, scroll interne à eux) : leur wrapper avait encore un `height: '100vh'` en dur, jamais corrigé lors de la suite 41 (c'est du style inline React, pas du CSS — le grep de l'époque cherchait dans les fichiers `.css`). Passé en cascade `100vh` + `minHeight`/`maxHeight: '100dvh'` (l'équivalent de la cascade CSS `100vh; 100dvh;`, mais en inline React où on ne peut pas déclarer deux fois la même clé).
- `Login.jsx` / `ResetPassword.jsx` : même oubli (`minHeight: '100vh'` en inline, jamais touché) — passés en `100dvh` directement (pas de `overflow:hidden` dessus donc pas besoin de la cascade, juste le remplacement).

**Vérifié dans le build compilé** : `npm run build` passe, `html{height:100%;overflow:hidden...}`, `body{height:100dvh;overflow:hidden...}`, `#root{height:100dvh;overflow-y:auto;-webkit-overflow-scrolling:touch...}` bien présents. Toujours aucune vérification visuelle/interaction réelle possible dans ce sandbox (pas d'outil browser tactile) — c'est le point faible de tout ce chantier scroll : je ne peux tester que "le CSS calculé correspond à l'intention", jamais "ça défile vraiment sans accroc sur un vrai iPhone". À confirmer sur le lien de prod, en testant si possible à la fois en Safari normal ET en app ajoutée à l'écran d'accueil (les deux modes ont des comportements de scroll différents sur iOS).

## 2026-08-06 — Session 18 (suite 42) : bibliothèques d'exercices — bug de fond trouvé (API remplaçait le socle local au lieu de le compléter) + ajout du cardio machine manquant

Suite directe de la suite 41 : "Note déjà dans le journal qu'on doit regarder attentivement la partie exercice il y en a pas assez et je trouve ça bizarre dans les exercice 'Maison' je ne retrouve pas le tapis de marche ou le vélo d'appartement, Analyse toutes les bibliothèque et rends les cohérente".

**Root cause, pas juste des exercices manquants** : `WorkoutLibrary.jsx` a un commentaire qui affirme que `LOCAL_EXERCISES` (16 exercices codés en dur par section) est "le socle garanti quelle que soit la disponibilité de l'API" — mais le code faisait l'inverse : `baseList` choisissait *soit* les exercices de l'API Ninjas (`useExercises`) *soit* le socle local, jamais les deux. Résultat : dès que l'API répondait avec ne serait-ce qu'un seul résultat pour une catégorie, tout le socle local disparaissait de l'écran, remplacé par un sous-ensemble déterminé par des paramètres de requête (`CATEGORY_PARAMS`) eux-mêmes assez pauvres. C'est la vraie explication du "pas assez d'exercices" et du ressenti incohérent d'une visite à l'autre — la liste vue par l'utilisateur dépendait de la disponibilité/du hasard de l'API, pas d'un socle stable. **Fix** : `baseList` fusionne maintenant local + API (dédupliqué par nom, local en premier), donc le socle curé (avec fiche détaillée dans `ExerciseModal.jsx`) est toujours présent, et l'API vient uniquement ajouter de la variété par-dessus.

**Équipement cardio manquant, signalé nommément** : "Maison" (16 exercices) et "Salle" (16 exercices) étaient 100% poids du corps / musculation, sans un seul exercice cardio machine — alors que la plupart des setups maison ont un tapis ou un vélo, et qu'une vraie salle de sport a quasi toujours un espace cardio. Ajouté : `Tapis de Marche/Course` + `Vélo d'Appartement` en Maison, `Tapis de Course` + `Rameur` en Salle (16 → 18 par section), avec fiche détaillée (muscles, étapes) dans `ExerciseModal.jsx` comme le reste du socle. Côté API (`useExercises.js`), `CATEGORY_PARAMS` de Maison et Salle n'interrogeaient jamais le type `cardio` (seul "Dehors" le faisait) — ajouté aux deux, pour que la variété fournie par l'API puisse elle aussi proposer du cardio dans ces deux catégories.

**Vérifié dans le build compilé** : `npm run build` passe, et les 4 nouveaux noms d'exercice sont bien présents dans le bundle JS compilé. Pas de vérification visuelle en navigateur (aucun outil de ce type dans ce sandbox).

**Pas fait dans ce lot** : pas d'audit du contenu réel renvoyé par l'API Ninjas pour `type: cardio` (dépend de leur base, non vérifiable depuis ce sandbox sans clé/réseau de test) — seul le paramètre de requête a été ajouté. Pas d'ajout d'autres équipements potentiellement absents (élastiques/bandes de résistance, kettlebell à la maison, vélo elliptique en salle, etc.) — périmètre volontairement limité à ce qui a été signalé + au trou "zéro cardio machine" détecté en comparant les 3 bibliothèques entre elles.

## 2026-08-06 — Session 18 (suite 41) : fix scroll bloqué (100dvh) + Landing recalée en corail

Suite à 3 captures (écran Workout, bibliothèque d'exercices scrollée, ancienne Landing sombre) : "Problème de slide sur les pages elle bloque soit en haut soit en bas. À fixer. La landing n'a rien à voir avec le reste de l'application". Deux correctifs distincts :

1. **Scroll bloqué en haut/bas** — diagnostic : `100vh` sur iOS Safari se calcule sur le plus grand viewport possible (barre d'adresse cachée), pas sur le viewport réellement visible à l'instant T, donc le haut ou le bas du contenu se retrouve partiellement caché derrière la barre d'adresse qui apparaît/disparaît en scrollant. Fix : cascade `min-height: 100vh; min-height: 100dvh;` (le navigateur ignore la ligne qu'il ne comprend pas, et `dvh` suit le vrai viewport visible) posée sur `body`/`#root` (`global.css`), `.onboarding-screen` (`Onboarding.css`), `.landing` (`landing.css`). En même temps, le dégradé corail a été déplacé de `#root` vers `body` avec `background-attachment: fixed; background-repeat: no-repeat` — sur les écrans qui scrollent beaucoup (bibliothèque d'exercices avec potentiellement 16+ items), `#root` peut devenir très haut et recalculer le dégradé sur toute cette hauteur ; le poser sur `body` en fixed le calcule une fois pour la taille de l'écran, indépendamment du contenu. `#root` repasse en `background: transparent` pour laisser voir le fond de `body`.

2. **Landing incohérente avec le reste de l'app** — root cause : `.landing` avait un fond `#0A0A0A` codé en dur, indépendant des tokens de thème (avait du sens quand le sombre était l'identité réelle de l'app, plus maintenant). Recalée sur le même dégradé corail que `body`/`#root`. `.landing-btn-primary`/`.landing-btn-secondary` alignés sur la convention "bouton encre sombre" déjà utilisée ailleurs dans la direction corail (au lieu de l'ancien or/gris sombre).

**Vérifié dans le build compilé** (`min-height:100dvh`, `background-attachment:fixed`, et le nouveau `.landing{...background:radial-gradient(...)...}` bien présents dans le CSS compilé) — toujours pas de vérification visuelle réelle en navigateur, à confirmer sur le lien de prod, en particulier le comportement de scroll sur iOS qui ne peut pas être reproduit dans ce sandbox.

**Signalé par l'utilisateur dans la foulée, pas encore traité** : la bibliothèque d'exercices ("Maison" notamment) manque des équipements évidents — pas de tapis de marche, pas de vélo d'appartement — et plus largement pas assez d'exercices / pas de cohérence entre les bibliothèques (Maison/Salle/Dehors). À auditer : `WorkoutLibrary.jsx` + son objet `LOCAL_EXERCISES` (16 exercices codés en dur par section) et le hook `useExercises` qui vient compléter/remplacer via API — comparer les 3 sections pour équilibrer équipement/variété et repérer les manques évidents comme le cardio machine en "Maison".

## 2026-08-06 — Session 18 (suite 40) : bascule vers la "direction corail" — 1er lot (fondations + Dashboard + Nutrition + headers)

Suite à un aller-retour maquettes (comparatif de fonds sombres → jugé "toujours sombre", puis un vrai écran Dashboard recréé dans le style corail/anneau multicolore d'une référence Behance "Noom" fournie par l'utilisateur) : feu vert explicite ("je le veux sur l'app maintenant"). **Gros changement d'identité** — abandon du "sombre premium" (gold/violet sur quasi-noir) construit tout au long de cette session au profit d'un fond corail dégradé, cartes blanches, anneau conique multicolore (jaune→rose→violet→bleu) en accent décoratif.

**Périmètre de ce premier lot** (pas "toute l'app" en un coup — voir pourquoi plus bas) :

1. **Sphère IA de la nav** (`nav.css`) : recolorée du gradient or/violet vers la palette de l'anneau (jaune→rose→violet→bleu), signalée "moche" par l'utilisateur contre le nouveau fond — reprend maintenant la même famille de couleurs que l'anneau plutôt qu'une palette isolée.

2. **Tokens globaux** (`global.css`) — le vrai cœur du changement :
   - `--bg` : quasi-noir → dégradé corail, posé directement sur `#root` (pas juste une valeur de token, un vrai `radial-gradient` avec plusieurs arrêts).
   - `--surface`/`--surface-solid` : quasi-noir → blanc. `--surface-2` : blanc cassé chaud.
   - **Erreur évitée de justesse, découverte en auditant le code plutôt qu'en devinant** : `--text-primary/secondary/muted` ont d'abord été mis en blanc (en supposant "texte sur le fond corail"), ce qui a immédiatement cassé quasiment toutes les feuilles/modales de l'app (Settings, Messages, AICoach, ResetPassword, DeleteAccountButton, Login, OnboardingTour...) qui utilisent `var(--surface-solid)` en fond — texte blanc sur fond blanc, invisible. Un grep systématique de `var(--surface)`/`var(--surface-solid)` dans tout `src/` a montré que la vaste majorité du texte de l'app est **dans** une carte/feuille blanche, pas directement sur le fond corail. **Tokens inversés en conséquence** : `--text-primary/secondary/muted` sont maintenant sombres par défaut (corrige d'un coup la quasi-totalité des feuilles/modales de l'app sans les toucher une par une), et c'est le cas inverse — texte posé directement sur le fond corail (kickers, titres d'écran, greetings) — qui force maintenant une couleur claire explicite, écran par écran.
   - `.card` génère maintenant sa propre encre sombre par défaut (`color: #1B1710` + overrides locaux `.text-primary/secondary/muted`), généralisant un pattern qui n'existait avant que pour `.card-hero`/`.card-violet`. Ces deux variantes simplifiées : elles étaient un fond dégradé (or/violet) sur fond sombre — sur un fond déjà coloré (corail), un deuxième dégradé par-dessus faisait du bruit visuel plutôt que de la hiérarchie ; elles sont maintenant juste des cartes blanches avec un rayon/ombre un peu plus marqués.
   - `.btn-accent` (CTA principal partout dans l'app) et `.dashboard-cta-btn` : or → **encre quasi-noire**. Volontaire : sur un écran déjà chaud/coloré, un bouton sombre et retenu se démarque et lit comme "premium" — c'est le seul levier qui garde un peu de l'ADN "sombre exclusif" dans une palette autrement chaude.
   - `.section-label` (titres de section partagés, utilisés sur Nutrition/Settings/Weekly/CoachSettings...) : forcé clair — corrige plusieurs écrans d'un coup.

3. **Dashboard.jsx** (entièrement audité et refait) : anneau décoratif ajouté (`.dashboard-ring`, positionné en haut à droite, cliché par l'overflow de `#root`), icônes redevenues des emoji avec badge de couleur par carte (👟🏃💧😴 — "tu peux remmetre les emoji ça marche avec ce style"), header/greeting/date forcés en blanc explicite, bug de contraste réel trouvé et corrigé (`.activity-card-value` en `var(--text-primary)` sur `.activity-card-compact` qui ne passe pas par la classe `.card` — blanc sur blanc avant le fix), feuille d'édition (bottom sheet) qui était en dur `#141414` (jamais suivi le thème) alignée sur le nouveau système blanc.

4. **Nutrition.jsx** (entièrement audité) : même traitement — kicker/date forcés blancs, icônes de recette/repas redevenues emoji (💡✨📸🔗🍳🥗🍽️🍎) avec badges colorés, badge "Idée recette" corrigé (fond translucide blanc sur carte maintenant blanche = invisible avant le fix).

5. **Kickers d'écran** (Sleep, Hydration, Settings, Weekly, Workout, CoachDashboard) : même correctif "texte forcé clair" + retour aux emoji, en balayage rapide.

**Pas fait dans ce lot, à reprendre** : l'onglet Course de Workout (RunContent.jsx, toujours le chantier en attente de décision — voir suite 39), les écrans Sleep/Hydration/Weekly/Settings/CoachDashboard au-delà de leur seul kicker (le corps de ces écrans profite déjà de l'inversion des tokens mais n'a pas été audité écran par écran comme Dashboard/Nutrition), AICoach/Messages/Login/ResetPassword/ClientsList/CoachMessages/CoachSettings/AppTour/OnboardingTour/Onboarding (pas touchés du tout — bénéficient automatiquement du fix systémique des tokens pour le texte-dans-carte, mais leurs éventuels headers "sur fond corail" n'ont pas été vérifiés un par un).

**Pourquoi pas tout d'un coup** : l'audit du bug `.activity-card-compact` et la découverte du bug bien plus large des feuilles blanches (`var(--surface-solid)`) confirment qu'un changement aveugle de toute l'app en une fois aurait très probablement shippé des textes invisibles sur plusieurs écrans, exactement le genre de régression déjà vue plusieurs fois cette session ("ton sur ton", "noir sur noir"). Préféré : livrer un socle solide (tokens + 2 écrans complets, vérifiés un par un) plutôt qu'une couverture large mais non fiable.

**Vérifié dans le build compilé** : `npm run build` passe à chaque étape (plusieurs builds intermédiaires, un a attrapé une vraie erreur de syntaxe JSX — `*/ ` littéral dans un commentaire fermait le commentaire prématurément). Pas de vérification visuelle réelle en navigateur (aucun outil de ce type dans ce sandbox) — c'est le point le plus important à confirmer sur le lien de prod avant de continuer sur les écrans restants.

## 2026-08-06 — Session 18 (suite 39) : onglet Course de Workout — diagnostic sévère + petit fix météo

Capture d'écran de l'onglet "Course" de Workout, question directe : "je sais pas si elle est encore utile en vrai ?". Lecture complète de `RunContent.jsx` a révélé que **la quasi-totalité de cet écran est un prototype jamais branché sur de vraies données** :
- Le graphique "Allure par km" (7 barres) : tableau `paceData` codé en dur, jamais alimenté par une vraie course.
- "142 bpm" : valeur fixe, aucun capteur cardio connecté nulle part dans l'app.
- "32.6 km · 5 sorties · Avg 5:18/km" (bloc "Cette semaine") : codé en dur — d'où l'incohérence visible à l'écran avec le "0/6 séances" du hero card juste au-dessus.
- Les valeurs par défaut avant de lancer une course (5:12/km, 27:18, 5.24km) : placeholders, pas de vraies stats.
- Le bouton START ne fait pas de vrai tracking GPS : la distance s'incrémente de +0.0032km/seconde par un minuteur, indépendamment de la position réelle (`watchPosition` jamais utilisé).
- Au STOP : rien n'est sauvegardé nulle part — la course "disparaît".

Seule la météo (vraie géoloc + Open-Meteo) était réelle. Avis donné : ce n'est pas un problème de polish visuel, c'est une coquille qui peut induire un membre en erreur en lui laissant croire que ce sont ses vraies stats. Recommandation faite (à trancher avec Arnaud) : remplacer par un simple formulaire manuel qui écrit dans le vrai pipeline `kmRun` déjà utilisé ailleurs (Coach IA, Dashboard), plutôt que construire un vrai tracker GPS live (chantier bien plus lourd : précision GPS mobile web, tracking en arrière-plan limité par les navigateurs, batterie) — décision produit **pas encore prise**, à reprendre.

**Petit fix fait entre-temps** : la carte météo affichait température/condition mais jamais le lieu ("ça me dit pas où je suis"). Ajout d'un géocodage inverse (BigDataCloud, endpoint client-side, pas de clé API — fait justement pour cet usage) qui résout les coordonnées GPS en nom de ville, affiché à côté de la météo. Best-effort : si l'appel échoue, la carte météo s'affiche quand même normalement, juste sans le nom de lieu.

**Vérifié dans le build compilé** : `npm run build` OK, `grep bigdatacloud.net/data/reverse-geocode-client` trouvé dans le JS compilé. Pas de vérification visuelle réelle (pas de navigateur ici) — à confirmer sur le lien de prod, et surtout **la vraie question (formulaire manuel vs vrai GPS vs suppression de l'onglet) reste ouverte**, à trancher avant de retoucher le reste de cet écran.

## 2026-08-06 — Session 18 (suite 38) : icônes cassées → bascule sur lucide-react

Retour direct : "Les icônes en svg [...] certaines sont cassées ça ne donne pas." Root cause honnête : les tracés SVG d'`Icon.jsx` (suite 37) avaient été dessinés à la main, de mémoire, sans aucun moyen de les vérifier visuellement dans ce sandbox (pas de navigateur) — plusieurs étaient effectivement mal formés. Question posée en retour ("est-ce que je peux mettre une clé API") : non, pas de clé API nécessaire ici — ce n'est pas un service génératif, juste un set d'icônes statique.

**Fix** : `npm install lucide-react` (bibliothèque MIT, très largement utilisée en production — shadcn/ui, Directus, etc. — même famille que Feather Icons). `Icon.jsx` réécrit pour mapper les mêmes noms (`home`, `utensils`, `dumbbell`...) vers les vrais composants Lucide au lieu de tracés SVG maison — **aucun des 15 fichiers appelants n'a eu besoin d'être modifié**, seule l'implémentation interne du composant a changé. Élimine définitivement le risque de path SVG mal formé puisque ce sont des icônes professionnelles déjà vérifiées par des millions d'usages en prod, pas quelque chose que je dessine à l'aveugle.

**Vérifié dans le build compilé** : `npm run build` passe (1923 modules, +10 Ko gzippé — normal pour de vraies icônes). Pas de test de rendu visuel supplémentaire fait ici (pas de navigateur) — mais contrairement à la suite 37, la correction ne dépend plus de mon exactitude à dessiner des paths SVG à la main, donc le risque résiduel est bien plus faible.

**Vulnérabilités npm relevées en passant** (`npm audit`) : esbuild/postcss/react-router/vite, toutes pré-existantes dans les devDependencies (rien à voir avec ce changement) — pas touchées, hors périmètre de cette demande.

## 2026-08-06 — Session 18 (suite 37) : premier passage "direction visuelle premium" (tâche #27)

Feu vert explicite ("transforme tout") sur la tâche #27, en attente depuis longtemps. Périmètre choisi pour ce premier passage — pas une refonte totale d'un coup, mais trois leviers concrets et vérifiables sans navigateur :

**1. Nouveau set d'icônes (`src/components/Icon.jsx`)** : remplace les emoji utilisés comme chrome UI (icônes de section, de bouton, de nav — 🏠🍽️💧😴🏋️⚙️📋👥📊💬📸🔗✨💡⚡💪🥗🏆🔑🎙️🧑‍🏫) par un set cohérent de line-icons SVG (24x24, `currentColor`, mêmes proportions que le mark VOLTA) sur 15 fichiers. **Choix délibéré** : les emoji purement décoratifs/personnalité (le 👋 d'un toast de bienvenue, la météo de RunContent.jsx ☀️🌧️, les ✓ typographiques) restent des emoji — les remplacer aurait été une régression, pas une amélioration. Documenté explicitement dans le commentaire d'en-tête d'Icon.jsx pour que ce ne soit pas ré-interprété comme un oubli plus tard.

**2. Typographie** : `.text-2xl` (déjà utilisé pour les hero numbers Sommeil/Hydratation) et une nouvelle classe `.hero-number` (calories Dashboard/Nutrition, qui utilisaient un `fontSize` inline plutôt que la classe) passent en Unbounded — reste scopé aux gros chiffres qu'on regarde en premier sur chaque écran, pas un changement de police global.

**3. Micro-interactions** : `.card`, `.btn-accent`, `.btn-ghost` ont maintenant un vrai retour tactile (`:active { transform: scale(...) }`) — avant, seul Landing avait ça. `.card:active` s'applique à toutes les cartes sans distinction cliquable/pas cliquable (CSS ne peut pas facilement cibler "seulement les cartes avec onClick" sans toucher des dizaines de fichiers un par un) — effet négligeable sur une carte statique vu que ça ne dure que le temps du contact.

**Pas fait dans ce passage** (périmètre trop large pour un coup, à reprendre si demandé) : un vrai système de glow/dégradé étendu à `.card` plain (actuellement `.card-hero`/`.card-violet` ont déjà ce traitement, `.card` simple reste flat par choix — l'étendre partout risquerait de surcharger visuellement), micro-animations d'entrée plus poussées, remplacement des ✓ par une icône check cohérente (mineur, laissé de côté).

**Vérifié dans le build compilé** : `grep hero-number{font-family:Unbounded...}`, `.card:active{transform:scale(.985)}`, `.btn-accent:active{...}` et le path SVG du mark "home" tous trouvés dans le CSS/JS compilé. Sweep final `grep` des emoji restants dans `src/` confirmé conforme à l'intention (uniquement ✓, météo, toast 👋). Comme toujours, pas de navigateur dans ce bac à sable pour un rendu visuel réel — à confirmer sur le lien de prod, en particulier le rendu des nouvelles icônes à leurs tailles réelles.

## 2026-08-06 — Session 18 (suite 36) : le vrai bug des icônes — outil de génération cassé, pas le SVG

Retour : "Le logo est toujours cassé sur l'écran d'accueil de l'iPhone" malgré le fix de la suite 34 (viewBox). Le viewBox était bien corrigé, mais **l'outil de génération des PNG lui-même produisait un fichier cassé** à 192×192 sans que je m'en aperçoive : `chrome --headless --window-size=192,192 --screenshot=...` régénérait un fichier qui *rapporte* 192×192 via `file`, mais dont le contenu réel ne remplit que le haut ~55% du canevas (le reste est un aplat de la couleur de fond, invisible à l'œil sur un fond uni mais qui coupe la moitié basse du mark). Confirmé par un test de diagnostic (rectangle plein rouge 192×192 → correct ; gradient radial seul 192×192 → même artefact ; testé à 192×600 → contenu complet dans les 192 premiers px). Root cause probable : ce build de Chromium headless réserve un espace interne minimum pour la fenêtre, invisible aux flags `--window-size` standards, qui rogne le viewport réel en dessous d'une certaine hauteur — indépendant de mon SVG, indépendant de `--headless=new` vs legacy.

**Fix réel** : abandon du flag CLI `--screenshot`, bascule sur la lib **Playwright** (`playwright@1.56.1`, déjà installée globalement dans l'environnement sous `/opt/node22/lib/node_modules`, pointée vers le Chromium pré-installé via `executablePath`) qui gère son propre viewport via CDP sans passer par la fenêtre OS — plus de bug. Icônes 192 et 512 régénérées ainsi, relues visuellement (Read tool) : les deux sont maintenant complètes et identiques visuellement, juste à des résolutions différentes.

**Point important pour Arnaud** : même après ce fix déployé, le raccourci déjà présent sur son écran d'accueil iPhone ne se mettra PAS à jour tout seul — iOS capture l'icône au moment du "Sur l'écran d'accueil" et ne la re-télécharge jamais après. Il doit **supprimer le raccourci existant et le ré-ajouter** depuis Safari une fois le déploiement propagé.

**Vérifié dans le build compilé** : `npm run build` OK. Icônes relues visuellement, complètes cette fois. Note technique laissée pour la suite : si on doit régénérer des icônes/mockups HTML→PNG plus tard, utiliser `NODE_PATH=/opt/node22/lib/node_modules node` + `require('playwright')` avec `executablePath` vers `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`, PAS le flag CLI `--screenshot` en direct (bug de rendu en dessous d'une certaine taille de fenêtre).

## 2026-08-06 — Session 18 (suite 35) : 2-3 choix de recette au lieu d'une seule proposition

Suite directe de la suite 34 : "Pourquoi ne pas proposer 2/3 plats différents à l'utilisateur ? [...] le but c'est pas d'avoir des infos approximative." Bonne remarque — donner le choix règle la perception "hasardeux" à la racine (c'est l'utilisateur qui choisit, pas l'IA qui décide seule) sans qu'il faille sacrifier la précision.

**Ce qui a été fait :**
- `generateRecipe()` (auto) et `generateRecipeFromPhoto()` demandent maintenant 3 options (jusqu'à 3 pour la photo — si les ingrédients visibles ne permettent raisonnablement qu'une recette, l'IA n'en renvoie qu'une plutôt que d'en inventer une deuxième). Nouveau state `recipeOptions` (array), `recipe` reste la recette *choisie* (vue détail).
- Chaque option garde son propre `why` (déjà ajouté en suite 34), affiché dans la carte de sélection.
- Nouvelle UI : liste de 3 cartes compactes (nom, why, kcal/P/G/L) avant la vue détail complète ; bouton "← Revoir les autres options" dans le détail pour revenir en arrière sans nouvel appel API ; bouton "Voir d'autres idées" pour régénérer un nouveau lot de 3.
- `recipeRegenerateRef` (useRef) capture la bonne fonction à rappeler (auto vs photo, avec le bon fichier photo en closure) — évite que "voir d'autres idées" déclenche le mauvais chemin de génération.
- **Chemin lien volontairement inchangé** (une seule recette) : la vidéo/légende contient UNE recette réelle, en proposer 3 reviendrait à en inventer 2 non présentes dans la source — contraire à la demande explicite de ne pas avoir d'infos approximatives. Le bouton "Une autre idée" y est remplacé par "Changer de repas" (regénérer sur le même transcript n'aurait pas beaucoup de valeur).

**Vérifié dans le build compilé** : `grep "choisis une option"`, `"Voir d'autres idées"`, `"Revoir les autres options"`, `"3 recettes DIFFÉRENTES"` tous trouvés dans le JS compilé. Pas de vérification du rendu réel en navigateur — à confirmer sur le lien de prod.

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

---

## Session du 12/08/2026 — Setup environnement local + nettoyage collision de casse

**Contexte** : première bascule de VOLTA vers Claude Code CLI en local (VS Code), en parallèle du 
déploiement web existant (Vercel reste la source de vérité en prod, le local sert au dev).

**Réalisé** :
- Clone du repo en local (`C:\Users\EBM étudiant(e)\repos\onairapp`), branche `claude/charming-mendel-dj1GQ`
- `npm install` (93 packages, 6 vulnérabilités à auditer plus tard — pas traité cette session)
- Identité git configurée correctement : `goodghost696-cyber <goodghost696@gmail.com>`
- CrewAI installé (`v1.15.15`) en vue d'un futur chantier d'automatisation semi-supervisée 
  (agents proposent des PR, validation humaine avant merge — jamais de commit/push autonome)
- Création de `CLAUDE.md` à la racine : mémoire persistante lue automatiquement au démarrage de 
  chaque session Claude Code (stack, workflow de commit/PR, dette technique connue, règle absolue 
  "app en prod, jamais de changement non vérifié")

**Bug réel trouvé et corrigé** : collision de casse dans le repo. Deux paires de fichiers CSS 
coexistaient en base — `Weekly.css`/`weekly.css` et `Workout.css`/`workout.css` — non détectable sur 
Linux/Vercel (sensible à la casse) mais causant un écrasement mutuel sur disque Windows (insensible à 
la casse). Vérification par `git ls-files` + `Select-String` sur les imports JSX a confirmé que seuls 
`Weekly.css` (importé par `Weekly.jsx`) et `Workout.css` (importé par `Workout.jsx`) sont réellement 
utilisés. Les doublons minuscules — morts, jamais importés nulle part — ont été supprimés via 
`git rm -f`. Le contenu des vrais fichiers a été restauré proprement via `git checkout HEAD` après 
un incident où la suppression avait temporairement affecté le fichier physique partagé.

Cause racine additionnelle identifiée : `core.autocrlf = true` en config Windows, changé en `input` 
pour éviter des diffs fantômes futurs sur les fins de ligne.

**Vérification** : `npm run build` passe (6475 modules, 1m02s, aucune erreur). Seul point d'attention : 
`index-CMFP4szR.js` fait 716 KB après minification, au-dessus du seuil recommandé de 500 KB — 
candidat pour un futur chantier de code-splitting (`React.lazy`), non traité cette session.

**Commit** : `fe92c17` — "fix: remove duplicate lowercase CSS files (weekly.css, workout.css), 
add CLAUDE.md", poussé sur `claude/charming-mendel-dj1GQ`.

**Reste à faire** :
- `npm audit` — 6 vulnérabilités (3 modérées, 3 hautes) jamais traitées
- Code-splitting du bundle JS (716 KB, warning Vite)
- CrewAI installé mais pas encore configuré (pas de tool GitHub custom créé — l'intégration native 
  CrewAI GitHub est Enterprise/payante, l'alternative gratuite via wrapper `gh pr create` reste à coder)
- Recherche d'emploi (CSM + growth marketing, Paris/IDF) démarrée via Indeed MCP, pas automatisée — 
  traité manuellement cette session, hors scope VOLTA
