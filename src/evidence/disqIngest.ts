/**
 * Disq evidence ingestion.
 */
import type { EvidenceRecord } from './types.js';
import { saveEvidence } from './evidenceRepository.js';
import { getCanonPath } from '../loadCanon.js';

const DISQ_GRAPHQL_URL = process.env.DISQ_API_URL ?? 'https://api.disqapis.com/graphql';

const PRODUCT_LOOKUP_QUERY = `
  query ProductLookup($query: ProductLookupQuery!, $image: ImageVariationInput) {
    lookup(query: $query) {
      sid
      asin
      gtin
      ean
      name
      image(variation: $image)
      backCover
      releaseDate
      discs
      mediaCount
      titlesCount
      media {
        sid
        number
        titles {
          sid
          creativeWork {
            sid
            name
            tmdbId
            imdbId
            releaseYear
            type
          }
        }
      }
      titles {
        sid
        creativeWork {
          sid
          name
          originalName
          tmdbId
          imdbId
          releaseYear
          type
          image(variation: $image)
        }
      }
    }
  }
`;

export async function ingestDisqProduct(gtin: string, canonPath?: string): Promise<EvidenceRecord> {
  const normalizedGtin = String(gtin).replace(/\D/g, '');
  if (!normalizedGtin) throw new Error('Invalid GTIN');

  const res = await fetch(DISQ_GRAPHQL_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(process.env.DISQ_API_KEY && { Authorization: `Bearer ${process.env.DISQ_API_KEY}` }),
    },
    body: JSON.stringify({
      query: PRODUCT_LOOKUP_QUERY,
      variables: { query: { value: normalizedGtin }, image: { w: 300, h: 450 } },
    }),
  });

  if (!res.ok) throw new Error(`Disq API error: ${res.status} ${res.statusText}`);

  const json = (await res.json()) as { data?: { lookup?: unknown }; errors?: Array<{ message: string }> };
  if (json.errors?.length) {
    throw new Error(`Disq GraphQL errors: ${json.errors.map((e) => e.message).join('; ')}`);
  }

  const lookup = json.data?.lookup;
  if (!lookup || typeof lookup !== 'object') throw new Error('Disq API returned no product data');

  const record: EvidenceRecord = {
    id: `disq_${normalizedGtin}`,
    source: 'disq',
    entity_type: 'product',
    primary_id: normalizedGtin,
    created_at: new Date().toISOString(),
    data: JSON.parse(JSON.stringify(lookup)),
  };

  await saveEvidence(record, canonPath);
  return record;
}
