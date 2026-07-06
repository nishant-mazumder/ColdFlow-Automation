import { Router } from 'express';
import { prisma } from '../prisma';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const logs = await prisma.emailLog.findMany({
      orderBy: { sentAt: 'asc' }
    });

    // Helper to get local date string YYYY-MM-DD
    const toLocalDateStr = (date: Date) => {
      const tzOffset = date.getTimezoneOffset() * 60000;
      return new Date(date.getTime() - tzOffset).toISOString().split('T')[0];
    };

    // Group by Date (YYYY-MM-DD)
    const grouped: Record<string, { new: number, followUp: number }> = {};
    
    // Fill in last 7 days even if 0
    for(let i=0; i<7; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = toLocalDateStr(d);
      grouped[dateStr] = { new: 0, followUp: 0 };
    }

    logs.forEach(log => {
      const dateStr = toLocalDateStr(log.sentAt);
      if (!grouped[dateStr]) grouped[dateStr] = { new: 0, followUp: 0 };
      
      if (log.stage === 'INITIAL') {
        grouped[dateStr].new++;
      } else {
        grouped[dateStr].followUp++;
      }
    });

    res.json(grouped);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

export default router;
