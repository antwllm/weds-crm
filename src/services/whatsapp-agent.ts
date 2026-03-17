import axios from 'axios';
import { z } from 'zod';
import { eq, desc } from 'drizzle-orm';
import { getDb } from '../db/index.js';
import {
  leads,
  whatsappMessages,
  activities,
  whatsappAgentConfig,
  aiDecisions,
} from '../db/schema.js';
import { sendWhatsAppMessage } from './whatsapp.js';
import { config } from '../config.js';
import { logger } from '../logger.js';
import { getGmailClientInstance } from './gmail-client-holder.js';
import { traceAiCall, computePromptVersion } from './langfuse.js';
import type { AiCallResult } from './langfuse.js';
import { getLangfusePrompt } from './langfuse-prompts.js';
import type { Lead } from '../types.js';

// --- Zod schema for structured AI response ---

const aiResponseSchema = z.object({
  action: z.enum(['reply', 'pass_to_human']),
  response: z.string(),
  reason: z.string(),
});

type AiResponse = z.infer<typeof aiResponseSchema>;

// --- Types ---

type AgentConfig = {
  promptTemplate: string;
  knowledgeBase: string | null;
  model: string | null;
  langfusePromptName: string | null;
};

type StoredMessage = {
  direction: string;
  body: string | null;
  sentBy: string | null;
  createdAt: Date | null;
};

// --- Main entry point ---

/**
 * Process an incoming WhatsApp message through the AI agent.
 * Decides whether to auto-reply or pass to human.
 */
export async function processWhatsAppAiResponse(
  lead: Lead,
  incomingText: string,
): Promise<void> {
  const db = getDb();

  // Load agent config (single-row pattern)
  const configRows = await db
    .select()
    .from(whatsappAgentConfig)
    .limit(1);

  const agentConfig = configRows[0] as AgentConfig | undefined;

  if (!agentConfig) {
    logger.warn('Agent IA WhatsApp: aucune configuration trouvee, message ignore', {
      leadId: lead.id,
    });
    return;
  }

  // Check OpenRouter API key
  if (!config.OPENROUTER_API_KEY) {
    logger.warn('Agent IA WhatsApp: OPENROUTER_API_KEY non configure', {
      leadId: lead.id,
    });
    return;
  }

  // Fetch last 10 messages for context
  const recentMessages = await db
    .select({
      direction: whatsappMessages.direction,
      body: whatsappMessages.body,
      sentBy: whatsappMessages.sentBy,
      createdAt: whatsappMessages.createdAt,
    })
    .from(whatsappMessages)
    .where(eq(whatsappMessages.leadId, lead.id))
    .orderBy(desc(whatsappMessages.createdAt))
    .limit(10);

  // Reverse for chronological order
  const messages = recentMessages.reverse();

  // Build prompt and call AI
  const systemPrompt = buildSystemPrompt(agentConfig, lead, messages);
  const model = agentConfig.model || 'anthropic/claude-sonnet-4';
  const promptVersion = computePromptVersion(agentConfig.promptTemplate);

  // Fetch Langfuse prompt object for trace linking (best-effort)
  const langfusePromptName = agentConfig.langfusePromptName || 'whatsapp-agent-prompt';
  const langfusePromptObj = await getLangfusePrompt(langfusePromptName);

  // Trace AI call via Langfuse (best-effort)
  const traceResult = await traceAiCall(
    {
      name: 'whatsapp-agent',
      leadId: lead.id,
      leadName: lead.name,
      model,
      systemPrompt,
      userMessage: incomingText,
      promptVersion,
      langfusePrompt: langfusePromptObj,
    },
    () => callOpenRouter(systemPrompt, incomingText, model),
  );

  const responseContent = traceResult.response;
  const parsed = parseAiResponse(responseContent);

  // Check consecutive counter: force handoff at 10th consecutive AI exchange
  const consecutiveCount = lead.whatsappAiConsecutiveCount || 0;
  if (consecutiveCount >= 10 && parsed.action === 'reply') {
    logger.info('Agent IA WhatsApp: limite de 10 echanges IA consecutifs atteinte', {
      leadId: lead.id,
      consecutiveCount,
    });

    // Persist forced handoff decision
    try {
      await db.insert(aiDecisions).values({
        leadId: lead.id,
        action: 'pass_to_human',
        reason: '5 echanges IA consecutifs sans resolution',
        responseText: '',
        prospectMessage: incomingText,
        model,
        latencyMs: traceResult.latencyMs,
        promptTokens: traceResult.usage?.promptTokens ?? null,
        completionTokens: traceResult.usage?.completionTokens ?? null,
        promptVersion,
        langfuseTraceId: traceResult.langfuseTraceId,
      });
    } catch (err) {
      logger.warn('Erreur persistence ai_decision (forced handoff)', { leadId: lead.id, error: err });
    }

    await handleHandoff(lead, '5 echanges IA consecutifs sans resolution', messages);
    return;
  }

  if (parsed.action === 'reply') {
    // Simulate human-like response delay (5-15 seconds)
    const delayMs = 5000 + Math.random() * 10000;
    logger.info('Agent IA WhatsApp: delai de reponse simule', {
      leadId: lead.id,
      delayMs: Math.round(delayMs),
    });
    await new Promise((resolve) => setTimeout(resolve, delayMs));

    // Send auto-reply via WhatsApp
    const waMessageId = await sendWhatsAppMessage(
      config.WHATSAPP_PHONE_NUMBER_ID!,
      config.WHATSAPP_ACCESS_TOKEN!,
      lead.phone!,
      parsed.response,
    );

    // Store outbound message
    await db.insert(whatsappMessages).values({
      leadId: lead.id,
      waMessageId,
      direction: 'outbound',
      body: parsed.response,
      status: 'sent',
      sentBy: 'ai',
    });

    // Create activity
    await db.insert(activities).values({
      leadId: lead.id,
      type: 'whatsapp_sent',
      content: parsed.response,
    });

    // Increment consecutive counter
    await db
      .update(leads)
      .set({ whatsappAiConsecutiveCount: consecutiveCount + 1 })
      .where(eq(leads.id, lead.id));

    logger.info('Agent IA WhatsApp: reponse envoyee', {
      leadId: lead.id,
      waMessageId,
      reason: parsed.reason,
    });
  } else {
    // Pass to human
    await handleHandoff(lead, parsed.reason, messages);
  }

  // Persist AI decision for the Decisions IA tab
  try {
    await db.insert(aiDecisions).values({
      leadId: lead.id,
      action: parsed.action,
      reason: parsed.reason,
      responseText: parsed.response,
      prospectMessage: incomingText,
      model,
      latencyMs: traceResult.latencyMs,
      promptTokens: traceResult.usage?.promptTokens ?? null,
      completionTokens: traceResult.usage?.completionTokens ?? null,
      promptVersion,
      langfuseTraceId: traceResult.langfuseTraceId,
    });
  } catch (err) {
    logger.warn('Erreur persistence ai_decision', { leadId: lead.id, error: err });
  }
}

