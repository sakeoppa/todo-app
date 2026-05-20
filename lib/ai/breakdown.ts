import Anthropic from '@anthropic-ai/sdk';
import { betaTool } from '@anthropic-ai/sdk/helpers/beta/json-schema.mjs';
import { openAll, closeAll } from '@/lib/mcp/pool';
import { toAnthropicTools } from '@/lib/mcp/adapter';
import { BREAKDOWN_SYSTEM_PROMPT, breakdownUserPrompt } from './prompts';
import type { createTodoStore } from '@/lib/store/todos';
import type { createMcpConfigStore } from '@/lib/store/mcp-config';

export type BreakdownResult =
  | { ok: true; subTasksAdded: number; failedServers: string[] }
  | { ok: false; error: 'missing_api_key' | 'not_found' | 'no_sub_tasks_recorded' | 'runner_failed'; detail?: string };

export type RunBreakdownArgs = {
  todoId: string;
  todoStore: ReturnType<typeof createTodoStore>;
  mcpConfigStore: ReturnType<typeof createMcpConfigStore>;
};

export async function runBreakdown(args: RunBreakdownArgs): Promise<BreakdownResult> {
  const { todoId, todoStore, mcpConfigStore } = args;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { ok: false, error: 'missing_api_key' };

  const todo = await todoStore.get(todoId);
  if (!todo) return { ok: false, error: 'not_found' };

  const servers = await mcpConfigStore.list();
  const { connected, failed } = await openAll(servers);

  try {
    const mcpTools = toAnthropicTools(connected);

    let captured: { title: string }[] | null = null;
    const recordSubTasks = betaTool({
      name: 'record_sub_tasks',
      description: 'Record the final list of sub-tasks for the user. Call this exactly once at the end.',
      inputSchema: {
        type: 'object',
        properties: {
          subTasks: {
            type: 'array',
            items: {
              type: 'object',
              properties: { title: { type: 'string', maxLength: 200 } },
              required: ['title'],
            },
            minItems: 1,
            maxItems: 12,
          },
        },
        required: ['subTasks'],
      } as const,
      run: (input) => {
        captured = (input as { subTasks: { title: string }[] }).subTasks
          .map((s) => ({ title: String(s.title).slice(0, 200) }));
        return 'ok';
      },
    });

    const anthropic = new Anthropic({ apiKey });

    try {
      const runner = anthropic.beta.messages.toolRunner({
        model: process.env.BREAKDOWN_MODEL ?? 'claude-sonnet-4-6',
        max_tokens: 2048,
        max_iterations: 10,
        system: BREAKDOWN_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: breakdownUserPrompt(todo.title) }],
        tools: [...mcpTools, recordSubTasks],
      });
      await runner.runUntilDone();
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      return { ok: false, error: 'runner_failed', detail };
    }

    if (!captured) return { ok: false, error: 'no_sub_tasks_recorded' };

    await todoStore.appendSubTasks(todoId, captured);
    return { ok: true, subTasksAdded: (captured as { title: string }[]).length, failedServers: failed.map((f) => f.cfg.name) };
  } finally {
    await closeAll(connected);
  }
}
