import { PrismaClient, PromotionKind, PromotionTheme, UserRole } from '@prisma/client';
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
  minStock?: number;
  weight?: number;
  dimensions?: string;
  categorySlug: string;
  image: {
    url: string;
    alt: string;
  };
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
  startsAtOffsetDays?: number;
  expiresAtOffsetDays?: number;
  productSlugs: string[];
  image: {
    url: string;
    alt: string;
  };
};

const categories: CategorySeed[] = [
  {
    name: 'Ferramentas',
    slug: 'ferramentas',
    icon: 'Wrench',
    description: 'Ferramentas manuais e eletricas para obra, reforma e manutencao.',
  },
  {
    name: 'Tintas e Acessorios',
    slug: 'tintas-acessorios',
    icon: 'Paintbrush',
    description: 'Tintas, pinceis, rolos e materiais para acabamento.',
  },
  {
    name: 'Cimento e Argamassa',
    slug: 'cimento-argamassa',
    icon: 'Package',
    description: 'Bases, argamassas e insumos para construcao.',
  },
  {
    name: 'Materiais Eletricos',
    slug: 'materiais-eletricos',
    icon: 'Zap',
    description: 'Cabos, disjuntores e itens de instalacao eletrica.',
  },
];

const supplementalCategories: CategorySeed[] = [
  {
    name: 'Hidraulica',
    slug: 'hidraulica',
    icon: 'Droplet',
    description: 'Tubos, conexoes, registros e solucoes para agua e esgoto.',
  },
  {
    name: 'Pisos e Revestimentos',
    slug: 'pisos-revestimentos',
    icon: 'Grid',
    description: 'Ceramicas, porcelanatos, pisos vinilicos e revestimentos.',
  },
  {
    name: 'Madeiras e Chapas',
    slug: 'madeiras-chapas',
    icon: 'PanelsTopLeft',
    description: 'Compensados, MDF, sarrafos e tabuas para construcao e marcenaria.',
  },
  {
    name: 'Jardim e Area Externa',
    slug: 'jardim-area-externa',
    icon: 'Leaf',
    description: 'Itens para jardinagem, irrigacao, limpeza e areas externas.',
  },
  {
    name: 'Seguranca e EPIs',
    slug: 'seguranca-epis',
    icon: 'ShieldCheck',
    description: 'Luvas, oculos, capacetes, botas e protecao para obra.',
  },
  {
    name: 'Portas, Janelas e Ferragens',
    slug: 'portas-janelas-ferragens',
    icon: 'DoorOpen',
    description: 'Fechaduras, dobradicas, portas, janelas e ferragens em geral.',
  },
];

