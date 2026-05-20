import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { readJson, updateJson } from './atomic-json';
import type { McpConfigFile, McpServerConfig } from './types';

const EMPTY: McpConfigFile = { servers: [] };

export type McpServerInput = Omit<McpServerConfig, 'id'>;

export function createMcpConfigStore(filePath: string) {
  return {
    async list(): Promise<McpServerConfig[]> {
      return (await readJson<McpConfigFile>(filePath, EMPTY)).servers;
    },

    async get(id: string): Promise<McpServerConfig | null> {
      const all = await this.list();
      return all.find((s) => s.id === id) ?? null;
    },

    async add(input: McpServerInput): Promise<McpServerConfig> {
      const cfg: McpServerConfig = { id: randomUUID(), ...input };
      await updateJson<McpConfigFile>(filePath, EMPTY, (cur) => {
        if (cur.servers.some((s) => s.name === input.name)) {
          throw new Error(`duplicate server name: ${input.name}`);
        }
        return { servers: [...cur.servers, cfg] };
      });
      return cfg;
    },

    async remove(id: string): Promise<void> {
      await updateJson<McpConfigFile>(filePath, EMPTY, (cur) => ({
        servers: cur.servers.filter((s) => s.id !== id),
      }));
    },
  };
}

export const mcpConfigStore = createMcpConfigStore(
  path.join(process.cwd(), 'data', 'mcp-config.json'),
);
