# 📚 Índice de Documentação - Rebequi Monorepo

## 🚀 Início Rápido

Comece por aqui:

1. **[QUICK_START.md](QUICK_START.md)** ⭐ - Guia de início rápido
   - Como instalar
   - Como rodar
   - Primeiros passos

## 📖 Documentação Principal

### Visão Geral
- **[README.md](README.md)** - Visão geral do projeto
  - Estrutura do monorepo
  - Tecnologias utilizadas
  - Comandos principais

### Guias Detalhados
- **[MONOREPO_GUIDE.md](MONOREPO_GUIDE.md)** - Guia completo de migração
  - Histórico da migração
  - Mudanças realizadas
  - Como trabalhar com workspaces
  - FAQ

- **[STRUCTURE.md](STRUCTURE.md)** - Estrutura detalhada
  - Árvore completa de diretórios
  - Organização de código
  - Padrões e convenções
  - Fluxo de dependências

### Resumo Técnico
- **[.claude/MIGRATION_SUMMARY.md](.claude/MIGRATION_SUMMARY.md)** - Resumo da migração
  - Checklist completo
  - Arquivos criados/modificados
  - Próximos passos

## 📦 Documentação por Workspace

### Frontend (apps/frontend)
- **Localização**: `apps/frontend/`
- **Stack**: React 18 + Vite + TypeScript + Tailwind
- **Porta**: http://localhost:8080
- **Documentação**: Em desenvolvimento

### Backend (apps/backend)
- **[apps/backend/README.md](apps/backend/README.md)** ⭐ - Guia do backend
  - Como escolher stack
  - Estrutura sugerida
  - Configuração inicial
  - Endpoints planejados
- **Localização**: `apps/backend/`
- **Status**: Aguardando implementação
- **Porta planejada**: http://localhost:3000

### Shared (packages/shared)
- **[packages/shared/README.md](packages/shared/README.md)** - Package compartilhado
  - Tipos disponíveis
  - Como usar
  - Como adicionar novos tipos
- **Localização**: `packages/shared/`
- **Conteúdo**: Tipos TypeScript, utils

## 🎯 Guias por Caso de Uso

### Para Desenvolvedores Frontend
1. Leia [QUICK_START.md](QUICK_START.md)
2. Explore `apps/frontend/src/`
3. Veja [packages/shared/README.md](packages/shared/README.md) para tipos

### Para Desenvolvedores Backend
1. Leia [apps/backend/README.md](apps/backend/README.md)
2. Escolha sua stack
3. Use tipos de [packages/shared/README.md](packages/shared/README.md)

### Para Arquitetos/Tech Leads
1. Leia [README.md](README.md) - Visão geral
2. Leia [STRUCTURE.md](STRUCTURE.md) - Arquitetura
3. Leia [MONOREPO_GUIDE.md](MONOREPO_GUIDE.md) - Detalhes técnicos

### Para DevOps/SRE
1. Analise estrutura em [STRUCTURE.md](STRUCTURE.md)
2. Configure CI/CD baseado nos workspaces
3. Veja scripts em `package.json` (root)

## 📋 Checklists

### Primeira Vez no Projeto
- [ ] Ler [QUICK_START.md](QUICK_START.md)
- [ ] Executar `npm run clean && npm install`
- [ ] Testar frontend: `npm run dev`
- [ ] Explorar estrutura: ver [STRUCTURE.md](STRUCTURE.md)

### Implementar Backend
- [ ] Ler [apps/backend/README.md](apps/backend/README.md)
- [ ] Escolher stack
- [ ] Configurar `apps/backend/package.json`
- [ ] Configurar banco de dados
- [ ] Implementar rotas básicas

### Adicionar Nova Feature
- [ ] Verificar se precisa tipos compartilhados
- [ ] Adicionar tipos em `packages/shared/` se necessário
- [ ] Implementar no frontend (`apps/frontend/`)
- [ ] Implementar no backend (`apps/backend/`)
- [ ] Testar integração

## 🔧 Configurações

### Arquivos de Configuração Importantes
```
📄 package.json                  # Root workspace
📄 apps/frontend/package.json         # Frontend deps
📄 apps/frontend/vite.config.ts       # Vite config
📄 apps/frontend/tailwind.config.ts   # Tailwind config
📄 apps/frontend/tsconfig.json        # TS config frontend
📄 apps/backend/package.json         # Backend deps
📄 apps/backend/.env.example         # Env vars backend
📄 packages/shared/tsconfig.json # TS config shared
📄 .gitignore                    # Git ignore global
```

### Variáveis de Ambiente
- Frontend: `apps/frontend/.env.local` (copiar de `.env.example`)
- Backend: `apps/backend/.env` (copiar de `.env.example`)

## 🚀 Comandos Essenciais

```bash
# Desenvolvimento
npm run dev              # Rodar frontend
npm run dev:web          # Rodar apenas web
npm run dev:api          # Rodar apenas api

# Build
npm run build            # Build tudo
npm run build:web        # Build web
npm run build:api        # Build api

# Manutenção
npm run lint             # Lint
npm run test             # Test
npm run clean            # Limpar
```

## 📞 Suporte

### Problemas Comuns
Veja seção "Troubleshooting" em [QUICK_START.md](QUICK_START.md#-troubleshooting)

### Perguntas Frequentes
Veja FAQ em [MONOREPO_GUIDE.md](MONOREPO_GUIDE.md#-faq)

## 🗂️ Estrutura Resumida

```
rebequi/
├── 📁 apps/
│   ├── web/          → Frontend React
│   └── api/          → Backend (futuro)
├── 📁 packages/
│   └── shared/       → Código compartilhado
├── 📄 package.json   → Workspace root
└── 📚 Documentação   → Este índice
```

## ✅ Status do Projeto

- ✅ **Monorepo**: Configurado e funcionando
- ✅ **Frontend**: Migrado e operacional
- ✅ **Shared**: Tipos compartilhados prontos
- ⏳ **Backend**: Aguardando implementação
- ✅ **Documentação**: Completa

---

**Última atualização**: 2025-10-16
**Versão**: 1.0.0
