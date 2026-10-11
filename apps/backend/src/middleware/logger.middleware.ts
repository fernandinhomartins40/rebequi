/**
 * Logger Middleware
 * HTTP request logging using Morgan
 */

import morgan from 'morgan';
import { logger } from '../utils/logger.util.js';
import { env } from '../config/env.js';
import type { Request } from 'express';

// Create morgan stream for winston
const stream = {
  write: (message: string) => {
    logger.info(message.trim());
  },
};

// Morgan format
// OAuth codes/state and customer tokens must not be persisted in access logs.
morgan.token('url', request => ((request as Request).originalUrl || request.url || '').split('?')[0]);
const format = env.NODE_ENV === 'production'
  ? 'combined'
  : ':method :url :status :response-time ms - :res[content-length]';

export const loggerMiddleware = morgan(format, { stream });
