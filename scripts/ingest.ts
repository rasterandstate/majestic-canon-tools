#!/usr/bin/env npx tsx
/**
 * Ingest evidence from pluggable providers.
 * Usage:
 *   pnpm canon:ingest gtin <gtin>
 *   pnpm canon:ingest tmdb <tmdb_id>
 *   pnpm canon:ingest disc_hash <hash>
 */
import 'dotenv/config';
import type { CanonIdentifier } from '../src/canon/providers/EvidenceProvider.js';
import { ingestEvidence } from '../src/canon/ingest/ingestEvidence.js';
import { getProvidersForIdentifier } from '../src/canon/providers/providerRegistry.js';
import { getCanonPath } from '../src/loadCanon.js';

const [typeArg, valueArg] = process.argv.slice(2);

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
  console.error('Usage: pnpm canon:ingest <type> <value>');
  console.error('  type: gtin | tmdb | disc_hash');
  console.error('  value: GTIN (e.g. 883929398877), TMDB ID (e.g. 603), or disc hash');
  process.exit(1);
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
