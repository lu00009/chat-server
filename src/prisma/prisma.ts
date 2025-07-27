
import { PrismaClient } from '@prisma/client';

// Declare a global variable to store the PrismaClient instance.
// This is a common pattern to ensure a single instance in development
// and production, especially with hot-reloading environments.
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

let prisma: PrismaClient;

// Check if a PrismaClient instance already exists globally.
// If not, create a new one.
if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient();
} else {
  // In development, use the global variable to prevent multiple instances
  // which can happen with hot-reloading and lead to performance issues
  // or unexpected behavior.
  if (!global.prisma) {
    global.prisma = new PrismaClient();
  }
  prisma = global.prisma;
}

export default prisma;

// Optional: Add a connection check function
export async function connectPrisma(): Promise<void> {
  try {
    await prisma.$connect();
    console.log('✅ Prisma connected to the database!');
  } catch (error) {
    console.error('❌ Prisma failed to connect to the database:', error);
    process.exit(1); // Exit the process if connection fails
  }
}

// Optional: Add a disconnect function
export async function disconnectPrisma(): Promise<void> {
  try {
    await prisma.$disconnect();
    console.log('🔌 Prisma disconnected from the database.');
  } catch (error) {
    console.error('❌ Prisma failed to disconnect from the database:', error);
  }
}
