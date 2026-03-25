# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy workspace root files
COPY package*.json ./
COPY tsconfig.json ./
COPY apps/backend/package*.json ./apps/backend/

# Copy workspaces
COPY apps/frontend ./apps/frontend
COPY packages/shared ./packages/shared

# Install dependencies
RUN npm ci

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
