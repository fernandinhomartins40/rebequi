import { PrismaClient, UserRole } from '@prisma/client';
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

function readEnv(name: string, fallback?: string): string | undefined {
  const value = process.env[name]?.trim();
  return value || fallback;
}

async function ensureManagedUser(params: {
  email: string;
  password: string;
  name: string;
  role: UserRole;
  label: string;
}) {
  const { email, password, name, role, label } = params;
  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      name,
      password: passwordHash,
      role,
      isActive: true,
    },
    create: {
      email,
      name,
      password: passwordHash,
      role,
      isActive: true,
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

  if (!customerEmail || !customerPassword || !customerName) {
    throw new Error('Customer bootstrap configuration is incomplete.');
  }

  await ensureManagedUser({
    email: customerEmail,
    password: customerPassword,
    name: customerName,
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

async function main() {
  console.log('Starting production-safe bootstrap...');

  await ensureAdminUser();
  await ensureDemoCustomer();
  await ensureSampleCatalog();

  const [users, categoriesCount, productsCount] = await Promise.all([
    prisma.user.count(),
    prisma.category.count({ where: { deletedAt: null } }),
    prisma.product.count({ where: { deletedAt: null } }),
  ]);

  console.log('Bootstrap finished successfully.');
  console.log(`Users: ${users}`);
  console.log(`Categories: ${categoriesCount}`);
  console.log(`Products: ${productsCount}`);
}

main()
  .catch((error) => {
    console.error('Bootstrap failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
