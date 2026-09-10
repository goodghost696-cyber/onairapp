# CLAUDE.md

Ce fichier est lu automatiquement au démarrage de chaque session Claude Code sur ce repo. Il donne le contexte minimal pour ne pas casser une app en production.

## 1. Stack

- **Frontend** : React 18 + Vite
- **Backend** : Supabase (Auth, Postgres, Realtime, RLS)
- **IA** : Claude Haiku 4.5, appelé via le proxy `/api/claude` (jamais d'appel direct à l'API Anthropic depuis le client)
- **Hébergement** : Vercel

## 2. Convention de workflow

Suivre cet enchaînement dans l'ordre, sans sauter d'étape :

0. Investiguer la cause racine et signaler tout écart entre la demande et l'état réel du code **avant** de modifier quoi que ce soit — jamais improviser sur une ambiguïté ou une hypothèse non vérifiée sans le dire d'abord.
1. Éditer le code
2. `npm run build`
3. `grep` du bundle compilé pour confirmer que le changement est bien présent dans le build
4. `commit`
   - Un hook `PreToolUse` bloque `git commit` si `dist/` est absent ou plus ancien que les fichiers sources modifiés — l'étape 2 doit avoir réellement tourné avant, pas juste être mémorisée d'une session à l'autre.
5. `git fetch` de la branche de base
6. `checkout -B` sur une branche de travail à jour
7. `cherry-pick` du commit
8. Re-`build`
9. `push --force-with-lease`
10. Ouvrir la PR en **draft**
11. Passer la PR en **ready**
12. `poll` du statut de déploiement Vercel jusqu'à confirmation
13. `merge squash`

**Toujours écrire l'entrée `JOURNAL.md` avant de merger.**

## 3. Dette technique connue — ne jamais casser par accident

- Pas de `gym_id` dans le schéma Supabase
- Pas de lien coach ↔ membres formalisé
- Zéro test automatisé sur le repo
- Risque de mock data résiduelle dans le code (cf. incident `RunContent.jsx`)
- Pièges CSS/timing récurrents (constatés plusieurs fois dans `JOURNAL.md`) — à revérifier avant tout fix visuel/nav :
  - une media query desktop qui surcharge `flex`/`background`/etc. mais oublie `display` (la règle de base hors media query reste seule à fixer cette propriété et gagne à toute largeur)
  - un mécanisme repris tel quel d'un axe à l'autre (nav bottom → sidebar) sans revérifier que le calcul (slots égaux, `translateX`/`translateY`) a bien un sens dans le nouveau contexte
  - un `id` de gradient/`clipPath` SVG fixe dans un composant monté plusieurs fois simultanément (ex. `Logo` + `SplashIntro`) — collision d'id dans le même document
  - une couleur/contraste "fixe" justifiée par un commentaire qui suppose un fond figé ailleurs (`brand.css` sur fond crème/sombre) — à revérifier après tout changement de fond sur l'écran qui l'utilise, le commentaire d'origine devient facilement obsolète sans que personne ne le remarque
  - le Service Worker en cache-first : un changement visuel peut sembler ne "rien faire" pour un utilisateur déjà passé sur l'app avant le fix

## 4. Règle absolue

**L'app est en production et des prospects la testent activement.**
Jamais de changement non vérifié : chaque étape du workflow (section 2) doit être respectée avant tout merge.

## 5. Historique

Voir `JOURNAL.md` à la racine pour l'historique détaillé session par session.

**Hygiène de contexte** : `JOURNAL.md` grossit à chaque session (rituel de fin de session) et est censé être lu avant de reprendre le travail — au-delà d'un certain volume, le lire en entier par défaut consomme une part significative du contexte avant même de commencer. Privilégier les sections vivantes (charte graphique + chantiers ouverts, en haut du fichier) + les entrées datées les plus récentes plutôt que la lecture intégrale systématique. Si `JOURNAL.md` dépasse ~3000 lignes, envisager d'archiver les entrées de plus de 2 mois dans `JOURNAL_ARCHIVE.md`, en laissant un pointeur ici.

## 6. Superpowers — usage restreint

Le plugin Superpowers est installé (user scope) mais NE DOIT PAS remplacer le workflow standard
de ce projet. Pour toute session VOLTA, c'est le workflow défini plus haut dans ce fichier
(édition → build → grep → commit → PR → poll Vercel → merge) qui prime sur les skills génériques
de Superpowers (TDD, brainstorming, debugging systématique, code-reviewer).

N'invoque un skill Superpowers QUE si l'instruction le demande explicitement dans le prompt
(ex: "utilise le skill de debugging systématique de Superpowers sur ce bug", "utilise l'agent
code-reviewer avant de commit"). Par défaut, sans mention explicite, ignore Superpowers et
applique le workflow standard.
