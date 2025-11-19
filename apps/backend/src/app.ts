/**
 * Express Application Configuration
 * Main app setup with middleware and routes
 */

import express, { Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { corsOptions } from './config/cors.js';
import { loggerMiddleware } from './middleware/logger.middleware.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.middleware.js';
import { apiLimiter } from './middleware/rate-limit.middleware.js';
import routes from './routes/index.js';
import { env } from './config/env.js';

// Create Express application
const app: Application = express();

// ============================================================================
// MIDDLEWARE
// ============================================================================

// Security middleware
app.use(helmet());

// CORS
app.use(cors(corsOptions));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// HTTP request logging
app.use(loggerMiddleware);

// Rate limiting for all routes
app.use('/api', apiLimiter);

// ============================================================================
// ROUTES
// ============================================================================

// Mount API routes
app.use('/api', routes);

// Serve static files (uploads)
if (env.UPLOAD_DIR) {
  app.use('/uploads', express.static(env.UPLOAD_DIR));
}

// ============================================================================
// ERROR HANDLING
// ============================================================================

// 404 handler
app.use(notFoundHandler);

// Global error handler (must be last)
app.use(errorHandler);

export default app;
