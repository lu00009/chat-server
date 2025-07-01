import { Request, Response } from 'express';
import { AuthService } from '../services/auth.services';
import { generateToken } from '../utils/auth.utils';

export const AuthController = {
  async register(req: Request, res: Response) {
    try {
      console.log('Register request body:', req.body);
      const user = await AuthService.register(req.body.email, req.body.password, req.body.name);
      res.status(201).json({ message: 'User registered successfully', user });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  },

  async login(req: Request, res: Response) {
    try {
      console.log('Login request body:', req.body);
      const user = await AuthService.login(req.body.email, req.body.password);
      const token = generateToken(Number(user.id));
      res.json({ user, token });
    } catch (error: any) {
      res.status(401).json({ error: error.message });
    }
  }
};