#!/usr/bin/env npx tsx
/**
 * Enrich canon with TMDB movie titles. Writes movie_titles.json to canon repo and out/payload/.
 * Run before build, or as part of publish. Viewer build can run this to populate titles for prerender.
 *
 * Usage:
 *   pnpm enrich
 *   MAJESTIC_CANON_PATH=/path/to/canon pnpm enrich
 */
import 'dotenv/config';
import { join } from 'path';
import { enrich } from '../src/enrich.js';
import { getCanonPath } from '../src/loadCanon.js';

const canonPath = process.env.MAJESTIC_CANON_PATH ?? getCanonPath();
const outDir = process.env.MAJESTIC_PACK_PATH ?? join(process.cwd(), 'out');

enrich({ canonPath, outDir }).catch((err) => {
  console.error(err);
  process.exit(1);
});
