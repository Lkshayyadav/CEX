# ══════════════════════════════════════════════════════════════════════════════
# Stage 1 – Builder: install deps & run Vite build
# ══════════════════════════════════════════════════════════════════════════════
FROM node:20-alpine AS builder

RUN npm install -g pnpm@9.5.0

WORKDIR /app

# Copy workspace manifests (leverages Docker layer cache)
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/types/package.json ./packages/types/
COPY packages/common/package.json ./packages/common/
COPY apps/frontend/package.json ./apps/frontend/

# Install all dependencies (devDeps needed for Vite/TS build)
RUN pnpm install --frozen-lockfile

# Copy source
COPY packages/ ./packages/
COPY apps/frontend/ ./apps/frontend/

# Build the production Vite bundle
WORKDIR /app/apps/frontend
# Inject the backend URL so Axios hits the backend service name in Docker network
ARG VITE_API_URL=http://backend:3000/api/v1
ARG VITE_WS_URL=ws://backend:3000
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_WS_URL=$VITE_WS_URL

RUN pnpm build

# ══════════════════════════════════════════════════════════════════════════════
# Stage 2 – Runner: serve the static bundle via Nginx (Alpine)
# ══════════════════════════════════════════════════════════════════════════════
FROM nginx:1.27-alpine AS runner

# Remove default Nginx welcome page
RUN rm -rf /usr/share/nginx/html/*

# Copy Vite dist into Nginx html root
COPY --from=builder /app/apps/frontend/dist /usr/share/nginx/html

# Nginx config: SPA routing (all 404s → index.html for react-router)
COPY apps/frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
