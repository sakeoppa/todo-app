# Next.js Todo App with MCP Client — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a single-user Next.js todo app (App Router, TypeScript) that persists to a local JSON file and exposes an "AI 분해" button per todo, which calls Claude with tools provided by user-registered MCP servers (stdio).

**Architecture:** App Router + Server Actions for CRUD. A small `lib/store` does atomic JSON I/O. A `lib/mcp` layer wraps `@modelcontextprotocol/sdk` to connect to stdio MCP servers per-request and surfaces their tools. `lib/ai/breakdown.ts` composes Anthropic SDK's `betaTool` + `toolRunner` with the MCP-derived tools plus a local `record_sub_tasks` tool that captures the final sub-task list back into the todo.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS, `@anthropic-ai/sdk`, `@modelcontextprotocol/sdk`, Zod, Vitest, @testing-library/react, happy-dom.

**Spec:** `docs/superpowers/specs/2026-05-20-nextjs-todo-mcp-design.md`

---

## File Map

Files created in this plan, grouped by responsibility:

**Scaffold (Task 1–2):**
- `package.json`, `tsconfig.json`, `next.config.ts`, `next-env.d.ts`
- `tailwind.config.ts`, `postcss.config.mjs`, `app/globals.css`
- `vitest.config.ts`, `vitest.setup.ts`
- `.env.example`, `.gitignore`

**Storage layer (Task 3–5):**
- `lib/store/types.ts` — shared types
- `lib/store/atomic-json.ts` — atomic read/write + per-path mutex
- `lib/store/todos.ts` — todo CRUD
- `lib/store/mcp-config.ts` — MCP server config CRUD

**MCP layer (Task 6–8):**
- `lib/mcp/client.ts` — `connectStdio`
- `lib/mcp/pool.ts` — `openAll` / `closeAll`
- `lib/mcp/adapter.ts` — MCP tool → Anthropic betaTool

**AI breakdown (Task 9–10):**
- `lib/ai/prompts.ts`
- `lib/ai/breakdown.ts`

**Server actions (Task 11–13):**
- `app/actions.ts` — todo + breakdown actions
- `app/settings/actions.ts` — MCP server actions

**UI (Task 14–18):**
- `app/layout.tsx`, `app/page.tsx`
- `app/components/AddTodoForm.tsx`
- `app/components/TodoList.tsx`, `app/components/TodoItem.tsx`
- `app/components/SubTaskList.tsx`
- `app/settings/page.tsx`
- `app/components/McpServerForm.tsx`, `app/components/McpServerList.tsx`

**Tests / fixtures (Task 19–20):**
- `tests/fixtures/echo-mcp-server.ts`
- `tests/integration/breakdown.test.ts`

**Docs (Task 21):**
- `README.md`

---

## Task 1: Project scaffold (package.json, configs, .gitignore)

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `next-env.d.ts`
- Create: `tailwind.config.ts`
- Create: `postcss.config.mjs`
- Create: `app/globals.css`
- Create: `.gitignore`
- Create: `.env.example`

The repo is already a git repo (`git init` was run during brainstorming). Work from `~/Projects/todo-app`.

- [ ] **Step 1: Write `package.json`**

```json
{
  "name": "todo-app",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "next": "^16.2.2",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "@anthropic-ai/sdk": "^0.40.0",
    "@modelcontextprotocol/sdk": "^1.0.0",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "typescript": "^5.6.3",
    "@types/node": "^22.10.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "tailwindcss": "^4.0.0",
    "@tailwindcss/postcss": "^4.0.0",
    "postcss": "^8.4.49",
    "autoprefixer": "^10.4.20",
    "vitest": "^2.1.8",
    "@vitejs/plugin-react": "^4.3.4",
    "@testing-library/react": "^16.1.0",
    "@testing-library/dom": "^10.4.0",
    "@testing-library/user-event": "^14.5.2",
    "@testing-library/jest-dom": "^6.6.3",
    "happy-dom": "^15.11.7"
  }
}
```

> Versions are minimum-known-good. If `npm install` reports a peer-dep conflict, prefer upgrading the dependency rather than downgrading peers.

- [ ] **Step 2: Write `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: Write `next.config.ts`**

```ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    serverActions: { bodySizeLimit: '1mb' },
  },
};

export default nextConfig;
```

- [ ] **Step 4: Write `next-env.d.ts`**

```ts
/// <reference types="next" />
/// <reference types="next/image-types/global" />
```

- [ ] **Step 5: Write Tailwind configs**

`tailwind.config.ts`:

```ts
import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}'],
  theme: { extend: {} },
  plugins: [],
};
export default config;
```

`postcss.config.mjs`:

```js
const config = {
  plugins: { '@tailwindcss/postcss': {} },
};
export default config;
```

`app/globals.css`:

```css
@import "tailwindcss";

:root {
  color-scheme: light dark;
}

body {
  @apply bg-white text-gray-900 dark:bg-gray-950 dark:text-gray-100;
}
```

- [ ] **Step 6: Write `.gitignore`**

```
node_modules/
.next/
.env
.env.local
.env.*.local
data/
coverage/
*.log
.DS_Store
```

- [ ] **Step 7: Write `.env.example`**

```
ANTHROPIC_API_KEY=
BREAKDOWN_MODEL=claude-sonnet-4-6
```

- [ ] **Step 8: Install dependencies**

Run: `npm install`
Expected: Installs without errors. (If peer conflicts arise, run `npm install --legacy-peer-deps` and note the conflict for follow-up.)

- [ ] **Step 9: Commit**

```bash
git add package.json package-lock.json tsconfig.json next.config.ts next-env.d.ts tailwind.config.ts postcss.config.mjs app/globals.css .gitignore .env.example
git commit -m "chore: scaffold Next.js + TypeScript + Tailwind + Vitest project"
```

---

## Task 2: Vitest setup

**Files:**
- Create: `vitest.config.ts`
- Create: `vitest.setup.ts`

- [ ] **Step 1: Write `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'happy-dom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    testTimeout: 15000,
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
});
```

- [ ] **Step 2: Write `vitest.setup.ts`**

```ts
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 3: Add a sanity test**

Create `tests/unit/sanity.test.ts`:

