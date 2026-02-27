/**
 * Per-edition identity hash per CANON_IDENTITY_SPEC.
 * Identity string: edition:v4:<sha256hex>
 *
 * v2: Region moved from edition to disc. Edition-level region removed.
 * v3: UPC participates in identity when present. Collector-correct SKU distinction.
 * v4: movies[] array (sorted by tmdb_movie_id). Discs may include optional movie_tmdb_id.
 *     Legacy "movie" transformed to 1-element movies array.
 *
 * NOTE: computeEditionIdentityHash produces v4. computeEditionIdentityHashV1/V2/V3
 * are legacy helpers for redirect map generation only — do not use for current identity.
 *
 * LEGACY_NORMALIZER_FREEZE:
 * v1/v2/v3 hashing relies on shared normalizeUpc, normalizeTag, canonicalStringify,
 * and region normalization. If you modify any of these, you will silently break
 * redirect generation — legacy hashes will no longer match identity_redirects.json.
 *
 * Before changing those functions, you MUST either:
 * 1. Snapshot legacy versions for v1/v2/v3 hashing, or
 * 2. Version the normalizers explicitly (e.g. normalizeUpcV1, normalizeUpcV4).
 *
 * The legacyIdentitySnapshot.test.ts fixture asserts v1/v2/v3 hashes never change.
 * If that test fails, you have rewritten history. Revert or snapshot.
 */
import { createHash } from 'crypto';
import { canonicalStringify } from './canonicalJson.js';
import { normalizeTag, normalizeUpc } from './normalize.js';

export type RegionMappings = Record<string, string>;

/** Derive movies array from edition. Accepts legacy "movie" or "movies". */
function ensureMoviesArray(edition: Record<string, unknown>): Array<{ tmdb_movie_id: number }> {
  const movies = edition.movies as Array<{ tmdb_movie_id?: number }> | undefined;
  if (Array.isArray(movies) && movies.length > 0) {
    return movies
      .filter((m) => m != null && typeof m.tmdb_movie_id === 'number')
      .map((m) => ({ tmdb_movie_id: m.tmdb_movie_id! }));
  }
  const movie = edition.movie as Record<string, unknown> | undefined;
  if (movie != null && typeof movie.tmdb_movie_id === 'number') {
    return [{ tmdb_movie_id: movie.tmdb_movie_id }];
  }
  return [];
}

/** Identity-significant edition shape. Excludes notes, external_refs, packaging.notes. */
function extractIdentityFields(
  edition: Record<string, unknown>,
  regionMappings: RegionMappings = {}
): Record<string, unknown> {
  const packaging = edition.packaging as Record<string, unknown> | undefined;
  const discs = Array.isArray(edition.discs) ? edition.discs : [];

  const moviesRaw = ensureMoviesArray(edition);
  const movies = moviesRaw.length > 0
    ? [...moviesRaw].sort((a, b) => a.tmdb_movie_id - b.tmdb_movie_id).map((m) => ({ tmdb_movie_id: m.tmdb_movie_id }))
    : [];

  const identityDiscs = discs.map((d: unknown) => {
    const disc = d as Record<string, unknown>;
    const base: Record<string, unknown> = {
      disc_count: disc.disc_count ?? 1,
      format: (disc.format ?? 'OTHER').toString().toUpperCase(),
    };
    const rawDiscRegion = String(disc.region ?? '').trim().toLowerCase();
    if (rawDiscRegion) {
      const discRegion = regionMappings[rawDiscRegion] ?? rawDiscRegion.toUpperCase();
      base.region = discRegion.toUpperCase() || 'FREE';
    }
    const movieTmdbId = disc.movie_tmdb_id;
    if (typeof movieTmdbId === 'number' && movieTmdbId > 0) base.movie_tmdb_id = movieTmdbId;
    return base;
  });

  const tags = Array.isArray(edition.edition_tags)
    ? edition.edition_tags.map((t) => normalizeTag(t)).filter(Boolean).sort()
    : [];
  const upc = normalizeUpc(edition.upc);

  const out: Record<string, unknown> = {
    discs: identityDiscs,
    edition_tags: tags,
    movies,
    packaging: packaging ? { type: (packaging.type ?? 'other').toString().toLowerCase() } : undefined,
    publisher: String(edition.publisher ?? '').trim(),
    release_year: edition.release_year,
  };
  if (upc) out.upc = upc;
  return out;
}

