import { describe, it, expect } from 'vitest';
import { buildCanonPayload, hashCanonPayload } from '../src/buildCanonPayload.js';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const CANON_PATH = join(ROOT, '..', 'majestic-canon');

describe('canon payload determinism', () => {
  it('produces identical JSON across multiple builds', () => {
    const { json: json1 } = buildCanonPayload({ canonPath: CANON_PATH });
    const { json: json2 } = buildCanonPayload({ canonPath: CANON_PATH });
    expect(json1).toBe(json2);
  });

  it('produces identical hash across multiple builds', () => {
    const { json } = buildCanonPayload({ canonPath: CANON_PATH });
    const hash1 = hashCanonPayload(json);
    const { json: json2 } = buildCanonPayload({ canonPath: CANON_PATH });
    const hash2 = hashCanonPayload(json2);
    expect(hash1).toBe(hash2);
  });

  it('payload has required shape (publishers, regions, editions)', () => {
    const { payload } = buildCanonPayload({ canonPath: CANON_PATH });
    expect(payload).toHaveProperty('publishers');
    expect(payload).toHaveProperty('regions');
    expect(payload).toHaveProperty('editions');
    expect(payload).toHaveProperty('schema_version');
    expect(payload).toHaveProperty('identity_version');
    expect(Array.isArray(payload.publishers)).toBe(true);
    expect(Array.isArray(payload.editions)).toBe(true);
    expect(payload.regions).toHaveProperty('canonical');
    expect(payload.regions).toHaveProperty('mappings');
  });
});
