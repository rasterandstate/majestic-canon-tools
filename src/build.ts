/**
 * Build pipeline: validate canon → enrich movie titles → produce manifest + canon pack.
 */
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';
import { loadCanonSchema, getCanonPath } from './loadCanon.js';
import { runCanonValidation } from './validate.js';
import { buildCanonPayload, hashCanonPayload } from './buildCanonPayload.js';
import {
  getCanonVersion,
  buildManifest,
  serializeManifest,
  type PackManifest,
} from './manifest.js';
import { enrich } from './enrich.js';
import type { VersionManifest } from './types.js';

export interface BuildOptions {
  canonPath?: string;
  outDir?: string;
  canonVersion?: string;
  skipEnrich?: boolean;
}

export async function build(options: BuildOptions = {}): Promise<VersionManifest & { manifest: PackManifest }> {
  const canonPath = options.canonPath ?? getCanonPath();
  const outDir = options.outDir ?? join(process.cwd(), 'out');

  // 1. Load schema
  const schema = loadCanonSchema(canonPath);

  // 2. Run canon validation
  const { ok, stderr } = runCanonValidation(canonPath);
  if (!ok) {
    throw new Error(`Canon validation failed:\n${stderr}`);
  }

  // 3. Enrich movie titles (TMDB → titles). Writes payload/movie_titles.json.
  if (!options.skipEnrich) {
    await enrich({ canonPath, outDir });
  } else {
    const payloadDir = join(outDir, 'payload');
    if (!existsSync(payloadDir)) {
      mkdirSync(payloadDir, { recursive: true });
    }
  }

  // 4. Build deterministic canon.json payload
  const { json: canonJson } = buildCanonPayload({
    canonPath,
    canonVersion: options.canonVersion,
  });
  const canonHash = hashCanonPayload(canonJson);

  // 5. Get canon_version (date+sha from canon git)
  const canonVersion = options.canonVersion ?? getCanonVersion(canonPath);
  const identityVersion =
    schema.identityContract?.editionHashVersion != null
      ? `v${schema.identityContract.editionHashVersion}`
      : 'v1';

  // 6. Build pack manifest (includes canon.json + movie_titles.json)
  const payloadDir = join(outDir, 'payload');
  const canonPathPayload = join(payloadDir, 'canon.json');
  const titlesPath = join(payloadDir, 'movie_titles.json');

  const files: Array<{ path: string; sha256: string; bytes: number }> = [];
  const canonBuf = Buffer.from(canonJson, 'utf-8');
  files.push({
    path: 'payload/canon.json',
    sha256: createHash('sha256').update(canonBuf).digest('hex'),
    bytes: canonBuf.byteLength,
  });
  if (existsSync(titlesPath)) {
    const titlesBuf = readFileSync(titlesPath);
    files.push({
      path: 'payload/movie_titles.json',
      sha256: createHash('sha256').update(titlesBuf).digest('hex'),
      bytes: titlesBuf.byteLength,
    });
  }
  files.sort((a, b) => a.path.localeCompare(b.path));

  const packManifest = buildManifest(
    canonJson,
    canonVersion,
    schema.version,
    identityVersion,
    files
  );
  const manifestJson = serializeManifest(packManifest);

  // 7. Write output
  if (!existsSync(outDir)) {
    mkdirSync(outDir, { recursive: true });
  }
  if (!existsSync(payloadDir)) {
    mkdirSync(payloadDir, { recursive: true });
  }

  writeFileSync(canonPathPayload, canonJson, 'utf-8');
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
