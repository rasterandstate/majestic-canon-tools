/**
 * Produce surgically clean canonical JSON shape for storage.
 * CANON_IDENTITY_SPEC: title/year are informational only — exclude from canon.
 * Empty strings are entropy. Prefer absence over empty values.
 * _sourceFile is repo artifact — never store in edition.
 */
type UnknownRecord = Record<string, unknown>;

function cleanExternalRef(ref: unknown): UnknownRecord | null {
  if (ref == null || typeof ref !== 'object') return null;
  const r = ref as UnknownRecord;
  const source = String(r.source ?? '').trim();
  const id = String(r.id ?? '').trim();
  if (!source || !id) return null;
  const out: UnknownRecord = { source, id };
  const url = String(r.url ?? '').trim();
  if (url) out.url = url;
  return out;
}

/**
 * Convert edition to canonical storage shape.
 * Strips: _sourceFile, movie.title, movie.year, packaging.notes (if empty),
 * any empty strings, null, undefined.
 */
export function toCanonicalShape(edition: unknown): UnknownRecord {
  if (edition == null || typeof edition !== 'object') {
    throw new Error('Edition must be a non-null object');
  }
  const e = edition as UnknownRecord;

  const out: UnknownRecord = {};

  // movie: tmdb_movie_id only. title/year are informational — never store.
  const movie = e.movie as UnknownRecord | undefined;
  if (movie != null && movie.tmdb_movie_id != null) {
    out.movie = { tmdb_movie_id: movie.tmdb_movie_id };
  }

  if (e.release_year != null) out.release_year = e.release_year;
  if (e.region != null && String(e.region).trim()) out.region = String(e.region).trim();
  if (e.publisher != null && String(e.publisher).trim()) out.publisher = String(e.publisher).trim();

  // packaging: type only. notes only if non-empty.
  const packaging = e.packaging as UnknownRecord | undefined;
  if (packaging != null) {
    const pOut: UnknownRecord = {};
    if (packaging.type != null && String(packaging.type).trim()) {
      pOut.type = String(packaging.type).trim().toLowerCase();
    }
    const notes = packaging.notes != null ? String(packaging.notes).trim() : '';
    if (notes) pOut.notes = notes;
    if (Object.keys(pOut).length > 0) out.packaging = pOut;
  }

  if (Array.isArray(e.discs) && e.discs.length > 0) {
    out.discs = e.discs.map((d: unknown) => {
      const disc = d as UnknownRecord;
      const base: UnknownRecord = {
        format: (disc.format ?? 'OTHER').toString().toUpperCase(),
        disc_count: disc.disc_count ?? 1,
      };
      const region = disc.region != null ? String(disc.region).trim() : '';
      if (region) base.region = region;
      return base;
    });
  }

  const upc = e.upc != null ? String(e.upc).trim() : '';
  if (upc) out.upc = upc;

  if (Array.isArray(e.edition_tags) && e.edition_tags.length > 0) {
    const tags = e.edition_tags
      .map((t: unknown) => String(t).trim())
      .filter(Boolean)
      .sort();
    if (tags.length > 0) out.edition_tags = tags;
  }

  const notes = e.notes != null ? String(e.notes).trim() : '';
  if (notes) out.notes = notes;

  if (Array.isArray(e.external_refs) && e.external_refs.length > 0) {
    const refs = e.external_refs
      .map(cleanExternalRef)
      .filter((r): r is UnknownRecord => r != null)
      .sort((a, b) => {
        const c = String(a.source).localeCompare(String(b.source));
        return c !== 0 ? c : String(a.id).localeCompare(String(b.id));
      });
    if (refs.length > 0) out.external_refs = refs;
  }

  return out;
}
