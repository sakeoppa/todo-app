// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { McpServerConfig } from '@/lib/store/types';

vi.mock('@/lib/mcp/client', () => ({
  connectStdio: vi.fn(),
}));

import { connectStdio } from '@/lib/mcp/client';
import { openAll, closeAll } from '@/lib/mcp/pool';

const mockClient = (tools: { name: string; description?: string }[]) => ({
  listTools: vi.fn().mockResolvedValue({ tools: tools.map(t => ({
    name: t.name,
    description: t.description ?? '',
    inputSchema: { type: 'object', properties: {} },
  })) }),
  callTool: vi.fn(),
  close: vi.fn().mockResolvedValue(undefined),
});

const cfg = (name: string): McpServerConfig => ({
  id: `id-${name}`, name, transport: 'stdio', command: 'x', args: [],
});

beforeEach(() => vi.mocked(connectStdio).mockReset());

describe('openAll', () => {
  it('connects to every server and gathers tools', async () => {
    vi.mocked(connectStdio)
      .mockResolvedValueOnce(mockClient([{ name: 'a' }]) as never)
      .mockResolvedValueOnce(mockClient([{ name: 'b' }]) as never);

    const { connected, failed } = await openAll([cfg('s1'), cfg('s2')]);
    expect(failed).toEqual([]);
    expect(connected).toHaveLength(2);
    expect(connected[0].tools[0].name).toBe('a');
    expect(connected[1].tools[0].name).toBe('b');
  });

  it('reports failures without aborting the rest', async () => {
    vi.mocked(connectStdio)
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce(mockClient([{ name: 'ok' }]) as never);

    const { connected, failed } = await openAll([cfg('bad'), cfg('good')]);
    expect(connected).toHaveLength(1);
    expect(connected[0].cfg.name).toBe('good');
    expect(failed).toHaveLength(1);
    expect(failed[0].cfg.name).toBe('bad');
    expect(failed[0].error).toMatch(/boom/);
  });
});

describe('closeAll', () => {
  it('closes every connected client even if one throws', async () => {
    const a = mockClient([]);
    const b = mockClient([]);
    b.close.mockRejectedValueOnce(new Error('close failed'));
    await closeAll([
      { cfg: cfg('a'), client: a as never, tools: [] },
      { cfg: cfg('b'), client: b as never, tools: [] },
    ]);
    expect(a.close).toHaveBeenCalled();
    expect(b.close).toHaveBeenCalled();
  });
});
