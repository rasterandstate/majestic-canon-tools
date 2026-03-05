/**
 * Evidence types — shared with Backstage.
 */
export type EvidenceSource = 'disq' | 'tmdb' | 'disc' | 'manual';

export type EvidenceEntityType = 'product' | 'creative_work' | 'disc';

export interface EvidenceRecord {
  id: string;
  source: EvidenceSource;
  entity_type: EvidenceEntityType;
  primary_id: string;
  created_at: string;
  data: Record<string, unknown>;
}

export const EVIDENCE_PRIORITY: Record<EvidenceSource, number> = {
  manual: 4,
  disc: 3,
  disq: 2,
  tmdb: 1,
};

export interface ProposedEdition {
  upc: string;
  tmdb_id?: number;
  release_year?: number;
  disc_count?: number;
  cover_url?: string;
  name?: string;
  evidence_sources: string[];
  gtin: string;
}
