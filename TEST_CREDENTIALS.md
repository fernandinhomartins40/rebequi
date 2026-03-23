# Test Credentials

Este repositório mantém dois usuários de teste gerenciados pelo bootstrap em [apps/backend/prisma/bootstrap.ts](/c:/Projetos%20Cursor/rebequi/apps/backend/prisma/bootstrap.ts).

Esses usuários são reconciliados a cada deploy de produção pelo workflow [deploy-production.yml](/c:/Projetos%20Cursor/rebequi/.github/workflows/deploy-production.yml), através do passo do `migrator` que executa:

```sh
npx prisma db push && npm run prisma:bootstrap
```

Credenciais provisionadas:

- Admin: `admin@rebequi.com.br` / `ChangeMe123!`
- Cliente: `cliente@rebequi.com.br` / `Cliente123!`

Comportamento esperado:

- Se o usuário não existir, ele é criado.
- Se já existir com o mesmo email, nome, senha, papel e `isActive` são sincronizados no deploy.
- O login deve funcionar em `/api/auth/login`.
- A sessão deve ser validada em `/api/auth/me`.
- O logout deve invalidar a sessão em `/api/auth/logout`.

Observação importante:

- Essas credenciais são de homologação/teste e são gerenciadas automaticamente pelo deploy.
- Antes de uma operação pública definitiva, remova ou rotacione essas credenciais para evitar exposição desnecessária.
