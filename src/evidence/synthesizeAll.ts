/**
 * Synthesize all proposals from evidence.
 */
import { getCanonPath } from '../loadCanon.js';
import { loadEvidence } from './evidenceRepository.js';
import { synthesizeEdition } from './synthesizeEdition.js';
import { saveProposal } from './proposalRepository.js';

const VALID_SOURCES = ['disq', 'tmdb', 'disc', 'manual'] as const;

export async function synthesizeAll(canonPath?: string): Promise<{ synthesized: number; skipped: number }> {
  const path = canonPath ?? getCanonPath();
  const all: Array<{ data?: Record<string, unknown>; entity_type?: string; primary_id?: string }> = [];

  for (const source of VALID_SOURCES) {
    all.push(...(await loadEvidence(source, path)));
  }

  const gtins = new Set<string>();
  for (const rec of all) {
    const gtin = rec.data?.gtin ?? rec.data?.ean ?? rec.data?.upc ?? (rec.entity_type === 'product' ? rec.primary_id : null);
    if (gtin) gtins.add(String(gtin).replace(/\D/g, ''));
  }

  let synthesized = 0;
  let skipped = 0;

  for (const gtin of gtins) {
    const proposal = await synthesizeEdition(gtin, path);
    if (proposal) {
      await saveProposal(proposal, path);
      synthesized++;
    } else {
      skipped++;
    }
  }

  return { synthesized, skipped };
}