const products: ProductSeed[] = [
  {
    name: 'Furadeira de Impacto 650W',
    slug: 'furadeira-impacto-650w',
    sku: 'FER-FUR-001',
    price: 299.9,
    originalPrice: 349.9,
    shortDesc: 'Furadeira profissional com mandril de 1/2 e velocidade variavel.',
    description: 'Furadeira de impacto para concreto, madeira e metal, com kit inicial de brocas.',
    isOffer: true,
    isFeatured: true,
    discount: 14,
    stock: 18,
    minStock: 4,
    weight: 2.4,
    dimensions: '30x25x10 cm',
    categorySlug: 'ferramentas',
    image: {
      url: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=800',
      alt: 'Furadeira de impacto profissional',
    },
  },
  {
    name: 'Jogo de Chaves 6 Pecas',
    slug: 'jogo-chaves-6-pecas',
    sku: 'FER-CHA-002',
    price: 45.9,
    shortDesc: 'Jogo com seis chaves de fenda e philips para uso profissional.',
    description: 'Kit de chaves com cabo emborrachado e pontas magnetizadas para manutencao e montagem.',
    isNew: true,
    stock: 32,
    minStock: 8,
    categorySlug: 'ferramentas',
    image: {
      url: 'https://images.unsplash.com/photo-1530124566582-a618bc2615dc?w=800',
      alt: 'Jogo de chaves com seis pecas',
    },
  },
  {
    name: 'Tinta Acrilica Branca 18L',
    slug: 'tinta-acrilica-branca-18l',
    sku: 'TIN-ACR-001',
    price: 189.9,
    originalPrice: 229.9,
    shortDesc: 'Tinta premium lavavel com alto rendimento para ambientes internos.',
    description: 'Tinta acrilica fosca com cobertura uniforme e secagem rapida para pintura residencial.',
    isOffer: true,
    isFeatured: true,
    discount: 17,
    stock: 46,
    minStock: 10,
    weight: 20.5,
    categorySlug: 'tintas-acessorios',
    image: {
      url: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=800',
      alt: 'Balde de tinta acrilica branca',
    },
  },
  {
    name: 'Kit Pintura Profissional',
    slug: 'kit-pintura-profissional',
    sku: 'TIN-KIT-002',
    price: 69.9,
    shortDesc: 'Kit com rolos, pinceis e bandeja para pintura residencial.',
    description: 'Conjunto completo para pintura com itens essenciais para acabamento e aplicacao.',
    isNew: true,
    stock: 24,
    minStock: 6,
    categorySlug: 'tintas-acessorios',
    image: {
      url: 'https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=800',
      alt: 'Kit de pintura profissional',
    },
  },
  {
    name: 'Cimento Portland CP II 50kg',
    slug: 'cimento-portland-cp2-50kg',
    sku: 'CIM-CIM-001',
    price: 32.9,
    shortDesc: 'Saco de cimento para concreto, alvenaria e argamassas.',
    description: 'Cimento Portland CP II de alta resistencia para construcoes residenciais e comerciais.',
    isFeatured: true,
    stock: 220,
    minStock: 40,
    weight: 50,
    categorySlug: 'cimento-argamassa',
    image: {
      url: 'https://images.unsplash.com/photo-1581094271901-8022df4466f9?w=800',
      alt: 'Saco de cimento de 50kg',
    },
  },
  {
    name: 'Argamassa Colante AC II 20kg',
    slug: 'argamassa-colante-ac2-20kg',
    sku: 'CIM-ARG-002',
    price: 24.9,
    originalPrice: 29.9,
    shortDesc: 'Argamassa para assentamento de pisos e revestimentos.',
    description: 'Argamassa colante de alta aderencia para aplicacao interna e externa.',
    isOffer: true,
    discount: 17,
    stock: 118,
    minStock: 24,
    weight: 20,
    categorySlug: 'cimento-argamassa',
    image: {
      url: 'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=800',
      alt: 'Saco de argamassa colante',
    },
  },
  {
    name: 'Fio Eletrico Flexivel 2,5mm 100m',
    slug: 'fio-eletrico-flexivel-25mm-100m',
    sku: 'ELE-FIO-001',
    price: 159.9,
    shortDesc: 'Rolo de cabo flexivel para instalacoes residenciais.',
    description: 'Fio eletrico de cobre com isolamento antichama para circuitos de tomadas e iluminacao.',
    isNew: true,
    stock: 36,
    minStock: 8,
    weight: 8.5,
    categorySlug: 'materiais-eletricos',
    image: {
      url: 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=800',
      alt: 'Rolo de fio eletrico flexivel',
    },
  },
  {
    name: 'Disjuntor Monopolar 32A',
    slug: 'disjuntor-monopolar-32a',
    sku: 'ELE-DIS-002',
    price: 18.9,
    shortDesc: 'Disjuntor para protecao de circuitos eletricos.',
    description: 'Disjuntor termomagnetico monopolar para quadros de distribuicao.',
    stock: 64,
    minStock: 12,
    weight: 0.15,
    categorySlug: 'materiais-eletricos',
    image: {
      url: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800',
      alt: 'Disjuntor termomagnetico monopolar',
    },
  },
];

