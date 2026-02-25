#!/usr/bin/env npx tsx
/**
 * Verify manifest payload integrity. Recomputes sha256 of each payload file,
 * asserts match. Same semantics canon-updater will use.
 *
 * Usage:
 *   pnpm verify
 *   pnpm verify -- out/
 *   MAJESTIC_PACK_PATH=./dist pnpm verify
 */
import { verifyManifest } from '../src/manifest.js';
import { join } from 'path';

const args = process.argv.slice(2);
const packRoot = process.env.MAJESTIC_PACK_PATH ?? args[0] ?? join(process.cwd(), 'out');

const result = verifyManifest(packRoot);
if (!result.ok) {
  console.error('Verification failed:');
  for (const err of result.errors) {
    console.error('  -', err);
  }
  process.exit(1);
}
console.log('OK: manifest payload integrity verified');
