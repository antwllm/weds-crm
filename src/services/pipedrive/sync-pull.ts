import { eq, or } from 'drizzle-orm';
import { getDb } from '../../db/index.js';
import { leads, activities } from '../../db/schema.js';
import { logger } from '../../logger.js';
import { stageIdToStatus, loadFieldConfig } from './field-config.js';
import { pipedriveApi } from './client.js';
import type { Lead } from '../../types.js';

/**
 * Returns true if lastSyncAt is within windowMs (default 5000ms) of now.
 * Used for layer-2 loop prevention: discard webhooks that arrive
 * shortly after a CRM-originated sync.
 */
export function isWithinSuppressionWindow(
  lastSyncAt: Date | null,
  windowMs = 5000,
): boolean {
  if (!lastSyncAt) return false;
  return Date.now() - lastSyncAt.getTime() < windowMs;
}

/**
 * Handle a deal.change webhook event.
 * Updates lead status if the deal stage changed, updates custom fields,
 * sets lastSyncOrigin='pipedrive', and logs a pipedrive_synced activity.
 */
export async function handleDealUpdate(
  data: Record<string, unknown>,
  previous: Record<string, unknown> | undefined,
  lead: Lead | null,
): Promise<void> {
  if (!lead) {
    logger.warn('Webhook Pipedrive deal.change: aucun lead lie', {
      dealId: data.id,
    });
    return;
  }

  const db = getDb();
  const cfg = loadFieldConfig();

  // Check stage change
  const newStageId = data.stage_id as number | undefined;
  const oldStageId = previous?.stage_id as number | undefined;

  const updates: Record<string, unknown> = {
    lastSyncOrigin: 'pipedrive',
    lastSyncAt: new Date(),
    updatedAt: new Date(),
  };

  // If stage changed, map to CRM status
  if (newStageId !== undefined && newStageId !== oldStageId) {
    const newStatus = stageIdToStatus(newStageId);
    if (newStatus && newStatus !== lead.status) {
      updates.status = newStatus;

      // Insert status_change activity
      await db.insert(activities).values({
        leadId: lead.id,
        type: 'status_change',
        content: `Statut modifie via Pipedrive: ${lead.status} -> ${newStatus}`,
        metadata: {
          from: lead.status,
          to: newStatus,
          direction: 'pull',
          source: 'pipedrive',
        },
      });
    }
  }

  // Check custom field changes
  const eventDate = data[cfg.fields.eventDate] as string | undefined;
  const message = data[cfg.fields.message] as string | undefined;
  const source = data[cfg.fields.source] as string | undefined;

  if (eventDate !== undefined) updates.eventDate = eventDate;
  if (message !== undefined) updates.message = message;
  if (source !== undefined) updates.source = source;

  // Update lead
  await db.update(leads).set(updates).where(eq(leads.id, lead.id));

  // Log pipedrive_synced activity
  await db.insert(activities).values({
    leadId: lead.id,
    type: 'pipedrive_synced',
    content: 'Deal mis a jour depuis Pipedrive',
    metadata: {
      direction: 'pull',
      action: 'change',
      dealId: data.id,
      stageChanged: newStageId !== oldStageId,
    },
  });

  logger.info('Webhook Pipedrive: deal.change traite', {
    leadId: lead.id,
    dealId: data.id,
  });
}

/**
 * Handle a deal.create webhook event.
 * Creates a new CRM lead or links to an existing one by email/phone.
 */
