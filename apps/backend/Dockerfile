# =============================================================================
# Build Stage
# =============================================================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy workspace files
COPY package*.json ./
COPY apps/backend/package*.json ./apps/backend/
COPY apps/frontend/package*.json ./apps/frontend/
COPY packages/shared/package*.json ./packages/shared/

# Install dependencies
RUN npm ci --workspace=apps/backend --workspace=packages/shared

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
FROM node:20-alpine AS production
ARG RELEASE_VERSION=dev
LABEL org.opencontainers.image.revision=$RELEASE_VERSION
ENV RELEASE_VERSION=$RELEASE_VERSION

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY apps/backend/package*.json ./apps/backend/
COPY apps/frontend/package*.json ./apps/frontend/
COPY packages/shared/package*.json ./packages/shared/

# Install production dependencies only
RUN npm ci --workspace=apps/backend --workspace=packages/shared --omit=dev

# Copy built application
COPY --from=builder /app/apps/backend/dist ./apps/backend/dist
COPY --from=builder /app/apps/backend/prisma ./apps/backend/prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist

# Create directories
RUN mkdir -p /app/uploads /app/logs \
  && printf '%s\n' "$RELEASE_VERSION" > /app/.release-version \
  && chown -R node:node /app

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
