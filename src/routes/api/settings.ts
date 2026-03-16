import { Router } from 'express';
import { eq, desc, sql, count } from 'drizzle-orm';
import { getDb } from '../../db/index.js';
import { notificationSettings, activities, leads } from '../../db/schema.js';
import { ensureAuthenticated } from '../../auth/middleware.js';
import { logger } from '../../logger.js';

const router = Router();

// All routes require authentication
router.use(ensureAuthenticated);

// --- Default channel definitions ---

const DEFAULT_CHANNELS = [
  { channel: 'free_mobile_new_contact', label: 'SMS Free Mobile - Nouveau contact', enabled: true },
  { channel: 'free_mobile_error', label: 'SMS Free Mobile - Alertes erreurs', enabled: true },
  { channel: 'email_recap_new_contact', label: 'Email recap - Nouveau contact', enabled: true },
  { channel: 'email_error', label: 'Email - Alertes erreurs', enabled: true },
  { channel: 'whatsapp_prospect', label: 'WhatsApp - Message prospect', enabled: true },
];

/**
 * Ensure default rows exist in notification_settings.
 * Called on first GET if table is empty.
 */
async function seedDefaults() {
  const db = getDb();
  const existing = await db.select().from(notificationSettings);
  if (existing.length === 0) {
    await db.insert(notificationSettings).values(DEFAULT_CHANNELS);
    logger.info('Parametres de notification initialises avec les valeurs par defaut');
    return db.select().from(notificationSettings);
  }
  return existing;
}

// --- GET /settings/notifications ---
router.get('/settings/notifications', async (_req, res) => {
  try {
    const rows = await seedDefaults();
    // Enrich with labels from DEFAULT_CHANNELS
    const labelMap = new Map(DEFAULT_CHANNELS.map((c) => [c.channel, c.label]));
    const enriched = rows.map((row) => ({
      ...row,
      label: labelMap.get(row.channel) ?? row.channel,
    }));
    res.json(enriched);
  } catch (error) {
    logger.error('Erreur lors de la recuperation des parametres de notification', { error });
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// --- PUT /settings/notifications/:channel ---
router.put('/settings/notifications/:channel', async (req, res) => {
  try {
    const { channel } = req.params;
    const { enabled } = req.body;

    if (typeof enabled !== 'boolean') {
      res.status(400).json({ error: 'Le champ "enabled" (boolean) est requis' });
      return;
    }

    const db = getDb();
    const [updated] = await db
      .update(notificationSettings)
      .set({ enabled, updatedAt: new Date() })
      .where(eq(notificationSettings.channel, channel))
      .returning();

    if (!updated) {
      res.status(404).json({ error: 'Canal non trouve' });
      return;
    }

    logger.info('Parametre de notification mis a jour', { channel, enabled });
    res.json(updated);
  } catch (error) {
    logger.error('Erreur lors de la mise a jour du parametre de notification', { error });
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// --- GET /settings/activities ---
router.get('/settings/activities', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string, 10) || 100, 500);
    const offset = parseInt(req.query.offset as string, 10) || 0;
    const typeFilter = req.query.type as string | undefined;

    const db = getDb();

    // Build where conditions
    const conditions = typeFilter
      ? eq(activities.type, typeFilter as any)
      : undefined;

    // Query activities with lead name join
    const rows = await db
      .select({
        id: activities.id,
        leadId: activities.leadId,
        leadName: leads.name,
        type: activities.type,
        content: activities.content,
        metadata: activities.metadata,
        createdAt: activities.createdAt,
      })
      .from(activities)
      .innerJoin(leads, eq(activities.leadId, leads.id))
      .where(conditions)
      .orderBy(desc(activities.createdAt))
      .limit(limit)
      .offset(offset);

    // Get total count
    const [totalResult] = await db
      .select({ total: count() })
      .from(activities)
      .where(conditions);

    res.json({
      activities: rows,
      total: totalResult?.total ?? 0,
    });
  } catch (error) {
    logger.error('Erreur lors de la recuperation du journal d\'activite', { error });
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

export default router;
