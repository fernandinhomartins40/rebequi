# Guia de Migração para Monorepo

## ✅ Migração Concluída

O projeto foi **completamente reestruturado** de um projeto single-app para uma **arquitetura monorepo** usando **npm workspaces**.

## 📊 O que mudou?

### Antes (Estrutura Antiga)
```
rebequi/
├── src/
├── public/
├── package.json
└── vite.config.ts
```

### Depois (Estrutura Monorepo)
```
rebequi/
├── apps/
│   ├── web/              # Frontend (todo código movido para cá)
│   └── api/              # Backend (preparado para implementação)
├── packages/
│   └── shared/           # Tipos compartilhados
├── package.json          # Root workspace
└── README.md
```

## 🚀 Como Começar

### 1. Instalar Dependências

```bash
# Remove node_modules antigo e reinstala tudo
npm run clean
npm install
```

### 2. Executar o Frontend

```bash
npm run dev
# ou
npm run dev:web
```

### 3. Trabalhar com Workspaces

```bash
# Instalar dependência apenas no frontend
npm install <package> --workspace=apps/frontend

# Instalar dependência apenas no backend
npm install <package> --workspace=apps/backend

# Instalar dependência no shared
npm install <package> --workspace=packages/shared

# Executar comando em todos os workspaces
npm run build --workspaces
```

## 📦 Estrutura de Workspaces

### Root (`package.json`)
- Gerencia todos os workspaces
- Scripts globais para dev, build, lint, test
- Dependências globais (TypeScript, etc)

### `apps/frontend` (Frontend)
- Todo o código React foi movido para cá
- Mantém todas as funcionalidades anteriores
- Importa tipos de `@rebequi/shared`
- **Roda em**: http://localhost:8080

### `apps/backend` (Backend - Aguardando)
- Estrutura preparada
- Pronto para receber qualquer stack
- Compartilha tipos com `@rebequi/shared`
- **Futuro**: http://localhost:3000

### `packages/shared`
- Tipos TypeScript (`Product`, `Category`, etc)
- Código compartilhado entre apps
- Importado via `@rebequi/shared/types`

## 🔄 Importações

### Antes
```typescript
// apps/frontend/src/services/api/products.ts
import { Product } from '@/types';
```

### Depois
```typescript
// apps/frontend/src/services/api/products.ts
import { Product } from '@rebequi/shared/types';
```

## ⚙️ Comandos Principais

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Inicia frontend |
| `npm run dev:web` | Inicia apenas frontend |
| `npm run dev:api` | Inicia apenas backend (quando implementado) |
| `npm run build` | Build de tudo |
| `npm run build:web` | Build do frontend |
| `npm run build:api` | Build do backend |
| `npm run lint` | Lint em todos workspaces |
| `npm run clean` | Remove todos node_modules |

## 🆕 Próximos Passos

### 1. Implementar Backend (`apps/backend/`)

Escolha sua stack:
- **Node.js**: Express, Fastify, Hono, NestJS
- **Bun**: Elysia
- **Python**: FastAPI, Django
- **Go**: Fiber, Gin

Configure em `apps/backend/package.json`:
```json
{
  "scripts": {
    "dev": "tsx watch src/index.ts",  // ou sua escolha
    "build": "tsc",
    "start": "node dist/index.js"
  }
}
```

### 2. Configurar Banco de Dados

1. Escolha: PostgreSQL, MongoDB, MySQL, etc
2. Configure ORM: Prisma, TypeORM, Drizzle
3. Adicione URL em `apps/backend/.env`

### 3. Evoluir Shared Package

```typescript
// packages/shared/src/validators/product.ts
import { z } from 'zod';

export const productSchema = z.object({
  id: z.string(),
  name: z.string().min(3),
  price: z.number().positive(),
  // ...
});
```

### 4. Criar Package UI (Opcional)

```bash
mkdir -p packages/ui/src
```

Extraia componentes reutilizáveis do frontend.

## 🔍 Verificações

### Verificar estrutura
```bash
ls -la apps/
ls -la packages/
```

### Verificar workspaces
```bash
npm ls --workspaces
```

### Testar imports
```bash
npm run lint
```

## ❓ FAQ

**P: Por que monorepo?**
R: Facilita compartilhamento de código, tipos consistentes entre front/back, builds mais rápidos, deploy simplificado.

**P: Preciso reinstalar tudo?**
R: Sim, rode `npm run clean` e depois `npm install`

**P: Os imports antigos vão funcionar?**
R: Imports locais (`@/`) continuam funcionando no frontend. Apenas tipos agora vêm de `@rebequi/shared`

**P: Como adicionar nova dependência?**
R: Use `--workspace` flag:
```bash
npm install axios --workspace=apps/frontend
```

**P: Posso usar outro package manager?**
R: Sim! Funciona com npm, yarn, pnpm, bun. Apenas ajuste os scripts.

## 🎯 Benefícios da Nova Estrutura

✅ **Código compartilhado**: Tipos usados em front e back
✅ **Escalabilidade**: Fácil adicionar novos apps/packages
✅ **Manutenibilidade**: Código organizado e separado
✅ **Type-safety**: TypeScript em todo projeto
✅ **Desenvolvimento**: Um comando roda tudo
✅ **Build otimizado**: Apenas o necessário é buildado
✅ **Reutilização**: Componentes e utils compartilhados

## 📚 Recursos

- [npm workspaces](https://docs.npmjs.com/cli/v8/using-npm/workspaces)
- [Monorepo patterns](https://monorepo.tools/)
- [TypeScript Project References](https://www.typescriptlang.org/docs/handbook/project-references.html)
