import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { buildCanonPayload, hashCanonPayload, normalizeEdition } from '../src/buildCanonPayload.js';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const CANON_PATH = join(ROOT, '..', 'majestic-canon');
const FIXTURE_PATH = join(ROOT, 'tests', 'fixtures', 'expectedCanon.json');

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

  it('golden snapshot: payload bytes match expectedCanon.json exactly', () => {
    const { json } = buildCanonPayload({ canonPath: CANON_PATH });
    const expected = readFileSync(FIXTURE_PATH, 'utf-8');
    expect(json).toBe(expected);
  });

  it('normalizeEdition sorts external_refs by source then id', () => {
    const e1 = {
      movie: { tmdb_movie_id: 1 },
      release_year: 2024,
      region: 'A',
      publisher: 'criterion',
      packaging: { type: 'steelbook' },
      discs: [{ format: 'UHD', disc_count: 1 }],
      external_refs: [
        { source: 'blu-ray.com', id: '390212', url: 'https://...' },
        { source: 'imdb', id: 'tt123', url: 'https://...' },
      ],
    };
    const normalized = normalizeEdition(e1) as { external_refs: Array<{ source: string; id: string }> };
    const sortedCopy = [
      { source: 'blu-ray.com', id: '390212', url: 'https://...' },
      { source: 'imdb', id: 'tt123', url: 'https://...' },
    ];
    expect(normalized.external_refs).toEqual(sortedCopy);
  });

  it('normalizeEdition sorts external_refs by id when source matches', () => {
    const e = {
      external_refs: [
        { source: 'blu-ray.com', id: '390238', url: 'https://...' },
        { source: 'blu-ray.com', id: '390212', url: 'https://...' },
      ],
    };
    const normalized = normalizeEdition(e) as { external_refs: Array<{ source: string; id: string }> };
    expect(normalized.external_refs[0].id).toBe('390212');
    expect(normalized.external_refs[1].id).toBe('390238');
  });

  it('golden snapshot: Buffer equality (no encoding/platform drift)', () => {
    const { json } = buildCanonPayload({ canonPath: CANON_PATH });
    const actualBuf = Buffer.from(json, 'utf-8');
    const expectedBuf = readFileSync(FIXTURE_PATH);
    expect(actualBuf.equals(expectedBuf)).toBe(true);
  });
});
