
import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { PresenceController } from '../controllers/presence.controller';
import { authenticate } from '../middlewares/auth/authenticate.middleware';
import { validatePassword } from '../middlewares/auth/validatePassword.middleware';

const router = Router();


/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *     responses:
 *       201:
 *         description: User registered
 *       400:
 *         description: Validation error
 */
router.post('/register', validatePassword, AuthController.register);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login and obtain a JWT token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *     responses:
 *       200:
 *         description: Login successful, returns token
 *       401:
 *         description: Invalid credentials
 */
router.post('/login', AuthController.login);
router.post('/verify-email', AuthController.verifyEmail);
router.post('/resend-verification', AuthController.resendVerificationEmail);
router.post('/refresh', AuthController.refresh);
router.post('/logout', AuthController.logout);

/**
 * @swagger
 * /auth/profile:
 *   get:
 *     summary: Get the authenticated user's profile
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile
 *       401:
 *         description: Unauthorized
 */
router.get('/profile', authenticate, AuthController.profile);

/**
 * @swagger
 * /auth/profile:
 *   patch:
 *     summary: Update the authenticated user's profile
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               bio:
 *                 type: string
 *               status:
 *                 type: string
 *               profilePicture:
 *                 type: string
 *     responses:
 *       200:
 *         description: Updated user profile
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.patch('/profile', authenticate, AuthController.updateProfile);

/**
 * @swagger
 * /auth/presence:
 *   get:
 *     summary: Get current user's presence (online/lastSeen)
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Presence info
 */
router.get('/presence', authenticate, PresenceController.me);
router.get('/presence/:userId', authenticate, PresenceController.user);

/**
 * @swagger
 * /auth/users:
 *   get:
 *     summary: Get list of all users (protected)
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Array of users
 *       401:
 *         description: Unauthorized
 */
router.get('/users', authenticate, AuthController.getAllUsers);
router.get('/users/:userId', authenticate, AuthController.getUserById);

export default router;