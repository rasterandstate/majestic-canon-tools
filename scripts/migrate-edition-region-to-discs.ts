#!/usr/bin/env npx tsx
/**
 * One-time migration: move edition.region to disc.region.
 *
 * For each edition with edition.region:
 * - Copy edition.region to each disc that has no disc.region
 * - Remove edition.region from the edition
 *
 * Run from majestic-canon-tools or pass CANON_PATH.
 * Idempotent: safe to run multiple times.
 */
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';
import { toCanonicalShape } from '../src/toCanonicalShape.js';
import { getCanonPath } from '../src/loadCanon.js';

function migrateEdition(edition: Record<string, unknown>): { changed: boolean; result: Record<string, unknown> } {
  const region = edition.region;
  if (region == null || String(region).trim() === '') {
    return { changed: false, result: edition };
  }

  const regionStr = String(region).trim();
  const discs = Array.isArray(edition.discs) ? edition.discs : [];
  if (discs.length === 0) {
    const out = { ...edition };
    delete out.region;
    return { changed: true, result: out };
  }

  let changed = false;
  const newDiscs = discs.map((d: unknown) => {
    const disc = d as Record<string, unknown>;
    const hasRegion = disc.region != null && String(disc.region).trim() !== '';
    if (!hasRegion) {
      changed = true;
      return { ...disc, region: regionStr };
    }
    return disc;
  });

  const out = { ...edition, discs: newDiscs };
  delete out.region;
  return { changed: true, result: out };
}

function run(canonPath: string): { migrated: number; skipped: number; errors: string[] } {
  const editionsDir = join(canonPath, 'editions');
  if (!existsSync(editionsDir)) {
    return { migrated: 0, skipped: 0, errors: ['editions/ directory not found'] };
  }

  const files = readdirSync(editionsDir).filter((f) => f.endsWith('.json')).sort();
  let migrated = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const file of files) {
    const filePath = join(editionsDir, file);
    try {
      const raw = JSON.parse(readFileSync(filePath, 'utf-8'));
      const items = Array.isArray(raw) ? raw : [raw];
      const results: unknown[] = [];
      let fileChanged = false;

      for (const item of items) {
        const { changed, result } = migrateEdition(item as Record<string, unknown>);
        if (changed) {
          migrated++;
          fileChanged = true;
        } else if ((item as Record<string, unknown>).region != null) {
          skipped++;
        }
        results.push(result);
      }

      if (fileChanged) {
        const canonical = items.length === 1
          ? toCanonicalShape(results[0])
          : (results as unknown[]).map((r) => toCanonicalShape(r));
        writeFileSync(filePath, JSON.stringify(canonical, null, 0) + '\n', 'utf-8');
      }
    } catch (e) {
      errors.push(`${file}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return { migrated, skipped, errors };
}

const canonPath = process.env.CANON_PATH ?? getCanonPath();
console.log('Migrating edition.region → disc.region in', canonPath);

const { migrated, skipped, errors } = run(canonPath);

if (errors.length > 0) {
  console.error('Errors:');
  errors.forEach((e) => console.error('  ', e));
  process.exit(1);
}

console.log(`Done. Migrated: ${migrated}, skipped (already had disc.region): ${skipped}`);
