import { Router } from 'express';
import { prisma } from '../prisma';
import { syncLeadsFromSheet, getSpreadsheetTitle } from '../services/sheets';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const strategies = await prisma.strategy.findMany({
      include: { 
        _count: { select: { leads: true } },
        templates: true,
        emailAccount: true
      }
    });

    const settings = await prisma.settings.findFirst();
    const dailyQuota = settings?.dailyQuota || 40;

    const enhanced = await Promise.all(strategies.map(async (strat) => {
      const totalSent = await prisma.emailLog.count({
        where: { lead: { strategyId: strat.id } }
      });
      
      const activeLeadsCount = await prisma.lead.count({
        where: { strategyId: strat.id, status: { not: 'DELETED' } }
      });
      
      const uniqueStagesCount = new Set(strat.templates.map((t: any) => t.stage)).size;
      const maxEmails = activeLeadsCount * uniqueStagesCount;
      
      const remaining = Math.max(0, maxEmails - totalSent);
      const volumeDays = Math.ceil(remaining / dailyQuota);
      let funnelDays = 0;
      if (uniqueStagesCount === 2) funnelDays = 4;
      if (uniqueStagesCount === 3) funnelDays = 8;
      if (uniqueStagesCount >= 4) funnelDays = 14;
      const daysLeft = remaining > 0 ? Math.max(volumeDays, funnelDays) : 0;
      
      const percent = maxEmails > 0 ? Math.round((totalSent / maxEmails) * 100) : 0;
      
      return {
        ...strat,
        activeLeadsCount,
        progress: {
          totalSent,
          maxEmails,
          daysLeft,
          percent
        }
      };
    }));

    res.json(enhanced);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  const { name, googleSheetId, templates, emailAccountId } = req.body;
  
  // Clean up sheet ID in case they pasted the whole URL
  let finalSheetId = googleSheetId;
  if (finalSheetId.includes('/d/')) {
    finalSheetId = finalSheetId.split('/d/')[1].split('/')[0];
  }

  try {
    const strategy = await prisma.strategy.create({
      data: {
        name,
        googleSheetId: finalSheetId,
        status: 'RUNNING',
        emailAccountId: emailAccountId || null,
        templates: {
          create: templates
        }
      }
    });

    // Automatically sync leads immediately
    const syncResult = await syncLeadsFromSheet(strategy.id);

    res.json({ strategy, syncResult });
  } catch (error: any) {
    console.error('Strategy creation error:', error);
    res.status(500).json({ error: error.message || 'Failed to create strategy' });
  }
});

// Existing post route
router.post('/', async (req, res) => {
// ...
});

router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const strategy = await prisma.strategy.findUnique({
      where: { id },
      include: {
        templates: {
          orderBy: { createdAt: 'asc' }
        },
      }
    });

    if (!strategy) return res.status(404).json({ error: 'Not found' });

    // Fetch Funnel Stats
    const totalLeads = await prisma.lead.count({ where: { strategyId: id, status: { not: 'DELETED' } } });
    const repliedLeads = await prisma.lead.count({ where: { strategyId: id, status: 'REPLIED' } });
    const bouncedLeads = await prisma.lead.count({ where: { strategyId: id, status: 'BOUNCED' } });
    const completedLeads = await prisma.lead.count({ where: { strategyId: id, status: 'COMPLETED' } });
    
    // Actually, "Sent" means how many unique leads have received at least 1 email.
    // We can count leads where currentStage != 'NONE'
    const sentLeads = await prisma.lead.count({ where: { strategyId: id, currentStage: { not: 'NONE' }, status: { not: 'DELETED' } } });
    
    // We don't have tracking pixel yet, so Opened is 0
    const openedLeads = 0;

    // Queue Preview for tomorrow
    const settings = await prisma.settings.findFirst();
    const dailyQuota = settings?.dailyQuota || 40;
    const minNewEmails = settings?.minNewEmails || 20;
    const followUpLeads = await prisma.lead.findMany({
      where: { strategyId: id, status: 'IN_PROGRESS', nextFollowUpDate: { lte: new Date() } },
      orderBy: { currentStage: 'desc' },
      take: dailyQuota - minNewEmails,
    });
    const newLeads = await prisma.lead.count({ where: { strategyId: id, status: 'PENDING' } });
    const newToSend = Math.min(newLeads, minNewEmails + (dailyQuota - minNewEmails - followUpLeads.length));
    
    const queuePreview = {
      total: followUpLeads.length + newToSend,
      new: newToSend,
      fu1: followUpLeads.filter(l => l.currentStage === 'INITIAL').length,
      fu2: followUpLeads.filter(l => l.currentStage === 'FOLLOW_UP_1').length,
      fu3: followUpLeads.filter(l => l.currentStage === 'FOLLOW_UP_2').length,
    };

    // Calculate Template Performance
    const templateStats = await Promise.all(strategy.templates.map(async (t) => {
      const sentCount = await prisma.emailLog.count({ where: { templateId: t.id } });
      const replyCount = await prisma.emailLog.count({ where: { templateId: t.id, lead: { status: 'REPLIED' } } }); // Rough estimate
      
      return {
        ...t,
        sent: sentCount,
        openRate: '0%', // Placeholder until tracking pixel
        replyRate: sentCount > 0 ? `${Math.round((replyCount / sentCount) * 100)}%` : '0%',
        bounceRate: '0%',
        clickRate: '0%'
      };
    }));

    // Fetch paginated leads (just first 50 for now)
    const leadsList = await prisma.lead.findMany({
      where: { strategyId: id, status: { not: 'DELETED' } },
      take: 50,
      orderBy: { createdAt: 'asc' }
    });

    const totalSent = templateStats.reduce((sum, t) => sum + t.sent, 0);
    
    // Count unique stages instead of raw template length, so A/B testing variants aren't double counted per lead
    const uniqueStagesCount = new Set(strategy.templates.map((t: any) => t.stage)).size;
    const maxEmails = totalLeads * uniqueStagesCount;
    
    const remaining = Math.max(0, maxEmails - totalSent);
    const volumeDays = Math.ceil(remaining / dailyQuota);
    let funnelDays = 0;
    if (uniqueStagesCount === 2) funnelDays = 4;
    if (uniqueStagesCount === 3) funnelDays = 8;
    if (uniqueStagesCount >= 4) funnelDays = 14;
    const daysLeft = remaining > 0 ? Math.max(volumeDays, funnelDays) : 0;
    
    const percent = maxEmails > 0 ? Math.round((totalSent / maxEmails) * 100) : 0;
    const progress = { totalSent, maxEmails, daysLeft, percent };

    const sheetName = await getSpreadsheetTitle(strategy.googleSheetId);

    res.json({
      strategy,
      sheetName,
      progress,
      funnel: {
        imported: totalLeads,
        sent: sentLeads,
        opened: openedLeads,
        replies: repliedLeads,
        closed: completedLeads,
        bounced: bouncedLeads
      },
      queuePreview,
      templateStats,
      leads: leadsList
    });

  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch strategy details' });
  }
});

