# ══════════════════════════════════════════════════════════════════════════════
# Stage 1 – Dependency installer (pnpm deploy prunes to prod-only deps)
# ══════════════════════════════════════════════════════════════════════════════
FROM node:20-alpine AS deps

# Install pnpm globally
RUN npm install -g pnpm@9.5.0

WORKDIR /app

# Copy workspace manifests first (cache-friendly layer)
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/types/package.json ./packages/types/
COPY packages/common/package.json ./packages/common/
COPY apps/backend/package.json ./apps/backend/

# Install ALL dependencies (including devDeps needed for build)
RUN pnpm install --frozen-lockfile

# ══════════════════════════════════════════════════════════════════════════════
# Stage 2 – Builder: compile TypeScript & generate Prisma client
# ══════════════════════════════════════════════════════════════════════════════
FROM deps AS builder

# Copy all source files
COPY packages/ ./packages/
COPY apps/backend/ ./apps/backend/

WORKDIR /app/apps/backend

# Generate Prisma client then compile TypeScript
RUN pnpm prisma:generate && pnpm build

# ══════════════════════════════════════════════════════════════════════════════
# Stage 3 – Runner: lean production image
# ══════════════════════════════════════════════════════════════════════════════
FROM node:20-alpine AS runner

RUN npm install -g pnpm@9.5.0

WORKDIR /app

# Copy workspace manifests
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/types/package.json ./packages/types/
COPY packages/common/package.json ./packages/common/
COPY apps/backend/package.json ./apps/backend/

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy compiled output and Prisma artifacts from builder
COPY --from=builder /app/apps/backend/dist ./apps/backend/dist
COPY --from=builder /app/apps/backend/prisma ./apps/backend/prisma
# Prisma generated client lives in node_modules – already installed via prod deps above

ENV NODE_ENV=production
EXPOSE 3000

WORKDIR /app/apps/backend
CMD ["node", "dist/index.js"]
