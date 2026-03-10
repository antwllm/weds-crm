import { config } from '../../config.js';

/**
 * Pipedrive custom field hash keys, pipeline stage IDs, and pipeline ID.
 * Populated by running `npx tsx scripts/pipedrive-audit.ts` against the live account.
 */
export interface PipedriveFieldConfig {
  fields: {
    eventDate: string;
    message: string;
    source: string;
    vcardUrl: string;
    gptPrompt: string;
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

/** Fallback field hash keys from the existing weds Pipedrive account */
const DEFAULT_FIELDS: PipedriveFieldConfig['fields'] = {
  eventDate: 'c76364a6b27f37da129983e1890679e68ecda498',
  message: '3492fbf7847cf24e2e5765bae84342b22ae1fe41',
  source: '7daee8dd73a055a7bfba7dab1b3419caca83b956',
  vcardUrl: '7a59a1278b8afaf8ce652c0f50374c91e49e5e6c',
  gptPrompt: '547fb3bf25e1c9a02d6a5b5f8db7ec0c6768c0e6',
};

let _cachedConfig: PipedriveFieldConfig | null = null;

/**
 * Load Pipedrive field config from PIPEDRIVE_FIELD_CONFIG env var (JSON).
 * Falls back to default field hash keys if only stages/pipelineId are provided.
 */
export function loadFieldConfig(): PipedriveFieldConfig {
  if (_cachedConfig) return _cachedConfig;

  const raw = config.PIPEDRIVE_FIELD_CONFIG;
  if (!raw) {
    throw new Error('PIPEDRIVE_FIELD_CONFIG manquant — lancez scripts/pipedrive-audit.ts');
  }

  const parsed = JSON.parse(raw) as Partial<PipedriveFieldConfig>;

  _cachedConfig = {
    fields: { ...DEFAULT_FIELDS, ...parsed.fields },
    stages: parsed.stages as PipedriveFieldConfig['stages'],
    pipelineId: parsed.pipelineId as number,
  };

  if (!_cachedConfig.stages || !_cachedConfig.pipelineId) {
    throw new Error('PIPEDRIVE_FIELD_CONFIG invalide — stages et pipelineId requis');
  }

  return _cachedConfig;
}

/** Map a CRM lead status to the corresponding Pipedrive stage ID */
export function statusToStageId(status: string): number {
  const cfg = loadFieldConfig();
  const stageId = cfg.stages[status as keyof PipedriveFieldConfig['stages']];
  if (stageId === undefined) {
    throw new Error(`Statut inconnu pour le mapping Pipedrive: ${status}`);
  }
  return stageId;
}

/** Reverse lookup: Pipedrive stage ID to CRM lead status (null if unknown) */
export function stageIdToStatus(stageId: number): string | null {
  const cfg = loadFieldConfig();
  const entry = Object.entries(cfg.stages).find(([, id]) => id === stageId);
  return entry ? entry[0] : null;
}

/** Reset cached config (for tests) */
export function _resetFieldConfig(): void {
  _cachedConfig = null;
}
