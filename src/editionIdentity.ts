/**
 * Per-edition identity hash per CANON_IDENTITY_SPEC.
 * Identity string: edition:v1:<sha256hex>
 *
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

  const rawRegion = String(edition.region ?? '').trim().toLowerCase();
  const region = regionMappings[rawRegion] ?? (edition.region as string) ?? '';

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
    region: region.toUpperCase() || 'NONE',
    release_year: edition.release_year,
  };
}

/**
 * Compute edition identity hash per CANON_IDENTITY_SPEC.
 * @param edition - Canon edition object
 * @param regionMappings - Optional region mappings from regions.json (mappings key)
 * @returns Identity string: edition:v1:<sha256hex>
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
  return `edition:v1:${hash}`;
}
