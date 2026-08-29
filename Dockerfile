# syntax=docker/dockerfile:1

FROM node:22-slim AS base
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
RUN corepack enable
WORKDIR /repo

FROM base AS deps
COPY pnpm-workspace.yaml package.json .npmrc ./
COPY packages/shared/package.json packages/shared/package.json
COPY apps/backend/package.json apps/backend/package.json
COPY apps/frontend/package.json apps/frontend/package.json
COPY pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile || pnpm install

FROM deps AS build
COPY . .
RUN pnpm --filter shared build
RUN pnpm --filter backend exec prisma generate
RUN pnpm --filter backend build
RUN pnpm --filter frontend build

FROM base AS runtime
ENV NODE_ENV=production
WORKDIR /repo

# On reprend node_modules du stage de build (pnpm workspace + client Prisma déjà généré)
# plutôt qu'un `pnpm install --prod` séparé : plus simple et évite de réinstaller
# le CLI Prisma juste pour regénérer le client au runtime.
COPY --from=build /repo/pnpm-workspace.yaml /repo/package.json ./
COPY --from=build /repo/node_modules node_modules
COPY --from=build /repo/apps/backend/package.json apps/backend/package.json
COPY --from=build /repo/apps/backend/node_modules apps/backend/node_modules
COPY --from=build /repo/apps/backend/dist apps/backend/dist
COPY --from=build /repo/apps/backend/prisma apps/backend/prisma
COPY --from=build /repo/apps/backend/prisma.config.ts apps/backend/prisma.config.ts
COPY --from=build /repo/packages/shared/package.json packages/shared/package.json
COPY --from=build /repo/packages/shared/dist packages/shared/dist
COPY --from=build /repo/apps/frontend/dist/frontend/browser apps/backend/public

WORKDIR /repo/apps/backend
USER node
EXPOSE 3000
HEALTHCHECK --interval=5s --timeout=5s --start-period=30s --retries=5 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', r => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

# npx prisma migrate deploy nécessite node_modules complet : le CLI prisma est une devDependency,
# présente ici uniquement parce que ce stage recopie node_modules tel quel depuis le stage build.
CMD ["sh", "-c", "npx prisma migrate deploy && exec node dist/src/main.js"]