// --- Build system prompt ---

function buildSystemPrompt(
  agentConfig: AgentConfig,
  lead: Lead,
  messages: StoredMessage[],
): string {
  // Determine formality based on lead status
  const formalStatuses = ['nouveau', 'contacte', 'rdv', 'devis_envoye'];
  const formality = formalStatuses.includes(lead.status || '')
    ? 'Utilisez le vouvoiement.'
    : 'Utilisez le tutoiement (relation etablie).';

  // Build conversation history
  const conversationHistory = messages
    .map((msg) => {
      if (msg.direction === 'inbound') {
        return `[Prospect]: ${msg.body || ''}`;
      }
      if (msg.sentBy === 'ai') {
        return `[Agent IA]: ${msg.body || ''}`;
      }
      return `[William]: ${msg.body || ''}`;
    })
    .join('\n');

  // Lead context
  const leadContext = [
    `Nom: ${lead.name}`,
    `Statut: ${lead.status || 'nouveau'}`,
    lead.eventDate ? `Date evenement: ${lead.eventDate}` : null,
    lead.budget ? `Budget: ${lead.budget}` : null,
    lead.email ? `Email: ${lead.email}` : null,
    formality,
  ]
    .filter(Boolean)
    .join('\n');

  // Assemble full prompt
  const parts = [
    agentConfig.promptTemplate,
    '',
    '--- Base de connaissances ---',
    agentConfig.knowledgeBase || '(Aucune)',
    '',
    '--- Contexte du lead ---',
    leadContext,
    '',
    '--- Historique conversation WhatsApp (10 derniers messages) ---',
    conversationHistory || '(Aucun message precedent)',
    '',
    '--- Format de reponse ---',
    'Reponds UNIQUEMENT en JSON valide avec cette structure exacte:',
    '{"action": "reply" | "pass_to_human", "response": "ton message au prospect (vide si pass_to_human)", "reason": "explication interne de ta decision"}',
    'Ne mets PAS de blocs de code markdown autour du JSON.',
  ];

  return parts.join('\n');
}

// --- Call OpenRouter API ---

