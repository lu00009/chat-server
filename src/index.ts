import express from 'express';
import dotenv from 'dotenv';
import {Request, Response} from 'express';
import prisma from './prisma/prisma';

dotenv.config(); 

const app = express();

const PORT = process.env.PORT || 3000;

app.get('/', (req:Request, res:Response) => {
  res.send('Hello, World!');
});
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
// Test Prisma connection
async function testDbConnection() {
  try {
    await prisma.$connect();
    console.log('✅ Prisma connected to the database!');
  } catch (error) {
    console.error('❌ Prisma failed to connect:', error);
  }
}
export default app; // Export the app for testing or further configuration
