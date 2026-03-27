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

  if (productCount > 0) {
    console.log(`Catalog already populated with ${productCount} products. Skipping sample catalog bootstrap.`);
    return;
  }

  console.log('Bootstrapping sample catalog because the catalog is empty...');

  const categoryMap = new Map<string, string>();

  for (const category of categories) {
    const savedCategory = await prisma.category.upsert({
      where: { slug: category.slug },
      update: {},
      create: {
        ...category,
        isActive: true,
      },
    });

    categoryMap.set(category.slug, savedCategory.id);
  }

  for (const product of products) {
    const categoryId = categoryMap.get(product.categorySlug);

    if (!categoryId) {
      throw new Error(`Missing category for sample product: ${product.slug}`);
    }

    await prisma.product.upsert({
      where: { slug: product.slug },
      update: {},
      create: {
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
        category: {
          connect: { id: categoryId },
        },
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
  }

  console.log(`Sample catalog ready with ${products.length} products.`);
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
