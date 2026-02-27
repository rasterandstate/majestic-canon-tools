import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { build } from '../src/build.js';
import { loadCanonSchema, getCanonPath } from '../src/loadCanon.js';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const CANON_PATH = join(ROOT, '..', 'majestic-canon');

describe('canon-tools build', () => {
  it('loads canon schema from path', () => {
    const schema = loadCanonSchema(CANON_PATH);
    expect(schema.version).toBe(3);
    expect(schema.identityContract.editionHashVersion).toBe(4);
  });

  it('build produces manifest.json, version.json, payload/canon.json', () => {
    const outDir = join(ROOT, 'out-test');
    const manifest = build({ canonPath: CANON_PATH, outDir });
    expect(manifest.version).toBe(1);
    expect(manifest.schemaVersion).toBe(3);
    expect(manifest.builtAt).toBeDefined();
    expect(manifest.fullPackHash).toBeDefined();
    expect(manifest.manifest).toBeDefined();
    expect(manifest.manifest.payload.files[0].path).toBe('payload/canon.json');
    expect(manifest.manifest.payload.files[0].sha256).toBe(manifest.fullPackHash);

    const versionPath = join(outDir, 'version.json');
    expect(existsSync(join(outDir, 'manifest.json'))).toBe(true);
    expect(existsSync(versionPath)).toBe(true);
    const written = JSON.parse(readFileSync(versionPath, 'utf-8'));
    expect(written.version).toBe(manifest.version);

    const canonPath = join(outDir, 'payload', 'canon.json');
    expect(existsSync(canonPath)).toBe(true);
    const canonJson = readFileSync(canonPath, 'utf-8');
    expect(canonJson).toContain('"publishers"');
    expect(canonJson).toContain('"regions"');
    expect(canonJson).toContain('"editions"');
  });
});