router.post('/:id/sync', async (req, res) => {
  const { id } = req.params;
  try {
    const syncResult = await syncLeadsFromSheet(id);
    res.json({ success: true, added: syncResult.added });
  } catch (error: any) {
    console.error('Manual sync error:', error);
    res.status(500).json({ error: 'Failed to sync leads from Google Sheet' });
  }
});

router.post('/:id/toggle', async (req, res) => {
  const { id } = req.params;
  try {
    const strategy = await prisma.strategy.findUnique({ where: { id } });
    if (!strategy) return res.status(404).json({ error: 'Not found' });
    
    const newStatus = strategy.status === 'RUNNING' ? 'PAUSED' : 'RUNNING';
    await prisma.strategy.update({
      where: { id },
      data: { status: newStatus }
    });
    res.json({ success: true, status: newStatus });
  } catch (error) {
    res.status(500).json({ error: 'Failed to toggle strategy' });
  }
});

router.put('/:id/email-account', async (req, res) => {
  const { id } = req.params;
  const { emailAccountId } = req.body;
  try {
    const updated = await prisma.strategy.update({
      where: { id },
      data: { emailAccountId }
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update email account' });
  }
});

router.put('/:id/templates/:templateId', async (req, res) => {
  const { id, templateId } = req.params;
  const { subject, body } = req.body;
  try {
    const updated = await prisma.template.update({
      where: { id: templateId, strategyId: id },
      data: { subject, body }
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update template' });
  }
});

router.post('/:id/templates', async (req, res) => {
  const { id } = req.params;
  const { stage, subject, body } = req.body;
  try {
    const newTemplate = await prisma.template.create({
      data: {
        strategyId: id,
        stage,
        subject,
        body
      }
    });
    res.json(newTemplate);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create template variant' });
  }
});

router.delete('/:id/templates/:templateId', async (req, res) => {
  const { id, templateId } = req.params;
  try {
    // Delete logs referencing this template first
    await prisma.emailLog.deleteMany({ where: { templateId } });
    await prisma.template.delete({
      where: { id: templateId, strategyId: id }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete template variant' });
  }
});

router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    // Delete cascading dependencies first due to foreign keys
    const leads = await prisma.lead.findMany({ where: { strategyId: id } });
    const leadIds = leads.map((l: any) => l.id);
    
    await prisma.emailLog.deleteMany({ where: { leadId: { in: leadIds } } });
    await prisma.lead.deleteMany({ where: { strategyId: id } });
    await prisma.template.deleteMany({ where: { strategyId: id } });
    await prisma.strategy.delete({ where: { id } });
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete strategy' });
  }
});

export default router;
