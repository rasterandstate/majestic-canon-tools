#!/usr/bin/env npx tsx
/**
 * Ingest Disq product by GTIN. Stores evidence in canon/evidence/disq/.
 * Usage: pnpm canon:ingest-disq <gtin>
 */
import { ingestDisqProduct } from '../src/evidence/disqIngest.js';
import { getCanonPath } from '../src/loadCanon.js';

const gtin = process.argv[2];
if (!gtin) {
  console.error('Usage: pnpm canon:ingest-disq <gtin>');
  process.exit(1);
}

const canonPath = process.env.MAJESTIC_CANON_PATH ?? getCanonPath();

try {
  const record = await ingestDisqProduct(gtin, canonPath);
  console.log('Ingested:', record.id);
  console.log('File: canon/evidence/disq/' + record.id + '.json');
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}
