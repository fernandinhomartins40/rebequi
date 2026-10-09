# Relatório Final de Otimização

## Resumo

Otimizações implementadas e instalação concluída exclusivamente pelo GitHub Actions em `72.60.10.108`. Um workflow, builds backend/frontend simultâneos no GitHub, imagens GHCR por digest e zero builds na VPS. Código de produção: `44199d4a666d23e41f6f106c78f8144d0feb9e96`. [Execução completa aprovada](https://github.com/fernandinhomartins40/rebequi/actions/runs/37981142728). RAM observada dos três serviços: 87,4–90,5 MiB em repouso; não é medição de pico nem redução percentual.

## Antes

VPS reinstalada, sem Rebequi (confirmado pelo usuário). O baseline agregado consta do plano; não existe consumo anterior da aplicação para comparação. Workflow anterior compilava 3 imagens sem cache na VPS e repetia bootstrap a cada deploy.

## Alterações realizadas

Um workflow com validação, builds backend/frontend independentes, integração e deploy GHCR por digest. Migrator dedicado sem toolchain/OCR; runtime só com Prisma client gerado; modelos OCR em camada de cache separada. Contexto exclui secrets/dados/artefatos. Rotação de logs; manutenção sem sobreposição; bootstrap inicial preserva alterações dos usuários e catálogo. Volumes externos e env preservados; backup pré-migration; releases mantidas e tentativa de rollback de imagens/vhost. Proxy mantém protocolo HTTPS e encaminha uploads antes da regra de arquivos estáticos. Removidas três cópias redundantes de buffers de upload e campos não usados da consulta de matching do catálogo.

## Serviços removidos

Nenhum. Três serviços residentes continuam necessários: PostgreSQL, API e frontend. Migrator apenas sob demanda. Serviços vizinhos não são modificados.

## Docker e imagens

Builds movidos ao GitHub e cache por imagem. Dependências PaddleOCR/Sharp e ferramenta de migrations mantidas. Node 22 LTS substitui Node 20 EOL nas imagens ativas e validação ([ciclo oficial](https://nodejs.org/en/about/previous-releases)). Tamanhos lógicos MEASURED por `docker image inspect`: API 3.365.113.295 bytes; migrator 797.947.959 bytes; frontend 109.881.601 bytes; PostgreSQL 419.072.015 bytes. A API mantém dependências/modelos OCR. Camadas são compartilhadas: somar esses tamanhos não mede disco físico nem espaço recuperável. Não existem imagens anteriores da aplicação para comparar.

## RAM e CPU

Compilação de novas releases na VPS eliminada por desenho do fluxo; não é uma porcentagem medida. Limites de RAM, threads OCR e pool preservados por ausência de carga/pico representativo. Guarda de manutenção evita duplicação do mesmo job no processo. Uploads reutilizam o buffer original, sem três alocações redundantes. Não se declara redução percentual de RAM sem execução anterior equivalente.

## Banco

PostgreSQL 16 e Prisma 6.19 preservados; nenhum dado removido nem SQL destrutivo adicionado. Bootstrap deixa de reescrever estoque/preços/senhas em updates. A consulta de catálogo para matching seleciona apenas ID, nome, SKU e nome da categoria; evita transferir imagens, descrições, preços e estoque sem uso nesse fluxo. Testes de migrations e backup/restore executam PostgreSQL real em runner descartável.

## Storage e disco

Nenhuma limpeza de Docker, uploads, backups ou volumes. Logs têm retenção finita. Releases e backups de banco preservados, sem redução de capacidade de rollback por economia artificial.

## Build e deploy

Backend/frontend compilam simultaneamente; migrator reaproveita o backend compilado. Registry privado GHCR e credenciais temporárias. SSH do runner fixa a identidade do servidor. Deploy envia apenas infraestrutura e refs; sem source/npm/build na VPS. Cancelamento de deploy/migration desativado e lock remoto evita concorrência.

## Jobs e processos

OCR local sob demanda com fila existente; nenhuma adição de serviço residente. Job de manutenção de 15 minutos protegido contra sobreposição. Cache de integrações e matching de catálogo existentes mantidos. Não há Redis, broker nem worker dedicado declarado em produção.

## Depois

MEASURED em 2026-10-09, 16:40:04 e 16:41:27 America/Sao_Paulo, via SSH somente com inspeções e consultas da aplicação:

| Serviço | RAM inicial | RAM após teste de login | CPU nas duas amostras | Reinícios / OOM |
|---|---|---|---|---|
| API | 39,09 MiB | 42,04 MiB | 0,00% | 0 / nenhum |
| Frontend | 4,914 MiB | 4,914 MiB | 0,00% | 0 / nenhum |
| PostgreSQL | 43,44 MiB | 43,59 MiB | 0,00% | 0 / nenhum |
| Total dos serviços | 87,444 MiB | 90,544 MiB | Amostras em repouso | Todos healthy |

Somente frontend publicado em `127.0.0.1:3190`; API e PostgreSQL sem portas expostas no host. Migrator não permanece em execução. Digests de produção conferidos: API `sha256:6f1d69bfd369410a6574e72041eaec6cc19ad169e69a0ccbe029f66e679889ed`; frontend `sha256:b2fdfaafa8b44879ea44e82c9416228abad99910b3e237f32cc8e46e36938d28`; migrator `sha256:3e6dbc1b250d4239b0f15edc165c2d774101a8f0e03a89d9f9d404e5aacaeb20`. `current` aponta para a release validada, e `.env.production` permanece modo `600`.

Banco lógico: 9.935.895 bytes, 2 usuários iniciais e 64 produtos; 3 conexões observadas, zero deadlocks e zero bytes temporários acumulados nesse banco novo. Volumes: banco aproximadamente 49 MiB, uploads 4 KiB, logs 8 KiB. Backups 96 KiB; releases 76 KiB. Os dois dumps pré-deploy têm catálogo validado; o primeiro corresponde ao banco ainda vazio, e o segundo já contém a instalação inicial.

HTTPS real validado nos dois domínios, certificado válido até 2027-01-07, sem ignorar TLS. Medições pontuais originadas da própria VPS: health API HTTP 200 em 32 ms e frontend HTTP 200 em 38 ms; não representam latência de usuários externos nem teste de carga. Login, perfil ADMIN e logout passaram; cookie com `Secure` e `HttpOnly`, sem imprimir senhas.

VPS agregada após instalar: RAM usada 5.375 MiB, disponível 9.738 MiB, swap usada 564 MiB; raiz 58 GiB usados/194 GiB (30%). Esses números incluem todas as aplicações e suas atividades durante o trabalho; não são consumo exclusivo ou ganho atribuível ao Rebequi.

Workflow final MEASURED: builds começaram simultaneamente às 16:34:29; backend/migrator 80 s, frontend 32 s, validação 39 s, integração 184 s e deploy 54 s. Total dos jobs, com etapas sobrepostas e transições: 5 min 23 s. Builds usam cache; não há baseline equivalente de duração do fluxo anterior.

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

Local Windows/Node 22: 18 testes passaram; build shared, API e frontend passaram; textos pt-BR, tipos backend, actionlint, shellcheck, parsers Bash e invariantes do Compose/workflow passaram. Lint frontend teve um erro pré-existente de `prefer-const`, corrigido; permanecem 15 warnings de hooks/fast-refresh. Docker local indisponível (WSL/daemon): builds e testes Linux reais foram transferidos ao GitHub, sem compilar na VPS compartilhada.

O teste de reconhecimento real detectou logs PaddleOCR misturados ao JSON do bridge. A correção mantém somente JSON em stdout e redireciona logs para stderr. O teste HTTP de rascunho anônimo detectou acesso a usuário nulo; a resposta agora preserva `user: null` até o cadastro. A conclusão do OCR passa a ser publicada depois da gravação dos itens, evitando encerrar o polling com dados incompletos. Nenhum desses testes foi contornado para liberar deploy. O teste de rollback usa imagens, banco, migrations e ferramentas reais; rejeita um manifesto com versão incompatível e verifica recuperação de autenticação/uploads sem reverter dados.

Na instalação real, banco/API/web ficaram saudáveis e o certificado dos dois domínios foi emitido. Uma verificação imediata após o reload recebeu o certificado anterior: adicionadas tentativas limitadas para a transição dos workers, mantendo a verificação TLS obrigatória e sem `-k`. O timer do Certbot e seu hook executável de reload do Nginx já existem na VPS e foram preservados.

## Ações que exigem autorização

Excluir dados, backups, releases, imagens ou serviços compartilhados; restaurar banco/migrations incompatíveis; alterar firewall/kernel; contratar recursos adicionais. Nenhuma dessas ações foi executada.

## Bloqueios

Nenhum bloqueio aberto para as otimizações implementadas ou para instalar. Secret existente `VPS_PASSWORD` funcionou no workflow após a reinstalação; seu valor não foi lido, solicitado nem armazenado localmente. Docker local permaneceu indisponível, resolvido por builds e testes reais no GitHub.

## Riscos restantes

Troca de API/web tem janela curta de indisponibilidade em updates; rollback de código depende de migrations compatíveis. Dumps locais não substituem backup externo. Retenção de dumps/releases precisa de política aprovada. Carga, integrações externas reais, limites/picos e queries com dataset de produção: NOT_MEASURED.

## Recomendações futuras

Depois da instalação, medir OCR sob carga, pool/conexões, queries e picos com dataset real antes de ajustar limites. Definir backup externo, recuperação da VPS e retenção aprovada sem eliminar a release anterior.
