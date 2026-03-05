/**
 * Disq evidence provider.
 * Only activates if DISQ_API_URL environment variable exists.
 */
import type { CanonIdentifier, EvidenceProvider } from './EvidenceProvider.js';
import type { EvidenceRecord } from '../../evidence/types.js';

export class DisqProvider implements EvidenceProvider {
  name = 'disq';

  supportsIdentifier(identifier: CanonIdentifier): boolean {
    return identifier.type === 'gtin';
  }

  async fetchEvidence(identifier: CanonIdentifier): Promise<EvidenceRecord[]> {
    if (!process.env.DISQ_API_URL) {
      return [];
    }

    if (identifier.type !== 'gtin') {
      return [];
    }

    // Placeholder: endpoint structure not yet defined.
    // Will be implemented when Disq API integration is finalized.
    return [];
  }
}
