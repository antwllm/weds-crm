import { Router } from 'express';
import { z } from 'zod';
import { eq, and, desc, asc } from 'drizzle-orm';
import { ensureAuthenticated } from '../../auth/middleware.js';
import { getDb } from '../../db/index.js';
import { leads, whatsappMessages, activities } from '../../db/schema.js';
import { sendWhatsAppMessage } from '../../services/whatsapp.js';
import { config } from '../../config.js';
import { logger } from '../../logger.js';

const router = Router();

const sendMessageSchema = z.object({
  message: z.string().min(1, 'Le message est requis'),
});

/**
 * POST /api/leads/:leadId/whatsapp/send
 * Send a WhatsApp message to a lead.
 */
router.post('/leads/:leadId/whatsapp/send', ensureAuthenticated, async (req, res) => {
  try {
    const leadId = Number(req.params.leadId);
    const parseResult = sendMessageSchema.safeParse(req.body);

    if (!parseResult.success) {
      res.status(400).json({ error: parseResult.error.issues[0].message });
      return;
    }

    const { message } = parseResult.data;

    // Check WhatsApp configuration
    if (!config.WHATSAPP_PHONE_NUMBER_ID || !config.WHATSAPP_ACCESS_TOKEN) {
      res.status(503).json({ error: 'WhatsApp non configure' });
      return;
    }

    const db = getDb();

    // Find lead
    const leadResults = await db.select().from(leads).where(eq(leads.id, leadId));
    const lead = leadResults[0];

    if (!lead) {
      res.status(404).json({ error: 'Lead non trouve' });
      return;
    }

    if (!lead.phone) {
      res.status(400).json({ error: 'Lead sans numero de telephone' });
      return;
    }

    // Send WhatsApp message
    const waMessageId = await sendWhatsAppMessage(
      config.WHATSAPP_PHONE_NUMBER_ID,
      config.WHATSAPP_ACCESS_TOKEN,
      lead.phone,
      message,
    );

    // Store message
    await db.insert(whatsappMessages).values({
      leadId,
      waMessageId,
      direction: 'outbound',
      body: message,
      status: 'sent',
    });

    // Log activity
    await db.insert(activities).values({
      leadId,
      type: 'whatsapp_sent',
      content: message,
    });

    logger.info('WhatsApp message envoye', { leadId, waMessageId });
    res.status(200).json({ status: 'sent', waMessageId });
  } catch (error) {
    logger.error('Erreur envoi WhatsApp', {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({ error: 'Erreur envoi WhatsApp' });
  }
});

/**
 * GET /api/leads/:leadId/whatsapp
 * Get WhatsApp message history for a lead.
 */
router.get('/leads/:leadId/whatsapp', ensureAuthenticated, async (req, res) => {
  try {
    const leadId = Number(req.params.leadId);
    const db = getDb();

    const messages = await db
      .select()
      .from(whatsappMessages)
      .where(eq(whatsappMessages.leadId, leadId))
      .orderBy(asc(whatsappMessages.createdAt));

    res.status(200).json({ messages });
  } catch (error) {
    logger.error('Erreur recuperation historique WhatsApp', {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({ error: 'Erreur recuperation historique' });
  }
});

/**
 * GET /api/leads/:leadId/whatsapp/window
 * Check if the 24h conversation window is open for a lead.
 */
router.get('/leads/:leadId/whatsapp/window', ensureAuthenticated, async (req, res) => {
  try {
    const leadId = Number(req.params.leadId);
    const db = getDb();

    // Find last inbound message
    const lastInbound = await db
      .select()
      .from(whatsappMessages)
      .where(
        and(
          eq(whatsappMessages.leadId, leadId),
          eq(whatsappMessages.direction, 'inbound'),
        ),
      )
      .orderBy(desc(whatsappMessages.createdAt))
      .limit(1);

    if (lastInbound.length === 0 || !lastInbound[0].createdAt) {
      res.status(200).json({ isOpen: false, expiresAt: null });
      return;
    }

    const lastInboundTime = lastInbound[0].createdAt.getTime();
    const now = Date.now();
    const twentyFourHours = 24 * 60 * 60 * 1000;
    const isOpen = (now - lastInboundTime) < twentyFourHours;
    const expiresAt = new Date(lastInboundTime + twentyFourHours).toISOString();

    res.status(200).json({ isOpen, expiresAt });
  } catch (error) {
    logger.error('Erreur verification fenetre WhatsApp', {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({ error: 'Erreur verification fenetre' });
  }
});

export default router;
