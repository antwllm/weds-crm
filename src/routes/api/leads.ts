import { Router } from 'express';
import { z } from 'zod';
import { eq, and, gte, lte, desc } from 'drizzle-orm';
import { getDb } from '../../db/index.js';
import { leads, activities, userPreferences } from '../../db/schema.js';
import { ensureAuthenticated } from '../../auth/middleware.js';
import { logger } from '../../logger.js';
import { syncLeadToPipedrive } from '../../services/pipedrive/sync-push.js';

const router = Router();

// All routes require authentication
router.use(ensureAuthenticated);

// --- Validation schemas ---

const createLeadSchema = z.object({
  name: z.string().min(1, 'Le nom est requis'),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  eventDate: z.string().optional(),
  message: z.string().optional(),
  budget: z.number().int().optional(),
  source: z.string().optional(),
});

const updateLeadSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  eventDate: z.string().optional(),
  message: z.string().optional(),
  budget: z.number().int().nullable().optional(),
  source: z.string().optional(),
  status: z.enum(['nouveau', 'contacte', 'rdv', 'devis_envoye', 'signe', 'perdu']).optional(),
});

// --- GET /api/leads ---
router.get('/', async (req, res) => {
  try {
    const { status, source, dateFrom, dateTo } = req.query;
    const db = getDb();

    const conditions: any[] = [];

    if (status && typeof status === 'string') {
      conditions.push(eq(leads.status, status as any));
    }
    if (source && typeof source === 'string') {
      conditions.push(eq(leads.source, source));
    }
    if (dateFrom && typeof dateFrom === 'string') {
      conditions.push(gte(leads.createdAt, new Date(dateFrom)));
    }
    if (dateTo && typeof dateTo === 'string') {
      conditions.push(lte(leads.createdAt, new Date(dateTo)));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const result = await db
      .select()
      .from(leads)
      .where(whereClause!)
      .orderBy(desc(leads.createdAt));

    res.json(result);
  } catch (error) {
    logger.error('Erreur lors de la recuperation des leads', { error });
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// --- GET /api/leads/preferences ---
router.get('/preferences', async (req, res) => {
  try {
    const db = getDb();
    const email = (req.user as any)?.email || process.env.ALLOWED_USER_EMAIL || '';

    const [prefs] = await db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.userEmail, email))
      .limit(1);

    if (!prefs) {
      res.json({ filters: {}, sortBy: 'createdAt', sortDirection: 'desc' });
      return;
    }

    res.json({
      filters: prefs.filters ?? {},
      sortBy: prefs.sortBy ?? 'createdAt',
      sortDirection: prefs.sortDirection ?? 'desc',
    });
  } catch (error) {
    logger.error('Erreur lors de la recuperation des preferences', { error });
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// --- PUT /api/leads/preferences ---
const preferencesSchema = z.object({
  filters: z
    .object({
      status: z.string().optional(),
      source: z.string().optional(),
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
    })
    .optional(),
  sortBy: z.enum(['createdAt', 'eventDate']),
  sortDirection: z.enum(['asc', 'desc']),
});

router.put('/preferences', async (req, res) => {
  try {
    const parsed = preferencesSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: 'Donnees invalides',
        details: parsed.error.issues,
      });
      return;
    }

    const db = getDb();
    const email = (req.user as any)?.email || process.env.ALLOWED_USER_EMAIL || '';
    const { filters, sortBy, sortDirection } = parsed.data;

    await db
      .insert(userPreferences)
      .values({
        userEmail: email,
        filters: filters ?? {},
        sortBy,
        sortDirection,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: userPreferences.userEmail,
        set: {
          filters: filters ?? {},
          sortBy,
          sortDirection,
          updatedAt: new Date(),
        },
      });

    res.json({ filters: filters ?? {}, sortBy, sortDirection });
  } catch (error) {
    logger.error('Erreur lors de la sauvegarde des preferences', { error });
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// --- POST /api/leads ---
router.post('/', async (req, res) => {
  try {
    const parsed = createLeadSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: 'Donnees invalides',
        details: parsed.error.issues,
      });
      return;
    }

    const db = getDb();
    const data = parsed.data;

    const [newLead] = await db
      .insert(leads)
      .values({
        name: data.name,
        email: data.email,
        phone: data.phone,
        eventDate: data.eventDate,
        message: data.message,
        budget: data.budget,
        source: data.source ?? 'mariages.net',
        status: 'nouveau',
      })
      .returning();

    // Create initial status_change activity
    await db.insert(activities).values({
      leadId: newLead.id,
      type: 'status_change',
      content: 'Lead cree manuellement',
      metadata: { from: null, to: 'nouveau' },
    });

    logger.info('Lead cree manuellement', { leadId: newLead.id, name: data.name });

    // Fire-and-forget sync to Pipedrive (don't block API response)
    setImmediate(async () => {
      try {
        await syncLeadToPipedrive(newLead, 'create');
      } catch (error) {
        logger.error('Sync Pipedrive echoue apres creation', {
          leadId: newLead.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    });

    res.status(201).json(newLead);
  } catch (error) {
    logger.error('Erreur lors de la creation du lead', { error });
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// --- PATCH /api/leads/:id ---
router.patch('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: 'ID invalide' });
      return;
    }

    const parsed = updateLeadSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: 'Donnees invalides',
        details: parsed.error.issues,
      });
      return;
    }

    const db = getDb();

    // Check lead exists and get current status
    const [existing] = await db
      .select()
      .from(leads)
      .where(eq(leads.id, id))
      .limit(1);

    if (!existing) {
      res.status(404).json({ error: 'Lead non trouve' });
      return;
    }

    const data = parsed.data;
    const statusChanged = data.status && data.status !== existing.status;

    // Build update fields
    const updateFields: Record<string, any> = { ...data, updatedAt: new Date() };

    const [updated] = await db
      .update(leads)
      .set(updateFields)
      .where(eq(leads.id, id))
      .returning();

    // Create status_change activity if status changed
    if (statusChanged) {
      await db.insert(activities).values({
        leadId: id,
        type: 'status_change',
        content: `Statut change de ${existing.status} a ${data.status}`,
        metadata: { from: existing.status, to: data.status },
      });
      logger.info('Statut du lead modifie', {
        leadId: id,
        from: existing.status,
        to: data.status,
      });
    }

    // Fire-and-forget sync to Pipedrive (don't block API response)
    setImmediate(async () => {
      try {
        await syncLeadToPipedrive(updated, 'update');
      } catch (error) {
        logger.error('Sync Pipedrive echoue apres mise a jour', {
          leadId: id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    });

    res.json(updated);
  } catch (error) {
    logger.error('Erreur lors de la mise a jour du lead', { error });
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// --- POST /api/leads/:id/sync-pipedrive ---
router.post('/:id/sync-pipedrive', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: 'ID invalide' });
      return;
    }

    const db = getDb();

    const [lead] = await db
      .select()
      .from(leads)
      .where(eq(leads.id, id))
      .limit(1);

    if (!lead) {
      res.status(404).json({ error: 'Lead non trouve' });
      return;
    }

    const action = lead.pipedriveDealId ? 'update' : 'create';
    await syncLeadToPipedrive(lead, action);

    // Re-fetch lead to get updated pipedriveDealId
    const [updated] = await db
      .select()
      .from(leads)
      .where(eq(leads.id, id))
      .limit(1);

    res.json({ status: 'synced', pipedriveDealId: updated?.pipedriveDealId });
  } catch (error) {
    logger.error('Echec synchronisation manuelle Pipedrive', {
      leadId: req.params.id,
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({ error: 'Echec de synchronisation Pipedrive' });
  }
});

// --- DELETE /api/leads/:id ---
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: 'ID invalide' });
      return;
    }

    const db = getDb();

    // Check lead exists
    const [existing] = await db
      .select()
      .from(leads)
      .where(eq(leads.id, id))
      .limit(1);

    if (!existing) {
      res.status(404).json({ error: 'Lead non trouve' });
      return;
    }

    // Delete activities first (foreign key constraint)
    await db.delete(activities).where(eq(activities.leadId, id));

    // Delete the lead
    await db.delete(leads).where(eq(leads.id, id));

    logger.info('Lead supprime', { leadId: id, name: existing.name });
    res.status(204).send();
  } catch (error) {
    logger.error('Erreur lors de la suppression du lead', { error });
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

export default router;
