// src/services/auth.services.ts

import { PrismaClient } from '@prisma/client';
import { comparePassword, hashPassword } from '../utils/auth.utils';

const prisma = new PrismaClient();

export const AuthService = {
  async register(email: string, password: string, name?: string) {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) throw new Error('Email already in use');

    return prisma.user.create({
      data: {
        email,
        password: await hashPassword(password),
        name: name ?? '' // Ensures 'name' is always a string
      }
    });
  },

  async login(email: string, password: string) {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, name: true, password: true }
    });
    if (!user) throw new Error('Invalid credentials');

    const isValid = await comparePassword(password, user.password);
    if (!isValid) throw new Error('Invalid credentials');

    // Don't return password in the response
    const { password: _pw, ...userWithoutPassword } = user;
    return userWithoutPassword;
  },
  getAllUsers: async () => {
    return prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        updatedAt: true
      }
    });
  }
};