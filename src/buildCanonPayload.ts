/**
 * Build deterministic canon.json payload.
 * Exactly the shape updater would store. No compression, no signing. Hash stability validation.
 *
 * INVARIANTS:
 * - canon.json contains NO timestamps, builtAt, or build metadata.
 * - Arrays are explicitly sorted: publishers by publisher_id, regions.canonical alphabetically,
 *   editions by canonical string, external_refs by source then id. Never rely on filesystem or object iteration order.
 * - Output is UTF-8, no trailing newline, platform-independent.
 */
import { readFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';
import { canonicalStringify } from './canonicalJson.js';
import { loadCanonSchema, getCanonPath } from './loadCanon.js';

/** Sort external_refs by source then id for deterministic payload (CANON_IDENTITY_SPEC). Exported for tests. */
export function normalizeEdition(edition: unknown): unknown {
  if (edition == null || typeof edition !== 'object') return edition;
  const obj = { ...(edition as Record<string, unknown>) };
  const refs = obj.external_refs;
  if (Array.isArray(refs) && refs.length > 0) {
    obj.external_refs = [...refs].sort((a, b) => {
      const aSrc = String((a as Record<string, unknown>)?.source ?? '');
      const bSrc = String((b as Record<string, unknown>)?.source ?? '');
      const cmp = aSrc.localeCompare(bSrc);
      if (cmp !== 0) return cmp;
      const aId = String((a as Record<string, unknown>)?.id ?? '');
      const bId = String((b as Record<string, unknown>)?.id ?? '');
      return aId.localeCompare(bId);
    });
  }
  return obj;
}

export interface BuildPayloadOptions {
  canonPath?: string;
  canonVersion?: string;
}

export interface CanonPayload {
  schema_version: string;
  identity_version: string;
  publishers: unknown[];
  regions: { canonical: string[]; mappings: Record<string, string> };
  editions: unknown[];
}

export function buildCanonPayload(options: BuildPayloadOptions = {}): { payload: CanonPayload; json: string } {
  const canonPath = options.canonPath ?? getCanonPath();
  const schema = loadCanonSchema(canonPath);

  // Load publishers — sort by publisher_id for deterministic array order
  const publishersPath = join(canonPath, 'schema', 'publishers.json');
  const publishersRaw: unknown[] = existsSync(publishersPath)
    ? JSON.parse(readFileSync(publishersPath, 'utf-8'))
    : [];
  const publishers = [...publishersRaw].sort((a, b) => {
    const idA = (a as Record<string, unknown>)?.publisher_id ?? '';
    const idB = (b as Record<string, unknown>)?.publisher_id ?? '';
    return String(idA).localeCompare(String(idB));
  });

  // Load regions — sort canonical list for deterministic order
  const regionsPath = join(canonPath, 'schema', 'regions.json');
  const regionsRaw: { canonical?: string[]; mappings?: Record<string, string> } = existsSync(regionsPath)
    ? JSON.parse(readFileSync(regionsPath, 'utf-8'))
    : {};
  const regions = {
    canonical: [...(regionsRaw.canonical ?? [])].sort(),
    mappings: regionsRaw.mappings ?? {},
  };

  // Load editions — normalize external_refs order, then sort by canonical string
  const editionsDir = join(canonPath, 'editions');
  const editionsRaw: unknown[] = [];
  if (existsSync(editionsDir)) {
    const files = readdirSync(editionsDir).filter((f) => f.endsWith('.json')).sort();
    for (const file of files) {
      const data = JSON.parse(readFileSync(join(editionsDir, file), 'utf-8'));
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        editionsRaw.push(normalizeEdition(item));
      }
    }
  }
  const editions = [...editionsRaw].sort((a, b) =>
    canonicalStringify(a).localeCompare(canonicalStringify(b))
  );

  const payload: CanonPayload = {
    schema_version: String(schema.version),
    identity_version: schema.identityContract?.editionHashVersion != null
      ? `v${schema.identityContract.editionHashVersion}`
      : 'v1',
    publishers,
    regions,
    editions,
  };

  const json = canonicalStringify(payload);
  return { payload, json };
}

export function hashCanonPayload(json: string): string {
  return createHash('sha256').update(json, 'utf-8').digest('hex');
}
