import { NextFunction, Request, Response } from 'express';
import { verifyToken } from '../../utils/auth.utils';

// Extend the Request interface to include userId
declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const token = req.header('Authorization')?.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  try {
    const decoded = verifyToken(token);
    req.userId = decoded.userId; // Removed .toString()
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};