export async function handleDealCreated(
  data: Record<string, unknown>,
): Promise<void> {
  const db = getDb();
  const cfg = loadFieldConfig();

  const personId = data.person_id as number | undefined;
  const stageId = data.stage_id as number | undefined;
  const dealId = data.id as number;
  const title = data.title as string | undefined;

  // Extract custom fields
  const eventDate = (data[cfg.fields.eventDate] as string) || null;
  const message = (data[cfg.fields.message] as string) || null;
  const source = (data[cfg.fields.source] as string) || 'pipedrive';

  // Fetch person details if person_id exists
  let personName = title || 'Inconnu';
  let personEmail: string | null = null;
  let personPhone: string | null = null;

  if (personId) {
    try {
      const { data: personRes } = await pipedriveApi.get(
        `/persons/${personId}`,
      );
      const person = personRes.data;
      personName = person.name || personName;
      personEmail =
        person.email?.find((e: { primary: boolean; value: string }) => e.primary)
          ?.value ||
        person.email?.[0]?.value ||
        null;
      personPhone =
        person.phone?.find((p: { primary: boolean; value: string }) => p.primary)
          ?.value ||
        person.phone?.[0]?.value ||
        null;
    } catch (error) {
      logger.warn('Webhook Pipedrive: echec recuperation person', {
        personId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // Check for existing lead by email or phone (duplicate detection)
  const conditions = [];
  if (personEmail) conditions.push(eq(leads.email, personEmail));
  if (personPhone) conditions.push(eq(leads.phone, personPhone));

  let existingLead: Lead | undefined;
  if (conditions.length > 0) {
    const results = await db
      .select()
      .from(leads)
      .where(conditions.length === 1 ? conditions[0] : or(...conditions));
    existingLead = results[0] as Lead | undefined;
  }

  const status = stageId ? stageIdToStatus(stageId) || 'nouveau' : 'nouveau';

  if (existingLead) {
    // Link existing lead -- don't overwrite CRM field values
    await db
      .update(leads)
      .set({
        pipedriveDealId: dealId,
        pipedrivePersonId: personId || null,
        lastSyncOrigin: 'pipedrive',
        lastSyncAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(leads.id, existingLead.id));

    await db.insert(activities).values({
      leadId: existingLead.id,
      type: 'pipedrive_synced',
      content: 'Deal Pipedrive lie au lead existant',
      metadata: { direction: 'pull', action: 'create', dealId, linked: true },
    });

    logger.info('Webhook Pipedrive: deal.create lie au lead existant', {
      leadId: existingLead.id,
      dealId,
    });
  } else {
    // Create new lead
    const [newLead] = await db
      .insert(leads)
      .values({
        name: personName,
        email: personEmail,
        phone: personPhone,
        eventDate,
        message,
        source,
        status: status as 'nouveau' | 'contacte' | 'rdv' | 'devis_envoye' | 'signe' | 'perdu',
        pipedriveDealId: dealId,
        pipedrivePersonId: personId || null,
        lastSyncOrigin: 'pipedrive',
        lastSyncAt: new Date(),
      })
      .returning();

    await db.insert(activities).values({
      leadId: newLead.id,
      type: 'pipedrive_synced',
      content: 'Lead cree depuis Pipedrive',
      metadata: { direction: 'pull', action: 'create', dealId },
    });

    logger.info('Webhook Pipedrive: deal.create nouveau lead cree', {
      leadId: newLead.id,
      dealId,
    });
  }
}

/**
 * Handle a deal.delete webhook event.
 * Adds a warning activity but does NOT delete or change lead status.
 * Clears pipedriveDealId since the deal no longer exists.
 */
export async function handleDealDeleted(
  entityId: number,
  lead: Lead | null,
): Promise<void> {
  if (!lead) {
    logger.warn('Webhook Pipedrive deal.delete: aucun lead lie', {
      dealId: entityId,
    });
    return;
  }

  const db = getDb();

  // Insert warning activity
  await db.insert(activities).values({
    leadId: lead.id,
    type: 'pipedrive_synced',
    content: 'Deal supprime dans Pipedrive — verification requise',
    metadata: {
      direction: 'pull',
      action: 'delete',
      pipedriveDealId: entityId,
    },
  });

  // Clear pipedriveDealId (deal no longer exists)
  await db
    .update(leads)
    .set({
      pipedriveDealId: null,
      updatedAt: new Date(),
    })
    .where(eq(leads.id, lead.id));

  logger.info('Webhook Pipedrive: deal.delete traite', {
    leadId: lead.id,
    dealId: entityId,
  });
}

/**
 * Handle a person.change webhook event.
 * Updates lead contact info (name, email, phone).
 */
export async function handlePersonUpdate(
  data: Record<string, unknown>,
  _previous: Record<string, unknown> | undefined,
): Promise<void> {
  const db = getDb();
  const personId = data.id as number;

  // Find lead by pipedrivePersonId
  const results = await db
    .select()
    .from(leads)
    .where(eq(leads.pipedrivePersonId, personId));

  const lead = results[0] as Lead | undefined;
  if (!lead) {
    logger.warn('Webhook Pipedrive person.change: aucun lead lie', {
      personId,
    });
    return;
  }

  // Extract contact info
  const name = data.name as string | undefined;
  const emailArr = data.email as
    | Array<{ value: string; primary: boolean }>
    | undefined;
  const phoneArr = data.phone as
    | Array<{ value: string; primary: boolean }>
    | undefined;

  const updates: Record<string, unknown> = {
    lastSyncOrigin: 'pipedrive',
    lastSyncAt: new Date(),
    updatedAt: new Date(),
  };

  if (name) updates.name = name;
  if (emailArr?.length) {
    updates.email =
      emailArr.find((e) => e.primary)?.value || emailArr[0].value;
  }
  if (phoneArr?.length) {
    updates.phone =
      phoneArr.find((p) => p.primary)?.value || phoneArr[0].value;
  }

  await db.update(leads).set(updates).where(eq(leads.id, lead.id));

  // Log pipedrive_synced activity
  await db.insert(activities).values({
    leadId: lead.id,
    type: 'pipedrive_synced',
    content: 'Contact mis a jour depuis Pipedrive',
    metadata: {
      direction: 'pull',
      action: 'person_update',
      personId,
    },
  });

  logger.info('Webhook Pipedrive: person.change traite', {
    leadId: lead.id,
    personId,
  });
}
