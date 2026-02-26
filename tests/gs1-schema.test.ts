import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { getCanonPath } from '../src/loadCanon.js';

const canonPath = getCanonPath();
const gs1Dir = path.join(canonPath, 'gs1');

describe('GS1 registry schema', () => {
  if (!fs.existsSync(gs1Dir)) {
    it.skip('gs1 directory not found (MAJESTIC_CANON_PATH may be unset)', () => {});
    return;
  }

  for (const file of fs.readdirSync(gs1Dir)) {
    if (!file.endsWith('.json')) continue;

    const data = JSON.parse(fs.readFileSync(path.join(gs1Dir, file), 'utf8'));

    it(`${file} contains no publisher_id`, () => {
      expect(data.publisher_id).toBeUndefined();
    });
  }
});
