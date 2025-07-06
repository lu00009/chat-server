import { NextFunction, Request, Response } from 'express';
import { verifyToken } from '../../utils/auth.utils';

export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  console.log('Authenticate middleware hit');

  const token = req.header('Authorization')?.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  try {
    const decoded = verifyToken(token);
    req.user = { id: decoded.userId };
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};
