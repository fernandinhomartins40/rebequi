# PLANO DETALHADO DE IMPLEMENTAÇÃO DO BACKEND
**Projeto:** Rebequi E-commerce
**Stack:** Node.js + TypeScript + Prisma + PostgreSQL + Docker + Nginx
**Data:** 19/11/2025

---

## ÍNDICE

1. [Arquitetura Geral](#1-arquitetura-geral)
2. [Estrutura de Diretórios Completa](#2-estrutura-de-diretórios-completa)
3. [Configuração Docker](#3-configuração-docker)
4. [Configuração Nginx](#4-configuração-nginx)
5. [Prisma + PostgreSQL](#5-prisma--postgresql)
6. [Backend Node.js + TypeScript](#6-backend-nodejs--typescript)
7. [Integração Frontend ↔ Backend](#7-integração-frontend--backend)
8. [Segurança e Validação](#8-segurança-e-validação)
9. [Deploy e CI/CD](#9-deploy-e-cicd)
10. [Checklist de Implementação](#10-checklist-de-implementação)

---

## 1. ARQUITETURA GERAL

### 1.1 Diagrama de Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                        NGINX (Port 80)                       │
│                    Reverse Proxy Layer                       │
└────────────┬──────────────────────────────────┬─────────────┘
             │                                   │
             │ /api/*                            │ /*
             ↓                                   ↓
    ┌────────────────────┐              ┌──────────────────┐
    │   Backend API      │              │   Frontend Web   │
    │  (Node.js:3000)    │              │   (Nginx:80)     │
    │                    │              │                  │
    │  ┌──────────────┐  │              │  React + Vite    │
    │  │  Controllers │  │              │  SPA             │
    │  └──────┬───────┘  │              └──────────────────┘
    │         │          │
    │  ┌──────▼───────┐  │
    │  │   Services   │  │
    │  └──────┬───────┘  │
    │         │          │
    │  ┌──────▼───────┐  │
    │  │   Prisma     │  │
    │  │   Client     │  │
    │  └──────┬───────┘  │
    └─────────┼──────────┘
              │
              ↓
    ┌─────────────────────┐
    │   PostgreSQL DB      │
    │      (Port 5432)     │
    │                      │
    │  ┌────────────────┐  │
    │  │ users          │  │
    │  │ categories     │  │
    │  │ products       │  │
    │  │ product_images │  │
    │  └────────────────┘  │
    └─────────────────────┘

Docker Network: rebequi-network
```

### 1.2 Fluxo de Requisição

```
Cliente → Nginx:80 → Roteamento:
                      - /api/* → Backend:3000 → Prisma → PostgreSQL
                      - /*     → Frontend:80 (SPA)
```

### 1.3 Camadas de Responsabilidade

| Camada | Responsabilidade | Tecnologias |
|--------|------------------|-------------|
| **Proxy** | Roteamento, SSL, Load Balancing | Nginx |
| **Apresentação** | UI/UX, Client-Side Logic | React, Vite |
| **API** | Endpoints REST, Validação, Auth | Express, Zod |
| **Negócio** | Regras de Negócio, Lógica | TypeScript Services |
| **Dados** | ORM, Migrations, Queries | Prisma |
| **Persistência** | Banco de Dados | PostgreSQL |

---

## 2. ESTRUTURA DE DIRETÓRIOS COMPLETA

### 2.1 Estrutura Geral do Monorepo

```
rebequi/
├── apps/
│   ├── frontend/                 # Aplicação React (já existe)
│   └── backend/                  # Nova API Node.js (CRIAR)
│       ├── src/
│       │   ├── index.ts          # Entry point
│       │   ├── app.ts            # Express app config
│       │   ├── server.ts         # Server initialization
│       │   │
│       │   ├── config/           # Configurações
│       │   │   ├── env.ts        # Variáveis de ambiente
│       │   │   ├── cors.ts       # Configuração CORS
│       │   │   └── multer.ts     # Upload de arquivos
│       │   │
│       │   ├── controllers/      # Controllers HTTP
│       │   │   ├── auth.controller.ts
│       │   │   ├── products.controller.ts
│       │   │   ├── categories.controller.ts
│       │   │   └── health.controller.ts
│       │   │
│       │   ├── services/         # Lógica de negócio
│       │   │   ├── auth.service.ts
│       │   │   ├── products.service.ts
│       │   │   ├── categories.service.ts
│       │   │   ├── user.service.ts
│       │   │   └── upload.service.ts
│       │   │
│       │   ├── repositories/     # Acesso a dados
│       │   │   ├── user.repository.ts
│       │   │   ├── product.repository.ts
│       │   │   └── category.repository.ts
│       │   │
│       │   ├── routes/           # Definição de rotas
│       │   │   ├── index.ts      # Agregador de rotas
│       │   │   ├── auth.routes.ts
│       │   │   ├── products.routes.ts
│       │   │   ├── categories.routes.ts
│       │   │   └── health.routes.ts
│       │   │
│       │   ├── middleware/       # Middlewares
│       │   │   ├── auth.middleware.ts
│       │   │   ├── error-handler.middleware.ts
│       │   │   ├── validation.middleware.ts
│       │   │   ├── rate-limit.middleware.ts
│       │   │   └── logger.middleware.ts
│       │   │
│       │   ├── utils/            # Utilitários
│       │   │   ├── jwt.util.ts
│       │   │   ├── hash.util.ts
│       │   │   ├── response.util.ts
│       │   │   └── errors.util.ts
│       │   │
│       │   └── types/            # Tipos locais do backend
│       │       ├── express.d.ts  # Extensões do Express
│       │       └── index.ts
│       │
│       ├── prisma/
│       │   ├── schema.prisma     # Schema do Prisma
│       │   ├── seed.ts           # Seed de dados
│       │   └── migrations/       # Migrações (gerado)
│       │
│       ├── uploads/              # Uploads temporários
│       ├── .env.example
│       ├── .env                  # Ignorado no .gitignore
│       ├── Dockerfile
│       ├── .dockerignore
│       ├── tsconfig.json
│       ├── package.json
│       └── README.md
│
├── packages/
│   └── shared/                   # Tipos compartilhados (já existe)
│       └── src/
│           ├── types/
│           ├── schemas/          # Adicionado na Fase 2
│           ├── utils/            # Adicionado na Fase 2
│           └── constants/        # Adicionado na Fase 2
│
├── nginx/
│   ├── Dockerfile
│   ├── nginx.conf                # Configuração principal
│   └── conf.d/
│       └── default.conf          # Virtual host
│
├── docker-compose.yml            # Orquestração completa
├── docker-compose.dev.yml        # Para desenvolvimento
├── docker-compose.prod.yml       # Para produção
├── .dockerignore
├── .gitignore
├── Makefile                      # Comandos úteis
├── package.json                  # Root workspace
└── README.md
```

### 2.2 Nomeação e Padrões

#### Arquivos
- **Controllers:** `*.controller.ts` (ex: `auth.controller.ts`)
- **Services:** `*.service.ts` (ex: `products.service.ts`)
- **Routes:** `*.routes.ts` (ex: `categories.routes.ts`)
- **Middleware:** `*.middleware.ts` (ex: `auth.middleware.ts`)
- **Utils:** `*.util.ts` (ex: `jwt.util.ts`)
- **Repositories:** `*.repository.ts` (ex: `user.repository.ts`)

#### Variáveis e Funções
- **CamelCase:** `getUserById`, `createProduct`
- **PascalCase:** Classes e Tipos (`UserService`, `ProductController`)
- **UPPER_SNAKE_CASE:** Constantes (`MAX_FILE_SIZE`, `JWT_SECRET`)

#### Rotas
- **Plural para recursos:** `/api/products`, `/api/categories`
- **Singular para autenticação:** `/api/auth/login`, `/api/auth/register`
- **Versionamento:** `/api/v1/products` (futuro)

---

## 3. CONFIGURAÇÃO DOCKER

### 3.1 docker-compose.yml (Produção)

```yaml
version: '3.8'

services:
  # PostgreSQL Database
  postgres:
    image: postgres:16-alpine
    container_name: rebequi-postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-rebequi}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-rebequi123}
      POSTGRES_DB: ${POSTGRES_DB:-rebequi}
      PGDATA: /var/lib/postgresql/data/pgdata
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - rebequi-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-rebequi} -d ${POSTGRES_DB:-rebequi}"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 10s

  # Backend API
  backend:
    build:
      context: .
      dockerfile: apps/backend/Dockerfile
      target: production
    container_name: rebequi-backend
    restart: unless-stopped
    environment:
      NODE_ENV: production
      PORT: 3000
      DATABASE_URL: postgresql://${POSTGRES_USER:-rebequi}:${POSTGRES_PASSWORD:-rebequi123}@postgres:5432/${POSTGRES_DB:-rebequi}
      JWT_SECRET: ${JWT_SECRET}
      JWT_EXPIRES_IN: ${JWT_EXPIRES_IN:-7d}
      ALLOWED_ORIGINS: ${ALLOWED_ORIGINS:-http://localhost}
      MAX_FILE_SIZE: ${MAX_FILE_SIZE:-5242880}
      UPLOAD_DIR: /app/uploads
    ports:
      - "3000:3000"
    volumes:
      - backend_uploads:/app/uploads
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - rebequi-network
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  # Frontend Application
  frontend:
    build:
      context: .
      dockerfile: apps/frontend/Dockerfile
      args:
        VITE_API_URL: ${VITE_API_URL:-http://localhost/api}
    container_name: rebequi-frontend
    restart: unless-stopped
    ports:
      - "8080:80"
    networks:
      - rebequi-network
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:80/"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Nginx Reverse Proxy
  nginx:
    build:
      context: ./nginx
      dockerfile: Dockerfile
    container_name: rebequi-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/conf.d:/etc/nginx/conf.d:ro
      - nginx_cache:/var/cache/nginx
      - nginx_logs:/var/log/nginx
    depends_on:
      - backend
      - frontend
    networks:
      - rebequi-network
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:80"]
      interval: 30s
      timeout: 10s
      retries: 3

volumes:
  postgres_data:
    driver: local
  backend_uploads:
    driver: local
  nginx_cache:
    driver: local
  nginx_logs:
    driver: local

networks:
  rebequi-network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.25.0.0/16
```

### 3.2 apps/backend/Dockerfile

```dockerfile
# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy workspace files
COPY package*.json ./
COPY apps/backend/package*.json ./apps/backend/
COPY packages/shared/package*.json ./packages/shared/

# Install dependencies
RUN npm ci --workspace=apps/backend --workspace=packages/shared

# Copy source code
COPY apps/backend ./apps/backend
COPY packages/shared ./packages/shared
COPY tsconfig.json ./

# Generate Prisma Client
WORKDIR /app/apps/backend
RUN npx prisma generate

# Build TypeScript
RUN npm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY apps/backend/package*.json ./apps/backend/

# Install production dependencies only
RUN npm ci --workspace=apps/backend --omit=dev

# Copy built application
COPY --from=builder /app/apps/backend/dist ./apps/backend/dist
COPY --from=builder /app/apps/backend/prisma ./apps/backend/prisma
COPY --from=builder /app/apps/backend/node_modules/.prisma ./apps/backend/node_modules/.prisma

# Create uploads directory
RUN mkdir -p /app/uploads && chown -R node:node /app/uploads

# Switch to non-root user
USER node

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Start application
CMD ["node", "apps/backend/dist/index.js"]
```

### 3.3 apps/backend/.dockerignore

```
node_modules
dist
.env
.env.*
!.env.example
npm-debug.log
yarn-error.log
.DS_Store
*.log
coverage
.vscode
.idea
uploads/*
!uploads/.gitkeep
```

---

## 4. CONFIGURAÇÃO NGINX

### 4.1 nginx/nginx.conf

```nginx
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 2048;
    use epoll;
    multi_accept on;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # Logging
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for" '
                    'rt=$request_time uct="$upstream_connect_time" '
                    'uht="$upstream_header_time" urt="$upstream_response_time"';

    access_log /var/log/nginx/access.log main;

    # Performance
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    server_tokens off;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript
               application/json application/javascript application/xml+rss
               application/rss+xml font/truetype font/opentype
               application/vnd.ms-fontobject image/svg+xml;
    gzip_disable "msie6";

    # Buffer sizes
    client_body_buffer_size 128k;
    client_max_body_size 10m;
    client_header_buffer_size 1k;
    large_client_header_buffers 4 16k;

    # Timeouts
    client_body_timeout 12;
    client_header_timeout 12;
    send_timeout 10;

    # Include virtual hosts
    include /etc/nginx/conf.d/*.conf;
}
```

### 4.2 nginx/conf.d/default.conf

```nginx
# Upstream definitions
upstream backend_api {
    server backend:3000 max_fails=3 fail_timeout=30s;
    keepalive 32;
}

upstream frontend_app {
    server frontend:80 max_fails=3 fail_timeout=30s;
    keepalive 32;
}

# Rate limiting zones
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=auth_limit:10m rate=5r/m;

# Main server block
server {
    listen 80;
    listen [::]:80;
    server_name localhost;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;

    # API routes
    location /api/ {
        # Rate limiting
        limit_req zone=api_limit burst=20 nodelay;
        limit_req_status 429;

        # Proxy configuration
        proxy_pass http://backend_api;
        proxy_http_version 1.1;

        # Headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Port $server_port;

        # WebSocket support (if needed)
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;

        # Buffering
        proxy_buffering on;
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;
        proxy_busy_buffers_size 8k;

        # Bypass cache
        proxy_cache_bypass $http_upgrade;
        proxy_no_cache $http_upgrade;

        # CORS headers (handled by backend, but can be here as backup)
        add_header Access-Control-Allow-Origin $http_origin always;
        add_header Access-Control-Allow-Methods "GET, POST, PUT, PATCH, DELETE, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Authorization, Content-Type, X-Requested-With" always;
        add_header Access-Control-Allow-Credentials "true" always;
        add_header Access-Control-Max-Age 3600 always;

        # Handle preflight requests
        if ($request_method = 'OPTIONS') {
            return 204;
        }
    }

    # Auth endpoints with stricter rate limiting
    location /api/auth/ {
        limit_req zone=auth_limit burst=3 nodelay;
        limit_req_status 429;

        proxy_pass http://backend_api;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Backend health check
    location /api/health {
        proxy_pass http://backend_api/api/health;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        access_log off;
    }

    # Static file uploads from backend
    location /uploads/ {
        proxy_pass http://backend_api/uploads/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;

        # Cache static files
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Frontend SPA
    location / {
        proxy_pass http://frontend_app;
        proxy_http_version 1.1;

        # Headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            proxy_pass http://frontend_app;
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # Error pages
    error_page 404 /404.html;
    error_page 500 502 503 504 /50x.html;

    location = /50x.html {
        root /usr/share/nginx/html;
        internal;
    }
}
```

### 4.3 nginx/Dockerfile

```dockerfile
FROM nginx:1.25-alpine

# Remove default config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom configs
COPY nginx.conf /etc/nginx/nginx.conf
COPY conf.d/ /etc/nginx/conf.d/

# Create cache directory
RUN mkdir -p /var/cache/nginx

# Expose ports
EXPOSE 80 443

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:80 || exit 1

CMD ["nginx", "-g", "daemon off;"]
```

---

## 5. PRISMA + POSTGRESQL

### 5.1 apps/backend/prisma/schema.prisma

```prisma
// Prisma Schema
generator client {
  provider = "prisma-client-js"
  output   = "../node_modules/.prisma/client"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============================================================================
// USER MODEL
// ============================================================================
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String
  password  String   // Hashed with bcrypt
  role      UserRole @default(CUSTOMER)
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([email])
  @@index([role])
  @@index([isActive])
  @@map("users")
}

enum UserRole {
  ADMIN
  CUSTOMER
}

// ============================================================================
// CATEGORY MODEL
// ============================================================================
model Category {
  id          String    @id @default(cuid())
  name        String    @unique
  slug        String    @unique
  icon        String?   // Lucide icon name
  image       String?   // URL or path to category image
  description String?   @db.Text
  isActive    Boolean   @default(true)
  products    Product[]
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  deletedAt   DateTime? // Soft delete

  @@index([slug])
  @@index([isActive])
  @@index([deletedAt])
  @@map("categories")
}

// ============================================================================
// PRODUCT MODEL
// ============================================================================
model Product {
  id            String         @id @default(cuid())
  name          String
  slug          String         @unique
  sku           String?        @unique
  price         Float          // Current price
  originalPrice Float?         // Original price (before discount)
  description   String?        @db.Text
  shortDesc     String?        @db.VarChar(500) // Short description for cards
  isOffer       Boolean        @default(false)
  isNew         Boolean        @default(false)
  isFeatured    Boolean        @default(false)
  discount      Int?           // Discount percentage (0-100)
  stock         Int            @default(0)
  minStock      Int            @default(0) // Alert when stock is low
  weight        Float?         // In kg
  dimensions    String?        // e.g., "10x20x30 cm"
  categoryId    String
  category      Category       @relation(fields: [categoryId], references: [id], onDelete: Cascade)
  images        ProductImage[]
  isActive      Boolean        @default(true)
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt
  deletedAt     DateTime?      // Soft delete

  @@index([categoryId])
  @@index([slug])
  @@index([sku])
  @@index([isOffer])
  @@index([isNew])
  @@index([isFeatured])
  @@index([isActive])
  @@index([deletedAt])
  @@index([price])
  @@fulltext([name, description])
  @@map("products")
}

// ============================================================================
// PRODUCT IMAGE MODEL
// ============================================================================
model ProductImage {
  id        String   @id @default(cuid())
  url       String   // Image URL or path
  alt       String?  // Alt text for SEO
  order     Int      @default(0) // Display order
  isPrimary Boolean  @default(false) // Main product image
  productId String
  product   Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([productId])
  @@index([isPrimary])
  @@index([order])
  @@map("product_images")
}
```

### 5.2 apps/backend/prisma/seed.ts

```typescript
import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Clear existing data (optional, for development)
  await prisma.productImage.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();

  // ========== USERS ==========
  console.log('👤 Seeding users...');

  const adminPassword = await bcrypt.hash('Admin@123', 10);
  const customerPassword = await bcrypt.hash('Customer@123', 10);

  const admin = await prisma.user.create({
    data: {
      email: 'admin@rebequi.com',
      name: 'Administrador',
      password: adminPassword,
      role: UserRole.ADMIN,
    },
  });

  const customer = await prisma.user.create({
    data: {
      email: 'cliente@example.com',
      name: 'João da Silva',
      password: customerPassword,
      role: UserRole.CUSTOMER,
    },
  });

  console.log(`✅ Created users: ${admin.email}, ${customer.email}`);

  // ========== CATEGORIES ==========
  console.log('📁 Seeding categories...');

  const categories = await Promise.all([
    prisma.category.create({
      data: {
        name: 'Ferramentas',
        slug: 'ferramentas',
        icon: 'Wrench',
        description: 'Ferramentas manuais e elétricas para construção',
      },
    }),
    prisma.category.create({
      data: {
        name: 'Tintas e Acessórios',
        slug: 'tintas-acessorios',
        icon: 'Paintbrush',
        description: 'Tintas, pincéis, rolos e acessórios de pintura',
      },
    }),
    prisma.category.create({
      data: {
        name: 'Cimento e Argamassa',
        slug: 'cimento-argamassa',
        icon: 'Package',
        description: 'Cimentos, argamassas e produtos para construção',
      },
    }),
    prisma.category.create({
      data: {
        name: 'Materiais Elétricos',
        slug: 'materiais-eletricos',
        icon: 'Zap',
        description: 'Fios, cabos, tomadas e materiais elétricos',
      },
    }),
    prisma.category.create({
      data: {
        name: 'Hidráulica',
        slug: 'hidraulica',
        icon: 'Droplet',
        description: 'Tubos, conexões e materiais hidráulicos',
      },
    }),
    prisma.category.create({
      data: {
        name: 'Pisos e Revestimentos',
        slug: 'pisos-revestimentos',
        icon: 'Grid',
        description: 'Pisos, azulejos e revestimentos',
      },
    }),
  ]);

  console.log(`✅ Created ${categories.length} categories`);

  // ========== PRODUCTS ==========
  console.log('🛒 Seeding products...');

  // Ferramentas
  await prisma.product.create({
    data: {
      name: 'Furadeira de Impacto 1/2" 650W',
      slug: 'furadeira-impacto-650w',
      sku: 'FER-FUR-001',
      price: 299.90,
      originalPrice: 399.90,
      shortDesc: 'Furadeira de impacto profissional com mandril de 1/2"',
      description: 'Furadeira de impacto profissional com 650W de potência, mandril de 1/2", velocidade variável e reversível. Ideal para furar concreto, madeira e metal.',
      isOffer: true,
      isNew: false,
      isFeatured: true,
      discount: 25,
      stock: 15,
      minStock: 5,
      weight: 2.5,
      dimensions: '30x25x10 cm',
      categoryId: categories[0].id,
      images: {
        create: [
          {
            url: '/uploads/products/furadeira-1.jpg',
            alt: 'Furadeira de Impacto 650W',
            order: 0,
            isPrimary: true,
          },
        ],
      },
    },
  });

  await prisma.product.create({
    data: {
      name: 'Jogo de Chaves de Fenda 6 Peças',
      slug: 'jogo-chaves-fenda-6-pecas',
      sku: 'FER-CHA-002',
      price: 45.90,
      shortDesc: 'Jogo profissional de chaves de fenda com 6 peças',
      description: 'Jogo de chaves de fenda profissional com 6 peças, cabo emborrachado para melhor aderência e ponteiras magnéticas.',
      isOffer: false,
      isNew: true,
      isFeatured: false,
      stock: 30,
      minStock: 10,
      weight: 0.8,
      categoryId: categories[0].id,
      images: {
        create: [
          {
            url: '/uploads/products/chaves-1.jpg',
            alt: 'Jogo de Chaves de Fenda',
            order: 0,
            isPrimary: true,
          },
        ],
      },
    },
  });

  // Tintas
  await prisma.product.create({
    data: {
      name: 'Tinta Acrílica Premium Branca 18L',
      slug: 'tinta-acrilica-branca-18l',
      sku: 'TIN-ACR-001',
      price: 189.90,
      originalPrice: 229.90,
      shortDesc: 'Tinta acrílica premium lavável, alto rendimento',
      description: 'Tinta acrílica premium de alta qualidade, lavável, com excelente cobertura e rendimento. Ideal para áreas internas. Secagem rápida.',
      isOffer: true,
      isNew: false,
      isFeatured: true,
      discount: 17,
      stock: 50,
      minStock: 20,
      weight: 20.5,
      categoryId: categories[1].id,
      images: {
        create: [
          {
            url: '/uploads/products/tinta-branca-1.jpg',
            alt: 'Tinta Acrílica Branca 18L',
            order: 0,
            isPrimary: true,
          },
        ],
      },
    },
  });

  await prisma.product.create({
    data: {
      name: 'Kit Pintura Profissional 5 Peças',
      slug: 'kit-pintura-profissional',
      sku: 'TIN-KIT-002',
      price: 69.90,
      shortDesc: 'Kit completo com rolos, pincéis e bandeja',
      description: 'Kit de pintura profissional contendo 2 rolos de lã, 2 pincéis de diferentes tamanhos e 1 bandeja com reservatório.',
      isOffer: false,
      isNew: true,
      isFeatured: false,
      stock: 25,
      minStock: 10,
      weight: 1.2,
      categoryId: categories[1].id,
      images: {
        create: [
          {
            url: '/uploads/products/kit-pintura-1.jpg',
            alt: 'Kit Pintura Profissional',
            order: 0,
            isPrimary: true,
          },
        ],
      },
    },
  });

  // Cimento
  await prisma.product.create({
    data: {
      name: 'Cimento Portland CP II 50kg',
      slug: 'cimento-portland-50kg',
      sku: 'CIM-CIM-001',
      price: 32.90,
      shortDesc: 'Cimento Portland de alta qualidade para construção',
      description: 'Cimento Portland CP II de alta resistência, ideal para estruturas de concreto armado, alvenaria e argamassas.',
      isOffer: false,
      isNew: false,
      isFeatured: true,
      stock: 200,
      minStock: 50,
      weight: 50,
      categoryId: categories[2].id,
      images: {
        create: [
          {
            url: '/uploads/products/cimento-1.jpg',
            alt: 'Cimento Portland 50kg',
            order: 0,
            isPrimary: true,
          },
        ],
      },
    },
  });

  await prisma.product.create({
    data: {
      name: 'Argamassa AC II 20kg',
      slug: 'argamassa-ac2-20kg',
      sku: 'CIM-ARG-002',
      price: 24.90,
      originalPrice: 29.90,
      shortDesc: 'Argamassa colante AC II para pisos e azulejos',
      description: 'Argamassa colante AC II de alta aderência, ideal para assentamento de pisos cerâmicos e azulejos em áreas internas e externas.',
      isOffer: true,
      isNew: false,
      isFeatured: false,
      discount: 17,
      stock: 100,
      minStock: 30,
      weight: 20,
      categoryId: categories[2].id,
      images: {
        create: [
          {
            url: '/uploads/products/argamassa-1.jpg',
            alt: 'Argamassa AC II 20kg',
            order: 0,
            isPrimary: true,
          },
        ],
      },
    },
  });

  // Materiais Elétricos
  await prisma.product.create({
    data: {
      name: 'Fio Elétrico Flexível 2,5mm 100m',
      slug: 'fio-eletrico-25mm-100m',
      sku: 'ELE-FIO-001',
      price: 159.90,
      shortDesc: 'Fio elétrico flexível de cobre para instalações',
      description: 'Fio elétrico flexível de cobre, seção 2,5mm², rolo com 100 metros. Ideal para instalações elétricas residenciais e comerciais.',
      isOffer: false,
      isNew: true,
      isFeatured: false,
      stock: 40,
      minStock: 15,
      weight: 8.5,
      categoryId: categories[3].id,
      images: {
        create: [
          {
            url: '/uploads/products/fio-eletrico-1.jpg',
            alt: 'Fio Elétrico 2,5mm 100m',
            order: 0,
            isPrimary: true,
          },
        ],
      },
    },
  });

  await prisma.product.create({
    data: {
      name: 'Disjuntor Monopolar 32A',
      slug: 'disjuntor-monopolar-32a',
      sku: 'ELE-DIS-002',
      price: 18.90,
      shortDesc: 'Disjuntor termomagn ético monopolar 32A',
      description: 'Disjuntor termomagnético monopolar de 32A, ideal para proteção de circuitos elétricos residenciais e comerciais.',
      isOffer: false,
      isNew: false,
      isFeatured: false,
      stock: 60,
      minStock: 20,
      weight: 0.15,
      categoryId: categories[3].id,
      images: {
        create: [
          {
            url: '/uploads/products/disjuntor-1.jpg',
            alt: 'Disjuntor Monopolar 32A',
            order: 0,
            isPrimary: true,
          },
        ],
      },
    },
  });

  console.log('✅ Created products with images');

  // Count totals
  const totalUsers = await prisma.user.count();
  const totalCategories = await prisma.category.count();
  const totalProducts = await prisma.product.count();

  console.log('\n📊 Database seeding completed!');
  console.log(`   Users: ${totalUsers}`);
  console.log(`   Categories: ${totalCategories}`);
  console.log(`   Products: ${totalProducts}`);
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

### 5.3 Migrations Commands

```bash
# Criar migration
npx prisma migrate dev --name init

# Aplicar migrations
npx prisma migrate deploy

# Reset database (desenvolvimento)
npx prisma migrate reset

# Gerar Prisma Client
npx prisma generate

# Executar seed
npm run prisma:seed

# Abrir Prisma Studio
npx prisma studio
```

---

## 6. BACKEND NODE.JS + TYPESCRIPT

### 6.1 apps/backend/package.json

```json
{
  "name": "@rebequi/backend",
  "version": "1.0.0",
  "description": "Rebequi E-commerce Backend API",
  "private": true,
  "type": "module",
  "main": "dist/index.js",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev",
    "prisma:migrate:deploy": "prisma migrate deploy",
    "prisma:studio": "prisma studio",
    "prisma:seed": "tsx prisma/seed.ts",
    "prisma:reset": "prisma migrate reset --force",
    "lint": "eslint src --ext .ts",
    "lint:fix": "eslint src --ext .ts --fix",
    "test": "vitest",
    "test:coverage": "vitest run --coverage"
  },
  "dependencies": {
    "@prisma/client": "^6.1.0",
    "@rebequi/shared": "*",
    "bcryptjs": "^2.4.3",
    "cors": "^2.8.5",
    "dotenv": "^16.4.7",
    "express": "^4.21.2",
    "express-rate-limit": "^7.5.0",
    "helmet": "^8.0.0",
    "jsonwebtoken": "^9.0.2",
    "morgan": "^1.10.0",
    "multer": "^1.4.5-lts.1",
    "winston": "^3.18.0",
    "zod": "^3.25.76"
  },
  "devDependencies": {
    "@types/bcryptjs": "^2.4.6",
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/jsonwebtoken": "^9.0.7",
    "@types/morgan": "^1.9.9",
    "@types/multer": "^1.4.12",
    "@types/node": "^22.16.5",
    "@typescript-eslint/eslint-plugin": "^8.0.0",
    "@typescript-eslint/parser": "^8.0.0",
    "eslint": "^9.0.0",
    "prisma": "^6.1.0",
    "tsx": "^4.19.2",
    "typescript": "^5.8.3",
    "vitest": "^2.0.0"
  },
  "prisma": {
    "seed": "tsx prisma/seed.ts"
  }
}
```

### 6.2 apps/backend/tsconfig.json

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "module": "ESNext",
    "target": "ES2022",
    "lib": ["ES2022"],
    "moduleResolution": "Node",
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "types": ["node"]
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts", "**/*.spec.ts"]
}
```

### 6.3 apps/backend/.env.example

```env
# Node Environment
NODE_ENV=development

# Server
PORT=3000
HOST=0.0.0.0

# Database
DATABASE_URL="postgresql://rebequi:rebequi123@localhost:5432/rebequi"

# JWT
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
JWT_EXPIRES_IN="7d"

# CORS
ALLOWED_ORIGINS="http://localhost:8080,http://localhost:80,http://localhost:5173"

# File Upload
MAX_FILE_SIZE=5242880
UPLOAD_DIR=./uploads

# Logging
LOG_LEVEL=info
```

---

**(Continua na próxima parte devido ao limite de caracteres...)**
