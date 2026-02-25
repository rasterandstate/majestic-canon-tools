/**
 * Per-edition identity hash per CANON_IDENTITY_SPEC.
 * Identity string: edition:v3:<sha256hex>
 *
 * v2: Region moved from edition to disc. Edition-level region removed.
 * v3: UPC participates in identity when present. Collector-correct SKU distinction.
 * Single source of truth for edition identity. Backstage and other consumers must use this.
 */
import { createHash } from 'crypto';
import { canonicalStringify } from './canonicalJson.js';

export type RegionMappings = Record<string, string>;

/** Identity-significant edition shape. Excludes notes, external_refs, packaging.notes. */
function extractIdentityFields(
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

  const out: Record<string, unknown> = {
    discs: identityDiscs,
    edition_tags: Array.isArray(edition.edition_tags)
      ? [...(edition.edition_tags as unknown[])].sort()
      : [],
    movie: movie ? { tmdb_movie_id: movie.tmdb_movie_id } : undefined,
    packaging: packaging ? { type: (packaging.type ?? 'other').toString().toLowerCase() } : undefined,
    publisher: String(edition.publisher ?? '').trim(),
    release_year: edition.release_year,
  };
  const upc = String(edition.upc ?? '').trim();
  if (upc) out.upc = upc;
  return out;
}

/**
 * Compute edition identity hash per CANON_IDENTITY_SPEC.
 * @param edition - Canon edition object
 * @param regionMappings - Optional region mappings from regions.json (mappings key)
 * @returns Identity string: edition:v3:<sha256hex>
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

  return {
    discs: identityDiscs,
    edition_tags: Array.isArray(edition.edition_tags)
      ? [...(edition.edition_tags as unknown[])].sort()
      : [],
    movie: movie ? { tmdb_movie_id: movie.tmdb_movie_id } : undefined,
    packaging: packaging ? { type: (packaging.type ?? 'other').toString().toLowerCase() } : undefined,
    publisher: String(edition.publisher ?? '').trim(),
    release_year: edition.release_year,
  };
}

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

/**
 * Compute v1 edition identity hash. Used only for redirect map generation when migrating.
 * @returns Identity string: edition:v1:<sha256hex>
 */
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
