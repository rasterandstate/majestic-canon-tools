import { describe, it, expect } from 'vitest';
import { toCanonicalShape } from '../src/toCanonicalShape.js';

describe('toCanonicalShape barcode.gs1', () => {
  it('persists prefix, verified, gs1_status only (no company_name, brand_name, confidence)', () => {
    const edition = {
      movie: { tmdb_movie_id: 123 },
      release_year: 2024,
      publisher: 'warner_bros',
      upc: '0883929594382',
      barcode: {
        upc: '0883929594382',
        gs1: {
          prefix: '0883929',
          verified: true,
          gs1_status: 'inactive',
          company_name: 'Warner Home Video, Inc.',
          brand_name: 'Warner Home Video',
          confidence: 'verified',
        },
      },
    };
    const out = toCanonicalShape(edition) as { barcode?: { gs1?: Record<string, unknown> } };
    expect(out.barcode?.gs1).toEqual({
      prefix: '0883929',
      verified: true,
      gs1_status: 'inactive',
    });
    expect(out.barcode?.gs1).not.toHaveProperty('company_name');
    expect(out.barcode?.gs1).not.toHaveProperty('brand_name');
    expect(out.barcode?.gs1).not.toHaveProperty('confidence');
  });

  it('persists gs1_status active when present', () => {
    const edition = {
      movie: { tmdb_movie_id: 1 },
      upc: '0715515123456',
      barcode: {
        gs1: { prefix: '0715515', verified: true, gs1_status: 'active' },
      },
    };
    const out = toCanonicalShape(edition) as { barcode?: { gs1?: Record<string, unknown> } };
    expect(out.barcode?.gs1?.gs1_status).toBe('active');
  });
});

describe('toCanonicalShape movie.studios', () => {
  it('persists movie.studios when present and non-empty (via movies array)', () => {
    const edition = {
      movie: { tmdb_movie_id: 393, studios: ['warner_bros_pictures', 'a24'] },
      release_year: 2008,
      publisher: 'lionsgate',
    };
    const out = toCanonicalShape(edition) as { movies?: Array<{ tmdb_movie_id?: number; studios?: string[] }> };
    expect(out.movies?.[0]?.studios).toEqual(['a24', 'warner_bros_pictures']);
  });

  it('omits movie.studios when empty', () => {
    const edition = {
      movie: { tmdb_movie_id: 393, studios: [] },
      release_year: 2008,
      publisher: 'lionsgate',
    };
    const out = toCanonicalShape(edition) as { movies?: Array<{ studios?: string[] }> };
    expect(out.movies?.[0]).not.toHaveProperty('studios');
  });

  it('omits movie.studios when not provided', () => {
    const edition = {
      movie: { tmdb_movie_id: 393 },
      release_year: 2008,
      publisher: 'lionsgate',
    };
    const out = toCanonicalShape(edition) as { movies?: Array<{ studios?: string[] }> };
    expect(out.movies?.[0]?.studios).toBeUndefined();
  });
});

describe('toCanonicalShape disc.variant', () => {
  it('persists variant when present', () => {
    const edition = {
      movie: { tmdb_movie_id: 1 },
      release_year: 2024,
      publisher: 'warner',
      discs: [
        {
          slot: 1,
          format: 'BLURAY',
          role: 'feature',
          disc_count: 1,
          variant: { video_type: '3D', content_scope: 'mixed', duplicate_of_disc: null, notes: '3D theatrical' },
        },
      ],
    };
    const out = toCanonicalShape(edition) as { discs?: Array<{ variant?: Record<string, unknown> }> };
    expect(out.discs?.[0]?.variant).toEqual({
      video_type: '3D',
      content_scope: 'mixed',
      duplicate_of_disc: null,
      notes: '3D theatrical',
    });
  });

  it('omits variant when empty', () => {
    const edition = {
      movie: { tmdb_movie_id: 1 },
      discs: [{ slot: 1, format: 'BLURAY', role: 'feature', disc_count: 1 }],
    };
    const out = toCanonicalShape(edition) as { discs?: Array<{ variant?: unknown }> };
    expect(out.discs?.[0]?.variant).toBeUndefined();
  });
});

