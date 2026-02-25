#!/usr/bin/env npx tsx
/**
 * Generate identity_redirects.json from git history.
 * Use when migration already ran and you need the redirect map.
 *
 * Reads pre-migration edition content from git (default: HEAD).
 * If migration was committed, use REF=HEAD~1.
 *
 * CANON_PATH=... REF=HEAD~1 pnpm run generate:identity-redirects
 */
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import { toCanonicalShape } from '../src/toCanonicalShape.js';
import { getCanonPath, loadRegions } from '../src/loadCanon.js';
import { computeEditionIdentityHash, computeEditionIdentityHashV1 } from '../src/editionIdentity.js';

function migrateEdition(edition: Record<string, unknown>): Record<string, unknown> {
  const region = edition.region;
  if (region == null || String(region).trim() === '') {
    return edition;
  }
  const regionStr = String(region).trim();
  const discs = Array.isArray(edition.discs) ? edition.discs : [];
  if (discs.length === 0) {
    const out = { ...edition };
    delete out.region;
    return out;
  }
  const newDiscs = discs.map((d: unknown) => {
    const disc = d as Record<string, unknown>;
    const hasRegion = disc.region != null && String(disc.region).trim() !== '';
    if (!hasRegion) return { ...disc, region: regionStr };
    return disc;
  });
  const out = { ...edition, discs: newDiscs };
  delete out.region;
  return out;
}

function getFromGit(canonPath: string, ref: string, path: string): string | null {
  try {
    return execSync(`git -C "${canonPath}" show "${ref}:${path}"`, {
      encoding: 'utf-8',
    });
  } catch {
    return null;
  }
}

async function run(): Promise<void> {
  const canonPath = process.env.CANON_PATH ?? getCanonPath();
  const ref = process.env.REF ?? 'HEAD';

  const editionsDir = join(canonPath, 'editions');
  if (!existsSync(editionsDir)) {
    console.error('editions/ not found');
    process.exit(1);
  }

  const { mappings } = loadRegions(canonPath);
  const files = readdirSync(editionsDir).filter((f) => f.endsWith('.json')).sort();
  const redirects: Record<string, string> = {};

  for (const file of files) {
    const gitPath = `editions/${file}`;
    const content = getFromGit(canonPath, ref, gitPath);
    if (!content) continue;

    let items: unknown[];
    try {
      items = JSON.parse(content) as unknown[];
      if (!Array.isArray(items)) items = [items];
    } catch {
      continue;
    }

    for (const item of items) {
      const rec = item as Record<string, unknown>;
      if (rec.region == null || String(rec.region).trim() === '') continue;

      const v1 = computeEditionIdentityHashV1(rec, mappings);
      const migrated = migrateEdition(rec);
      const canonical = toCanonicalShape(migrated);
      const v2 = computeEditionIdentityHash(canonical, mappings);
      redirects[v1] = v2;
    }
  }

  const redirectPath = join(canonPath, 'identity_redirects.json');
  writeFileSync(redirectPath, JSON.stringify(redirects, null, 2) + '\n', 'utf-8');
  console.log(`Wrote ${redirectPath} (${Object.keys(redirects).length} redirects from ${ref})`);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
