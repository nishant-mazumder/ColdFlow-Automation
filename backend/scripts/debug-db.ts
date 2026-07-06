import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const templates = await prisma.template.findMany();
  console.log('TEMPLATES IN DB:');
  templates.forEach(t => {
    console.log(`--- ID: ${t.id} | Subject: ${t.subject} ---`);
    console.log(JSON.stringify(t.body));
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
