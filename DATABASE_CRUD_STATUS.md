# 🗄️ Status: Database, Prisma e CRUD Implementation

## ✅ O Que Foi Implementado

### 1. **Schema Prisma Completo e Robusto** ✅

**Localização**: `apps/backend/prisma/schema.prisma`

#### Models Implementados:

**User** - Autenticação e Autorização
```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String
  password  String   // Hash com bcryptjs
  role      UserRole @default(CUSTOMER)
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

enum UserRole {
  ADMIN
  CUSTOMER
}
```

**Category** - Categorias de Produtos
```prisma
model Category {
  id          String    @id @default(cuid())
  name        String    @unique
  slug        String    @unique
  icon        String?
  image       String?
  description String?   @db.Text
  isActive    Boolean   @default(true)
  products    Product[]
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  deletedAt   DateTime? // Soft delete

  @@index([slug])
  @@index([isActive])
}
```

**Product** - Produtos com Campos Avançados
```prisma
model Product {
  id            String         @id @default(cuid())
  name          String
  slug          String         @unique      # SEO-friendly URL
  sku           String?        @unique      # Stock Keeping Unit
  price         Float
  originalPrice Float?
  description   String?        @db.Text
  shortDesc     String?        # Descrição curta para cards
  isOffer       Boolean        @default(false)
  isNew         Boolean        @default(false)
  isFeatured    Boolean        @default(false)  # Produtos em destaque
  discount      Int?
  stock         Int            @default(0)
  minStock      Int            @default(0)      # Alerta de estoque baixo
  weight        Float?         # Peso em kg
  dimensions    String?        # Ex: "10x20x30 cm"
  categoryId    String
  category      Category       @relation(...)
  images        ProductImage[] # Múltiplas imagens
  isActive      Boolean        @default(true)
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt
  deletedAt     DateTime?      # Soft delete

  @@index([categoryId, slug, sku, isOffer, isNew, isFeatured, isActive])
}
```

**ProductImage** - Múltiplas Imagens por Produto
```prisma
model ProductImage {
  id        String   @id @default(cuid())
  url       String   # Caminho ou URL da imagem
  alt       String?  # Texto alternativo para SEO
  order     Int      @default(0)      # Ordem de exibição
  isPrimary Boolean  @default(false)  # Imagem principal
  productId String
  product   Product  @relation(...)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([productId, isPrimary])
}
```

#### Recursos do Schema:

- ✅ **Soft Delete**: `deletedAt` para recuperação de dados
- ✅ **Timestamps Automáticos**: `createdAt` e `updatedAt`
- ✅ **Índices Otimizados**: Para queries rápidas
- ✅ **Relações Cascata**: Deletar categoria deleta produtos
- ✅ **Campos Únicos**: email, slug, SKU
- ✅ **Enums Type-Safe**: UserRole
- ✅ **Múltiplas Imagens**: Relação 1:N com ProductImage

### 2. **Tipos TypeScript Compartilhados** ✅

**Localização**: `packages/shared/src/types/`

#### Arquivos Criados:

**product.ts** - Tipos de Produtos
```typescript
export interface ProductImage { /* ... */ }
export interface Product { /* campos completos */ }
export interface ProductFilters { /* filtros avançados */ }
export interface ProductResponse { /* com paginação */ }
export interface CreateProductDTO { /* criar produto */ }
export interface UpdateProductDTO { /* atualizar produto */ }
```

**category.ts** - Tipos de Categorias
```typescript
export interface Category { /* campos completos */ }
export interface CategoryResponse { /* lista */ }
export interface CreateCategoryDTO { /* criar */ }
export interface UpdateCategoryDTO { /* atualizar */ }
```

**user.ts** - Tipos de Usuário e Autenticação
```typescript
export enum UserRole { ADMIN, CUSTOMER }
export interface User { /* dados do usuário */ }
export interface LoginDTO { email, password }
export interface RegisterDTO { email, name, password }
export interface AuthResponse { user, token }
export interface CreateUserDTO { /* criar usuário */ }
export interface UpdateUserDTO { /* atualizar usuário */ }
```

Todos exportados em: `packages/shared/src/types/index.ts`

### 3. **Seeds Completos com Dados Reais** ✅

**Localização**: `apps/backend/prisma/seed.ts`

#### Dados Inclusos:

**1 Usuário Admin:**
- Email: `admin@rebequi.com`
- Senha: `admin123` (hash com bcryptjs)
- Role: ADMIN

**8 Categorias:**
1. Cimento e Argamassa
2. Tijolos e Blocos
3. Ferramentas
4. Tintas
5. Materiais Elétricos
6. Hidráulica
7. Madeiras
8. Ferros e Metais

**25 Produtos com:**
- ✅ Slugs gerados automaticamente
- ✅ SKUs únicos (CIM-001, FER-001, etc.)
- ✅ Descrições completas e curtas
- ✅ Peso e dimensões
- ✅ Múltiplas imagens (produtos principais têm 2-3 imagens)
- ✅ Imagens primárias e secundárias
- ✅ Stock e minStock configurados
- ✅ Produtos em oferta e novidades
- ✅ Produtos em destaque (isFeatured)