```ts
import { describe, it, expect } from 'vitest';

describe('sanity', () => {
  it('runs vitest', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 4: Run the test**

Run: `npx vitest run tests/unit/sanity.test.ts`
Expected: 1 test passes.

- [ ] **Step 5: Commit**

```bash
git add vitest.config.ts vitest.setup.ts tests/unit/sanity.test.ts
git commit -m "test: configure Vitest with happy-dom and jest-dom matchers"
```

---

## Task 3: Storage primitives — types & atomic JSON

**Files:**
- Create: `lib/store/types.ts`
- Create: `lib/store/atomic-json.ts`
- Test: `tests/unit/atomic-json.test.ts`

- [ ] **Step 1: Write `lib/store/types.ts`**

```ts
export type SubTask = {
  id: string;
  title: string;
  completed: boolean;
};

export type Todo = {
  id: string;
  title: string;
  completed: boolean;
  subTasks: SubTask[];
  createdAt: string;
  updatedAt: string;
};

export type TodosFile = { todos: Todo[] };

export type McpServerConfig = {
  id: string;
  name: string;
  transport: 'stdio';
  command: string;
  args: string[];
  env?: Record<string, string>;
};

export type McpConfigFile = { servers: McpServerConfig[] };
```

- [ ] **Step 2: Write the failing test**

`tests/unit/atomic-json.test.ts`:

```ts
// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { readJson, writeJsonAtomic } from '@/lib/store/atomic-json';

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), 'atomic-json-'));
});

describe('readJson', () => {
  it('returns the default when the file is missing', async () => {
    const result = await readJson(path.join(dir, 'missing.json'), { a: 1 });
    expect(result).toEqual({ a: 1 });
  });

  it('returns the default when the file is corrupt', async () => {
    const p = path.join(dir, 'corrupt.json');
    writeFileSync(p, 'not json{');
    const result = await readJson(p, { a: 1 });
    expect(result).toEqual({ a: 1 });
  });
});

describe('writeJsonAtomic', () => {
  it('writes a JSON file that round-trips', async () => {
    const p = path.join(dir, 'data.json');
    await writeJsonAtomic(p, { hello: 'world' });
    expect(JSON.parse(readFileSync(p, 'utf8'))).toEqual({ hello: 'world' });
  });

  it('serializes concurrent writes per path', async () => {
    const p = path.join(dir, 'concurrent.json');
    await Promise.all(
      Array.from({ length: 20 }, (_, i) => writeJsonAtomic(p, { n: i })),
    );
    const final = JSON.parse(readFileSync(p, 'utf8')) as { n: number };
    expect(typeof final.n).toBe('number');
    expect(final.n).toBeGreaterThanOrEqual(0);
    expect(final.n).toBeLessThan(20);
  });
});
```

- [ ] **Step 3: Run and verify it fails**

Run: `npx vitest run tests/unit/atomic-json.test.ts`
Expected: FAIL — module `@/lib/store/atomic-json` not found.

- [ ] **Step 4: Implement `lib/store/atomic-json.ts`**

```ts
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomBytes } from 'node:crypto';

const mutexes = new Map<string, Promise<void>>();

function withMutex<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const prev = mutexes.get(key) ?? Promise.resolve();
  let release!: () => void;
  const next = new Promise<void>((res) => { release = res; });
  const chain = prev.then(() => next);
  mutexes.set(key, chain);
  return prev.then(fn).finally(() => {
    release();
    if (mutexes.get(key) === chain) mutexes.delete(key);
  });
}

export async function readJson<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    return JSON.parse(raw) as T;
  } catch (err) {
    const e = err as NodeJS.ErrnoException;
    if (e.code !== 'ENOENT') {
      console.warn(`[atomic-json] failed to read ${filePath}:`, e.message);
    }
    return fallback;
  }
}

export function writeJsonAtomic<T>(filePath: string, data: T): Promise<void> {
  return withMutex(filePath, async () => {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    const tmp = `${filePath}.tmp-${process.pid}-${randomBytes(4).toString('hex')}`;
    await fs.writeFile(tmp, JSON.stringify(data, null, 2), 'utf8');
    await fs.rename(tmp, filePath);
  });
}

export async function updateJson<T>(
  filePath: string,
  fallback: T,
  updater: (current: T) => T | Promise<T>,
): Promise<T> {
  return withMutex(filePath, async () => {
    const current = await readJson(filePath, fallback);
    const next = await updater(current);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    const tmp = `${filePath}.tmp-${process.pid}-${randomBytes(4).toString('hex')}`;
    await fs.writeFile(tmp, JSON.stringify(next, null, 2), 'utf8');
    await fs.rename(tmp, filePath);
    return next;
  });
}
```

- [ ] **Step 5: Run tests, verify they pass**

Run: `npx vitest run tests/unit/atomic-json.test.ts`
Expected: 4 tests pass.

- [ ] **Step 6: Commit**

```bash
git add lib/store/types.ts lib/store/atomic-json.ts tests/unit/atomic-json.test.ts
git commit -m "feat(store): add atomic JSON read/write with per-path mutex"
```

---

## Task 4: Todo store

**Files:**
- Create: `lib/store/todos.ts`
- Test: `tests/unit/todos-store.test.ts`

- [ ] **Step 1: Write the failing test**

`tests/unit/todos-store.test.ts`:

```ts
// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createTodoStore } from '@/lib/store/todos';

function freshStore() {
  const dir = mkdtempSync(path.join(tmpdir(), 'todos-store-'));
  return createTodoStore(path.join(dir, 'todos.json'));
}

