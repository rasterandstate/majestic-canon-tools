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
