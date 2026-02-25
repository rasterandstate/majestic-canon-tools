import { describe, it, expect } from 'vitest';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';
import { toCanonicalShape } from '../src/toCanonicalShape.js';
import { computeEditionIdentityHash } from '../src/editionIdentity.js';

function migrateEdition(edition: Record<string, unknown>): { changed: boolean; result: Record<string, unknown> } {
  const region = edition.region;
  if (region == null || String(region).trim() === '') {
    return { changed: false, result: edition };
  }

  const regionStr = String(region).trim();
  const discs = Array.isArray(edition.discs) ? edition.discs : [];
  if (discs.length === 0) {
    const out = { ...edition };
    delete out.region;
    return { changed: true, result: out };
  }

  let changed = false;
  const newDiscs = discs.map((d: unknown) => {
    const disc = d as Record<string, unknown>;
    const hasRegion = disc.region != null && String(disc.region).trim() !== '';
    if (!hasRegion) {
      changed = true;
      return { ...disc, region: regionStr };
    }
    return disc;
  });

  const out = { ...edition, discs: newDiscs };
  delete out.region;
  return { changed: true, result: out };
}

describe('migrate edition.region to disc.region', () => {
  it('copies edition.region to discs without region', () => {
    const edition = {
      movie: { tmdb_movie_id: 490 },
      release_year: 2009,
      region: 'A',
      publisher: 'criterion',
      packaging: { type: 'keepcase' },
      discs: [{ format: 'BLURAY', disc_count: 1 }],
    };
    const { changed, result } = migrateEdition(edition);
    expect(changed).toBe(true);
    expect((result as { region?: string }).region).toBeUndefined();
    expect((result.discs as { region: string }[])[0].region).toBe('A');
  });

  it('does not overwrite existing disc.region', () => {
    const edition = {
      movie: { tmdb_movie_id: 1 },
      release_year: 2020,
      region: 'A',
      publisher: 'test',
      packaging: { type: 'keepcase' },
      discs: [
        { format: 'BLURAY', disc_count: 1, region: 'B' },
        { format: 'DVD', disc_count: 1 },
      ],
    };
    const { changed, result } = migrateEdition(edition);
    expect(changed).toBe(true);
    expect((result.discs as { region?: string }[])[0].region).toBe('B');
    expect((result.discs as { region?: string }[])[1].region).toBe('A');
  });

  it('is idempotent when no edition.region', () => {
    const edition = {
      movie: { tmdb_movie_id: 1 },
      release_year: 2020,
      publisher: 'test',
      packaging: { type: 'keepcase' },
      discs: [{ format: 'BLURAY', disc_count: 1, region: 'A' }],
    };
    const { changed, result } = migrateEdition(edition);
    expect(changed).toBe(false);
    expect(result).toEqual(edition);
  });

  it('identity hash excludes edition.region after migration', () => {
    const mappings = { a: 'A', b: 'B' };
    const withEditionRegion = {
      movie: { tmdb_movie_id: 490 },
      release_year: 2009,
      region: 'A',
      publisher: 'criterion',
      packaging: { type: 'keepcase' },
      discs: [{ format: 'BLURAY', disc_count: 1 }],
    };
    const migrated = migrateEdition(withEditionRegion).result;
    const canonical = toCanonicalShape(migrated);
    const hash1 = computeEditionIdentityHash(canonical, mappings);

    const withDiscRegion = {
      movie: { tmdb_movie_id: 490 },
      release_year: 2009,
      publisher: 'criterion',
      packaging: { type: 'keepcase' },
      discs: [{ format: 'BLURAY', disc_count: 1, region: 'A' }],
    };
    const canonical2 = toCanonicalShape(withDiscRegion);
    const hash2 = computeEditionIdentityHash(canonical2, mappings);

    expect(hash1).toBe(hash2);
    expect(hash1).toMatch(/^edition:v3:/);
  });

  it('UPC normalization produces same identity for equivalent inputs', () => {
    const mappings = { a: 'A' };
    const a = {
      movie: { tmdb_movie_id: 1 },
      release_year: 2020,
      publisher: 'test',
      packaging: { type: 'keepcase' },
      discs: [{ format: 'BLURAY', disc_count: 1 }],
      upc: '0 12345 67890 5',
    };
    const b = {
      ...a,
      upc: '012345678905',
    };
    const hashA = computeEditionIdentityHash(toCanonicalShape(a), mappings);
    const hashB = computeEditionIdentityHash(toCanonicalShape(b), mappings);
    expect(hashA).toBe(hashB);
  });

  it('tag normalization produces same identity for equivalent inputs', () => {
    const mappings = {};
    const a = {
      movie: { tmdb_movie_id: 1 },
      release_year: 2020,
      publisher: 'test',
      packaging: { type: 'keepcase' },
      discs: [{ format: 'BLURAY', disc_count: 1 }],
      edition_tags: ['Director Cut', '4K'],
    };
    const b = {
      ...a,
      edition_tags: ['director_cut', '4k'],
    };
    const hashA = computeEditionIdentityHash(toCanonicalShape(a), mappings);
    const hashB = computeEditionIdentityHash(toCanonicalShape(b), mappings);
    expect(hashA).toBe(hashB);
  });
});
