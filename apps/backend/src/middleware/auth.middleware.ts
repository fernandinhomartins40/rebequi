/**
 * Authentication Middleware
 * Verify JWT tokens and protect routes
 */

import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt.util.js';
import { UnauthorizedError, ForbiddenError } from '../utils/errors.util.js';
import { env } from '../config/env.js';
import { prisma } from '../lib/prisma.js';

async function resolveActiveSession(token: string) {
  const payload = verifyToken(token);
  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, email: true, role: true, isActive: true },
  });
  if (!user?.isActive) throw new UnauthorizedError('Sessão inválida ou conta desativada');
  return { ...payload, identifier: user.email, role: user.role };
}

/**
 * Authenticate user from JWT token
 */
export async function authenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    // The application-level optional middleware already checked this request.
    if (req.user) { next(); return; }
    // Get token from HttpOnly cookie or Authorization header
    const cookieToken = req.cookies?.[env.AUTH_COOKIE_NAME];
    const authHeader = req.headers.authorization;
    const headerToken =
      authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : undefined;
    const token = cookieToken || headerToken;

    if (!token) {
      throw new UnauthorizedError('No token provided');
    }

    // Verify token
    const payload = await resolveActiveSession(token);

    // Attach user to request
    req.user = payload;

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Authorize user based on role
 */
export function authorize(...allowedRoles: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('User not authenticated');
      }

      if (!allowedRoles.includes(req.user.role)) {
        throw new ForbiddenError('Insufficient permissions');
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Optional authentication (doesn't throw error if no token)
 */
export async function optionalAuthenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const cookieToken = req.cookies?.[env.AUTH_COOKIE_NAME];
    const authHeader = req.headers.authorization;
    const headerToken =
      authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : undefined;
    const token = cookieToken || headerToken;

    if (token) {
      const payload = await resolveActiveSession(token);
      req.user = payload;
    }

    next();
  } catch {
    // Silently fail for optional authentication
    next();
  }
}
