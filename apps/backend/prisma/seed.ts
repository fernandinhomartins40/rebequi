import {
  LeadStatus,
  OrderStatus,
  Prisma,
  PrismaClient,
  PromotionKind,
  PromotionOfferPricingMode,
  PromotionTheme,
  QuoteStatus,
  UserRole,
} from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

type CategorySeed = {
  name: string;
  slug: string;
  icon: string;
  description: string;
};

type ProductSeed = {
  name: string;
  slug: string;
  sku: string;
  price: number;
  originalPrice?: number;
  shortDesc: string;
  description: string;
  isOffer?: boolean;
  isNew?: boolean;
  isFeatured?: boolean;
  discount?: number;
  stock: number;
  minStock: number;
  weight?: number;
  dimensions?: string;
  categorySlug: string;
  imageQuery: string;
};

type PromotionSeed = {
  name: string;
  slug: string;
  kind: PromotionKind;
  eyebrow: string;
  title: string;
  subtitle: string;
  description: string;
  badgeText: string;
  ctaLabel: string;
  disclaimer: string;
  themeTone: PromotionTheme;
  sortOrder: number;
  startsAt: Date;
  expiresAt: Date;
  offerPricingMode?: PromotionOfferPricingMode;
  offerPromotionalPrice?: number;
  offerDiscountPercentage?: number;
  offerMinimumQuantity?: number;
  offerPayQuantity?: number;
  productSlugs: string[];
  imageQuery: string;
};

const password = 'Teste@123';
const hashedPassword = await bcrypt.hash(password, 10);

const categories: CategorySeed[] = [
  {
    name: 'Ferramentas',
    slug: 'ferramentas',
    icon: 'Wrench',
    description: 'Ferramentas manuais, elétricas e acessórios para obra e manutenção.',
  },
  {
    name: 'Tintas e Acessórios',
    slug: 'tintas-acessorios',
    icon: 'Paintbrush',
    description: 'Tintas, massas, rolos, pincéis e itens para acabamento.',
  },
  {
    name: 'Cimento e Argamassa',
    slug: 'cimento-argamassa',
    icon: 'Package',
    description: 'Cimento, argamassas, rejuntes e insumos para alvenaria.',
  },
  {
    name: 'Materiais Elétricos',
    slug: 'materiais-eletricos',
    icon: 'Zap',
    description: 'Cabos, tomadas, disjuntores e componentes para instalação elétrica.',
  },
  {
    name: 'Hidráulica',
    slug: 'hidraulica',
    icon: 'Droplet',
    description: 'Tubos, conexões, registros e soluções para água e esgoto.',
  },
  {
    name: 'Pisos e Revestimentos',
    slug: 'pisos-revestimentos',
    icon: 'Grid',
    description: 'Cerâmicas, porcelanatos, pisos vinílicos e revestimentos.',
  },
  {
    name: 'Madeiras e Chapas',
    slug: 'madeiras-chapas',
    icon: 'PanelsTopLeft',
    description: 'Compensados, MDF, sarrafos e tábuas para construção e marcenaria.',
  },
  {
    name: 'Jardim e Área Externa',
    slug: 'jardim-area-externa',
    icon: 'Leaf',
    description: 'Itens para jardinagem, irrigação, limpeza e áreas externas.',
  },
  {
    name: 'Segurança e EPIs',
    slug: 'seguranca-epis',
    icon: 'ShieldCheck',
    description: 'Luvas, óculos, capacetes, botas e proteção para obra.',
  },
  {
    name: 'Portas, Janelas e Ferragens',
    slug: 'portas-janelas-ferragens',
    icon: 'DoorOpen',
    description: 'Fechaduras, dobradiças, portas, janelas e ferragens em geral.',
  },
];

