/**
 * Legacy identity snapshot test.
 *
 * If this test fails, you have accidentally rewritten history.
 *
 * Do NOT change the expected hash. Do NOT "fix" this test by updating the hash.
 * If it fails, you changed normalizeUpc, normalizeTag, canonicalStringify,
 * region normalization, or extractIdentityFieldsV1/V2/V3. Revert the change
 * or snapshot legacy normalizers for v1/v2/v3 hashing.
 *
 * See CANON_IDENTITY_SPEC.md and editionIdentity.ts: LEGACY_NORMALIZER_FREEZE.
 */
import { describe, it, expect } from 'vitest';
import {
  computeEditionIdentityHashV1,
  computeEditionIdentityHashV2,
  computeEditionIdentityHashV3,
} from '../src/editionIdentity.js';

function regionMappings(): Record<string, string> {
  return {
    a: 'A',
    b: 'B',
    c: 'C',
    abc: 'ABC',
    'region free': 'ABC',
    'region_free': 'ABC',
  };
}

const SNAPSHOT_EDITION = {
  movie: { tmdb_movie_id: 550 },
  release_year: 1999,
  publisher: 'warner_bros',
  packaging: { type: 'keepcase' },
  upc: '012345678905',
  edition_tags: ['theatrical'],
  discs: [{ format: 'BLURAY', disc_count: 1, region: 'A' }],
};

describe('legacy identity snapshot (never change expected hashes)', () => {
  it('v3 hash is stable — changing normalizeUpc/normalizeTag/canonicalStringify would break redirects', () => {
    const mappings = regionMappings();
    const computed = computeEditionIdentityHashV3(SNAPSHOT_EDITION, mappings);
    const expected = 'edition:v3:dcda8475935cc1a53749a3d181e5135b2f4f52622f294ce9a89f304258be35a8';
    expect(computed).toBe(expected);
  });

  it('v2 hash is stable — same guardrail for v2 redirects', () => {
    const mappings = regionMappings();
    const computed = computeEditionIdentityHashV2(SNAPSHOT_EDITION, mappings);
    const expected = 'edition:v2:ffa2951e8174a4f111635f5c03c6b47d69b2f87462251d7dbb8136b1d4703c6b';
    expect(computed).toBe(expected);
  });

  it('v1 hash is stable (edition with region — v1 used edition.region)', () => {
    const v1Edition = { ...SNAPSHOT_EDITION, region: 'A' };
    const mappings = regionMappings();
    const computed = computeEditionIdentityHashV1(v1Edition, mappings);
    const expected = 'edition:v1:f7382564745dc1cee40138cedd935c030150fd6d86258e5feafe8f4856888f43';
    expect(computed).toBe(expected);
  });
});
