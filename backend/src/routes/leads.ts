import { Router } from 'express';
import { prisma } from '../prisma';

const router = Router();

// Get detailed lead history
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const lead = await prisma.lead.findUnique({
      where: { id },
      include: {
        EmailLog: {
          orderBy: { sentAt: 'desc' },
          include: { template: true }
        }
      }
    });
    if (!lead) return res.status(404).json({ error: 'Lead not found' });
    res.json(lead);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch lead' });
  }
});

// Perform manual action on lead
router.post('/:id/action', async (req, res) => {
  const { id } = req.params;
  const { action } = req.body; // 'SKIP', 'FORCE', 'COMPLETE', 'PAUSE', 'DELETE'

  try {
    const lead = await prisma.lead.findUnique({ where: { id } });
    if (!lead) return res.status(404).json({ error: 'Lead not found' });

    if (action === 'DELETE') {
      // Soft Delete: Keep the row so the Google Sheets sync remembers we already processed and deleted this lead
      await prisma.lead.update({ 
        where: { id },
        data: { status: 'DELETED' }
      });
      return res.json({ success: true, message: 'Lead deleted' });
    }

    let updateData: any = {};

    if (action === 'COMPLETE') {
      updateData = { status: 'COMPLETED', nextFollowUpDate: null };
    } else if (action === 'PAUSE') {
      updateData = { status: 'PAUSED', nextFollowUpDate: null };
    } else if (action === 'SKIP') {
      // Advance to next stage immediately
      if (lead.currentStage === 'INITIAL') updateData = { currentStage: 'FOLLOW_UP_1', nextFollowUpDate: new Date() };
      else if (lead.currentStage === 'FOLLOW_UP_1') updateData = { currentStage: 'FOLLOW_UP_2', nextFollowUpDate: new Date() };
      else if (lead.currentStage === 'FOLLOW_UP_2') updateData = { currentStage: 'FOLLOW_UP_3', nextFollowUpDate: new Date() };
    } else if (action === 'FORCE') {
      // Force schedule for today
      updateData = { nextFollowUpDate: new Date() };
    }

    const updated = await prisma.lead.update({
      where: { id },
      data: updateData
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update lead' });
  }
});

export default router;
