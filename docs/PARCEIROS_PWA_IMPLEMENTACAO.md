# Implementação incremental — Rebequi Parceiros

Plano aprovado pelo usuário em 11/10/2026: PARCEIROS_PWA_AUDITORIA_PLANO.md, etapas 0–7. Apps nativos, pagamentos bancários e testes pagos de IA permanecem fora desta autorização.

## Fundação e cadastro

`/parceiros/` reutiliza sessão CUSTOMER existente e oferece cadastro em três etapas: especialidades, atendimento, conferência/condições. Mesmo usuário pode atuar em várias especialidades e continua comprando como cliente. Links no rodapé e no painel do cliente; login/cadastro retornam ao espaço profissional. Módulo carregado por importação dinâmica.

PartnerProfile possui código aleatório único, versão para concorrência, especialidades, cidade/região, serviços e experiência. Aprovação/suspensão/rejeição apenas por ADMIN/MANAGER em painel → Parceiros. Revisão exige motivo; suspensão não é removida por edição do profissional. Cadastros rejeitados voltam à análise quando reenviados. Auditoria persistida na mesma transação, sem senhas ou dados de clientes. Mutações exigem origem autorizada; respostas privadas não são cacheadas. Programa financeiro permanece desativado, sem saldo fictício ou promessa de benefício.

Documentos em `/uploads/quotes/` passam a exigir sessão e propriedade do orçamento ou permissão quotes:manage. Proteção examina caminho decodificado/normalizado antes do static para impedir bypass por pasta codificada. Documentos mantêm no-store; fotos públicas de catálogo/promoções preservadas. Caminhos inválidos ou de outro cliente não revelam existência do arquivo.

Migração aditiva 20261011200000_partner_profiles; contas/dados históricos preservados. Validação local: 44 testes backend, TypeScript e lint dos componentes, textos UTF-8. Integração no GitHub acrescenta criação real, rejeição de campos privilegiados/origem ausente, concorrência, aprovação/suspensão/auditoria, wizard em 320/390/1440 e proteção da foto original via HTTP.

## Próximas entregas

Obras/ambientes e PWA instalável com cache seguro; fichas técnicas/motor de pintura e pisos; IA com cotas e proposta comercial; indicações/eventos/ledger; recompensas e relacionamento. A fundação não equivale à conclusão do plano. Câmera física, instalação/push Android/iOS e testes pagos dependem de validação específica posterior.
