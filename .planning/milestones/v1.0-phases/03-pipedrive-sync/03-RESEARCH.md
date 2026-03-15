# Phase 3: Pipedrive Sync - Research

**Researched:** 2026-03-10
**Domain:** Pipedrive REST API (v1/v2), Webhooks v2, bidirectional CRM sync
**Confidence:** MEDIUM-HIGH

## Summary

Pipedrive provides a mature REST API (v1 stable, v2 stable since March 2025) for CRUD operations on Persons, Deals, Activities, and Notes. The project already uses axios and can make direct HTTP calls -- no need for the official Pipedrive Node.js SDK. Webhooks v2 (default since March 17, 2025) provides structured payloads with `meta.change_source` field that distinguishes "app" vs "api" origin, which is critical for loop prevention.

The existing codebase has strong foundations: `pipedrivePersonId`/`pipedriveDealId` columns on the leads table, a `syncLog` table, and a `pipedrive_synced` activity type already defined in the schema. The webhook pattern from `/webhook/gmail` can be replicated for `/webhook/pipedrive`. The config system (Zod-validated env vars) needs new entries for Pipedrive API token and webhook credentials.

**Primary recommendation:** Use Pipedrive API v1 for all CRUD operations (v2 stable but custom field handling is better documented in v1, and v1 remains fully supported), Webhooks v2 for inbound events, axios for HTTP client (already in dependencies), and a DB column (`lastSyncOrigin` + `lastSyncAt` on leads table) for origin-based loop prevention.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Config file approach for Pipedrive custom field hash keys (JSON/env config)
- One-time audit script to populate field key config from Pipedrive API
- Pipeline stage IDs resolved and stored in config
- Fields synced: name, email, phone, event date, message body, source, vCard URL, budget, status
- Deal title format: "Prenom Nom (date)"
- Immediate sync on every lead create/update (no queue/batch)
- On failure: log in syncLog, retry up to 3x with exponential backoff, then Free Mobile SMS alert
- Status maps 1:1 to Pipedrive pipeline stages (nouveau->contacte->rdv->devis_envoye->signe->perdu)
- Direct webhook endpoint: POST /webhook/pipedrive
- Events: deal updated (stage change), person updated, deal deleted, deal added
- Deal deleted in Pipedrive -> flag for review (warning activity, no status change/delete)
- Deal added in Pipedrive -> create CRM lead
- Origin tagging for loop prevention (CRM wins on conflict)
- Every sync event logged as 'pipedrive_synced' activity
- Retry with exponential backoff, max 3 attempts, all logged in syncLog
- One-time import of ALL Pipedrive deals (active + closed/won/lost) with full history
- Import creates CRM leads, links by email/phone on duplicates without overwriting CRM values
- Import deal history: notes, activities (calls, meetings, tasks), custom field values
- Preserve original Pipedrive dates on imported activities
- Manual push button for existing CRM leads (no automatic backfill)

### Claude's Discretion
- Pipedrive API client implementation (axios, fetch, etc.)
- Webhook signature verification approach (if Pipedrive supports it)
- Origin tag storage mechanism (in-memory map vs DB column)
- Exact retry backoff timing
- Import script implementation (CLI command vs one-time migration)
- Activity type mapping for Pipedrive activities (calls, meetings -> which CRM activity types)
- Manual push button placement in the UI

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SYNC-01 | System pushes new leads to Pipedrive as Person + Deal with all custom fields | Pipedrive API v1 POST /persons + POST /deals with custom field hash keys; axios HTTP client; immediate sync from lead create/update routes; field mapping config |
| SYNC-02 | System syncs status changes from CRM to Pipedrive deal stage | Pipedrive API v1 PUT /deals/:id with stage_id; status-to-stage mapping config; hook in PATCH /api/leads/:id route |
| SYNC-03 | System receives Pipedrive webhook events and updates local leads accordingly | Webhooks v2 POST /webhook/pipedrive; events: change.deal, change.person, delete.deal, create.deal; basic auth verification |
| SYNC-04 | System prevents sync loops (local change -> Pipedrive webhook -> local change) | Origin tagging via DB column (lastSyncOrigin + lastSyncAt); meta.change_source="api" detection; suppression window |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| axios | ^1.13.6 | Pipedrive API HTTP client | Already in project dependencies; simple, well-tested |
| express | ^5.2.1 | Webhook endpoint routing | Already in project; same pattern as /webhook/gmail |
| drizzle-orm | ^0.45.1 | DB operations for sync tracking | Already in project; consistent with all other DB access |
| zod | ^4.3.6 | Webhook payload validation, config validation | Already in project; consistent pattern |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| node:crypto | built-in | Webhook HMAC-SHA256 signature verification | Verify Pipedrive webhook authenticity |
| node:timers | built-in | setTimeout for retry backoff | Exponential backoff on sync failures |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| axios | pipedrive (official SDK) | SDK adds 1.5MB+ dependency, uses v2 API by default, wraps simple REST calls in OOP abstractions -- overkill for 5 endpoints |
| axios | native fetch (Bun) | Bun's fetch is fine but axios is already installed and provides interceptors for retry logic |

