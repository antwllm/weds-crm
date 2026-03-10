import { getDb } from '../../db/index.js';
import { syncLog } from '../../db/schema.js';
import { logger } from '../../logger.js';
import { alertNotificationFailure } from '../alerts.js';

/**
 * Retry wrapper for Pipedrive API calls with exponential backoff.
 * Logs every attempt (success/failure) to the syncLog table.
 * On exhaustion, sends a Free Mobile SMS alert to William.
 *
 * Backoff: attempt^2 * 1000ms (1s, 4s, 9s)
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  leadId: number,
  direction: 'push' | 'pull',
  maxAttempts = 3
): Promise<T> {
  const db = getDb();

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await fn();

      // Log success
      await db.insert(syncLog).values({
        leadId,
        direction,
        status: 'success',
      });

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Log failure
      await db.insert(syncLog).values({
        leadId,
        direction,
        status: 'error',
        error: errorMessage,
      });

      if (attempt === maxAttempts) {
        // All attempts exhausted — alert William via Free Mobile SMS
        logger.error(`Sync Pipedrive echouee apres ${maxAttempts} tentatives`, {
          leadId,
          direction,
          error: errorMessage,
        });

        try {
          await alertNotificationFailure(
            'pipedrive_sync',
            `Echec sync ${direction} apres ${maxAttempts} tentatives: ${errorMessage}`,
            { id: leadId, name: `Lead #${leadId}` }
          );
        } catch (alertError) {
          // Best-effort alert — never let alert failure mask the original error
          logger.error('Alerte SMS sync echouee aussi', {
            alertError: alertError instanceof Error ? alertError.message : String(alertError),
          });
        }

        throw error;
      }

      // Exponential backoff: 1s, 4s, 9s
      const delay = attempt * attempt * 1000;
      logger.warn(`Tentative Pipedrive ${attempt}/${maxAttempts} echouee, retry dans ${delay}ms`, {
        leadId,
        direction,
        attempt,
        error: errorMessage,
      });

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  // Unreachable but satisfies TypeScript
  throw new Error('withRetry: unreachable');
}
