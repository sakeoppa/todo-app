import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import type { McpServerConfig } from '@/lib/store/types';

export async function connectStdio(cfg: McpServerConfig): Promise<Client> {
  if (cfg.transport !== 'stdio') {
    throw new Error(`unsupported transport: ${cfg.transport}`);
  }
  const env: Record<string, string> | undefined = cfg.env
    ? Object.fromEntries(
        Object.entries({ ...process.env, ...cfg.env }).filter(
          (entry): entry is [string, string] => typeof entry[1] === 'string',
        ),
      )
    : undefined;
  const transport = new StdioClientTransport({
    command: cfg.command,
    args: cfg.args,
    env,
  });
  const client = new Client(
    { name: 'todo-app', version: '0.1.0' },
    { capabilities: {} },
  );
  await client.connect(transport);
  return client;
}