**Installation:**
```bash
# No new packages needed -- all dependencies already installed
```

## Architecture Patterns

### Recommended Project Structure
```
src/
  services/
    pipedrive/
      client.ts          # Axios instance, auth, rate limit handling
      sync-push.ts       # CRM -> Pipedrive (create/update person+deal)
      sync-pull.ts       # Pipedrive -> CRM (webhook event processing)
      field-config.ts    # Custom field hash keys + pipeline stage IDs
      import.ts          # One-time Pipedrive import script
  routes/
    webhook.ts           # Add /pipedrive route alongside /gmail
    api/
      leads.ts           # Hook sync-push after create/update
  db/
    schema.ts            # Add lastSyncOrigin, lastSyncAt columns to leads
scripts/
  pipedrive-audit.ts     # One-time script: fetch field keys + stage IDs
  pipedrive-import.ts    # One-time script: import all deals + history
```

### Pattern 1: Pipedrive API Client with API Token Auth
**What:** Centralized axios instance with api_token query parameter
**When to use:** All Pipedrive API calls
**Example:**
```typescript
// Source: Pipedrive API docs - API token authentication
import axios from 'axios';
import { config } from '../../config.js';

const pipedriveApi = axios.create({
  baseURL: 'https://api.pipedrive.com/v1',
  params: { api_token: config.PIPEDRIVE_API_TOKEN },
  timeout: 10000,
});

// Create person
const { data } = await pipedriveApi.post('/persons', {
  name: 'Sophie Dupont',
  email: [{ value: 'sophie@example.com', primary: true }],
  phone: [{ value: '+33612345678', primary: true }],
});

// Create deal with custom fields (hash keys from config)
const { data: deal } = await pipedriveApi.post('/deals', {
  title: 'Sophie Dupont (15/06/2027)',
  person_id: data.data.id,
  stage_id: fieldConfig.stages.nouveau,
  [fieldConfig.fields.eventDate]: '15/06/2027',
  [fieldConfig.fields.message]: 'Bonjour...',
  [fieldConfig.fields.source]: 'mariages.net',
  [fieldConfig.fields.vcardUrl]: 'https://storage.googleapis.com/...',
});
```

### Pattern 2: Webhook v2 Handler with Loop Prevention
**What:** Process Pipedrive webhooks, check origin to prevent loops
**When to use:** POST /webhook/pipedrive
**Example:**
```typescript
// Source: Pipedrive Webhooks v2 documentation
router.post('/pipedrive', async (req, res) => {
  // Acknowledge immediately (same pattern as Gmail webhook)
  res.status(200).json({ status: 'ok' });

  const { meta, data, previous } = req.body;

  // Loop prevention: if change came from API, it was us
  if (meta.change_source === 'api') {
    logger.debug('Webhook Pipedrive: changement API ignore (origine CRM)');
    return;
  }

  // Additional check: suppression window on the lead
  const lead = await findLeadByPipedriveDealId(meta.entity_id);
  if (lead?.lastSyncOrigin === 'crm' && isWithinSuppressionWindow(lead.lastSyncAt)) {
    logger.debug('Webhook Pipedrive: dans la fenetre de suppression');
    return;
  }

  // Process the event
  switch (`${meta.action}.${meta.entity}`) {
    case 'change.deal':
      await handleDealUpdate(data, previous, lead);
      break;
    case 'create.deal':
      await handleDealCreated(data);
      break;
    case 'delete.deal':
      await handleDealDeleted(meta.entity_id, lead);
      break;
    case 'change.person':
      await handlePersonUpdate(data, previous);
      break;
  }
});
```

