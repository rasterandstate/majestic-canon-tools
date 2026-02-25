import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { build } from '../src/build.js';
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
