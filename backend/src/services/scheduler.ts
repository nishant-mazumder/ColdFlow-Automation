import { prisma } from '../prisma';
import { sendEmail } from './email';
import { scanInboxForReplies } from './inboxScanner';

// [Orchestrator Agent]: The Brain of the system. Autonomously calculates the perfect mathematical balance
// for daily sending quotas, dynamically combining brand new leads with scheduled follow-ups.
export async function processQueue() {
  // 0. Pre-Flight Check: Scan Gmail for any new replies or bounces
  await scanInboxForReplies();

  const settings = await prisma.settings.findFirst();
  const dailyQuota = settings?.dailyQuota || 40;
  const minNewEmails = settings?.minNewEmails || 20;

  // 1. Fetch leads that need follow-ups
  const followUpLeads = await prisma.lead.findMany({
    where: {
      status: 'IN_PROGRESS',
      nextFollowUpDate: { lte: new Date() },
      strategy: { status: 'RUNNING' }
    },
    orderBy: { currentStage: 'desc' }, 
    take: Math.max(0, dailyQuota - minNewEmails),
  });

  // 2. Fetch brand new leads
  const newLeads = await prisma.lead.findMany({
    where: { status: 'PENDING', strategy: { status: 'RUNNING' } },
    orderBy: { createdAt: 'asc' },
    take: Math.max(0, minNewEmails + (dailyQuota - minNewEmails - followUpLeads.length)),
  });

  const totalToSend = [...followUpLeads, ...newLeads];
  
  if (totalToSend.length === 0) {
    console.log('No emails to send today.');
    return { sent: 0, total: 0 };
  }
  
  // 3. Initialize Live Queue in DB
  const TIME_PER_EMAIL_MS = 180000; // 3 minutes
  const expectedWaitTime = Math.max(0, (totalToSend.length - 1) * TIME_PER_EMAIL_MS);
  const expectedEndTime = new Date(Date.now() + expectedWaitTime);

  let sentCount = 0;
  let failedCount = 0;

  // Clear previous queues for safety
  await prisma.queueStatus.deleteMany({});
  
  const queueStatus = await prisma.queueStatus.create({
    data: {
      emailsTotal: totalToSend.length,
      expectedEndTime: expectedEndTime,
      breakdown: JSON.stringify({
        new: newLeads.length,
        fu1: followUpLeads.filter(l => l.currentStage === 'INITIAL').length,
        fu2: followUpLeads.filter(l => l.currentStage === 'FOLLOW_UP_1').length,
        fu3: followUpLeads.filter(l => l.currentStage === 'FOLLOW_UP_2').length,
      })
    }
  });

  // 4. [Delivery Engine Agent]: Takes over in a persistent background thread. 
  // Bypasses spam filters using strict sleep-delays and autonomously manages A/B Testing.
  (async () => {
    console.log(`Processing queue: Sending ${totalToSend.length} emails. Estimated completion: ${expectedEndTime}`);

  for (const lead of totalToSend) {
    try {
      // 0. EMERGENCY STOP CHECK
      const currentQueue = await prisma.queueStatus.findUnique({ where: { id: queueStatus.id } });
      if (currentQueue?.status === 'STOPPED') {
        console.log('Emergency Stop triggered. Aborting Live Queue.');
        break;
      }

      // Determine which template to send based on current stage
      let targetStage = 'INITIAL';
      if (lead.currentStage === 'INITIAL') targetStage = 'FOLLOW_UP_1';
      else if (lead.currentStage === 'FOLLOW_UP_1') targetStage = 'FOLLOW_UP_2';
      else if (lead.currentStage === 'FOLLOW_UP_2') targetStage = 'FOLLOW_UP_3';

      const templates = await prisma.template.findMany({
        where: { strategyId: lead.strategyId, stage: targetStage, status: 'ACTIVE' }
      });

      if (templates.length === 0) {
        console.log(`No template found for stage ${targetStage}`);
        continue;
      }

      let selectedTemplate = templates[0];
      
      if (templates.length > 1) {
        // Use an efficient round-robin approach for A/B testing distribution
        selectedTemplate = templates[sentCount % templates.length];
      }

      // Send Email (this internal function handles the EmailLog creation)
      const threadId = await sendEmail(lead.id, selectedTemplate.id);

      // Update lead
      const nextDate = new Date();
      nextDate.setDate(nextDate.getDate() + (targetStage === 'INITIAL' ? 3 : targetStage === 'FOLLOW_UP_1' ? 4 : 7));
      
      await prisma.lead.update({
        where: { id: lead.id },
        data: {
          status: targetStage === 'FOLLOW_UP_3' ? 'COMPLETED' : 'IN_PROGRESS',
          currentStage: targetStage,
          threadId: threadId,
          nextFollowUpDate: targetStage === 'FOLLOW_UP_3' ? null : nextDate,
        }
      });

      sentCount++;
      
      // Update Live Queue Status
      await prisma.queueStatus.update({
        where: { id: queueStatus.id },
        data: { emailsSent: sentCount }
      });
      
      // Delay 2.5 minutes between sends to prevent spam filters
      if (sentCount < totalToSend.length) {
        await new Promise(resolve => setTimeout(resolve, TIME_PER_EMAIL_MS));
      }
    } catch (e: any) {
      console.error(`Failed to send email to ${lead.email}:`, e);
      failedCount++;
      
      await prisma.queueStatus.update({
        where: { id: queueStatus.id },
        data: { emailsFailed: failedCount }
      });
    }
  }

  // Check final status before marking as completed
  const finalQueue = await prisma.queueStatus.findUnique({ where: { id: queueStatus.id } });
  
  const wasStopped = finalQueue?.status === 'STOPPED';
  
  if (!wasStopped) {
    await prisma.queueStatus.update({
      where: { id: queueStatus.id },
      data: { status: 'COMPLETED' }
    });
  }

    // Create Notification
    await prisma.notification.create({
      data: {
        title: wasStopped ? 'Live Queue Stopped' : 'Live Queue Completed',
        message: `The queue has finished. ${sentCount} emails were successfully sent, and ${failedCount} emails failed or bounced.`,
        type: failedCount > 0 ? (sentCount === 0 ? 'ERROR' : 'WARNING') : 'SUCCESS'
      }
    });
  })().catch(console.error);

  return { queue: queueStatus, sent: 0, total: totalToSend.length };
}
