/**
 * Build pipeline: validate canon → produce manifest + canon.json payload.
 */
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { loadCanonSchema, getCanonPath } from './loadCanon.js';
import { runCanonValidation } from './validate.js';
import { buildCanonPayload, hashCanonPayload } from './buildCanonPayload.js';
import type { VersionManifest } from './types.js';

export interface BuildOptions {
  canonPath?: string;
  outDir?: string;
  canonVersion?: string;
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

  // 3. Build deterministic canon.json payload
  const { json: canonJson } = buildCanonPayload({
    canonPath,
    canonVersion: options.canonVersion,
  });
  const canonHash = hashCanonPayload(canonJson);

  // 4. Produce manifest
  const manifest: VersionManifest = {
    version: 1,
    schemaVersion: schema.version,
    builtAt: new Date().toISOString(),
    fullPackHash: canonHash,
  };

  // 5. Write output
  if (!existsSync(outDir)) {
    mkdirSync(outDir, { recursive: true });
  }
  writeFileSync(join(outDir, 'version.json'), JSON.stringify(manifest, null, 2), 'utf-8');
  writeFileSync(join(outDir, 'canon.json'), canonJson, 'utf-8');

  return manifest;
}
