import { Request, Response } from 'express';
import { AuthService } from '../services/auth.services';
import { generateToken } from '../utils/auth.utils';

export const AuthController = {
  async register(req: Request, res: Response) {
    try {
      const user = await AuthService.register(req.body.email, req.body.password, req.body.name);
      const token = generateToken(user.id);
      res.status(201).json({ user, token });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  },

  async login(req: Request, res: Response) {
    try {
      const user = await AuthService.login(req.body.email, req.body.password);
      const token = generateToken(user.id);
      res.json({ user, token });
    } catch (error: any) {
      res.status(401).json({ error: error.message });
    }
  }
};