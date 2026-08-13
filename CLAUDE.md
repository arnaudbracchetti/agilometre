# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Communication

Talk to the user in French, even though this file, the code, and the agent skills invoked while
working here (`/ddd`, `/grilling`, `/domain-modeling`, wayfinder, etc.) are all written in
English.

## Git workflow

Always ask for confirmation before creating a git commit — even at the end of a skill (like
`/implement`) whose written instructions say to commit. Never commit silently as an implicit last
step.

## What this is

Agilomètre — an agile maturity diagnostic tool. Coaches run live voting sessions with teams
(projected questions, multi-round votes) and configure recurring "pulse" email campaigns between
sessions. Both feed the same scoring engine. Full product spec: [doc/spec/PRD-maturite-agile.md](doc/spec/PRD-maturite-agile.md) — read it before working on any domain logic (data model, anonymity rules, scoring engine, role-based views).

Key constraints from the PRD that shape the stack (§10):
- Deployed on-premise at each client, one instance per client, no cloud dependency.
- Emails go through the client's own SMTP.
- Live session updates use 2-second HTTP polling, not websockets (robustness behind corporate proxies).
- Response anonymity is a **data model property**, not a display filter — no token/response link is ever persisted (PRD §5).

## Stack

- **Backend** (`apps/backend`): NestJS + Prisma (driver adapter `@prisma/adapter-pg`, required by Prisma 7 — no built-in query engine binary anymore) + PostgreSQL.
- **Frontend** (`apps/frontend`): Angular (standalone components) + ng-zorro-antd (UI kit — theming via `apps/frontend/src/theme.less`, Less variables like `@primary-color` evaluated lazily so they can be redefined after the import) + ApexCharts (`ng-apexcharts`) for radar/trend/gauge visualizations.
- **`packages/shared`**: TS types shared between backend and frontend (roles, scoring result shape) — exists specifically to prevent scoring-calculation drift between the coach/manager/direction views (PRD §6).
- pnpm workspaces monorepo (`apps/*`, `packages/*`).

## Commands

Run from the repo root unless noted.

```bash
pnpm install
cp .env.example .env                              # SMTP_*, JWT_SECRET, POSTGRES_*
pnpm dev:db                                        # postgres via docker compose (port 5433 on host by default)
pnpm --filter backend exec prisma migrate dev      # apply schema after install or schema changes
pnpm dev                                           # backend (Nest, :3000) + frontend (Angular, :4200, proxies /api)
```

- `pnpm build` — shared → backend → frontend, in that order (shared must build first, others import its `dist`).
- `pnpm lint` / `pnpm test` — runs across all workspaces (`pnpm -r run <script>`).
- Single backend test: `pnpm --filter backend exec jest src/health/health.controller.spec.ts`.
- Backend e2e: `pnpm --filter backend run test:e2e`.
- Single frontend test: `pnpm --filter frontend exec ng test --include='**/app.spec.ts'`.
- Regenerate Prisma client after editing `apps/backend/prisma/schema.prisma`: `pnpm --filter backend exec prisma generate` (also runs automatically via `predev`/`prebuild`).
- Production build: `docker compose up --build -d` (see Architecture below for what this builds).

## Architecture

### Backend: one process, but domain modules should be organized by aggregate, not by layer

The current backend skeleton (`health/`, `prisma/`, `config/`) is intentionally minimal —
scaffolding only, no business rules yet. **This project follows DDD**: rich domain models that
own their business rules, not anemic Prisma entities driven by services. Before writing any code
that introduces business rules or a new aggregate, invoke the `/ddd` skill
(`.claude/skills/ddd/SKILL.md`) — it runs a structured design dialogue and should not be skipped
in favor of ad-hoc modeling.

Once real domain modules exist, `apps/backend/src/` should be organized **per aggregate**
(e.g. `referentiel/`, `session/`, `pouls/`, `scoring/`), each with its own domain layer (pure,
no NestJS/Prisma dependency), use cases, and a repository whose interface is defined by the
domain and implemented by infrastructure (dependency inversion) — not by technical concern.
`apps/backend/prisma/schema.prisma` is currently a flat skeleton matching the PRD §4 entities;
expect to revisit it aggregate-by-aggregate as each domain module gets built, not migrate it
wholesale.