const products: ProductSeed[] = [
  product('Furadeira de Impacto 650W', 'ferramentas', 299.9, 18, 'FER-FUR-001', {
    originalPrice: 369.9,
    isOffer: true,
    isFeatured: true,
    discount: 19,
    weight: 2.4,
    dimensions: '30x25x10 cm',
  }),
  product('Parafusadeira 12V com 2 Baterias', 'ferramentas', 249.9, 22, 'FER-PAR-002', {
    originalPrice: 319.9,
    isOffer: true,
    isNew: true,
    discount: 22,
    weight: 1.8,
  }),
  product('Serra Mármore 1300W', 'ferramentas', 329.9, 12, 'FER-SER-003', {
    isFeatured: true,
    weight: 3.1,
  }),
  product('Jogo de Chaves 12 Peças', 'ferramentas', 79.9, 35, 'FER-CHA-004', { isNew: true }),
  product('Trena Emborrachada 5m', 'ferramentas', 24.9, 80, 'FER-TRE-005'),
  product('Martelo Unha 27mm Cabo Fibra', 'ferramentas', 42.9, 46, 'FER-MAR-006'),

  product('Tinta Acrílica Branca Fosca 18L', 'tintas-acessorios', 189.9, 54, 'TIN-ACR-001', {
    originalPrice: 229.9,
    isOffer: true,
    isFeatured: true,
    discount: 17,
    weight: 20.5,
  }),
  product('Tinta Acrílica Gelo Fosca 18L', 'tintas-acessorios', 199.9, 38, 'TIN-ACR-002', {
    isFeatured: true,
    weight: 20.5,
  }),
  product('Esmalte Sintético Branco 3,6L', 'tintas-acessorios', 89.9, 30, 'TIN-ESM-003', {
    weight: 4.2,
  }),
  product('Massa Corrida PVA 25kg', 'tintas-acessorios', 64.9, 44, 'TIN-MAS-004', {
    originalPrice: 79.9,
    isOffer: true,
    discount: 19,
    weight: 25,
  }),
  product('Kit Pintura com Rolo, Pincel e Bandeja', 'tintas-acessorios', 69.9, 28, 'TIN-KIT-005', {
    isNew: true,
  }),
  product('Selador Acrílico 18L', 'tintas-acessorios', 149.9, 26, 'TIN-SEL-006', { weight: 20 }),

  product('Cimento Portland CP II 50kg', 'cimento-argamassa', 34.9, 260, 'CIM-CIM-001', {
    isFeatured: true,
    weight: 50,
  }),
  product('Argamassa Colante AC II 20kg', 'cimento-argamassa', 24.9, 180, 'CIM-ARG-002', {
    originalPrice: 29.9,
    isOffer: true,
    discount: 17,
    weight: 20,
  }),
  product('Argamassa Porcelanato AC III 20kg', 'cimento-argamassa', 39.9, 120, 'CIM-ARG-003', {
    isFeatured: true,
    weight: 20,
  }),
  product('Rejunte Flexível Cinza 1kg', 'cimento-argamassa', 12.9, 95, 'CIM-REJ-004'),
  product('Cal Hidratada 20kg', 'cimento-argamassa', 19.9, 85, 'CIM-CAL-005', { weight: 20 }),
  product('Areia Média Ensacada 20kg', 'cimento-argamassa', 13.9, 150, 'CIM-ARE-006', { weight: 20 }),

  product('Cabo Flexível 2,5mm 100m Azul', 'materiais-eletricos', 159.9, 42, 'ELE-CAB-001', {
    slug: 'cabo-flexivel-25mm-100m-azul',
    isNew: true,
    weight: 8.5,
  }),
  product('Cabo Flexível 4mm 100m Vermelho', 'materiais-eletricos', 249.9, 28, 'ELE-CAB-002', {
    weight: 13,
  }),
  product('Disjuntor Monopolar 32A Curva C', 'materiais-eletricos', 18.9, 90, 'ELE-DIS-003'),
  product('Tomada 2P+T 10A Branca', 'materiais-eletricos', 9.9, 180, 'ELE-TOM-004', {
    slug: 'tomada-2pt-10a-branca',
  }),
  product('Interruptor Simples Branco', 'materiais-eletricos', 8.9, 160, 'ELE-INT-005'),
  product('Quadro de Distribuição 12 Disjuntores', 'materiais-eletricos', 89.9, 24, 'ELE-QUA-006', {
    isFeatured: true,
  }),

  product('Tubo PVC Soldável 25mm 6m', 'hidraulica', 21.9, 110, 'HID-TUB-001'),
  product('Joelho PVC 90 Graus 25mm', 'hidraulica', 2.9, 300, 'HID-JOE-002'),
  product('Registro de Esfera 3/4', 'hidraulica', 19.9, 86, 'HID-REG-003'),
  product('Caixa Sifonada 150mm', 'hidraulica', 28.9, 52, 'HID-CAI-004'),
  product('Torneira Cozinha Parede Cromada', 'hidraulica', 79.9, 34, 'HID-TOR-005', {
    isNew: true,
    isFeatured: true,
  }),
  product('Veda Rosca 18mm x 50m', 'hidraulica', 6.9, 220, 'HID-VED-006'),

  product('Porcelanato Acetinado 84x84 Caixa 2,8m²', 'pisos-revestimentos', 139.9, 62, 'PIS-POR-001', {
    isFeatured: true,
    weight: 42,
  }),
  product('Piso Cerâmico Bege 60x60 Caixa 2,2m²', 'pisos-revestimentos', 69.9, 80, 'PIS-CER-002', {
    originalPrice: 84.9,
    isOffer: true,
    discount: 18,
    weight: 34,
  }),
  product('Revestimento Branco 30x60 Caixa 2m²', 'pisos-revestimentos', 54.9, 72, 'PIS-REV-003', {
    weight: 28,
  }),
  product('Piso Vinílico Carvalho m²', 'pisos-revestimentos', 89.9, 95, 'PIS-VIN-004', {
    isNew: true,
  }),
  product('Rodapé Poliestireno Branco 7cm', 'pisos-revestimentos', 34.9, 65, 'PIS-ROD-005'),
  product('Espaçador Nivelador 1,5mm Pacote 100un', 'pisos-revestimentos', 22.9, 130, 'PIS-ESP-006'),

  product('Chapa MDF Cru 15mm 275x185cm', 'madeiras-chapas', 219.9, 18, 'MAD-MDF-001', {
    isFeatured: true,
    weight: 44,
    dimensions: '275x185x1,5 cm',
  }),
  product('Compensado Naval 10mm 220x160cm', 'madeiras-chapas', 189.9, 14, 'MAD-COM-002', {
    weight: 31,
  }),
  product('Sarrafo Pinus 5x5cm 3m', 'madeiras-chapas', 24.9, 95, 'MAD-SAR-003'),
  product('Tábua Pinus Aparelhada 30cm 3m', 'madeiras-chapas', 64.9, 42, 'MAD-TAB-004'),
  product('Ripa de Eucalipto 2,5x5cm 3m', 'madeiras-chapas', 12.9, 120, 'MAD-RIP-005'),
  product('Cola Madeira 500g', 'madeiras-chapas', 18.9, 60, 'MAD-COL-006'),

  product('Mangueira Jardim 1/2 20m', 'jardim-area-externa', 79.9, 48, 'JAR-MAN-001', {
    isNew: true,
  }),
  product('Ducha Jardim Multijato', 'jardim-area-externa', 34.9, 55, 'JAR-DUC-002'),
  product('Pulverizador Manual 5L', 'jardim-area-externa', 59.9, 32, 'JAR-PUL-003'),
  product('Vassoura Metálica Regulável', 'jardim-area-externa', 29.9, 44, 'JAR-VAS-004'),
  product('Refletor LED 50W IP65', 'jardim-area-externa', 49.9, 70, 'JAR-REF-005', {
    isOffer: true,
    originalPrice: 64.9,
    discount: 23,
  }),
  product('Tinta Emborrachada Telhado 18L', 'jardim-area-externa', 249.9, 20, 'JAR-TIN-006', {
    weight: 20.2,
  }),

  product('Luva de Segurança Nitrílica', 'seguranca-epis', 14.9, 200, 'EPI-LUV-001'),
  product('Óculos de Proteção Incolor', 'seguranca-epis', 12.9, 180, 'EPI-OCU-002'),
  product('Capacete de Segurança Amarelo', 'seguranca-epis', 29.9, 96, 'EPI-CAP-003'),
  product('Protetor Auricular Plug Silicone', 'seguranca-epis', 4.9, 260, 'EPI-PRO-004'),
  product('Bota de Segurança Couro Bidensidade', 'seguranca-epis', 119.9, 40, 'EPI-BOT-005', {
    isFeatured: true,
  }),
  product('Máscara PFF2 Sem Válvula', 'seguranca-epis', 6.9, 300, 'EPI-MAS-006'),

  product('Fechadura Externa Cromada', 'portas-janelas-ferragens', 89.9, 36, 'FER-FEC-001', {
    isFeatured: true,
  }),
  product('Dobradiça 3 Pol Aço Cromado Par', 'portas-janelas-ferragens', 18.9, 120, 'FER-DOB-002'),
  product('Porta Lisa Semioca 210x80cm', 'portas-janelas-ferragens', 249.9, 18, 'FER-POR-003', {
    weight: 24,
    dimensions: '210x80x3,5 cm',
  }),
  product('Janela Veneziana Alumínio 100x120cm', 'portas-janelas-ferragens', 449.9, 10, 'FER-JAN-004', {
    isNew: true,
    weight: 16,
  }),
  product('Puxador Barra Inox 40cm', 'portas-janelas-ferragens', 54.9, 45, 'FER-PUX-005'),
  product('Cadeado Latão 35mm', 'portas-janelas-ferragens', 24.9, 88, 'FER-CAD-006'),
];

