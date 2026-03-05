#!/usr/bin/env npx tsx
/**
 * Synthesize proposals from all evidence. Writes to canon/proposals/.
 * Usage: pnpm canon:synthesize
 */
import { synthesizeAll } from '../src/evidence/synthesizeAll.js';
import { getCanonPath } from '../src/loadCanon.js';

const canonPath = process.env.MAJESTIC_CANON_PATH ?? getCanonPath();

try {
  const { synthesized, skipped } = await synthesizeAll(canonPath);
  console.log(`Synthesized: ${synthesized}, Skipped: ${skipped}`);
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}
