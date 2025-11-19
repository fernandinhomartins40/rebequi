/**
 * Server Entry Point
 * Start the Express server
 */

import app from './app.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.util.js';
import { prisma } from './lib/prisma.js';

const PORT = env.PORT;
const HOST = env.HOST;

/**
 * Start server
 */
async function startServer() {
  try {
    // Test database connection
    await prisma.$connect();
    logger.info('✅ Database connected successfully');

    // Start listening
    app.listen(PORT, HOST, () => {
      logger.info(`🚀 Server running on http://${HOST}:${PORT}`);
      logger.info(`📊 Environment: ${env.NODE_ENV}`);
      logger.info(`🔗 CORS enabled for: ${env.ALLOWED_ORIGINS}`);
      logger.info(`📁 Upload directory: ${env.UPLOAD_DIR}`);
    });
  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

/**
 * Graceful shutdown
 */
async function gracefulShutdown(signal: string) {
  logger.info(`\n${signal} received. Starting graceful shutdown...`);

  try {
    // Close database connection
    await prisma.$disconnect();
    logger.info('✅ Database disconnected');

    process.exit(0);
  } catch (error) {
    logger.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
}

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('❌ Uncaught Exception:', error);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('UNHANDLED_REJECTION');
});

// Start the server
startServer();
