#!/usr/bin/env npx tsx
/**
 * Validate canon before build. Delegates to majestic-canon validate, then checks schema load.
 */
import { loadCanonSchema, getCanonPath } from '../src/loadCanon.js';
import { runCanonValidation } from '../src/validate.js';

const canonPath = process.env.MAJESTIC_CANON_PATH ?? getCanonPath();

try {
  loadCanonSchema(canonPath);
  const { ok, stderr } = runCanonValidation(canonPath);
  if (!ok) {
    console.error('Canon validation failed:', stderr);
    process.exit(1);
  }
  console.log('OK: canon-tools validation passed');
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}
