import { prisma } from './src/prisma'; 
async function main() { 
  const newLeads = await prisma.lead.count({ where: { status: 'PENDING', strategy: { status: 'RUNNING' } } }); 
  const fuLeads = await prisma.lead.count({ where: { status: 'IN_PROGRESS', nextFollowUpDate: { lte: new Date() }, strategy: { status: 'RUNNING' } } }); 
  console.log(`New Leads: ${newLeads}, Follow-ups: ${fuLeads}, Total: ${newLeads + fuLeads}`); 
} 
main().finally(() => prisma.$disconnect());