const staffUsers = [
  user('admin@rebequi.com.br', 'Administrador Rebequi', UserRole.ADMIN, '11980000001'),
  user('gerente@rebequi.com.br', 'Mariana Costa', UserRole.MANAGER, '11980000002'),
  user('catalogo@rebequi.com.br', 'Rafael Andrade', UserRole.CATALOG_MANAGER, '11980000003'),
  user('marketing@rebequi.com.br', 'Camila Rocha', UserRole.MARKETING, '11980000004'),
  user('vendas@rebequi.com.br', 'Bruno Almeida', UserRole.SALES, '11980000005'),
];

const customerUsers = [
  user('ana.souza@example.com', 'Ana Souza', UserRole.CUSTOMER, '11991000001'),
  user('joao.silva@example.com', 'João Silva', UserRole.CUSTOMER, '11991000002'),
  user('patricia.lima@example.com', 'Patrícia Lima', UserRole.CUSTOMER, '11991000003'),
  user('marcos.oliveira@example.com', 'Marcos Oliveira', UserRole.CUSTOMER, '11991000004'),
  user('construtora.alfa@example.com', 'Construtora Alfa', UserRole.CUSTOMER, '11991000005'),
  user('renata.pires@example.com', 'Renata Pires', UserRole.CUSTOMER, '11991000006'),
  user('carlos.mendes@example.com', 'Carlos Mendes', UserRole.CUSTOMER, '11991000007'),
  user('fernanda.ramos@example.com', 'Fernanda Ramos', UserRole.CUSTOMER, '11991000008'),
];

