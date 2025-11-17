# @rebequi/backend

Backend API for Rebequi e-commerce platform.

## ✅ Status: Implemented

Backend RESTful API completo com Node.js, Express, TypeScript, Prisma e PostgreSQL.

## 🛠️ Stack

- **Runtime**: Node.js 20
- **Framework**: Express 4
- **Language**: TypeScript 5
- **Database**: PostgreSQL 16
- **ORM**: Prisma 6
- **Validation**: Zod
- **CORS**: Configurado

## 📁 Estrutura

```
apps/backend/
├── src/
│   ├── controllers/          # Controllers das rotas
│   │   ├── productsController.ts
│   │   └── categoriesController.ts
│   ├── routes/              # Definição de rotas
│   │   ├── products.ts
│   │   └── categories.ts
│   ├── middleware/          # Middlewares
│   │   └── errorHandler.ts
│   ├── lib/                 # Utilitários
│   │   └── prisma.ts        # Prisma Client
│   └── index.ts             # Entry point
├── prisma/
│   ├── schema.prisma        # Schema do banco
│   └── seed.ts              # Dados iniciais
├── .env                     # Variáveis de ambiente
├── .env.example             # Template de variáveis
├── tsconfig.json            # TypeScript config
├── Dockerfile               # Docker build
└── package.json
```

## 📚 API Endpoints

### Health Check
- `GET /health` - Status da API

### Products
- `GET /api/products` - Listar produtos (com filtros, paginação)
  - Query params: `category`, `minPrice`, `maxPrice`, `search`, `isOffer`, `isNew`, `page`, `limit`
- `GET /api/products/:id` - Produto por ID
- `GET /api/products/category/:categorySlug` - Produtos por categoria
- `GET /api/products/promotional` - Produtos em promoção
- `GET /api/products/new` - Produtos novos

### Categories
- `GET /api/categories` - Listar categorias
- `GET /api/categories/:id` - Categoria por ID
- `GET /api/categories/slug/:slug` - Categoria por slug

## 🗄️ Database Schema

### Category
```prisma
model Category {
  id          String    @id @default(cuid())
  name        String    @unique
  slug        String    @unique
  icon        String?
  image       String?
  description String?
  products    Product[]
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}
```

### Product
```prisma
model Product {
  id            String   @id @default(cuid())
  name          String
  price         Float
  originalPrice Float?
  image         String
  description   String?
  isOffer       Boolean  @default(false)
  isNew         Boolean  @default(false)
  discount      Int?
  stock         Int      @default(0)
  categoryId    String
  category      Category @relation(...)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}
```

## 🚀 Rodando Localmente

### 1. Instalar dependências
```bash
npm install
```

### 2. Configurar variáveis de ambiente
```bash
cp .env.example .env
# Editar .env com suas credenciais
```

### 3. Subir PostgreSQL (Docker)
```bash
# Da raiz do projeto
docker-compose up -d postgres
```

### 4. Gerar Prisma Client
```bash
npm run prisma:generate
```

### 5. Rodar migrations
```bash
npm run prisma:migrate
```

### 6. Popular banco (seed)
```bash
npm run prisma:seed
```

### 7. Iniciar servidor
```bash
npm run dev
```

API disponível em: http://localhost:3000

## 🐳 Docker

### Build
```bash
# Da raiz do projeto
docker-compose build backend
```

### Run
```bash
docker-compose up -d backend
```

### Logs
```bash
docker-compose logs -f backend
```

## 🔧 Comandos Úteis

```bash
# Development
npm run dev                  # Servidor em modo watch

# Build
npm run build               # Compilar TypeScript

# Prisma
npm run prisma:generate     # Gerar Prisma Client
npm run prisma:migrate      # Criar/aplicar migrations
npm run prisma:seed         # Popular banco
npm run prisma:studio       # Abrir Prisma Studio
npm run prisma:reset        # Reset completo do banco
npm run db:push             # Push schema sem migration
```

## 🔒 Variáveis de Ambiente

```bash
# Server
PORT=3000
NODE_ENV=development

# Database
DATABASE_URL=postgresql://user:password@host:5432/database

# CORS
ALLOWED_ORIGINS=http://localhost:8080,http://localhost:80

# JWT (futuro)
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d
```

## 🧪 Testando a API

### Health Check
```bash
curl http://localhost:3000/health
```

### Listar Produtos
```bash
curl http://localhost:3000/api/products
```

### Produtos com Filtros
```bash
# Por categoria
curl http://localhost:3000/api/products?category=ferramentas

# Produtos em oferta
curl http://localhost:3000/api/products?isOffer=true

# Busca por texto
curl http://localhost:3000/api/products?search=martelo

# Paginação
curl http://localhost:3000/api/products?page=1&limit=10
```

### Listar Categorias
```bash
curl http://localhost:3000/api/categories
```

## 📦 Dependências Principais

```json
{
  "dependencies": {
    "@prisma/client": "^6.1.0",
    "@rebequi/shared": "*",
    "cors": "^2.8.5",
    "dotenv": "^16.4.7",
    "express": "^4.21.2",
    "zod": "^3.25.76"
  },
  "devDependencies": {
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/node": "^22.16.5",
    "prisma": "^6.1.0",
    "tsx": "^4.19.2",
    "typescript": "^5.8.3"
  }
}
```

## 🔗 Shared Types

Importando tipos compartilhados:

```typescript
import { Product, Category, ProductFilters } from '@rebequi/shared/types';
```

## 🎯 Próximos Passos

- [ ] Autenticação JWT
- [ ] Autorização por roles (admin, cliente)
- [ ] Upload de imagens
- [ ] Endpoints de admin (CRUD completo)
- [ ] Carrinho de compras
- [ ] Sistema de pedidos
- [ ] Integração com pagamento
- [ ] Testes unitários e E2E
- [ ] Rate limiting
- [ ] Logging estruturado

## 📝 Notas

- A API usa CORS configurado via variável de ambiente
- Tratamento de erros centralizado via middleware
- Prisma Client é singleton para melhor performance
- Seeds incluem 24 produtos e 8 categorias
- Todos os endpoints retornam JSON
- Paginação padrão: 12 itens por página
