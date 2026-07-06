import { prisma } from './src/prisma';

async function main() {
  const activeStrategies = await prisma.strategy.findMany({
    where: { status: 'RUNNING' },
    include: {
      _count: {
        select: { leads: true }
      }
    }
  });

  const totalStrategies = await prisma.strategy.count();

  console.log(`\n========================================`);
  console.log(`TOTAL STRATEGIES IN DATABASE: ${totalStrategies}`);
  console.log(`ACTIVE (RUNNING) STRATEGIES: ${activeStrategies.length}`);
  console.log(`========================================\n`);

  if (activeStrategies.length > 0) {
    console.log(`Active Strategy Details:`);
    activeStrategies.forEach(s => {
      console.log(`- "${s.name}" (ID: ${s.id.slice(0,8)}... | Leads: ${s._count.leads})`);
    });
  }
}

main().finally(() => prisma.$disconnect());
