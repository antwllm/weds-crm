import { Router } from 'express';
import { z } from 'zod';
import { eq, desc } from 'drizzle-orm';
import { getDb } from '../../db/index.js';
import { emailTemplates, leads } from '../../db/schema.js';
import { ensureAuthenticated } from '../../auth/middleware.js';
import { substituteVariables } from '../../services/openrouter.js';
import { logger } from '../../logger.js';

const router = Router();

// All routes require authentication
router.use(ensureAuthenticated);

// --- Validation schemas ---

const createTemplateSchema = z.object({
  name: z.string().min(1, 'Le nom est requis'),
  subject: z.string().optional(),
  body: z.string().optional(),
  variables: z.array(z.string()).optional(),
});

const updateTemplateSchema = z.object({
  name: z.string().min(1).optional(),
  subject: z.string().optional(),
  body: z.string().optional(),
  variables: z.array(z.string()).optional(),
});

const previewSchema = z.object({
  leadId: z.number().int(),
});

// --- GET /api/templates ---
router.get('/templates', async (_req, res) => {
  try {
    const db = getDb();
    const result = await db
      .select()
      .from(emailTemplates)
      .orderBy(desc(emailTemplates.createdAt));

    res.json({ templates: result });
  } catch (error) {
    logger.error('Erreur lors de la récupération des templates', { error });
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// --- POST /api/templates ---
router.post('/templates', async (req, res) => {
  try {
    const parsed = createTemplateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: 'Données invalides',
        details: parsed.error.issues,
      });
      return;
    }

    const db = getDb();
    const [created] = await db.insert(emailTemplates).values({
      name: parsed.data.name,
      subject: parsed.data.subject,
      body: parsed.data.body,
      variables: parsed.data.variables,
    }).returning();

    logger.info('Template email créé', { templateId: created.id, name: created.name });
    res.status(201).json(created);
  } catch (error) {
    logger.error('Erreur lors de la creation du template', { error });
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// --- PUT /api/templates/:id ---
router.put('/templates/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: 'ID invalide' });
      return;
    }

    const parsed = updateTemplateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: 'Données invalides',
        details: parsed.error.issues,
      });
      return;
    }

    const db = getDb();
    const [updated] = await db
      .update(emailTemplates)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(emailTemplates.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: 'Template non trouvé' });
      return;
    }

    logger.info('Template email mis à jour', { templateId: id });
    res.json(updated);
  } catch (error) {
    logger.error('Erreur lors de la mise a jour du template', { error });
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// --- DELETE /api/templates/:id ---
router.delete('/templates/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: 'ID invalide' });
      return;
    }

    const db = getDb();
    await db.delete(emailTemplates).where(eq(emailTemplates.id, id));

    res.status(204).send();
  } catch (error) {
    logger.error('Erreur lors de la suppression du template', { error });
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// --- POST /api/templates/:id/preview ---
router.post('/templates/:id/preview', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: 'ID invalide' });
      return;
    }

    const parsed = previewSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: 'Données invalides',
        details: parsed.error.issues,
      });
      return;
    }

    const db = getDb();

    // Fetch template
    const [template] = await db
      .select()
      .from(emailTemplates)
      .where(eq(emailTemplates.id, id))
      .limit(1);

    if (!template) {
      res.status(404).json({ error: 'Template non trouvé' });
      return;
    }

    // Fetch lead
    const [lead] = await db
      .select()
      .from(leads)
      .where(eq(leads.id, parsed.data.leadId))
      .limit(1);

    if (!lead) {
      res.status(404).json({ error: 'Lead non trouve' });
      return;
    }

    const leadVars = {
      name: lead.name,
      eventDate: lead.eventDate || '',
      budget: lead.budget?.toString() || '',
      email: lead.email || '',
      phone: lead.phone || '',
    };

    const subject = substituteVariables(template.subject || '', leadVars);
    const body = substituteVariables(template.body || '', leadVars);

    res.json({ subject, body });
  } catch (error) {
    logger.error('Erreur lors de la preview du template', { error });
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

export default router;
