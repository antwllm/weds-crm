import { Router } from 'express';
import { eq, desc, and } from 'drizzle-orm';
import { getDb } from '../../db/index.js';
import { aiDecisions } from '../../db/schema.js';
import { ensureAuthenticated } from '../../auth/middleware.js';
import { submitScore } from '../../services/langfuse.js';
import { logger } from '../../logger.js';

const router = Router();

// GET /leads/:id/ai-decisions?action=reply|pass_to_human
router.get('/leads/:id/ai-decisions', ensureAuthenticated, async (req, res) => {
  try {
    const db = getDb();
    const leadId = Number(req.params.id);
    const actionFilter = req.query.action as string | undefined;

    const conditions = [eq(aiDecisions.leadId, leadId)];
    if (actionFilter && (actionFilter === 'reply' || actionFilter === 'pass_to_human')) {
      conditions.push(eq(aiDecisions.action, actionFilter));
    }

    const decisions = await db
      .select()
      .from(aiDecisions)
      .where(conditions.length === 1 ? conditions[0] : and(...conditions))
      .orderBy(desc(aiDecisions.createdAt));

    res.json({ decisions });
  } catch (error) {
    logger.error('Erreur chargement ai_decisions', { error });
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /ai-decisions/:id/score
router.post('/ai-decisions/:id/score', ensureAuthenticated, async (req, res) => {
  try {
    const db = getDb();
    const decisionId = Number(req.params.id);
    const { score, comment } = req.body as { score: number; comment?: string };

    if (score !== 0 && score !== 1) {
      return res.status(400).json({ error: 'Score doit etre 0 ou 1' });
    }

    // Update local DB
    await db
      .update(aiDecisions)
      .set({ score, scoreComment: comment || null })
      .where(eq(aiDecisions.id, decisionId));

    // Forward to Langfuse (best-effort, fire-and-forget)
    const [decision] = await db
      .select({ langfuseTraceId: aiDecisions.langfuseTraceId })
      .from(aiDecisions)
      .where(eq(aiDecisions.id, decisionId));

    if (decision?.langfuseTraceId) {
      submitScore(decision.langfuseTraceId, score, comment).catch((err) =>
        logger.warn('Langfuse score forward echoue', { error: err })
      );
    }

    res.json({ ok: true });
  } catch (error) {
    logger.error('Erreur soumission score ai_decision', { error });
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;
