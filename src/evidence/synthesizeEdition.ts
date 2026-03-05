/**
 * Synthesize proposed edition from evidence.
 */
import type { EvidenceRecord, ProposedEdition } from './types.js';
import { EVIDENCE_PRIORITY } from './types.js';
import { getEvidenceByGTIN } from './evidenceRepository.js';

export async function synthesizeEdition(gtin: string, canonPath?: string): Promise<ProposedEdition | null> {
  const evidence = await getEvidenceByGTIN(gtin, canonPath);
  if (evidence.length === 0) return null;

  const sorted = [...evidence].sort((a, b) => EVIDENCE_PRIORITY[b.source] - EVIDENCE_PRIORITY[a.source]);

  const proposal: ProposedEdition = {
    upc: gtin,
    gtin,
    evidence_sources: [...new Set(evidence.map((e) => e.source))],
  };

  for (const rec of sorted) {
    mergeEvidenceIntoProposal(proposal, rec);
  }

  return proposal;
}

function mergeEvidenceIntoProposal(proposal: ProposedEdition, rec: EvidenceRecord): void {
  const d = rec.data;
  if (!d || typeof d !== 'object') return;

  if (proposal.upc === undefined && (d.gtin ?? d.ean ?? d.upc)) proposal.upc = String(d.gtin ?? d.ean ?? d.upc);
  if (proposal.gtin === undefined && (d.gtin ?? d.ean ?? d.upc)) proposal.gtin = String(d.gtin ?? d.ean ?? d.upc);
  if (proposal.tmdb_id === undefined && (d.tmdbId ?? d.tmdb_id)) {
    const id = d.tmdbId ?? d.tmdb_id;
    proposal.tmdb_id = typeof id === 'number' ? id : parseInt(String(id), 10);
  }
  if (proposal.release_year === undefined && (d.releaseYear ?? d.release_year)) {
    const y = d.releaseYear ?? d.release_year;
    proposal.release_year = typeof y === 'number' ? y : parseInt(String(y), 10);
  }
  if (proposal.release_year === undefined && d.releaseDate) {
    const year = String(d.releaseDate).slice(0, 4);
    if (/^\d{4}$/.test(year)) proposal.release_year = parseInt(year, 10);
  }
  if (proposal.disc_count === undefined && (d.discs ?? d.discCount ?? d.disc_count)) {
    const n = d.discs ?? d.discCount ?? d.disc_count;
    proposal.disc_count = typeof n === 'number' ? n : parseInt(String(n), 10);
  }
  if (proposal.cover_url === undefined && d.image) proposal.cover_url = String(d.image);
  if (proposal.name === undefined && d.name) proposal.name = String(d.name);

  const titles = d.titles as Array<{ creativeWork?: { tmdbId?: string | number } }> | undefined;
  if (proposal.tmdb_id === undefined && Array.isArray(titles)) {
    for (const t of titles) {
      if (t?.creativeWork?.tmdbId != null) {
        proposal.tmdb_id = typeof t.creativeWork.tmdbId === 'number' ? t.creativeWork.tmdbId : parseInt(String(t.creativeWork.tmdbId), 10);
        break;
      }
    }
  }

  const media = d.media as Array<{ titles?: Array<{ creativeWork?: { tmdbId?: string | number } }> }> | undefined;
  if (proposal.tmdb_id === undefined && Array.isArray(media)) {
    for (const m of media) {
      for (const tt of m?.titles ?? []) {
        if (tt?.creativeWork?.tmdbId != null) {
          proposal.tmdb_id = typeof tt.creativeWork.tmdbId === 'number' ? tt.creativeWork.tmdbId : parseInt(String(tt.creativeWork.tmdbId), 10);
          break;
        }
      }
    }
  }
}
