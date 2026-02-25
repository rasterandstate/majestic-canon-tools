import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, writeFileSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { build } from '../src/build.js';
import { verifyManifest } from '../src/manifest.js';
import { createHash } from 'crypto';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const CANON_PATH = join(ROOT, '..', 'majestic-canon');

describe('manifest integrity', () => {
  it('payload sha256 in manifest equals computed hash of canon.json', () => {
    const outDir = join(ROOT, 'out-manifest-test');
    const result = build({ canonPath: CANON_PATH, outDir });
    const canonPath = join(outDir, 'payload', 'canon.json');
    const canonBytes = readFileSync(canonPath);
    const computedHash = createHash('sha256').update(canonBytes).digest('hex');
    expect(result.manifest.payload.files[0].sha256).toBe(computedHash);
    expect(result.fullPackHash).toBe(computedHash);
  });

  it('manifest payload.files[0].bytes equals Buffer.byteLength of canon.json', () => {
    const outDir = join(ROOT, 'out-manifest-test');
    const result = build({ canonPath: CANON_PATH, outDir });
    const canonPath = join(outDir, 'payload', 'canon.json');
    const canonBytes = readFileSync(canonPath);
    expect(result.manifest.payload.files[0].bytes).toBe(canonBytes.byteLength);
  });

  it('payload.files is sorted lexicographically by path', () => {
    const outDir = join(ROOT, 'out-manifest-test');
    const result = build({ canonPath: CANON_PATH, outDir });
    const paths = result.manifest.payload.files.map((f) => f.path);
    const sorted = [...paths].sort((a, b) => a.localeCompare(b));
    expect(paths).toEqual(sorted);
  });

  it('manifest has required fields per PACK_FORMAT', () => {
    const outDir = join(ROOT, 'out-manifest-test');
    const result = build({ canonPath: CANON_PATH, outDir });
    const m = result.manifest;
    expect(m.pack_format_version).toBe('1');
    expect(m.schema_version).toBeDefined();
    expect(m.identity_version).toBeDefined();
    expect(m.type).toBe('full');
    expect(m.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    expect(m.payload.files).toHaveLength(1);
    expect(m.payload.files[0].path).toBe('payload/canon.json');
  });

  it('verifyManifest passes for valid pack', () => {
    const outDir = join(ROOT, 'out-manifest-test');
    build({ canonPath: CANON_PATH, outDir });
    const result = verifyManifest(outDir);
    expect(result.ok).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('verifyManifest fails when manifest.json missing', () => {
    const result = verifyManifest(join(ROOT, 'nonexistent-pack'));
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes('not found'))).toBe(true);
  });

  it('verifyManifest fails loudly on missing payload file', () => {
    const outDir = join(ROOT, 'out-manifest-test');
    build({ canonPath: CANON_PATH, outDir });
    const canonPath = join(outDir, 'payload', 'canon.json');
    unlinkSync(canonPath);
    const result = verifyManifest(outDir);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes('missing'))).toBe(true);
  });

  it('verifyManifest fails loudly on hash mismatch', () => {
    const outDir = join(ROOT, 'out-manifest-test');
    build({ canonPath: CANON_PATH, outDir });
    const canonPath = join(outDir, 'payload', 'canon.json');
    writeFileSync(canonPath, 'corrupted', 'utf-8');
    const result = verifyManifest(outDir);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes('hash mismatch'))).toBe(true);
  });

  it('verifyManifest detects single-byte tampering', () => {
    const outDir = join(ROOT, 'out-manifest-test');
    build({ canonPath: CANON_PATH, outDir });
    const canonPath = join(outDir, 'payload', 'canon.json');
    const buf = Buffer.from(readFileSync(canonPath));
    buf[0] ^= 0x01; // flip one bit
    writeFileSync(canonPath, buf);
    const result = verifyManifest(outDir);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes('hash mismatch'))).toBe(true);
  });

  it('rebuild produces same payload hash and canon_version (same commit)', () => {
    const outDir = join(ROOT, 'out-manifest-test');
    const r1 = build({ canonPath: CANON_PATH, outDir });
    const r2 = build({ canonPath: CANON_PATH, outDir });
    expect(r1.fullPackHash).toBe(r2.fullPackHash);
    expect(r1.manifest.canon_version).toBe(r2.manifest.canon_version);
    expect(r1.manifest.payload.files[0].sha256).toBe(r2.manifest.payload.files[0].sha256);
    expect(r1.manifest.payload.files[0].bytes).toBe(r2.manifest.payload.files[0].bytes);
    // created_at may differ; that's expected
  });
});