`PrismaService` (`apps/backend/src/prisma/prisma.service.ts`) is `@Global()`-provided via
`PrismaModule` — inject it directly, no need to re-import the module per-feature-module.

### Domain validation: `Result<T, E>`, never throw for expected invariant failures

Domain factories that validate a business invariant (e.g. `Niveau.creer`, `Question.creer`) must
return `Result<T, E>` (`apps/backend/src/shared-kernel/result.ts`), not throw. Validation failure
is an expected, common outcome — not an exceptional one — and a thrown exception forces every
caller into `try/catch` for a case that should be handled as an ordinary value. This decision
follows [Khalil Stemmler's static-factory-method guidance](https://khalilstemmler.com/blogs/typescript/when-to-use-a-private-constructor/):
keep the constructor "dumb" (no validation), do all validation in the named static factory
(`creer`, not the constructor).

**Be vigilant when an aggregate/entity has more than one static factory** (e.g. `creer` +
`reconstituer`). A private constructor only guarantees *some* code path validates — not that
*every* path does. Each additional factory must either call the same validation and return a
`Result`, or explicitly document why it's exempt (e.g. `reconstituer` in
`apps/backend/src/referentiel/domain/question.ts` deliberately skips re-validation because it
only rehydrates data that already passed `creer` at import time — this must stay a documented,
deliberate choice per factory, never a silent gap). This exact gap (validation only in `creer`,
silently bypassed by a later `reconstituer`) has already caused a real bug once — check for it
specifically when reviewing or writing a new factory.

### Single-container deployment

In production there is **one** container: NestJS serves both the API (under `/api`, set via
`app.setGlobalPrefix('api')` in `main.ts`) and the built Angular app as static files. The
`Dockerfile` copies `apps/frontend/dist/frontend/browser` into `apps/backend/public` at build
time; `AppModule` only registers `ServeStaticModule` if that directory exists (`existsSync`
check), so nothing breaks in dev, where Angular runs its own dev server on :4200 and proxies
`/api/*` to Nest on :3000 via `apps/frontend/proxy.conf.json`.

Nest's compiled entrypoint is `dist/src/main.js`, **not** `dist/main.js` — the Dockerfile's
`CMD` and `ServeStaticModule`'s path resolution (`join(__dirname, '..', '..', 'public')` in
`app.module.ts`) both depend on this exact nesting; get it wrong and static file serving or the
container startup breaks silently in ways only visible in production.

### Environment validation

`apps/backend/src/config/env.validation.ts` validates required env vars (`DATABASE_URL`,
`JWT_SECRET`, `SMTP_*`) via `class-validator` at `ConfigModule.forRoot({ validate })`, so the app
fails fast on a missing/malformed SMTP config rather than failing later mid pulse-campaign send —
add new required env vars here, not just to `.env.example`.

### pnpm/Docker quirks worth knowing before debugging install issues

- `.npmrc` sets `minimum-release-age=0` — pnpm's supply-chain policy otherwise rejects
  freshly-published packages, which broke Docker builds during scaffolding (blocked `apexcharts`
  published hours earlier). `packageManager` is pinned in root `package.json` so Docker doesn't
  silently fetch a different pnpm major via corepack.
- `only-built-dependencies` in `.npmrc` allow-lists native build scripts (`argon2`,
  `@prisma/client`, `@prisma/engines`, `prisma`) — pnpm blocks these by default.
- The Dockerfile's runtime stage copies `node_modules` wholesale from the build stage rather than
  running a separate `pnpm install --prod` — this avoids needing the Prisma CLI in the runtime
  image just to regenerate the client.
- Postgres is published on host port `5433` by default (`POSTGRES_PORT` in `.env`), not 5432 —
  avoids clashing with other local Postgres instances.

## Agent skills

### Issue tracker

Issues live in GitHub Issues (arnaudbracchetti/agilometre), via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Domain docs

Single-context layout — one `CONTEXT.md` + `docs/adr/` at the repo root (not created yet; `/domain-modeling` generates them lazily as terms/decisions get resolved). See `docs/agents/domain.md`.
