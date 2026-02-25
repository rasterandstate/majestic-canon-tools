/**
 * Run canon validation before build. Invokes majestic-canon's validate script.
 */
import { spawnSync } from 'child_process';
import { join } from 'path';

export function runCanonValidation(canonPath: string): { ok: boolean; stderr: string } {
  const result = spawnSync('pnpm', ['run', 'validate'], {
    cwd: canonPath,
    encoding: 'utf-8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return {
    ok: result.status === 0,
    stderr: result.stderr ?? '',
  };
}
