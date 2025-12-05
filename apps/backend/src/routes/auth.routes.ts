/**
 * Auth Routes
 * Authentication and authorization endpoints
 */

import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller.js';
import { validateBody } from '../middleware/validation.middleware.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authLimiter } from '../middleware/rate-limit.middleware.js';
import { loginSchema, registerSchema } from '@rebequi/shared/schemas';

const router = Router();
const authController = new AuthController();

// Public routes
router.post('/register', authLimiter, validateBody(registerSchema), authController.register);
router.post('/login', authLimiter, validateBody(loginSchema), authController.login);
router.post('/logout', authenticate, authController.logout);

// Protected routes
router.get('/me', authenticate, authController.getProfile);

export default router;
