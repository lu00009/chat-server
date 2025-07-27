import { PrismaClient } from '@prisma/client';
import { NextFunction, Request, Response } from 'express';
import { verifyToken } from '../../utils/auth.utils';

const prisma = new PrismaClient();

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).json({ error: 'Authorization header missing' });
  }

  const [bearer, token] = authHeader.split(' ');
  
  if (bearer !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Invalid authorization format' });
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
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};