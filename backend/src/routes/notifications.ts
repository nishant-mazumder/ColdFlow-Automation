import { Router } from 'express';
import { prisma } from '../prisma';

const router = Router();

// Get recent notifications
router.get('/', async (req, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      take: 20,
      orderBy: { createdAt: 'desc' }
    });
    
    // Calculate unread count
    const unreadCount = await prisma.notification.count({ where: { read: false } });
    
    res.json({ notifications, unreadCount });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Mark all as read
router.post('/mark-read', async (req, res) => {
  try {
    await prisma.notification.updateMany({
      where: { read: false },
      data: { read: true }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark notifications as read' });
  }
});

export default router;
