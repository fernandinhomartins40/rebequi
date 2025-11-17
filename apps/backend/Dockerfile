# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy workspace root files
COPY package*.json ./
COPY tsconfig.json ./

# Copy workspaces
COPY apps/backend ./apps/backend
COPY packages/shared ./packages/shared

# Install dependencies
RUN npm ci

# Generate Prisma Client
WORKDIR /app/apps/backend
RUN npx prisma generate

# Build backend
RUN npm run build

# Stage 2: Production
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copy workspace configuration
COPY package*.json ./
COPY --from=builder /app/apps/backend/package*.json ./apps/backend/
COPY --from=builder /app/packages/shared/package*.json ./packages/shared/

# Install production dependencies only
RUN npm ci --only=production --workspace=apps/backend --workspace=packages/shared

# Copy built files
COPY --from=builder /app/apps/backend/dist ./apps/backend/dist
COPY --from=builder /app/apps/backend/prisma ./apps/backend/prisma
COPY --from=builder /app/packages/shared ./packages/shared

# Copy node_modules with Prisma Client
COPY --from=builder /app/apps/backend/node_modules/.prisma ./apps/backend/node_modules/.prisma
COPY --from=builder /app/apps/backend/node_modules/@prisma ./apps/backend/node_modules/@prisma

WORKDIR /app/apps/backend

EXPOSE 3000

# Create startup script
RUN echo '#!/bin/sh' > /app/start.sh && \
    echo 'npx prisma migrate deploy' >> /app/start.sh && \
    echo 'npx prisma db seed' >> /app/start.sh && \
    echo 'node dist/index.js' >> /app/start.sh && \
    chmod +x /app/start.sh

CMD ["/app/start.sh"]
