/**
 * Provider registry — register available providers and query them dynamically.
 */
import type { CanonIdentifier } from './EvidenceProvider.js';
import type { EvidenceProvider } from './EvidenceProvider.js';
import { DisqProvider } from './DisqProvider.js';
import { TMDBProvider } from './TMDBProvider.js';

const providers: EvidenceProvider[] = [
  new TMDBProvider(),
  new DisqProvider(),
];

export function getProvidersForIdentifier(identifier: CanonIdentifier): EvidenceProvider[] {
  return providers.filter((p) => p.supportsIdentifier(identifier));
}

export function getAllProviders(): EvidenceProvider[] {
  return [...providers];
}