describe('toCanonicalShape disc_identity (disc-fingerprinting)', () => {
  it('persists disc_identity when structural_hash, cas_hash, generated_at present', () => {
    const edition = {
      movie: { tmdb_movie_id: 240832 },
      release_year: 2015,
      publisher: 'universal',
      discs: [
        {
          slot: 1,
          format: 'BLURAY',
          role: 'feature',
          disc_count: 1,
          disc_identity: {
            type: 'majestic.optical-disc.bluray',
            structural_hash: 'feb45fdfc88b70f36c42563a5b2009eebf04fa7e852eb6d3e9c0143a26bcbec8',
            cas_hash: '63cab9a36c6743def308088569569bf0233da4e90e4680f09efc17ede573c74c',
            hash_algorithm: 'sha256',
            version: 1,
            generated_at: '2026-02-27T21:53:40.691Z',
            fingerprinted_at: '2026-02-27T21:53:40.691Z',
          },
        },
      ],
    };
    const out = toCanonicalShape(edition) as {
      discs?: Array<{ disc_identity?: Record<string, unknown> }>;
    };
    expect(out.discs?.[0]?.disc_identity).toEqual({
      type: 'majestic.optical-disc.bluray',
      structural_hash: 'feb45fdfc88b70f36c42563a5b2009eebf04fa7e852eb6d3e9c0143a26bcbec8',
      cas_hash: '63cab9a36c6743def308088569569bf0233da4e90e4680f09efc17ede573c74c',
      hash_algorithm: 'sha256',
      version: 1,
      generated_at: '2026-02-27T21:53:40.691Z',
      fingerprinted_at: '2026-02-27T21:53:40.691Z',
    });
  });

  it('accepts casie_hash as alias for cas_hash', () => {
    const edition = {
      movie: { tmdb_movie_id: 1 },
      discs: [
        {
          slot: 1,
          format: 'DVD',
          role: 'feature',
          disc_count: 1,
          disc_identity: {
            structural_hash: 'abc123',
            casie_hash: 'def456',
            hash_algorithm: 'sha256',
            generated_at: '2026-01-01T00:00:00.000Z',
          },
        },
      ],
    };
    const out = toCanonicalShape(edition) as {
      discs?: Array<{ disc_identity?: { cas_hash: string } }>;
    };
    expect(out.discs?.[0]?.disc_identity?.cas_hash).toBe('def456');
  });

  it('omits disc_identity when required fields missing', () => {
    const edition = {
      movie: { tmdb_movie_id: 1 },
      discs: [
        {
          slot: 1,
          format: 'BLURAY',
          role: 'feature',
          disc_count: 1,
          disc_identity: {
            structural_hash: 'abc123',
            // missing cas_hash and generated_at
          },
        },
      ],
    };
    const out = toCanonicalShape(edition) as {
      discs?: Array<{ disc_identity?: unknown }>;
    };
    expect(out.discs?.[0]?.disc_identity).toBeUndefined();
  });
});

describe('toCanonicalShape fingerprint_history (disc-fingerprinting)', () => {
  it('persists fingerprint_history when valid entries present', () => {
    const edition = {
      movie: { tmdb_movie_id: 1 },
      discs: [
        {
          slot: 1,
          format: 'BLURAY',
          role: 'feature',
          disc_count: 1,
          disc_identity: {
            structural_hash: 'new_hash',
            cas_hash: 'new_cas',
            hash_algorithm: 'sha256',
            generated_at: '2026-03-01T00:00:00.000Z',
          },
          fingerprint_history: [
            {
              structural_hash: 'old_hash',
              cas_hash: 'old_cas',
              hash_algorithm: 'sha256',
              fingerprinted_at: '2026-02-01T00:00:00.000Z',
              reason: 'overwrite',
            },
          ],
        },
      ],
    };
    const out = toCanonicalShape(edition) as {
      discs?: Array<{ fingerprint_history?: Array<Record<string, unknown>> }>;
    };
    expect(out.discs?.[0]?.fingerprint_history).toHaveLength(1);
    expect(out.discs?.[0]?.fingerprint_history?.[0]).toMatchObject({
      structural_hash: 'old_hash',
      cas_hash: 'old_cas',
      hash_algorithm: 'sha256',
      fingerprinted_at: '2026-02-01T00:00:00.000Z',
      reason: 'overwrite',
    });
  });

  it('accepts generated_at as alias for fingerprinted_at in history', () => {
    const edition = {
      movie: { tmdb_movie_id: 1 },
      discs: [
        {
          slot: 1,
          format: 'BLURAY',
          role: 'feature',
          disc_count: 1,
          fingerprint_history: [
            {
              structural_hash: 'h',
              cas_hash: 'c',
              generated_at: '2026-01-01T00:00:00.000Z',
              reason: 'algorithm_upgrade',
            },
          ],
        },
      ],
    };
    const out = toCanonicalShape(edition) as {
      discs?: Array<{ fingerprint_history?: Array<{ fingerprinted_at: string }> }>;
    };
    expect(out.discs?.[0]?.fingerprint_history?.[0]?.fingerprinted_at).toBe(
      '2026-01-01T00:00:00.000Z'
    );
  });
});
