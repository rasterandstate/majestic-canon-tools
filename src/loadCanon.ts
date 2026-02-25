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
