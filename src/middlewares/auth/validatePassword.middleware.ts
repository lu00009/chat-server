import { NextFunction, Request, Response } from 'express';

export const validatePassword = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
const { password } = req.body;

if (!password || password.length < 8) {
    res.status(400).json({ error: 'Password must be at least 8 characters' });
    return;
}
next();
};