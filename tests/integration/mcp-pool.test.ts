// @vitest-environment node
import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { openAll, closeAll } from '@/lib/mcp/pool';
import { toAnthropicTools } from '@/lib/mcp/adapter';
import type { McpServerConfig } from '@/lib/store/types';

const fixturePath = path.join(process.cwd(), 'tests', 'fixtures', 'echo-mcp-server.ts');

const cfg: McpServerConfig = {
  id: 'fixture',
  name: 'echo',
  transport: 'stdio',
  command: process.execPath,
  args: ['--experimental-strip-types', '--no-warnings', fixturePath],
};

describe('integration: openAll against echo fixture', () => {
  it('connects, lists the echo tool, and invokes it', async () => {
    const { connected, failed } = await openAll([cfg]);
    try {
      expect(failed).toEqual([]);
      expect(connected).toHaveLength(1);
      expect(connected[0].tools.map((t) => t.name)).toEqual(['echo']);

      const adapted = toAnthropicTools(connected);
      expect(adapted).toHaveLength(1);
      expect(adapted[0].name).toBe('echo__echo');

      const result = await adapted[0].run({ text: 'hi' });
      expect(result).toBe('echo: hi');
    } finally {
      await closeAll(connected);
    }
  }, 20000);
});
