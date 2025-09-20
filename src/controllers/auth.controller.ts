import { Request, Response } from 'express';
import { AuthService } from '../services/auth.services';
import { generateToken } from '../utils/auth.utils';

export const AuthController = {
  async getAllUsers(req: Request, res: Response) {
    try {
      // Optionally, restrict to admin users only
      // if (!req.user || !req.user.isAdmin) return res.status(403).json({ error: 'Forbidden' });
      const users = await AuthService.getAllUsers();
      res.json(users);
    } catch (error: any) {
      console.error('Get all users error:', error);
      res.status(500).json({ error: error.message || 'Failed to fetch users' });
    }
  },

  async register(req: Request, res: Response) {
    try {
      const { email, password, name } = req.body;

      if (!email || !password || !name) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
      }

      const user = await AuthService.register(email, password, name);
      const token = generateToken(user.id);

      res.status(201).json({
        message: 'User registered successfully',
        user,
        token,
        expiresIn: '1h',
      });
    } catch (error: any) {
      console.error('Registration error:', error);
      res.status(400).json({
        error: error.message || 'Registration failed',
      });
    }
  },

  async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        res.status(400).json({ error: 'Email and password are required' });
        return;
      }

      const user = await AuthService.login(email, password);
      const token = generateToken(user.id);

      res.json({
        user,
        token,
        expiresIn: '1h',
      });
    } catch (error: any) {
      console.error('Login error:', error);
      res.status(401).json({
        error: error.message || 'Authentication failed',
      });
    }
  },

  async profile(req: Request, res: Response) {
    try {
      if (!req.user?.id) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const userProfile = await AuthService.getProfile(req.user.id);
      res.json(userProfile);
    } catch (error: any) {
      console.error('Profile error:', error);
      res.status(404).json({
        error: error.message || 'Profile not found',
      });
    }
  },
  async verifyEmail(req: Request, res: Response) {
    try {
      const { token } = req.body;
      if (!token) {
        return res.status(400).json({ error: 'Verification token required' });
      }
      const user = await AuthService.verifyEmail(token);
      return res.json({ message: 'Email verified successfully', user });
    } catch (error: any) {
      console.error('Email verification error:', error);
      return res.status(400).json({ error: error.message || 'Email verification failed' });
    }
  },
  async resendVerificationEmail(req: Request, res: Response) {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ error: 'Email required' });
      }
      const result = await AuthService.resendVerificationEmail(email);
      return res.json(result);
    } catch (error: any) {
      console.error('Resend verification error:', error);
      return res.status(400).json({ error: error.message || 'Resend verification failed' });
    }
  },
};