/**
 * Compute edition identity hash per CANON_IDENTITY_SPEC.
 * @param edition - Canon edition object (accepts legacy "movie" or "movies")
 * @param regionMappings - Optional region mappings from regions.json (mappings key)
 * @returns Identity string: edition:v4:<sha256hex>
 */
export function computeEditionIdentityHash(
  edition: unknown,
  regionMappings: RegionMappings = {}
): string {
  if (edition == null || typeof edition !== 'object') {
    throw new Error('Edition must be a non-null object');
  }
  const identityObj = extractIdentityFields(edition as Record<string, unknown>, regionMappings);
  const canonical = canonicalStringify(identityObj);
  const hash = createHash('sha256').update(canonical, 'utf-8').digest('hex');
  return `edition:v4:${hash}`;
}

/** v3 identity fields (movie, UPC). Used for redirect map generation. v4 uses movies[]. */
function extractIdentityFieldsV3(
  edition: Record<string, unknown>,
  regionMappings: RegionMappings = {}
): Record<string, unknown> {
  const moviesRaw = ensureMoviesArray(edition);
  const movie = moviesRaw.length > 0
    ? { tmdb_movie_id: moviesRaw[0].tmdb_movie_id }
    : (edition.movie as Record<string, unknown> | undefined);
  const packaging = edition.packaging as Record<string, unknown> | undefined;
  const discs = Array.isArray(edition.discs) ? edition.discs : [];

  const identityDiscs = discs.map((d: unknown) => {
    const disc = d as Record<string, unknown>;
    const base: Record<string, unknown> = {
      disc_count: disc.disc_count ?? 1,
      format: (disc.format ?? 'OTHER').toString().toUpperCase(),
    };
    const rawDiscRegion = String(disc.region ?? '').trim().toLowerCase();
    if (rawDiscRegion) {
      const discRegion = regionMappings[rawDiscRegion] ?? rawDiscRegion.toUpperCase();
      base.region = discRegion.toUpperCase() || 'FREE';
    }
    return base;
  });

  const tags = Array.isArray(edition.edition_tags)
    ? edition.edition_tags.map((t) => normalizeTag(t)).filter(Boolean).sort()
    : [];
  const upc = normalizeUpc(edition.upc);

  const out: Record<string, unknown> = {
    discs: identityDiscs,
    edition_tags: tags,
    movie: movie ? { tmdb_movie_id: movie.tmdb_movie_id } : undefined,
    packaging: packaging ? { type: (packaging.type ?? 'other').toString().toLowerCase() } : undefined,
    publisher: String(edition.publisher ?? '').trim(),
    release_year: edition.release_year,
  };
  if (upc) out.upc = upc;
  return out;
}

/** Legacy: produces edition:v3:xxx for redirect map generation. Do not use for current identity. */
export function computeEditionIdentityHashV3(
  edition: unknown,
  regionMappings: RegionMappings = {}
): string {
  if (edition == null || typeof edition !== 'object') {
    throw new Error('Edition must be a non-null object');
  }
  const identityObj = extractIdentityFieldsV3(edition as Record<string, unknown>, regionMappings);
  const canonical = canonicalStringify(identityObj);
  const hash = createHash('sha256').update(canonical, 'utf-8').digest('hex');
  return `edition:v3:${hash}`;
}

