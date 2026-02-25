#!/usr/bin/env npx tsx
/**
 * Sign manifest.json with Ed25519. Writes signature/manifest.sig.
 * Build ≠ Sign. Run after build. Private key from file.
 *
 * Usage:
 *   pnpm sign
 *   pnpm sign -- out/ ./keys/test-signing.pem
 *   MAJESTIC_PACK_PATH=out MAJESTIC_SIGNING_KEY=./keys/test-signing.pem pnpm sign
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { signManifestBytes } from '../src/sign.js';

const args = process.argv.slice(2);
const packRoot = process.env.MAJESTIC_PACK_PATH ?? args[0] ?? join(process.cwd(), 'out');
const keyPath = process.env.MAJESTIC_SIGNING_KEY ?? args[1] ?? join(packRoot, 'test-signing.pem');

const manifestPath = join(packRoot, 'manifest.json');
if (!existsSync(manifestPath)) {
  console.error('manifest.json not found at', manifestPath);
  process.exit(1);
}
if (!existsSync(keyPath)) {
  console.error('Private key not found at', keyPath);
  console.error('Run: pnpm generate-test-keys');
  process.exit(1);
}

const manifestBytes = readFileSync(manifestPath);
const privateKey = readFileSync(keyPath, 'utf-8');
const signature = signManifestBytes(manifestBytes, privateKey);

const sigDir = join(packRoot, 'signature');
if (!existsSync(sigDir)) {
  mkdirSync(sigDir, { recursive: true });
}
writeFileSync(join(sigDir, 'manifest.sig'), signature);
console.log('Signed manifest → signature/manifest.sig');
