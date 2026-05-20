import { betaTool } from '@anthropic-ai/sdk/helpers/beta/json-schema.mjs';
import type { ConnectedServer } from './pool';

type BetaToolOptions = Parameters<typeof betaTool>[0];
type BetaToolResult = ReturnType<typeof betaTool>;

export type AdaptedTool = BetaToolResult & {
  __server: string;
  __originalName: string;
  run: (input: Record<string, unknown>) => Promise<string>;
};

const SAFE = /^[A-Za-z0-9_-]+$/;

function safeName(s: string): string {
  return SAFE.test(s) ? s : s.replace(/[^A-Za-z0-9_-]/g, '_');
}

export function toAnthropicTools(servers: ConnectedServer[]): AdaptedTool[] {
  const out: AdaptedTool[] = [];
  for (const server of servers) {
    const prefix = safeName(server.cfg.name);
    for (const tool of server.tools) {
      const fullName = `${prefix}__${safeName(tool.name)}`;
      const run = async (input: Record<string, unknown>): Promise<string> => {
        const result = await server.client.callTool({
          name: tool.name,
          arguments: input,
        });
        const blocks = (result.content ?? []) as Array<{ type: string; text?: string }>;
        const text = blocks
          .filter((b): b is { type: 'text'; text: string } => b.type === 'text' && typeof b.text === 'string')
          .map((b) => b.text)
          .join('\n');
        return text || JSON.stringify(result);
      };
      const options = {
        name: fullName,
        description: tool.description || `Tool ${tool.name} from MCP server ${server.cfg.name}`,
        inputSchema: tool.inputSchema,
        run,
      } as unknown as BetaToolOptions;
      const adapted = betaTool(options) as AdaptedTool;
      adapted.__server = server.cfg.name;
      adapted.__originalName = tool.name;
      adapted.run = run;
      out.push(adapted);
    }
  }
  return out;
}
