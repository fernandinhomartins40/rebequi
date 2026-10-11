# Imagens locais e editor de uploads

As imagens enviadas ficam no volume Docker `rebequi-uploads`, montado em `/app/uploads` somente pela API Rebequi. Reiniciar ou substituir os contêineres não apaga esse volume. URLs são relativas ao próprio domínio, em `/uploads/`. Não há dependência de um provedor externo de armazenamento. Arquivos comerciais versionados têm cache longo; substituições recebem outro nome. Fotos de listas de orçamento usam `private, no-store`.

O editor compartilhado oferece recorte, compressão no navegador e conversão para WebP. Aceita JPG, PNG, WebP, GIF, BMP e AVIF que o navegador consiga decodificar. GIF é convertido em imagem estática. Arquivos que o navegador não consegue abrir recebem erro visível. A biblioteca de compressão e seu worker são servidos localmente, sem CDN.

| Uso | Saída | Limite no navegador |
| --- | --- | --- |
| Produto | 1200 × 1200, quadrada | 0,45 MB |
| Categoria | 800 × 800, quadrada | 0,25 MB |
| Promoção | 1600 × 900, 16:9 | 0,55 MB |
| Lista para orçamento e teste de IA | até 1800 px por lado, mantendo a proporção do recorte | 2 MB |

A foto de orçamento oferece recorte livre na prévia. O enquadramento inicial preserva toda a lista; a imagem só é enviada e analisada ao confirmar. Cadastro, sessão e propriedade do pedido continuam obrigatórios. Testes de IA continuam exigindo ação explícita do administrador.

O backend decodifica os bytes com Sharp, verifica formato e limite de pixels, remove metadados e reexporta WebP. Não confia na extensão, no MIME declarado ou nas dimensões enviadas pelo cliente. Redimensiona para o uso correto, preservando o objeto inteiro. Conversões são serializadas com no máximo três requisições em espera; cache e threads do Sharp são limitados. Saída comercial tem teto de 600 KB; documentos, 2 MB. SVG e arquivos falsos são rejeitados. A proteção de caminhos impede remover arquivos fora da raiz de uploads.

As fotos geradas de demonstração e os banners estão em `apps/backend/assets/demo-media`. `manifest.json` registra os produtos por SKU, campanhas por slug, dimensões e bytes. A imagem de API inclui esse pacote otimizado. Na inicialização, `installDemoMedia` copia os arquivos faltantes para o volume persistente e substitui apenas URLs antigas de Unsplash/placeholder dos registros correspondentes de demonstração. Reconfere a URL no UPDATE para preservar edições concorrentes. Não altera preços, estoque, pedidos, contas ou fotos enviadas pelo administrador. A instalação é idempotente; não executa o seed e não baixa arquivos externos na VPS.

Fotos são ilustrativas, geradas pela ferramenta integrada `image_gen` para a apresentação. Não são fotografias oficiais dos fabricantes. O conjunto de prompts usa fotografia de produto em estúdio, fundo branco, objeto inteiro, textura realista, sombra suave, sem marcas ou texto. Cada produto tem seu próprio pedido de geração usando o nome do catálogo. Banners usam composição horizontal, produtos reais à direita e espaço amarelo livre à esquerda para o texto do site. O arquivo `prompts.json` registra os prompts do conjunto.

Validação: testes de backend para decodificação, tamanhos reais, persistência WebP e caminhos; navegador para recorte de categoria, compressão, conversão, envio ao salvar, prévia da lista completa e ausência de chamada paga durante o recorte; integração em banco descartável para persistência após recriação dos contêineres e instalação idempotente. Deploy somente pelo GitHub Actions/GHCR.

Pacote final: 64 fotos de produtos, cinco conceitos de banner aplicados em sete campanhas e dez capas de categoria. Os 81 arquivos WebP somam 4.476.568 bytes; o maior tem 229.412 bytes. Os PNG originais ficam fora do repositório e não são enviados à VPS.
