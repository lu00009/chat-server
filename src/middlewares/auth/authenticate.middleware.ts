import { NextFunction, Request, Response } from 'express';
import prisma from '../../prisma/prisma';
import { verifyToken } from '../../utils/auth.utils';

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({ 
        error: 'Authorization header missing',
        message: 'Please provide a valid authentication token' 
      });
    }

    const [bearer, token] = authHeader.split(' ');
    
    if (bearer !== 'Bearer' || !token) {
      return res.status(401).json({ 
        error: 'Invalid authorization format',
        message: 'Authorization header must be in the format: Bearer <token>' 
      });
    }

    try {
      const decoded = verifyToken(token);
      const user = await prisma.user.findUnique({ 
        where: { id: decoded.userId },
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
          updatedAt: true
        }
      });
      
      if (!user) {
        return res.status(401).json({ 
          error: 'Invalid user',
          message: 'User no longer exists or has been deactivated' 
        });
      }
      
      // Attach user to request
      req.user = user;
      next();
    } catch (tokenError) {
      console.error('Token verification error:', tokenError);
      return res.status(401).json({ 
        error: 'Invalid or expired token',
        message: 'Your session has expired. Please login again.' 
      });
    }
  } catch (error) {
    console.error('Authentication middleware error:', error);
    return res.status(500).json({ 
      error: 'Server error',
      message: 'An unexpected error occurred during authentication' 
    });
  }
};