const promotions: PromotionSeed[] = [
  {
    name: 'Semana da Pintura',
    slug: 'semana-da-pintura',
    kind: PromotionKind.COLLECTION,
    eyebrow: 'Acabamento',
    title: 'Tudo para renovar paredes com melhor rendimento',
    subtitle: 'Tintas, massas e kits de aplicação com condições especiais.',
    description: 'Campanha pensada para clientes que estão na etapa de acabamento e precisam comprar vários itens juntos.',
    badgeText: 'Até 23% OFF',
    ctaLabel: 'Ver ofertas',
    disclaimer: 'Preços válidos enquanto durarem os estoques.',
    themeTone: PromotionTheme.GOLD,
    sortOrder: 1,
    startsAt: daysFromNow(-3),
    expiresAt: daysFromNow(12),
    offerPricingMode: PromotionOfferPricingMode.PERCENTAGE_DISCOUNT,
    offerDiscountPercentage: 12,
    productSlugs: [
      'tinta-acrilica-branca-fosca-18l',
      'tinta-acrilica-gelo-fosca-18l',
      'massa-corrida-pva-25kg',
      'kit-pintura-com-rolo-pincel-e-bandeja',
      'selador-acrilico-18l',
    ],
    imageQuery: 'paint-buckets-renovation',
  },
  {
    name: 'Combo Elétrica Essencial',
    slug: 'combo-eletrica-essencial',
    kind: PromotionKind.COLLECTION,
    eyebrow: 'Instalação',
    title: 'Materiais elétricos para fechar a obra',
    subtitle: 'Cabos, tomadas, disjuntores e quadros em uma seleção técnica.',
    description: 'Itens recorrentes em reformas residenciais e pequenas obras comerciais.',
    badgeText: 'Combo técnico',
    ctaLabel: 'Montar pedido',
    disclaimer: 'Consulte compatibilidade com o padrão da instalação.',
    themeTone: PromotionTheme.BLUE,
    sortOrder: 2,
    startsAt: daysFromNow(-1),
    expiresAt: daysFromNow(18),
    offerPricingMode: PromotionOfferPricingMode.BULK_PERCENTAGE,
    offerDiscountPercentage: 8,
    offerMinimumQuantity: 4,
    productSlugs: [
      'cabo-flexivel-25mm-100m-azul',
      'cabo-flexivel-4mm-100m-vermelho',
      'disjuntor-monopolar-32a-curva-c',
      'tomada-2pt-10a-branca',
      'quadro-de-distribuicao-12-disjuntores',
    ],
    imageQuery: 'electrical-installation-tools',
  },
  {
    name: 'Base da Obra',
    slug: 'base-da-obra',
    kind: PromotionKind.COLLECTION,
    eyebrow: 'Obra pesada',
    title: 'Cimento, argamassa e areia para começar bem',
    subtitle: 'Estoque reforçado para pedidos de maior volume.',
    description: 'Produtos de giro rápido para fundação, alvenaria, assentamento e regularização.',
    badgeText: 'Preço de volume',
    ctaLabel: 'Conferir materiais',
    disclaimer: 'Frete e descarga dependem da região e do volume.',
    themeTone: PromotionTheme.SLATE,
    sortOrder: 3,
    startsAt: daysFromNow(-5),
    expiresAt: daysFromNow(20),
    offerPricingMode: PromotionOfferPricingMode.BULK_PERCENTAGE,
    offerDiscountPercentage: 6,
    offerMinimumQuantity: 10,
    productSlugs: [
      'cimento-portland-cp-ii-50kg',
      'argamassa-colante-ac-ii-20kg',
      'argamassa-porcelanato-ac-iii-20kg',
      'cal-hidratada-20kg',
      'areia-media-ensacada-20kg',
    ],
    imageQuery: 'construction-cement-bags',
  },
  {
    name: 'Oferta Furadeira de Impacto',
    slug: 'oferta-furadeira-de-impacto',
    kind: PromotionKind.SINGLE_PRODUCT,
    eyebrow: 'Ferramenta',
    title: 'Furadeira de impacto com desconto por tempo limitado',
    subtitle: 'Equipamento versátil para concreto, madeira e metal.',
    description: 'Oferta individual para destacar um item de alta procura em reforma e manutenção.',
    badgeText: 'Oferta relâmpago',
    ctaLabel: 'Aproveitar',
    disclaimer: 'Limite de 2 unidades por pedido promocional.',
    themeTone: PromotionTheme.RED,
    sortOrder: 4,
    startsAt: daysFromNow(-1),
    expiresAt: daysFromNow(6),
    offerPricingMode: PromotionOfferPricingMode.FIXED_PRICE,
    offerPromotionalPrice: 279.9,
    productSlugs: ['furadeira-de-impacto-650w'],
    imageQuery: 'impact-drill-tool',
  },
  {
    name: 'Leve 3 Pague 2 em EPIs Selecionados',
    slug: 'leve-3-pague-2-epis-selecionados',
    kind: PromotionKind.COLLECTION,
    eyebrow: 'Segurança',
    title: 'Proteção para equipe com condição especial',
    subtitle: 'Itens de uso diário para obra, estoque e manutenção.',
    description: 'Promoção para incentivar reposição de EPIs básicos em compras recorrentes.',
    badgeText: 'Leve 3 pague 2',
    ctaLabel: 'Ver EPIs',
    disclaimer: 'A condição é aplicada em itens participantes de mesmo valor ou menor.',
    themeTone: PromotionTheme.GREEN,
    sortOrder: 5,
    startsAt: daysFromNow(-2),
    expiresAt: daysFromNow(14),
    offerPricingMode: PromotionOfferPricingMode.BUY_X_PAY_Y,
    offerMinimumQuantity: 3,
    offerPayQuantity: 2,
    productSlugs: [
      'luva-de-seguranca-nitrilica',
      'oculos-de-protecao-incolor',
      'capacete-de-seguranca-amarelo',
      'mascara-pff2-sem-valvula',
    ],
    imageQuery: 'construction-safety-equipment',
  },
];

