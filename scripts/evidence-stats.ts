#!/usr/bin/env npx tsx
/**
 * Evidence dataset health stats.
 * Usage: pnpm canon:evidence-stats
 */
import { getEvidenceStats } from '../src/evidence/evidenceRepository.js';
import { loadAllProposals } from '../src/evidence/proposalRepository.js';
import { getCanonPath } from '../src/loadCanon.js';

const canonPath = process.env.MAJESTIC_CANON_PATH ?? getCanonPath();

async function main() {
  const [stats, proposals] = await Promise.all([
    getEvidenceStats(canonPath),
    loadAllProposals(canonPath),
  ]);

  console.log('Evidence by source:');
  for (const [source, count] of Object.entries(stats)) {
    console.log(`  ${source}: ${count}`);
  }
  console.log('\nProposed editions:', proposals.length);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
