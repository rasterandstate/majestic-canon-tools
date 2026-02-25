#!/usr/bin/env npx tsx
/**
 * Generate Ed25519 test keypair. For local dev only. Never commit private key.
 *
 * Usage:
 *   pnpm generate-test-keys
 *   pnpm generate-test-keys -- out/
 *   pnpm generate-test-keys -- out/ --sync-updater   # also copy public key to canon-updater
 *
 * Writes: out/test-signing.pem (private), out/test-signing.pub (public)
 */
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { generateKeyPairSync } from 'crypto';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const rawArgs = process.argv.slice(2);
const args = rawArgs[0] === '--' ? rawArgs.slice(1) : rawArgs;
const syncUpdater = args.includes('--sync-updater');
const posArgs = args.filter((a) => a !== '--sync-updater');
const outDir = posArgs[0] ?? join(process.cwd(), 'out');

if (!existsSync(outDir)) {
  mkdirSync(outDir, { recursive: true });
}

const { publicKey, privateKey } = generateKeyPairSync('ed25519', {
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

writeFileSync(join(outDir, 'test-signing.pem'), privateKey);
writeFileSync(join(outDir, 'test-signing.pub'), publicKey);
console.log('Generated test keypair:');
console.log('  Private:', join(outDir, 'test-signing.pem'));
console.log('  Public:', join(outDir, 'test-signing.pub'));
if (syncUpdater) {
  const updaterPath = join(ROOT, '..', 'majestic-canon-updater', 'src', 'test-public-key.pem');
  writeFileSync(updaterPath, publicKey);
  console.log('  Updater:', updaterPath);
}
console.log('  Do NOT commit test-signing.pem');