### 4. **Dependências Instaladas** ✅

**Autenticação:**
- ✅ `bcryptjs` + `@types/bcryptjs` - Hash de senhas
- ✅ `jsonwebtoken` + `@types/jsonwebtoken` - JWT tokens

**Upload de Imagens:**
- ✅ `multer` + `@types/multer` - Upload de arquivos

**Já Existentes:**
- ✅ `@prisma/client` - ORM
- ✅ `express` - Framework HTTP
- ✅ `zod` - Validação de dados
- ✅ `cors` - Cross-Origin Resource Sharing

---

## ⏳ O Que Falta Implementar

### 1. **Endpoints CRUD Completos** ⏳

**Status**: Apenas GET implementado

#### Produtos (POST, PUT, DELETE):

```typescript
// Faltam implementar:
POST   /api/products           # Criar produto
PUT    /api/products/:id       # Atualizar produto
DELETE /api/products/:id       # Deletar produto (soft delete)
POST   /api/products/:id/images  # Upload de imagens
DELETE /api/products/:id/images/:imageId  # Remover imagem
```

#### Categorias (POST, PUT, DELETE):

```typescript
// Faltam implementar:
POST   /api/categories         # Criar categoria
PUT    /api/categories/:id     # Atualizar categoria
DELETE /api/categories/:id     # Deletar categoria (soft delete)
POST   /api/categories/:id/image  # Upload de imagem
```

#### Autenticação:

```typescript
// Faltam implementar:
POST   /api/auth/login         # Login (retorna JWT)
POST   /api/auth/register      # Registro de cliente
POST   /api/auth/refresh       # Refresh token
POST   /api/auth/logout        # Logout
GET    /api/auth/me            # Dados do usuário logado
```

#### Usuários (Admin):

```typescript
// Faltam implementar:
GET    /api/users              # Listar usuários (admin)
GET    /api/users/:id          # Buscar usuário (admin)
POST   /api/users              # Criar usuário (admin)
PUT    /api/users/:id          # Atualizar usuário (admin)
DELETE /api/users/:id          # Deletar usuário (admin)
```

### 2. **Sistema de Upload de Imagens** ⏳

#### Estrutura de Pastas:

```
apps/backend/
├── uploads/                    # ⏳ Criar
│   ├── products/              # Imagens de produtos
│   ├── categories/            # Imagens de categorias
│   └── temp/                  # Upload temporário
```

#### Middleware de Upload:

```typescript
// apps/backend/src/middleware/upload.ts ⏳
import multer from 'multer';

// Configurar storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/products/');
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  },
});

// Validar tipo de arquivo
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type'), false);
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});
```

#### Serviço de Imagens:

```typescript
// apps/backend/src/services/imageService.ts ⏳
import fs from 'fs/promises';
import path from 'path';

export class ImageService {
  // Salvar imagem
  async saveImage(file: Express.Multer.File, folder: string): Promise<string> {}

  // Deletar imagem
  async deleteImage(imagePath: string): Promise<void> {}

  // Redimensionar imagem (opcional)
  async resizeImage(file: Express.Multer.File, sizes: number[]): Promise<string[]> {}
}
```

### 3. **Middleware de Autenticação JWT** ⏳

```typescript
// apps/backend/src/middleware/auth.ts ⏳
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

// Verificar token JWT
export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token not provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    req.user = decoded as any;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid token' });
  }
};

// Verificar se é admin
export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user?.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};
```

### 4. **Validators com Zod** ⏳

```typescript
// apps/backend/src/validators/productValidator.ts ⏳
import { z } from 'zod';

export const createProductSchema = z.object({
  name: z.string().min(3).max(255),
  slug: z.string().optional(),
  sku: z.string().optional(),
  price: z.number().positive(),
  originalPrice: z.number().positive().optional(),
  description: z.string().optional(),
  shortDesc: z.string().max(200).optional(),
  categoryId: z.string().cuid(),
  stock: z.number().int().min(0),
  minStock: z.number().int().min(0).optional(),
  weight: z.number().positive().optional(),
  dimensions: z.string().optional(),
  isOffer: z.boolean().optional(),
  isNew: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
});

export const updateProductSchema = createProductSchema.partial();
```

### 5. **Migrations do Prisma** ⏳

```bash
# Criar migration inicial
cd apps/backend
npx prisma migrate dev --name init

# Isso vai criar:
apps/backend/prisma/migrations/
└── 20250116000000_init/
    └── migration.sql
```

### 6. **Páginas de Admin no Frontend** ⏳

#### Estrutura Planejada:

```
apps/frontend/src/
├── pages/
│   ├── admin/                     # ⏳ Criar
│   │   ├── Dashboard.tsx          # Dashboard admin
│   │   ├── products/
│   │   │   ├── ProductsList.tsx   # Lista de produtos
│   │   │   ├── ProductForm.tsx    # Criar/Editar produto
│   │   │   └── ProductDetail.tsx  # Detalhes do produto
│   │   ├── categories/
│   │   │   ├── CategoriesList.tsx # Lista de categorias
│   │   │   └── CategoryForm.tsx   # Criar/Editar categoria
│   │   └── Login.tsx              # Login admin
```

