import { scanInboxForReplies } from './src/services/inboxScanner';
import { prisma } from './src/prisma';

async function main() {
  console.log('Triggering manual inbox scan...');
  await scanInboxForReplies();
  
  const totalReplies = await prisma.lead.count({ where: { status: 'REPLIED' } });
  console.log(`Scan finished. Total Replies in DB: ${totalReplies}`);
}

main().catch(console.error).finally(() => process.exit(0));
