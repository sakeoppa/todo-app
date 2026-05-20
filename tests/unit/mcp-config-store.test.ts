// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createMcpConfigStore } from '@/lib/store/mcp-config';

function fresh() {
  const dir = mkdtempSync(path.join(tmpdir(), 'mcp-config-'));
  return createMcpConfigStore(path.join(dir, 'mcp.json'));
}

describe('mcp config store', () => {
  let store: ReturnType<typeof fresh>;
  beforeEach(() => { store = fresh(); });

  it('starts empty', async () => {
    expect(await store.list()).toEqual([]);
  });

  it('adds a stdio server', async () => {
    const s = await store.add({
      name: 'everything',
      transport: 'stdio',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-everything'],
    });
    expect(s.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(s.name).toBe('everything');
    expect((await store.list())).toHaveLength(1);
  });

  it('rejects duplicate names', async () => {
    await store.add({ name: 'a', transport: 'stdio', command: 'x', args: [] });
    await expect(
      store.add({ name: 'a', transport: 'stdio', command: 'x', args: [] }),
    ).rejects.toThrow(/duplicate/i);
  });

  it('removes a server', async () => {
    const a = await store.add({ name: 'a', transport: 'stdio', command: 'x', args: [] });
    await store.remove(a.id);
    expect(await store.list()).toEqual([]);
  });
});
