import { Router } from 'express';
import { z } from 'zod';
import { eq, asc } from 'drizzle-orm';
import { getDb } from '../../db/index.js';
import { activities } from '../../db/schema.js';
import { ensureAuthenticated } from '../../auth/middleware.js';
import { logger } from '../../logger.js';

const router = Router();

// All routes require authentication
router.use(ensureAuthenticated);

// --- Validation schemas ---

const createNoteSchema = z.object({
  content: z.string().min(1, 'Le contenu de la note est requis'),
});

// --- GET /api/leads/:id/activities ---
router.get('/leads/:id/activities', async (req, res) => {
  try {
    const leadId = parseInt(req.params.id, 10);
    if (isNaN(leadId)) {
      res.status(400).json({ error: 'ID invalide' });
      return;
    }

    const db = getDb();

    const result = await db
      .select()
      .from(activities)
      .where(eq(activities.leadId, leadId))
      .orderBy(asc(activities.createdAt));

    res.json(result);
  } catch (error) {
    logger.error('Erreur lors de la recuperation des activites', { error });
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// --- POST /api/leads/:id/notes ---
router.post('/leads/:id/notes', async (req, res) => {
  try {
    const leadId = parseInt(req.params.id, 10);
    if (isNaN(leadId)) {
      res.status(400).json({ error: 'ID invalide' });
      return;
    }

    const parsed = createNoteSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: 'Donnees invalides',
        details: parsed.error.issues,
      });
      return;
    }

    const db = getDb();

    const [newActivity] = await db
      .insert(activities)
      .values({
        leadId,
        type: 'note_added',
        content: parsed.data.content,
      })
      .returning();

    logger.info('Note ajoutee au lead', { leadId, activityId: newActivity.id });
    res.status(201).json(newActivity);
  } catch (error) {
    logger.error('Erreur lors de la creation de la note', { error });
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

export default router;
