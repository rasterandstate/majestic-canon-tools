#!/usr/bin/env npx tsx
/**
 * Generate Ed25519 signing keypair. Never commit private key.
 *
 * Usage:
 *   pnpm generate-test-keys                    # test keys for local dev
 *   pnpm generate-test-keys -- out/
 *   pnpm generate-test-keys -- --production    # production keys
 *   pnpm generate-test-keys -- out/production-keys --production
 *   pnpm generate-test-keys -- out/ --sync-updater   # also copy public key to canon-updater
 *
 * Test:  out/test-signing.pem, out/test-signing.pub
 * Prod:  out/production-signing.pem, out/production-signing.pub
 */
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { generateKeyPairSync } from 'crypto';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const rawArgs = process.argv.slice(2);
const args = rawArgs[0] === '--' ? rawArgs.slice(1) : rawArgs;
const syncUpdater = args.includes('--sync-updater');
const production = args.includes('--production');
const posArgs = args.filter((a) => a !== '--sync-updater' && a !== '--production');
const outDir = posArgs[0] ?? join(process.cwd(), 'out');

const privName = production ? 'production-signing.pem' : 'test-signing.pem';
const pubName = production ? 'production-signing.pub' : 'test-signing.pub';

if (!existsSync(outDir)) {
  mkdirSync(outDir, { recursive: true });
}

const { publicKey, privateKey } = generateKeyPairSync('ed25519', {
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

writeFileSync(join(outDir, privName), privateKey);
writeFileSync(join(outDir, pubName), publicKey);
console.log(production ? 'Generated production signing keypair:' : 'Generated test keypair (local dev):');
console.log('  Private:', join(outDir, privName));
console.log('  Public:', join(outDir, pubName));
if (syncUpdater) {
  const updaterFile = production ? 'production-public-key.pem' : 'test-public-key.pem';
  const updaterPath = join(ROOT, '..', 'majestic-canon-updater', 'src', updaterFile);
  writeFileSync(updaterPath, publicKey);
  console.log('  Updater:', updaterPath);
}
console.log('  Do NOT commit', privName);