#### Componentes Necessários:

- ✅ Formulários de criar/editar (React Hook Form + Zod)
- ✅ Upload de imagens com preview
- ✅ Tabelas com paginação e filtros
- ✅ Modal de confirmação para deletar
- ✅ Toast notifications para feedback
- ✅ Loading states
- ✅ Proteção de rotas (requireAuth)

---

## 📊 Resumo do Progresso

### ✅ **Concluído (60%)**

- ✅ Schema Prisma completo e otimizado
- ✅ Models: User, Category, Product, ProductImage
- ✅ Tipos TypeScript compartilhados
- ✅ DTOs para Create/Update
- ✅ Seeds com 25 produtos e 8 categorias
- ✅ Usuário admin criado
- ✅ Dependências instaladas (bcryptjs, JWT, multer)
- ✅ Endpoints GET funcionando
- ✅ Frontend consumindo API

### ⏳ **Falta Implementar (40%)**

- ⏳ Endpoints POST/PUT/DELETE para produtos
- ⏳ Endpoints POST/PUT/DELETE para categorias
- ⏳ Endpoints de autenticação (login, register)
- ⏳ Middleware JWT para proteger rotas
- ⏳ Sistema de upload de imagens
- ⏳ Validators com Zod
- ⏳ Migrations do Prisma
- ⏳ Páginas de Admin no frontend
- ⏳ Formulários de CRUD no frontend

---

## 🚀 Próximos Passos Recomendados

### Passo 1: Criar Migrations

```bash
cd apps/backend
npx prisma migrate dev --name init
npx prisma generate
```

### Passo 2: Implementar Autenticação

1. Criar controllers de auth
2. Implementar middleware JWT
3. Proteger rotas admin

### Passo 3: Implementar CRUD de Produtos

1. POST /api/products (criar)
2. PUT /api/products/:id (atualizar)
3. DELETE /api/products/:id (soft delete)

### Passo 4: Sistema de Upload

1. Configurar multer
2. Criar pasta uploads/
3. Endpoint POST /api/products/:id/images

### Passo 5: Frontend Admin

1. Página de login
2. Dashboard
3. CRUD de produtos
4. Upload de imagens

---

## 🔗 Arquivos Importantes

| Arquivo | Status | Descrição |
|---------|--------|-----------|
| `apps/backend/prisma/schema.prisma` | ✅ Completo | Schema do banco |
| `apps/backend/prisma/seed.ts` | ✅ Completo | Dados iniciais |
| `packages/shared/src/types/product.ts` | ✅ Completo | Tipos de produtos |
| `packages/shared/src/types/category.ts` | ✅ Completo | Tipos de categorias |
| `packages/shared/src/types/user.ts` | ✅ Completo | Tipos de usuário |
| `apps/backend/src/controllers/productsController.ts` | ⏳ Parcial | Apenas GET |
| `apps/backend/src/controllers/categoriesController.ts` | ⏳ Parcial | Apenas GET |
| `apps/backend/src/middleware/auth.ts` | ❌ Falta | Autenticação JWT |
| `apps/backend/src/middleware/upload.ts` | ❌ Falta | Upload de imagens |
| `apps/backend/src/validators/` | ❌ Falta | Validações Zod |
| `apps/frontend/src/pages/admin/` | ❌ Falta | Admin frontend |

---

## 💡 Comandos Úteis

### Database

```bash
# Gerar Prisma Client
npm run prisma:generate --workspace=apps/backend

# Criar migration
npm run prisma:migrate --workspace=apps/backend

# Rodar seeds
npm run prisma:seed --workspace=apps/backend

# Reset database
npm run prisma:reset --workspace=apps/backend

# Abrir Prisma Studio
npm run prisma:studio --workspace=apps/backend
```

### Docker

```bash
# Rebuild com novo schema
make clean
make rebuild

# Ver logs do backend
make logs SERVICE=backend
```

---

## ✅ Checklist de Validação

Use este checklist para verificar o que está funcionando:

### Database & Schema

- [x] PostgreSQL rodando
- [x] Schema Prisma com 4 models
- [x] Seeds executando sem erro
- [x] 1 admin user criado
- [x] 8 categorias criadas
- [x] 25 produtos com imagens
- [ ] Migrations criadas

### Backend API

- [x] GET /api/products
- [x] GET /api/categories
- [ ] POST /api/products
- [ ] PUT /api/products/:id
- [ ] DELETE /api/products/:id
- [ ] POST /api/auth/login
- [ ] Upload de imagens

### Frontend

- [x] Consumindo API (GET)
- [x] Loading states
- [x] Error handling
- [ ] Páginas de admin
- [ ] Formulários de CRUD
- [ ] Upload de imagens

---

**Data da Última Atualização**: 2025-01-16

**Commit Atual**: `feat: Schema Prisma completo com User, ProductImage e campos avançados`
