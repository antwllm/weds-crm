import { eq, or } from 'drizzle-orm';
import { pipedriveApi } from './client.js';
import { loadFieldConfig, stageIdToStatus } from './field-config.js';
import { getDb } from '../../db/index.js';
import { leads, activities } from '../../db/schema.js';
import { logger } from '../../logger.js';

interface ImportResult {
  imported: number;
  linked: number;
  skipped: number;
}

/**
 * Import all Pipedrive deals into the CRM.
 * Paginates through every deal (active, won, lost) and imports or links each one.
 */
export async function importAllDeals(): Promise<ImportResult> {
  const result: ImportResult = { imported: 0, linked: 0, skipped: 0 };
  let start = 0;
  const limit = 500;
  let totalProcessed = 0;

  logger.info('Import Pipedrive: demarrage');

  while (true) {
    const response = await pipedriveApi.get('/deals', {
      params: { status: 'all_not_deleted', start, limit },
    });

    const deals: Record<string, unknown>[] = response.data?.data || [];
    if (deals.length === 0) break;

    for (const deal of deals) {
      try {
        const outcome = await importDeal(deal);
        result[outcome]++;
      } catch (error) {
        logger.error('Import Pipedrive: erreur sur un deal', {
          dealId: deal.id,
          error: error instanceof Error ? error.message : String(error),
        });
        result.skipped++;
      }

      totalProcessed++;
      if (totalProcessed % 50 === 0) {
        logger.info(`Import Pipedrive: ${totalProcessed} deals traites`);
      }
    }

    const pagination = response.data?.additional_data?.pagination;
    if (!pagination?.more_items_in_collection) break;
    start += limit;
  }

  logger.info('Import Pipedrive: termine', result);
  return result;
}

/**
 * Import a single Pipedrive deal into the CRM.
 * - Fetches person details for email/phone
 * - Links to existing CRM lead by email/phone (without overwriting)
 * - Or creates a new lead
 * - Imports deal notes and activities with preserved original dates
 */
export async function importDeal(
  deal: Record<string, unknown>,
): Promise<'imported' | 'linked' | 'skipped'> {
  const db = getDb();
  const cfg = loadFieldConfig();

  const dealId = deal.id as number;
  const title = (deal.title as string) || '';
  const personId = (deal.person_id as { value?: number })?.value ??
    (deal.person_id as number | null);
  const stageId = deal.stage_id as number;

  // Extract custom fields
  const eventDate = (deal[cfg.fields.eventDate] as string) || null;
  const message = (deal[cfg.fields.message] as string) || null;
  const source = (deal[cfg.fields.source] as string) || 'pipedrive';

  // Fetch person details for email and phone
  let email: string | null = null;
  let phone: string | null = null;

  if (personId) {
    try {
      const personResp = await pipedriveApi.get(`/persons/${personId}`);
      const person = personResp.data?.data;
      if (person) {
        const emails = person.email as Array<{ value: string; primary: boolean }> | undefined;
        const phones = person.phone as Array<{ value: string; primary: boolean }> | undefined;
        email = emails?.find((e) => e.primary)?.value || emails?.[0]?.value || null;
        phone = phones?.find((p) => p.primary)?.value || phones?.[0]?.value || null;
      }
    } catch {
      // Person fetch failed, continue without contact details
    }
  }

  // Derive name from title (Pipedrive deal title format: "Name (date)")
  const name = title.replace(/\s*\(.*\)\s*$/, '').trim() || title;

  // Duplicate check: search by email or phone
  let existingLead: typeof leads.$inferSelect | undefined;

  const conditions = [];
  if (email) conditions.push(eq(leads.email, email));
  if (phone) conditions.push(eq(leads.phone, phone));

  if (conditions.length > 0) {
    const [found] = await db
      .select()
      .from(leads)
      .where(or(...conditions))
      .limit(1);
    existingLead = found;
  }

  let leadId: number;
  let outcome: 'imported' | 'linked';

  if (existingLead) {
    // Link: set Pipedrive IDs WITHOUT overwriting any existing CRM field values
    await db
      .update(leads)
      .set({
        pipedriveDealId: dealId,
        pipedrivePersonId: personId ? Number(personId) : null,
        lastSyncOrigin: 'pipedrive',
        lastSyncAt: new Date(),
      })
      .where(eq(leads.id, existingLead.id));

    leadId = existingLead.id;
    outcome = 'linked';
  } else {
    // Create new lead
    const status = stageIdToStatus(stageId) || 'nouveau';

    const [newLead] = await db
      .insert(leads)
      .values({
        name,
        email,
        phone,
        eventDate,
        message,
        source,
        status: status as any,
        pipedriveDealId: dealId,
        pipedrivePersonId: personId ? Number(personId) : null,
        lastSyncOrigin: 'pipedrive',
        lastSyncAt: new Date(),
      })
      .returning();

    leadId = newLead.id;
    outcome = 'imported';
  }

  // Import deal history: notes
  try {
    const notesResp = await pipedriveApi.get(`/deals/${dealId}/notes`);
    const notes = (notesResp.data?.data || []) as Array<Record<string, unknown>>;

    for (const note of notes) {
      await db.insert(activities).values({
        leadId,
        type: 'note_added',
        content: (note.content as string) || '',
        metadata: { pipedrive_note_id: note.id, direction: 'import' },
        createdAt: note.add_time ? new Date(note.add_time as string) : undefined,
      });
    }
  } catch {
    // Notes fetch failed, continue
  }

  // Import deal history: activities
  try {
    const activitiesResp = await pipedriveApi.get(`/deals/${dealId}/activities`);
    const pdActivities = (activitiesResp.data?.data || []) as Array<Record<string, unknown>>;

    for (const act of pdActivities) {
      const actType = (act.type as string) || 'unknown';
      const subject = (act.subject as string) || (act.note as string) || '';
      const actDate = (act.add_time as string) || (act.due_date as string) || null;

      await db.insert(activities).values({
        leadId,
        type: 'pipedrive_synced',
        content: `${actType}: ${subject}`.trim(),
        metadata: {
          pipedrive_type: actType,
          pipedrive_id: act.id,
          direction: 'import',
        },
        createdAt: actDate ? new Date(actDate) : undefined,
      });
    }
  } catch {
    // Activities fetch failed, continue
  }

  // Log import activity on the lead
  await db.insert(activities).values({
    leadId,
    type: 'pipedrive_synced',
    content: 'Import depuis Pipedrive',
    metadata: { direction: 'import', dealId, outcome },
  });

  return outcome;
}