### Pattern 3: Sync-After-Write Hook
**What:** Call Pipedrive sync after successful lead create/update in API routes
**When to use:** POST /api/leads and PATCH /api/leads/:id
**Example:**
```typescript
// In leads.ts POST handler, after successful insert:
const [newLead] = await db.insert(leads).values({...}).returning();

// Fire-and-forget sync (don't block API response)
setImmediate(async () => {
  try {
    await syncLeadToPipedrive(newLead, 'create');
  } catch (error) {
    // Sync failure logged in syncLog, retries handled internally
    logger.error('Sync Pipedrive echoue', { leadId: newLead.id, error });
  }
});

res.status(201).json(newLead);
```

### Pattern 4: Retry with Exponential Backoff
**What:** 3 attempts with increasing delay on Pipedrive API failure
**When to use:** All outbound Pipedrive API calls
**Example:**
```typescript
async function withRetry<T>(
  fn: () => Promise<T>,
  leadId: number,
  direction: 'push' | 'pull',
  maxAttempts = 3
): Promise<T> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await fn();
      await logSync(leadId, direction, 'success');
      return result;
    } catch (error) {
      await logSync(leadId, direction, 'error', error);
      if (attempt === maxAttempts) {
        // Alert William via Free Mobile SMS
        await alertSyncFailure(leadId, direction, error);
        throw error;
      }
      // Exponential backoff: 1s, 4s, 9s
      await new Promise(r => setTimeout(r, attempt * attempt * 1000));
    }
  }
  throw new Error('Unreachable');
}
```

### Anti-Patterns to Avoid
- **In-memory origin map for loop prevention:** Container restarts lose the map; use DB column instead
- **Blocking API response on Pipedrive sync:** Use setImmediate/fire-and-forget; user should not wait for Pipedrive
- **Single webhook for all event types:** Register separate webhooks per event type for clarity and easier debugging
- **Trusting webhook payload without validation:** Always validate with Zod schema before processing
- **Importing without pagination:** Pipedrive returns max 500 items per page; must paginate through all deals

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HTTP retry logic | Custom retry wrapper from scratch | Simple for-loop with backoff (see pattern above) | Only 3 retries needed, no need for a library like p-retry |
| Webhook signature verification | Custom crypto logic | node:crypto HMAC-SHA256 with timingSafeEqual | Standard approach; Pipedrive sends basic auth credentials you set during registration |
| Rate limiting | Custom token bucket | Respect 429 headers + simple delay | Single user, low volume -- rate limits unlikely to be hit |
| Field key discovery | Manual lookup in Pipedrive UI | Audit script calling GET /dealFields + GET /personFields | Automated, reproducible, stored in config |

**Key insight:** This is a single-user CRM with low volume (a few leads per week). Complexity like message queues, distributed locks, or sophisticated rate limiters are unnecessary overhead.

## Common Pitfalls

### Pitfall 1: Infinite Sync Loops
**What goes wrong:** CRM updates lead -> Pipedrive webhook fires -> CRM updates lead -> loop
**Why it happens:** No origin tracking, or relying only on `meta.change_source` which may not always be "api" for all changes
**How to avoid:** Dual-layer prevention: (1) check `meta.change_source === 'api'` first, (2) check DB suppression window (lastSyncOrigin + lastSyncAt within 5 seconds)
**Warning signs:** Lead's updatedAt keeps changing rapidly; syncLog shows alternating push/pull entries

### Pitfall 2: Custom Field Hash Keys Change
**What goes wrong:** Hard-coded field keys stop working after Pipedrive account changes
**Why it happens:** Custom field keys are account-specific random hashes
**How to avoid:** Store keys in config file populated by audit script; never hard-code in source
**Warning signs:** 400 errors from Pipedrive API; "unknown field" in error messages

### Pitfall 3: Pipedrive Person Email/Phone Format
**What goes wrong:** API rejects person creation because email/phone sent as string instead of array
**Why it happens:** Pipedrive Person API expects `email: [{ value: "...", primary: true }]` not `email: "..."`
**How to avoid:** Always format as array of objects with value/primary keys
**Warning signs:** 400 "invalid email format" from Pipedrive

