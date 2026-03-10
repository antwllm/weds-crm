import { eq } from 'drizzle-orm';
import { pipedriveApi } from './client.js';
import { loadFieldConfig, statusToStageId } from './field-config.js';
import { withRetry } from './retry.js';
import { getDb } from '../../db/index.js';
import { leads, activities } from '../../db/schema.js';
import { logger } from '../../logger.js';
import type { Lead } from '../../types.js';

/**
 * Sync a CRM lead to Pipedrive (push direction).
 * - 'create': Search/create Person, create Deal, store IDs, log activity
 * - 'update': Update Deal stage + custom fields, optionally update Person
 *
 * All Pipedrive API calls wrapped in withRetry for resilience.
 */
export async function syncLeadToPipedrive(
  lead: Lead,
  action: 'create' | 'update'
): Promise<void> {
  if (action === 'create') {
    await handleCreate(lead);
  } else {
    await handleUpdate(lead);
  }
}

async function handleCreate(lead: Lead): Promise<void> {
  const cfg = loadFieldConfig();
  const db = getDb();

  // 1. Search for existing person by email
  let personId: number | null = null;

  if (lead.email) {
    const searchResult = await withRetry(
      () => pipedriveApi.get('/persons/search', {
        params: { term: lead.email, fields: 'email' },
      }),
      lead.id,
      'push'
    );

    const items = searchResult.data?.data?.items;
    if (items && items.length > 0) {
      personId = items[0].item.id;
    }
  }

  // 2. Create person if not found
  if (personId === null) {
    const personResponse = await withRetry(
      () => pipedriveApi.post('/persons', {
        name: lead.name,
        email: lead.email ? [{ value: lead.email, primary: true }] : undefined,
        phone: lead.phone ? [{ value: lead.phone, primary: true }] : undefined,
      }),
      lead.id,
      'push'
    );

    personId = personResponse.data.data.id;
  }

  // 3. Create deal with custom fields
  const dealTitle = `${lead.name} (${lead.eventDate || 'date inconnue'})`;

  const dealResponse = await withRetry(
    () => pipedriveApi.post('/deals', {
      title: dealTitle,
      person_id: personId,
      stage_id: statusToStageId(lead.status ?? 'nouveau'),
      pipeline_id: cfg.pipelineId,
      [cfg.fields.eventDate]: lead.eventDate || undefined,
      [cfg.fields.message]: lead.message || undefined,
      [cfg.fields.source]: lead.source || undefined,
      [cfg.fields.vcardUrl]: lead.vCardUrl || undefined,
    }),
    lead.id,
    'push'
  );

  const dealId = dealResponse.data.data.id;

  // 4. Update lead with Pipedrive IDs
  await db
    .update(leads)
    .set({
      pipedrivePersonId: personId,
      pipedriveDealId: dealId,
      lastSyncOrigin: 'crm',
      lastSyncAt: new Date(),
    })
    .where(eq(leads.id, lead.id));

  // 5. Log activity
  await db.insert(activities).values({
    leadId: lead.id,
    type: 'pipedrive_synced',
    content: 'Lead synchronise vers Pipedrive',
    metadata: {
      direction: 'push',
      action: 'create',
      personId,
      dealId,
    },
  });

  logger.info('Lead synchronise vers Pipedrive', {
    leadId: lead.id,
    personId,
    dealId,
    action: 'create',
  });
}

async function handleUpdate(lead: Lead): Promise<void> {
  // Skip if lead has no Pipedrive deal linked
  if (!lead.pipedriveDealId) {
    return;
  }

  const cfg = loadFieldConfig();
  const db = getDb();

  // 1. Update deal with stage and custom fields
  await withRetry(
    () => pipedriveApi.put(`/deals/${lead.pipedriveDealId}`, {
      stage_id: statusToStageId(lead.status ?? 'nouveau'),
      [cfg.fields.eventDate]: lead.eventDate || undefined,
      [cfg.fields.message]: lead.message || undefined,
      [cfg.fields.source]: lead.source || undefined,
      [cfg.fields.vcardUrl]: lead.vCardUrl || undefined,
    }),
    lead.id,
    'push'
  );

  // 2. Update person if needed and linked
  if (lead.pipedrivePersonId) {
    await withRetry(
      () => pipedriveApi.put(`/persons/${lead.pipedrivePersonId}`, {
        name: lead.name,
        email: lead.email ? [{ value: lead.email, primary: true }] : undefined,
        phone: lead.phone ? [{ value: lead.phone, primary: true }] : undefined,
      }),
      lead.id,
      'push'
    );
  }

  // 3. Update lead sync metadata
  await db
    .update(leads)
    .set({
      lastSyncOrigin: 'crm',
      lastSyncAt: new Date(),
    })
    .where(eq(leads.id, lead.id));

  // 4. Log activity
  await db.insert(activities).values({
    leadId: lead.id,
    type: 'pipedrive_synced',
    content: 'Lead mis a jour dans Pipedrive',
    metadata: {
      direction: 'push',
      action: 'update',
      dealId: lead.pipedriveDealId,
    },
  });

  logger.info('Lead mis a jour dans Pipedrive', {
    leadId: lead.id,
    dealId: lead.pipedriveDealId,
    action: 'update',
  });
}
