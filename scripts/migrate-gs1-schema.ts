#!/usr/bin/env npx tsx
/**
 * One-time migration: GS1 schema decoupling.
 *
 * Renames:
 *   company_name → gs1_registrant_name
 *
 * Removes:
 *   publisher_id
 *
 * GS1 prefix = barcode registrant only.
 * Edition publisher = distributor/label (independent).
 *
 * Run from majestic-canon-tools. Set MAJESTIC_CANON_PATH if needed.
 */
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';
import { getCanonPath } from '../src/loadCanon.js';

function run(canonPath: string): { migrated: number; removedPublisherId: number; errors: string[] } {
  const gs1Dir = join(canonPath, 'gs1');
  if (!existsSync(gs1Dir)) {
    return { migrated: 0, removedPublisherId: 0, errors: ['gs1/ directory not found'] };
  }

  const files = readdirSync(gs1Dir).filter((f) => f.endsWith('.json'));
  let migrated = 0;
  let removedPublisherId = 0;
  const errors: string[] = [];

  for (const file of files) {
    const filePath = join(gs1Dir, file);
    try {
      const raw = JSON.parse(readFileSync(filePath, 'utf-8')) as Record<string, unknown>;
      let changed = false;

      if ('company_name' in raw && raw.company_name !== undefined) {
        raw.gs1_registrant_name = raw.company_name;
        delete raw.company_name;
        changed = true;
      }

      if ('publisher_id' in raw) {
        delete raw.publisher_id;
        removedPublisherId++;
        changed = true;
      }

      if (changed) {
        writeFileSync(filePath, JSON.stringify(raw, null, 2) + '\n', 'utf-8');
        migrated++;
      }
    } catch (e) {
      errors.push(`${file}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return { migrated, removedPublisherId, errors };
}

const canonPath = getCanonPath();
const { migrated, removedPublisherId, errors } = run(canonPath);

console.log(`migrated: ${migrated}`);
console.log(`removed publisher_id: ${removedPublisherId}`);
if (errors.length > 0) {
  console.error('errors:', errors);
  process.exit(1);
}
