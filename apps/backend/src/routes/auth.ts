import { Router } from 'express';
import {
  login,
  register,
  getMe,
  refresh,
  logout,
} from '../controllers/authController.js';
import { authenticateToken, optionalAuth } from '../middleware/auth.js';

export const authRouter = Router();

/**
 * Public routes
 */

// POST /api/auth/login - User login
authRouter.post('/login', login);

// POST /api/auth/register - User registration
authRouter.post('/register', register);

// POST /api/auth/refresh - Refresh access token
authRouter.post('/refresh', optionalAuth, refresh);

/**
 * Protected routes
 */

// GET /api/auth/me - Get current user
authRouter.get('/me', authenticateToken, getMe);

// POST /api/auth/logout - User logout
authRouter.post('/logout', authenticateToken, logout);
