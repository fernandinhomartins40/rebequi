# syntax=docker/dockerfile:1.7

# Stage 1: Build
FROM node:20-bookworm-slim AS builder

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ pkg-config libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev \
  && rm -rf /var/lib/apt/lists/*

# Copy workspace manifests first so dependency install can be cached longer
COPY package*.json ./
COPY tsconfig.json ./
COPY apps/frontend/package*.json ./apps/frontend/
COPY packages/shared/package*.json ./packages/shared/

# Install only the workspaces needed by the frontend build
RUN --mount=type=cache,target=/root/.npm \
    npm ci \
      --workspace=apps/frontend \
      --workspace=packages/shared \
      --prefer-offline \
      --no-audit \
      --no-fund \
      --fetch-retries=5 \
      --fetch-retry-factor=2 \
      --fetch-retry-maxtimeout=120000

# Copy source after dependencies are installed
COPY apps/frontend ./apps/frontend
COPY packages/shared ./packages/shared

# Build shared workspace first so frontend resolves package exports from dist
WORKDIR /app
RUN npm run build --workspace=packages/shared

# Build frontend
WORKDIR /app/apps/frontend
RUN npm run build

# Stage 2: Production with Nginx
FROM nginx:alpine AS runner
ARG RELEASE_VERSION=dev
LABEL org.opencontainers.image.revision=$RELEASE_VERSION

# Copy built files to nginx
COPY --from=builder /app/apps/frontend/dist /usr/share/nginx/html

# Copy custom nginx configuration
COPY apps/frontend/nginx.conf /etc/nginx/conf.d/default.conf
RUN printf '%s\n' "$RELEASE_VERSION" > /usr/share/nginx/html/release.txt

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
