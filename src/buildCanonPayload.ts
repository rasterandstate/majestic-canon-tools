/**
 * Build deterministic canon.json payload.
 * Exactly the shape updater would store. No compression, no signing. Hash stability validation.
 */
import { readFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';
import { canonicalStringify } from './canonicalJson.js';
import { loadCanonSchema, getCanonPath } from './loadCanon.js';

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

  // Load publishers
  const publishersPath = join(canonPath, 'schema', 'publishers.json');
  const publishers: unknown[] = existsSync(publishersPath)
    ? JSON.parse(readFileSync(publishersPath, 'utf-8'))
    : [];

  // Load regions
  const regionsPath = join(canonPath, 'schema', 'regions.json');
  const regions: { canonical: string[]; mappings: Record<string, string> } = existsSync(regionsPath)
    ? JSON.parse(readFileSync(regionsPath, 'utf-8'))
    : { canonical: [], mappings: {} };

  // Load editions (from editions/*.json or editions/index.json)
  const editionsDir = join(canonPath, 'editions');
  const editions: unknown[] = [];
  if (existsSync(editionsDir)) {
    const files = readdirSync(editionsDir).filter((f) => f.endsWith('.json')).sort();
    for (const file of files) {
      const data = JSON.parse(readFileSync(join(editionsDir, file), 'utf-8'));
      if (Array.isArray(data)) {
        editions.push(...data);
      } else {
        editions.push(data);
      }
    }
  }

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
