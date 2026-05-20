import type { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { connectStdio } from './client';
import type { McpServerConfig } from '@/lib/store/types';

export type ListedTool = {
  name: string;
  description: string;
  inputSchema: { type: 'object'; properties?: Record<string, unknown>; required?: string[] };
};

export type ConnectedServer = {
  cfg: McpServerConfig;
  client: Client;
  tools: ListedTool[];
};

export type FailedServer = { cfg: McpServerConfig; error: string };

export async function openAll(cfgs: McpServerConfig[]): Promise<{
  connected: ConnectedServer[];
  failed: FailedServer[];
}> {
  const results = await Promise.allSettled(cfgs.map(async (cfg) => {
    const client = await connectStdio(cfg);
    const { tools } = await client.listTools();
    return {
      cfg,
      client,
      tools: tools.map((t) => ({
        name: t.name,
        description: t.description ?? '',
        inputSchema: (t.inputSchema as ListedTool['inputSchema']) ?? { type: 'object' },
      })),
    };
  }));

  const connected: ConnectedServer[] = [];
  const failed: FailedServer[] = [];
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') connected.push(r.value);
    else failed.push({ cfg: cfgs[i], error: r.reason instanceof Error ? r.reason.message : String(r.reason) });
  });
  return { connected, failed };
}

export async function closeAll(servers: ConnectedServer[]): Promise<void> {
  await Promise.allSettled(servers.map((s) => s.client.close()));
}