### Pitfall 4: Webhook v2 Event Naming
**What goes wrong:** Webhook never fires because event_action uses wrong name
**Why it happens:** v2 uses "change" not "update" for event_action; v1 used "updated"
**How to avoid:** Use Pipedrive API docs event_action values: `create`, `change`, `delete` (not add/update/remove)
**Warning signs:** Webhook registered but no events received

### Pitfall 5: Import Pagination
**What goes wrong:** Import only gets first 100 deals, missing the rest
**Why it happens:** Pipedrive defaults to 100 items per page, max 500
**How to avoid:** Use cursor-based pagination (v2) or offset pagination (v1) with `more_items_in_collection` check
**Warning signs:** Import count doesn't match Pipedrive deal count

### Pitfall 6: Deal Stage IDs are Account-Specific
**What goes wrong:** Code uses hard-coded stage IDs that work in dev but fail in production
**Why it happens:** Pipeline stage IDs are auto-incremented per account
**How to avoid:** Audit script fetches pipeline stages and maps status names to IDs in config
**Warning signs:** Deals created with wrong stage; 400 errors on stage_id

## Code Examples

### Pipedrive Field Config (populated by audit script)
```typescript
// src/services/pipedrive/field-config.ts
// Source: Pipedrive GET /dealFields and GET /pipelines/:id/stages APIs

export interface PipedriveFieldConfig {
  fields: {
    eventDate: string;   // e.g. 'c76364a6...'
    message: string;     // e.g. '3492fbf7...'
    source: string;      // e.g. '7daee8dd...'
    vcardUrl: string;    // e.g. '7a59a127...'
    gptPrompt: string;   // e.g. '547fb3bf...'
  };
  stages: {
    nouveau: number;
    contacte: number;
    rdv: number;
    devis_envoye: number;
    signe: number;
    perdu: number;
  };
  pipelineId: number;
}

// Loaded from JSON config file or env
export function loadFieldConfig(): PipedriveFieldConfig {
  const raw = process.env.PIPEDRIVE_FIELD_CONFIG;
  if (!raw) throw new Error('PIPEDRIVE_FIELD_CONFIG manquant');
  return JSON.parse(raw);
}
```

### Webhook v2 Payload Validation Schema
```typescript
// Source: Pipedrive Webhooks v2 documentation
import { z } from 'zod';

const webhookMetaSchema = z.object({
  action: z.enum(['create', 'change', 'delete']),
  entity: z.enum(['deal', 'person']),
  entity_id: z.coerce.number(),
  change_source: z.string(), // 'app', 'api', 'workflow', etc.
  timestamp: z.string(),
  user_id: z.coerce.number(),
  version: z.string(),
  webhook_id: z.coerce.number(),
  is_bulk_edit: z.boolean().optional(),
  company_id: z.coerce.number(),
});

const webhookPayloadSchema = z.object({
  meta: webhookMetaSchema,
  data: z.record(z.unknown()),
  previous: z.record(z.unknown()).optional(),
});

export type PipedriveWebhookPayload = z.infer<typeof webhookPayloadSchema>;
```