function user(email: string, name: string, role: UserRole, whatsapp: string) {
  return { email, name, role, whatsapp };
}

function product(
  name: string,
  categorySlug: string,
  price: number,
  stock: number,
  sku: string,
  overrides: Partial<ProductSeed> = {},
): ProductSeed {
  const slug = overrides.slug ?? slugify(name);
  const categoryLabel = categorySlug.replace(/-/g, ' ');

  return {
    name,
    slug,
    sku,
    price,
    shortDesc: overrides.shortDesc ?? `${name} para uso em obra, reforma e manutenção.`,
    description:
      overrides.description ??
      `${name} com bom desempenho para clientes residenciais, profissionais autônomos e pequenas construtoras. Produto da linha ${categoryLabel}, indicado para compras avulsas e reposição de estoque.`,
    isOffer: overrides.isOffer ?? false,
    isNew: overrides.isNew ?? false,
    isFeatured: overrides.isFeatured ?? false,
    discount: overrides.discount,
    originalPrice: overrides.originalPrice,
    stock,
    minStock: overrides.minStock ?? Math.max(5, Math.floor(stock * 0.18)),
    weight: overrides.weight,
    dimensions: overrides.dimensions,
    categorySlug,
    imageQuery: overrides.imageQuery ?? slug,
  };
}

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\+/g, 'p')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function imageUrl(query: string, width = 900) {
  return `https://source.unsplash.com/${width}x${Math.round(width * 0.75)}/?${encodeURIComponent(query)}`;
}

