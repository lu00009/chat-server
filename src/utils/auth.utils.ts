import jwt from 'jsonwebtoken';
import { env } from '../env';

export function generateToken(userId: string): string {
  return jwt.sign(
    { userId },
    env.JWT_SECRET,
    { expiresIn: '2h' }
  );
}

export function verifyToken(token: string): { userId: string } {
  return jwt.verify(token, env.JWT_SECRET) as { userId: string };
}