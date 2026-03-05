/**
 * Proposals store — canon/proposals/
 */
import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync, unlinkSync } from 'fs';
import { join } from 'path';
import { getCanonPath } from '../loadCanon.js';
import type { ProposedEdition } from './types.js';

function getProposalsDir(canonPath?: string): string {
  return join(canonPath ?? getCanonPath(), 'proposals');
}

export async function saveProposal(proposal: ProposedEdition, canonPath?: string): Promise<void> {
  const dir = getProposalsDir(canonPath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  const gtin = (proposal.gtin ?? proposal.upc).replace(/\D/g, '');
  writeFileSync(join(dir, `edition_${gtin}.json`), JSON.stringify(proposal, null, 2), 'utf-8');
}

export async function loadAllProposals(canonPath?: string): Promise<ProposedEdition[]> {
  const dir = getProposalsDir(canonPath);
  if (!existsSync(dir)) return [];

  const files = readdirSync(dir).filter((f) => f.startsWith('edition_') && f.endsWith('.json'));
  const proposals: ProposedEdition[] = [];

  for (const file of files) {
    try {
      const raw = JSON.parse(readFileSync(join(dir, file), 'utf-8')) as ProposedEdition;
      if (raw?.gtin ?? raw?.upc) proposals.push(raw);
    } catch {
      /* skip */
    }
  }

  return proposals;
}
