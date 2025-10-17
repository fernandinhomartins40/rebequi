# 🚀 Quick Start - Rebequi Monorepo

## ⚡ Início Rápido

### 1. Limpar e Reinstalar (IMPORTANTE!)

```bash
# Remover instalações antigas
npm run clean

# OU manualmente
rm -rf node_modules apps/*/node_modules packages/*/node_modules

# Reinstalar tudo
npm install
```

### 2. Executar o Frontend

```bash
npm run dev
```

O frontend estará disponível em: **http://localhost:8080**

## 📋 Checklist Pós-Migração

- [ ] Limpar node_modules antigos (`npm run clean`)
- [ ] Reinstalar dependências (`npm install`)
- [ ] Verificar que frontend roda (`npm run dev`)
- [ ] Confirmar que imports estão corretos (não deve ter erros)
- [ ] Planejar stack do backend

## 🏗️ Estrutura Atual

```
✅ apps/frontend/          # Frontend React (PRONTO)
⏳ apps/backend/          # Backend (AGUARDANDO IMPLEMENTAÇÃO)
✅ packages/shared/   # Tipos compartilhados (PRONTO)
```

## 🔧 Configuração do Backend (Próximo Passo)

### Opção 1: Node.js + Express

```bash
cd apps/backend

# Instalar dependências
npm install express cors dotenv
npm install -D @types/express @types/cors tsx nodemon

# Atualizar package.json
{
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  }
}
```

### Opção 2: Node.js + Fastify

```bash
cd apps/backend
npm install fastify @fastify/cors dotenv
npm install -D tsx nodemon
```

### Opção 3: Bun + Elysia

```bash
cd apps/backend
bun add elysia
```

### Opção 4: Python + FastAPI

```bash
cd apps/backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install fastapi uvicorn
```

## 📝 Próximas Ações Recomendadas

### 1. Escolher Stack do Backend
- [ ] Decidir linguagem/framework
- [ ] Configurar `apps/backend/package.json`
- [ ] Instalar dependências necessárias

### 2. Configurar Banco de Dados
- [ ] Escolher: PostgreSQL, MongoDB, MySQL, etc
- [ ] Instalar ORM: Prisma, TypeORM, Drizzle, Mongoose
- [ ] Configurar conexão em `apps/backend/.env`

### 3. Implementar Rotas Básicas
- [ ] GET /api/products
- [ ] GET /api/categories
- [ ] POST /api/auth/login (opcional)

### 4. Conectar Frontend ao Backend
- [ ] Atualizar `VITE_API_URL` em `apps/frontend/.env.local`
- [ ] Implementar funções em `apps/frontend/src/services/api/`
- [ ] Remover dados mockados de `apps/frontend/src/pages/Index.tsx`

## 🔗 Importações

### No Frontend ou Backend

```typescript
// Importar tipos compartilhados
import { Product, Category } from '@rebequi/shared/types';

// Usar no código
const product: Product = {
  id: '1',
  name: 'Cimento Portland',
  price: 24.90,
  // ...
};
```

## 🐛 Troubleshooting

### Problema: "Cannot find module '@rebequi/shared'"

**Solução:**
```bash
npm run clean
npm install
```

### Problema: Frontend não inicia

**Solução:**
```bash
cd apps/frontend
npm install
npm run dev
```

### Problema: Erros de TypeScript

**Solução:**
```bash
# Verificar configuração
npm run lint

# Reinstalar types
npm install -D @types/node @types/react @types/react-dom
```

## 📚 Documentação

- [README.md](README.md) - Visão geral do projeto
- [MONOREPO_GUIDE.md](MONOREPO_GUIDE.md) - Guia completo de migração
- [STRUCTURE.md](STRUCTURE.md) - Estrutura detalhada
- [apps/backend/README.md](apps/backend/README.md) - Guia do backend
- [packages/shared/README.md](packages/shared/README.md) - Package compartilhado

## ✅ Tudo Funcionando?

Se o frontend está rodando em **http://localhost:8080**, a migração foi um sucesso! 🎉

Agora você pode:
1. Implementar o backend em `apps/backend/`
2. Adicionar mais tipos em `packages/shared/`
3. Criar novos packages conforme necessário
4. Escalar o monorepo com novos apps

## 🆘 Precisa de Ajuda?

Consulte os arquivos de documentação listados acima ou revise as configurações nos arquivos:
- `package.json` (root)
- `apps/frontend/package.json`
- `apps/backend/package.json`
- `packages/shared/package.json`
