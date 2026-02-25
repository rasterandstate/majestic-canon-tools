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
    expect(schema.version).toBe(1);
    expect(schema.identityContract.editionHashVersion).toBe(1);
  });

  it('build produces version.json', () => {
    const outDir = join(ROOT, 'out-test');
    const manifest = build({ canonPath: CANON_PATH, outDir });
    expect(manifest.version).toBe(1);
    expect(manifest.schemaVersion).toBe(1);
    expect(manifest.builtAt).toBeDefined();

    const versionPath = join(outDir, 'version.json');
    expect(existsSync(versionPath)).toBe(true);
    const written = JSON.parse(readFileSync(versionPath, 'utf-8'));
    expect(written.version).toBe(manifest.version);
  });
});