const supplementalProducts: ProductSeed[] = [
  catalogProduct('Parafusadeira 12V com 2 Baterias', 'ferramentas', 249.9, 22, 'FER-PAR-009', {
    originalPrice: 319.9,
    isOffer: true,
    isNew: true,
    discount: 22,
    weight: 1.8,
  }),
  catalogProduct('Serra Marmore 1300W', 'ferramentas', 329.9, 12, 'FER-SER-010', { isFeatured: true, weight: 3.1 }),
  catalogProduct('Jogo de Chaves 12 Pecas', 'ferramentas', 79.9, 35, 'FER-CHA-011', { isNew: true }),
  catalogProduct('Trena Emborrachada 5m', 'ferramentas', 24.9, 80, 'FER-TRE-012'),
  catalogProduct('Martelo Unha 27mm Cabo Fibra', 'ferramentas', 42.9, 46, 'FER-MAR-013'),
  catalogProduct('Alicate Universal 8 Pol', 'ferramentas', 39.9, 55, 'FER-ALI-014'),

  catalogProduct('Tinta Acrilica Gelo Fosca 18L', 'tintas-acessorios', 199.9, 38, 'TIN-ACR-010', {
    isFeatured: true,
    weight: 20.5,
  }),
  catalogProduct('Esmalte Sintetico Branco 3,6L', 'tintas-acessorios', 89.9, 30, 'TIN-ESM-011', { weight: 4.2 }),
  catalogProduct('Massa Corrida PVA 25kg', 'tintas-acessorios', 64.9, 44, 'TIN-MAS-012', {
    originalPrice: 79.9,
    isOffer: true,
    discount: 19,
    weight: 25,
  }),
  catalogProduct('Selador Acrilico 18L', 'tintas-acessorios', 149.9, 26, 'TIN-SEL-013', { weight: 20 }),
  catalogProduct('Rolo La Antigota 23cm', 'tintas-acessorios', 21.9, 75, 'TIN-ROL-014'),
  catalogProduct('Pincel Trincha 2 Pol', 'tintas-acessorios', 8.9, 130, 'TIN-PIN-015'),

  catalogProduct('Argamassa Porcelanato AC III 20kg', 'cimento-argamassa', 39.9, 120, 'CIM-ARG-010', {
    isFeatured: true,
    weight: 20,
  }),
  catalogProduct('Rejunte Flexivel Cinza 1kg', 'cimento-argamassa', 12.9, 95, 'CIM-REJ-011'),
  catalogProduct('Cal Hidratada 20kg', 'cimento-argamassa', 19.9, 85, 'CIM-CAL-012', { weight: 20 }),
  catalogProduct('Areia Media Ensacada 20kg', 'cimento-argamassa', 13.9, 150, 'CIM-ARE-013', { weight: 20 }),
  catalogProduct('Brita Ensacada 20kg', 'cimento-argamassa', 17.9, 110, 'CIM-BRI-014', { weight: 20 }),
  catalogProduct('Impermeabilizante Balde 18kg', 'cimento-argamassa', 219.9, 18, 'CIM-IMP-015', { weight: 18 }),

  catalogProduct('Cabo Flexivel 4mm 100m Vermelho', 'materiais-eletricos', 249.9, 28, 'ELE-CAB-010', { weight: 13 }),
  catalogProduct('Tomada 2P+T 10A Branca', 'materiais-eletricos', 9.9, 180, 'ELE-TOM-011'),
  catalogProduct('Interruptor Simples Branco', 'materiais-eletricos', 8.9, 160, 'ELE-INT-012'),
  catalogProduct('Quadro de Distribuicao 12 Disjuntores', 'materiais-eletricos', 89.9, 24, 'ELE-QUA-013', {
    isFeatured: true,
  }),
  catalogProduct('Conduite Corrugado 3/4 50m', 'materiais-eletricos', 74.9, 32, 'ELE-CON-014'),
  catalogProduct('Lampada LED Bulbo 12W', 'materiais-eletricos', 11.9, 220, 'ELE-LAM-015'),

  catalogProduct('Tubo PVC Soldavel 25mm 6m', 'hidraulica', 21.9, 110, 'HID-TUB-001'),
  catalogProduct('Joelho PVC 90 Graus 25mm', 'hidraulica', 2.9, 300, 'HID-JOE-002'),
  catalogProduct('Registro de Esfera 3/4', 'hidraulica', 19.9, 86, 'HID-REG-003'),
  catalogProduct('Caixa Sifonada 150mm', 'hidraulica', 28.9, 52, 'HID-CAI-004'),
  catalogProduct('Torneira Cozinha Parede Cromada', 'hidraulica', 79.9, 34, 'HID-TOR-005', { isNew: true, isFeatured: true }),
  catalogProduct('Veda Rosca 18mm x 50m', 'hidraulica', 6.9, 220, 'HID-VED-006'),

  catalogProduct('Porcelanato Acetinado 84x84 Caixa 2,8m2', 'pisos-revestimentos', 139.9, 62, 'PIS-POR-001', {
    isFeatured: true,
    weight: 42,
  }),
  catalogProduct('Piso Ceramico Bege 60x60 Caixa 2,2m2', 'pisos-revestimentos', 69.9, 80, 'PIS-CER-002', {
    originalPrice: 84.9,
    isOffer: true,
    discount: 18,
    weight: 34,
  }),
  catalogProduct('Revestimento Branco 30x60 Caixa 2m2', 'pisos-revestimentos', 54.9, 72, 'PIS-REV-003', { weight: 28 }),
  catalogProduct('Piso Vinilico Carvalho m2', 'pisos-revestimentos', 89.9, 95, 'PIS-VIN-004', { isNew: true }),
  catalogProduct('Rodape Poliestireno Branco 7cm', 'pisos-revestimentos', 34.9, 65, 'PIS-ROD-005'),
  catalogProduct('Espacador Nivelador 1,5mm Pacote 100un', 'pisos-revestimentos', 22.9, 130, 'PIS-ESP-006'),

  catalogProduct('Chapa MDF Cru 15mm 275x185cm', 'madeiras-chapas', 219.9, 18, 'MAD-MDF-001', {
    isFeatured: true,
    weight: 44,
    dimensions: '275x185x1,5 cm',
  }),
  catalogProduct('Compensado Naval 10mm 220x160cm', 'madeiras-chapas', 189.9, 14, 'MAD-COM-002', { weight: 31 }),
  catalogProduct('Sarrafo Pinus 5x5cm 3m', 'madeiras-chapas', 24.9, 95, 'MAD-SAR-003'),
  catalogProduct('Tabua Pinus Aparelhada 30cm 3m', 'madeiras-chapas', 64.9, 42, 'MAD-TAB-004'),
  catalogProduct('Ripa de Eucalipto 2,5x5cm 3m', 'madeiras-chapas', 12.9, 120, 'MAD-RIP-005'),
  catalogProduct('Cola Madeira 500g', 'madeiras-chapas', 18.9, 60, 'MAD-COL-006'),

  catalogProduct('Mangueira Jardim 1/2 20m', 'jardim-area-externa', 79.9, 48, 'JAR-MAN-001', { isNew: true }),
  catalogProduct('Ducha Jardim Multijato', 'jardim-area-externa', 34.9, 55, 'JAR-DUC-002'),
  catalogProduct('Pulverizador Manual 5L', 'jardim-area-externa', 59.9, 32, 'JAR-PUL-003'),
  catalogProduct('Vassoura Metalica Regulavel', 'jardim-area-externa', 29.9, 44, 'JAR-VAS-004'),
  catalogProduct('Refletor LED 50W IP65', 'jardim-area-externa', 49.9, 70, 'JAR-REF-005', {
    isOffer: true,
    originalPrice: 64.9,
    discount: 23,
  }),
  catalogProduct('Tinta Emborrachada Telhado 18L', 'jardim-area-externa', 249.9, 20, 'JAR-TIN-006', { weight: 20.2 }),

  catalogProduct('Luva de Seguranca Nitrilica', 'seguranca-epis', 14.9, 200, 'EPI-LUV-001'),
  catalogProduct('Oculos de Protecao Incolor', 'seguranca-epis', 12.9, 180, 'EPI-OCU-002'),
  catalogProduct('Capacete de Seguranca Amarelo', 'seguranca-epis', 29.9, 96, 'EPI-CAP-003'),
  catalogProduct('Protetor Auricular Plug Silicone', 'seguranca-epis', 4.9, 260, 'EPI-PRO-004'),
  catalogProduct('Bota de Seguranca Couro Bidensidade', 'seguranca-epis', 119.9, 40, 'EPI-BOT-005', { isFeatured: true }),
  catalogProduct('Mascara PFF2 Sem Valvula', 'seguranca-epis', 6.9, 300, 'EPI-MAS-006'),

  catalogProduct('Fechadura Externa Cromada', 'portas-janelas-ferragens', 89.9, 36, 'FER-FEC-020', { isFeatured: true }),
  catalogProduct('Dobradica 3 Pol Aco Cromado Par', 'portas-janelas-ferragens', 18.9, 120, 'FER-DOB-021'),
];

