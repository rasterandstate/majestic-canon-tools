/**
 * Evidence ingestion engine.
 * Receives CanonIdentifier, finds supporting providers, fetches and stores evidence.
 */
import type { CanonIdentifier } from '../providers/EvidenceProvider.js';
import { getProvidersForIdentifier } from '../providers/providerRegistry.js';
import { saveEvidence } from '../../evidence/evidenceRepository.js';
import { getCanonPath } from '../../loadCanon.js';

export interface IngestResult {
  providersUsed: string[];
  evidenceWritten: string[];
  errors: string[];
}

export async function ingestEvidence(
  identifier: CanonIdentifier,
  canonPath?: string
): Promise<IngestResult> {
  const path = canonPath ?? getCanonPath();
  const providers = getProvidersForIdentifier(identifier);
  const providersUsed: string[] = [];
  const evidenceWritten: string[] = [];
  const errors: string[] = [];

  for (const provider of providers) {
    try {
      const records = await provider.fetchEvidence(identifier);
      if (records.length === 0) continue;

      providersUsed.push(provider.name);

      for (const record of records) {
        try {
          await saveEvidence(record, path);
          evidenceWritten.push(`evidence/${record.source}/${record.source}_${record.primary_id}.json`);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          if (msg.includes('already exists')) {
            evidenceWritten.push(`evidence/${record.source}/${record.source}_${record.primary_id}.json (skipped, exists)`);
          } else {
            errors.push(`${provider.name}: ${msg}`);
          }
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${provider.name}: ${msg}`);
      // Continue with other providers — fail safely
    }
  }

  return { providersUsed, evidenceWritten, errors };
}
