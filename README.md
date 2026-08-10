# Agilomètre

Diagnostic de maturité agile — séances animées et pouls par email. Voir [doc/spec/PRD-maturite-agile.md](doc/spec/PRD-maturite-agile.md) pour le cadrage produit.

## Stack

- **Backend** : NestJS + Prisma + PostgreSQL (`apps/backend`)
- **Frontend** : Angular + ng-zorro-antd + ApexCharts (`apps/frontend`) — thème personnalisable via `apps/frontend/src/theme.less`
- **Partagé** : types TS communs backend/frontend (`packages/shared`)
- **Déploiement** : `docker-compose` (image unique servant l'API et le front buildé, + Postgres)

## Démarrer en développement

Prérequis : Node 22+, pnpm, Docker.

```bash
pnpm install
cp .env.example .env          # adapter SMTP_* et JWT_SECRET
pnpm dev:db                   # démarre Postgres (docker compose)
pnpm --filter backend exec prisma migrate dev   # applique le schéma
pnpm dev                      # backend (Nest, :3000) + frontend (Angular, :4200 avec proxy /api)
```

Le frontend est accessible sur http://localhost:4200, l'API sur http://localhost:3000/api (health check : `/api/health`).

## Structure

```
apps/backend    NestJS — API, moteur de scoring, jobs de pouls, envoi d'emails
apps/frontend   Angular — séance animée, restitutions, administration
packages/shared Types partagés (rôles, scoring)
```

## Scripts racine

- `pnpm dev` — backend + frontend en parallèle
- `pnpm build` — build de production (shared → backend → frontend)
- `pnpm lint` / `pnpm test` — sur tous les workspaces

## Déploiement

```bash
cp .env.example .env   # renseigner le SMTP du client et un JWT_SECRET de production
docker compose up --build -d
```

Le reverse proxy (TLS, domaine) est à la charge du client, en amont du conteneur `app` (port 8080 exposé par défaut).
