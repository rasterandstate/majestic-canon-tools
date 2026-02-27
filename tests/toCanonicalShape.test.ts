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
  it('persists movie.studios when present and non-empty', () => {
    const edition = {
      movie: { tmdb_movie_id: 393, studios: ['warner_bros_pictures', 'a24'] },
      release_year: 2008,
      publisher: 'lionsgate',
    };
    const out = toCanonicalShape(edition) as { movie?: { tmdb_movie_id?: number; studios?: string[] } };
    expect(out.movie?.studios).toEqual(['a24', 'warner_bros_pictures']);
  });

  it('omits movie.studios when empty', () => {
    const edition = {
      movie: { tmdb_movie_id: 393, studios: [] },
      release_year: 2008,
      publisher: 'lionsgate',
    };
    const out = toCanonicalShape(edition) as { movie?: { studios?: string[] } };
    expect(out.movie).not.toHaveProperty('studios');
  });

  it('omits movie.studios when not provided', () => {
    const edition = {
      movie: { tmdb_movie_id: 393 },
      release_year: 2008,
      publisher: 'lionsgate',
    };
    const out = toCanonicalShape(edition) as { movie?: { studios?: string[] } };
    expect(out.movie?.studios).toBeUndefined();
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
