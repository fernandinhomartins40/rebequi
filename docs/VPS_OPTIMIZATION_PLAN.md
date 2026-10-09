# Plano de Otimização da VPS

## Estado inicial auditado

Monorepo npm: React/Vite estático em Nginx, API Express/Node 20, Prisma 6 e PostgreSQL 16. OCR local PaddleOCR/Python e reconhecimento externo OpenRouter são funcionalidades reais. Não há Redis, broker nem worker separado na stack de produção. O OCR local já possui fila por instância; manutenção de orçamentos roda a cada 15 minutos. Uploads, banco e logs têm volumes nomeados. O único workflow ativo compila três imagens sem cache na VPS, executa migrations/bootstrap e recria API/web.

Branch `main`, commit inicial `6d187c5`. Trabalhar exclusivamente na `main`, com commit e push diretos, conforme instrução do usuário. Preservar os protocolos locais existentes. Deploy somente por GitHub Actions; não alterar aplicações vizinhas nem apagar dados, imagens ou backups.

## Baseline

MEASURED em 2026-10-09 15:07 America/Sao_Paulo, servidor `srv953800`, IP `72.60.10.108`, x86_64: RAM total 15.988 MiB, usada 4.955 MiB, disponível 10.260 MiB; swap usada 501 MiB/2.047 MiB; disco raiz 51 GiB/194 GiB (27%), inodes 4%; load 1,15/1,33/1,58. Docker: 88 imagens, 38,28 GB lógicos; 58 contêineres/55 ativos; volumes 3,628 GB; build cache 5,066 GB. Valores agregados da VPS compartilhada, não atribuíveis ao Rebequi.

Nenhum contêiner, imagem, volume `rebequi-*` ou `/opt/rebequi` encontrado. O usuário confirmou reinstalação da VPS e ausência intencional da aplicação: este trabalho prepara a primeira instalação. HTTPS inicialmente falha por certificado incompatível. Consumo, dataset, conexões, backups, latência e picos anteriores da aplicação: NOT_MEASURED. Docker local indisponível; testes de imagens em runner GitHub. Não há consumo anterior comparável da aplicação.

## Desperdícios encontrados

- Build de backend/frontend/migrator na VPS com `--no-cache`, incluindo Python/OCR e compiladores.
- Contexto Docker não exclui secrets, uploads, logs, backups e artefatos locais.
- Runtime copia todo `@prisma` do builder, incluindo componentes da CLI desnecessários à API; Prisma é gerado duas vezes no builder.
- Migrator usa a imagem inteira de compilação; bootstrap de catálogo/usuários roda em todo deploy e sobrescreve configuração de credenciais com valores fixos.
- Logs Winston em arquivo e logs Docker sem limites; console duplicado no desenvolvimento.
- Deploy remove a release anterior e força remoção/recriação de contêineres antes da validação, sem rollback de aplicação.
- Alias Compose alternativo diverge da produção e contém valores padrão inseguros.
- Três cópias redundantes de buffers de upload e consulta de matching carregando imagens, descrições, preços e estoque não usados pelos consumidores.
- Testes reais revelaram logs PaddleOCR contaminando JSON e resposta de rascunho anônimo acessando usuário nulo; corrigir antes da instalação.

## Plano

| ID | PRIORIDADE | ÁREA | PROBLEMA | EVIDÊNCIA | SOLUÇÃO | GANHO ESPERADO | RISCO | TESTE | ROLLBACK | STATUS |
|---|---|---|---|---|---|---|---|---|---|---|
| OPT-01 | P1 | Build/deploy | Compilação na VPS | Workflow `build --no-cache` | Um workflow, jobs backend/frontend paralelos, GHCR, pull por digest, deploy sem build | Eliminar compilação e cache de build de novas releases na VPS | Médio | Builds, CI, sintaxe, smoke/rollback | Release anterior preservada | DONE |
| OPT-02 | P0 | Docker | Contexto permite dados/secrets | `.dockerignore` incompleto | Excluir persistência, credenciais e artefatos locais | Menos transferência/disco; proteger secrets | Baixo | Contexto e builds | Reverter arquivo | DONE |
| OPT-03 | P2 | Imagens | CLI e builder no runtime | Dockerfile backend | Migrator dedicado sem compiladores; API só client gerado; cache OCR por requisitos | Menor imagem/runtime; menos build repetido | Médio | Imports, build e migrations em banco isolado | Imagens anteriores | DONE |
| OPT-04 | P2 | Logs | Crescimento sem limite | Winston File e Compose | Rotação limitada mantendo console, erros e volumes | Limitar crescimento futuro | Baixo | Testes/build e configuração | Config anterior | DONE |
| OPT-05 | P2 | Jobs | Manutenção pode sobrepor | `setInterval` sem guarda | Impedir manutenção simultânea no mesmo processo | Evitar queries duplicadas em execução longa | Baixo | Typecheck/build e revisão da guarda/finally | Reverter guarda | DONE |
| OPT-06 | P0 | Persistência/deploy | Bootstrap/remoção agressivos | Workflow e Compose | Bootstrap inicial; preservar env, volumes e release anterior; backup antes de migrations | Menos I/O de bootstrap; rollback recuperável | Médio | Banco isolado e falhas de deploy | Código anterior; restaurar backup apenas manualmente | DONE |
| OPT-07 | P2 | Validação | VPS reinstalada sem aplicação | Confirmação do usuário | Medir instalação final; sem comparação artificial com host agregado | Baseline para futuras otimizações | Baixo | SSH somente leitura após instalar | Não aplicável | DONE |
| OPT-08 | P2 | RAM/I/O/banco | Cópias de upload e catálogo amplo | Consumidores não alteram buffers; matching usa id/nome/SKU/categoria | Reutilizar buffer original e selecionar somente campos utilizados | Menos alocações e transferência do banco | Baixo | Tipos, reconhecimento e matching reais no CI | Reverter seleção e cópias | DONE |

## Ordem de execução

Proteger contexto; criar imagens/cache e pipeline; preservar persistência/rollback; otimizar logs e manutenção; executar testes e builds; revisar diff; comparar somente métricas equivalentes.

## Limpezas recomendadas que exigem autorização

Não executar prune nem remover imagens, volumes, backups ou releases. Build cache agregado pertence também às aplicações vizinhas: UNKNOWN_USE. Uploads/banco/logs: PERSISTENT_DATA. Release anterior: REQUIRED_FOR_ROLLBACK. Não existe evidência de serviço removível nesta aplicação.

## Métricas para comparação

Builds na VPS antes: 3; depois: 0. Bootstrap automático antes: todo deploy; depois: apenas banco novo, com marcador para retry seguro. RAM/CPU/picos/latência/imagens reais: medir apenas com ambiente e carga equivalentes. Limites de logs são configuração, não ganho já medido. Não diminuir limites de RAM, threads OCR ou pool do banco com base em repouso ou sem carga representativa.

## Bloqueios reais

Nenhum bloqueio aberto. Instalação concluída pelo workflow na main, execução 37981142728, código 44199d4. Builds simultâneos, testes reais e deploy passaram; HTTPS dos dois domínios validado. Secret existente funcionou sem ler seu valor. Docker/WSL locais indisponíveis foram contornados usando o runner GitHub. Consumo final em repouso: 87,4–90,5 MiB somando API/frontend/PostgreSQL; detalhes e limites da comparação no relatório. Não houve alterações nas aplicações vizinhas. Picos, carga representativa e integrações externas de produção continuam NOT_MEASURED, sem reduzir limites por suposição.
