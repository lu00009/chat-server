import { Request, Response } from 'express';
import prisma from '../prisma/prisma';
import { isOnline } from '../socket/presence';

export const PresenceController = {
  async me(req: Request, res: Response) {
    try {
      if (!req.user?.id) return res.status(401).json({ error: 'Unauthorized' });
      const online = isOnline(req.user.id);
      const user = await (prisma.user as any).findUnique({ where: { id: req.user.id }, select: { lastSeen: true } });
      res.json({ online, lastSeen: user?.lastSeen ?? null });
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Failed to get presence' });
    }
  },

  async user(req: Request, res: Response) {
    try {
      const { userId } = req.params as { userId: string };
      if (!userId) return res.status(400).json({ error: 'userId is required' });
      const online = isOnline(userId);
      const user = await (prisma.user as any).findUnique({ where: { id: userId }, select: { lastSeen: true } });
      res.json({ online, lastSeen: user?.lastSeen ?? null });
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Failed to get user presence' });
    }
  }
}
