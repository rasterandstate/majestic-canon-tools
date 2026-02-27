#!/usr/bin/env npx tsx
/**
 * Validate identity_redirects.json.
 * Ensures: no redirect to non-existent edition, no v4->v3, no chains, no duplicates.
 * Fail CI if invalid.
 *
 * pnpm run validate:identity-redirects
 */
import { readFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';
import { toCanonicalShape } from '../src/toCanonicalShape.js';
import { getCanonPath, loadRegions } from '../src/loadCanon.js';
import {
  computeEditionIdentityHash,
  computeEditionIdentityHashV3,
} from '../src/editionIdentity.js';
import { resolveIdentity } from '../src/resolveIdentity.js';

function main(): void {
  const canonPath = process.env.CANON_PATH ?? getCanonPath();
  const editionsDir = join(canonPath, 'editions');
  const redirectPath = join(canonPath, 'identity_redirects.json');

  if (!existsSync(editionsDir)) {
    console.error('editions/ not found');
    process.exit(1);
  }
  if (!existsSync(redirectPath)) {
    console.error('identity_redirects.json not found');
    process.exit(1);
  }

  const redirects = JSON.parse(readFileSync(redirectPath, 'utf-8')) as Record<string, string>;
  const { mappings } = loadRegions(canonPath);
  const files = readdirSync(editionsDir).filter((f) => f.endsWith('.json')).sort();

  const v4Hashes = new Set<string>();
  for (const file of files) {
    const filePath = join(editionsDir, file);
    let content: string;
    try {
      content = readFileSync(filePath, 'utf-8');
    } catch {
      continue;
    }
    let items: unknown[];
    try {
      items = JSON.parse(content) as unknown[];
      if (!Array.isArray(items)) items = [items];
    } catch {
      continue;
    }
    for (const item of items) {
      const canonical = toCanonicalShape(item);
      const v4 = computeEditionIdentityHash(canonical, mappings);
      v4Hashes.add(v4);
    }
  }

  const errors: string[] = [];

  // No redirect maps to non-existent edition
  for (const [from, to] of Object.entries(redirects)) {
    if (!v4Hashes.has(to)) {
      errors.push(`Redirect target does not exist: ${from} → ${to}`);
    }
  }

  // No v4 maps back to v3 (target must be v4)
  for (const to of Object.values(redirects)) {
    if (to.startsWith('edition:v3:') || to.startsWith('edition:v2:') || to.startsWith('edition:v1:')) {
      errors.push(`Redirect target must be v4, got: ${to}`);
    }
  }

  // No chains: target must not be a key
  for (const [from, to] of Object.entries(redirects)) {
    if (redirects[to] != null) {
      errors.push(`Redirect chain: ${from} → ${to} → ... (must be flattened)`);
    }
  }

  // No duplicates: each key appears once
  const seen = new Set<string>();
  for (const k of Object.keys(redirects)) {
    if (seen.has(k)) errors.push(`Duplicate redirect key: ${k}`);
    seen.add(k);
  }

  // Single-hop resolution: resolveIdentity must not throw
  for (const identity of Object.keys(redirects)) {
    try {
      resolveIdentity(identity, redirects);
    } catch (e) {
      errors.push(`resolveIdentity failed for ${identity}: ${(e as Error).message}`);
    }
  }

  // Optional: v3→v4 coverage - warn if edition has different v3/v4 and no redirect
  for (const file of files) {
    const filePath = join(editionsDir, file);
    try {
      const content = readFileSync(filePath, 'utf-8');
      const items = (JSON.parse(content) as unknown[] | unknown);
      const arr = Array.isArray(items) ? items : [items];
      for (const item of arr) {
        const canonical = toCanonicalShape(item);
        const v4 = computeEditionIdentityHash(canonical, mappings);
        const v3 = computeEditionIdentityHashV3(canonical, mappings);
        if (v3 !== v4 && !redirects[v3]) {
          errors.push(`Missing v3→v4 redirect: ${v3} (edition hashes to ${v4})`);
        }
      }
    } catch {
      /* skip */
    }
  }

  if (errors.length > 0) {
    for (const e of errors) console.error(e);
    process.exit(1);
  }
  console.log('identity_redirects.json valid');
}

main();
