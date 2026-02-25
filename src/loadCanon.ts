/**
 * Load canon from path. Read-only access during build.
 */
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import type { CanonSchema } from './types.js';

export function loadCanonSchema(canonPath: string): CanonSchema {
  const schemaPath = join(canonPath, 'schema', 'schema.json');
  if (!existsSync(schemaPath)) {
    throw new Error(`Canon schema not found at ${schemaPath}`);
  }
  const raw = readFileSync(schemaPath, 'utf-8');
  const schema = JSON.parse(raw) as CanonSchema;
  if (typeof schema.version !== 'number') {
    throw new Error('Canon schema must have numeric version');
  }
  return schema;
}

export function getCanonPath(): string {
  const env = process.env.MAJESTIC_CANON_PATH;
  if (env) return env;
  const defaultPath = join(process.cwd(), '..', 'majestic-canon');
  return defaultPath;
}

export interface CanonRegions {
  canonical: string[];
  mappings: Record<string, string>;
}

export function loadRegions(canonPath: string): CanonRegions {
  const regionsPath = join(canonPath, 'schema', 'regions.json');
  if (!existsSync(regionsPath)) {
    return { canonical: [], mappings: {} };
  }
  const raw = JSON.parse(readFileSync(regionsPath, 'utf-8')) as CanonRegions;
  return {
    canonical: raw.canonical ?? [],
    mappings: raw.mappings ?? {},
  };
}

export interface CanonEditionTag {
  tag_id: string;
  aliases?: string[];
}

export function loadEditionTags(canonPath: string): CanonEditionTag[] {
  const tagsPath = join(canonPath, 'schema', 'edition_tags.json');
  if (!existsSync(tagsPath)) return [];
  const raw = JSON.parse(readFileSync(tagsPath, 'utf-8'));
  return Array.isArray(raw) ? raw : [raw];
}

/**
 * Validate edition_tags against registry. Returns error message or null if valid.
 * Used by Backstage API and tests.
 */
export function validateEditionTags(
  edition: Record<string, unknown>,
  registry: CanonEditionTag[]
): string | null {
  const tags = Array.isArray(edition.edition_tags) ? edition.edition_tags : [];
  if (tags.length === 0) return null;
  const validIds = new Set(registry.map((t) => t.tag_id));
  for (const tag of tags) {
    const t = String(tag).trim();
    if (!validIds.has(t)) {
      return `Invalid edition_tag "${t}": must be from canon registry (schema/edition_tags.json)`;
    }
  }
  return null;
}
