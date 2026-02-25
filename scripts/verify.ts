#!/usr/bin/env npx tsx
/**
 * Verify manifest payload integrity and (optionally) signature.
 * Recomputes sha256 of each payload file, asserts match.
 * When public key provided, verifies signature/manifest.sig.
 *
 * Usage:
 *   pnpm verify
 *   pnpm verify -- out/
 *   pnpm verify -- out/ out/test-signing.pub
 *   MAJESTIC_PACK_PATH=out MAJESTIC_SIGNING_PUBLIC_KEY=out/test-signing.pub pnpm verify
 */
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { verifyManifest } from '../src/manifest.js';

const rawArgs = process.argv.slice(2);
const args = rawArgs[0] === '--' ? rawArgs.slice(1) : rawArgs;
const packRoot = process.env.MAJESTIC_PACK_PATH ?? args[0] ?? join(process.cwd(), 'out');
const publicKeyPath = process.env.MAJESTIC_SIGNING_PUBLIC_KEY ?? args[1];

let publicKeyPem: string | undefined;
if (publicKeyPath && existsSync(publicKeyPath)) {
  publicKeyPem = readFileSync(publicKeyPath, 'utf-8');
}

const result = verifyManifest(packRoot, publicKeyPem);
if (!result.ok) {
  console.error('Verification failed:');
  for (const err of result.errors) {
    console.error('  -', err);
  }
  process.exit(1);
}
console.log('OK: manifest payload integrity verified');
