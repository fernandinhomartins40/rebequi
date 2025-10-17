# Rebequi - E-commerce Platform (Monorepo)

Monorepo para a plataforma de e-commerce Rebequi, estruturado com workspaces npm para máxima escalabilidade e manutenibilidade.

## 📁 Estrutura do Projeto

```
rebequi/
├── apps/
│   ├── frontend/         # Frontend React + Vite
│   │   ├── src/
│   │   ├── public/
│   │   ├── package.json
│   │   └── vite.config.ts
│   └── backend/          # Backend (aguardando implementação)
│       ├── src/
│       ├── package.json
│       └── README.md
├── packages/
│   ├── shared/           # Tipos e utilitários compartilhados
│   │   ├── src/
│   │   │   ├── types/
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── ui/               # (Futuro) Componentes UI compartilhados
│   └── config/           # (Futuro) Configurações compartilhadas
├── package.json          # Workspace root
└── README.md
```

## 🚀 Como Usar

### Instalação

```bash
# Instalar todas as dependências do monorepo
npm install
```

### Desenvolvimento

```bash
# Executar apenas o frontend
npm run dev

# Executar frontend
npm run dev:frontend

# Executar backend (quando implementado)
npm run dev:backend
```

### Build

```bash
# Build de todos os apps
npm run build

# Build do frontend
npm run build:frontend

# Build do backend (quando implementado)
npm run build:backend
```

### Outros Comandos

```bash
# Lint em todos os workspaces
npm run lint

# Executar testes
npm run test

# Limpar node_modules
npm run clean
```

## 📦 Workspaces

### `apps/frontend` - Frontend
- **Stack**: React 18 + Vite + TypeScript
- **UI**: Shadcn/ui + Tailwind CSS
- **Estado**: React Query
- **Roteamento**: React Router v6

### `apps/backend` - Backend (Aguardando implementação)
- Stack a ser definida
- Estrutura preparada para qualquer framework
- Documentação completa em `apps/backend/README.md`

### `packages/shared` - Código Compartilhado
- Tipos TypeScript compartilhados entre frontend e backend
- Utilitários comuns
- Constantes e configurações

## 🔗 Importações entre Workspaces

Use o prefixo `@rebequi/` para importar de outros workspaces:

```typescript
// No frontend ou backend
import { Product, Category } from '@rebequi/shared/types';
```

## 🛠️ Tecnologias

### Frontend
- React 18
- TypeScript
- Vite
- Tailwind CSS
- Shadcn/ui
- React Query
- React Router
- React Hook Form
- Zod

### Backend (A definir)
Opções sugeridas:
- Node.js + Express/Fastify/NestJS
- Bun + Elysia
- Python + FastAPI
- Go + Fiber

### Shared
- TypeScript
- Zod (validação)

## 📝 Próximos Passos

1. **Implementar Backend** (`apps/backend/`)
   - Escolher stack
   - Configurar banco de dados
   - Implementar rotas API
   - Configurar autenticação

2. **Evoluir Shared Package** (`packages/shared/`)
   - Adicionar validações Zod
   - Criar utilitários compartilhados
   - Adicionar constantes

3. **Criar Package UI** (`packages/ui/`)
   - Extrair componentes reutilizáveis
   - Documentação Storybook

4. **Configurações Compartilhadas** (`packages/config/`)
   - ESLint config
   - TypeScript config
   - Prettier config

## 🔒 Ambiente

### Frontend
Copie `apps/frontend/.env.example` para `apps/frontend/.env.local`

### Backend
Copie `apps/backend/.env.example` para `apps/backend/.env`

## 📚 Documentação Adicional

- [Backend Documentation](apps/backend/README.md)
- [Shared Package](packages/shared/README.md)

## 🤝 Contribuindo

1. Clone o repositório
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request
