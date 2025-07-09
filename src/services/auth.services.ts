// src/services/auth.services.ts

// Assuming prisma.ts exports default prisma, and it's located in src/prisma/
import prisma from '../prisma/prisma'; // Corrected import path for your prisma client
// If you need types from Prisma, you might also import them from @prisma/client
// The 'User' type is automatically inferred by Prisma Client operations,
// so explicitly importing it is often not necessary unless you're using it
// for standalone type declarations outside of Prisma operations.
// import { User } from '@prisma/client'; // Removed as per error and user's suggestion

// Your existing auth service logic
// Example function (adjust based on your actual auth.services.ts content)
export const registerUser = async (email: string, password: string, name: string) => { // Removed explicit Promise<User> return type
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
};

// Add other authentication service functions as needed
// e.g., login, getProfile, etc.
