/**
 * Canon evidence provider interface.
 * Evidence sources (Disq, TMDB, disc scans, retail catalogs) implement this.
 */
import type { EvidenceRecord } from '../../evidence/types.js';

export type CanonIdentifier =
  | { type: 'gtin'; value: string }
  | { type: 'tmdb'; value: number }
  | { type: 'disc_hash'; value: string };

export interface EvidenceProvider {
  name: string;

  supportsIdentifier(identifier: CanonIdentifier): boolean;

  fetchEvidence(identifier: CanonIdentifier): Promise<EvidenceRecord[]>;
}
