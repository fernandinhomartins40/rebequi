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
FROM node:22-bookworm-slim AS ocr-runtime

# Dependências de sistema
RUN apt-get update \
  && apt-get install -y --no-install-recommends dumb-init wget ca-certificates libgomp1 libgl1 libglib2.0-0 libsm6 libxext6 libxrender1 python3 python3-pip \
  && rm -rf /var/lib/apt/lists/*

# ── Motor de OCR local (PaddleOCR) ───────────────────────────────────────────
# Duas armadilhas que já travaram o build por ~20min:
#
# 1. O mirror `paddlepaddle.org.cn` era desnecessário: paddlepaddle==3.0.0 está
#    no PyPI oficial. Pior, `-i <mirror>` SUBSTITUI o índice padrão em vez de
#    adicionar, então TODAS as dependências transitivas do paddleocr também
#    vinham do servidor na China — medido em ~10 KB/s contra ~76 KB/s do PyPI.
#    Era isso que deixava o build pendurado por dezenas de minutos.
#
# 2. `paddleocr` sem versão resolve para 3.x, que arrasta o paddlex inteiro
#    (pandas, huggingface-hub, modelscope, opencv-contrib…) — dezenas de MB que
#    este projeto não usa. O bridge (scripts/paddleocr_bridge.py) suporta a API
#    2.x, então fixamos a linha 2.x, muito mais enxuta.
#
# Versões devem ficar em sincronia com apps/backend/requirements-ocr.txt.
COPY apps/backend/requirements-ocr.txt /tmp/requirements-ocr.txt
RUN python3 -m pip install --no-cache-dir --break-system-packages \
      --default-timeout=120 --retries=5 \
      -r /tmp/requirements-ocr.txt \
  && python3 -c "import paddle, paddleocr; print('paddleocr OK')"

# Model downloads are cached independently of application source and release SHA.
COPY apps/backend/scripts/paddleocr_bridge.py /opt/paddleocr_bridge.py
USER node
RUN python3 /opt/paddleocr_bridge.py --warmup --lang la
USER root

FROM ocr-runtime AS production

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
