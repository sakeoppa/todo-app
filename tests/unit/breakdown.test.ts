// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createTodoStore } from '@/lib/store/todos';
import { createMcpConfigStore } from '@/lib/store/mcp-config';

vi.mock('@/lib/mcp/pool', () => ({
  openAll: vi.fn(),
  closeAll: vi.fn(),
}));

const { toolRunnerMock } = vi.hoisted(() => ({ toolRunnerMock: vi.fn() }));

vi.mock('@anthropic-ai/sdk', () => {
  class Anthropic {
    beta = {
      messages: {
        toolRunner: (args: unknown) => toolRunnerMock(args),
      },
    };
  }
  return { default: Anthropic };
});

import { openAll, closeAll } from '@/lib/mcp/pool';
import { runBreakdown } from '@/lib/ai/breakdown';

function freshStores() {
  const dir = mkdtempSync(path.join(tmpdir(), 'breakdown-'));
  return {
    todos: createTodoStore(path.join(dir, 'todos.json')),
    cfg: createMcpConfigStore(path.join(dir, 'mcp.json')),
  };
}

// Build a fake BetaToolRunner-like object. The breakdown code only calls runUntilDone().
function fakeRunner(execute: (args: { tools: { name: string; run: (i: unknown) => Promise<string> | string }[] }) => Promise<void>) {
  let savedArgs: { tools: { name: string; run: (i: unknown) => Promise<string> | string }[] } | undefined;
  toolRunnerMock.mockImplementation((args: { tools: { name: string; run: (i: unknown) => Promise<string> | string }[] }) => {
    savedArgs = args;
    return {
      runUntilDone: async () => {
        if (savedArgs) await execute(savedArgs);
        return { id: 'msg', content: [] };
      },
    };
  });
}

beforeEach(() => {
  vi.mocked(openAll).mockReset();
  vi.mocked(closeAll).mockReset();
  toolRunnerMock.mockReset();
  process.env.ANTHROPIC_API_KEY = 'test-key';
});

describe('runBreakdown', () => {
  it('returns missing_api_key when env var is absent', async () => {
    const { todos, cfg } = freshStores();
    const t = await todos.add('parent');
    delete process.env.ANTHROPIC_API_KEY;
    const res = await runBreakdown({ todoId: t.id, todoStore: todos, mcpConfigStore: cfg });
    expect(res).toEqual({ ok: false, error: 'missing_api_key' });
  });

  it('returns not_found for an unknown todo', async () => {
    const { todos, cfg } = freshStores();
    const res = await runBreakdown({ todoId: 'nope', todoStore: todos, mcpConfigStore: cfg });
    expect(res).toEqual({ ok: false, error: 'not_found' });
  });

  it('records sub-tasks when the runner calls record_sub_tasks', async () => {
    const { todos, cfg } = freshStores();
    const t = await todos.add('Build a treehouse');
    vi.mocked(openAll).mockResolvedValue({ connected: [], failed: [] });
    vi.mocked(closeAll).mockResolvedValue();

    fakeRunner(async ({ tools }) => {
      const record = tools.find((tt) => tt.name === 'record_sub_tasks')!;
      await record.run({ subTasks: [{ title: 'plan' }, { title: 'gather wood' }] });
    });

    const res = await runBreakdown({ todoId: t.id, todoStore: todos, mcpConfigStore: cfg });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.subTasksAdded).toBe(2);
    const updated = await todos.get(t.id);
    expect(updated?.subTasks.map((s) => s.title)).toEqual(['plan', 'gather wood']);
  });

  it('reports failed MCP servers but still proceeds', async () => {
    const { todos, cfg } = freshStores();
    const t = await todos.add('parent');
    vi.mocked(openAll).mockResolvedValue({
      connected: [],
      failed: [{ cfg: { id: '1', name: 'broken', transport: 'stdio', command: 'x', args: [] }, error: 'boom' }],
    });
    vi.mocked(closeAll).mockResolvedValue();

    fakeRunner(async ({ tools }) => {
      const record = tools.find((tt) => tt.name === 'record_sub_tasks')!;
      await record.run({ subTasks: [{ title: 'a' }] });
    });

    const res = await runBreakdown({ todoId: t.id, todoStore: todos, mcpConfigStore: cfg });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.failedServers).toEqual(['broken']);
  });

  it('returns no_sub_tasks_recorded when the runner never calls record_sub_tasks', async () => {
    const { todos, cfg } = freshStores();
    const t = await todos.add('parent');
    vi.mocked(openAll).mockResolvedValue({ connected: [], failed: [] });
    vi.mocked(closeAll).mockResolvedValue();

    fakeRunner(async () => {
      // do nothing — record_sub_tasks is never called
    });

    const res = await runBreakdown({ todoId: t.id, todoStore: todos, mcpConfigStore: cfg });
    expect(res).toEqual({ ok: false, error: 'no_sub_tasks_recorded' });
  });
});
