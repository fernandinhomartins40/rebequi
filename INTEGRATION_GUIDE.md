# 🔗 Guia de Integração Frontend-Backend

Este guia explica como o frontend e backend estão integrados e como testá-los.

## 📊 Arquitetura de Integração

```
┌─────────────────────────────────────────────┐
│           Frontend (React + Vite)           │
│                                             │
│  Pages/Index.tsx (React Query)              │
│         ↓                                   │
│  Services/API (products, categories)        │
│         ↓                                   │
│  API Client (apiFetch)                      │
└─────────────┬───────────────────────────────┘
              │ HTTP Requests
              ↓
┌─────────────────────────────────────────────┐
│        Nginx Reverse Proxy (Port 80)        │
│                                             │
│  Routes:                                    │
│  /api/*  → Backend                          │
│  /*      → Frontend                         │
└─────────────┬───────────────────────────────┘
              │
    ┌─────────┴─────────┐
    │                   │
    ▼                   ▼
┌──────────┐      ┌──────────────┐
│ Frontend │      │   Backend    │
│  React   │      │   Express    │
│ Port 8080│      │  Port 3000   │
└──────────┘      └──────┬───────┘
                         │
                         ▼
                  ┌─────────────┐
                  │ PostgreSQL  │
                  │  Port 5432  │
                  └─────────────┘
```

## 🔌 Endpoints da API Consumidos

### Produtos

| Endpoint | Método | Descrição | Uso no Frontend |
|----------|--------|-----------|-----------------|
| `/api/products` | GET | Lista produtos com filtros | `fetchProducts()` |
| `/api/products/:id` | GET | Produto específico | `fetchProductById()` |
| `/api/products/category/:slug` | GET | Produtos por categoria | `fetchProductsByCategory()` |
| `/api/products/promotional` | GET | Produtos em promoção | `fetchPromotionalProducts()` |
| `/api/products/new` | GET | Produtos novos | `fetchNewProducts()` |

### Categorias

| Endpoint | Método | Descrição | Uso no Frontend |
|----------|--------|-----------|-----------------|
| `/api/categories` | GET | Lista categorias | `fetchCategories()` |
| `/api/categories/:id` | GET | Categoria por ID | `fetchCategoryById()` |
| `/api/categories/slug/:slug` | GET | Categoria por slug | `fetchCategoryBySlug()` |

## 📂 Estrutura de Serviços do Frontend

```
apps/frontend/src/services/api/
├── client.ts           # Cliente HTTP base com apiFetch
├── products.ts         # Serviços de produtos
├── categories.ts       # Serviços de categorias
└── index.ts            # Re-exports
```

### client.ts - Cliente HTTP

```typescript
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export async function apiFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`);
  }

  return response.json();
}
```

### products.ts - Serviço de Produtos

Implementa todas as funções de produtos:
- `fetchProducts(filters)` - Com suporte a filtros (categoria, preço, busca, etc.)
- `fetchProductById(id)` - Busca por ID
- `fetchProductsByCategory(slug, page, limit)` - Produtos por categoria
- `fetchPromotionalProducts()` - Produtos em oferta
- `fetchNewProducts()` - Produtos novos

### categories.ts - Serviço de Categorias

Implementa todas as funções de categorias:
- `fetchCategories()` - Lista todas
- `fetchCategoryById(id)` - Por ID
- `fetchCategoryBySlug(slug)` - Por slug

## 🎨 Uso no Frontend com React Query

### Exemplo: Página Index

```typescript
import { useQuery } from "@tanstack/react-query";
import { fetchPromotionalProducts } from "@/services/api/products";

const Index = () => {
  // Fetch promotional products
  const {
    data: promotions,
    isLoading,
    error
  } = useQuery({
    queryKey: ['products', 'promotional'],
    queryFn: fetchPromotionalProducts,
  });

  if (isLoading) return <ProductSectionSkeleton />;
  if (error) return <ErrorAlert error={error} />;

  return <ProductSection products={promotions} />;
};
```

### Queries Implementadas na Index

```typescript
// Promoções
useQuery(['products', 'promotional'], fetchPromotionalProducts)

// Novidades
useQuery(['products', 'new'], fetchNewProducts)

// Por categoria
useQuery(['products', 'category', 'ferramentas'],
  () => fetchProductsByCategory('ferramentas', 1, 4))

useQuery(['products', 'category', 'tintas'],
  () => fetchProductsByCategory('tintas', 1, 4))

useQuery(['products', 'category', 'cimento-argamassa'],
  () => fetchProductsByCategory('cimento-argamassa', 1, 4))

useQuery(['products', 'category', 'materiais-eletricos'],
  () => fetchProductsByCategory('materiais-eletricos', 1, 4))
