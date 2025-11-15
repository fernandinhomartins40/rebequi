import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Clear existing data
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();

  // Create categories
  const categories = await Promise.all([
    prisma.category.create({
      data: {
        name: 'Cimento e Argamassa',
        slug: 'cimento-argamassa',
        icon: 'Package',
        description: 'Cimentos, argamassas e produtos para construção',
      },
    }),
    prisma.category.create({
      data: {
        name: 'Tijolos e Blocos',
        slug: 'tijolos-blocos',
        icon: 'Boxes',
        description: 'Tijolos, blocos e materiais para alvenaria',
      },
    }),
    prisma.category.create({
      data: {
        name: 'Ferramentas',
        slug: 'ferramentas',
        icon: 'Hammer',
        description: 'Ferramentas manuais e elétricas',
      },
    }),
    prisma.category.create({
      data: {
        name: 'Tintas',
        slug: 'tintas',
        icon: 'Paintbrush',
        description: 'Tintas, vernizes e acessórios para pintura',
      },
    }),
    prisma.category.create({
      data: {
        name: 'Materiais Elétricos',
        slug: 'materiais-eletricos',
        icon: 'Zap',
        description: 'Fios, cabos, tomadas e materiais elétricos',
      },
    }),
    prisma.category.create({
      data: {
        name: 'Hidráulica',
        slug: 'hidraulica',
        icon: 'Droplet',
        description: 'Tubos, conexões e materiais hidráulicos',
      },
    }),
    prisma.category.create({
      data: {
        name: 'Madeiras',
        slug: 'madeiras',
        icon: 'TreePine',
        description: 'Madeiras, compensados e derivados',
      },
    }),
    prisma.category.create({
      data: {
        name: 'Ferros e Metais',
        slug: 'ferros-metais',
        icon: 'Wrench',
        description: 'Ferros, aços e materiais metálicos',
      },
    }),
  ]);

  console.log(`✅ Created ${categories.length} categories`);

  // Get category IDs for reference
  const cimentoCategory = categories.find((c) => c.slug === 'cimento-argamassa')!;
  const ferramentasCategory = categories.find((c) => c.slug === 'ferramentas')!;
  const tintasCategory = categories.find((c) => c.slug === 'tintas')!;
  const eletricosCategory = categories.find((c) => c.slug === 'materiais-eletricos')!;

  // Create products
  const products = await Promise.all([
    // Cimento e Argamassa
    prisma.product.create({
      data: {
        name: 'Cimento Portland 50kg',
        price: 32.90,
        originalPrice: 39.90,
        image: '/placeholder.svg',
        description: 'Cimento Portland CP-II de alta qualidade para construção',
        isOffer: true,
        discount: 18,
        stock: 150,
        categoryId: cimentoCategory.id,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Argamassa AC-II 20kg',
        price: 18.90,
        originalPrice: 22.90,
        image: '/placeholder.svg',
        description: 'Argamassa colante para revestimentos cerâmicos',
        isOffer: true,
        discount: 17,
        stock: 200,
        categoryId: cimentoCategory.id,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Reboco Pronto 20kg',
        price: 24.90,
        image: '/placeholder.svg',
        description: 'Reboco pronto para uso interno e externo',
        isNew: true,
        stock: 80,
        categoryId: cimentoCategory.id,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Cal Hidratada 20kg',
        price: 15.90,
        image: '/placeholder.svg',
        description: 'Cal hidratada CH-I para argamassa e pintura',
        stock: 120,
        categoryId: cimentoCategory.id,
      },
    }),

    // Ferramentas
    prisma.product.create({
      data: {
        name: 'Furadeira de Impacto 650W',
        price: 189.90,
        originalPrice: 249.90,
        image: '/placeholder.svg',
        description: 'Furadeira de impacto profissional com maleta',
        isOffer: true,
        discount: 24,
        stock: 35,
        categoryId: ferramentasCategory.id,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Martelo de Unha 25mm',
        price: 29.90,
        image: '/placeholder.svg',
        description: 'Martelo de unha com cabo em fibra de vidro',
        stock: 60,
        categoryId: ferramentasCategory.id,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Jogo de Chaves Philips/Fenda',
        price: 45.90,
        image: '/placeholder.svg',
        description: 'Jogo com 6 chaves de fenda e philips',
        isNew: true,
        stock: 45,
        categoryId: ferramentasCategory.id,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Serra Circular 7.1/4" 1400W',
        price: 349.90,
        originalPrice: 429.90,
        image: '/placeholder.svg',
        description: 'Serra circular profissional para cortes precisos',
        isOffer: true,
        discount: 19,
        stock: 20,
        categoryId: ferramentasCategory.id,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Trena 5m',
        price: 19.90,
        image: '/placeholder.svg',
        description: 'Trena de aço 5 metros com trava',
        stock: 90,
        categoryId: ferramentasCategory.id,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Nível de Alumínio 40cm',
        price: 34.90,
        image: '/placeholder.svg',
        description: 'Nível de alumínio profissional 40cm',
        stock: 55,
        categoryId: ferramentasCategory.id,
      },
    }),

    // Tintas
    prisma.product.create({
      data: {
        name: 'Tinta Acrílica Branca 18L',
        price: 139.90,
        originalPrice: 179.90,
        image: '/placeholder.svg',
        description: 'Tinta acrílica premium lavável 18 litros',
        isOffer: true,
        discount: 22,
        stock: 45,
        categoryId: tintasCategory.id,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Tinta Esmalte Sintético 900ml',
        price: 42.90,
        image: '/placeholder.svg',
        description: 'Esmalte sintético brilhante diversas cores',
        stock: 85,
        categoryId: tintasCategory.id,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Verniz Marítimo 900ml',
        price: 54.90,
        image: '/placeholder.svg',
        description: 'Verniz marítimo para madeira',
        isNew: true,
        stock: 40,
        categoryId: tintasCategory.id,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Rolo de Pintura 23cm',
        price: 12.90,
        image: '/placeholder.svg',
        description: 'Rolo de lã para pintura de paredes',
        stock: 120,
        categoryId: tintasCategory.id,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Kit Pincéis 5 Peças',
        price: 24.90,
        image: '/placeholder.svg',
        description: 'Kit com 5 pincéis de diversos tamanhos',
        stock: 70,
        categoryId: tintasCategory.id,
      },
    }),

    // Materiais Elétricos
    prisma.product.create({
      data: {
        name: 'Fio Flexível 2,5mm 100m',
        price: 89.90,
        originalPrice: 109.90,
        image: '/placeholder.svg',
        description: 'Fio flexível de cobre 2,5mm² rolo 100m',
        isOffer: true,
        discount: 18,
        stock: 65,
        categoryId: eletricosCategory.id,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Tomada 2P+T 10A',
        price: 8.90,
        image: '/placeholder.svg',
        description: 'Tomada padrão brasileiro 2P+T 10A',
        stock: 200,
        categoryId: eletricosCategory.id,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Disjuntor Bipolar 32A',
        price: 28.90,
        image: '/placeholder.svg',
        description: 'Disjuntor termomagnético bipolar 32A',
        stock: 80,
        categoryId: eletricosCategory.id,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Interruptor Simples',
        price: 6.90,
        image: '/placeholder.svg',
        description: 'Interruptor simples 10A branco',
        stock: 150,
        categoryId: eletricosCategory.id,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Lâmpada LED 12W',
        price: 14.90,
        image: '/placeholder.svg',
        description: 'Lâmpada LED bulbo 12W luz branca',
        isNew: true,
        stock: 180,
        categoryId: eletricosCategory.id,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Quadro de Distribuição 12 Disjuntores',
        price: 89.90,
        originalPrice: 119.90,
        image: '/placeholder.svg',
        description: 'Quadro de distribuição para 12 disjuntores',
        isOffer: true,
        discount: 25,
        stock: 30,
        categoryId: eletricosCategory.id,
      },
    }),
  ]);

  console.log(`✅ Created ${products.length} products`);
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
