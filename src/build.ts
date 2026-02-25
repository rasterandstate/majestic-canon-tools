/**
 * Build pipeline: validate canon → produce manifest + canon.json payload.
 */
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { loadCanonSchema, getCanonPath } from './loadCanon.js';
import { runCanonValidation } from './validate.js';
import { buildCanonPayload, hashCanonPayload } from './buildCanonPayload.js';
import {
  getCanonVersion,
  buildManifest,
  serializeManifest,
  type PackManifest,
} from './manifest.js';
import type { VersionManifest } from './types.js';

export interface BuildOptions {
  canonPath?: string;
  outDir?: string;
  canonVersion?: string;
}

export function build(options: BuildOptions = {}): VersionManifest & { manifest: PackManifest } {
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

  // 4. Get canon_version (date+sha from canon git)
  const canonVersion = options.canonVersion ?? getCanonVersion(canonPath);
  const identityVersion =
    schema.identityContract?.editionHashVersion != null
      ? `v${schema.identityContract.editionHashVersion}`
      : 'v1';

  // 5. Build pack manifest
  const packManifest = buildManifest(
    canonJson,
    canonVersion,
    schema.version,
    identityVersion
  );
  const manifestJson = serializeManifest(packManifest);

  // 6. Write output
  if (!existsSync(outDir)) {
    mkdirSync(outDir, { recursive: true });
  }
  const payloadDir = join(outDir, 'payload');
  if (!existsSync(payloadDir)) {
    mkdirSync(payloadDir, { recursive: true });
  }

  writeFileSync(join(payloadDir, 'canon.json'), canonJson, 'utf-8');
  writeFileSync(join(outDir, 'manifest.json'), manifestJson, 'utf-8');

  const versionManifest: VersionManifest = {
    version: 1,
    schemaVersion: schema.version,
    builtAt: new Date().toISOString(),
    fullPackHash: canonHash,
  };
  writeFileSync(join(outDir, 'version.json'), JSON.stringify(versionManifest, null, 2), 'utf-8');

  return { ...versionManifest, manifest: packManifest };
}
