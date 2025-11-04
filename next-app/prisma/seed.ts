import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding...');

  // Create sample products
  const products = [
    {
      name: 'Basic Plan',
      description: 'Perfect for getting started',
      price: 1000, 
      currency: 'jpy',
      active: true,
    },
    {
      name: 'Pro Plan',
      description: 'Best for professionals',
      price: 3000, 
      currency: 'jpy',
      active: true,
    },
    {
      name: 'Enterprise Plan',
      description: 'For large organizations',
      price: 5000, 
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

  // Create sample subscription plans
  const subscriptionPlans = [
    {
      name: 'Basic Monthly',
      description: 'Perfect for getting started',
      price: 1000, 
      currency: 'jpy',
      interval: 'MONTH' as const,
      active: true,
    },
    {
      name: 'Pro Monthly',
      description: 'Best for professionals',
      price: 3000, 
      currency: 'jpy',
      interval: 'MONTH' as const,
      active: true,
    },
    {
      name: 'Enterprise Monthly',
      description: 'For large organizations',
      price: 5000, 
      currency: 'jpy',
      interval: 'MONTH' as const,
      active: true,
    },
    {
      name: 'Basic Yearly',
      description: 'Perfect for getting started (save 20%)',
      price: 9600, 
      currency: 'jpy',
      interval: 'YEAR' as const,
      active: true,
    },
    {
      name: 'Pro Yearly',
      description: 'Best for professionals (save 20%)',
      price: 28800, 
      currency: 'jpy',
      interval: 'YEAR' as const,
      active: true,
    },
    {
      name: 'Enterprise Yearly',
      description: 'For large organizations (save 20%)',
      price: 48000, 
      currency: 'jpy',
      interval: 'YEAR' as const,
      active: true,
    },
  ];

  for (const plan of subscriptionPlans) {
    const createdPlan = await prisma.subscriptionPlan.create({
      data: plan,
    });
    console.log(`Created subscription plan: ${createdPlan.name}`);
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
