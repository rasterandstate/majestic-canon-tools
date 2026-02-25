#!/usr/bin/env npx tsx
/**
 * One-time migration: move edition.region to disc.region.
 *
 * For each edition with edition.region:
 * - Copy edition.region to each disc that has no disc.region
 * - Remove edition.region from the edition
 *
 * Outputs identity_redirects.json mapping old v1 hashes to new v2 hashes.
 *
 * If migration already ran, use: pnpm run generate:identity-redirects
 * with REF=HEAD (or REF=HEAD~1 if migration was committed).
 *
 * Run from majestic-canon-tools or pass CANON_PATH.
 * Idempotent: safe to run multiple times.
 */
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';
import { toCanonicalShape } from '../src/toCanonicalShape.js';
import { getCanonPath } from '../src/loadCanon.js';
import { computeEditionIdentityHash, computeEditionIdentityHashV1 } from '../src/editionIdentity.js';
import { loadRegions } from '../src/loadCanon.js';

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

async function run(canonPath: string): Promise<{
  migrated: number;
  skipped: number;
  errors: string[];
  redirects: Record<string, string>;
} {
  const editionsDir = join(canonPath, 'editions');
  if (!existsSync(editionsDir)) {
    return { migrated: 0, skipped: 0, errors: ['editions/ directory not found'], redirects: {} };
  }

  const { mappings } = loadRegions(canonPath);
  const files = readdirSync(editionsDir).filter((f) => f.endsWith('.json')).sort();
  let migrated = 0;
  let skipped = 0;
  const errors: string[] = [];
  const redirects: Record<string, string> = {};

  for (const file of files) {
    const filePath = join(editionsDir, file);
    try {
      const raw = JSON.parse(readFileSync(filePath, 'utf-8'));
      const items = Array.isArray(raw) ? raw : [raw];
      const results: unknown[] = [];
      let fileChanged = false;

      for (const item of items) {
        const rec = item as Record<string, unknown>;
        const { changed, result } = migrateEdition(rec);
        if (changed) {
          migrated++;
          fileChanged = true;
          const v1 = computeEditionIdentityHashV1(rec, mappings);
          const canonical = toCanonicalShape(result);
          const v2 = computeEditionIdentityHash(canonical, mappings);
          redirects[v1] = v2;
        } else if (rec.region != null) {
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

  return { migrated, skipped, errors, redirects };
}

const canonPath = process.env.CANON_PATH ?? getCanonPath();
console.log('Migrating edition.region → disc.region in', canonPath);

const { migrated, skipped, errors, redirects } = await run(canonPath);

if (errors.length > 0) {
  console.error('Errors:');
  errors.forEach((e) => console.error('  ', e));
  process.exit(1);
}

if (Object.keys(redirects).length > 0) {
  const redirectPath = join(canonPath, 'identity_redirects.json');
  writeFileSync(redirectPath, JSON.stringify(redirects, null, 2) + '\n', 'utf-8');
  console.log(`Wrote ${redirectPath} (${Object.keys(redirects).length} redirects)`);
}

console.log(`Done. Migrated: ${migrated}, skipped (already had disc.region): ${skipped}`);
