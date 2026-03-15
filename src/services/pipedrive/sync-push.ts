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
  let formattedDate = lead.eventDate || 'date inconnue';
  // Convert YYYY-MM-DD to DD/MM/YYYY for deal title
  if (lead.eventDate && /^\d{4}-\d{2}-\d{2}$/.test(lead.eventDate)) {
    const [y, m, d] = lead.eventDate.split('-');
    formattedDate = `${d}/${m}/${y}`;
  }
  const dealTitle = `${lead.name} (${formattedDate})`;

  const createStageId = statusToStageId(lead.status ?? 'nouveau');

  const dealResponse = await withRetry(
    () => pipedriveApi.post('/deals', {
      title: dealTitle,
      person_id: personId,
      ...(createStageId !== null ? { stage_id: createStageId } : { status: 'lost' }),
      pipeline_id: cfg.pipelineId,
      value: lead.budget || undefined,
      [cfg.fields.eventDate]: lead.eventDate || undefined,
      [cfg.fields.message]: lead.message || undefined,
      [cfg.fields.source]: lead.source || undefined,
      ...(cfg.fields.vcardUrl ? { [cfg.fields.vcardUrl]: lead.vCardUrl || undefined } : {}),
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

  // 1. Update deal with stage, custom fields, and budget
  const stageId = statusToStageId(lead.status ?? 'nouveau');
  let formattedDate = lead.eventDate || 'date inconnue';
  if (lead.eventDate && /^\d{4}-\d{2}-\d{2}$/.test(lead.eventDate)) {
    const [y, m, d] = lead.eventDate.split('-');
    formattedDate = `${d}/${m}/${y}`;
  }
  const dealTitle = `${lead.name} (${formattedDate})`;

  const commonFields = {
    title: dealTitle,
    value: lead.budget || undefined,
    [cfg.fields.eventDate]: lead.eventDate || undefined,
    [cfg.fields.message]: lead.message || undefined,
    [cfg.fields.source]: lead.source || undefined,
    ...(cfg.fields.vcardUrl ? { [cfg.fields.vcardUrl]: lead.vCardUrl || undefined } : {}),
  };

  if (stageId === null) {
    await withRetry(
      () => pipedriveApi.put(`/deals/${lead.pipedriveDealId}`, {
        ...commonFields,
        status: 'lost',
        lost_reason: 'Marqué perdu dans le CRM',
      }),
      lead.id,
      'push'
    );
  } else {
    await withRetry(
      () => pipedriveApi.put(`/deals/${lead.pipedriveDealId}`, {
        ...commonFields,
        stage_id: stageId,
        status: 'open',
      }),
      lead.id,
      'push'
    );
  }

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
