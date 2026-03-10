/**
 * Pipedrive Field Audit Script
 *
 * Fetches custom deal fields, pipeline ID, and stage IDs from the live Pipedrive account.
 * Outputs a JSON blob matching PipedriveFieldConfig format, ready to paste into
 * the PIPEDRIVE_FIELD_CONFIG env var.
 *
 * Usage: npx tsx scripts/pipedrive-audit.ts
 */

import 'dotenv/config';
import { pipedriveApi } from '../src/services/pipedrive/client.js';

async function audit() {
  console.log('--- Pipedrive Field Audit ---\n');

  // 1. Fetch custom deal fields
  console.log('Fetching deal fields...');
  const { data: fieldsRes } = await pipedriveApi.get('/dealFields');
  const customFields = (fieldsRes.data ?? []).filter(
    (f: { edit_flag: boolean; key: string }) => f.edit_flag === true
  );

  console.log(`\nCustom deal fields (${customFields.length}):`);
  for (const field of customFields) {
    console.log(`  ${field.name}: ${field.key}`);
  }

  // 2. Fetch pipelines
  console.log('\nFetching pipelines...');
  const { data: pipelinesRes } = await pipedriveApi.get('/pipelines');
  const pipelines = pipelinesRes.data ?? [];

  for (const pipeline of pipelines) {
    console.log(`  Pipeline: ${pipeline.name} (id: ${pipeline.id})`);
  }

  // 3. Fetch stages for first pipeline (or specific one)
  const pipelineId = pipelines[0]?.id;
  if (!pipelineId) {
    console.error('Aucun pipeline trouve!');
    process.exit(1);
  }

  console.log(`\nFetching stages for pipeline ${pipelineId}...`);
  const { data: stagesRes } = await pipedriveApi.get(`/stages`, {
    params: { pipeline_id: pipelineId },
  });
  const stages = stagesRes.data ?? [];

  console.log(`\nStages (${stages.length}):`);
  for (const stage of stages) {
    console.log(`  ${stage.name}: ${stage.id} (order: ${stage.order_nr})`);
  }

  // 4. Build config JSON
  const knownFieldNames: Record<string, string> = {
    'date': 'eventDate',
    'event_date': 'eventDate',
    'date_evenement': 'eventDate',
    'message': 'message',
    'source': 'source',
    'vcard': 'vcardUrl',
    'vcard_url': 'vcardUrl',
    'gpt': 'gptPrompt',
    'gpt_prompt': 'gptPrompt',
    'prompt': 'gptPrompt',
  };

  const fields: Record<string, string> = {};
  for (const field of customFields) {
    const normalizedName = field.name.toLowerCase().replace(/\s+/g, '_');
    const mappedName = knownFieldNames[normalizedName];
    if (mappedName) {
      fields[mappedName] = field.key;
    }
  }

  const stageMap: Record<string, number> = {};
  const stageNameMapping: Record<string, string> = {
    'nouveau': 'nouveau',
    'contacte': 'contacte',
    'contacté': 'contacte',
    'rdv': 'rdv',
    'rendez-vous': 'rdv',
    'devis_envoye': 'devis_envoye',
    'devis envoyé': 'devis_envoye',
    'devis envoye': 'devis_envoye',
    'signe': 'signe',
    'signé': 'signe',
    'perdu': 'perdu',
  };

  for (const stage of stages) {
    const normalizedName = stage.name.toLowerCase().trim();
    const mappedName = stageNameMapping[normalizedName];
    if (mappedName) {
      stageMap[mappedName] = stage.id;
    }
  }

  const configJson = {
    fields,
    stages: stageMap,
    pipelineId,
  };

  console.log('\n--- PIPEDRIVE_FIELD_CONFIG JSON ---');
  console.log(JSON.stringify(configJson, null, 2));
  console.log('\n--- Copier en une ligne pour .env ---');
  console.log(`PIPEDRIVE_FIELD_CONFIG='${JSON.stringify(configJson)}'`);
}

audit().catch((err) => {
  console.error('Erreur audit Pipedrive:', err.message);
  process.exit(1);
});
