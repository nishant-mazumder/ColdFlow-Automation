import { Router } from 'express';
import { prisma } from '../prisma';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const accounts = await prisma.emailAccount.findMany({
      orderBy: { createdAt: 'desc' }
    });
    
    // Don't send the full refresh token to the frontend for security
    const safeAccounts = accounts.map(acc => ({
      id: acc.id,
      emailAddress: acc.emailAddress,
      createdAt: acc.createdAt
    }));
    
    res.json(safeAccounts);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch email accounts' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await prisma.emailAccount.delete({
      where: { id: req.params.id }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete email account' });
  }
});

export default router;
