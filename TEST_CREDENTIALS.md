# Credenciais de Teste

## Bootstrap de produção/homologação

O bootstrap em [apps/backend/prisma/bootstrap.ts](/c:/Projetos%20Cursor/rebequi/apps/backend/prisma/bootstrap.ts) mantém dois usuários gerenciados automaticamente pelo deploy:

- Admin: `admin@rebequi.com.br` / `ChangeMe123!`
- Cliente: `cliente@rebequi.com.br` / `Cliente123!`

Esses usuários são reconciliados pelo workflow [deploy-production.yml](/c:/Projetos%20Cursor/rebequi/.github/workflows/deploy-production.yml), no passo do `migrator`:

```sh
npx prisma db push && npm run prisma:bootstrap
```

## Seed de desenvolvimento

O seed em [apps/backend/prisma/seed.ts](/c:/Projetos%20Cursor/rebequi/apps/backend/prisma/seed.ts) recria uma base realista para testes locais. Todos os usuários criados por ele usam a senha:

```txt
Teste@123
```

Usuários internos:

- Admin: `admin@rebequi.com.br`
- Gerente: `gerente@rebequi.com.br`
- Catálogo: `catalogo@rebequi.com.br`
- Marketing: `marketing@rebequi.com.br`
- Vendas: `vendas@rebequi.com.br`

Clientes:

- `ana.souza@example.com`
- `joao.silva@example.com`
- `patricia.lima@example.com`
- `marcos.oliveira@example.com`
- `construtora.alfa@example.com`
- `renata.pires@example.com`
- `carlos.mendes@example.com`
- `fernanda.ramos@example.com`

Para popular a base local:

```sh
npm run prisma:seed --workspace=apps/backend
```

Observação: o seed de desenvolvimento limpa tabelas transacionais e de catálogo antes de recriar os dados.
