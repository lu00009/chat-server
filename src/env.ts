import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({
  path: path.resolve(__dirname, '../.env')
});

// Environment configuration with type safety
export const env = {
  // Server configuration
  PORT: process.env.PORT ? Number(process.env.PORT) : 3000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // Database configuration
  DATABASE_URL: process.env.DATABASE_URL || '',
  
  // Authentication
  JWT_SECRET: process.env.JWT_SECRET || 'default-secret-for-dev',
  
  // Client/API configuration
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:3000',
  
  // Socket.IO specific
  SOCKET_PATH: process.env.SOCKET_PATH || '/socket.io/',
  SOCKET_PING_TIMEOUT: process.env.SOCKET_PING_TIMEOUT ? Number(process.env.SOCKET_PING_TIMEOUT) : 60000,
  SOCKET_PING_INTERVAL: process.env.SOCKET_PING_INTERVAL ? Number(process.env.SOCKET_PING_INTERVAL) : 25000
} as const;

// Type for environment variables
export type EnvConfig = typeof env;