const allCategories = [...categories, ...supplementalCategories];
const allProducts = [...products, ...supplementalProducts];

const promotions: PromotionSeed[] = [
  {
    name: 'Semana da Pintura',
    slug: 'semana-da-pintura',
    kind: PromotionKind.COLLECTION,
    eyebrow: 'Ofertas em destaque',
    title: 'Pintura com rendimento e acabamento',
    subtitle: 'Tintas, pinceis e kits para renovar ambientes.',
    description: 'Campanha promocional com itens para preparar superficies, aplicar tinta e finalizar a obra com mais agilidade.',
    badgeText: 'Ate 25% OFF',
    ctaLabel: 'Ver campanha',
    disclaimer: 'Estoque sujeito a disponibilidade durante a campanha.',
    themeTone: PromotionTheme.GOLD,
    sortOrder: 0,
    startsAtOffsetDays: -2,
    expiresAtOffsetDays: 7,
    productSlugs: ['tinta-acrilica-branca-18l', 'kit-pintura-profissional'],
    image: {
      url: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=1400',
      alt: 'Ferramentas e materiais para pintura',
    },
  },
  {
    name: 'Eletrica Essencial',
    slug: 'eletrica-essencial',
    kind: PromotionKind.COLLECTION,
    eyebrow: 'Promocao tecnica',
    title: 'Infraestrutura eletrica com entrega rapida',
    subtitle: 'Cabos e componentes para instalacoes residenciais.',
    description: 'Colecao promocional focada em itens de instalacao eletrica para manutencao, reforma e novos projetos.',
    badgeText: 'Curadoria tecnica',
    ctaLabel: 'Explorar itens',
    disclaimer: 'Consulte a equipe tecnica para compatibilidade entre componentes.',
    themeTone: PromotionTheme.BLUE,
    sortOrder: 1,
    startsAtOffsetDays: -1,
    expiresAtOffsetDays: 10,
    productSlugs: ['fio-eletrico-flexivel-25mm-100m', 'disjuntor-monopolar-32a'],
    image: {
      url: 'https://images.unsplash.com/photo-1516116216624-53e697fedbea?w=1400',
      alt: 'Componentes eletricos em promocao',
    },
  },
  {
    name: 'Oferta Furadeira de Impacto',
    slug: 'oferta-furadeira-de-impacto',
    kind: PromotionKind.SINGLE_PRODUCT,
    eyebrow: 'Promocoes imperdiveis',
    title: 'Furadeira com prazo relampago',
    subtitle: 'Equipamento profissional com estoque limitado.',
    description: 'Oferta individual criada para destacar uma furadeira de impacto com prazo curto e chamada dedicada.',
    badgeText: 'Oferta relampago',
    ctaLabel: 'Ver oferta',
    disclaimer: 'Validade sujeita ao estoque disponivel.',
    themeTone: PromotionTheme.RED,
    sortOrder: 0,
    startsAtOffsetDays: -1,
    expiresAtOffsetDays: 4,
    productSlugs: ['furadeira-impacto-650w'],
    image: {
      url: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=1400',
      alt: 'Furadeira de impacto em promocao',
    },
  },
  {
    name: 'Oferta Tinta Acrilica 18L',
    slug: 'oferta-tinta-acrilica-18l',
    kind: PromotionKind.SINGLE_PRODUCT,
    eyebrow: 'Promocoes imperdiveis',
    title: 'Tinta premium com desconto por tempo limitado',
    subtitle: 'Cobertura uniforme para acelerar a etapa de acabamento.',
    description: 'Oferta individual de tinta acrilica com prazo definido para destacar o item na vitrine principal.',
    badgeText: 'Preco especial',
    ctaLabel: 'Aproveitar oferta',
    disclaimer: 'A promocao pode ser encerrada quando o prazo expirar.',
    themeTone: PromotionTheme.GOLD,
    sortOrder: 1,
    startsAtOffsetDays: -1,
    expiresAtOffsetDays: 6,
    productSlugs: ['tinta-acrilica-branca-18l'],
    image: {
      url: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=1400',
      alt: 'Tinta acrilica branca em oferta',
    },
  },
];

