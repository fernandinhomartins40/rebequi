# syntax=docker/dockerfile:1.7

# =============================================================================
# Build Stage
# =============================================================================
FROM node:22-bookworm-slim AS builder

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ ca-certificates openssl \
  && rm -rf /var/lib/apt/lists/*

# Copy workspace files
COPY package*.json ./
COPY apps/backend/package*.json ./apps/backend/
COPY apps/frontend/package*.json ./apps/frontend/
COPY packages/shared/package*.json ./packages/shared/

# Install dependencies with retry and cache support to reduce transient network failures
RUN --mount=type=cache,target=/root/.npm \
  npm ci \
    --workspace=apps/backend \
    --workspace=packages/shared \
    --prefer-offline \
    --no-audit \
    --no-fund \
    --fetch-retries=5 \
    --fetch-retry-factor=2 \
    --fetch-retry-maxtimeout=120000

# Copy source code
COPY apps/backend ./apps/backend
COPY packages/shared ./packages/shared
COPY tsconfig.json ./

# Build shared workspace for runtime-compatible ESM output
WORKDIR /app
RUN npm run build --workspace=packages/shared

# Backend build already generates Prisma Client.
WORKDIR /app/apps/backend

# Build TypeScript
RUN npm run build

# Migration tooling is short-lived, without compiler OS packages or OCR.
FROM node:22-bookworm-slim AS migrator
WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates openssl \
  && rm -rf /var/lib/apt/lists/*
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/backend/package.json ./apps/backend/package.json
COPY --from=builder /app/apps/backend/prisma ./apps/backend/prisma
COPY --from=builder /app/apps/backend/scripts/migrate-deploy.sh ./apps/backend/scripts/migrate-deploy.sh
COPY --from=builder /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
WORKDIR /app/apps/backend
ARG RELEASE_VERSION=dev
LABEL org.opencontainers.image.revision=$RELEASE_VERSION
CMD ["sh", "scripts/migrate-deploy.sh"]

# =============================================================================
# Production Stage
# =============================================================================
FROM node:22-bookworm-slim AS production
RUN apt-get update \
  && apt-get install -y --no-install-recommends dumb-init wget ca-certificates openssl \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY apps/backend/package*.json ./apps/backend/
COPY apps/frontend/package*.json ./apps/frontend/
COPY packages/shared/package*.json ./packages/shared/

# Install production dependencies only
RUN --mount=type=cache,target=/root/.npm \
  npm ci \
    --workspace=apps/backend \
    --workspace=packages/shared \
    --omit=dev \
    --prefer-offline \
    --no-audit \
    --no-fund \
    --fetch-retries=5 \
    --fetch-retry-factor=2 \
    --fetch-retry-maxtimeout=120000

# Copy built application
COPY --from=builder /app/apps/backend/dist ./apps/backend/dist
COPY --from=builder /app/apps/backend/prisma ./apps/backend/prisma
COPY --from=builder /app/apps/backend/scripts ./apps/backend/scripts
COPY --from=builder /app/apps/backend/assets ./apps/backend/assets
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist

# Create directories
ARG RELEASE_VERSION=dev
LABEL org.opencontainers.image.revision=$RELEASE_VERSION
ENV RELEASE_VERSION=$RELEASE_VERSION
RUN mkdir -p /app/uploads /app/logs \
  && printf '%s\n' "$RELEASE_VERSION" > /app/.release-version \
  && chown node:node /app/uploads /app/logs /app/.release-version

# Switch to non-root user
USER node

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Start application with dumb-init for signal handling
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "apps/backend/dist/index.js"]
