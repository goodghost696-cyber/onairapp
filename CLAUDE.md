# CLAUDE.md

Ce fichier est lu automatiquement au démarrage de chaque session Claude Code sur ce repo. Il donne le contexte minimal pour ne pas casser une app en production.

## 1. Stack

- **Frontend** : React 18 + Vite
- **Backend** : Supabase (Auth, Postgres, Realtime, RLS)
- **IA** : Claude Haiku 4.5, appelé via le proxy `/api/claude` (jamais d'appel direct à l'API Anthropic depuis le client)
- **Hébergement** : Vercel

## 2. Convention de workflow

Suivre cet enchaînement dans l'ordre, sans sauter d'étape :

1. Éditer le code
2. `npm run build`
3. `grep` du bundle compilé pour confirmer que le changement est bien présent dans le build
4. `commit`
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

## 4. Règle absolue

**L'app est en production et des prospects la testent activement.**
Jamais de changement non vérifié : chaque étape du workflow (section 2) doit être respectée avant tout merge.

## 5. Historique

Voir `JOURNAL.md` à la racine pour l'historique détaillé session par session.
