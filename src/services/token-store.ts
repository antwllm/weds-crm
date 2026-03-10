import { eq } from 'drizzle-orm';
import { getDb } from '../db/index.js';
import { oauthTokens } from '../db/schema.js';
import { logger } from '../logger.js';

/**
 * Save (upsert) OAuth tokens for a given email.
 * Uses INSERT ... ON CONFLICT UPDATE to handle both new and existing rows.
 */
export async function saveTokens(
  email: string,
  accessToken: string,
  refreshToken: string,
  expiresAt?: Date
): Promise<void> {
  const db = getDb();

  try {
    // Try to find existing
    const existing = await db
      .select()
      .from(oauthTokens)
      .where(eq(oauthTokens.email, email.toLowerCase()));

    if (existing.length > 0) {
      await db
        .update(oauthTokens)
        .set({
          accessToken,
          refreshToken,
          expiresAt: expiresAt ?? null,
          updatedAt: new Date(),
        })
        .where(eq(oauthTokens.email, email.toLowerCase()));
    } else {
      await db.insert(oauthTokens).values({
        email: email.toLowerCase(),
        accessToken,
        refreshToken,
        expiresAt: expiresAt ?? null,
      });
    }

    logger.info('Tokens OAuth sauvegardes', { email });
  } catch (error) {
    logger.error('Erreur sauvegarde tokens OAuth', {
      email,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Load stored OAuth tokens for a given email.
 * Returns null if no tokens are found.
 */
export async function loadTokens(
  email: string
): Promise<{ accessToken: string; refreshToken: string; expiresAt?: Date } | null> {
  const db = getDb();

  try {
    const rows = await db
      .select()
      .from(oauthTokens)
      .where(eq(oauthTokens.email, email.toLowerCase()));

    if (rows.length === 0) {
      return null;
    }

    const row = rows[0];
    return {
      accessToken: row.accessToken,
      refreshToken: row.refreshToken,
      expiresAt: row.expiresAt ?? undefined,
    };
  } catch (error) {
    logger.error('Erreur chargement tokens OAuth', {
      email,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}
