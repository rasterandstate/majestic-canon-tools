#!/usr/bin/env npx tsx
/**
 * Ingest TMDB evidence for all unique movies in canon-priority-discs.md.
 * Verifies each TMDB ID via Wikidata before ingest; fails fast on mismatch.
 * Usage: pnpm canon:ingest-priority-discs
 */
import 'dotenv/config';
import { ingestEvidence } from '../src/canon/ingest/ingestEvidence.js';
import { getCanonPath } from '../src/loadCanon.js';
import { verifyTmdbId } from '../src/canon/verification/wikidataVerifier.js';
import { PRIORITY_DISCS } from '../src/canon/verification/priorityDiscs.js';

// Unique TMDB IDs extracted from canon-priority-discs.md
// (Same movie, different editions → one ingest per movie)
const TMDB_IDS = [
  // Priority 1 — Trust Makers
  120, 121, 122, // LOTR trilogy
  11, 1891, 1892, // Star Wars original trilogy
  155, 272, 49026, // Dark Knight trilogy
  671, 672, 673, 674, 675, 767, 12444, 12445, // Harry Potter 1–8 (6–8: Half-Blood Prince, Deathly Hallows P1/P2)
  603, // Matrix
  105, 165, 196, // Back to the Future trilogy
  // Priority 2 — Boutique
  346, 490, 496243, 1018, // Seven Samurai, Seventh Seal, Parasite, Mulholland Drive
  11906, 3176, 141, 129, // Suspiria, Battle Royale, Donnie Darko, Spirited Away
  // Priority 3 — High Shelf Density
  329, 85, 19995, 98, 238, 78, 348, // Jurassic Park, Raiders, Avatar, Gladiator, Godfather, Blade Runner, Alien
  // Priority 4 — Edge Cases
  597, // Titanic
];

const canonPath = process.env.MAJESTIC_CANON_PATH ?? getCanonPath();

let written = 0;
let skipped = 0;
let errors = 0;

for (const id of TMDB_IDS) {
  const expectedImdb = PRIORITY_DISCS[id];
  if (!expectedImdb) {
    console.error(`tmdb/${id}: no expected IMDb in priority list — needs archivist approval`);
    process.exit(1);
  }

  const verification = await verifyTmdbId(id, expectedImdb);
  if (!verification.ok) {
    console.error(`tmdb/${id}: verification failed — ${verification.error}`);
    process.exit(1);
  }

  const result = await ingestEvidence({ type: 'tmdb', value: id }, canonPath);
  written += result.evidenceWritten.filter((p) => !p.includes('skipped')).length;
  skipped += result.evidenceWritten.filter((p) => p.includes('skipped')).length;
  errors += result.errors.length;

  if (result.evidenceWritten.length > 0) {
    console.log(`tmdb/${id}: ${result.evidenceWritten.join(', ')}`);
  }
  if (result.errors.length > 0) {
    console.error(`tmdb/${id} errors:`, result.errors);
  }
}

console.log('\n---');
console.log(`Written: ${written}, Skipped (exists): ${skipped}, Errors: ${errors}`);
