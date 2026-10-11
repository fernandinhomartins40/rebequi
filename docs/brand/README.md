# Kit oficial Rebequi

As versões de produção preservam o desenho, o texto e as cores do arquivo original já presente no projeto, que corresponde à referência enviada. O fundo desse arquivo já era transparente. A logo completa só recebeu recorte das margens transparentes, redimensionamento proporcional e conversão sem perdas.

Arquivos finais: `apps/frontend/public/brand/`. São 24 arquivos, com dimensões e bytes registrados em `assets.json`:

- Original preservado e logo horizontal transparente em PNG e WebP sem perdas.
- Exportações de 350, 700 e 1400 px de largura para diferentes densidades de tela.
- Símbolo R extraído da original, sem redesenho, para ícones pequenos.
- Ícones de 16, 32, 48, 180, 192 e 512 px; favicon ICO com três resoluções.
- Apple touch icon e ícones maskable com margem de segurança e fundo branco.
- Logo aplicada sobre fundo branco e amarelo, preservando as cores.
- Imagem de compartilhamento em PNG, 1200 × 630, com a logo original centralizada.

O componente `BrandLogo` é compartilhado pela loja, autenticação, painéis e wizard. A versão branca deve ser usada como suporte visual em superfícies escuras, sem recolorir a marca. As exportações maiores ampliam o raster; não recuperam detalhes que não existem na referência. Não há SVG porque envolveria reconstruir curvas e letras, comprometendo a fidelidade solicitada.

A ferramenta integrada `image_gen` foi usada em modo de edição, com fundo transparente e a referência enviada como alvo. Prompt: “Produce a high resolution clean transparent PNG master of THIS EXACT horizontal logo, not a redesign. Remove ONLY the black background, preserve all original logo pixels, geometry, proportions, letterforms, spacing and colors as faithfully as possible. Purple/navy stylized R at left with diagonal bright red stroke and small construction/window lines, uppercase REBEQUI in the exact original heavy angular lettering, red stripe beneath lettering with exact white text 'MATERIAIS PARA CONSTRUÇÃO'. Preserve white slogan. No added elements, gradients, shadows, mockups, new typography or recoloring.”

O resultado em `rebequi-generated-comparison.png` é guardado apenas para comparação. A inspeção encontrou variação nos contornos e nas cores, portanto ele não substitui a marca original na aplicação.

Regeneração determinística: `node scripts/build-brand-assets.mjs` (usa Sharp já instalado no projeto). Nenhuma geração ou processamento acontece na VPS. O kit é servido como arquivos estáticos do frontend.
