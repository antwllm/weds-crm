// Weds CRM - Entry point
// Sentry MUST be initialized before any other imports
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN || undefined,
  environment: process.env.NODE_ENV || 'development',
  tracesSampleRate: 1.0,
});

// Import app AFTER Sentry initialization
import { app } from './app.js';
import { config } from './config.js';
import { logger } from './logger.js';

const port = config.PORT;

const server = app.listen(port, () => {
  logger.info('Weds CRM demarre', { port, environment: config.NODE_ENV });
});

// Graceful shutdown handlers
process.on('uncaughtException', (error) => {
  logger.error('Exception non capturee', { error });
  Sentry.captureException(error);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  const error = reason instanceof Error ? reason : new Error(String(reason));
  logger.error('Promesse rejetee non geree', { error });
  Sentry.captureException(error);
});

export { server };