describe('todo store', () => {
  let store: ReturnType<typeof freshStore>;
  beforeEach(() => { store = freshStore(); });

  it('returns an empty list initially', async () => {
    expect(await store.list()).toEqual([]);
  });

  it('adds a todo with id, timestamps, empty sub-tasks', async () => {
    const t = await store.add('Write design doc');
    expect(t.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(t.title).toBe('Write design doc');
    expect(t.completed).toBe(false);
    expect(t.subTasks).toEqual([]);
    expect(t.createdAt).toBe(t.updatedAt);
    const all = await store.list();
    expect(all).toHaveLength(1);
  });

  it('toggles a todo', async () => {
    const t = await store.add('x');
    const toggled = await store.toggle(t.id);
    expect(toggled?.completed).toBe(true);
    expect(toggled?.updatedAt).not.toBe(t.updatedAt);
  });

  it('returns null when toggling a missing todo', async () => {
    expect(await store.toggle('does-not-exist')).toBeNull();
  });

  it('deletes a todo', async () => {
    const a = await store.add('a');
    const b = await store.add('b');
    await store.remove(a.id);
    const all = await store.list();
    expect(all.map((t) => t.id)).toEqual([b.id]);
  });

  it('appends sub-tasks', async () => {
    const t = await store.add('parent');
    const updated = await store.appendSubTasks(t.id, [
      { title: 'sub a' },
      { title: 'sub b' },
    ]);
    expect(updated?.subTasks).toHaveLength(2);
    expect(updated?.subTasks[0].title).toBe('sub a');
    expect(updated?.subTasks[0].completed).toBe(false);
    expect(updated?.subTasks[0].id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('toggles a sub-task', async () => {
    const t = await store.add('parent');
    const withSubs = await store.appendSubTasks(t.id, [{ title: 'sub' }]);
    const subId = withSubs!.subTasks[0].id;
    const after = await store.toggleSubTask(t.id, subId);
    expect(after?.subTasks[0].completed).toBe(true);
  });

  it('finds by id', async () => {
    const a = await store.add('a');
    expect((await store.get(a.id))?.title).toBe('a');
    expect(await store.get('nope')).toBeNull();
  });
});
```

- [ ] **Step 2: Run and verify it fails**

Run: `npx vitest run tests/unit/todos-store.test.ts`
Expected: FAIL — `@/lib/store/todos` not found.

- [ ] **Step 3: Implement `lib/store/todos.ts`**

```ts
import { randomUUID } from 'node:crypto';
import { readJson, updateJson } from './atomic-json';
import type { SubTask, Todo, TodosFile } from './types';

const EMPTY: TodosFile = { todos: [] };

export function createTodoStore(filePath: string) {
  return {
    async list(): Promise<Todo[]> {
      const f = await readJson<TodosFile>(filePath, EMPTY);
      return f.todos;
    },

    async get(id: string): Promise<Todo | null> {
      const f = await readJson<TodosFile>(filePath, EMPTY);
      return f.todos.find((t) => t.id === id) ?? null;
    },

    async add(title: string): Promise<Todo> {
      const now = new Date().toISOString();
      const todo: Todo = {
        id: randomUUID(),
        title,
        completed: false,
        subTasks: [],
        createdAt: now,
        updatedAt: now,
      };
      await updateJson<TodosFile>(filePath, EMPTY, (cur) => ({
        todos: [...cur.todos, todo],
      }));
      return todo;
    },

    async toggle(id: string): Promise<Todo | null> {
      let found: Todo | null = null;
      await updateJson<TodosFile>(filePath, EMPTY, (cur) => ({
        todos: cur.todos.map((t) => {
          if (t.id !== id) return t;
          found = { ...t, completed: !t.completed, updatedAt: bump(t.updatedAt) };
          return found;
        }),
      }));
      return found;
    },

    async toggleSubTask(todoId: string, subTaskId: string): Promise<Todo | null> {
      let found: Todo | null = null;
      await updateJson<TodosFile>(filePath, EMPTY, (cur) => ({
        todos: cur.todos.map((t) => {
          if (t.id !== todoId) return t;
          const subTasks = t.subTasks.map((s) =>
            s.id === subTaskId ? { ...s, completed: !s.completed } : s,
          );
          found = { ...t, subTasks, updatedAt: bump(t.updatedAt) };
          return found;
        }),
      }));
      return found;
    },

    async remove(id: string): Promise<void> {
      await updateJson<TodosFile>(filePath, EMPTY, (cur) => ({
        todos: cur.todos.filter((t) => t.id !== id),
      }));
    },

    async appendSubTasks(
      todoId: string,
      drafts: { title: string }[],
    ): Promise<Todo | null> {
      let found: Todo | null = null;
      await updateJson<TodosFile>(filePath, EMPTY, (cur) => ({
        todos: cur.todos.map((t) => {
          if (t.id !== todoId) return t;
          const newSubs: SubTask[] = drafts.map((d) => ({
            id: randomUUID(),
            title: d.title,
            completed: false,
          }));
          found = {
            ...t,
            subTasks: [...t.subTasks, ...newSubs],
            updatedAt: bump(t.updatedAt),
          };
          return found;
        }),
      }));
      return found;
    },
  };
}

function bump(prev: string): string {
  const now = new Date().toISOString();
  return now === prev ? new Date(Date.now() + 1).toISOString() : now;
}

// Default store backed by data/todos.json (used by app code).
import path from 'node:path';
export const todoStore = createTodoStore(path.join(process.cwd(), 'data', 'todos.json'));
```

- [ ] **Step 4: Run and verify tests pass**

Run: `npx vitest run tests/unit/todos-store.test.ts`
Expected: 8 tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/store/todos.ts tests/unit/todos-store.test.ts
git commit -m "feat(store): add todo CRUD with sub-task support"
```

---

## Task 5: MCP config store

**Files:**
- Create: `lib/store/mcp-config.ts`
- Test: `tests/unit/mcp-config-store.test.ts`

- [ ] **Step 1: Write the failing test**

`tests/unit/mcp-config-store.test.ts`:

```ts
// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createMcpConfigStore } from '@/lib/store/mcp-config';

function fresh() {
  const dir = mkdtempSync(path.join(tmpdir(), 'mcp-config-'));
  return createMcpConfigStore(path.join(dir, 'mcp.json'));
}

describe('mcp config store', () => {
  let store: ReturnType<typeof fresh>;
  beforeEach(() => { store = fresh(); });

  it('starts empty', async () => {
    expect(await store.list()).toEqual([]);
  });

  it('adds a stdio server', async () => {
    const s = await store.add({
      name: 'everything',
      transport: 'stdio',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-everything'],
    });
    expect(s.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(s.name).toBe('everything');
    expect((await store.list())).toHaveLength(1);
  });

  it('rejects duplicate names', async () => {
    await store.add({ name: 'a', transport: 'stdio', command: 'x', args: [] });
    await expect(
      store.add({ name: 'a', transport: 'stdio', command: 'x', args: [] }),
    ).rejects.toThrow(/duplicate/i);
  });

  it('removes a server', async () => {
    const a = await store.add({ name: 'a', transport: 'stdio', command: 'x', args: [] });
    await store.remove(a.id);
    expect(await store.list()).toEqual([]);
  });
});
```

- [ ] **Step 2: Run and verify it fails**

Run: `npx vitest run tests/unit/mcp-config-store.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `lib/store/mcp-config.ts`**

```ts
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
```

- [ ] **Step 4: Run tests, verify they pass**

Run: `npx vitest run tests/unit/mcp-config-store.test.ts`
Expected: 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/store/mcp-config.ts tests/unit/mcp-config-store.test.ts
git commit -m "feat(store): add MCP server config CRUD"
```

---

## Task 6: MCP client wrapper

**Files:**
- Create: `lib/mcp/client.ts`

The MCP TypeScript SDK exposes `Client` from `@modelcontextprotocol/sdk/client/index.js` and `StdioClientTransport` from `@modelcontextprotocol/sdk/client/stdio.js`. This module wraps `connect()` and exposes a single `connectStdio` function. Real connection is exercised in Task 19/20 (integration tests).

- [ ] **Step 1: Implement `lib/mcp/client.ts`**

```ts
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import type { McpServerConfig } from '@/lib/store/types';

export async function connectStdio(cfg: McpServerConfig): Promise<Client> {
  if (cfg.transport !== 'stdio') {
    throw new Error(`unsupported transport: ${cfg.transport}`);
  }
  const transport = new StdioClientTransport({
    command: cfg.command,
    args: cfg.args,
    env: cfg.env ? { ...process.env, ...cfg.env } as Record<string, string> : undefined,
  });
  const client = new Client(
    { name: 'todo-app', version: '0.1.0' },
    { capabilities: {} },
  );
  await client.connect(transport);
  return client;
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: No type errors. (If the SDK import path differs in the installed version, adjust per `node_modules/@modelcontextprotocol/sdk/dist/esm/client/`.)

- [ ] **Step 3: Commit**

```bash
git add lib/mcp/client.ts
git commit -m "feat(mcp): add stdio client connect helper"
```

---

## Task 7: MCP pool (open/close all)

**Files:**
- Create: `lib/mcp/pool.ts`
- Test: `tests/unit/mcp-pool.test.ts` (with mocked `connectStdio`)

- [ ] **Step 1: Write the failing test**

`tests/unit/mcp-pool.test.ts`:

```ts
// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { McpServerConfig } from '@/lib/store/types';

vi.mock('@/lib/mcp/client', () => ({
  connectStdio: vi.fn(),
}));

import { connectStdio } from '@/lib/mcp/client';
import { openAll, closeAll } from '@/lib/mcp/pool';

const mockClient = (tools: { name: string; description?: string }[]) => ({
  listTools: vi.fn().mockResolvedValue({ tools: tools.map(t => ({
    name: t.name,
    description: t.description ?? '',
    inputSchema: { type: 'object', properties: {} },
  })) }),
  callTool: vi.fn(),
  close: vi.fn().mockResolvedValue(undefined),
});

const cfg = (name: string): McpServerConfig => ({
  id: `id-${name}`, name, transport: 'stdio', command: 'x', args: [],
});

beforeEach(() => vi.mocked(connectStdio).mockReset());

describe('openAll', () => {
  it('connects to every server and gathers tools', async () => {
    vi.mocked(connectStdio)
      .mockResolvedValueOnce(mockClient([{ name: 'a' }]) as never)
      .mockResolvedValueOnce(mockClient([{ name: 'b' }]) as never);

    const { connected, failed } = await openAll([cfg('s1'), cfg('s2')]);
    expect(failed).toEqual([]);
    expect(connected).toHaveLength(2);
    expect(connected[0].tools[0].name).toBe('a');
    expect(connected[1].tools[0].name).toBe('b');
  });

  it('reports failures without aborting the rest', async () => {
    vi.mocked(connectStdio)
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce(mockClient([{ name: 'ok' }]) as never);

    const { connected, failed } = await openAll([cfg('bad'), cfg('good')]);
    expect(connected).toHaveLength(1);
    expect(connected[0].cfg.name).toBe('good');
    expect(failed).toHaveLength(1);
    expect(failed[0].cfg.name).toBe('bad');
    expect(failed[0].error).toMatch(/boom/);
  });
});

describe('closeAll', () => {
  it('closes every connected client even if one throws', async () => {
    const a = mockClient([]);
    const b = mockClient([]);
    b.close.mockRejectedValueOnce(new Error('close failed'));
    await closeAll([
      { cfg: cfg('a'), client: a as never, tools: [] },
      { cfg: cfg('b'), client: b as never, tools: [] },
    ]);
    expect(a.close).toHaveBeenCalled();
    expect(b.close).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run and verify it fails**

Run: `npx vitest run tests/unit/mcp-pool.test.ts`
Expected: FAIL — module `@/lib/mcp/pool` not found.

- [ ] **Step 3: Implement `lib/mcp/pool.ts`**

```ts
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
```

- [ ] **Step 4: Run tests, verify they pass**

Run: `npx vitest run tests/unit/mcp-pool.test.ts`
Expected: 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/mcp/pool.ts tests/unit/mcp-pool.test.ts
git commit -m "feat(mcp): per-request pool that connects all servers and gathers tools"
```

---

## Task 8: MCP → Anthropic tool adapter

**Files:**
- Create: `lib/mcp/adapter.ts`
- Test: `tests/unit/mcp-adapter.test.ts`

- [ ] **Step 1: Write the failing test**

`tests/unit/mcp-adapter.test.ts`:

```ts
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
```

- [ ] **Step 2: Run and verify it fails**

Run: `npx vitest run tests/unit/mcp-adapter.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `lib/mcp/adapter.ts`**

```ts
import { betaTool } from '@anthropic-ai/sdk/helpers/beta/json-schema';
import type { ConnectedServer } from './pool';

export type AdaptedTool = ReturnType<typeof betaTool> & {
  __server: string;
  __originalName: string;
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
      const adapted = betaTool({
        name: fullName,
        description: tool.description,
        input_schema: tool.inputSchema as never,
        run: async (input) => {
          const result = await server.client.callTool({
            name: tool.name,
            arguments: input as Record<string, unknown>,
          });
          const text = (result.content ?? [])
            .filter((b): b is { type: 'text'; text: string } => b.type === 'text')
            .map((b) => b.text)
            .join('\n');
          return text || JSON.stringify(result);
        },
      }) as AdaptedTool;
      adapted.__server = server.cfg.name;
      adapted.__originalName = tool.name;
      out.push(adapted);
    }
  }
  return out;
}
```

- [ ] **Step 4: Run tests, verify they pass**

Run: `npx vitest run tests/unit/mcp-adapter.test.ts`
Expected: 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/mcp/adapter.ts tests/unit/mcp-adapter.test.ts
git commit -m "feat(mcp): adapter that surfaces MCP tools as Anthropic betaTool"
```

---

## Task 9: Breakdown prompts

**Files:**
- Create: `lib/ai/prompts.ts`

- [ ] **Step 1: Implement `lib/ai/prompts.ts`**

```ts
export const BREAKDOWN_SYSTEM_PROMPT = `You are a task-breakdown assistant for a personal todo app.

Rules:
1. You receive a single high-level task. Decompose it into 3–7 concrete, actionable sub-tasks.
2. Each sub-task must be a short imperative phrase (under 80 characters) that the user can act on directly.
3. You MAY call any provided MCP tools as research aids (e.g. to look up files, fetch context, or run domain-specific helpers). This is optional.
4. You MUST finish by calling the local tool \`record_sub_tasks\` EXACTLY ONCE with the final list. Do not list sub-tasks in plain text — only the tool call counts.
5. Do not include the original task itself as a sub-task. Do not number the sub-tasks; numbering is the UI's job.`;

export function breakdownUserPrompt(title: string): string {
  return `Task to break down: ${title}`;
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/ai/prompts.ts
git commit -m "feat(ai): add breakdown prompts"
```

---

## Task 10: AI breakdown orchestrator

**Files:**
- Create: `lib/ai/breakdown.ts`
- Test: `tests/unit/breakdown.test.ts`

- [ ] **Step 1: Write the failing test**

`tests/unit/breakdown.test.ts`:

```ts
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

    toolRunnerMock.mockImplementation(async ({ tools }: { tools: { name: string; run: (i: unknown) => Promise<string> }[] }) => {
      const record = tools.find((tt) => tt.name === 'record_sub_tasks')!;
      await record.run({ subTasks: [{ title: 'plan' }, { title: 'gather wood' }] });
      return { content: [{ type: 'text', text: 'done' }] };
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

    toolRunnerMock.mockImplementation(async ({ tools }: { tools: { name: string; run: (i: unknown) => Promise<string> }[] }) => {
      const record = tools.find((tt) => tt.name === 'record_sub_tasks')!;
      await record.run({ subTasks: [{ title: 'a' }] });
      return { content: [] };
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

    toolRunnerMock.mockResolvedValue({ content: [{ type: 'text', text: 'nope' }] });

    const res = await runBreakdown({ todoId: t.id, todoStore: todos, mcpConfigStore: cfg });
    expect(res).toEqual({ ok: false, error: 'no_sub_tasks_recorded' });
  });
});
```

- [ ] **Step 2: Run and verify it fails**

Run: `npx vitest run tests/unit/breakdown.test.ts`
Expected: FAIL — `@/lib/ai/breakdown` not found.

- [ ] **Step 3: Implement `lib/ai/breakdown.ts`**

```ts
import Anthropic from '@anthropic-ai/sdk';
import { betaTool } from '@anthropic-ai/sdk/helpers/beta/json-schema';
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
      input_schema: {
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
      } as never,
      run: (input) => {
        captured = (input as { subTasks: { title: string }[] }).subTasks
          .map((s) => ({ title: String(s.title).slice(0, 200) }));
        return 'ok';
      },
    });

    const anthropic = new Anthropic({ apiKey });

    try {
      await anthropic.beta.messages.toolRunner({
        model: process.env.BREAKDOWN_MODEL ?? 'claude-sonnet-4-6',
        max_tokens: 2048,
        max_iterations: 10,
        system: BREAKDOWN_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: breakdownUserPrompt(todo.title) }],
        tools: [...mcpTools, recordSubTasks],
      });
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      return { ok: false, error: 'runner_failed', detail };
    }

    if (!captured) return { ok: false, error: 'no_sub_tasks_recorded' };

    await todoStore.appendSubTasks(todoId, captured);
    return { ok: true, subTasksAdded: captured.length, failedServers: failed.map((f) => f.cfg.name) };
  } finally {
    await closeAll(connected);
  }
}
```

- [ ] **Step 4: Run tests, verify they pass**

Run: `npx vitest run tests/unit/breakdown.test.ts`
Expected: 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/ai/breakdown.ts tests/unit/breakdown.test.ts
git commit -m "feat(ai): breakdown orchestrator with Anthropic toolRunner + MCP tools"
```

---

## Task 11: Todo server actions

**Files:**
- Create: `app/actions.ts`

- [ ] **Step 1: Implement `app/actions.ts`**

```ts
'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { todoStore } from '@/lib/store/todos';
import { mcpConfigStore } from '@/lib/store/mcp-config';
import { runBreakdown, type BreakdownResult } from '@/lib/ai/breakdown';

const titleSchema = z.string().trim().min(1, 'title required').max(200);
const idSchema = z.string().uuid();

export type AddTodoState = { error?: string };

export async function addTodo(_prev: AddTodoState, formData: FormData): Promise<AddTodoState> {
  const parsed = titleSchema.safeParse(formData.get('title'));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'invalid title' };
  await todoStore.add(parsed.data);
  revalidatePath('/');
  return {};
}

export async function toggleTodo(id: string): Promise<void> {
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) return;
  await todoStore.toggle(parsed.data);
  revalidatePath('/');
}

export async function toggleSubTask(todoId: string, subTaskId: string): Promise<void> {
  if (!idSchema.safeParse(todoId).success) return;
  if (!idSchema.safeParse(subTaskId).success) return;
  await todoStore.toggleSubTask(todoId, subTaskId);
  revalidatePath('/');
}

export async function deleteTodo(id: string): Promise<void> {
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) return;
  await todoStore.remove(parsed.data);
  revalidatePath('/');
}

export async function breakdownTodo(id: string): Promise<BreakdownResult> {
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) return { ok: false, error: 'not_found' };
  const result = await runBreakdown({ todoId: parsed.data, todoStore, mcpConfigStore });
  if (result.ok) revalidatePath('/');
  return result;
}

export async function hasApiKey(): Promise<boolean> {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add app/actions.ts
git commit -m "feat(actions): add todo CRUD + breakdown server actions"
```

---

## Task 12: MCP settings server actions

**Files:**
- Create: `app/settings/actions.ts`

- [ ] **Step 1: Implement `app/settings/actions.ts`**

```ts
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
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add app/settings/actions.ts
git commit -m "feat(actions): add MCP server settings actions"
```

---

## Task 13: Root layout

**Files:**
- Create: `app/layout.tsx`

- [ ] **Step 1: Implement `app/layout.tsx`**

```tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'Todo + MCP',
  description: 'Local-first todo app with MCP-powered AI breakdown',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <div className="mx-auto max-w-2xl p-6">
          <header className="mb-6 flex items-center justify-between">
            <Link href="/" className="text-xl font-semibold">Todos</Link>
            <Link href="/settings" className="text-sm text-blue-600 hover:underline">Settings</Link>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/layout.tsx
git commit -m "feat(ui): add root layout with nav"
```

---

## Task 14: Home page + AddTodoForm

**Files:**
- Create: `app/page.tsx`
- Create: `app/components/AddTodoForm.tsx`

- [ ] **Step 1: Implement `app/components/AddTodoForm.tsx`**

```tsx
'use client';

import { useActionState, useRef, useEffect } from 'react';
import { addTodo, type AddTodoState } from '@/app/actions';

const initial: AddTodoState = {};

export function AddTodoForm() {
  const [state, formAction, pending] = useActionState(addTodo, initial);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!pending && !state.error) formRef.current?.reset();
  }, [pending, state]);

  return (
    <form ref={formRef} action={formAction} className="mb-6 flex gap-2">
      <input
        name="title"
        placeholder="새 할 일"
        required
        maxLength={200}
        className="flex-1 rounded border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
      >
        {pending ? '추가 중…' : '추가'}
      </button>
      {state.error && <p className="basis-full text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
```

- [ ] **Step 2: Implement `app/page.tsx`**

```tsx
import { todoStore } from '@/lib/store/todos';
import { hasApiKey } from './actions';
import { AddTodoForm } from './components/AddTodoForm';
import { TodoList } from './components/TodoList';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const [todos, apiKeyAvailable] = await Promise.all([todoStore.list(), hasApiKey()]);
  return (
    <main>
      <AddTodoForm />
      {!apiKeyAvailable && (
        <p className="mb-4 rounded border border-yellow-400 bg-yellow-50 p-3 text-sm text-yellow-900 dark:bg-yellow-950 dark:text-yellow-100">
          ANTHROPIC_API_KEY가 설정되지 않아 "분해" 기능이 비활성화됩니다. <code>.env.local</code>에 키를 추가하세요.
        </p>
      )}
      <TodoList items={todos} canBreakdown={apiKeyAvailable} />
    </main>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add app/page.tsx app/components/AddTodoForm.tsx
git commit -m "feat(ui): home page with AddTodoForm"
```

---

## Task 15: TodoList + TodoItem + SubTaskList

**Files:**
- Create: `app/components/TodoList.tsx`
- Create: `app/components/TodoItem.tsx`
- Create: `app/components/SubTaskList.tsx`

- [ ] **Step 1: Implement `app/components/TodoList.tsx`**

```tsx
import type { Todo } from '@/lib/store/types';
import { TodoItem } from './TodoItem';

export function TodoList({ items, canBreakdown }: { items: Todo[]; canBreakdown: boolean }) {
  if (items.length === 0) {
    return <p className="text-gray-500">할 일이 없습니다. 위 입력창에서 추가하세요.</p>;
  }
  return (
    <ul className="space-y-2">
      {items.map((t) => (
        <li key={t.id}>
          <TodoItem todo={t} canBreakdown={canBreakdown} />
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 2: Implement `app/components/SubTaskList.tsx`**

```tsx
'use client';

import { useTransition } from 'react';
import type { SubTask } from '@/lib/store/types';
import { toggleSubTask } from '@/app/actions';

export function SubTaskList({ todoId, subTasks }: { todoId: string; subTasks: SubTask[] }) {
  const [pending, start] = useTransition();
  if (subTasks.length === 0) return null;
  return (
    <ul className="mt-2 space-y-1 pl-6 text-sm">
      {subTasks.map((s) => (
        <li key={s.id} className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={s.completed}
            disabled={pending}
            onChange={() => start(() => { void toggleSubTask(todoId, s.id); })}
          />
          <span className={s.completed ? 'text-gray-400 line-through' : ''}>{s.title}</span>
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 3: Implement `app/components/TodoItem.tsx`**

```tsx
'use client';

import { useState, useTransition } from 'react';
import type { Todo } from '@/lib/store/types';
import { toggleTodo, deleteTodo, breakdownTodo } from '@/app/actions';
import { SubTaskList } from './SubTaskList';

export function TodoItem({ todo, canBreakdown }: { todo: Todo; canBreakdown: boolean }) {
  const [pending, start] = useTransition();
  const [breakdownPending, setBreakdownPending] = useState(false);
  const [breakdownMessage, setBreakdownMessage] = useState<string | null>(null);

  async function onBreakdown() {
    setBreakdownPending(true);
    setBreakdownMessage(null);
    const result = await breakdownTodo(todo.id);
    setBreakdownPending(false);
    if (result.ok) {
      const skipped = result.failedServers.length
        ? ` (실패한 서버: ${result.failedServers.join(', ')})`
        : '';
      setBreakdownMessage(`${result.subTasksAdded}개의 sub-task 추가${skipped}`);
    } else {
      setBreakdownMessage(`분해 실패: ${result.error}${result.error === 'runner_failed' && 'detail' in result && result.detail ? ` — ${result.detail}` : ''}`);
    }
  }

  return (
    <div className="rounded border border-gray-200 p-3 dark:border-gray-800">
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          checked={todo.completed}
          disabled={pending}
          onChange={() => start(() => { void toggleTodo(todo.id); })}
        />
        <span className={`flex-1 ${todo.completed ? 'text-gray-400 line-through' : ''}`}>{todo.title}</span>
        <button
          type="button"
          disabled={!canBreakdown || breakdownPending}
          title={canBreakdown ? 'AI로 sub-task로 분해' : 'ANTHROPIC_API_KEY 필요'}
          onClick={onBreakdown}
          className="rounded bg-purple-600 px-2 py-1 text-xs text-white disabled:opacity-40"
        >
          {breakdownPending ? '분해 중…' : '분해'}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (!confirm('삭제하시겠습니까?')) return;
            start(() => { void deleteTodo(todo.id); });
          }}
          className="rounded border border-red-600 px-2 py-1 text-xs text-red-600"
        >
          삭제
        </button>
      </div>
      {breakdownMessage && <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">{breakdownMessage}</p>}
      <SubTaskList todoId={todo.id} subTasks={todo.subTasks} />
    </div>
  );
}
```

- [ ] **Step 4: Write component test for AddTodoForm rendering**

`tests/unit/add-todo-form.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/app/actions', () => ({
  addTodo: vi.fn().mockResolvedValue({}),
}));

import { AddTodoForm } from '@/app/components/AddTodoForm';

describe('AddTodoForm', () => {
  it('renders an input and submit button', () => {
    render(<AddTodoForm />);
    expect(screen.getByPlaceholderText('새 할 일')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /추가/ })).toBeInTheDocument();
  });
});
```

- [ ] **Step 5: Run the component test**

Run: `npx vitest run tests/unit/add-todo-form.test.tsx`
Expected: 1 test passes.

- [ ] **Step 6: Commit**

```bash
git add app/components/TodoList.tsx app/components/TodoItem.tsx app/components/SubTaskList.tsx tests/unit/add-todo-form.test.tsx
git commit -m "feat(ui): TodoList, TodoItem with breakdown button, SubTaskList"
```

---

## Task 16: Settings page UI

**Files:**
- Create: `app/settings/page.tsx`
- Create: `app/components/McpServerForm.tsx`
- Create: `app/components/McpServerList.tsx`

- [ ] **Step 1: Implement `app/components/McpServerForm.tsx`**

```tsx
'use client';

import { useActionState, useRef, useEffect } from 'react';
import { addMcpServer, type AddServerState } from '@/app/settings/actions';

const initial: AddServerState = {};

export function McpServerForm() {
  const [state, action, pending] = useActionState(addMcpServer, initial);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (!pending && !state.error) ref.current?.reset(); }, [pending, state]);

  return (
    <form ref={ref} action={action} className="space-y-3 rounded border border-gray-200 p-4 dark:border-gray-800">
      <h2 className="text-lg font-semibold">MCP 서버 추가</h2>
      <label className="block text-sm">이름
        <input name="name" required maxLength={60} className="mt-1 block w-full rounded border border-gray-300 px-2 py-1 dark:border-gray-700 dark:bg-gray-900" />
      </label>
      <label className="block text-sm">명령어 (예: npx)
        <input name="command" required className="mt-1 block w-full rounded border border-gray-300 px-2 py-1 dark:border-gray-700 dark:bg-gray-900" />
      </label>
      <label className="block text-sm">인자 (한 줄에 하나)
        <textarea name="args" rows={3} className="mt-1 block w-full rounded border border-gray-300 px-2 py-1 font-mono text-xs dark:border-gray-700 dark:bg-gray-900" placeholder={'-y\n@modelcontextprotocol/server-everything'} />
      </label>
      <label className="block text-sm">환경변수 (KEY=VALUE, 한 줄에 하나, 선택)
        <textarea name="env" rows={2} className="mt-1 block w-full rounded border border-gray-300 px-2 py-1 font-mono text-xs dark:border-gray-700 dark:bg-gray-900" />
      </label>
      <button type="submit" disabled={pending} className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white disabled:opacity-50">
        {pending ? '추가 중…' : '추가'}
      </button>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
```

- [ ] **Step 2: Implement `app/components/McpServerList.tsx`**

```tsx
'use client';

import { useState, useTransition } from 'react';
import type { McpServerConfig } from '@/lib/store/types';
import { removeMcpServer, testMcpServer, type TestResult } from '@/app/settings/actions';

export function McpServerList({ servers }: { servers: McpServerConfig[] }) {
  const [pending, start] = useTransition();
  const [results, setResults] = useState<Record<string, TestResult>>({});

  if (servers.length === 0) {
    return <p className="text-gray-500">등록된 MCP 서버가 없습니다.</p>;
  }
  return (
    <ul className="space-y-2">
      {servers.map((s) => (
        <li key={s.id} className="rounded border border-gray-200 p-3 dark:border-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{s.name}</p>
              <p className="font-mono text-xs text-gray-500">{s.command} {s.args.join(' ')}</p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={async () => {
                  const r = await testMcpServer(s.id);
                  setResults((prev) => ({ ...prev, [s.id]: r }));
                }}
                className="rounded border border-gray-400 px-2 py-1 text-xs"
              >연결 테스트</button>
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  if (!confirm(`'${s.name}' 서버를 삭제할까요?`)) return;
                  start(() => { void removeMcpServer(s.id); });
                }}
                className="rounded border border-red-600 px-2 py-1 text-xs text-red-600"
              >삭제</button>
            </div>
          </div>
          {results[s.id] && (
            <p className={`mt-2 text-xs ${results[s.id].ok ? 'text-green-700 dark:text-green-300' : 'text-red-600'}`}>
              {results[s.id].ok
                ? `OK — tools: ${results[s.id].tools.join(', ') || '(none)'}`
                : `실패: ${results[s.id].error}`}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 3: Implement `app/settings/page.tsx`**

```tsx
import { mcpConfigStore } from '@/lib/store/mcp-config';
import { McpServerForm } from '@/app/components/McpServerForm';
import { McpServerList } from '@/app/components/McpServerList';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const servers = await mcpConfigStore.list();
  return (
    <main className="space-y-6">
      <McpServerForm />
      <section>
        <h2 className="mb-2 text-lg font-semibold">등록된 서버</h2>
        <McpServerList servers={servers} />
      </section>
    </main>
  );
}
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add app/settings/page.tsx app/components/McpServerForm.tsx app/components/McpServerList.tsx
git commit -m "feat(ui): MCP server settings page"
```

---

## Task 17: Build smoke test

**Files:** (no new source files)

- [ ] **Step 1: Run `next build`**

Run: `npx next build`
Expected: Build succeeds. (If it complains about missing `data/` files, that's fine — they're created on first read.)

- [ ] **Step 2: Run all tests**

Run: `npx vitest run`
Expected: All unit tests pass.

- [ ] **Step 3: Commit any incidental fixes**

If any errors required edits, commit them now:

```bash
git status
git add -A
git commit -m "fix: address Next.js build issues"
```

If nothing changed, skip this commit.

---

## Task 18: Echo MCP server fixture

**Files:**
- Create: `tests/fixtures/echo-mcp-server.ts`

This is a tiny real MCP server (stdio) that exposes one tool `echo` returning its `text` argument. Used by the integration test.

- [ ] **Step 1: Implement `tests/fixtures/echo-mcp-server.ts`**

```ts
#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

const server = new Server(
  { name: 'echo-fixture', version: '0.0.1' },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [{
    name: 'echo',
    description: 'Echoes the provided text',
    inputSchema: {
      type: 'object',
      properties: { text: { type: 'string' } },
      required: ['text'],
    },
  }],
}));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  if (req.params.name !== 'echo') {
    throw new Error(`unknown tool: ${req.params.name}`);
  }
  const text = String((req.params.arguments as { text?: unknown })?.text ?? '');
  return { content: [{ type: 'text', text: `echo: ${text}` }] };
});

await server.connect(new StdioServerTransport());
```

- [ ] **Step 2: Verify it loads (syntax / imports)**

Run: `npx tsc --noEmit`
Expected: No errors. (The fixture is executed by `node --experimental-strip-types` in the next task; we don't run it directly here.)

- [ ] **Step 3: Commit**

```bash
git add tests/fixtures/echo-mcp-server.ts
git commit -m "test: add echo MCP server fixture for integration tests"
```

---

## Task 19: Integration test — pool + adapter against the real fixture

**Files:**
- Test: `tests/integration/mcp-pool.test.ts`

- [ ] **Step 1: Write the test**

`tests/integration/mcp-pool.test.ts`:

```ts
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
  args: ['--experimental-strip-types', fixturePath],
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
```

> Requires Node ≥ 22.6 for `--experimental-strip-types`. If unavailable, replace the args with the compiled JS path (`node tests/fixtures/echo-mcp-server.js` after `tsc` build).

- [ ] **Step 2: Run the integration test**

Run: `npx vitest run tests/integration/mcp-pool.test.ts`
Expected: 1 test passes (subprocess spawns, talks MCP, returns "echo: hi").

If the test fails because `--experimental-strip-types` is unsupported:
1. Add a step that compiles the fixture: `npx tsc tests/fixtures/echo-mcp-server.ts --target esnext --module nodenext --moduleResolution nodenext --outDir tests/fixtures/dist`
2. Change `args` to `[path.join(process.cwd(), 'tests/fixtures/dist/echo-mcp-server.js')]`.

- [ ] **Step 3: Commit**

```bash
git add tests/integration/mcp-pool.test.ts
git commit -m "test(integration): real stdio MCP fixture exercised end-to-end"
```

---

## Task 20: Manual smoke run

**Files:** none (manual verification)

- [ ] **Step 1: Create `.env.local`**

```bash
cp .env.example .env.local
```

Then edit `.env.local` and set `ANTHROPIC_API_KEY=sk-ant-...` if available. Leave blank to verify the disabled-state UI.

- [ ] **Step 2: Start the dev server**

Run: `npm run dev`
Expected: Server starts on http://localhost:3000.

- [ ] **Step 3: Smoke test in browser**

In the browser, verify:
1. Visit `/` — empty list with input.
2. Add three todos.
3. Toggle one — strikethrough applied; page does not full-reload.
4. Delete one — disappears.
5. Visit `/settings` — empty server list, form visible.
6. Add the echo fixture as an MCP server: name `echo`, command `node`, args `--experimental-strip-types\n<absolute path to tests/fixtures/echo-mcp-server.ts>`.
7. Click "연결 테스트" — should show `OK — tools: echo`.
8. Back on `/`, if `ANTHROPIC_API_KEY` is set, click "분해" on a todo. Expect 3–7 sub-tasks to appear under it. (If the key is missing, "분해" is disabled with a tooltip.)

- [ ] **Step 4: Stop the dev server**

Press Ctrl-C in the terminal running `npm run dev`.

- [ ] **Step 5: Note any defects**

If anything fails, file follow-up issues or amend the relevant task. No commit needed unless code changed.

---

## Task 21: README

**Files:**
- Create: `README.md`

- [ ] **Step 1: Write `README.md`**

````markdown
# Todo + MCP

Single-user Next.js (App Router, TypeScript) todo app. Persists to local JSON files. Each todo has an "AI 분해" button that calls Claude with the union of tools provided by user-registered stdio MCP servers.

## Setup

```bash
npm install
cp .env.example .env.local
# Edit .env.local and set ANTHROPIC_API_KEY (optional — without it, the
# 분해 button is disabled but everything else works).
npm run dev
```

Open <http://localhost:3000>.

## Data

- `data/todos.json` — todos and their sub-tasks
- `data/mcp-config.json` — registered MCP servers

Both files are created automatically. The `data/` directory is gitignored.

## MCP Servers

Go to `/settings` to register MCP servers. v1 supports **stdio** transport only.

Example: register the official everything-server with name `everything`, command `npx`, args:

```
-y
@modelcontextprotocol/server-everything
```

After saving, click "연결 테스트" to verify the server starts and exposes tools.

## How "분해" works

When you click 분해 on a todo:

1. The server action loads all registered MCP servers and connects in parallel (`Promise.allSettled`).
2. Each server's tools are exposed to Claude as Anthropic-format tools (prefixed `<serverName>__<toolName>` to avoid collisions).
3. A local `record_sub_tasks` tool is appended.
4. `anthropic.beta.messages.toolRunner` runs a multi-turn loop. The system prompt requires Claude to call `record_sub_tasks` exactly once with 3–7 sub-tasks.
5. The captured sub-tasks are appended to the todo.
6. All MCP connections are closed in a `finally` block.

If an MCP server fails to start, the breakdown still proceeds with the remaining servers. The UI surfaces failed server names in the success message.

## Scripts

```bash
npm run dev       # next dev
npm run build     # next build
npm run start     # next start
npm test          # vitest run
npm run test:watch
```

## Tests

- Unit tests: `tests/unit/**/*.test.ts(x)`
- Integration test (spawns a real stdio MCP server): `tests/integration/mcp-pool.test.ts`

Run all: `npm test`.
````

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add README"
```

---

## Done criteria

- All 21 tasks complete and committed.
- `npm test` passes (unit + integration).
- `npm run build` succeeds.
- Manual smoke (Task 20) confirms add/toggle/delete + settings + (when key present) breakdown.
