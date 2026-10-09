# Plano de Otimização da VPS

## Estado atual

Monorepo npm: React/Vite estático em Nginx, API Express/Node 20, Prisma 6 e PostgreSQL 16. OCR local PaddleOCR/Python e reconhecimento externo OpenRouter são funcionalidades reais. Não há Redis, broker nem worker separado na stack de produção. O OCR local já possui fila por instância; manutenção de orçamentos roda a cada 15 minutos. Uploads, banco e logs têm volumes nomeados. O único workflow ativo compila três imagens sem cache na VPS, executa migrations/bootstrap e recria API/web.

Branch `main`, commit inicial `6d187c5`. Preservar os protocolos e AGENTS.md não rastreados existentes. Deploy somente por GitHub Actions; não alterar aplicações vizinhas nem apagar dados, imagens ou backups.

## Baseline

MEASURED em 2026-10-09 15:07 America/Sao_Paulo, servidor `srv953800`, IP `72.60.10.108`, x86_64: RAM total 15.988 MiB, usada 4.955 MiB, disponível 10.260 MiB; swap usada 501 MiB/2.047 MiB; disco raiz 51 GiB/194 GiB (27%), inodes 4%; load 1,15/1,33/1,58. Docker: 88 imagens, 38,28 GB lógicos; 58 contêineres/55 ativos; volumes 3,628 GB; build cache 5,066 GB. Valores agregados da VPS compartilhada, não atribuíveis ao Rebequi.

Nenhum contêiner, imagem, volume `rebequi-*` ou `/opt/rebequi` encontrado. HTTPS do domínio falha por certificado incompatível. Consumo, dataset, conexões, backups, latência e picos da aplicação: NOT_MEASURED. Docker local inicialmente indisponível. Nenhum ganho de produção poderá ser declarado sem encontrar a instalação real.

## Desperdícios encontrados

- Build de backend/frontend/migrator na VPS com `--no-cache`, incluindo Python/OCR e compiladores.
- Contexto Docker não exclui secrets, uploads, logs, backups e artefatos locais.
- Runtime copia todo `@prisma` do builder, incluindo componentes da CLI desnecessários à API; Prisma é gerado duas vezes no builder.
- Migrator usa a imagem inteira de compilação; bootstrap de catálogo/usuários roda em todo deploy e sobrescreve configuração de credenciais com valores fixos.
- Logs Winston em arquivo e logs Docker sem limites; console duplicado no desenvolvimento.
- Deploy remove a release anterior e força remoção/recriação de contêineres antes da validação, sem rollback de aplicação.
- Alias Compose alternativo diverge da produção e contém valores padrão inseguros.

## Plano

| ID | PRIORIDADE | ÁREA | PROBLEMA | EVIDÊNCIA | SOLUÇÃO | GANHO ESPERADO | RISCO | TESTE | ROLLBACK | STATUS |
|---|---|---|---|---|---|---|---|---|---|---|
| OPT-01 | P1 | Build/deploy | Compilação na VPS | Workflow `build --no-cache` | Um workflow, jobs backend/frontend paralelos, GHCR, pull por digest, deploy sem build | Eliminar compilação e cache de build de novas releases na VPS | Médio | Builds, CI, sintaxe, smoke/rollback | Release anterior preservada | DOING |
| OPT-02 | P0 | Docker | Contexto permite dados/secrets | `.dockerignore` incompleto | Excluir persistência, credenciais e artefatos locais | Menos transferência/disco; proteger secrets | Baixo | Contexto e builds | Reverter arquivo | TODO |
| OPT-03 | P2 | Imagens | CLI e builder no runtime | Dockerfile backend | Migrator dedicado sem compiladores; API só client gerado; cache OCR por requisitos | Menor imagem/runtime; menos build repetido | Médio | Imports, build e migrations em banco isolado | Imagens anteriores | TODO |
| OPT-04 | P2 | Logs | Crescimento sem limite | Winston File e Compose | Rotação limitada mantendo console, erros e volumes | Limitar crescimento futuro | Baixo | Testes/build e configuração | Config anterior | TODO |
| OPT-05 | P2 | Jobs | Manutenção pode sobrepor | `setInterval` sem guarda | Impedir manutenção simultânea no mesmo processo | Evitar queries duplicadas em execução longa | Baixo | Teste de concorrência/typecheck | Reverter guarda | TODO |
| OPT-06 | P0 | Persistência/deploy | Bootstrap/remoção agressivos | Workflow e Compose | Bootstrap opt-in; preservar env, volumes e release anterior; backup antes de migrations | Menos I/O de bootstrap; rollback recuperável | Médio | Banco isolado e falhas de deploy | Código anterior; restaurar backup apenas manualmente | TODO |
| OPT-07 | P2 | Validação | Sem baseline da aplicação | VPS sem Rebequi | Encontrar destino real, medir antes/depois se possível | Ganho comprovável | Baixo | SSH somente leitura | Não aplicável | BLOCKED |

## Ordem de execução

Proteger contexto; criar imagens/cache e pipeline; preservar persistência/rollback; otimizar logs e manutenção; executar testes e builds; revisar diff; comparar somente métricas equivalentes.

## Limpezas recomendadas que exigem autorização

Não executar prune nem remover imagens, volumes, backups ou releases. Build cache agregado pertence também às aplicações vizinhas: UNKNOWN_USE. Uploads/banco/logs: PERSISTENT_DATA. Release anterior: REQUIRED_FOR_ROLLBACK. Não existe evidência de serviço removível nesta aplicação.

## Métricas para comparação

Builds na VPS antes: 3; depois planejado: 0. Bootstrap automático antes: todo deploy; depois: opt-in. RAM/CPU/picos/latência/imagens reais: medir apenas com ambiente e carga equivalentes. Limites de logs são configuração, não ganho já medido. Não diminuir limites de RAM, threads OCR ou pool do banco com base em repouso ou sem carga representativa.

## Bloqueios reais

Destino do workflow não contém a aplicação. Publicação/execução do workflow e acesso GHCR ainda não verificados. Não alterar Nginx/TLS compartilhados para instalar aplicação sem confirmar o destino. Validação local de Docker depende de inicializar o daemon.
