#!/usr/bin/env npx tsx
/**
 * GS1 canon integrity validation.
 * Scans editions, checks prefix exists and matches publisher.
 * Run: pnpm run gs1:validate (from majestic-canon-tools)
 */
import { readFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';
import { getCanonPath } from '../src/loadCanon.js';

const canonPath = process.env.MAJESTIC_CANON_PATH ?? process.env.MAJESTIC_CANON_REPO_PATH ?? getCanonPath();

function normalizeUpc(upc: string): string {
  let digits = String(upc ?? '').replace(/\D/g, '');
  if (digits.length === 12) digits = '0' + digits;
  return digits;
}

interface Gs1Entry {
  company_prefix: string;
  company_name: string;
  publisher_id?: string | null;
  valid_to?: string | null;
}

function loadGs1Registry(path: string): Map<string, Gs1Entry> {
  const gs1Dir = join(path, 'gs1');
  const map = new Map<string, Gs1Entry>();
  if (!existsSync(gs1Dir)) return map;
  const files = readdirSync(gs1Dir).filter((f) => f.endsWith('.json'));
  for (const f of files) {
    try {
      const raw = JSON.parse(readFileSync(join(gs1Dir, f), 'utf-8')) as Gs1Entry;
      if (raw.valid_to == null) map.set(raw.company_prefix, raw);
    } catch {
      /* skip */
    }
  }
  return map;
}

function resolvePrefix(upc: string, registry: Map<string, Gs1Entry>): Gs1Entry | null {
  const normalized = normalizeUpc(upc);
  if (normalized.length < 6) return null;
  for (let len = Math.min(normalized.length, 12); len >= 6; len--) {
    const candidate = normalized.substring(0, len);
    const entry = registry.get(candidate);
    if (entry) return entry;
  }
  return null;
}

function loadEditions(path: string): Array<{ file: string; data: Record<string, unknown> }> {
  const editionsDir = join(path, 'editions');
  if (!existsSync(editionsDir)) return [];
  const files = readdirSync(editionsDir).filter((f) => f.endsWith('.json'));
  const out: Array<{ file: string; data: Record<string, unknown> }> = [];
  for (const f of files) {
    try {
      const data = JSON.parse(readFileSync(join(editionsDir, f), 'utf-8')) as Record<string, unknown>;
      out.push({ file: f, data });
    } catch {
      /* skip */
    }
  }
  return out;
}

function main() {
  const registry = loadGs1Registry(canonPath);
  const editions = loadEditions(canonPath);

  let ok = 0;
  let mismatch = 0;
  let unknown = 0;

  for (const { file, data } of editions) {
    const upc = (data.upc ?? (data.barcode as { upc?: string })?.upc) as string | undefined;
    if (!upc || String(upc).replace(/\D/g, '').length < 6) continue;

    const publisher = (data.publisher as string) ?? '';
    const entry = resolvePrefix(upc, registry);

    if (!entry) {
      console.log(`✗ ${upc} Unknown prefix`);
      unknown++;
      continue;
    }

    const regPublisher = entry.publisher_id ?? null;
    if (regPublisher && publisher && regPublisher !== publisher) {
      console.log(`⚠ ${upc} Publisher mismatch`);
      console.log(`  Canon: ${publisher}`);
      console.log(`  GS1: ${regPublisher}`);
      mismatch++;
    } else {
      console.log(`✓ ${upc} ${entry.company_name} OK`);
      ok++;
    }
  }

  console.log('');
  console.log(`Summary: ${ok} OK, ${mismatch} mismatch, ${unknown} unknown prefix`);
  process.exit(mismatch > 0 || unknown > 0 ? 1 : 0);
}

main();
