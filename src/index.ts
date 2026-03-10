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
import { loadTokens } from './services/token-store.js';
import { getGmailClient } from './services/gmail.js';
import { setGmailClientInstance } from './services/gmail-client-holder.js';
import { startScheduler } from './pipeline/scheduler.js';

const port = config.PORT;

const server = app.listen(port, async () => {
  logger.info('Weds CRM demarre', { port, environment: config.NODE_ENV });

  // Attempt to restore Gmail client from stored tokens
  await restoreGmailClient();
});

/**
 * Try to restore the Gmail client from persisted tokens in the database.
 * This allows the pipeline to resume after Cloud Run restarts without
 * requiring the user to re-authenticate via OAuth.
 */
async function restoreGmailClient(): Promise<void> {
  const email = config.ALLOWED_USER_EMAIL;
  if (!email) {
    logger.info('ALLOWED_USER_EMAIL non configure -- skip restauration tokens');
    return;
  }

  try {
    const tokens = await loadTokens(email);

    if (tokens) {
      const gmailClient = getGmailClient(tokens.accessToken, tokens.refreshToken);
      setGmailClientInstance(gmailClient);
      startScheduler(gmailClient);
      logger.info('Tokens restaures depuis la base de donnees -- pipeline actif', { email });
    } else {
      logger.info('En attente d\'authentification OAuth -- connectez-vous via /auth/google', { email });
    }
  } catch (error) {
    logger.error('Erreur restauration tokens OAuth', {
      error: error instanceof Error ? error.message : String(error),
    });
    logger.info('En attente d\'authentification OAuth -- connectez-vous via /auth/google');
  }
}

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
