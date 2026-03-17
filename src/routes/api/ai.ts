import { Router } from 'express';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { getDb } from '../../db/index.js';
import { aiPromptConfig, whatsappAgentConfig } from '../../db/schema.js';
import { ensureAuthenticated } from '../../auth/middleware.js';
import { assembleLeadContext, generateDraft } from '../../services/openrouter.js';
import { pushPromptToLangfuse } from '../../services/langfuse-prompts.js';
import { config } from '../../config.js';
import { logger } from '../../logger.js';

const router = Router();

// All routes require authentication
router.use(ensureAuthenticated);

// --- Default prompt template ---
const DEFAULT_PROMPT_TEMPLATE = `Tu es un photographe de mariage professionnel basé en France. Tu réponds aux demandes de couples qui souhaitent des informations sur tes services. Sois chaleureux, professionnel et personnalise ta réponse en utilisant les informations du lead.`;

// --- Default WhatsApp agent prompt template ---
const DEFAULT_WA_PROMPT_TEMPLATE = `Tu es l'assistant IA de Weds, photographe de mariage professionnel en France.
Tu reponds aux prospects sur WhatsApp de maniere chaleureuse et professionnelle.

Contexte du lead :
- Nom : {{nom}}
- Statut : {{statut}}
- Date evenement : {{date_evenement}}
- Budget : {{budget}}

{{historique_whatsapp}}

REGLES STRICTES :
- JAMAIS donner de tarifs, disponibilites de dates ou devis
- Messages courts, style WhatsApp (pas de longs paves)
- Si le prospect demande des tarifs, disponibilites ou un devis, tu DOIS utiliser action "pass_to_human"
- Si tu detectes une reclamation ou un probleme, utilise action "pass_to_human"
- Si le sujet depasse tes connaissances, utilise action "pass_to_human"
- Tu peux repondre aux questions sur les prestations, le style photo, le deroulement, l'equipe, le materiel
- Si deux maries sont mentionnes (ou si le prospect dit "nous", "on"), adresse-toi aux deux en utilisant le pluriel (ex: "Vous deux", "votre mariage", "vos photos")

Tu DOIS repondre UNIQUEMENT en JSON avec ce format exact :
{"action": "reply" | "pass_to_human", "response": "ton message au prospect", "reason": "explication courte de ta decision"}`;

// --- Validation schemas ---

const updatePromptSchema = z.object({
  promptTemplate: z.string().min(1, 'Le modèle est requis'),
  model: z.string().optional(),
});

const generateDraftSchema = z.object({
  leadId: z.number().int(),
});

const updateWaPromptSchema = z.object({
  promptTemplate: z.string().min(1, 'Le prompt est requis'),
  knowledgeBase: z.string().optional(),
  model: z.string().optional(),
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

// --- GET /api/ai/whatsapp-prompt ---
router.get('/ai/whatsapp-prompt', async (_req, res) => {
  try {
    const db = getDb();
    const [existing] = await db
      .select()
      .from(whatsappAgentConfig)
      .limit(1);

    if (!existing) {
      res.json({
        promptTemplate: DEFAULT_WA_PROMPT_TEMPLATE,
        knowledgeBase: null,
        model: 'anthropic/claude-sonnet-4',
        langfusePromptName: null,
        langfuseSyncedAt: null,
      });
      return;
    }

    res.json(existing);
  } catch (error) {
    logger.error('Erreur lors de la recuperation du prompt WhatsApp AI', { error });
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// --- PUT /api/ai/whatsapp-prompt ---
router.put('/ai/whatsapp-prompt', async (req, res) => {
  try {
    const parsed = updateWaPromptSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: 'Donnees invalides',
        details: parsed.error.issues,
      });
      return;
    }

    const db = getDb();

    // Check if a config already exists
    const [existing] = await db
      .select()
      .from(whatsappAgentConfig)
      .limit(1);

    let result;
    if (existing) {
      [result] = await db
        .update(whatsappAgentConfig)
        .set({
          promptTemplate: parsed.data.promptTemplate,
          knowledgeBase: parsed.data.knowledgeBase ?? existing.knowledgeBase,
          model: parsed.data.model || existing.model,
          updatedAt: new Date(),
        })
        .where(eq(whatsappAgentConfig.id, existing.id))
        .returning();
    } else {
      [result] = await db
        .insert(whatsappAgentConfig)
        .values({
          promptTemplate: parsed.data.promptTemplate,
          knowledgeBase: parsed.data.knowledgeBase || null,
          model: parsed.data.model || 'anthropic/claude-sonnet-4',
        })
        .returning();
    }

    logger.info('Prompt WhatsApp AI mis a jour');

    // Fire-and-forget: push prompt to Langfuse Prompt Management
    const promptName = result.langfusePromptName || 'whatsapp-agent-prompt';
    pushPromptToLangfuse(parsed.data.promptTemplate, promptName).then(async (pushResult) => {
      if (pushResult) {
        try {
          await db
            .update(whatsappAgentConfig)
            .set({ langfuseSyncedAt: new Date() })
            .where(eq(whatsappAgentConfig.id, result.id));
          logger.info('Langfuse sync timestamp mis a jour', { promptName, version: pushResult.version });
        } catch (err) {
          logger.warn('Erreur mise a jour langfuseSyncedAt', { error: err });
        }
      }
    }).catch((err) => {
      logger.warn('Langfuse push prompt echoue (fire-and-forget)', { error: err });
    });

    res.json(result);
  } catch (error) {
    logger.error('Erreur lors de la mise a jour du prompt WhatsApp AI', { error });
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

export default router;
