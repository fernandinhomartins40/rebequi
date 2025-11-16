import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

async function main() {
  console.log('🌱 Starting database seed...');

  // Clear existing data (in correct order due to foreign keys)
  await prisma.productImage.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();

  console.log('🗑️  Cleared existing data');

  // Create admin user
  const hashedPassword = await bcrypt.hash('admin123', 10);
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@rebequi.com',
      name: 'Administrador',
      password: hashedPassword,
      role: 'ADMIN',
    },
  });

  console.log(`✅ Created admin user: ${adminUser.email}`);

  // Create categories
  const categories = await Promise.all([
    prisma.category.create({
      data: {
        name: 'Cimento e Argamassa',
        slug: 'cimento-argamassa',
        icon: 'Package',
        description: 'Cimentos, argamassas e produtos para construção civil',
        image: '/images/categories/cimento.jpg',
      },
    }),
    prisma.category.create({
      data: {
        name: 'Tijolos e Blocos',
        slug: 'tijolos-blocos',
        icon: 'Boxes',
        description: 'Tijolos, blocos e materiais para alvenaria',
        image: '/images/categories/tijolos.jpg',
      },
    }),
    prisma.category.create({
      data: {
        name: 'Ferramentas',
        slug: 'ferramentas',
        icon: 'Hammer',
        description: 'Ferramentas manuais e elétricas profissionais',
        image: '/images/categories/ferramentas.jpg',
      },
    }),
    prisma.category.create({
      data: {
        name: 'Tintas',
        slug: 'tintas',
        icon: 'Paintbrush',
        description: 'Tintas, vernizes e acessórios para pintura',
        image: '/images/categories/tintas.jpg',
      },
    }),
    prisma.category.create({
      data: {
        name: 'Materiais Elétricos',
        slug: 'materiais-eletricos',
        icon: 'Zap',
        description: 'Fios, cabos, tomadas e materiais elétricos',
        image: '/images/categories/eletricos.jpg',
      },
    }),
    prisma.category.create({
      data: {
        name: 'Hidráulica',
        slug: 'hidraulica',
        icon: 'Droplet',
        description: 'Tubos, conexões e materiais hidráulicos',
        image: '/images/categories/hidraulica.jpg',
      },
    }),
    prisma.category.create({
      data: {
        name: 'Madeiras',
        slug: 'madeiras',
        icon: 'TreePine',
        description: 'Madeiras, compensados e derivados',
        image: '/images/categories/madeiras.jpg',
      },
    }),
    prisma.category.create({
      data: {
        name: 'Ferros e Metais',
        slug: 'ferros-metais',
        icon: 'Wrench',
        description: 'Ferros, aços e materiais metálicos',
        image: '/images/categories/metais.jpg',
      },
    }),
  ]);

  console.log(`✅ Created ${categories.length} categories`);

  // Get category references
  const cimentoCategory = categories.find((c) => c.slug === 'cimento-argamassa')!;
  const ferramentasCategory = categories.find((c) => c.slug === 'ferramentas')!;
  const tintasCategory = categories.find((c) => c.slug === 'tintas')!;
  const eletricosCategory = categories.find((c) => c.slug === 'materiais-eletricos')!;
  const hidraulicaCategory = categories.find((c) => c.slug === 'hidraulica')!;

  // Create products with multiple images
  const products = [];

  // Cimento e Argamassa
  const cimento1 = await prisma.product.create({
    data: {
      name: 'Cimento Portland 50kg',
      slug: generateSlug('Cimento Portland 50kg'),
      sku: 'CIM-001',
      price: 32.90,
      originalPrice: 39.90,
      description: 'Cimento Portland CP-II de alta qualidade para construção civil. Ideal para estruturas, fundações e obras de grande porte.',
      shortDesc: 'Cimento Portland CP-II de alta qualidade',
      isOffer: true,
      isNew: false,
      isFeatured: true,
      discount: 18,
      stock: 150,
      minStock: 20,
      weight: 50,
      dimensions: '40x60x10 cm',
      categoryId: cimentoCategory.id,
      images: {
        create: [
          { url: '/images/products/cimento-01.jpg', alt: 'Cimento Portland 50kg', order: 1, isPrimary: true },
          { url: '/images/products/cimento-02.jpg', alt: 'Detalhe do Cimento', order: 2, isPrimary: false },
        ],
      },
    },
  });
  products.push(cimento1);

  const argamassa1 = await prisma.product.create({
    data: {
      name: 'Argamassa AC-II 20kg',
      slug: generateSlug('Argamassa AC-II 20kg'),
      sku: 'ARG-001',
      price: 18.90,
      originalPrice: 22.90,
      description: 'Argamassa colante para revestimentos cerâmicos internos e externos. Excelente aderência e fácil aplicação.',
      shortDesc: 'Argamassa colante para cerâmicas',
      isOffer: true,
      discount: 17,
      stock: 200,
      minStock: 30,
      weight: 20,
      categoryId: cimentoCategory.id,
      images: {
        create: [
          { url: '/images/products/argamassa-01.jpg', alt: 'Argamassa AC-II', order: 1, isPrimary: true },
        ],
      },
    },
  });
  products.push(argamassa1);

  const reboco1 = await prisma.product.create({
    data: {
      name: 'Reboco Pronto 20kg',
      slug: generateSlug('Reboco Pronto 20kg'),
      sku: 'REB-001',
      price: 24.90,
      description: 'Reboco pronto para uso interno e externo. Acabamento liso e uniforme.',
      shortDesc: 'Reboco pronto uso interno/externo',
      isNew: true,
      stock: 80,
      weight: 20,
      categoryId: cimentoCategory.id,
      images: {
        create: [
          { url: '/images/products/reboco-01.jpg', alt: 'Reboco Pronto', order: 1, isPrimary: true },
        ],
      },
    },
  });
  products.push(reboco1);

  const cal1 = await prisma.product.create({
    data: {
      name: 'Cal Hidratada 20kg',
      slug: generateSlug('Cal Hidratada 20kg'),
      sku: 'CAL-001',
      price: 15.90,
      description: 'Cal hidratada CH-I para argamassa e pintura. Alta pureza e rendimento.',
      shortDesc: 'Cal hidratada para argamassa',
      stock: 120,
      weight: 20,
      categoryId: cimentoCategory.id,
      images: {
        create: [
          { url: '/images/products/cal-01.jpg', alt: 'Cal Hidratada', order: 1, isPrimary: true },
        ],
      },
    },
  });
  products.push(cal1);

  // Ferramentas
  const furadeira1 = await prisma.product.create({
    data: {
      name: 'Furadeira de Impacto 650W',
      slug: generateSlug('Furadeira de Impacto 650W'),
      sku: 'FER-001',
      price: 189.90,
      originalPrice: 249.90,
      description: 'Furadeira de impacto profissional com 650W de potência, velocidade variável e reversor. Acompanha maleta completa com acessórios.',
      shortDesc: 'Furadeira de impacto profissional 650W',
      isOffer: true,
      isFeatured: true,
      discount: 24,
      stock: 35,
      minStock: 5,
      weight: 2.5,
      dimensions: '30x25x10 cm',
      categoryId: ferramentasCategory.id,
      images: {
        create: [
          { url: '/images/products/furadeira-01.jpg', alt: 'Furadeira de Impacto', order: 1, isPrimary: true },
          { url: '/images/products/furadeira-02.jpg', alt: 'Furadeira com acessórios', order: 2, isPrimary: false },
          { url: '/images/products/furadeira-03.jpg', alt: 'Detalhe da furadeira', order: 3, isPrimary: false },
        ],
      },
    },
  });
  products.push(furadeira1);

  const martelo1 = await prisma.product.create({
    data: {
      name: 'Martelo de Unha 25mm',
      slug: generateSlug('Martelo de Unha 25mm'),
      sku: 'FER-002',
      price: 29.90,
      description: 'Martelo de unha com cabo em fibra de vidro, cabeça forjada em aço carbono. Antiderrapante e ergonômico.',
      shortDesc: 'Martelo de unha cabo fibra de vidro',
      stock: 60,
      weight: 0.5,
      categoryId: ferramentasCategory.id,
      images: {
        create: [
          { url: '/images/products/martelo-01.jpg', alt: 'Martelo de Unha', order: 1, isPrimary: true },
        ],
      },
    },
  });
  products.push(martelo1);

  const chaves1 = await prisma.product.create({
    data: {
      name: 'Jogo de Chaves Philips/Fenda',
      slug: generateSlug('Jogo de Chaves Philips Fenda'),
      sku: 'FER-003',
      price: 45.90,
      description: 'Jogo com 6 chaves de fenda e philips, cabo emborrachado, ponta magnética.',
      shortDesc: 'Jogo 6 chaves fenda e philips',
      isNew: true,
      stock: 45,
      weight: 0.8,
      categoryId: ferramentasCategory.id,
      images: {
        create: [
          { url: '/images/products/chaves-01.jpg', alt: 'Jogo de Chaves', order: 1, isPrimary: true },
        ],
      },
    },
  });
  products.push(chaves1);

  const serra1 = await prisma.product.create({
    data: {
      name: 'Serra Circular 7.1/4" 1400W',
      slug: generateSlug('Serra Circular 7.1/4 1400W'),
      sku: 'FER-004',
      price: 349.90,
      originalPrice: 429.90,
      description: 'Serra circular profissional para cortes precisos em madeira. Motor de 1400W, guia laser, profundidade ajustável.',
      shortDesc: 'Serra circular profissional 1400W',
      isOffer: true,
      discount: 19,
      stock: 20,
      minStock: 3,
      weight: 4.2,
      categoryId: ferramentasCategory.id,
      images: {
        create: [
          { url: '/images/products/serra-01.jpg', alt: 'Serra Circular', order: 1, isPrimary: true },
          { url: '/images/products/serra-02.jpg', alt: 'Serra em uso', order: 2, isPrimary: false },
        ],
      },
    },
  });
  products.push(serra1);

  const trena1 = await prisma.product.create({
    data: {
      name: 'Trena 5m',
      slug: generateSlug('Trena 5m'),
      sku: 'FER-005',
      price: 19.90,
      description: 'Trena de aço 5 metros com trava, cinta ergonômica.',
      shortDesc: 'Trena de aço 5m com trava',
      stock: 90,
      weight: 0.2,
      categoryId: ferramentasCategory.id,
      images: {
        create: [
          { url: '/images/products/trena-01.jpg', alt: 'Trena 5m', order: 1, isPrimary: true },
        ],
      },
    },
  });
  products.push(trena1);

  const nivel1 = await prisma.product.create({
    data: {
      name: 'Nível de Alumínio 40cm',
      slug: generateSlug('Nível de Alumínio 40cm'),
      sku: 'FER-006',
      price: 34.90,
      description: 'Nível de alumínio profissional 40cm, 3 bolhas, precisão garantida.',
      shortDesc: 'Nível alumínio profissional 40cm',
      stock: 55,
      weight: 0.3,
      categoryId: ferramentasCategory.id,
      images: {
        create: [
          { url: '/images/products/nivel-01.jpg', alt: 'Nível de Alumínio', order: 1, isPrimary: true },
        ],
      },
    },
  });
  products.push(nivel1);

  // Tintas
  const tinta1 = await prisma.product.create({
    data: {
      name: 'Tinta Acrílica Branca 18L',
      slug: generateSlug('Tinta Acrílica Branca 18L'),
      sku: 'TIN-001',
      price: 139.90,
      originalPrice: 179.90,
      description: 'Tinta acrílica premium lavável 18 litros. Alto rendimento, secagem rápida, acabamento fosco.',
      shortDesc: 'Tinta acrílica premium lavável 18L',
      isOffer: true,
      isFeatured: true,
      discount: 22,
      stock: 45,
      minStock: 10,
      weight: 18,
      categoryId: tintasCategory.id,
      images: {
        create: [
          { url: '/images/products/tinta-acrilica-01.jpg', alt: 'Tinta Acrílica Branca', order: 1, isPrimary: true },
        ],
      },
    },
  });
  products.push(tinta1);

  const esmalte1 = await prisma.product.create({
    data: {
      name: 'Tinta Esmalte Sintético 900ml',
      slug: generateSlug('Tinta Esmalte Sintético 900ml'),
      sku: 'TIN-002',
      price: 42.90,
      description: 'Esmalte sintético brilhante diversas cores. Proteção e beleza para madeiras e metais.',
      shortDesc: 'Esmalte sintético brilhante',
      stock: 85,
      weight: 1,
      categoryId: tintasCategory.id,
      images: {
        create: [
          { url: '/images/products/esmalte-01.jpg', alt: 'Esmalte Sintético', order: 1, isPrimary: true },
        ],
      },
    },
  });
  products.push(esmalte1);

  const verniz1 = await prisma.product.create({
    data: {
      name: 'Verniz Marítimo 900ml',
      slug: generateSlug('Verniz Marítimo 900ml'),
      sku: 'TIN-003',
      price: 54.90,
      description: 'Verniz marítimo para madeira, alta proteção contra intempéries.',
      shortDesc: 'Verniz marítimo alta proteção',
      isNew: true,
      stock: 40,
      weight: 1,
      categoryId: tintasCategory.id,
      images: {
        create: [
          { url: '/images/products/verniz-01.jpg', alt: 'Verniz Marítimo', order: 1, isPrimary: true },
        ],
      },
    },
  });
  products.push(verniz1);

  const rolo1 = await prisma.product.create({
    data: {
      name: 'Rolo de Pintura 23cm',
      slug: generateSlug('Rolo de Pintura 23cm'),
      sku: 'TIN-004',
      price: 12.90,
      description: 'Rolo de lã para pintura de paredes, alta absorção e rendimento.',
      shortDesc: 'Rolo de lã para pintura',
      stock: 120,
      weight: 0.15,
      categoryId: tintasCategory.id,
      images: {
        create: [
          { url: '/images/products/rolo-01.jpg', alt: 'Rolo de Pintura', order: 1, isPrimary: true },
        ],
      },
    },
  });
  products.push(rolo1);

  const pinceis1 = await prisma.product.create({
    data: {
      name: 'Kit Pincéis 5 Peças',
      slug: generateSlug('Kit Pincéis 5 Peças'),
      sku: 'TIN-005',
      price: 24.90,
      description: 'Kit com 5 pincéis de diversos tamanhos para pintura e acabamento.',
      shortDesc: 'Kit 5 pincéis tamanhos variados',
      stock: 70,
      weight: 0.3,
      categoryId: tintasCategory.id,
      images: {
        create: [
          { url: '/images/products/pinceis-01.jpg', alt: 'Kit Pincéis', order: 1, isPrimary: true },
        ],
      },
    },
  });
  products.push(pinceis1);

  // Materiais Elétricos
  const fio1 = await prisma.product.create({
    data: {
      name: 'Fio Flexível 2,5mm 100m',
      slug: generateSlug('Fio Flexível 2,5mm 100m'),
      sku: 'ELE-001',
      price: 89.90,
      originalPrice: 109.90,
      description: 'Fio flexível de cobre 2,5mm² rolo 100m. Isolamento em PVC, alta qualidade.',
      shortDesc: 'Fio flexível cobre 2,5mm² 100m',
      isOffer: true,
      discount: 18,
      stock: 65,
      minStock: 10,
      weight: 10,
      categoryId: eletricosCategory.id,
      images: {
        create: [
          { url: '/images/products/fio-01.jpg', alt: 'Fio Flexível', order: 1, isPrimary: true },
        ],
      },
    },
  });
  products.push(fio1);

  const tomada1 = await prisma.product.create({
    data: {
      name: 'Tomada 2P+T 10A',
      slug: generateSlug('Tomada 2P+T 10A'),
      sku: 'ELE-002',
      price: 8.90,
      description: 'Tomada padrão brasileiro 2P+T 10A, branca.',
      shortDesc: 'Tomada padrão brasileiro 10A',
      stock: 200,
      weight: 0.05,
      categoryId: eletricosCategory.id,
      images: {
        create: [
          { url: '/images/products/tomada-01.jpg', alt: 'Tomada 2P+T', order: 1, isPrimary: true },
        ],
      },
    },
  });
  products.push(tomada1);

  const disjuntor1 = await prisma.product.create({
    data: {
      name: 'Disjuntor Bipolar 32A',
      slug: generateSlug('Disjuntor Bipolar 32A'),
      sku: 'ELE-003',
      price: 28.90,
      description: 'Disjuntor termomagnético bipolar 32A, proteção contra sobrecarga e curto-circuito.',
      shortDesc: 'Disjuntor termomagnético 32A',
      stock: 80,
      weight: 0.2,
      categoryId: eletricosCategory.id,
      images: {
        create: [
          { url: '/images/products/disjuntor-01.jpg', alt: 'Disjuntor Bipolar', order: 1, isPrimary: true },
        ],
      },
    },
  });
  products.push(disjuntor1);

  const interruptor1 = await prisma.product.create({
    data: {
      name: 'Interruptor Simples',
      slug: generateSlug('Interruptor Simples'),
      sku: 'ELE-004',
      price: 6.90,
      description: 'Interruptor simples 10A branco, alta durabilidade.',
      shortDesc: 'Interruptor simples 10A branco',
      stock: 150,
      weight: 0.03,
      categoryId: eletricosCategory.id,
      images: {
        create: [
          { url: '/images/products/interruptor-01.jpg', alt: 'Interruptor Simples', order: 1, isPrimary: true },
        ],
      },
    },
  });
  products.push(interruptor1);

  const lampada1 = await prisma.product.create({
    data: {
      name: 'Lâmpada LED 12W',
      slug: generateSlug('Lâmpada LED 12W'),
      sku: 'ELE-005',
      price: 14.90,
      description: 'Lâmpada LED bulbo 12W luz branca, economia de energia.',
      shortDesc: 'Lâmpada LED 12W econômica',
      isNew: true,
      stock: 180,
      weight: 0.05,
      categoryId: eletricosCategory.id,
      images: {
        create: [
          { url: '/images/products/lampada-01.jpg', alt: 'Lâmpada LED', order: 1, isPrimary: true },
        ],
      },
    },
  });
  products.push(lampada1);

  const quadro1 = await prisma.product.create({
    data: {
      name: 'Quadro de Distribuição 12 Disjuntores',
      slug: generateSlug('Quadro de Distribuição 12 Disjuntores'),
      sku: 'ELE-006',
      price: 89.90,
      originalPrice: 119.90,
      description: 'Quadro de distribuição para 12 disjuntores, com barramento e porta.',
      shortDesc: 'Quadro distribuição 12 disjuntores',
      isOffer: true,
      discount: 25,
      stock: 30,
      minStock: 5,
      weight: 2,
      categoryId: eletricosCategory.id,
      images: {
        create: [
          { url: '/images/products/quadro-01.jpg', alt: 'Quadro de Distribuição', order: 1, isPrimary: true },
        ],
      },
    },
  });
  products.push(quadro1);

  // Hidráulica
  const tubo1 = await prisma.product.create({
    data: {
      name: 'Tubo PVC 100mm 6m',
      slug: generateSlug('Tubo PVC 100mm 6m'),
      sku: 'HID-001',
      price: 45.90,
      description: 'Tubo PVC esgoto 100mm 6 metros, alta resistência.',
      shortDesc: 'Tubo PVC esgoto 100mm 6m',
      stock: 60,
      weight: 8,
      categoryId: hidraulicaCategory.id,
      images: {
        create: [
          { url: '/images/products/tubo-01.jpg', alt: 'Tubo PVC 100mm', order: 1, isPrimary: true },
        ],
      },
    },
  });
  products.push(tubo1);

  console.log(`✅ Created ${products.length} products with images`);
  console.log('🎉 Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
