/**
 * Canon movie identity. Deterministic, versioned.
 * Identity string: movie:v1:<sha256hex>
 *
 * TMDB is an external reference, not identity. This module produces our canonical
 * movie ID from external refs so URLs and APIs use our namespace, not theirs.
 *
 * v1: Single canonical ref. Input: tmdb_movie_id. Hash of normalized payload.
 *     Same TMDB ID always produces same movieId. External sources can change
 *     without breaking our URL structure.
 */
import { createHash } from 'crypto';

const PREFIX = 'movie:v1:';

/** Canonical payload for hashing. Versioned so we can evolve. */
function identityPayload(tmdbId: number): string {
  return JSON.stringify({ tmdb_movie_id: tmdbId });
}

/**
 * Compute canonical movie identity from TMDB ID.
 * Deterministic: same tmdbId always produces same movieId.
 *
 * @param tmdbId - TMDB movie ID (external reference)
 * @returns Canon identity string, e.g. movie:v1:a1b2c3d4...
 */
export function computeMovieIdentity(tmdbId: number): string {
  if (!Number.isFinite(tmdbId) || tmdbId < 1) {
    throw new Error('tmdbId must be a positive integer');
  }
  const payload = identityPayload(tmdbId);
  const hash = createHash('sha256').update(payload, 'utf-8').digest('hex');
  return `${PREFIX}${hash}`;
}

/**
 * Check if a string is a valid movie identity format.
 */
export function isMovieIdentity(id: string): boolean {
  return typeof id === 'string' && id.startsWith(PREFIX) && id.length === PREFIX.length + 64;
}
