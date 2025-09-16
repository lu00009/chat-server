
import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authenticate } from '../middlewares/auth/authenticate.middleware';
import { validatePassword } from '../middlewares/auth/validatePassword.middleware';

const router = Router();


router.post('/register', validatePassword, AuthController.register);
router.post('/login', AuthController.login);
router.post('/verify-email', AuthController.verifyEmail);
router.post('/resend-verification', AuthController.resendVerificationEmail);
router.get('/profile', authenticate, AuthController.profile);
router.get('/users', authenticate, AuthController.getAllUsers);

export default router;