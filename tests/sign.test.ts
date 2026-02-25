import { describe, it, expect } from 'vitest';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { generateKeyPairSync } from 'crypto';
import { build } from '../src/build.js';
import { signManifestBytes } from '../src/sign.js';
import { verifyManifest } from '../src/manifest.js';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const CANON_PATH = join(ROOT, '..', 'majestic-canon');

function generateKeypair() {
  return generateKeyPairSync('ed25519', {
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
}

describe('signing', () => {
  const outDir = join(ROOT, 'out-sign-test');
  const { publicKey, privateKey } = generateKeypair();

  it('valid signature passes verification', () => {
    build({ canonPath: CANON_PATH, outDir });
    const manifestPath = join(outDir, 'manifest.json');
    const manifestBytes = readFileSync(manifestPath);
    const signature = signManifestBytes(manifestBytes, privateKey);

    const sigDir = join(outDir, 'signature');
    if (!existsSync(sigDir)) mkdirSync(sigDir, { recursive: true });
    writeFileSync(join(sigDir, 'manifest.sig'), signature);

    const result = verifyManifest(outDir, publicKey);
    expect(result.ok).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('tampered manifest fails signature verification', () => {
    build({ canonPath: CANON_PATH, outDir });
    const manifestPath = join(outDir, 'manifest.json');
    const manifestBytes = readFileSync(manifestPath);
    const signature = signManifestBytes(manifestBytes, privateKey);

    const sigDir = join(outDir, 'signature');
    if (!existsSync(sigDir)) mkdirSync(sigDir, { recursive: true });
    writeFileSync(join(sigDir, 'manifest.sig'), signature);

    manifestBytes[0] ^= 0x01;
    writeFileSync(manifestPath, manifestBytes);

    const result = verifyManifest(outDir, publicKey);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes('signature verification failed'))).toBe(true);
  });

  it('wrong public key fails signature verification', () => {
    build({ canonPath: CANON_PATH, outDir });
    const manifestPath = join(outDir, 'manifest.json');
    const manifestBytes = readFileSync(manifestPath);
    const signature = signManifestBytes(manifestBytes, privateKey);

    const sigDir = join(outDir, 'signature');
    if (!existsSync(sigDir)) mkdirSync(sigDir, { recursive: true });
    writeFileSync(join(sigDir, 'manifest.sig'), signature);

    const { publicKey: wrongPublicKey } = generateKeypair();
    const result = verifyManifest(outDir, wrongPublicKey);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes('signature verification failed'))).toBe(true);
  });

  it('tampered signature file fails verification', () => {
    build({ canonPath: CANON_PATH, outDir });
    const manifestPath = join(outDir, 'manifest.json');
    const manifestBytes = readFileSync(manifestPath);
    const signature = signManifestBytes(manifestBytes, privateKey);

    const sigDir = join(outDir, 'signature');
    if (!existsSync(sigDir)) mkdirSync(sigDir, { recursive: true });
    const sigPath = join(sigDir, 'manifest.sig');
    writeFileSync(sigPath, signature);

    const tamperedSig = Buffer.from(signature);
    tamperedSig[0] ^= 0x01;
    writeFileSync(sigPath, tamperedSig);

    const result = verifyManifest(outDir, publicKey);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes('signature verification failed'))).toBe(true);
  });
});
