/**
 * Deterministic JSON serialization. Keys sorted lexicographically.
 * Required for canon.json hash stability per CANON_IDENTITY_SPEC.
 */
export function canonicalStringify(obj: unknown): string {
  if (obj === null) return 'null';
  if (typeof obj === 'boolean') return obj ? 'true' : 'false';
  if (typeof obj === 'number') return JSON.stringify(obj);
  if (typeof obj === 'string') return JSON.stringify(obj);
  if (Array.isArray(obj)) {
    const parts = obj.map((item) => canonicalStringify(item));
    return '[' + parts.join(',') + ']';
  }
  if (typeof obj === 'object') {
    const keys = Object.keys(obj).sort();
    const parts = keys.map((k) => JSON.stringify(k) + ':' + canonicalStringify((obj as Record<string, unknown>)[k]));
    return '{' + parts.join(',') + '}';
  }
  return 'null';
}
