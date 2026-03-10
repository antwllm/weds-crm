/**
 * One-time Pipedrive import script.
 * Imports all deals (active + closed/won/lost) into the CRM as leads,
 * with their notes, activities, and custom field values.
 *
 * Run with: npx tsx scripts/pipedrive-import.ts
 */

import 'dotenv/config';
import { importAllDeals } from '../src/services/pipedrive/import.js';
import { closeDb } from '../src/db/index.js';

async function main() {
  console.log('Import Pipedrive: demarrage...');

  try {
    const result = await importAllDeals();
    console.log(
      `Import termine: ${result.imported} importes, ${result.linked} lies, ${result.skipped} ignores`,
    );
  } catch (error) {
    console.error('Import echoue:', error);
    process.exitCode = 1;
  } finally {
    await closeDb();
  }
}

main();
