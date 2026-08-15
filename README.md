# VOLTA App

## Setup
1. `cp .env.example .env` puis renseigner les valeurs (voir les commentaires dans `.env.example`)
2. `npm install`
3. `npm run dev`

## Comptes de test
Créer un compte via l'écran d'inscription (`/login` → onglet Inscription), avec le
code d'accès de la salle. Il n'y a plus de comptes de démo en dur — l'ancien
système d'auth localStorage (`coach@onair.fr` / `membre@onair.fr`) a été remplacé
par Supabase Auth.

## Coach IA
La clé Anthropic est **exclusivement côté serveur** (`ANTHROPIC_API_KEY`, lue par
le proxy `api/claude.js`) — jamais exposée au client. Ne jamais la mettre dans une
variable `VITE_*` : Vite inline toute variable préfixée `VITE_` dans le bundle
client, ce qui exposerait la clé publiquement. En développement local, définir
`ANTHROPIC_API_KEY` (sans préfixe) dans `.env`.
