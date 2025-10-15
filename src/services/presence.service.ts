import prisma from '../prisma/prisma';

export async function updateUserLastSeen(userId: string) {
  try {
    // Use any cast to avoid type issues if Prisma client hasn't regenerated with lastSeen
    await (prisma.user as any).update({
      where: { id: userId },
      data: { lastSeen: new Date() },
      select: { id: true }
    });
  } catch (e) {
    // Non-fatal
  }
}
