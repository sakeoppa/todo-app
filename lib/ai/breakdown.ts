import Anthropic from '@anthropic-ai/sdk';
import { betaTool } from '@anthropic-ai/sdk/helpers/beta/json-schema.mjs';
import { BREAKDOWN_SYSTEM_PROMPT, breakdownUserPrompt } from './prompts';
import { runOllamaBreakdown } from './ollama';
import { preferencesStore } from '@/lib/store/preferences';
import { todoStore } from '@/lib/store/todos';

export type BreakdownResult =
  | { ok: true; subTasksAdded: number }
  | { ok: false; error: 'missing_api_key' | 'not_found' | 'no_sub_tasks_recorded' | 'runner_failed'; detail?: string };

export type RunBreakdownArgs = {
  todoId: string;
};

export async function runBreakdown(args: RunBreakdownArgs): Promise<BreakdownResult> {
  const { todoId } = args;

  const todo = await todoStore.get(todoId);
  if (!todo) return { ok: false, error: 'not_found' };

  const prefs = await preferencesStore.get();

  // ── Ollama path ───────────────────────────────────────────────────────────
  if (prefs.aiProvider === 'ollama') {
    if (!prefs.ollamaModel) return { ok: false, error: 'missing_api_key' };
    try {
      const subTasks = await runOllamaBreakdown(
        todo.title,
        prefs.ollamaUrl || 'http://localhost:11434',
        prefs.ollamaModel,
      );
      if (!subTasks.length) return { ok: false, error: 'no_sub_tasks_recorded' };
      await todoStore.appendSubTasks(todoId, subTasks);
      return { ok: true, subTasksAdded: subTasks.length };
    } catch (err) {
      return { ok: false, error: 'runner_failed', detail: err instanceof Error ? err.message : String(err) };
    }
  }

  // ── Anthropic path ────────────────────────────────────────────────────────
  const apiKey = prefs.anthropicApiKey || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { ok: false, error: 'missing_api_key' };

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
      tools: [recordSubTasks],
    });
    await runner.runUntilDone();
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    return { ok: false, error: 'runner_failed', detail };
  }

  if (!captured) return { ok: false, error: 'no_sub_tasks_recorded' };

  await todoStore.appendSubTasks(todoId, captured);
  return { ok: true, subTasksAdded: (captured as { title: string }[]).length };
}