### Sync Push (CRM -> Pipedrive)
```typescript
// Source: Pipedrive API v1 POST /persons, POST /deals, PUT /deals
import { pipedriveApi } from './client.js';
import { loadFieldConfig } from './field-config.js';

export async function syncLeadToPipedrive(
  lead: Lead,
  action: 'create' | 'update'
): Promise<void> {
  const cfg = loadFieldConfig();

  if (action === 'create') {
    // 1. Create or find Person
    const personId = await findOrCreatePerson(lead);

    // 2. Create Deal
    const { data: dealRes } = await pipedriveApi.post('/deals', {
      title: `${lead.name} (${lead.eventDate || 'date inconnue'})`,
      person_id: personId,
      stage_id: cfg.stages[lead.status as keyof typeof cfg.stages],
      pipeline_id: cfg.pipelineId,
      [cfg.fields.eventDate]: lead.eventDate,
      [cfg.fields.message]: lead.message,
      [cfg.fields.source]: lead.source,
      [cfg.fields.vcardUrl]: lead.vCardUrl,
    });

    // 3. Update lead with Pipedrive IDs
    await db.update(leads)
      .set({
        pipedrivePersonId: personId,
        pipedriveDealId: dealRes.data.id,
        lastSyncOrigin: 'crm',
        lastSyncAt: new Date(),
      })
      .where(eq(leads.id, lead.id));

  } else if (action === 'update' && lead.pipedriveDealId) {
    // Update existing deal
    await pipedriveApi.put(`/deals/${lead.pipedriveDealId}`, {
      stage_id: cfg.stages[lead.status as keyof typeof cfg.stages],
      [cfg.fields.eventDate]: lead.eventDate,
      [cfg.fields.message]: lead.message,
      [cfg.fields.source]: lead.source,
      [cfg.fields.vcardUrl]: lead.vCardUrl,
    });

    await db.update(leads)
      .set({ lastSyncOrigin: 'crm', lastSyncAt: new Date() })
      .where(eq(leads.id, lead.id));
  }
}
```

### One-Time Import with Pagination
```typescript
// Source: Pipedrive API v1 GET /deals with pagination
async function importAllDeals(): Promise<void> {
  let start = 0;
  const limit = 500; // Max allowed
  let hasMore = true;

  while (hasMore) {
    const { data: res } = await pipedriveApi.get('/deals', {
      params: { start, limit, status: 'all_not_deleted' },
    });

    for (const deal of res.data ?? []) {
      await importDeal(deal);
    }

    hasMore = res.additional_data?.pagination?.more_items_in_collection ?? false;
    start += limit;
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Webhooks v1 | Webhooks v2 (default) | March 17, 2025 | New meta block with change_source, no more duplicate triggers |
| API v1 only | API v1 + v2 both stable | March 13, 2025 | v2 uses 50% fewer rate limit tokens; v1 still fully supported |
| Request-count rate limits | Token-based rate limits | Rolling out March 2025 - Dec 2025 | 30,000 base tokens/day x plan multiplier x seats |
| Offset pagination | Cursor pagination (v2) | 2024 | More reliable for large datasets |

**Deprecated/outdated:**
- Some v1 GET endpoints (nested like /persons/:id/deals) deprecated Dec 31, 2025 -- use query params on v2 endpoints instead
- Webhooks v1 still works but v2 is default for new registrations

## Open Questions

1. **Exact custom field hash keys for the weds Pipedrive account**
   - What we know: CONTEXT.md lists known keys (c76364a6, 3492fbf7, 7daee8dd, 7a59a127, 547fb3bf)
   - What's unclear: These may be partial hashes or may have changed since the email-parser was written
   - Recommendation: Audit script (Wave 0 task) validates these against the live API before any sync code runs

2. **Pipeline stage IDs for the weds account**
   - What we know: Status names map 1:1 (nouveau, contacte, rdv, devis_envoye, signe, perdu)
   - What's unclear: Exact numeric stage_id values
   - Recommendation: Audit script fetches GET /pipelines and GET /stages to populate config

3. **Pipedrive Notes API in v2**
   - What we know: Notes API exists in v1 (GET /notes?deal_id=X), v2 status unclear
   - What's unclear: Whether notes are available via v2 API yet
   - Recommendation: Use v1 for notes import; v1 will remain available

4. **Webhook basic auth vs HMAC verification**
   - What we know: Pipedrive supports http_auth_user/http_auth_password on webhook registration; also supports x-pipedrive-signature HMAC header
   - What's unclear: Whether HMAC is available on all plans
   - Recommendation: Use basic auth (simpler, guaranteed available) -- set a strong random password in env config

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.0.18 |
| Config file | vitest.config.ts |
| Quick run command | `npx vitest run --reporter=verbose tests/api/` |
| Full suite command | `npx vitest run --reporter=verbose` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SYNC-01 | Push new lead to Pipedrive as Person + Deal | unit | `npx vitest run tests/pipedrive/sync-push.test.ts -t "creates person and deal"` | No - Wave 0 |
| SYNC-01 | Custom fields populated in deal | unit | `npx vitest run tests/pipedrive/sync-push.test.ts -t "custom fields"` | No - Wave 0 |
| SYNC-02 | Status change triggers deal stage update | unit | `npx vitest run tests/pipedrive/sync-push.test.ts -t "stage update"` | No - Wave 0 |
| SYNC-03 | Webhook processes deal.change event | unit | `npx vitest run tests/pipedrive/webhook.test.ts -t "deal change"` | No - Wave 0 |
| SYNC-03 | Webhook processes deal.create event | unit | `npx vitest run tests/pipedrive/webhook.test.ts -t "deal created"` | No - Wave 0 |
| SYNC-03 | Webhook processes deal.delete event | unit | `npx vitest run tests/pipedrive/webhook.test.ts -t "deal deleted"` | No - Wave 0 |
| SYNC-04 | API-origin webhooks discarded | unit | `npx vitest run tests/pipedrive/webhook.test.ts -t "loop prevention"` | No - Wave 0 |
| SYNC-04 | Suppression window prevents loop | unit | `npx vitest run tests/pipedrive/webhook.test.ts -t "suppression window"` | No - Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run tests/pipedrive/ --reporter=verbose`
- **Per wave merge:** `npx vitest run --reporter=verbose`
- **Phase gate:** Full suite green before /gsd:verify-work

