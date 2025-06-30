// src/env.ts
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({
  path: path.resolve(__dirname, '../.env')
});

export const env = {
  PORT: process.env.PORT ? Number(process.env.PORT) : 3000,
  DATABASE_URL: process.env.DATABASE_URL || '',
  JWT_SECRET: process.env.JWT_SECRET || 'default-secret-for-dev',
  NODE_ENV: process.env.NODE_ENV || 'development'
} as const;