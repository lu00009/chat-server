import { NextFunction, Request, Response } from 'express';
import { verifyToken } from '../../utils/auth.utils';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  console.log('Authenticate middleware hit');

  const token = req.header('Authorization')?.split(' ')[1];
  console.log('Token received:', token);

  if (!token) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  try {
    const decoded = verifyToken(token);
    console.log('Decoded token:', decoded);
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    console.log('User found:', !!user);
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    req.user = user;
    next();
  } catch (err: any) {
    console.error('Authentication error:', err.message);
    res.status(401).json({ error: 'Invalid token' });
  }
};
