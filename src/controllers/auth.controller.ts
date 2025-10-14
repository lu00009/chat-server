import { Request, Response } from 'express';
import { AuthService } from '../services/auth.services';
import {
    clearRefreshTokenCookie,
    createRefreshToken,
    generateToken,
    revokeRefreshToken,
    rotateRefreshToken,
    setRefreshTokenCookie,
} from '../utils/auth.utils';

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
      const accessToken = generateToken(user.id, '15m');
      const { token: refreshToken, expiresAt } = await createRefreshToken({
        userId: user.id,
        ip: req.ip,
        userAgent: req.headers['user-agent'] || undefined,
      });
      setRefreshTokenCookie(res, refreshToken, expiresAt);

      res.json({ user, token: accessToken, expiresIn: '15m' });
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
  async refresh(req: Request, res: Response) {
    try {
      const token = req.cookies?.refresh_token as string | undefined;
      if (!token) {
        res.status(401).json({ error: 'Refresh token missing' });
        return;
      }
      const rotated = await rotateRefreshToken(token, {
        ip: req.ip,
        userAgent: req.headers['user-agent'] || undefined,
      });
      const accessToken = generateToken(rotated.userId, '15m');
      setRefreshTokenCookie(res, rotated.token, rotated.expiresAt);
      res.json({ token: accessToken, expiresIn: '15m' });
    } catch (error: any) {
      console.error('Refresh error:', error);
      clearRefreshTokenCookie(res);
      res.status(401).json({ error: error.message || 'Refresh failed' });
    }
  },

  async logout(req: Request, res: Response) {
    try {
      const token = req.cookies?.refresh_token as string | undefined;
      if (token) {
        await revokeRefreshToken(token);
      }
      clearRefreshTokenCookie(res);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Logout error:', error);
      res.status(400).json({ error: error.message || 'Logout failed' });
    }
  },
};
