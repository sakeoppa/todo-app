import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomBytes } from 'node:crypto';

const mutexes = new Map<string, Promise<void>>();

function withMutex<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const prev = mutexes.get(key) ?? Promise.resolve();
  let release!: () => void;
  const next = new Promise<void>((res) => { release = res; });
  const chain = prev.then(() => next);
  mutexes.set(key, chain);
  return prev.then(fn).finally(() => {
    release();
    if (mutexes.get(key) === chain) mutexes.delete(key);
  });
}

export async function readJson<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    return JSON.parse(raw) as T;
  } catch (err) {
    const e = err as NodeJS.ErrnoException;
    if (e.code !== 'ENOENT') {
      console.warn(`[atomic-json] failed to read ${filePath}:`, e.message);
    }
    return fallback;
  }
}

export function writeJsonAtomic<T>(filePath: string, data: T): Promise<void> {
  return withMutex(filePath, async () => {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    const tmp = `${filePath}.tmp-${process.pid}-${randomBytes(4).toString('hex')}`;
    await fs.writeFile(tmp, JSON.stringify(data, null, 2), 'utf8');
    await fs.rename(tmp, filePath);
  });
}

export async function updateJson<T>(
  filePath: string,
  fallback: T,
  updater: (current: T) => T | Promise<T>,
): Promise<T> {
  return withMutex(filePath, async () => {
    const current = await readJson(filePath, fallback);
    const next = await updater(current);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    const tmp = `${filePath}.tmp-${process.pid}-${randomBytes(4).toString('hex')}`;
    await fs.writeFile(tmp, JSON.stringify(next, null, 2), 'utf8');
    await fs.rename(tmp, filePath);
    return next;
  });
}
