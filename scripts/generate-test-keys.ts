#!/usr/bin/env npx tsx
/**
 * Generate Ed25519 test keypair. For local dev only. Never commit private key.
 *
 * Usage:
 *   pnpm generate-test-keys
 *   pnpm generate-test-keys -- out/
 *
 * Writes: out/test-signing.pem (private), out/test-signing.pub (public)
 */
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { generateKeyPairSync } from 'crypto';

const args = process.argv.slice(2);
const outDir = args[0] ?? join(process.cwd(), 'out');

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
console.log('  Do NOT commit test-signing.pem');
