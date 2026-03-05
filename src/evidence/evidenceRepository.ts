/**
 * Evidence repository — reads/writes canon/evidence/.
 */
import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync } from 'fs';
import { join } from 'path';
import { getCanonPath } from '../loadCanon.js';
import type { EvidenceRecord } from './types.js';

const VALID_SOURCES = ['disq', 'tmdb', 'disc', 'manual'] as const;

function getEvidenceRoot(canonPath?: string): string {
  return join(canonPath ?? getCanonPath(), 'evidence');
}

function getSourceDir(source: string, canonPath?: string): string {
  const root = getEvidenceRoot(canonPath);
  const normalized = VALID_SOURCES.includes(source as (typeof VALID_SOURCES)[number]) ? source : source.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
  return join(root, normalized);
}

function ensureDir(dir: string): void {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function normalizeGtin(val: unknown): string {
  return String(val ?? '').replace(/\D/g, '');
}

export async function loadEvidence(source: string, canonPath?: string): Promise<EvidenceRecord[]> {
  const dir = getSourceDir(source, canonPath);
  if (!existsSync(dir)) return [];

  const files = readdirSync(dir).filter((f) => f.endsWith('.json'));
  const records: EvidenceRecord[] = [];

  for (const file of files) {
    try {
      const raw = JSON.parse(readFileSync(join(dir, file), 'utf-8')) as EvidenceRecord;
      if (raw?.id && raw?.source && raw?.entity_type && raw?.primary_id && raw?.created_at && typeof raw.data === 'object') {
        records.push(raw);
      }
    } catch {
      /* skip */
    }
  }

  return records.sort((a, b) => (a.created_at < b.created_at ? -1 : 1));
}

export async function saveEvidence(record: EvidenceRecord, canonPath?: string): Promise<void> {
  const path = canonPath ?? getCanonPath();
  const dir = getSourceDir(record.source, path);
  ensureDir(dir);

  const filename = `${record.source}_${record.primary_id}.json`;
  const filePath = join(dir, filename);

  if (existsSync(filePath)) {
    throw new Error(`Evidence already exists: ${filename} (evidence is immutable)`);
  }

  writeFileSync(filePath, JSON.stringify(record, null, 2), 'utf-8');
}

export async function getEvidenceByGTIN(gtin: string, canonPath?: string): Promise<EvidenceRecord[]> {
  const target = normalizeGtin(gtin);
  if (!target) return [];

  const all: EvidenceRecord[] = [];
  for (const source of VALID_SOURCES) {
    const records = await loadEvidence(source, canonPath);
    for (const r of records) {
      const gtinVal = r.data?.gtin ?? r.data?.ean ?? r.data?.upc ?? (r.entity_type === 'product' ? r.primary_id : null);
      if (normalizeGtin(gtinVal) === target) all.push(r);
    }
  }
  return all.sort((a, b) => (a.created_at < b.created_at ? -1 : 1));
}

export async function getEvidenceStats(canonPath?: string): Promise<Record<string, number>> {
  const stats: Record<string, number> = {};
  for (const source of VALID_SOURCES) {
    stats[source] = (await loadEvidence(source, canonPath)).length;
  }
  return stats;
}