### Wave 0 Gaps
- [ ] `tests/pipedrive/sync-push.test.ts` -- covers SYNC-01, SYNC-02
- [ ] `tests/pipedrive/webhook.test.ts` -- covers SYNC-03, SYNC-04
- [ ] `tests/pipedrive/helpers/fixtures.ts` -- mock Pipedrive API responses, webhook payloads
- [ ] Framework install: none needed -- Vitest already configured

## Sources

### Primary (HIGH confidence)
- [Pipedrive Webhooks API v1 reference](https://developers.pipedrive.com/docs/api/v1/Webhooks) - event_action/event_object values, registration endpoint, basic auth fields
- [Pipedrive Webhooks v2 guide](https://pipedrive.readme.io/docs/guide-for-webhooks-v2) - v2 payload structure, meta block fields
- [Pipedrive Webhooks v2 migration guide](https://pipedrive.readme.io/docs/webhooks-v2-migration-guide) - differences from v1
- [Pipedrive API v2 stable announcement](https://developers.pipedrive.com/changelog/post/apiv2-endpoints-now-stable-improved-performance-lower-token-costs) - v2 endpoint stability status
- [Pipedrive rate limiting docs](https://pipedrive.readme.io/docs/core-api-concepts-rate-limiting) - token-based rate limits
- [Pipedrive Deals API](https://developers.pipedrive.com/docs/api/v1/Deals) - CRUD, custom fields, pagination
- [Pipedrive Persons API](https://developers.pipedrive.com/docs/api/v1/Persons) - email/phone array format
- [Pipedrive custom fields docs](https://pipedrive.readme.io/docs/core-api-concepts-custom-fields) - hash key format, field types

### Secondary (MEDIUM confidence)
- [Pipedrive v1 deprecation changelog](https://developers.pipedrive.com/changelog/post/deprecation-of-selected-api-v1-endpoints) - v1 endpoint sunset Dec 2025 (nested GET only)
- [Pipedrive webhooks v2 introduction](https://developers.pipedrive.com/changelog/post/introducing-webhooks-v2) - v2 excludes pipeline/stage/activityType events
- [Pipedrive dev community - webhook auth](https://devcommunity.pipedrive.com/t/how-does-the-authorization-header-sent-by-the-pipedrive-webhook-work/3342) - basic auth header behavior

### Tertiary (LOW confidence)
- Webhook HMAC signature (`x-pipedrive-signature` header) availability across plan tiers -- not confirmed in official docs

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - axios already in project, Pipedrive REST API is straightforward HTTP
- Architecture: HIGH - webhook pattern mirrors existing /webhook/gmail, sync-after-write is a simple hook
- Pipedrive API specifics: MEDIUM - v1 documented well, v2 docs harder to extract; some details need live account verification
- Pitfalls: HIGH - loop prevention and custom field handling are well-documented community concerns
- Import strategy: MEDIUM - pagination and history import need live account testing

**Research date:** 2026-03-10
**Valid until:** 2026-04-10 (Pipedrive API is stable; main risk is v1 deprecation timeline)
