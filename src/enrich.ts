/**
 * TMDB enrichment: resolve movie IDs to titles.
 * Append-only cache. Never overwrite existing titles.
 * Output: movie_titles.json for the canon pack.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';

export interface MovieInfo {
  title: string;
  year: number;
}

export type MovieTitles = Record<string, MovieInfo>;

function loadEditions(canonPath: string): Array<{ movie?: { tmdb_movie_id?: number }; movies?: Array<{ tmdb_movie_id?: number }> }> {
  const editionsDir = join(canonPath, 'editions');
  if (!existsSync(editionsDir)) return [];
  const files = readdirSync(editionsDir).filter((f: string) => f.endsWith('.json'));
  const result: Array<{ movie?: { tmdb_movie_id?: number }; movies?: Array<{ tmdb_movie_id?: number }> }> = [];
  for (const file of files) {
    const raw = readFileSync(join(editionsDir, file), 'utf-8');
    const data = JSON.parse(raw);
    if (data) result.push(data);
  }
  return result;
}

export function extractTmdbIds(editions: Array<{ movie?: { tmdb_movie_id?: number }; movies?: Array<{ tmdb_movie_id?: number }> }>): number[] {
  const ids = new Set<number>();
  for (const edition of editions) {
    const id = edition.movie?.tmdb_movie_id ?? edition.movies?.[0]?.tmdb_movie_id;
    if (id != null) ids.add(id);
  }
  return [...ids];
}

function loadCache(path: string): MovieTitles {
  if (!existsSync(path)) return {};
  try {
    const raw = readFileSync(path, 'utf-8');
    const data = JSON.parse(raw) as Record<string, unknown>;
    if (!data || typeof data !== 'object') return {};
    const result: MovieTitles = {};
    for (const [k, v] of Object.entries(data)) {
      if (v && typeof v === 'object' && 'title' in v && typeof (v as MovieInfo).title === 'string') {
        result[k] = v as MovieInfo;
      }
    }
    return result;
  } catch {
    return {};
  }
}

async function fetchTmdbMovie(id: number, apiKey: string): Promise<MovieInfo | null> {
  const url = `https://api.themoviedb.org/3/movie/${id}?api_key=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const json = (await res.json()) as { title?: string; release_date?: string };
  const year = json.release_date ? parseInt(json.release_date.slice(0, 4), 10) : 0;
  return { title: json.title ?? 'Unknown', year };
}

async function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export interface EnrichOptions {
  canonPath: string;
  outDir: string;
  cachePath?: string;
  apiKey?: string;
  rateLimitMs?: number;
}

/**
 * Enrich canon with TMDB movie titles. Append-only: never overwrites existing cached titles.
 * Writes movie_titles.json to outDir/payload/ and optionally updates cache in canon repo.
 */
export async function enrich(options: EnrichOptions): Promise<MovieTitles> {
  const {
    canonPath,
    outDir,
    cachePath = join(canonPath, 'movie_titles.json'),
    apiKey = process.env.TMDB_API_KEY?.trim(),
    rateLimitMs = 250,
  } = options;

  const editions = loadEditions(canonPath);
  const tmdbIds = extractTmdbIds(editions);

  let cache = loadCache(cachePath);
  const missing = tmdbIds.filter((id) => !cache[String(id)]);

  if (missing.length > 0 && apiKey) {
    console.log(`[enrich] Fetching ${missing.length} movie(s) from TMDB...`);
    for (const id of missing) {
      const info = await fetchTmdbMovie(id, apiKey);
      if (info) cache[String(id)] = info;
      await delay(rateLimitMs);
    }
    // Append-only: write back to canon cache so future builds reuse
    mkdirSync(canonPath, { recursive: true });
    writeFileSync(cachePath, JSON.stringify(cache, null, 2), 'utf-8');
    console.log(`[enrich] Updated ${cachePath}`);
  } else if (missing.length > 0 && !apiKey) {
    console.log(`[enrich] Skipping ${missing.length} uncached movie(s). Set TMDB_API_KEY to fetch.`);
  }

  const payloadDir = join(outDir, 'payload');
  mkdirSync(payloadDir, { recursive: true });
  const outputPath = join(payloadDir, 'movie_titles.json');
  writeFileSync(outputPath, JSON.stringify(cache, null, 2), 'utf-8');
  console.log(`[enrich] Wrote ${outputPath} (${Object.keys(cache).length} movies)`);

  return cache;
}
