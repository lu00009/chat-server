// src/services/auth.services.ts


import { PrismaClient } from '@prisma/client';
import { comparePassword, hashPassword } from '../utils/auth.utils';

const prisma = new PrismaClient();


export const AuthService = {
  async register(email: string, password: string, name: string) {
    // Example: Hash password and create user
    const hashedPassword = "hashed_password_here"; // Replace with actual hashing logic
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
      },
    });
    return user;
  },

  async login(email: string, password: string) {
    // Implement your login logic here
    // Example: Find user by email, compare password, etc.
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || user.password !== password) { // Replace with actual password comparison
      throw new Error('Invalid credentials');
    }
    return user;
  },

  async getProfile(userId: string) {
    // Implement logic to get user profile
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      }
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
  // Add other authentication service functions as needed
};