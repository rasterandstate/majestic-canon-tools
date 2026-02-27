/**
 * Multi-movie edition tests: identity hash, canonical shape, backward compatibility.
 */
import { describe, it, expect } from 'vitest';
import { computeEditionIdentityHash } from '../src/editionIdentity.js';
import { toCanonicalShape } from '../src/toCanonicalShape.js';

const regionMappings: Record<string, string> = {};

describe('multi-movie edition', () => {
  describe('toCanonicalShape', () => {
    it('transforms legacy movie to movies (1-element array)', () => {
      const edition = {
        movie: { tmdb_movie_id: 123 },
        release_year: 2024,
        publisher: 'warner_bros',
      };
      const out = toCanonicalShape(edition) as { movies?: Array<{ tmdb_movie_id: number }> };
      expect(out.movies).toEqual([{ tmdb_movie_id: 123 }]);
      expect(out).not.toHaveProperty('movie');
    });

    it('sorts movies by tmdb_movie_id', () => {
      const edition = {
        movies: [{ tmdb_movie_id: 8873 }, { tmdb_movie_id: 8872 }],
        release_year: 1993,
        publisher: 'paramount',
        discs: [{ slot: 1, format: 'BLURAY', disc_count: 1 }],
      };
      const out = toCanonicalShape(edition) as { movies?: Array<{ tmdb_movie_id: number }> };
      expect(out.movies).toEqual([{ tmdb_movie_id: 8872 }, { tmdb_movie_id: 8873 }]);
    });

    it('persists disc.movie_tmdb_id when present', () => {
      const edition = {
        movies: [{ tmdb_movie_id: 8872 }, { tmdb_movie_id: 8873 }],
        release_year: 1993,
        publisher: 'paramount',
        discs: [
          { slot: 1, format: 'BLURAY', disc_count: 1, movie_tmdb_id: 8872 },
          { slot: 2, format: 'BLURAY', disc_count: 1, movie_tmdb_id: 8873 },
        ],
      };
      const out = toCanonicalShape(edition) as { discs?: Array<{ movie_tmdb_id?: number }> };
      expect(out.discs?.[0]?.movie_tmdb_id).toBe(8872);
      expect(out.discs?.[1]?.movie_tmdb_id).toBe(8873);
    });
  });

  describe('identity hash', () => {
    it('single-movie edition (backward compatibility)', () => {
      const edition = {
        movie: { tmdb_movie_id: 490 },
        release_year: 2009,
        publisher: 'criterion',
        packaging: { type: 'keepcase' },
        discs: [{ format: 'BLURAY', disc_count: 1, region: 'A' }],
      };
      const hash = computeEditionIdentityHash(edition, regionMappings);
      expect(hash).toMatch(/^edition:v4:[a-f0-9]{64}$/);
    });

    it('two-movie combo (2 discs)', () => {
      const edition = {
        movies: [{ tmdb_movie_id: 8872 }, { tmdb_movie_id: 8873 }],
        release_year: 1993,
        publisher: 'paramount',
        packaging: { type: 'keepcase' },
        discs: [
          { slot: 1, format: 'BLURAY', disc_count: 1, movie_tmdb_id: 8872 },
          { slot: 2, format: 'BLURAY', disc_count: 1, movie_tmdb_id: 8873 },
        ],
      };
      const hash = computeEditionIdentityHash(edition, regionMappings);
      expect(hash).toMatch(/^edition:v4:[a-f0-9]{64}$/);
    });

    it('two-movie combo (1 disc containing both)', () => {
      const edition = {
        movies: [{ tmdb_movie_id: 8872 }, { tmdb_movie_id: 8873 }],
        release_year: 1993,
        publisher: 'paramount',
        packaging: { type: 'keepcase' },
        discs: [{ slot: 1, format: 'BLURAY', disc_count: 1 }],
      };
      const hash = computeEditionIdentityHash(edition, regionMappings);
      expect(hash).toMatch(/^edition:v4:[a-f0-9]{64}$/);
    });

    it('box set (3+ movies, 3+ discs)', () => {
      const edition = {
        movies: [{ tmdb_movie_id: 78 }, { tmdb_movie_id: 120 }, { tmdb_movie_id: 346 }],
        release_year: 2020,
        publisher: 'warner_bros',
        packaging: { type: 'boxset' },
        discs: [
          { slot: 1, format: 'BLURAY', disc_count: 1, movie_tmdb_id: 78 },
          { slot: 2, format: 'BLURAY', disc_count: 1, movie_tmdb_id: 120 },
          { slot: 3, format: 'BLURAY', disc_count: 1, movie_tmdb_id: 346 },
        ],
      };
      const hash = computeEditionIdentityHash(edition, regionMappings);
      expect(hash).toMatch(/^edition:v4:[a-f0-9]{64}$/);
    });

    it('canonical ordering invariance: movie order does not change hash', () => {
      const base = {
        movies: [{ tmdb_movie_id: 8872 }, { tmdb_movie_id: 8873 }],
        release_year: 1993,
        publisher: 'paramount',
        packaging: { type: 'keepcase' },
        discs: [{ slot: 1, format: 'BLURAY', disc_count: 1 }],
      };
      const reversed = {
        ...base,
        movies: [{ tmdb_movie_id: 8873 }, { tmdb_movie_id: 8872 }],
      };
      const hash1 = computeEditionIdentityHash(base, regionMappings);
      const hash2 = computeEditionIdentityHash(reversed, regionMappings);
      expect(hash1).toBe(hash2);
    });

    it('different movies produce different hash', () => {
      const single = {
        movie: { tmdb_movie_id: 1 },
        release_year: 2022,
        publisher: 'criterion',
        packaging: { type: 'keepcase' },
        discs: [{ format: 'BLURAY', disc_count: 1 }],
      };
      const multi = {
        movies: [{ tmdb_movie_id: 1 }, { tmdb_movie_id: 2 }],
        release_year: 2022,
        publisher: 'criterion',
        packaging: { type: 'keepcase' },
        discs: [{ format: 'BLURAY', disc_count: 1 }],
      };
      const hashSingle = computeEditionIdentityHash(single, regionMappings);
      const hashMulti = computeEditionIdentityHash(multi, regionMappings);
      expect(hashSingle).not.toBe(hashMulti);
    });
  });
});