async function callOpenRouter(
  systemPrompt: string,
  userMessage: string,
  model: string,
): Promise<AiCallResult> {
  const response = await axios.post(
    'https://openrouter.ai/api/v1/chat/completions',
    {
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
    },
    {
      headers: {
        'Authorization': `Bearer ${config.OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://weds.fr',
        'X-OpenRouter-Title': 'Weds CRM',
        'Content-Type': 'application/json',
      },
    },
  );

  const content = response.data.choices[0].message.content;
  const rawUsage = response.data.usage;
  return {
    content,
    usage: rawUsage ? {
      promptTokens: rawUsage.prompt_tokens,
      completionTokens: rawUsage.completion_tokens,
    } : undefined,
  };
}

// --- Parse AI response ---

function parseAiResponse(content: string): AiResponse {
  try {
    // Strip markdown code fences if present
    const cleaned = content
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    const parsed = JSON.parse(cleaned);
    const result = aiResponseSchema.safeParse(parsed);

    if (result.success) {
      return result.data;
    }

    logger.warn('Agent IA WhatsApp: reponse IA invalide (validation zod)', {
      raw: content.slice(0, 500),
      errors: result.error.issues,
    });

    return {
      action: 'pass_to_human' as const,
      response: '',
      reason: 'Reponse IA invalide (JSON parse error)',
    };
  } catch (error) {
    logger.warn('Agent IA WhatsApp: reponse IA invalide (JSON parse)', {
      raw: content.slice(0, 500),
      error: error instanceof Error ? error.message : String(error),
    });

    return {
      action: 'pass_to_human' as const,
      response: '',
      reason: 'Reponse IA invalide (JSON parse error)',
    };
  }
}

// --- Handle handoff to human ---

async function handleHandoff(
  lead: Lead,
  reason: string,
  conversationHistory: StoredMessage[],
): Promise<void> {
  const db = getDb();
  const now = new Date();

  // Update handoff timestamp
  await db
    .update(leads)
    .set({ whatsappAiHandoffAt: now })
    .where(eq(leads.id, lead.id));

  // Anti-spam check: max 1 alert per lead per hour
  if (lead.whatsappAiLastAlertAt) {
    const elapsed = now.getTime() - new Date(lead.whatsappAiLastAlertAt).getTime();
    if (elapsed < 3600_000) {
      logger.info('Agent IA WhatsApp: alerte supprimee (rate limit 1h)', {
        leadId: lead.id,
        reason,
        elapsedMs: elapsed,
      });
      return;
    }
  }

  // Update last alert timestamp
  await db
    .update(leads)
    .set({ whatsappAiLastAlertAt: now })
    .where(eq(leads.id, lead.id));

  // Build alert message with last 5 messages
  const lastMessages = conversationHistory.slice(-5);
  const formattedHistory = lastMessages
    .map((msg) => {
      const sender =
        msg.direction === 'inbound'
          ? 'Prospect'
          : msg.sentBy === 'ai'
            ? 'Agent IA'
            : 'William';
      return `${sender}: ${(msg.body || '').slice(0, 100)}`;
    })
    .join('\n');

  const alertMsg = `Agent IA WhatsApp: passage a l'humain pour ${lead.name}\nRaison: ${reason}\n\nDerniers messages:\n${formattedHistory}`;

  // Dispatch alerts via Promise.allSettled
  const alertPromises: Promise<unknown>[] = [];

  // Free Mobile SMS
  if (config.FREE_MOBILE_USER && config.FREE_MOBILE_PASS) {
    alertPromises.push(
      axios.get('https://smsapi.free-mobile.fr/sendmsg', {
        params: {
          user: config.FREE_MOBILE_USER,
          pass: config.FREE_MOBILE_PASS,
          msg: alertMsg.slice(0, 999),
        },
      }),
    );
  }

  // Email alert via Gmail
  try {
    const gmail = getGmailClientInstance();
    if (gmail && config.ALLOWED_USER_EMAIL) {
      const emailBody = alertMsg.replace(/\n/g, '<br>');
      const rawMessage = [
        `To: ${config.ALLOWED_USER_EMAIL}`,
        `Subject: Agent IA WhatsApp: handoff pour ${lead.name}`,
        'Content-Type: text/html; charset=utf-8',
        '',
        emailBody,
      ].join('\r\n');

      const encodedMessage = Buffer.from(rawMessage)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      alertPromises.push(
        gmail.users.messages.send({
          userId: 'me',
          requestBody: { raw: encodedMessage },
        }),
      );
    }
  } catch (gmailError) {
    logger.warn('Agent IA WhatsApp: Gmail client non disponible pour alerte email', {
      error: gmailError instanceof Error ? gmailError.message : String(gmailError),
    });
  }

  const results = await Promise.allSettled(alertPromises);

  const failedAlerts = results.filter((r) => r.status === 'rejected');
  if (failedAlerts.length > 0) {
    logger.warn('Agent IA WhatsApp: certaines alertes ont echoue', {
      leadId: lead.id,
      failed: failedAlerts.length,
      total: results.length,
    });
  }

  logger.info('Agent IA WhatsApp: handoff effectue', {
    leadId: lead.id,
    reason,
    alertsSent: results.length - failedAlerts.length,
    alertsFailed: failedAlerts.length,
  });
}
