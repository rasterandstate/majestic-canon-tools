import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

describe('private key hygiene', () => {
  it('no .pem files are tracked by git', () => {
    const result = execSync('git ls-files "*.pem"', {
      cwd: ROOT,
      encoding: 'utf-8',
    }).trim();
    expect(result).toBe('');
  });
});
