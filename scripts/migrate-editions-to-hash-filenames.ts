#!/usr/bin/env npx tsx
/**
 * One-time migration: rename edition files from movie-based to hash-based.
 *
 * Before: editions/603.json (one per movie — overwrites region variants, packaging, etc.)
 * After:  editions/<sha256hex>.json (one per edition identity)
 *
 * Aligns storage with ontology: multiple editions per movie are now preserved.
 *
 * Run from majestic-canon-tools. Set CANON_PATH if needed.
 * Idempotent: safe to run multiple times (already-migrated files are skipped).
 */
import { readFileSync, writeFileSync, existsSync, readdirSync, unlinkSync } from 'fs';
import { join } from 'path';
import { getCanonPath } from '../src/loadCanon.js';
import { loadRegions } from '../src/loadCanon.js';
import { toCanonicalShape } from '../src/toCanonicalShape.js';
import { computeEditionIdentityHash } from '../src/editionIdentity.js';

function identityHashToFilename(identityHash: string): string {
  const hex = identityHash.replace(/^edition:v\d+:/, '');
  return `${hex}.json`;
}

async function run(canonPath: string): Promise<{
  migrated: number;
  skipped: number;
  errors: string[];
}> {
  const editionsDir = join(canonPath, 'editions');
  if (!existsSync(editionsDir)) {
    return { migrated: 0, skipped: 0, errors: ['editions/ directory not found'] };
  }

  const { mappings } = loadRegions(canonPath);
  const files = readdirSync(editionsDir).filter((f) => f.endsWith('.json')).sort();
  let migrated = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const file of files) {
    const filePath = join(editionsDir, file);
    try {
      const raw = JSON.parse(readFileSync(filePath, 'utf-8'));
      const items = Array.isArray(raw) ? raw : [raw];
      const toWrite: { canonical: unknown; newFilename: string }[] = [];
      let allAlreadyCorrect = true;

      for (const item of items) {
        const canonical = toCanonicalShape(item);
        const identityHash = computeEditionIdentityHash(canonical, mappings);
        const newFilename = identityHashToFilename(identityHash);

        if (newFilename !== file || items.length > 1) {
          allAlreadyCorrect = false;
        }
        toWrite.push({ canonical, newFilename });
      }

      if (allAlreadyCorrect && items.length === 1) {
        skipped++;
        continue;
      }

      for (const { canonical, newFilename } of toWrite) {
        const newPath = join(editionsDir, newFilename);
        if (existsSync(newPath) && newPath !== filePath) {
          errors.push(`${file}: target ${newFilename} already exists (hash collision or duplicate)`);
          continue;
        }
        writeFileSync(newPath, JSON.stringify(canonical, null, 2), 'utf-8');
        migrated++;
      }

      if (toWrite.length > 0 && (toWrite.length > 1 || toWrite[0].newFilename !== file)) {
        unlinkSync(filePath);
      }
    } catch (e) {
      errors.push(`${file}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return { migrated, skipped, errors };
}

const canonPath = process.env.CANON_PATH ?? process.env.MAJESTIC_CANON_PATH ?? getCanonPath();
console.log('Migrating edition filenames to hash-based in', canonPath);

const { migrated, skipped, errors } = await run(canonPath);

if (errors.length > 0) {
  console.error('Errors:');
  errors.forEach((e) => console.error('  ', e));
  process.exit(1);
}

console.log(`Done. Migrated: ${migrated}, skipped (already correct): ${skipped}`);
