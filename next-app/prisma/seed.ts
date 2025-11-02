import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding...');

  // Create sample products
  const products = [
    {
      name: 'Basic Plan',
      description: 'Perfect for getting started',
      price: 100000, // 1000 JPY in cents
      currency: 'jpy',
      active: true,
    },
    {
      name: 'Pro Plan',
      description: 'Best for professionals',
      price: 300000, // 3000 JPY in cents
      currency: 'jpy',
      active: true,
    },
    {
      name: 'Enterprise Plan',
      description: 'For large organizations',
      price: 500000, // 5000 JPY in cents
      currency: 'jpy',
      active: true,
    },
  ];

  for (const product of products) {
    const createdProduct = await prisma.product.create({
      data: product,
    });
    console.log(`Created product: ${createdProduct.name}`);
  }

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