function catalogProduct(
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
    originalPrice: overrides.originalPrice,
    shortDesc: overrides.shortDesc ?? `${name} para obra, reforma e manutencao.`,
    description:
      overrides.description ??
      `${name} com bom desempenho para clientes residenciais, profissionais autonomos e pequenas construtoras. Produto da linha ${categoryLabel}, indicado para compras avulsas e reposicao de estoque.`,
    isOffer: overrides.isOffer ?? false,
    isNew: overrides.isNew ?? false,
    isFeatured: overrides.isFeatured ?? false,
    discount: overrides.discount,
    stock,
    minStock: overrides.minStock ?? Math.max(5, Math.floor(stock * 0.18)),
    weight: overrides.weight,
    dimensions: overrides.dimensions,
    categorySlug,
    image: {
      url: imageUrl(overrides.image?.alt ?? slug),
      alt: overrides.image?.alt ?? name,
    },
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

function readEnv(name: string, fallback?: string): string | undefined {
  const value = process.env[name]?.trim();
  return value || fallback;
}

async function ensureManagedUser(params: {
  email: string;
  password: string;
  name: string;
  whatsapp?: string;
  role: UserRole;
  isProvisional?: boolean;
  mustChangePassword?: boolean;
  label: string;
}) {
  const { email, password, name, whatsapp, role, isProvisional = false, mustChangePassword = false, label } = params;
  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      name,
      password: passwordHash,
      whatsapp,
      role,
      isActive: true,
      isProvisional,
      mustChangePassword,
    },
    create: {
      email,
      name,
      password: passwordHash,
      whatsapp,
      role,
      isActive: true,
      isProvisional,
      mustChangePassword,
    },
  });

  console.log(`Ensured managed ${label} user: ${user.email}`);
  return user;
}

