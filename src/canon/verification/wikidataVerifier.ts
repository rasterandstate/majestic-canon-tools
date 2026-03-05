/**
 * Wikidata-based TMDB ID verifier.
 * Uses Wikidata as the verification oracle for TMDB ID ↔ IMDb ID mappings.
 * themoviedb.org is blocked for automated verification; Wikidata is stable and public.
 */

const WIKIDATA_SPARQL = 'https://query.wikidata.org/sparql';

export interface WikidataVerification {
  ok: boolean;
  tmdbId: number;
  imdbId?: string;
  label?: string;
  error?: string;
}

/**
 * Verify a TMDB movie ID via Wikidata.
 * If expectedImdbId is provided and Wikidata returns a different IMDb ID, verification fails.
 * If TMDB ID is not found in Wikidata, verification fails.
 */
export async function verifyTmdbId(
  tmdbId: number,
  expectedImdbId?: string
): Promise<WikidataVerification> {
  const query = `
    SELECT ?imdb ?label WHERE {
      ?item wdt:P4947 "${tmdbId}";
            wdt:P345 ?imdb;
            rdfs:label ?label .
      FILTER(LANG(?label) = "en")
    }
    LIMIT 1
  `;

  const url = `${WIKIDATA_SPARQL}?query=${encodeURIComponent(query)}&format=json`;

  let res: Response;
  try {
    res = await fetch(url, {
      headers: {
        Accept: 'application/sparql-results+json',
        'User-Agent': 'MajesticCanonTools/1.0 (https://github.com/majestic; evidence ingestion)',
      },
    });
  } catch (err) {
    return {
      ok: false,
      tmdbId,
      error: `Wikidata fetch failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  if (!res.ok) {
    return {
      ok: false,
      tmdbId,
      error: `Wikidata HTTP ${res.status} ${res.statusText}`,
    };
  }

  const json = (await res.json()) as {
    results?: { bindings?: Array<{ imdb?: { value: string }; label?: { value: string } }> };
  };

  const bindings = json.results?.bindings ?? [];
  if (bindings.length === 0) {
    return {
      ok: false,
      tmdbId,
      error: `TMDB ID ${tmdbId} not found in Wikidata`,
    };
  }

  const imdbId = bindings[0].imdb?.value ?? '';
  const label = bindings[0].label?.value ?? '';

  if (expectedImdbId !== undefined) {
    const normalizedExpected = expectedImdbId.toLowerCase().replace(/^tt/, 'tt').trim();
    const normalizedActual = imdbId.toLowerCase().replace(/^tt/, 'tt').trim();
    if (normalizedExpected !== normalizedActual) {
      return {
        ok: false,
        tmdbId,
        imdbId,
        label,
        error: `IMDb ID mismatch: expected ${expectedImdbId}, Wikidata has ${imdbId} (${label})`,
      };
    }
  }

  return {
    ok: true,
    tmdbId,
    imdbId,
    label,
  };
}
