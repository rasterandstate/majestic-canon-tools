/**
 * TMDB evidence provider.
 * Fetches movie metadata using TMDB ID.
 */
import type { CanonIdentifier, EvidenceProvider } from './EvidenceProvider.js';
import type { EvidenceRecord } from '../../evidence/types.js';

const TMDB_BASE = 'https://api.themoviedb.org/3';

export class TMDBProvider implements EvidenceProvider {
  name = 'tmdb';

  supportsIdentifier(identifier: CanonIdentifier): boolean {
    return identifier.type === 'tmdb';
  }

  async fetchEvidence(identifier: CanonIdentifier): Promise<EvidenceRecord[]> {
    if (identifier.type !== 'tmdb') {
      return [];
    }

    const apiKey = process.env.TMDB_API_KEY;
    if (!apiKey) {
      return [];
    }

    const tmdbId = identifier.value;
    const url = `${TMDB_BASE}/movie/${tmdbId}?language=en-US`;

    const res = await fetch(url, {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!res.ok) {
      throw new Error(`TMDB API error: ${res.status} ${res.statusText}`);
    }

    const data = (await res.json()) as Record<string, unknown>;

    const record: EvidenceRecord = {
      source: 'tmdb',
      entity_type: 'creative_work',
      primary_id: String(tmdbId),
      id: `tmdb_${tmdbId}`,
      created_at: new Date().toISOString(),
      data: { ...data },
    };

    return [record];
  }
}
