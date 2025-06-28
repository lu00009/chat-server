import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testDbConnection() {
  try {
    await prisma.$connect();
    console.log('✅ Prisma connected to the database!');
  } catch (error) {
    console.error('❌ Prisma failed to connect:', error);
  }
}

testDbConnection();

export default prisma;
