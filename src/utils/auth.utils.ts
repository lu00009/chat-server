import crypto from 'crypto';
import { Response } from 'express';
import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '../env';
import prisma from '../prisma/prisma';

// Access token generation/verification
export function generateToken(userId: string, expiresIn: string | number = '15m'): string {
  const options: SignOptions = { expiresIn: expiresIn as any };
  return jwt.sign({ userId }, env.JWT_SECRET, options);
}

export function verifyToken(token: string): { userId: string } {
  return jwt.verify(token, env.JWT_SECRET) as { userId: string };
}

// Refresh token support
function generateRandomToken(): string {
  return crypto.randomBytes(64).toString('hex');
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function createRefreshToken(options: {
  userId: string;
  ttlMs?: number; // default 30 days
  ip?: string;
  userAgent?: string;
}) {
  const {
    userId,
    ttlMs = 1000 * 60 * 60 * 24 * 30,
    ip,
    userAgent,
  } = options;
  const token = generateRandomToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + ttlMs);
  await prisma.refreshToken.create({
    data: { tokenHash, userId, expiresAt, ip, userAgent },
  });
  return { token, expiresAt };
}

export async function rotateRefreshToken(oldToken: string, meta: { ip?: string; userAgent?: string }) {
  const oldHash = hashToken(oldToken);
  const record = await prisma.refreshToken.findFirst({ where: { tokenHash: oldHash } });
  if (!record || record.revokedAt || record.expiresAt <= new Date()) {
    throw new Error('Invalid or expired refresh token');
  }
  // Rotate
  const newToken = generateRandomToken();
  const newHash = hashToken(newToken);
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);
  const created = await prisma.refreshToken.create({
    data: {
      tokenHash: newHash,
      userId: record.userId,
      expiresAt,
      ip: meta.ip,
      userAgent: meta.userAgent,
    },
  });
  await prisma.refreshToken.update({
    where: { id: record.id },
    data: { revokedAt: new Date(), replacedByToken: created.id },
  });
  return { userId: record.userId, token: newToken, expiresAt };
}

export async function revokeRefreshToken(token: string) {
  const hash = hashToken(token);
  await prisma.refreshToken.updateMany({
    where: { tokenHash: hash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export function setRefreshTokenCookie(res: Response, token: string, expiresAt: Date) {
  // Use httpOnly cookie
  res.cookie('refresh_token', token, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    expires: expiresAt,
    path: '/auth',
  });
}

export function clearRefreshTokenCookie(res: Response) {
  res.clearCookie('refresh_token', { path: '/auth' });
}