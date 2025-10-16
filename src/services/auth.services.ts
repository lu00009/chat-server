import bcrypt from 'bcrypt';
import crypto from 'crypto';
import prisma from '../prisma/prisma';
import { sendVerificationEmail } from '../utils/mail';

const SALT_ROUNDS = 12;

export const AuthService = {
  async getUserPublic(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        bio: true,
        profilePicture: true,
        status: true,
        lastSeen: true,
        isVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return user;
  },
  async getAllUsers() {
    // Exclude sensitive fields
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        profilePicture: true,
        status: true,
        lastSeen: true,
        createdAt: true,
        updatedAt: true,
        isVerified: true,
      },
      orderBy: { name: 'asc' },
    });
    return users;
  },

  async register(email: string, password: string, name: string) {
    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error('Invalid email format');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    
    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiry = new Date();
    tokenExpiry.setHours(tokenExpiry.getHours() + 24); // 24 hours from now
    
    try {
          const user = await prisma.user.create({
            data: {
              email,
              password: hashedPassword,
              name,
              verificationToken,
              verificationTokenExpiry: tokenExpiry,
              isVerified: false
            }
          });
      
      // Send verification email
      await sendVerificationEmail(
        email,
        verificationToken,
        name || email
      );
      
      // Return user without sensitive data
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        isVerified: user.isVerified,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      };
    } catch (error: any) {
      console.error('Database error during registration:', error);
      
      if (error.code === 'P2002') { // Prisma unique constraint violation
        throw new Error('Email already in use');
      }
      
      if (error.code === 'P1001') { // Can't reach database server
        throw new Error('Database connection failed. Please try again later.');
      }
      
      if (error.code === 'P1008') { // Operations timed out
        throw new Error('Database operation timed out. Please try again.');
      }
      
      if (error.code === 'P1017') { // Server has closed the connection
        throw new Error('Database connection lost. Please try again.');
      }
      
      // For any other error, provide more specific information
      const errorMessage = error.message || 'Unknown database error';
      throw new Error(`Registration failed: ${errorMessage}`);
    }
  },

  async login(email: string, password: string) {
    const user = await prisma.user.findUnique({ 
      where: { email },
      select: {
        id: true,
        email: true,
        password: true,
        name: true,
        isVerified: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      throw new Error('Invalid credentials');
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      throw new Error('Invalid credentials');
    }

    // Check if user is verified
    if (!user.isVerified) {
      throw new Error('Please verify your email before logging in');
    }

    // Return user without sensitive data
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      isVerified: user.isVerified
    };
  },

  async verifyEmail(token: string) {
    // Find user with the verification token
    const user = await prisma.user.findFirst({
      where: {
        verificationToken: token,
        verificationTokenExpiry: {
          gte: new Date() // Token not expired
        }
      },
      select: {
        id: true,
        email: true,
        name: true,
        isVerified: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      throw new Error('Invalid or expired verification token');
    }

    // Update user as verified and clear token
        const updatedUser = await prisma.user.update({
          where: { id: user.id },
          data: {
            isVerified: true,
            verificationToken: null,
            verificationTokenExpiry: null
          }
        });

    return {
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      isVerified: updatedUser.isVerified
    };
  },

  async resendVerificationEmail(email: string) {
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        isVerified: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      throw new Error('User not found');
    }

    if (user.isVerified) {
      throw new Error('Email is already verified');
    }

    // Generate new verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiry = new Date();
    tokenExpiry.setHours(tokenExpiry.getHours() + 24); // 24 hours from now

    // Update user with new token
        await prisma.user.update({
          where: { id: user.id },
          data: {
            verificationToken,
            verificationTokenExpiry: tokenExpiry
          }
        });

    // Send verification email
    const emailSent = await sendVerificationEmail(
      email,
      verificationToken,
      user.name || email
    );

    if (!emailSent) {
      throw new Error('Failed to send verification email');
    }

    return { success: true, message: 'Verification email sent' };
  },

  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: ({
        id: true,
        email: true,
        name: true,
        bio: true,
        status: true,
        profilePicture: true,
        lastSeen: true,
        isVerified: true,
        createdAt: true,
        updatedAt: true,
      } as any)
    });

    if (!user) {
      throw new Error('User not found');
    }

    return user;
  },

  async updateProfile(userId: string, data: {
    name?: string;
    bio?: string;
    status?: string;
    profilePicture?: string;
  }) {
    // Sanitize input: trim strings and ignore empty values
    const updates: any = {};
    if (typeof data.name === 'string') updates.name = data.name.trim();
    if (typeof data.bio === 'string') updates.bio = data.bio.trim();
    if (typeof data.status === 'string') updates.status = data.status.trim();
    if (typeof data.profilePicture === 'string') updates.profilePicture = data.profilePicture.trim();

    const updated = await prisma.user.update({
      where: { id: userId },
      // Cast to any to allow schema-evolution fields until prisma generate runs
      data: updates as any,
      select: ({
        id: true,
        email: true,
        name: true,
        bio: true,
        status: true,
        profilePicture: true,
        lastSeen: true,
        isVerified: true,
        createdAt: true,
        updatedAt: true,
      } as any)
    });
    return updated;
  }
};