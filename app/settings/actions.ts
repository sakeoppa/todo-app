'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { mcpConfigStore } from '@/lib/store/mcp-config';
import { connectStdio } from '@/lib/mcp/client';

const addSchema = z.object({
  name: z.string().trim().min(1).max(60).regex(/^[A-Za-z0-9 _-]+$/, 'letters, digits, space, _ or - only'),
  command: z.string().trim().min(1),
  argsText: z.string().default(''),
  envText: z.string().default(''),
});

export type AddServerState = { error?: string };

function parseLines(text: string): string[] {
  return text.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
}

function parseEnv(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of parseLines(text)) {
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    out[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
  }
  return out;
}

export async function addMcpServer(_prev: AddServerState, formData: FormData): Promise<AddServerState> {
  const parsed = addSchema.safeParse({
    name: formData.get('name'),
    command: formData.get('command'),
    argsText: formData.get('args') ?? '',
    envText: formData.get('env') ?? '',
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'invalid input' };

  const env = parseEnv(parsed.data.envText);
  try {
    await mcpConfigStore.add({
      name: parsed.data.name,
      transport: 'stdio',
      command: parsed.data.command,
      args: parseLines(parsed.data.argsText),
      env: Object.keys(env).length ? env : undefined,
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'failed to add' };
  }
  revalidatePath('/settings');
  return {};
}

export async function removeMcpServer(id: string): Promise<void> {
  await mcpConfigStore.remove(id);
  revalidatePath('/settings');
}

export type TestResult = { ok: true; tools: string[] } | { ok: false; error: string };

export async function testMcpServer(id: string): Promise<TestResult> {
  const cfg = await mcpConfigStore.get(id);
  if (!cfg) return { ok: false, error: 'not found' };
  try {
    const client = await connectStdio(cfg);
    try {
      const { tools } = await client.listTools();
      return { ok: true, tools: tools.map((t) => t.name) };
    } finally {
      await client.close();
    }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
