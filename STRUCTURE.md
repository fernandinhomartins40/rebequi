# Estrutura do Monorepo Rebequi

## 📂 Visão Geral da Estrutura

```
rebequi/                                    # Root do monorepo
│
├── 📁 apps/                                # Aplicações
│   │
│   ├── 📁 web/                             # Frontend React
│   │   ├── 📁 src/
│   │   │   ├── 📁 components/              # Componentes React
│   │   │   │   ├── 📁 ui/                  # Componentes Shadcn/ui
│   │   │   │   ├── Header.tsx
│   │   │   │   ├── Footer.tsx
│   │   │   │   ├── Hero.tsx
│   │   │   │   └── ...
│   │   │   ├── 📁 pages/                   # Páginas/Rotas
│   │   │   │   ├── Index.tsx
│   │   │   │   └── NotFound.tsx
│   │   │   ├── 📁 services/                # Serviços API
│   │   │   │   └── 📁 api/
│   │   │   │       ├── client.ts           # HTTP client
│   │   │   │       ├── products.ts         # API de produtos
│   │   │   │       └── categories.ts       # API de categorias
│   │   │   ├── 📁 hooks/                   # Custom hooks
│   │   │   ├── 📁 lib/                     # Utilities
│   │   │   ├── 📁 assets/                  # Imagens, fonts
│   │   │   ├── App.tsx                     # App principal
│   │   │   └── main.tsx                    # Entry point
│   │   ├── 📁 public/                      # Assets públicos
│   │   ├── index.html
│   │   ├── package.json                    # Deps do frontend
│   │   ├── vite.config.ts                  # Config Vite
│   │   ├── tsconfig.json                   # Config TypeScript
│   │   ├── tailwind.config.ts              # Config Tailwind
│   │   └── .env.example                    # Vars ambiente
│   │
│   └── 📁 api/                             # Backend (aguardando)
│       ├── 📁 src/                         # Código fonte (futuro)
│       ├── package.json                    # Deps do backend
│       ├── README.md                       # Docs do backend
│       └── .env.example                    # Vars ambiente
│
├── 📁 packages/                            # Packages compartilhados
│   │
│   ├── 📁 shared/                          # Código compartilhado
│   │   ├── 📁 src/
│   │   │   ├── 📁 types/                   # TypeScript types
│   │   │   │   ├── product.ts              # Tipos de Produto
│   │   │   │   ├── category.ts             # Tipos de Categoria
│   │   │   │   └── index.ts                # Exports
│   │   │   └── index.ts                    # Main export
│   │   ├── package.json                    # Deps do shared
│   │   ├── tsconfig.json                   # Config TypeScript
│   │   └── README.md                       # Docs
│   │
│   ├── 📁 ui/                              # (Futuro) Componentes compartilhados
│   └── 📁 config/                          # (Futuro) Configs compartilhadas
│
├── 📄 package.json                         # Root workspace config
├── 📄 package-lock.json                    # Lock file
├── 📄 tsconfig.json                        # TS config global
├── 📄 .gitignore                           # Git ignore
├── 📄 README.md                            # Docs principal
├── 📄 MONOREPO_GUIDE.md                    # Guia de migração
└── 📄 STRUCTURE.md                         # Este arquivo
```

## 🔗 Fluxo de Dependências

```
┌─────────────────────────────────────────────────────┐
│                   Root Workspace                     │
│                   (package.json)                     │
└─────────────────────────────────────────────────────┘
                          │
                ┌─────────┴─────────┐
                │                   │
                ▼                   ▼
        ┌───────────────┐   ┌───────────────┐
        │   apps/frontend    │   │   apps/backend    │
        │   (Frontend)  │   │   (Backend)   │
        └───────────────┘   └───────────────┘
                │                   │
                └─────────┬─────────┘
                          │
                          ▼
                ┌───────────────────┐
                │ packages/shared   │
                │   (Types, etc)    │
                └───────────────────┘
```

## 📦 Workspaces Configurados

### 1. Root (`@rebequi/monorepo`)
- Gerenciador principal
- Scripts globais
- TypeScript global

### 2. Frontend (`@rebequi/frontend`)
- React 18 + Vite + TypeScript
- Shadcn/ui + Tailwind CSS
- React Query + React Router
- **Importa**: `@rebequi/shared`

### 3. Backend (`@rebequi/backend`)
- Preparado para implementação
- Stack a definir
- **Importa**: `@rebequi/shared`

### 4. Shared (`@rebequi/shared`)
- Tipos TypeScript
- Utilitários compartilhados
- **Importado por**: web, api

## 🚀 Comandos Principais

```bash
# Desenvolvimento
npm run dev              # Roda frontend
npm run dev:web          # Roda apenas web
npm run dev:api          # Roda apenas api (futuro)

# Build
npm run build            # Build todos
npm run build:web        # Build web
npm run build:api        # Build api

# Manutenção
npm run lint             # Lint todos
npm run test             # Test todos
npm run clean            # Limpa node_modules
```

## 🔄 Importações Entre Workspaces

```typescript
// No apps/frontend ou apps/backend
import { Product, Category } from '@rebequi/shared/types';
```

## 📝 Padrões de Organização

### Frontend (apps/frontend)
- **components/**: Componentes React reutilizáveis
- **components/ui/**: Componentes Shadcn/ui (primitivos)
- **pages/**: Páginas/rotas da aplicação
- **services/**: Lógica de API e integrações
- **hooks/**: Custom React hooks
- **lib/**: Funções utilitárias
- **assets/**: Recursos estáticos

### Backend (apps/backend) - Sugestão
- **controllers/**: Controladores de rotas
- **routes/**: Definições de rotas
- **services/**: Lógica de negócio
- **models/**: Models do banco de dados
- **middlewares/**: Middlewares Express/etc
- **utils/**: Utilitários

### Shared (packages/shared)
- **types/**: TypeScript interfaces e types
- **validators/**: Schemas Zod (futuro)
- **constants/**: Constantes compartilhadas (futuro)
- **utils/**: Funções utilitárias (futuro)

## ✅ Benefícios da Estrutura

1. **Separação clara**: Frontend, backend e shared isolados
2. **Type-safety**: Tipos compartilhados garantem consistência
3. **Escalabilidade**: Fácil adicionar novos apps/packages
4. **Desenvolvimento**: Um comando inicia tudo
5. **Manutenção**: Código organizado e reutilizável
6. **Build otimizado**: Cache entre workspaces
7. **Versionamento**: Controle fino de versões
