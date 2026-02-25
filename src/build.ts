/**
 * Build pipeline: validate canon → produce manifest. Pack generation is placeholder.
 */
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { loadCanonSchema, getCanonPath } from './loadCanon.js';
import { runCanonValidation } from './validate.js';
import type { VersionManifest } from './types.js';

export interface BuildOptions {
  canonPath?: string;
  outDir?: string;
}

export function build(options: BuildOptions = {}): VersionManifest {
  const canonPath = options.canonPath ?? getCanonPath();
  const outDir = options.outDir ?? join(process.cwd(), 'out');

  // 1. Load schema
  const schema = loadCanonSchema(canonPath);

  // 2. Run canon validation
  const { ok, stderr } = runCanonValidation(canonPath);
  if (!ok) {
    throw new Error(`Canon validation failed:\n${stderr}`);
  }

  // 3. Produce manifest (pack generation is placeholder until editions exist)
  const manifest: VersionManifest = {
    version: 1,
    schemaVersion: schema.version,
    builtAt: new Date().toISOString(),
  };

  // 4. Write output
  if (!existsSync(outDir)) {
    mkdirSync(outDir, { recursive: true });
  }
  writeFileSync(
    join(outDir, 'version.json'),
    JSON.stringify(manifest, null, 2),
    'utf-8'
  );

  return manifest;
}
