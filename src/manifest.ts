/**
 * Pack manifest per PACK_FORMAT.md. The signing target.
 */
import { spawnSync } from 'child_process';
import { createHash } from 'crypto';
import { join } from 'path';
import { canonicalStringify } from './canonicalJson.js';

export interface ManifestPayloadFile {
  path: string;
  sha256: string;
  bytes: number;
}

export interface PackManifest {
  pack_format_version: string;
  canon_version: string;
  schema_version: string;
  identity_version: string;
  type: 'full' | 'delta';
  created_at: string;
  payload: {
    files: ManifestPayloadFile[];
  };
}

/**
 * Get canon_version from canon repo: date + short git SHA.
 * Deterministic for same commit. Falls back to "local" if not a git repo.
 */
export function getCanonVersion(canonPath: string): string {
  const dateResult = spawnSync('git', ['log', '-1', '--format=%ci'], {
    cwd: canonPath,
    encoding: 'utf-8',
  });
  const shaResult = spawnSync('git', ['rev-parse', '--short', 'HEAD'], {
    cwd: canonPath,
    encoding: 'utf-8',
  });
  if (dateResult.status !== 0 || shaResult.status !== 0) {
    return 'local';
  }
  const dateStr = dateResult.stdout?.trim().slice(0, 10) ?? '';
  const sha = shaResult.stdout?.trim() ?? '';
  if (!dateStr || !sha) return 'local';
  return `${dateStr}+${sha}`;
}

/**
 * Build manifest from canon.json bytes. Payload files sorted by path.
 */
export function buildManifest(
  canonJson: string,
  canonVersion: string,
  schemaVersion: number,
  identityVersion: string
): PackManifest {
  const canonBuf = Buffer.from(canonJson, 'utf-8');
  const sha256 = createHash('sha256').update(canonBuf).digest('hex');
  const bytes = canonBuf.byteLength;

  const files: ManifestPayloadFile[] = [
    { path: 'payload/canon.json', sha256, bytes },
  ].sort((a, b) => a.path.localeCompare(b.path));

  return {
    pack_format_version: '1',
    canon_version: canonVersion,
    schema_version: String(schemaVersion),
    identity_version: identityVersion,
    type: 'full',
    created_at: new Date().toISOString(),
    payload: { files },
  };
}

/**
 * Serialize manifest for writing. Canonical form for signing.
 */
export function serializeManifest(manifest: PackManifest): string {
  return canonicalStringify(manifest);
}
