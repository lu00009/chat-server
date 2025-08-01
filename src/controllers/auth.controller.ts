import { Request, Response } from 'express';
import { AuthService } from '../services/auth.services';
import { generateToken } from '../utils/auth.utils';

export const AuthController = {
  async register(req: Request, res: Response) {
    try {
      const { email, password, name } = req.body;
      
      if (!email || !password || !name) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const user = await AuthService.register(email, password, name);
      return res.status(201).json({ 
        message: 'User registered successfully', 
        user 
      });
    } catch (error: any) {
      console.error('Registration error:', error);
      return res.status(400).json({ 
        error: error.message || 'Registration failed' 
      });
    }
  },

  async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      const user = await AuthService.login(email, password);
      const token = generateToken(user.id);
      
      return res.json({ 
        user, 
        token,
        expiresIn: '1h'
      });
    } catch (error: any) {
      console.error('Login error:', error);
      return res.status(401).json({ 
        error: error.message || 'Authentication failed' 
      });
    }
  },

  async profile(req: Request, res: Response) {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const userProfile = await AuthService.getProfile(req.user.id);
      return res.json(userProfile);
    } catch (error: any) {
      console.error('Profile error:', error);
      return res.status(404).json({ 
        error: error.message || 'Profile not found' 
      });
    }
  }
};