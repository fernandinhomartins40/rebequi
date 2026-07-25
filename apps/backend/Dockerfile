# syntax=docker/dockerfile:1.7

# =============================================================================
# Build Stage
# =============================================================================
FROM node:20-bookworm-slim AS builder

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
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

# Generate Prisma Client
WORKDIR /app/apps/backend
RUN npx prisma generate

# Build TypeScript
RUN npm run build

# =============================================================================
# Production Stage
# =============================================================================
FROM node:20-bookworm-slim AS production
ARG RELEASE_VERSION=dev
LABEL org.opencontainers.image.revision=$RELEASE_VERSION
ENV RELEASE_VERSION=$RELEASE_VERSION

# Install dumb-init for proper signal handling
RUN apt-get update \
  && apt-get install -y --no-install-recommends dumb-init wget ca-certificates libgomp1 libgl1 libglib2.0-0 libsm6 libxext6 libxrender1 python3 python3-pip \
  && python3 -m pip install --default-timeout=1000 --no-cache-dir --break-system-packages paddlepaddle==3.0.0 -i https://www.paddlepaddle.org.cn/packages/stable/cpu/ \
  && python3 -m pip install --default-timeout=1000 --no-cache-dir --break-system-packages paddleocr \
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
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist

# Create directories
RUN mkdir -p /app/uploads /app/logs \
  && printf '%s\n' "$RELEASE_VERSION" > /app/.release-version \
  && chown -R node:node /app

# Pré-carrega os modelos do PaddleOCR ainda no build, como usuário node (é o
# HOME dele que o PaddleOCR usa como cache). Sem isso, o primeiro orçamento de
# cada container gastaria ~30s baixando pesos e provavelmente estouraria o
# timeout do job de OCR — justamente quando o cliente está esperando.
USER node
RUN python3 /app/apps/backend/scripts/paddleocr_bridge.py --warmup --lang la \
  || echo "AVISO: pre-carregamento dos modelos de OCR falhou; sera feito no primeiro uso"
USER root

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
