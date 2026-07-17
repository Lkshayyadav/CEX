# ══════════════════════════════════════════════════════════════════════════════
# Stage 1 – Dependency installer
# ══════════════════════════════════════════════════════════════════════════════
FROM node:20-alpine AS deps

RUN npm install -g pnpm@9.5.0

WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/types/package.json ./packages/types/
COPY packages/common/package.json ./packages/common/
COPY apps/engine/package.json ./apps/engine/

RUN pnpm install --frozen-lockfile

# ══════════════════════════════════════════════════════════════════════════════
# Stage 2 – Builder: compile TypeScript
# ══════════════════════════════════════════════════════════════════════════════
FROM deps AS builder

COPY packages/ ./packages/
COPY apps/engine/ ./apps/engine/

WORKDIR /app/apps/engine
RUN pnpm build

# ══════════════════════════════════════════════════════════════════════════════
# Stage 3 – Runner: lean production image
# ══════════════════════════════════════════════════════════════════════════════
FROM node:20-alpine AS runner

RUN npm install -g pnpm@9.5.0

WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/types/package.json ./packages/types/
COPY packages/common/package.json ./packages/common/
COPY apps/engine/package.json ./apps/engine/

RUN pnpm install --frozen-lockfile --prod

COPY --from=builder /app/apps/engine/dist ./apps/engine/dist

ENV NODE_ENV=production

WORKDIR /app/apps/engine
CMD ["node", "dist/index.js"]
