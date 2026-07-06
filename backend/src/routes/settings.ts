import { Router } from 'express';
import { prisma } from '../prisma';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const settings = await prisma.settings.findFirst();
    if (!settings) {
      const newSettings = await prisma.settings.create({
        data: { dailyQuota: 40, minNewEmails: 20 }
      });
      return res.json(newSettings);
    }
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

router.post('/', async (req, res) => {
  const { dailyQuota, minNewEmails } = req.body;
  try {
    let settings = await prisma.settings.findFirst();
    if (settings) {
      settings = await prisma.settings.update({
        where: { id: settings.id },
        data: { dailyQuota: parseInt(dailyQuota), minNewEmails: parseInt(minNewEmails) }
      });
    } else {
      settings = await prisma.settings.create({
        data: { dailyQuota: parseInt(dailyQuota), minNewEmails: parseInt(minNewEmails) }
      });
    }
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

export default router;
