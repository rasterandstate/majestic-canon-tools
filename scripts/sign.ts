#!/usr/bin/env npx tsx
/**
 * Sign manifest.json with Ed25519. Writes signature/manifest.sig.
 * Build ≠ Sign. Run after build.
 *
 * Local mode (test): private key from file
 *   pnpm sign
 *   pnpm sign -- out/ ./keys/test-signing.pem
 *
 * External mode (production): attach pre-computed signature from signer
 *   pnpm sign --attach -- out/              # read signature from stdin
 *   pnpm sign --attach -- out/ ./sig.bin    # read signature from file
 *
 * Prepare (for external signer): output manifest bytes to stdout
 *   pnpm exec tsx scripts/sign.ts --prepare -- out/ > manifest.bin
 *   (Use exec when piping; pnpm sign adds header to stdout.)
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { signManifestBytes } from '../src/sign.js';

const rawArgs = process.argv.slice(2);
const args = rawArgs[0] === '--' ? rawArgs.slice(1) : rawArgs;
const attachIdx = args.indexOf('--attach');
const prepareIdx = args.indexOf('--prepare');
const attachMode = attachIdx !== -1;
const prepareMode = prepareIdx !== -1;
let posArgs = args.filter((a, i) => i !== attachIdx && i !== prepareIdx);
if (posArgs[0] === '--') posArgs = posArgs.slice(1);

const packRoot = process.env.MAJESTIC_PACK_PATH ?? posArgs[0] ?? join(process.cwd(), 'out');
const keyOrSigPath = process.env.MAJESTIC_SIGNING_KEY ?? posArgs[1];

const manifestPath = join(packRoot, 'manifest.json');
if (!existsSync(manifestPath)) {
  console.error('manifest.json not found at', manifestPath);
  process.exit(1);
}

if (prepareMode) {
  const manifestBytes = readFileSync(manifestPath);
  process.stdout.write(manifestBytes);
} else if (attachMode) {
  // External signer boundary: attach pre-computed signature
  let sigBytes: Buffer;
  if (keyOrSigPath && existsSync(keyOrSigPath)) {
    sigBytes = readFileSync(keyOrSigPath);
  } else {
    // Read from stdin
    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) {
      chunks.push(chunk as Buffer);
    }
    sigBytes = Buffer.concat(chunks);
  }
  if (sigBytes.length === 0) {
    console.error('No signature received (empty stdin or file)');
    process.exit(1);
  }
  const sigDir = join(packRoot, 'signature');
  if (!existsSync(sigDir)) {
    mkdirSync(sigDir, { recursive: true });
  }
  writeFileSync(join(sigDir, 'manifest.sig'), sigBytes);
  console.log('Attached signature → signature/manifest.sig');
} else {
  // Local mode: sign with key file
  const keyPath = keyOrSigPath ?? join(packRoot, 'test-signing.pem');
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
}
