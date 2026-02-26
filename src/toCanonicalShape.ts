/**
 * Produce surgically clean canonical JSON shape for storage.
 * CANON_IDENTITY_SPEC: title/year are informational only — exclude from canon.
 * Empty strings are entropy. Prefer absence over empty values.
 * _sourceFile is repo artifact — never store in edition.
 */
import { normalizeTag, normalizeUpc } from './normalize.js';

type UnknownRecord = Record<string, unknown>;

function cleanExternalRef(ref: unknown): UnknownRecord | null {
  if (ref == null || typeof ref !== 'object') return null;
  const r = ref as UnknownRecord;
  const source = String(r.source ?? '').trim().toLowerCase();
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

  // movie: tmdb_movie_id, studios (optional). title/year are informational — never store.
  const movie = e.movie as UnknownRecord | undefined;
  if (movie != null && movie.tmdb_movie_id != null) {
    const movieOut: UnknownRecord = { tmdb_movie_id: movie.tmdb_movie_id };
    const studios = movie.studios;
    if (Array.isArray(studios) && studios.length > 0) {
      const valid = studios
        .map((s) => (s != null ? String(s).trim() : ''))
        .filter(Boolean);
      if (valid.length > 0) movieOut.studios = valid.sort();
    }
    out.movie = movieOut;
  }

  if (e.release_year != null) out.release_year = e.release_year;
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

  // disc_identity: optical fingerprint. structural_hash + casie_hash only; identity lives in CASie.
  const discIdentity = e.disc_identity as UnknownRecord | undefined;
  if (discIdentity != null && typeof discIdentity === 'object') {
    const di = discIdentity as Record<string, unknown>;
    const structural_hash = di.structural_hash != null ? String(di.structural_hash).trim() : '';
    const casie_hash = di.casie_hash != null ? String(di.casie_hash).trim() : '';
    const hash_algorithm = di.hash_algorithm != null ? String(di.hash_algorithm).trim() : '';
    const generated_at = di.generated_at != null ? String(di.generated_at).trim() : '';
    if (structural_hash && casie_hash && hash_algorithm && generated_at) {
      out.disc_identity = {
        structural_hash,
        casie_hash,
        hash_algorithm,
        generated_at,
      };
    }
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

  const upc = normalizeUpc(e.upc);
  if (upc) out.upc = upc;

  // barcode.gs1: minimal verification metadata (prefix, verified, gs1_status only; no company_name/brand_name)
  const barcode = e.barcode as UnknownRecord | undefined;
  if (barcode?.gs1 != null && typeof barcode.gs1 === 'object') {
    const gs1 = barcode.gs1 as UnknownRecord;
    const prefix = gs1.prefix != null ? String(gs1.prefix).trim() : '';
    if (prefix) {
      const gs1Out: UnknownRecord = { prefix, verified: gs1.verified === true };
      const status = gs1.gs1_status;
      if (status === 'active' || status === 'inactive') gs1Out.gs1_status = status;
      const barcodeOut: UnknownRecord = { gs1: gs1Out };
      if (upc) barcodeOut.upc = upc;
      out.barcode = barcodeOut;
    }
  }

  if (Array.isArray(e.edition_tags) && e.edition_tags.length > 0) {
    const tags = e.edition_tags
      .map((t) => normalizeTag(t))
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
