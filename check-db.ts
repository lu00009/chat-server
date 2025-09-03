import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize Prisma Client
const prisma = new PrismaClient();

async function testDatabaseConnection() {
  try {
    console.log('Testing database connection...');
    console.log(`Database URL: ${process.env.DATABASE_URL?.replace(/:.+@/, ':****@')}`);
    
    // Try to connect to the database
    await prisma.$connect();
    console.log('✅ Connected to the database successfully!');
    
    // Check if we can execute a simple query
    const userCount = await prisma.user.count();
    console.log(`Found ${userCount} users in the database.`);
    
    // Create a test user if no users exist
    if (userCount === 0) {
      console.log('Creating a test user...');
      const testUser = await prisma.user.create({
        data: {
          email: 'test@example.com',
          password: '$2b$12$KNlGQ.EvDZkA/n06uLjCDu8H6ITNnmWefGcI2P.y8UCjVY/LUZaXu', // hashed 'password123'
          name: 'Test User',
        }
      });
      console.log('✅ Test user created:', testUser.id);
    }
    
    // Check if we can query groups
    const groupCount = await prisma.group.count();
    console.log(`Found ${groupCount} groups in the database.`);
    
    // Create a test group if no groups exist
    if (groupCount === 0 && userCount > 0) {
      const firstUser = await prisma.user.findFirst();
      if (firstUser) {
        console.log('Creating a test group...');
        const testGroup = await prisma.group.create({
          data: {
            name: 'Test Group',
            description: 'A test group for database validation',
            slug: 'test-group',
            inviteCode: 'INV-TEST123',
            createdBy: {
              connect: { id: firstUser.id }
            },
            members: {
              create: {
                userId: firstUser.id,
                role: 'CREATOR',
                permissions: {}
              }
            }
          }
        });
        console.log('✅ Test group created:', testGroup.id);
      }
    }
    
    console.log('✅ Database tests completed successfully!');
  } catch (error) {
    console.error('❌ Database connection test failed:', error);
    console.log('\nPlease ensure:');
    console.log('1. PostgreSQL is installed and running');
    console.log('2. The database specified in DATABASE_URL exists');
    console.log('3. The user has proper permissions');
    console.log('4. Your .env file has the correct DATABASE_URL');
    
    // Attempt to provide more specific help
    const errorMessage = String(error);
    if (errorMessage.includes("Can't reach database server")) {
      console.log('\n👉 The database server appears to be offline or unreachable.');
      console.log('   Check if PostgreSQL is running on the specified host and port.');
    } else if (errorMessage.includes("database") && errorMessage.includes("does not exist")) {
      console.log('\n👉 The specified database does not exist.');
      console.log('   Run: `npx prisma db push` to create the database and tables.');
    } else if (errorMessage.includes("password authentication failed")) {
      console.log('\n👉 Password authentication failed.');
      console.log('   Check the username and password in your DATABASE_URL.');
    }
  } finally {
    await prisma.$disconnect();
  }
}

testDatabaseConnection();

testDatabaseConnection();
