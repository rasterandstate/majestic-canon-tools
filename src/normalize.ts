/**
 * Canonical normalization for identity-significant fields.
 * CANON_IDENTITY_SPEC: applied consistently in toCanonicalShape and editionIdentity.
 */

/** Normalize UPC: trim, remove spaces/hyphens, digits-only, preserve leading zeros. Returns empty if no digits. */
export function normalizeUpc(raw: unknown): string {
  const s = String(raw ?? '').trim().replace(/[\s\-]/g, '');
  const digits = s.replace(/\D/g, '');
  return digits;
}

/** Normalize edition tag: lowercase, spaces/hyphens to underscores. */
export function normalizeTag(raw: unknown): string {
  return String(raw ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s\-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}
