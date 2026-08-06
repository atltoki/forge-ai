# FORGE AI

FORGE AI est la migration Next.js du cockpit opérationnel V0.1. Le projet conserve l'identité sombre avec accent vert lime de l'interface initiale, tout en remplaçant la page HTML unique par des routes typées et des composants React réutilisables.

## Contenu du projet

- Next.js 15, TypeScript, App Router et Tailwind CSS
- Pages : Dashboard, Agents, Missions, Memory et Settings
- Structure d'application, icônes, cartes de métriques et indicateurs de progression réutilisables
- Données de démonstration pour une interface utilisable immédiatement
- Configuration client/serveur Supabase et schéma avec règles de sécurité RLS
- Base d'une passerelle de missions Cloudflare Worker
- Endpoints API : `GET /api/health` et `GET /api/missions`

## Lancer le projet en local

```bash
npm install
cp .env.example .env.local
npm run dev
```

Ouvrez [http://localhost:3000](http://localhost:3000). Sans variables d'environnement configurées, l'application utilise volontairement les données de démonstration.

## Connecter Supabase

1. Créez un projet Supabase.
2. Exécutez [`supabase/schema.sql`](./supabase/schema.sql) dans l'éditeur SQL Supabase.
3. Ajoutez `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY` à `.env.local`.
4. Ajoutez l'authentification puis remplacez progressivement les données de démonstration de `lib/data.ts` selon les besoins du produit.

L'API des missions lit automatiquement Supabase lorsqu'il est configuré. Sinon, elle renvoie les données de démonstration afin de faciliter le développement local.

## Déployer le Worker de missions

```bash
cd workers/mission-runner
npx wrangler secret put WORKER_API_TOKEN
npx wrangler deploy
```

Après le déploiement, ajoutez `WORKER_API_URL` et `WORKER_API_TOKEN` aux variables d'environnement Next.js. Le Worker valide actuellement un jeton Bearer et accepte une charge utile de mission ; l'exécution des outils et la persistance de file d'attente sont les prochaines intégrations prévues.

## Organisation du projet

```text
app/                     Pages et routes API
components/              Structure de l'application et composants d'interface
lib/supabase/            Clients Supabase navigateur et serveur
supabase/schema.sql      Schéma initial de la base et politiques RLS
workers/mission-runner/  Passerelle Cloudflare Worker
```
