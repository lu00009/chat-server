import bcrypt from 'bcrypt';
import prisma from '../prisma/prisma';

const SALT_ROUNDS = 12;

export const AuthService = {
  async register(email: string, password: string, name: string) {
    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error('Invalid email format');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    
    try {
      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
        },
      });
      
      // Return user without sensitive data
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      };
    } catch (error: any) {
      if (error.code === 'P2002') { // Prisma unique constraint violation
        throw new Error('Email already in use');
      }
      throw new Error('Registration failed');
    }
  },

  async login(email: string, password: string) {
    const user = await prisma.user.findUnique({ 
      where: { email },
      select: {
        id: true,
        email: true,
        password: true,
        name: true
      }
    });

    if (!user) {
      throw new Error('Invalid credentials');
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      throw new Error('Invalid credentials');
    }

    // Return user without sensitive data
    return {
      id: user.id,
      email: user.email,
      name: user.name
    };
  },

  async getProfile(userId: string) {
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
      throw new Error('User not found');
    }
    return user;
  }
};