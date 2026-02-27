/**
 * Resolve edition identity via redirect map. Single-hop only.
 * Used when loading edition by identity (v3 URL → v4 canonical).
 *
 * Rules:
 * - Single-hop: redirects map old → current. No chains at resolution time.
 * - Redirect map must be pre-flattened (all old IDs point directly to current).
 * - Detects loops and throws.
 */
export function resolveIdentity(
  identity: string,
  redirects: Record<string, string>
): string {
  if (identity == null || typeof identity !== 'string' || identity.trim() === '') {
    throw new Error('Identity must be a non-empty string');
  }
  const trimmed = identity.trim();
  const target = redirects[trimmed];
  if (target == null) return trimmed;

  // Single-hop: target must not itself be a redirect key (no chains)
  if (redirects[target] != null) {
    throw new Error(
      `Identity redirect chain detected: ${trimmed} → ${target} → ... (redirects must be flattened)`
    );
  }

  // Loop detection: target must not equal a key that would redirect back
  if (target === trimmed) {
    throw new Error(`Identity redirect loop: ${trimmed} → ${target}`);
  }

  return target;
}
