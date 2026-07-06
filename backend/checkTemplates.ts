import { prisma } from './src/prisma';

async function main() {
  const activeStrategy = await prisma.strategy.findFirst({
    where: { status: 'RUNNING' },
    include: {
      templates: {
        where: { stage: 'INITIAL' }
      }
    }
  });

  if (!activeStrategy) {
    console.log("No active strategy found.");
    return;
  }

  console.log(`\n========================================`);
  console.log(`INITIAL TEMPLATES FOR STRATEGY: "${activeStrategy.name}"`);
  console.log(`Total Initial Variants: ${activeStrategy.templates.length}`);
  console.log(`========================================\n`);

  activeStrategy.templates.forEach((t, i) => {
    console.log(`Variant ${i + 1}:`);
    console.log(`Subject: ${t.subject}`);
    console.log(`Status: ${t.status}`);
    console.log(`----------------------------------------`);
  });
}

main().finally(() => prisma.$disconnect());
