import { Router } from 'express';
import { prisma } from '../prisma';

const router = Router();

router.get('/stats', async (req, res) => {
  try {
    const activeStrategies = await prisma.strategy.count({ where: { status: 'RUNNING' } });
    const totalReplies = await prisma.lead.count({ where: { status: 'REPLIED' } });
    
    const activeQueue = await prisma.queueStatus.findFirst({
      orderBy: { startedAt: 'desc' }
    });

    const settings = await prisma.settings.findFirst();
    const dailyQuota = settings?.dailyQuota || 40;
    const minNewEmails = settings?.minNewEmails || 20;

    const followUpLeads = await prisma.lead.findMany({
      where: { status: 'IN_PROGRESS', nextFollowUpDate: { lte: new Date() }, strategy: { status: 'RUNNING' } },
      orderBy: { currentStage: 'desc' },
      take: Math.max(0, dailyQuota - minNewEmails),
      include: { strategy: true }
    });
    
    const newLeads = await prisma.lead.findMany({
      where: { status: 'PENDING', strategy: { status: 'RUNNING' } },
      orderBy: { createdAt: 'asc' },
      take: Math.max(0, minNewEmails + (dailyQuota - minNewEmails - followUpLeads.length)),
      include: { strategy: true }
    });

    const byStrategy: Record<string, { new: number, fu1: number, fu2: number, fu3: number }> = {};
    
    [...newLeads, ...followUpLeads].forEach(lead => {
      const sName = lead.strategy.name;
      if (!byStrategy[sName]) byStrategy[sName] = { new: 0, fu1: 0, fu2: 0, fu3: 0 };
      
      if (lead.status === 'PENDING') byStrategy[sName].new++;
      else if (lead.currentStage === 'INITIAL') byStrategy[sName].fu1++;
      else if (lead.currentStage === 'FOLLOW_UP_1') byStrategy[sName].fu2++;
      else if (lead.currentStage === 'FOLLOW_UP_2') byStrategy[sName].fu3++;
    });
    
    res.json({
      activeStrategies,
      totalReplies,
      queue: {
        total: followUpLeads.length + newLeads.length,
        new: newLeads.length,
        fu1: followUpLeads.filter(l => l.currentStage === 'INITIAL').length,
        fu2: followUpLeads.filter(l => l.currentStage === 'FOLLOW_UP_1').length,
        fu3: followUpLeads.filter(l => l.currentStage === 'FOLLOW_UP_2').length,
        byStrategy
      },
      liveQueue: activeQueue
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

import { processQueue } from '../services/scheduler';

router.post('/approve', async (req, res) => {
  try {
    // The scheduler now handles initialization synchronously and backgrounds the sending loop itself
    const result = await processQueue();
    res.json({ success: true, message: 'Queue is processing in the background', data: result });
  } catch (error) {
    res.status(500).json({ error: 'Failed to start queue' });
  }
});

router.post('/stop', async (req, res) => {
  try {
    const activeQueue = await prisma.queueStatus.findFirst({
      orderBy: { startedAt: 'desc' }
    });
    if (activeQueue && activeQueue.status === 'RUNNING') {
      await prisma.queueStatus.update({
        where: { id: activeQueue.id },
        data: { status: 'STOPPED' }
      });
      res.json({ success: true, message: 'Queue successfully stopped.' });
    } else {
      res.status(400).json({ error: 'No active queue running.' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to stop queue' });
  }
});

export default router;
