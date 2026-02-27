/**
 * resolveIdentity tests: single-hop redirect resolution, loop detection, chain detection.
 */
import { describe, it, expect } from 'vitest';
import { resolveIdentity } from '../src/resolveIdentity.js';

describe('resolveIdentity', () => {
  it('resolves direct v3 → v4', () => {
    const redirects: Record<string, string> = {
      'edition:v3:abc123': 'edition:v4:def456',
    };
    expect(resolveIdentity('edition:v3:abc123', redirects)).toBe('edition:v4:def456');
  });

  it('no redirect → returns identity unchanged', () => {
    const redirects: Record<string, string> = {};
    expect(resolveIdentity('edition:v4:abc123', redirects)).toBe('edition:v4:abc123');
  });

  it('identity not in redirects → returns identity unchanged', () => {
    const redirects: Record<string, string> = {
      'edition:v3:other': 'edition:v4:other',
    };
    expect(resolveIdentity('edition:v4:abc123', redirects)).toBe('edition:v4:abc123');
  });

  it('redirect loop throws (identity points to itself)', () => {
    const redirects: Record<string, string> = {
      'edition:v3:abc': 'edition:v3:abc',
    };
    expect(() => resolveIdentity('edition:v3:abc', redirects)).toThrow(/loop|chain/);
  });

  it('redirect chain throws (target is also a key)', () => {
    const redirects: Record<string, string> = {
      'edition:v3:a': 'edition:v4:b',
      'edition:v4:b': 'edition:v4:c',
    };
    expect(() => resolveIdentity('edition:v3:a', redirects)).toThrow(/chain/);
  });

  it('redirect to missing target is allowed (validation script checks existence)', () => {
    const redirects: Record<string, string> = {
      'edition:v3:old': 'edition:v4:nonexistent',
    };
    expect(resolveIdentity('edition:v3:old', redirects)).toBe('edition:v4:nonexistent');
  });

  it('single-hop enforcement: flattened map works', () => {
    const redirects: Record<string, string> = {
      'edition:v1:a': 'edition:v4:final',
      'edition:v2:b': 'edition:v4:final',
      'edition:v3:c': 'edition:v4:final',
    };
    expect(resolveIdentity('edition:v1:a', redirects)).toBe('edition:v4:final');
    expect(resolveIdentity('edition:v2:b', redirects)).toBe('edition:v4:final');
    expect(resolveIdentity('edition:v3:c', redirects)).toBe('edition:v4:final');
  });

  it('trims whitespace on input', () => {
    const redirects: Record<string, string> = {
      'edition:v3:abc': 'edition:v4:def',
    };
    expect(resolveIdentity('  edition:v3:abc  ', redirects)).toBe('edition:v4:def');
  });

  it('throws on empty string', () => {
    expect(() => resolveIdentity('', {})).toThrow(/non-empty string/);
  });

  it('throws on null/undefined identity', () => {
    expect(() => resolveIdentity(null as unknown as string, {})).toThrow();
    expect(() => resolveIdentity(undefined as unknown as string, {})).toThrow();
  });
});
