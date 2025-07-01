import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authenticate } from '../middlewares/auth/authenticate.middleware';
import { validatePassword } from '../middlewares/auth/validatePassword.middleware';

const router = Router();

router.post('/register', validatePassword, AuthController.register);
router.post('/login', AuthController.login);
router.get('/profile', authenticate, (req, res) => {
  res.json({ userId: req.userId });
});

export default router;