// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { toAnthropicTools } from '@/lib/mcp/adapter';
import type { ConnectedServer } from '@/lib/mcp/pool';

function makeServer(name: string, toolNames: string[]): ConnectedServer {
  const client = {
    callTool: vi.fn().mockImplementation(async ({ name: tool, arguments: args }) => ({
      content: [{ type: 'text', text: `called ${tool} with ${JSON.stringify(args)}` }],
    })),
    listTools: vi.fn(), close: vi.fn(),
  };
  return {
    cfg: { id: `id-${name}`, name, transport: 'stdio', command: 'x', args: [] },
    client: client as never,
    tools: toolNames.map((t) => ({
      name: t,
      description: `desc-${t}`,
      inputSchema: { type: 'object', properties: { q: { type: 'string' } }, required: ['q'] },
    })),
  };
}

describe('toAnthropicTools', () => {
  it('prefixes tool names with the server name', () => {
    const tools = toAnthropicTools([makeServer('alpha', ['echo'])]);
    expect(tools).toHaveLength(1);
    expect(tools[0].name).toBe('alpha__echo');
  });

  it('routes invocations to the originating client', async () => {
    const a = makeServer('a', ['echo']);
    const b = makeServer('b', ['echo']);
    const tools = toAnthropicTools([a, b]);
    const aTool = tools.find((t) => t.name === 'a__echo')!;
    const bTool = tools.find((t) => t.name === 'b__echo')!;
    await aTool.run({ q: '1' });
    await bTool.run({ q: '2' });
    expect(a.client.callTool).toHaveBeenCalledWith({ name: 'echo', arguments: { q: '1' } });
    expect(b.client.callTool).toHaveBeenCalledWith({ name: 'echo', arguments: { q: '2' } });
  });

  it('stringifies text content blocks of the tool result', async () => {
    const tools = toAnthropicTools([makeServer('s', ['echo'])]);
    const result = await tools[0].run({ q: 'hello' });
    expect(result).toContain('called echo with {"q":"hello"}');
  });
});
