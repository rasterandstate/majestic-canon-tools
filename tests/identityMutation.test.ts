/**
 * Identity mutation tests: verify edition identity hashes change only when
 * identity-significant fields change. Uses computeEditionIdentityHash (v3).
 * Pure unit tests — no filesystem or canon.json.
 */
import { describe, it, expect } from 'vitest';
import { computeEditionIdentityHash } from '../src/editionIdentity.js';

const baseEdition = {
  movie: { tmdb_movie_id: 1 },
  release_year: 2022,
  publisher: 'criterion',
  packaging: { type: 'steelbook' },
  upc: '012345678905',
  edition_tags: ['director_cut'],
  discs: [
    {
      format: 'UHD',
      disc_count: 1,
      region: 'REGION_FREE',
    },
  ],
};

const regionMappings: Record<string, string> = {
  a: 'A',
  b: 'B',
  c: 'C',
  abc: 'ABC',
  'region free': 'ABC',
  region_free: 'ABC',
  unknown: 'UNKNOWN',
};

function expectSameHash(mutate: (e: typeof baseEdition) => Record<string, unknown>) {
  const baseHash = computeEditionIdentityHash(baseEdition, regionMappings);
  const mutated = mutate({ ...JSON.parse(JSON.stringify(baseEdition)) });
  const mutatedHash = computeEditionIdentityHash(mutated, regionMappings);
  expect(mutatedHash).toBe(baseHash);
}

function expectDifferentHash(mutate: (e: typeof baseEdition) => Record<string, unknown>) {
  const baseHash = computeEditionIdentityHash(baseEdition, regionMappings);
  const mutated = mutate({ ...JSON.parse(JSON.stringify(baseEdition)) });
  const mutatedHash = computeEditionIdentityHash(mutated, regionMappings);
  expect(mutatedHash).not.toBe(baseHash);
}

/** Shuffle object keys recursively. Arrays preserve order. */
function deepShuffleKeys<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => deepShuffleKeys(item)) as T;
  }
  const keys = Object.keys(obj as object);
  const shuffled = [...keys].sort(() => Math.random() - 0.5);
  const out: Record<string, unknown> = {};
  for (const k of shuffled) {
    out[k] = deepShuffleKeys((obj as Record<string, unknown>)[k]);
  }
  return out as T;
}

describe('identity mutation', () => {
  describe('hash MUST NOT change when', () => {
    it('packaging.notes changes', () => {
      expectSameHash((e) => ({
        ...e,
        packaging: { ...e.packaging, notes: 'Limited edition slipcover' },
      }));
    });

    it('notes added at edition level', () => {
      expectSameHash((e) => ({ ...e, notes: 'Great transfer' }));
    });

    it('UPC formatting changes (spaces/hyphens)', () => {
      expectSameHash((e) => ({ ...e, upc: '0 12345 67890 5' }));
      expectSameHash((e) => ({ ...e, upc: '0123-45678-905' }));
    });

    it('tag alias normalizes to canonical tag (e.g. "Director Cut")', () => {
      expectSameHash((e) => ({
        ...e,
        edition_tags: ["Director Cut"],
      }));
    });

    it('external_refs are added/modified', () => {
      expectSameHash((e) => ({
        ...e,
        external_refs: [
          { source: 'blu-ray.com', id: '12345', url: 'https://blu-ray.com/...' },
        ],
      }));
    });

    it('object key order differs', () => {
      const reordered = {
        discs: baseEdition.discs,
        edition_tags: baseEdition.edition_tags,
        movie: baseEdition.movie,
        packaging: baseEdition.packaging,
        publisher: baseEdition.publisher,
        release_year: baseEdition.release_year,
        upc: baseEdition.upc,
      };
      const baseHash = computeEditionIdentityHash(baseEdition, regionMappings);
      const reorderedHash = computeEditionIdentityHash(reordered, regionMappings);
      expect(reorderedHash).toBe(baseHash);
    });

    it('whitespace changes in string fields', () => {
      expectSameHash((e) => ({
        ...e,
        publisher: '  criterion  ',
      }));
    });
  });

  describe('hash MUST change when', () => {
    it('release_year changes', () => {
      expectDifferentHash((e) => ({ ...e, release_year: 2023 }));
    });

    it('publisher changes', () => {
      expectDifferentHash((e) => ({ ...e, publisher: 'warner_bros' }));
    });

    it('packaging.type changes', () => {
      expectDifferentHash((e) => ({
        ...e,
        packaging: { ...e.packaging, type: 'keepcase' },
      }));
    });

    it('upc changes to different digits', () => {
      expectDifferentHash((e) => ({ ...e, upc: '012345678906' }));
    });

    it('edition_tags changes to different canonical tag', () => {
      expectDifferentHash((e) => ({ ...e, edition_tags: ['theatrical'] }));
    });

    it('disc.region changes', () => {
      expectDifferentHash((e) => ({
        ...e,
        discs: [{ ...e.discs[0], region: 'A' }],
      }));
    });

    it('disc structure changes (e.g., add Blu-ray disc)', () => {
      expectDifferentHash((e) => ({
        ...e,
        discs: [
          e.discs[0],
          { format: 'BLURAY', disc_count: 1, region: 'A' },
        ],
      }));
    });

    it('disc_count changes', () => {
      expectDifferentHash((e) => ({
        ...e,
        discs: [{ ...e.discs[0], disc_count: 2 }],
      }));
    });

    it('disc order changes', () => {
      expectDifferentHash((e) => ({
        ...e,
        discs: [
          { format: 'BLURAY', disc_count: 1, region: 'A' },
          { format: 'UHD', disc_count: 1, region: 'REGION_FREE' },
        ],
      }));
    });

    it('movie.tmdb_movie_id changes', () => {
      expectDifferentHash((e) => ({
        ...e,
        movie: { tmdb_movie_id: 2 },
      }));
    });
  });

  describe('canonicalization order', () => {
    it('hash remains identical when keys are shuffled deeply', () => {
      const baseHash = computeEditionIdentityHash(baseEdition, regionMappings);
      for (let i = 0; i < 5; i++) {
        const shuffled = deepShuffleKeys(baseEdition);
        const shuffledHash = computeEditionIdentityHash(shuffled, regionMappings);
        expect(shuffledHash).toBe(baseHash);
      }
    });
  });
});