/** v2 identity fields (no UPC, no edition.region). Used for redirect map generation. */
function extractIdentityFieldsV2(
  edition: Record<string, unknown>,
  regionMappings: RegionMappings = {}
): Record<string, unknown> {
  const movie = edition.movie as Record<string, unknown> | undefined;
  const packaging = edition.packaging as Record<string, unknown> | undefined;
  const discs = Array.isArray(edition.discs) ? edition.discs : [];

  const identityDiscs = discs.map((d: unknown) => {
    const disc = d as Record<string, unknown>;
    const base = {
      disc_count: disc.disc_count ?? 1,
      format: (disc.format ?? 'OTHER').toString().toUpperCase(),
    };
    const rawDiscRegion = String(disc.region ?? '').trim().toLowerCase();
    if (rawDiscRegion) {
      const discRegion = regionMappings[rawDiscRegion] ?? rawDiscRegion.toUpperCase();
      return { ...base, region: discRegion.toUpperCase() || 'FREE' };
    }
    return base;
  });

  const tags = Array.isArray(edition.edition_tags)
    ? edition.edition_tags.map((t) => normalizeTag(t)).filter(Boolean).sort()
    : [];
  return {
    discs: identityDiscs,
    edition_tags: tags,
    movie: movie ? { tmdb_movie_id: movie.tmdb_movie_id } : undefined,
    packaging: packaging ? { type: (packaging.type ?? 'other').toString().toLowerCase() } : undefined,
    publisher: String(edition.publisher ?? '').trim(),
    release_year: edition.release_year,
  };
}

/** Legacy: produces edition:v2:xxx for redirect map generation. Do not use for current identity. */
export function computeEditionIdentityHashV2(
  edition: unknown,
  regionMappings: RegionMappings = {}
): string {
  if (edition == null || typeof edition !== 'object') {
    throw new Error('Edition must be a non-null object');
  }
  const identityObj = extractIdentityFieldsV2(edition as Record<string, unknown>, regionMappings);
  const canonical = canonicalStringify(identityObj);
  const hash = createHash('sha256').update(canonical, 'utf-8').digest('hex');
  return `edition:v2:${hash}`;
}

/** v1 identity fields (edition.region included). Used only for redirect map generation. */
function extractIdentityFieldsV1(
  edition: Record<string, unknown>,
  regionMappings: RegionMappings = {}
): Record<string, unknown> {
  const movie = edition.movie as Record<string, unknown> | undefined;
  const packaging = edition.packaging as Record<string, unknown> | undefined;
  const discs = Array.isArray(edition.discs) ? edition.discs : [];

  const rawRegion = String(edition.region ?? '').trim().toLowerCase();
  const region = regionMappings[rawRegion] ?? (edition.region as string) ?? '';
  const regionVal = region.toUpperCase() || 'NONE';

  const identityDiscs = discs.map((d: unknown) => {
    const disc = d as Record<string, unknown>;
    return {
      disc_count: disc.disc_count ?? 1,
      format: (disc.format ?? 'OTHER').toString().toUpperCase(),
    };
  });

  return {
    discs: identityDiscs,
    edition_tags: Array.isArray(edition.edition_tags)
      ? [...(edition.edition_tags as unknown[])].sort()
      : [],
    movie: movie ? { tmdb_movie_id: movie.tmdb_movie_id } : undefined,
    packaging: packaging ? { type: (packaging.type ?? 'other').toString().toLowerCase() } : undefined,
    publisher: String(edition.publisher ?? '').trim(),
    region: regionVal,
    release_year: edition.release_year,
  };
}

/** Legacy: produces edition:v1:xxx for redirect map generation. Do not use for current identity. */
export function computeEditionIdentityHashV1(
  edition: unknown,
  regionMappings: RegionMappings = {}
): string {
  if (edition == null || typeof edition !== 'object') {
    throw new Error('Edition must be a non-null object');
  }
  const identityObj = extractIdentityFieldsV1(edition as Record<string, unknown>, regionMappings);
  const canonical = canonicalStringify(identityObj);
  const hash = createHash('sha256').update(canonical, 'utf-8').digest('hex');
  return `edition:v1:${hash}`;
}
