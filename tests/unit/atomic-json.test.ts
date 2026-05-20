// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { readJson, writeJsonAtomic } from '@/lib/store/atomic-json';

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), 'atomic-json-'));
});

describe('readJson', () => {
  it('returns the default when the file is missing', async () => {
    const result = await readJson(path.join(dir, 'missing.json'), { a: 1 });
    expect(result).toEqual({ a: 1 });
  });

  it('returns the default when the file is corrupt', async () => {
    const p = path.join(dir, 'corrupt.json');
    writeFileSync(p, 'not json{');
    const result = await readJson(p, { a: 1 });
    expect(result).toEqual({ a: 1 });
  });
});

describe('writeJsonAtomic', () => {
  it('writes a JSON file that round-trips', async () => {
    const p = path.join(dir, 'data.json');
    await writeJsonAtomic(p, { hello: 'world' });
    expect(JSON.parse(readFileSync(p, 'utf8'))).toEqual({ hello: 'world' });
  });

  it('serializes concurrent writes per path', async () => {
    const p = path.join(dir, 'concurrent.json');
    await Promise.all(
      Array.from({ length: 20 }, (_, i) => writeJsonAtomic(p, { n: i })),
    );
    const final = JSON.parse(readFileSync(p, 'utf8')) as { n: number };
    expect(typeof final.n).toBe('number');
    expect(final.n).toBeGreaterThanOrEqual(0);
    expect(final.n).toBeLessThan(20);
  });
});
