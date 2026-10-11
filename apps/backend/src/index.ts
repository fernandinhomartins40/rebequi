/**
 * Server Entry Point
 * Start the Express server
 */

import app from './app.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.util.js';
import { prisma } from './lib/prisma.js';
import { QuoteService } from './services/quote.service.js';
import { installDemoMedia } from './services/demo-media.service.js';

const PORT = env.PORT;
const HOST = env.HOST;

/** Housekeeping cadence for orphaned OCR jobs and expired anonymous drafts. */
const QUOTE_MAINTENANCE_INTERVAL_MS = 15 * 60 * 1000;
let quoteMaintenanceRunning = false;

async function runQuoteMaintenance() {
  if (quoteMaintenanceRunning) return;
  quoteMaintenanceRunning = true;
  try {
    await new QuoteService().runMaintenance();
  } catch (error) {
    logger.warn('Quote maintenance run failed.', { error });
  } finally {
    quoteMaintenanceRunning = false;
  }
}

/**
 * Start server
 */
async function startServer() {
  try {
    // Test database connection
    await prisma.$connect();
    logger.info('✅ Database connected successfully');
    logger.info('Local demo media ready', await installDemoMedia());

    // O job de OCR vive em memória: um restart no meio do processamento deixa
    // orçamentos presos em PROCESSING para sempre. Limpa na subida.
    void runQuoteMaintenance();
    setInterval(() => void runQuoteMaintenance(), QUOTE_MAINTENANCE_INTERVAL_MS).unref();

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