```

## 🔧 Configuração de Ambientes

### Desenvolvimento Local (sem Docker)

**Backend:**
```bash
cd apps/backend
npm run dev  # Porta 3000
```

**Frontend:**
```bash
cd apps/frontend
# Use .env.development
# VITE_API_URL=http://localhost:3000/api
npm run dev  # Porta 8080
```

### Docker (Produção/Staging)

```bash
# Na raiz do projeto
docker-compose up -d

# Acesso:
# Frontend: http://localhost
# Backend: http://localhost/api
# Nginx faz o roteamento automático
```

### Variáveis de Ambiente

**Frontend (.env):**
```env
# Docker (via Nginx)
VITE_API_URL=http://localhost/api

# Local development
# VITE_API_URL=http://localhost:3000/api
```

**Backend (.env):**
```env
DATABASE_URL=postgresql://rebequi:rebequi123@postgres:5432/rebequi
PORT=3000
ALLOWED_ORIGINS=http://localhost,http://localhost:8080,http://localhost:80
```

## 🧪 Testando a Integração

### 1. Via Docker (Recomendado)

```bash
# Iniciar todos os serviços
make up

# Aguardar ~30 segundos para inicialização

# Verificar logs
make logs

# Testar API
curl http://localhost/api/health
curl http://localhost/api/products
curl http://localhost/api/categories

# Abrir navegador
open http://localhost
```

### 2. Desenvolvimento Local

**Terminal 1 - Backend:**
```bash
cd apps/backend
npm install
npm run prisma:generate
docker-compose up -d postgres  # Apenas PostgreSQL
npm run prisma:migrate
npm run prisma:seed
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd apps/frontend
npm install
npm run dev
```

**Terminal 3 - Testes:**
```bash
# Backend health
curl http://localhost:3000/health

# Produtos
curl http://localhost:3000/api/products

# Frontend
open http://localhost:8080
```

## 📊 Estados da UI

### Loading States

```typescript
{isLoading && <ProductSectionSkeleton />}
```

Mostra skeletons enquanto carrega dados da API.

### Error States

```typescript
{error && <ErrorAlert error={error} />}
```

Exibe alertas de erro amigáveis se a API falhar.

### Empty States

```typescript
{data && data.length === 0 && <EmptyState />}
```

Mostra mensagem quando não há produtos.

### Success States

```typescript
{data && data.length > 0 && <ProductSection products={data} />}
```

Renderiza os produtos quando carregados com sucesso.

## 🔍 Debug e Troubleshooting

### Frontend não conecta ao Backend

1. **Verificar variável de ambiente:**
   ```bash
   # Verificar se VITE_API_URL está correta
   echo $VITE_API_URL
   ```

2. **Verificar console do navegador:**
   - Abra DevTools → Console
   - Procure por erros de CORS ou network

3. **Verificar Network tab:**
   - DevTools → Network
   - Verifique se as requisições estão indo para URL correta
   - Status codes (200 = OK, 404 = Not Found, 500 = Server Error)

### CORS Errors

Configurado no backend:
```typescript
app.use(cors({
  origin: ['http://localhost', 'http://localhost:8080'],
  credentials: true,
}));
```

Se tiver erro de CORS, adicione a origem em `ALLOWED_ORIGINS` no `.env` do backend.

### Dados não aparecem

1. **Verificar se banco está populado:**
   ```bash
   make seed
   # ou
   docker-compose exec backend npx prisma db seed
   ```

2. **Verificar React Query DevTools:**
   - Instalar: `@tanstack/react-query-devtools`
   - Ver status das queries

3. **Verificar logs:**
   ```bash
   make logs SERVICE=backend
   make logs SERVICE=frontend
   ```

## 📈 Monitoramento

### React Query DevTools

Adicione ao App.tsx:
```typescript
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

<QueryClientProvider client={queryClient}>
  <App />
  <ReactQueryDevtools initialIsOpen={false} />
</QueryClientProvider>
```

### Logs do Backend

```bash
# Ver logs em tempo real
docker-compose logs -f backend

# Logs de query do Prisma
# Já configurado em apps/backend/src/lib/prisma.ts
```

## 🎯 Próximos Passos

### Features Planejadas

- [ ] Paginação completa de produtos
- [ ] Filtros avançados (preço, categoria, etc.)
- [ ] Busca de produtos
- [ ] Detalhes do produto (página individual)
- [ ] Carrinho de compras (com Context API)
- [ ] Autenticação e login
- [ ] Área do usuário
- [ ] Checkout e pedidos

### Otimizações

- [ ] Cache de queries (já parcialmente implementado)
- [ ] Prefetch de dados
- [ ] Infinite scroll para produtos
- [ ] Lazy loading de imagens
- [ ] Service Worker para offline
- [ ] Otimização de bundle

## 📚 Referências

- [React Query Docs](https://tanstack.com/query/latest/docs/react/overview)
- [Prisma Docs](https://www.prisma.io/docs)
- [Express.js](https://expressjs.com/)
- [Vite](https://vitejs.dev/)
- [TypeScript](https://www.typescriptlang.org/)
