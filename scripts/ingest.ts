#!/usr/bin/env npx tsx
/**
 * Ingest evidence from pluggable providers.
 * Usage:
 *   pnpm canon:ingest gtin <gtin>
 *   pnpm canon:ingest tmdb <tmdb_id>
 *   pnpm canon:ingest disc_hash <hash>
 *   pnpm canon:ingest tmdb <id> --no-verify  # skip Wikidata verification (use with care)
 */
import 'dotenv/config';
import type { CanonIdentifier } from '../src/canon/providers/EvidenceProvider.js';
import { ingestEvidence } from '../src/canon/ingest/ingestEvidence.js';
import { getProvidersForIdentifier } from '../src/canon/providers/providerRegistry.js';
import { getCanonPath } from '../src/loadCanon.js';
import { verifyTmdbId } from '../src/canon/verification/wikidataVerifier.js';
import { PRIORITY_DISCS } from '../src/canon/verification/priorityDiscs.js';

const args = process.argv.slice(2);
const noVerify = args.includes('--no-verify');
const [typeArg, valueArg] = args.filter((a) => a !== '--no-verify');

function parseIdentifier(): CanonIdentifier | null {
  if (!typeArg || !valueArg) return null;

  switch (typeArg.toLowerCase()) {
    case 'gtin':
      return { type: 'gtin', value: valueArg.replace(/\D/g, '') };
    case 'tmdb':
      const tmdbId = parseInt(valueArg, 10);
      if (isNaN(tmdbId)) return null;
      return { type: 'tmdb', value: tmdbId };
    case 'disc_hash':
      return { type: 'disc_hash', value: valueArg };
    default:
      return null;
  }
}

const identifier = parseIdentifier();
if (!identifier) {
  console.error('Usage: pnpm canon:ingest <type> <value> [--no-verify]');
  console.error('  type: gtin | tmdb | disc_hash');
  console.error('  value: GTIN (e.g. 883929398877), TMDB ID (e.g. 603), or disc hash');
  process.exit(1);
}

// TMDB ingest: verify via Wikidata before proceeding (unless --no-verify)
if (identifier.type === 'tmdb' && !noVerify) {
  const expectedImdb = PRIORITY_DISCS[identifier.value];
  if (!expectedImdb) {
    console.error(
      `tmdb/${identifier.value}: not in priority list. Add to priorityDiscs.ts with expected IMDb, or use --no-verify (untrusted).`
    );
    process.exit(1);
  }
  const verification = await verifyTmdbId(identifier.value, expectedImdb);
  if (!verification.ok) {
    console.error(`Verification failed: ${verification.error}`);
    process.exit(1);
  }
  console.log(`Verified: ${verification.label} (${verification.imdbId})`);
}

const canonPath = process.env.MAJESTIC_CANON_PATH ?? getCanonPath();

const providers = getProvidersForIdentifier(identifier);
console.log(`Identifier: ${identifier.type}=${identifier.value}`);
console.log(`Providers for this identifier: ${providers.map((p) => p.name).join(', ') || '(none)'}`);

try {
  const result = await ingestEvidence(identifier, canonPath);

  console.log('\nProviders used:', result.providersUsed.join(', ') || '(none)');
  console.log('\nEvidence written:');
  for (const path of result.evidenceWritten) {
    console.log('  ', path);
  }
  if (result.evidenceWritten.length === 0 && result.providersUsed.length === 0) {
    console.log('  (none — no providers returned evidence)');
  }

  if (result.errors.length > 0) {
    console.error('\nErrors:');
    for (const err of result.errors) {
      console.error('  ', err);
    }
  }
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}
