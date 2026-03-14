import { Router } from 'express';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { getDb } from '../../db/index.js';
import { aiPromptConfig } from '../../db/schema.js';
import { ensureAuthenticated } from '../../auth/middleware.js';
import { assembleLeadContext, generateDraft } from '../../services/openrouter.js';
import { config } from '../../config.js';
import { logger } from '../../logger.js';

const router = Router();

// All routes require authentication
router.use(ensureAuthenticated);

// --- Default prompt template ---
const DEFAULT_PROMPT_TEMPLATE = `Tu es un photographe de mariage professionnel basé en France. Tu réponds aux demandes de couples qui souhaitent des informations sur tes services. Sois chaleureux, professionnel et personnalise ta réponse en utilisant les informations du lead.`;

// --- Validation schemas ---

const updatePromptSchema = z.object({
  promptTemplate: z.string().min(1, 'Le modèle est requis'),
  model: z.string().optional(),
});

const generateDraftSchema = z.object({
  leadId: z.number().int(),
});

// --- GET /api/ai/prompt ---
router.get('/ai/prompt', async (_req, res) => {
  try {
    const db = getDb();
    const [existing] = await db
      .select()
      .from(aiPromptConfig)
      .limit(1);

    if (!existing) {
      res.json({
        promptTemplate: DEFAULT_PROMPT_TEMPLATE,
        model: 'anthropic/claude-sonnet-4',
      });
      return;
    }

    res.json(existing);
  } catch (error) {
    logger.error('Erreur lors de la récupération du prompt AI', { error });
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// --- PUT /api/ai/prompt ---
router.put('/ai/prompt', async (req, res) => {
  try {
    const parsed = updatePromptSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: 'Données invalides',
        details: parsed.error.issues,
      });
      return;
    }

    const db = getDb();

    // Check if a config already exists
    const [existing] = await db
      .select()
      .from(aiPromptConfig)
      .limit(1);

    let result;
    if (existing) {
      [result] = await db
        .update(aiPromptConfig)
        .set({
          promptTemplate: parsed.data.promptTemplate,
          model: parsed.data.model || existing.model,
          updatedAt: new Date(),
        })
        .where(eq(aiPromptConfig.id, existing.id))
        .returning();
    } else {
      [result] = await db
        .insert(aiPromptConfig)
        .values({
          promptTemplate: parsed.data.promptTemplate,
          model: parsed.data.model || 'anthropic/claude-sonnet-4',
        })
        .returning();
    }

    logger.info('Prompt AI mis à jour');
    res.json(result);
  } catch (error) {
    logger.error('Erreur lors de la mise a jour du prompt AI', { error });
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// --- POST /api/ai/generate-draft ---
router.post('/ai/generate-draft', async (req, res) => {
  try {
    const parsed = generateDraftSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: 'Données invalides',
        details: parsed.error.issues,
      });
      return;
    }

    // Check API key is configured
    if (!config.OPENROUTER_API_KEY) {
      res.status(503).json({ error: 'OPENROUTER_API_KEY non configure. L\'IA n\'est pas disponible.' });
      return;
    }

    const db = getDb();

    // Get current prompt config
    const [promptConfig] = await db
      .select()
      .from(aiPromptConfig)
      .limit(1);

    const promptTemplate = promptConfig?.promptTemplate || DEFAULT_PROMPT_TEMPLATE;

    // Assemble lead context
    const leadContext = await assembleLeadContext(parsed.data.leadId);

    // Generate draft (NEVER auto-send -- returned as text for user review)
    const draft = await generateDraft(leadContext, promptTemplate, config.OPENROUTER_API_KEY);

    res.json({ draft });
  } catch (error) {
    logger.error('Erreur lors de la génération du brouillon AI', { error });
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

export default router;
