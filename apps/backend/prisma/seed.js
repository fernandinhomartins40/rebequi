import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';
const prisma = new PrismaClient();
async function main() {
    console.log('🌱 Starting database seeding...');
    // Clear existing data (optional, for development)
    console.log('🗑️  Clearing existing data...');
    await prisma.productImage.deleteMany();
    await prisma.product.deleteMany();
    await prisma.category.deleteMany();
    await prisma.user.deleteMany();
    // ========== USERS ==========
    console.log('👤 Seeding users...');
    const adminPassword = await bcrypt.hash('Admin@123', 10);
    const customerPassword = await bcrypt.hash('Customer@123', 10);
    const admin = await prisma.user.create({
        data: {
            email: 'admin@rebequi.com',
            name: 'Administrador Rebequi',
            password: adminPassword,
            role: UserRole.ADMIN,
            isActive: true,
        },
    });
    const customer = await prisma.user.create({
        data: {
            email: 'cliente@example.com',
            name: 'João da Silva',
            password: customerPassword,
            role: UserRole.CUSTOMER,
            isActive: true,
        },
    });
    console.log(`✅ Created ${2} users`);
    // ========== CATEGORIES ==========
    console.log('📁 Seeding categories...');
    const categories = await Promise.all([
        prisma.category.create({
            data: {
                name: 'Ferramentas',
                slug: 'ferramentas',
                icon: 'Wrench',
                description: 'Ferramentas manuais e elétricas para construção e reforma',
                isActive: true,
            },
        }),
        prisma.category.create({
            data: {
                name: 'Tintas e Acessórios',
                slug: 'tintas-acessorios',
                icon: 'Paintbrush',
                description: 'Tintas, pincéis, rolos e acessórios de pintura',
                isActive: true,
            },
        }),
        prisma.category.create({
            data: {
                name: 'Cimento e Argamassa',
                slug: 'cimento-argamassa',
                icon: 'Package',
                description: 'Cimentos, argamassas e produtos para construção',
                isActive: true,
            },
        }),
        prisma.category.create({
            data: {
                name: 'Materiais Elétricos',
                slug: 'materiais-eletricos',
                icon: 'Zap',
                description: 'Fios, cabos, tomadas e materiais elétricos em geral',
                isActive: true,
            },
        }),
        prisma.category.create({
            data: {
                name: 'Hidráulica',
                slug: 'hidraulica',
                icon: 'Droplet',
                description: 'Tubos, conexões e materiais hidráulicos',
                isActive: true,
            },
        }),
        prisma.category.create({
            data: {
                name: 'Pisos e Revestimentos',
                slug: 'pisos-revestimentos',
                icon: 'Grid',
                description: 'Pisos, azulejos, porcelanatos e revestimentos',
                isActive: true,
            },
        }),
    ]);
    console.log(`✅ Created ${categories.length} categories`);
    // ========== PRODUCTS ==========
    console.log('🛒 Seeding products...');
    // Ferramentas
    await prisma.product.create({
        data: {
            name: 'Furadeira de Impacto 1/2" 650W Profissional',
            slug: 'furadeira-impacto-650w-profissional',
            sku: 'FER-FUR-001',
            price: 299.90,
            originalPrice: 399.90,
            shortDesc: 'Furadeira de impacto profissional com mandril de 1/2" e 650W de potência',
            description: 'Furadeira de impacto profissional com 650W de potência, mandril de 1/2", velocidade variável e reversível. Ideal para furar concreto, madeira e metal. Inclui maleta de transporte e jogo de brocas.',
            isOffer: true,
            isNew: false,
            isFeatured: true,
            discount: 25,
            stock: 15,
            minStock: 5,
            weight: 2.5,
            dimensions: '30x25x10 cm',
            categoryId: categories[0].id,
            isActive: true,
            images: {
                create: [
                    {
                        url: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=500',
                        alt: 'Furadeira de Impacto 650W - Vista Frontal',
                        order: 0,
                        isPrimary: true,
                    },
                    {
                        url: 'https://images.unsplash.com/photo-1572981779307-38b8cabb2407?w=500',
                        alt: 'Furadeira de Impacto 650W - Detalhe',
                        order: 1,
                        isPrimary: false,
                    },
                ],
            },
        },
    });
    await prisma.product.create({
        data: {
            name: 'Jogo de Chaves de Fenda 6 Peças com Cabo Emborrachado',
            slug: 'jogo-chaves-fenda-6-pecas',
            sku: 'FER-CHA-002',
            price: 45.90,
            shortDesc: 'Jogo profissional de chaves de fenda com 6 peças e cabo emborrachado',
            description: 'Jogo de chaves de fenda profissional com 6 peças, cabo emborrachado para melhor aderência e conforto, ponteiras magnéticas e aço cromo-vanádio de alta resistência.',
            isOffer: false,
            isNew: true,
            isFeatured: false,
            stock: 30,
            minStock: 10,
            weight: 0.8,
            categoryId: categories[0].id,
            isActive: true,
            images: {
                create: [
                    {
                        url: 'https://images.unsplash.com/photo-1530124566582-a618bc2615dc?w=500',
                        alt: 'Jogo de Chaves de Fenda 6 Peças',
                        order: 0,
                        isPrimary: true,
                    },
                ],
            },
        },
    });
    await prisma.product.create({
        data: {
            name: 'Parafusadeira e Furadeira 12V com 2 Baterias',
            slug: 'parafusadeira-furadeira-12v-2-baterias',
            sku: 'FER-PAR-003',
            price: 249.90,
            originalPrice: 319.90,
            shortDesc: 'Parafusadeira e furadeira 12V com 2 baterias de lítio e carregador bivolt',
            description: 'Kit completo com parafusadeira/furadeira 12V, 2 baterias de lítio, carregador bivolt, maleta e 20 acessórios. Ideal para montagem de móveis e trabalhos leves.',
            isOffer: true,
            isNew: true,
            isFeatured: true,
            discount: 22,
            stock: 20,
            minStock: 8,
            weight: 1.8,
            categoryId: categories[0].id,
            isActive: true,
            images: {
                create: [
                    {
                        url: 'https://images.unsplash.com/photo-1567016376408-0226e4d0c1ea?w=500',
                        alt: 'Parafusadeira 12V - Kit Completo',
                        order: 0,
                        isPrimary: true,
                    },
                ],
            },
        },
    });
    // Tintas
    await prisma.product.create({
        data: {
            name: 'Tinta Acrílica Premium Branca 18L Lavável',
            slug: 'tinta-acrilica-premium-branca-18l',
            sku: 'TIN-ACR-001',
            price: 189.90,
            originalPrice: 229.90,
            shortDesc: 'Tinta acrílica premium lavável com alto rendimento, balde de 18 litros',
            description: 'Tinta acrílica premium de alta qualidade, lavável, com excelente cobertura e rendimento de até 350m²/demão. Ideal para áreas internas. Secagem rápida em 2 horas. Acabamento fosco.',
            isOffer: true,
            isNew: false,
            isFeatured: true,
            discount: 17,
            stock: 50,
            minStock: 20,
            weight: 20.5,
            categoryId: categories[1].id,
            isActive: true,
            images: {
                create: [
                    {
                        url: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=500',
                        alt: 'Tinta Acrílica Branca 18L',
                        order: 0,
                        isPrimary: true,
                    },
                ],
            },
        },
    });
    await prisma.product.create({
        data: {
            name: 'Kit Pintura Profissional 5 Peças com Bandeja',
            slug: 'kit-pintura-profissional-5-pecas',
            sku: 'TIN-KIT-002',
            price: 69.90,
            shortDesc: 'Kit completo com 2 rolos, 2 pincéis e bandeja com reservatório',
            description: 'Kit de pintura profissional contendo 2 rolos de lã carneiro, 2 pincéis de diferentes tamanhos (2" e 3"), bandeja plástica com reservatório e cabo extensor telescópico.',
            isOffer: false,
            isNew: true,
            isFeatured: false,
            stock: 25,
            minStock: 10,
            weight: 1.2,
            categoryId: categories[1].id,
            isActive: true,
            images: {
                create: [
                    {
                        url: 'https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=500',
                        alt: 'Kit Pintura Profissional',
                        order: 0,
                        isPrimary: true,
                    },
                ],
            },
        },
    });
    await prisma.product.create({
        data: {
            name: 'Tinta Esmalte Sintético Brilhante Branco 3,6L',
            slug: 'tinta-esmalte-sintetico-branco-36l',
            sku: 'TIN-ESM-003',
            price: 89.90,
            shortDesc: 'Esmalte sintético brilhante para madeira e metal, galão de 3,6 litros',
            description: 'Esmalte sintético de alta qualidade com acabamento brilhante. Ideal para pintura de madeira, metal e alvenaria. Excelente resistência às intempéries. Secagem ao toque em 4 horas.',
            isOffer: false,
            isNew: false,
            isFeatured: false,
            stock: 35,
            minStock: 15,
            weight: 4.2,
            categoryId: categories[1].id,
            isActive: true,
            images: {
                create: [
                    {
                        url: 'https://images.unsplash.com/photo-1513467535987-fd81bc7d62f8?w=500',
                        alt: 'Tinta Esmalte Sintético Branco',
                        order: 0,
                        isPrimary: true,
                    },
                ],
            },
        },
    });
    // Cimento e Argamassa
    await prisma.product.create({
        data: {
            name: 'Cimento Portland CP II 50kg',
            slug: 'cimento-portland-cp2-50kg',
            sku: 'CIM-CIM-001',
            price: 32.90,
            shortDesc: 'Cimento Portland CP II de alta resistência para construção, saco de 50kg',
            description: 'Cimento Portland CP II de alta resistência, ideal para estruturas de concreto armado, alvenaria e argamassas. Conforme normas ABNT. Ensacamento automatizado.',
            isOffer: false,
            isNew: false,
            isFeatured: true,
            stock: 200,
            minStock: 50,
            weight: 50,
            categoryId: categories[2].id,
            isActive: true,
            images: {
                create: [
                    {
                        url: 'https://images.unsplash.com/photo-1581094271901-8022df4466f9?w=500',
                        alt: 'Cimento Portland 50kg',
                        order: 0,
                        isPrimary: true,
                    },
                ],
            },
        },
    });
    await prisma.product.create({
        data: {
            name: 'Argamassa Colante AC II Interior/Exterior 20kg',
            slug: 'argamassa-colante-ac2-20kg',
            sku: 'CIM-ARG-002',
            price: 24.90,
            originalPrice: 29.90,
            shortDesc: 'Argamassa colante AC II para pisos e azulejos, saco de 20kg',
            description: 'Argamassa colante AC II de alta aderência, ideal para assentamento de pisos cerâmicos, azulejos e pastilhas em áreas internas e externas. Rendimento de 5kg/m².',
            isOffer: true,
            isNew: false,
            isFeatured: false,
            discount: 17,
            stock: 100,
            minStock: 30,
            weight: 20,
            categoryId: categories[2].id,
            isActive: true,
            images: {
                create: [
                    {
                        url: 'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=500',
                        alt: 'Argamassa Colante AC II 20kg',
                        order: 0,
                        isPrimary: true,
                    },
                ],
            },
        },
    });
    // Materiais Elétricos
    await prisma.product.create({
        data: {
            name: 'Fio Elétrico Flexível 2,5mm² Rolo 100m',
            slug: 'fio-eletrico-flexivel-25mm-100m',
            sku: 'ELE-FIO-001',
            price: 159.90,
            shortDesc: 'Fio elétrico flexível de cobre 2,5mm², rolo com 100 metros',
            description: 'Fio elétrico flexível de cobre estanhado, seção 2,5mm², isolação em PVC antichama, rolo com 100 metros. Ideal para instalações elétricas residenciais e comerciais. Conforme NBR NM 247-3.',
            isOffer: false,
            isNew: true,
            isFeatured: false,
            stock: 40,
            minStock: 15,
            weight: 8.5,
            categoryId: categories[3].id,
            isActive: true,
            images: {
                create: [
                    {
                        url: 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=500',
                        alt: 'Fio Elétrico 2,5mm 100m',
                        order: 0,
                        isPrimary: true,
                    },
                ],
            },
        },
    });
    await prisma.product.create({
        data: {
            name: 'Disjuntor Termomagnético Monopolar 32A',
            slug: 'disjuntor-monopolar-32a',
            sku: 'ELE-DIS-002',
            price: 18.90,
            shortDesc: 'Disjuntor termomagnético monopolar 32A para quadro de distribuição',
            description: 'Disjuntor termomagnético monopolar de 32A, curva C, ideal para proteção de circuitos elétricos residenciais e comerciais. Conforme NBR NM 60898.',
            isOffer: false,
            isNew: false,
            isFeatured: false,
            stock: 60,
            minStock: 20,
            weight: 0.15,
            categoryId: categories[3].id,
            isActive: true,
            images: {
                create: [
                    {
                        url: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=500',
                        alt: 'Disjuntor Monopolar 32A',
                        order: 0,
                        isPrimary: true,
                    },
                ],
            },
        },
    });
    console.log('✅ Created products with images');
    // Count totals
    const totalUsers = await prisma.user.count();
    const totalCategories = await prisma.category.count();
    const totalProducts = await prisma.product.count();
    const totalImages = await prisma.productImage.count();
    console.log('\n📊 Database seeding completed successfully!');
    console.log(`   👤 Users: ${totalUsers}`);
    console.log(`   📁 Categories: ${totalCategories}`);
    console.log(`   🛒 Products: ${totalProducts}`);
    console.log(`   🖼️  Product Images: ${totalImages}`);
    console.log('\n🔐 Admin credentials:');
    console.log('   Email: admin@rebequi.com');
    console.log('   Password: Admin@123');
    console.log('\n👥 Customer credentials:');
    console.log('   Email: cliente@example.com');
    console.log('   Password: Customer@123');
}
main()
    .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map