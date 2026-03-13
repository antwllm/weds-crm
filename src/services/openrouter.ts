import axios, { type AxiosInstance } from 'axios';
import { eq, desc } from 'drizzle-orm';
import { getDb } from '../db/index.js';
import { leads, linkedEmails, activities } from '../db/schema.js';
import type { LeadContext } from '../types.js';

/**
 * Substitute template variables with lead data.
 * Supported: {{nom}}, {{date_evenement}}, {{budget}}, {{email}}, {{telephone}}
 */
export function substituteVariables(
  template: string,
  lead: { name: string; eventDate: string; budget: string; email: string; phone: string },
): string {
  return template
    .replace(/\{\{nom\}\}/g, lead.name)
    .replace(/\{\{date_evenement\}\}/g, lead.eventDate)
    .replace(/\{\{budget\}\}/g, lead.budget)
    .replace(/\{\{email\}\}/g, lead.email)
    .replace(/\{\{telephone\}\}/g, lead.phone);
}

/**
 * Assemble lead context from DB for AI draft generation.
 * Queries lead, last 5 linked emails, last 5 note activities.
 */
export async function assembleLeadContext(leadId: number): Promise<LeadContext> {
  const db = getDb();

  const [lead] = await db
    .select()
    .from(leads)
    .where(eq(leads.id, leadId))
    .limit(1);

  if (!lead) {
    throw new Error(`Lead ${leadId} introuvable`);
  }

  const recentEmails = await db
    .select({
      direction: linkedEmails.direction,
      snippet: linkedEmails.snippet,
      receivedAt: linkedEmails.receivedAt,
    })
    .from(linkedEmails)
    .where(eq(linkedEmails.leadId, leadId))
    .orderBy(desc(linkedEmails.receivedAt))
    .limit(5);

  const noteActivities = await db
    .select({
      content: activities.content,
    })
    .from(activities)
    .where(eq(activities.leadId, leadId))
    .orderBy(desc(activities.createdAt))
    .limit(5);

  return {
    name: lead.name,
    eventDate: lead.eventDate,
    budget: lead.budget,
    status: lead.status,
    recentEmails: recentEmails.map((e) => ({
      direction: e.direction || 'inbound',
      snippet: e.snippet || '',
      date: e.receivedAt?.toISOString() || '',
    })),
    notes: noteActivities
      .map((a) => a.content)
      .filter((c): c is string => c !== null),
  };
}

/**
 * Generate an AI draft response using OpenRouter API.
 * Accepts optional axios instance for testing (DI pattern).
 */
export async function generateDraft(
  leadContext: LeadContext,
  promptTemplate: string,
  apiKey: string,
  httpClient?: { post: AxiosInstance['post'] },
): Promise<string> {
  const client = httpClient || axios;

  // Build system prompt from template + lead context
  const leadVars = {
    name: leadContext.name,
    eventDate: leadContext.eventDate || '',
    budget: leadContext.budget?.toString() || '',
    email: '',
    phone: '',
  };
  const systemPrompt = substituteVariables(promptTemplate, leadVars);

  // Build context summary for the system message
  const emailSummary = leadContext.recentEmails
    .map((e) => `[${e.direction}] ${e.date}: ${e.snippet}`)
    .join('\n');
  const notesSummary = leadContext.notes.join('\n');

  const fullSystemPrompt = [
    systemPrompt,
    '',
    'Emails recents:',
    emailSummary || 'Aucun email',
    '',
    'Notes:',
    notesSummary || 'Aucune note',
  ].join('\n');

  const response = await client.post(
    'https://openrouter.ai/api/v1/chat/completions',
    {
      model: 'anthropic/claude-sonnet-4',
      messages: [
        { role: 'system', content: fullSystemPrompt },
        { role: 'user', content: `Genere un brouillon de reponse pour ${leadContext.name}.` },
      ],
    },
    {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://weds.fr',
        'X-OpenRouter-Title': 'Weds CRM',
        'Content-Type': 'application/json',
      },
    },
  );

  return response.data.choices[0].message.content;
}