async function ensureAdminUser() {
  const adminEmail = readEnv('BOOTSTRAP_ADMIN_EMAIL', 'admin@rebequi.com.br');
  const adminPassword = readEnv('BOOTSTRAP_ADMIN_PASSWORD', 'ChangeMe123!');
  const adminName = readEnv('BOOTSTRAP_ADMIN_NAME', 'Administrador Rebequi');

  if (!adminEmail || !adminPassword || !adminName) {
    throw new Error('Admin bootstrap configuration is incomplete.');
  }

  return ensureManagedUser({
    email: adminEmail,
    password: adminPassword,
    name: adminName,
    role: UserRole.ADMIN,
    label: 'admin',
  });
}

async function ensureDemoCustomer() {
  const customerEmail = readEnv('BOOTSTRAP_CUSTOMER_EMAIL', 'cliente@rebequi.com.br');
  const customerPassword = readEnv('BOOTSTRAP_CUSTOMER_PASSWORD', 'Cliente123!');
  const customerName = readEnv('BOOTSTRAP_CUSTOMER_NAME', 'Cliente de Teste');
  const customerWhatsapp = readEnv('BOOTSTRAP_CUSTOMER_WHATSAPP', '11999990000');

  if (!customerEmail || !customerPassword || !customerName) {
    throw new Error('Customer bootstrap configuration is incomplete.');
  }

  await ensureManagedUser({
    email: customerEmail,
    password: customerPassword,
    name: customerName,
    whatsapp: customerWhatsapp,
    role: UserRole.CUSTOMER,
    label: 'customer',
  });
}