function daysFromNow(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

function reference(prefix: string, index: number) {
  return `${prefix}-${String(index).padStart(5, '0')}`;
}

async function clearDatabase() {
  await prisma.promotionProduct.deleteMany();
  await prisma.promotion.deleteMany();
  await prisma.quoteItem.deleteMany();
  await prisma.quoteRequest.deleteMany();
  await prisma.leadCapture.deleteMany();
  await prisma.customerOrderItem.deleteMany();
  await prisma.customerOrder.deleteMany();
  await prisma.productImage.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();
}

async function seedUsers() {
  await prisma.user.createMany({
    data: [...staffUsers, ...customerUsers].map((item) => ({
      ...item,
      password: hashedPassword,
      isActive: true,
      isProvisional: false,
      mustChangePassword: false,
    })),
  });

  return prisma.user.findMany();
}

async function seedCategories() {
  await prisma.category.createMany({
    data: categories.map((category) => ({
      ...category,
      isActive: true,
    })),
  });

  const savedCategories = await prisma.category.findMany();
  return new Map(savedCategories.map((category) => [category.slug, category.id]));
}

async function seedProducts(categoryMap: Map<string, string>) {
  const savedProducts = [];

  for (const item of products) {
    const categoryId = categoryMap.get(item.categorySlug);

    if (!categoryId) {
      throw new Error(`Categoria não encontrada para o produto ${item.slug}`);
    }

    savedProducts.push(
      await prisma.product.create({
        data: {
          name: item.name,
          slug: item.slug,
          sku: item.sku,
          price: item.price,
          originalPrice: item.originalPrice,
          shortDesc: item.shortDesc,
          description: item.description,
          isOffer: item.isOffer ?? false,
          isNew: item.isNew ?? false,
          isFeatured: item.isFeatured ?? false,
          discount: item.discount,
          stock: item.stock,
          minStock: item.minStock,
          weight: item.weight,
          dimensions: item.dimensions,
          categoryId,
          isActive: true,
          images: {
            create: [
              {
                url: imageUrl(item.imageQuery),
                alt: item.name,
                order: 0,
                isPrimary: true,
              },
              {
                url: imageUrl(`${item.imageQuery} construction material detail`, 700),
                alt: `${item.name} em detalhe`,
                order: 1,
                isPrimary: false,
              },
            ],
          },
        },
      }),
    );
  }

  return savedProducts;
}

async function seedPromotions(productMap: Map<string, string>) {
  for (const promotion of promotions) {
    await prisma.promotion.create({
      data: {
        name: promotion.name,
        slug: promotion.slug,
        kind: promotion.kind,
        eyebrow: promotion.eyebrow,
        title: promotion.title,
        subtitle: promotion.subtitle,
        description: promotion.description,
        badgeText: promotion.badgeText,
        ctaLabel: promotion.ctaLabel,
        disclaimer: promotion.disclaimer,
        themeTone: promotion.themeTone,
        imageUrl: imageUrl(promotion.imageQuery, 1400),
        imageAlt: promotion.title,
        offerPricingMode: promotion.offerPricingMode,
        offerPromotionalPrice: promotion.offerPromotionalPrice,
        offerDiscountPercentage: promotion.offerDiscountPercentage,
        offerMinimumQuantity: promotion.offerMinimumQuantity,
        offerPayQuantity: promotion.offerPayQuantity,
        startsAt: promotion.startsAt,
        expiresAt: promotion.expiresAt,
        sortOrder: promotion.sortOrder,
        isActive: true,
        products: {
          create: promotion.productSlugs.map((slug, index) => {
            const productId = productMap.get(slug);

            if (!productId) {
              throw new Error(`Produto não encontrado para promoção: ${slug}`);
            }

            return {
              productId,
              order: index,
            };
          }),
        },
      },
    });
  }
}

async function seedOrders(users: Awaited<ReturnType<typeof seedUsers>>, savedProducts: Prisma.ProductGetPayload<{}>[]) {
  const customers = users.filter((item) => item.role === UserRole.CUSTOMER);
  const statuses = [
    OrderStatus.PENDING_WHATSAPP,
    OrderStatus.WHATSAPP_REDIRECTED,
    OrderStatus.IN_RECOVERY,
    OrderStatus.COMPLETED,
    OrderStatus.CANCELED,
  ];

  for (let index = 0; index < 24; index += 1) {
    const customer = customers[index % customers.length];
    const status = statuses[index % statuses.length];
    const orderProducts = pickProducts(savedProducts, index, 2 + (index % 4));
    const createdAt = daysFromNow(-index - 1);
    const redirectedAt = [OrderStatus.WHATSAPP_REDIRECTED, OrderStatus.IN_RECOVERY, OrderStatus.COMPLETED].includes(status)
      ? daysFromNow(-index)
      : undefined;

    await prisma.customerOrder.create({
      data: {
        referenceCode: reference('PED', index + 1),
        userId: customer.id,
        status,
        source: index % 3 === 0 ? 'customer_dashboard' : 'public_cart',
        customerNameSnapshot: customer.name,
        customerWhatsapp: customer.whatsapp ?? '11999999999',
        customerNote: index % 2 === 0 ? 'Entrega em horário comercial. Confirmar disponibilidade antes de separar.' : null,
        internalNotes: status === OrderStatus.IN_RECOVERY ? 'Cliente visualizou o carrinho e ainda não confirmou no WhatsApp.' : null,
        whatsappUrl: redirectedAt ? `https://wa.me/55${customer.whatsapp}` : null,
        whatsappMessage: redirectedAt ? `Olá, quero confirmar o pedido ${reference('PED', index + 1)}.` : null,
        whatsappRedirectedAt: redirectedAt,
        recoveryStartedAt: status === OrderStatus.IN_RECOVERY ? daysFromNow(-index + 1) : null,
        completedAt: status === OrderStatus.COMPLETED ? daysFromNow(-index + 2) : null,
        canceledAt: status === OrderStatus.CANCELED ? daysFromNow(-index + 2) : null,
        createdAt,
        items: {
          create: orderProducts.map((item, itemIndex) => ({
            productId: item.id,
            productNameSnapshot: item.name,
            productSlugSnapshot: item.slug,
            productImageUrlSnapshot: imageUrl(item.slug, 500),
            quantity: 1 + ((index + itemIndex) % 6),
            unitPrice: item.price,
            originalPrice: item.originalPrice,
          })),
        },
      },
    });
  }
}

async function seedLeadsAndQuotes(users: Awaited<ReturnType<typeof seedUsers>>, savedProducts: Prisma.ProductGetPayload<{}>[]) {
  const customers = users.filter((item) => item.role === UserRole.CUSTOMER);
  const leadStatuses = [
    LeadStatus.STARTED,
    LeadStatus.QUOTE_DRAFTED,
    LeadStatus.QUOTE_SUBMITTED,
    LeadStatus.CONTACTED,
    LeadStatus.ARCHIVED,
  ];
  const quoteStatuses = [
    QuoteStatus.DRAFT,
    QuoteStatus.SUBMITTED,
    QuoteStatus.IN_REVIEW,
    QuoteStatus.RESPONDED,
    QuoteStatus.ARCHIVED,
  ];

  for (let index = 0; index < 18; index += 1) {
    const customer = customers[index % customers.length];
    const leadStatus = leadStatuses[index % leadStatuses.length];
    const quoteStatus = quoteStatuses[index % quoteStatuses.length];
    const quoteProducts = pickProducts(savedProducts, index + 3, 2 + (index % 5));
    const completed = [LeadStatus.QUOTE_SUBMITTED, LeadStatus.CONTACTED, LeadStatus.ARCHIVED].includes(leadStatus);

    const lead = await prisma.leadCapture.create({
      data: {
        userId: customer.id,
        nameSnapshot: customer.name,
        whatsapp: customer.whatsapp ?? '11999999999',
        source: index % 2 === 0 ? 'public_quote' : 'customer_dashboard',
        status: leadStatus,
        notes:
          index % 3 === 0
            ? 'Cliente enviou lista de materiais para reforma residencial e pediu alternativa econômica.'
            : 'Aguardando retorno sobre prazo de entrega e disponibilidade de estoque.',
        completedAt: completed ? daysFromNow(-index + 1) : null,
        createdAt: daysFromNow(-index - 2),
      },
    });

    await prisma.quoteRequest.create({
      data: {
        referenceCode: reference('ORC', index + 1),
        userId: customer.id,
        leadId: lead.id,
        status: quoteStatus,
        source: index % 2 === 0 ? 'public_quote' : 'customer_dashboard',
        title: quoteTitle(index),
        customerNote: quoteNote(index),
        ocrText: quoteProducts.map((item, itemIndex) => `${itemIndex + 1}. ${item.name} - ${2 + itemIndex} un`).join('\n'),
        ocrConfidence: Number((0.72 + (index % 6) * 0.04).toFixed(2)),
        documentUrl: imageUrl('construction material shopping list document', 1000),
        documentFilename: `orcamento-${index + 1}.jpg`,
        documentMimeType: 'image/jpeg',
        documentSize: 180000 + index * 4500,
        documentWidth: 1200,
        documentHeight: 1600,
        submittedAt: quoteStatus === QuoteStatus.DRAFT ? null : daysFromNow(-index + 1),
        reviewedAt: [QuoteStatus.RESPONDED, QuoteStatus.ARCHIVED].includes(quoteStatus) ? daysFromNow(-index + 2) : null,
        createdAt: daysFromNow(-index - 2),
        items: {
          create: quoteProducts.map((item, itemIndex) => ({
            productId: item.id,
            name: item.name,
            quantity: 1 + itemIndex * 2,
            unit: unitFor(item.name),
            notes: itemIndex === 0 ? 'Priorizar disponibilidade imediata.' : null,
            confidence: Number((0.74 + itemIndex * 0.03).toFixed(2)),
            recognitionSourceLine: `${item.name} ${1 + itemIndex} ${unitFor(item.name)}`,
            position: itemIndex,
          })),
        },
      },
    });
  }
}

function pickProducts(savedProducts: Prisma.ProductGetPayload<{}>[], seed: number, count: number) {
  const picked = [];

  for (let offset = 0; offset < count; offset += 1) {
    picked.push(savedProducts[(seed * 7 + offset * 11) % savedProducts.length]);
  }

  return picked;
}

function unitFor(name: string) {
  if (/(cimento|argamassa|areia|cal|massa|tinta|selador)/i.test(name)) {
    return 'saco/balde';
  }

  if (/(cabo|tubo|mangueira|rodapé|sarrafo|tábua|ripa)/i.test(name)) {
    return 'metro';
  }

  if (/(porcelanato|piso|revestimento)/i.test(name)) {
    return 'm²';
  }

  return 'unidade';
}

function quoteTitle(index: number) {
  const titles = [
    'Reforma de cozinha',
    'Acabamento de apartamento',
    'Instalação elétrica residencial',
    'Compra mensal para pequena obra',
    'Reposição de EPIs da equipe',
    'Área externa e jardim',
  ];

  return titles[index % titles.length];
}

function quoteNote(index: number) {
  const notes = [
    'Preciso de orçamento com retirada na loja e opção de entrega.',
    'Pode sugerir marcas equivalentes caso algum item esteja indisponível.',
    'Enviar condição para pagamento à vista e no cartão.',
    'O material é para obra em andamento, tenho urgência no retorno.',
  ];

  return notes[index % notes.length];
}

async function main() {
  console.log('Starting realistic development seed...');
  console.log('Clearing existing development data...');
  await clearDatabase();

  console.log('Creating users...');
  const users = await seedUsers();

  console.log('Creating categories...');
  const categoryMap = await seedCategories();

  console.log('Creating products and images...');
  const savedProducts = await seedProducts(categoryMap);
  const productMap = new Map(savedProducts.map((item) => [item.slug, item.id]));

  console.log('Creating promotions...');
  await seedPromotions(productMap);

  console.log('Creating customer orders...');
  await seedOrders(users, savedProducts);

  console.log('Creating leads and quote requests...');
  await seedLeadsAndQuotes(users, savedProducts);

  const totals = await Promise.all([
    prisma.user.count(),
    prisma.category.count(),
    prisma.product.count(),
    prisma.productImage.count(),
    prisma.promotion.count(),
    prisma.customerOrder.count(),
    prisma.customerOrderItem.count(),
    prisma.leadCapture.count(),
    prisma.quoteRequest.count(),
    prisma.quoteItem.count(),
  ]);

  console.log('Seed completed successfully.');
  console.table({
    users: totals[0],
    categories: totals[1],
    products: totals[2],
    productImages: totals[3],
    promotions: totals[4],
    orders: totals[5],
    orderItems: totals[6],
    leads: totals[7],
    quotes: totals[8],
    quoteItems: totals[9],
  });
  console.log(`Default password for seeded users: ${password}`);
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
