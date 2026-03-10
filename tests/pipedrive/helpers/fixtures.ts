import type { PipedriveFieldConfig } from '../../../src/services/pipedrive/field-config.js';
import type { Lead } from '../../../src/types.js';

// --- Field Config Mock ---

export const MOCK_FIELD_CONFIG: PipedriveFieldConfig = {
  fields: {
    eventDate: 'c76364a6b27f37da129983e1890679e68ecda498',
    message: '3492fbf7847cf24e2e5765bae84342b22ae1fe41',
    source: '7daee8dd73a055a7bfba7dab1b3419caca83b956',
    vcardUrl: '7a59a1278b8afaf8ce652c0f50374c91e49e5e6c',
    gptPrompt: '547fb3bf25e1c9a02d6a5b5f8db7ec0c6768c0e6',
  },
  stages: {
    nouveau: 1,
    contacte: 2,
    rdv: 3,
    devis_envoye: 4,
    signe: 5,
    perdu: 6,
  },
  pipelineId: 1,
};

// --- Lead Mock ---

export const MOCK_LEAD: Lead = {
  id: 42,
  name: 'Sophie Dupont',
  email: 'sophie@example.com',
  phone: '+33612345678',
  eventDate: '15/06/2027',
  message: 'Bonjour, nous cherchons un photographe pour notre mariage.',
  budget: 3000,
  source: 'mariages.net',
  status: 'nouveau',
  vCardUrl: 'https://storage.googleapis.com/weds-crm-vcards/sophie-dupont.vcf',
  gmailMessageId: '18f1234567890abc',
  pipedrivePersonId: null,
  pipedriveDealId: null,
  lastSyncOrigin: null,
  lastSyncAt: null,
  createdAt: new Date('2027-01-15T10:00:00Z'),
  updatedAt: new Date('2027-01-15T10:00:00Z'),
};

// --- Pipedrive API Response Mocks ---

export const MOCK_PIPEDRIVE_PERSON_RESPONSE = {
  success: true,
  data: {
    id: 101,
    name: 'Sophie Dupont',
    email: [{ value: 'sophie@example.com', primary: true, label: '' }],
    phone: [{ value: '+33612345678', primary: true, label: '' }],
    org_id: null,
    add_time: '2027-01-15 10:00:00',
    update_time: '2027-01-15 10:00:00',
    visible_to: 3,
    owner_id: { id: 1, name: 'William', email: 'contact@weds.fr' },
  },
};

export const MOCK_PIPEDRIVE_DEAL_RESPONSE = {
  success: true,
  data: {
    id: 201,
    title: 'Sophie Dupont (15/06/2027)',
    person_id: 101,
    stage_id: 1,
    pipeline_id: 1,
    status: 'open',
    value: 3000,
    currency: 'EUR',
    add_time: '2027-01-15 10:00:00',
    update_time: '2027-01-15 10:00:00',
    stage_change_time: '2027-01-15 10:00:00',
    [MOCK_FIELD_CONFIG.fields.eventDate]: '15/06/2027',
    [MOCK_FIELD_CONFIG.fields.message]: 'Bonjour, nous cherchons un photographe pour notre mariage.',
    [MOCK_FIELD_CONFIG.fields.source]: 'mariages.net',
    [MOCK_FIELD_CONFIG.fields.vcardUrl]: 'https://storage.googleapis.com/weds-crm-vcards/sophie-dupont.vcf',
    owner_id: { id: 1, name: 'William', email: 'contact@weds.fr' },
  },
};

// --- Webhook v2 Payload Mocks ---

/** Deal stage change from the Pipedrive app UI */
export const MOCK_WEBHOOK_DEAL_CHANGE = {
  meta: {
    action: 'change' as const,
    entity: 'deal' as const,
    entity_id: 201,
    change_source: 'app',
    timestamp: '2027-01-15T12:00:00Z',
    user_id: 1,
    version: '2',
    webhook_id: 50,
    is_bulk_edit: false,
    company_id: 12345,
  },
  data: {
    id: 201,
    title: 'Sophie Dupont (15/06/2027)',
    person_id: 101,
    stage_id: 2, // contacte
    pipeline_id: 1,
    status: 'open',
    stage_change_time: '2027-01-15 12:00:00',
  },
  previous: {
    stage_id: 1, // nouveau
    stage_change_time: '2027-01-15 10:00:00',
  },
};

/** Deal stage change originating from the API (i.e., our CRM pushed it) -- for loop prevention tests */
export const MOCK_WEBHOOK_DEAL_CHANGE_API = {
  meta: {
    action: 'change' as const,
    entity: 'deal' as const,
    entity_id: 201,
    change_source: 'api',
    timestamp: '2027-01-15T12:00:00Z',
    user_id: 1,
    version: '2',
    webhook_id: 50,
    is_bulk_edit: false,
    company_id: 12345,
  },
  data: {
    id: 201,
    title: 'Sophie Dupont (15/06/2027)',
    person_id: 101,
    stage_id: 2,
    pipeline_id: 1,
    status: 'open',
    stage_change_time: '2027-01-15 12:00:00',
  },
  previous: {
    stage_id: 1,
    stage_change_time: '2027-01-15 10:00:00',
  },
};

/** New deal created in Pipedrive */
export const MOCK_WEBHOOK_DEAL_CREATED = {
  meta: {
    action: 'create' as const,
    entity: 'deal' as const,
    entity_id: 202,
    change_source: 'app',
    timestamp: '2027-01-16T09:00:00Z',
    user_id: 1,
    version: '2',
    webhook_id: 50,
    is_bulk_edit: false,
    company_id: 12345,
  },
  data: {
    id: 202,
    title: 'Marie Martin (20/09/2027)',
    person_id: 102,
    stage_id: 1,
    pipeline_id: 1,
    status: 'open',
    add_time: '2027-01-16 09:00:00',
    [MOCK_FIELD_CONFIG.fields.eventDate]: '20/09/2027',
    [MOCK_FIELD_CONFIG.fields.message]: 'Recherche DJ pour mariage',
    [MOCK_FIELD_CONFIG.fields.source]: 'pipedrive',
  },
  previous: undefined,
};

/** Deal deleted in Pipedrive */
export const MOCK_WEBHOOK_DEAL_DELETED = {
  meta: {
    action: 'delete' as const,
    entity: 'deal' as const,
    entity_id: 201,
    change_source: 'app',
    timestamp: '2027-01-17T14:00:00Z',
    user_id: 1,
    version: '2',
    webhook_id: 50,
    is_bulk_edit: false,
    company_id: 12345,
  },
  data: {
    id: 201,
  },
  previous: {
    id: 201,
    title: 'Sophie Dupont (15/06/2027)',
    person_id: 101,
    stage_id: 2,
    pipeline_id: 1,
    status: 'open',
  },
};

/** Person updated in Pipedrive */
export const MOCK_WEBHOOK_PERSON_UPDATED = {
  meta: {
    action: 'change' as const,
    entity: 'person' as const,
    entity_id: 101,
    change_source: 'app',
    timestamp: '2027-01-18T11:00:00Z',
    user_id: 1,
    version: '2',
    webhook_id: 51,
    is_bulk_edit: false,
    company_id: 12345,
  },
  data: {
    id: 101,
    name: 'Sophie Dupont-Martin',
    email: [{ value: 'sophie.new@example.com', primary: true, label: '' }],
    phone: [{ value: '+33612345678', primary: true, label: '' }],
  },
  previous: {
    name: 'Sophie Dupont',
    email: [{ value: 'sophie@example.com', primary: true, label: '' }],
  },
};
