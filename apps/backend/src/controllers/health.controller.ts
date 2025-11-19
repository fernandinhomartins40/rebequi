/**
 * Health Controller
 * System health check endpoints
 */

import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { env } from '../config/env.js';

export class HealthController {
  /**
   * Basic health check
   * GET /api/health
   */
  check = async (_req: Request, res: Response): Promise<void> => {
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'rebequi-backend',
      version: '1.0.0',
      environment: env.NODE_ENV,
    });
  };

  /**
   * Detailed health check (includes database)
   * GET /api/health/detailed
   */
  detailedCheck = async (_req: Request, res: Response): Promise<void> => {
    try {
      // Check database connection
      await prisma.$queryRaw`SELECT 1`;

      res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'rebequi-backend',
        version: '1.0.0',
        environment: env.NODE_ENV,
        checks: {
          database: 'ok',
        },
        uptime: process.uptime(),
        memory: process.memoryUsage(),
      });
    } catch (error) {
      res.status(503).json({
        status: 'error',
        timestamp: new Date().toISOString(),
        service: 'rebequi-backend',
        checks: {
          database: 'error',
        },
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };
}
