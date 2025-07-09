// src/services/auth.services.ts

import prisma from '../prisma/prisma'; // Corrected import path for your prisma client

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
    if (!user) {
      throw new Error('User profile not found');
    }
    return user;
  }
  // Add other authentication service functions as needed
};