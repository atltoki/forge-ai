# FORGE AI

FORGE AI est un OS d’agents IA. La V0.2 transforme le cockpit V0.1 en base applicative Next.js utilisable pour créer, superviser et faire évoluer des agents, des missions, des outils, de la mémoire et des logs.

## Stack

- Next.js 15, TypeScript, App Router
- Tailwind CSS
- Supabase Auth + PostgreSQL + RLS
- Cloudflare Workers pour l’exécution des missions
- Vercel pour le déploiement web

## Pages

- Dashboard
- Agents
- Missions
- Memory
- Tools
- Logs
- Analytics
- Auth
- Settings

## Architecture

```text
Mission
-> Manager
-> Découpage
-> Agents
-> Tools
-> Résultats
-> Memory
-> Dashboard
```

Le code est organisé autour de moteurs simples et typés :

- `lib/engines/agent-engine.ts`
- `lib/engines/mission-engine.ts`
- `lib/engines/tool-manager.ts`
- `lib/engines/memory-engine.ts`

## Lancer en local

```bash
npm install
cp .env.example .env.local
npm run dev
```

Puis ouvrez [http://localhost:3000](http://localhost:3000).

Sans Supabase configuré, l’application reste utilisable avec les données de démonstration.

## Supabase

1. Créez un projet Supabase.
2. Exécutez `supabase/schema.sql` dans l’éditeur SQL Supabase.
3. Ajoutez dans Vercel et `.env.local` :

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=https://forge-ai-black-kappa.vercel.app/api/google/callback
```

Le schéma crée les tables suivantes :

- `users`
- `agents`
- `missions`
- `memory`
- `tools`
- `logs`
- `executions`

Toutes les tables principales utilisent Row Level Security pour isoler les données par utilisateur.

## Cloudflare Worker

```bash
cd workers/mission-runner
npx wrangler secret put WORKER_API_TOKEN
npx wrangler deploy
```

Ajoutez ensuite dans Vercel :

```bash
WORKER_API_URL=
WORKER_API_TOKEN=
CLOUDFLARE_ACCOUNT_ID=
CLOUDFLARE_AI_GATEWAY_ID=
```

Le Worker actuel sert de passerelle sécurisée pour accepter une mission. Les prochaines étapes seront l’exécution réelle des outils, la file d’attente et le retour des résultats dans Supabase.

## API

- `GET /api/health`
- `GET /api/agents`
- `GET /api/tools`
- `GET /api/missions`
- `POST /api/missions`
- `GET /api/mission-engine`
- `POST /api/mission-engine`
- `GET /api/auth/status`

## Workflow

Chaque évolution doit passer par :

1. Nouvelle branche
2. Commit propre
3. Push GitHub
4. Pull Request
5. Changelog

Le dépôt GitHub reste la source de vérité.
