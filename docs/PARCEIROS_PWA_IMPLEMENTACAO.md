# Implementação incremental — Rebequi Parceiros

Plano aprovado pelo usuário em 11/10/2026: PARCEIROS_PWA_AUDITORIA_PLANO.md, etapas 0–7. Apps nativos, pagamentos bancários e testes pagos de IA permanecem fora desta autorização.

## Fundação e cadastro

`/parceiros/` reutiliza sessão CUSTOMER existente e oferece cadastro em três etapas: especialidades, atendimento, conferência/condições. Mesmo usuário pode atuar em várias especialidades e continua comprando como cliente. Links no rodapé e no painel do cliente; login/cadastro retornam ao espaço profissional. Módulo carregado por importação dinâmica.

PartnerProfile possui código aleatório único, versão para concorrência, especialidades, cidade/região, serviços e experiência. Aprovação/suspensão/rejeição apenas por ADMIN/MANAGER em painel → Parceiros. Revisão exige motivo; suspensão não é removida por edição do profissional. Cadastros rejeitados voltam à análise quando reenviados. Auditoria persistida na mesma transação, sem senhas ou dados de clientes. Mutações exigem origem autorizada; respostas privadas não são cacheadas. Programa financeiro permanece desativado, sem saldo fictício ou promessa de benefício.

Documentos em `/uploads/quotes/` passam a exigir sessão e propriedade do orçamento ou permissão quotes:manage. Proteção examina caminho decodificado/normalizado antes do static para impedir bypass por pasta codificada. Documentos mantêm no-store; fotos públicas de catálogo/promoções preservadas. Caminhos inválidos ou de outro cliente não revelam existência do arquivo.

Migração aditiva 20261011200000_partner_profiles; contas/dados históricos preservados. Validação local: 44 testes backend, TypeScript e lint dos componentes, textos UTF-8. Integração no GitHub acrescenta criação real, rejeição de campos privilegiados/origem ausente, concorrência, aprovação/suspensão/auditoria, wizard em 320/390/1440 e proteção da foto original via HTTP.

## Próximas entregas

PWA preparado com manifesto próprio, worker Workbox restrito a `/parceiros/`, precache explícito do shell público (21 arquivos, aproximadamente 620 KB nesta revisão), proteção no-cache para worker/manifest e orçamento máximo de 2 MiB no build. APIs, documentos e imagens de clientes não são cacheados. Sem conexão, apresenta estado claro e não afirma que pedidos foram enviados. Orientação de instalação Android/iPhone e aplicação de atualização por ação explícita, desabilitada durante edição. Código das rotas passa a carregar sob demanda; entrada JS reduzida de 1,1 MB para 347 KB antes de gzip. Não há novo serviço residente na VPS.

Build, TypeScript e lint aprovados; navegador Chromium local confirmou shell offline real e ausência de API/uploads no cache. Transporte sintético usado apenas nessa inspeção local de interface; integração no GitHub consulta PostgreSQL/API reais e testa registro do worker, cache e reconexão. Validação física de instalação Android/iPhone e atualização entre releases permanece pendente. Offline nesta entrega permite abrir o shell; formulários/calculadora e rascunhos offline ainda estão nas etapas seguintes.

Obras/ambientes e PWA instalável com cache seguro; fichas técnicas/motor de pintura e pisos; IA com cotas e proposta comercial; indicações/eventos/ledger; recompensas e relacionamento. A fundação não equivale à conclusão do plano. Câmera física, instalação/push Android/iOS e testes pagos dependem de validação específica posterior.
