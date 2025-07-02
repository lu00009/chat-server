import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { env } from '../env';

const SALT_ROUNDS = 12;

// Password
export const hashPassword = (password: string) => bcrypt.hash(password, SALT_ROUNDS);
export const comparePassword = (plainText: string, hash: string) => bcrypt.compare(plainText, hash);

// JWT
export const generateToken = (userId: string) => jwt.sign({ userId }, env.JWT_SECRET, { expiresIn: '1d' }); // Changed userId to string
export const verifyToken = (token: string) => jwt.verify(token, env.JWT_SECRET) as { userId: string }; // Changed userId to string