async function ensureSampleCatalog() {
  const productCount = await prisma.product.count({
    where: { deletedAt: null },
  });

  console.log(`Catalog currently has ${productCount} products. Ensuring sample catalog with ${allProducts.length} products...`);

  const categoryMap = new Map<string, string>();

  for (const category of allCategories) {
    const savedCategory = await prisma.category.upsert({
      where: { slug: category.slug },
      update: {
        name: category.name,
        icon: category.icon,
        description: category.description,
        isActive: true,
        deletedAt: null,
      },
      create: {
        ...category,
        isActive: true,
      },
    });

    categoryMap.set(category.slug, savedCategory.id);
  }

  let createdProducts = 0;
  let updatedProducts = 0;

  for (const product of allProducts) {
    const categoryId = categoryMap.get(product.categorySlug);

    if (!categoryId) {
      throw new Error(`Missing category for sample product: ${product.slug}`);
    }

    const productData = {
      name: product.name,
      slug: product.slug,
      sku: product.sku,
      price: product.price,
      originalPrice: product.originalPrice,
      shortDesc: product.shortDesc,
      description: product.description,
      isOffer: product.isOffer ?? false,
      isNew: product.isNew ?? false,
      isFeatured: product.isFeatured ?? false,
      discount: product.discount,
      stock: product.stock,
      minStock: product.minStock ?? 0,
      weight: product.weight,
      dimensions: product.dimensions,
      isActive: true,
      deletedAt: null,
      categoryId,
    };

    const existingProduct = await prisma.product.findFirst({
      where: {
        OR: [{ slug: product.slug }, { sku: product.sku }],
      },
      select: { id: true },
    });

    const savedProduct = existingProduct
      ? await prisma.product.update({
          where: { id: existingProduct.id },
          data: productData,
        })
      : await prisma.product.create({
          data: {
            ...productData,
            images: {
              create: [
                {
                  url: product.image.url,
                  alt: product.image.alt,
                  order: 0,
                  isPrimary: true,
                },
              ],
            },
          },
        });

    if (existingProduct) {
      updatedProducts += 1;
    } else {
      createdProducts += 1;
    }

    const imageCount = await prisma.productImage.count({
      where: { productId: savedProduct.id },
    });

    if (imageCount === 0) {
      await prisma.productImage.create({
        data: {
          url: product.image.url,
          alt: product.image.alt,
          order: 0,
          isPrimary: true,
          productId: savedProduct.id,
        },
      });
    }
  }

  console.log(`Sample catalog ready. Created ${createdProducts}, updated ${updatedProducts}, target ${allProducts.length} products.`);
}

function createOffsetDate(days?: number) {
  if (days === undefined) {
    return undefined;
  }

  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

async function ensureSamplePromotions() {
  const promotionCount = await prisma.promotion.count({
    where: { deletedAt: null },
  });

  if (promotionCount > 0) {
    console.log(`Promotions already populated with ${promotionCount} records. Skipping sample promotions bootstrap.`);
    return;
  }

  const productSlugs = Array.from(new Set(promotions.flatMap((promotion) => promotion.productSlugs)));
  const persistedProducts = await prisma.product.findMany({
    where: {
      slug: { in: productSlugs },
      deletedAt: null,
    },
    select: {
      id: true,
      slug: true,
    },
  });

  const productMap = new Map(persistedProducts.map((product) => [product.slug, product.id]));

  for (const promotion of promotions) {
    const productIds = promotion.productSlugs
      .map((slug) => productMap.get(slug))
      .filter((value): value is string => Boolean(value));

    if (productIds.length !== promotion.productSlugs.length) {
      console.log(`Skipping sample promotion ${promotion.slug} because not all reference products are available.`);
      continue;
    }

    await prisma.promotion.upsert({
      where: { slug: promotion.slug },
      update: {},
      create: {
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
        imageUrl: promotion.image.url,
        imageAlt: promotion.image.alt,
        startsAt: createOffsetDate(promotion.startsAtOffsetDays),
        expiresAt: createOffsetDate(promotion.expiresAtOffsetDays),
        sortOrder: promotion.sortOrder,
        isActive: true,
        products: {
          create: productIds.map((productId, index) => ({
            order: index,
            product: {
              connect: { id: productId },
            },
          })),
        },
      },
    });
  }

  console.log(`Sample promotions ready with up to ${promotions.length} campaigns.`);
}

async function main() {
  console.log('Starting production-safe bootstrap...');

  await ensureAdminUser();
  await ensureDemoCustomer();
  await ensureSampleCatalog();
  await ensureSamplePromotions();

  const [users, categoriesCount, productsCount, promotionsCount] = await Promise.all([
    prisma.user.count(),
    prisma.category.count({ where: { deletedAt: null } }),
    prisma.product.count({ where: { deletedAt: null } }),
    prisma.promotion.count({ where: { deletedAt: null } }),
  ]);

  console.log('Bootstrap finished successfully.');
  console.log(`Users: ${users}`);
  console.log(`Categories: ${categoriesCount}`);
  console.log(`Products: ${productsCount}`);
  console.log(`Promotions: ${promotionsCount}`);
}

main()
  .catch((error) => {
    console.error('Bootstrap failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
