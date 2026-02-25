#!/usr/bin/env npx tsx
/**
 * Build canon packs. Validates canon, produces version.json and (future) packs.
 *
 * Usage:
 *   pnpm build
 *   MAJESTIC_CANON_PATH=/path/to/canon pnpm build
 *   pnpm build -- --out ./dist
 */
import { build as runBuild } from '../src/build.js';
import { getCanonPath } from '../src/loadCanon.js';

const args = process.argv.slice(2);
const outIdx = args.indexOf('--out');
const outDir = outIdx >= 0 && args[outIdx + 1] ? args[outIdx + 1] : undefined;

try {
  const manifest = runBuild({
    canonPath: process.env.MAJESTIC_CANON_PATH ?? getCanonPath(),
    outDir,
  });
  console.log('Build complete:', JSON.stringify(manifest, null, 2));
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}
