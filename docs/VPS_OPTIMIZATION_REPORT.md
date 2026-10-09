# Relatório Final de Otimização

## Resumo

Análise e implementação em andamento. Este relatório será atualizado com os resultados efetivos do CI e da instalação. Nenhum ganho de produção declarado antecipadamente.

## Antes

VPS reinstalada, sem Rebequi (confirmado pelo usuário). O baseline agregado consta do plano; não existe consumo anterior da aplicação para comparação. Workflow anterior compilava 3 imagens sem cache na VPS e repetia bootstrap a cada deploy.

## Alterações realizadas

Um workflow com validação, builds backend/frontend independentes, integração e deploy GHCR por digest. Migrator dedicado sem toolchain/OCR; runtime só com Prisma client gerado; modelos OCR em camada de cache separada. Contexto exclui secrets/dados/artefatos. Rotação de logs; manutenção sem sobreposição; bootstrap inicial preserva alterações dos usuários e catálogo. Volumes externos e env preservados; backup pré-migration; releases mantidas e tentativa de rollback de imagens/vhost. Proxy mantém protocolo HTTPS e encaminha uploads antes da regra de arquivos estáticos.

## Serviços removidos

Nenhum. Três serviços residentes continuam necessários: PostgreSQL, API e frontend. Migrator apenas sob demanda. Serviços vizinhos não são modificados.

## Docker e imagens

Builds movidos ao GitHub e cache por imagem. Dependências PaddleOCR/Sharp e ferramenta de migrations mantidas. Node 22 LTS substitui Node 20 EOL nas imagens ativas e validação ([ciclo oficial](https://nodejs.org/en/about/previous-releases)). Tamanho final: NOT_MEASURED até conclusão dos builds.

## RAM e CPU

Compilação de novas releases na VPS eliminada por desenho do fluxo; não é uma porcentagem medida. Limites de RAM, threads OCR e pool preservados por ausência de carga/pico representativo. Guarda de manutenção evita duplicação do mesmo job no processo.

## Banco

PostgreSQL 16 e Prisma 6.19 preservados; nenhum dado removido nem SQL destrutivo adicionado. Bootstrap deixa de reescrever estoque/preços/senhas em updates. Testes de migrations e backup/restore incluídos em runner descartável.

## Storage e disco

Nenhuma limpeza de Docker, uploads, backups ou volumes. Logs têm retenção finita. Releases e backups de banco preservados, sem redução de capacidade de rollback por economia artificial.

## Build e deploy

Backend/frontend compilam simultaneamente; migrator reaproveita o backend compilado. Registry privado GHCR e credenciais temporárias. SSH do runner fixa a identidade do servidor. Deploy envia apenas infraestrutura e refs; sem source/npm/build na VPS. Cancelamento de deploy/migration desativado e lock remoto evita concorrência.

## Jobs e processos

OCR local sob demanda com fila existente; nenhuma adição de serviço residente. Job de manutenção de 15 minutos protegido contra sobreposição. Cache de integrações e matching de catálogo existentes mantidos. Não há Redis, broker nem worker dedicado declarado em produção.

## Depois

NOT_MEASURED: imagens, RAM/CPU da instalação e duração do deploy aguardam CI/instalação.

## Comparação

| Item | Antes (configuração) | Depois (implementação) |
|---|---|---|
| Compilações na VPS por release | 3 sem cache | 0 |
| Jobs de build | 1 remoto sequencial na VPS | 2 runners paralelos, backend compartilhado |
| Bootstrap | Todo deploy, sobrescreve catálogo e senhas | Inicial, preserva registros existentes |
| Logs Docker | Sem retenção declarada | 10 MiB × 3 por serviço |
| Logs Winston | Sem retenção | 10 MiB × 5 por arquivo |
| Rollback de aplicação | Ausente; release removida | Release anterior e rollback após falha |
| RAM/CPU/disco físico anterior da aplicação | NOT_MEASURED (reinstalação) | Não comparável |

## Testes

Local Windows/Node 22: 18 testes passaram; build shared, API e frontend passaram; textos pt-BR, tipos backend, actionlint, shellcheck, parsers Bash e invariantes do Compose/workflow passaram. Lint frontend teve um erro pré-existente de `prefer-const`, corrigido; warnings existentes serão registrados no resultado final. Docker local indisponível (WSL/daemon), portanto testes Linux de imagens precisam do runner GitHub; não usar a VPS compartilhada para builds de validação.

## Ações que exigem autorização

Excluir dados, backups, releases, imagens ou serviços compartilhados; restaurar banco/migrations incompatíveis; alterar firewall/kernel; contratar recursos adicionais. Nenhuma dessas ações foi executada.

## Bloqueios

Validação completa e instalação ainda em andamento. Secret existente `VPS_PASSWORD` listado no GitHub; validade após reinstalação não verificada. Não solicitar nem ler seu valor.

## Riscos restantes

Troca de API/web tem janela curta de indisponibilidade em updates; rollback de código depende de migrations compatíveis. Dumps locais não substituem backup externo. Retenção de dumps/releases precisa de política aprovada. Carga, integrações externas reais, limites/picos e queries com dataset de produção: NOT_MEASURED.

## Recomendações futuras

Depois da instalação, medir OCR sob carga, pool/conexões, queries e picos com dataset real antes de ajustar limites. Definir backup externo, recuperação da VPS e retenção aprovada sem eliminar a release anterior.
