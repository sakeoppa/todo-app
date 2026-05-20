# Next.js Todo App with MCP Client — Design

- **Date:** 2026-05-20
- **Author:** sake (with Claude)
- **Status:** Approved (brainstorming phase)
- **Location:** `~/Projects/todo-app`

## 1. Purpose

A single-user Todo web app built on Next.js (App Router) + TypeScript. The app persists todos to a local JSON file on the server. Each todo has an "AI 분해" (breakdown) button that uses the Anthropic API together with user-registered MCP servers as tool providers to expand a high-level task into structured sub-tasks.

## 2. Goals & Non-Goals

**Goals**

- Add / toggle / delete todos with progressive-enhancement forms (Server Actions).
- Persist data to `data/todos.json` on the server with atomic writes.
- Let the user register one or more external MCP servers (stdio transport in v1).
- Provide an "AI 분해" button per todo: invoke Claude with the union of registered MCP tools + a local `record_sub_tasks` tool, then save the produced sub-tasks under the todo.
- Graceful degradation: missing API key disables breakdown UI; a single failing MCP server does not block the others.

**Non-Goals (v1)**

- Multi-user / auth.
- Cloud / external database.
- HTTP MCP transport (stdio only in v1; HTTP can be added later without changing the storage model).
- Streaming UI for breakdown (sub-tasks appear once, after the runner finishes; SSE is an optional v2 upgrade).
- Mobile-first responsive polish (basic responsiveness only).

## 3. High-Level Architecture

```
+-----------------------------+         +------------------------------+
|  Next.js (App Router)       |         |  Local filesystem            |
|  - Server Components: list  | <-----> |  data/todos.json             |
|  - Client Components: forms |         |  data/mcp-config.json        |
|  - Server Actions: mutate   |         +------------------------------+
+--------------+--------------+
               |
               | breakdownTodo(id)
               v
+-----------------------------+         +------------------------------+
|  lib/ai/breakdown.ts        |         |  External MCP servers        |
|  - Anthropic SDK toolRunner | <-----> |  (stdio child processes)     |
|  - MCP tool adapter         |         |  - filesystem, custom, etc.  |
+-----------------------------+         +------------------------------+
```

Three internal libraries with single responsibilities:

- `lib/store/*` — file I/O for todos and MCP config. No domain logic.
- `lib/mcp/*` — wraps `@modelcontextprotocol/sdk` Client + StdioClientTransport. Knows nothing about todos.
- `lib/ai/breakdown.ts` — composes store + mcp + Anthropic SDK to perform one task: turn a todo title into a list of sub-tasks.

Server Actions in `app/actions.ts` are thin orchestrators (validate → call lib → `revalidatePath`).

## 4. Directory Layout

```
todo-app/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                  # Server Component, lists todos
│   ├── actions.ts                # addTodo, toggleTodo, deleteTodo, breakdownTodo
│   ├── settings/
│   │   ├── page.tsx              # MCP server registration UI
│   │   └── actions.ts            # addServer, removeServer, testServer
│   └── components/
│       ├── TodoList.tsx          # Server Component
│       ├── TodoItem.tsx          # Client Component (checkbox + "분해" button)
│       ├── AddTodoForm.tsx       # Client Component, useActionState
│       └── McpServerForm.tsx     # Client Component
├── lib/
│   ├── store/
│   │   ├── todos.ts              # read/write todos.json atomically
│   │   ├── mcp-config.ts         # read/write mcp-config.json atomically
│   │   └── atomic-json.ts        # shared temp-file + rename helper, in-process mutex
│   ├── mcp/
│   │   ├── client.ts             # connect/close one MCP client (stdio)
│   │   ├── pool.ts               # per-request: connect all configured servers, gather tools, close
│   │   └── adapter.ts            # MCP Tool -> Anthropic.Tool (run() calls mcp.callTool)
│   └── ai/
│       ├── breakdown.ts          # main orchestration
│       └── prompts.ts            # BREAKDOWN_SYSTEM_PROMPT, BREAKDOWN_USER_PROMPT
├── data/
│   ├── todos.json                # { todos: Todo[] }
│   └── mcp-config.json           # { servers: McpServerConfig[] }
├── tests/
│   ├── unit/
│   ├── integration/
│   └── fixtures/
│       └── echo-mcp-server.ts    # fixture stdio server for integration tests
├── .env.local                    # ANTHROPIC_API_KEY=...
├── .env.example
├── next.config.ts
├── tsconfig.json
├── package.json
├── vitest.config.ts
└── README.md
```

## 5. Data Model

```ts
// lib/store/types.ts
export type Todo = {
  id: string;            // crypto.randomUUID()
  title: string;
  completed: boolean;
  subTasks: SubTask[];
  createdAt: string;     // ISO timestamp
  updatedAt: string;
};

export type SubTask = {
  id: string;
  title: string;
  completed: boolean;
};

export type McpServerConfig = {
  id: string;            // crypto.randomUUID()
  name: string;
  transport: 'stdio';    // v1 only supports stdio
  command: string;       // e.g. "npx"
  args: string[];        // e.g. ["-y", "@modelcontextprotocol/server-everything"]
  env?: Record<string, string>;
};
```

**Files**

- `data/todos.json` → `{ "todos": Todo[] }`
- `data/mcp-config.json` → `{ "servers": McpServerConfig[] }`

Both files are created on first read if missing (empty arrays).

## 6. Storage: atomic JSON

`lib/store/atomic-json.ts` exports `readJson<T>(path, default)` and `writeJsonAtomic<T>(path, data)`:

- `writeJsonAtomic` writes to `<path>.tmp-<pid>-<rand>` then `fs.rename` to the target. `rename` is atomic on the same filesystem.
- An in-process `Mutex` (one per path) serializes the read-modify-write sequence to prevent torn updates when two Server Actions race.
- The mutex is process-local; this is acceptable because Next.js dev/prod runs as a single Node process. If we ever scale out, we replace this with file-based locking — out of scope for v1.

## 7. Server Actions (CRUD)

`app/actions.ts`:

```ts
'use server';
export async function addTodo(formData: FormData): Promise<void>
export async function toggleTodo(id: string): Promise<void>
export async function toggleSubTask(todoId: string, subTaskId: string): Promise<void>
export async function deleteTodo(id: string): Promise<void>
export async function breakdownTodo(id: string): Promise<BreakdownResult>
```

- Each action validates input (zod), calls the relevant `lib/store` or `lib/ai` function, then `revalidatePath('/')`.
- `breakdownTodo` returns `{ ok: true; subTasksAdded: number } | { ok: false; error: string }` so the client component can show a toast.

`app/settings/actions.ts`:

```ts
'use server';
export async function addMcpServer(formData: FormData): Promise<void>
export async function removeMcpServer(id: string): Promise<void>
export async function testMcpServer(id: string): Promise<{ ok: boolean; tools?: string[]; error?: string }>
```

## 8. MCP Layer

`lib/mcp/client.ts`:

```ts
export async function connectStdio(cfg: McpServerConfig): Promise<Client>
```

- Constructs `StdioClientTransport({ command, args, env })`.
- Returns a connected `Client` (`@modelcontextprotocol/sdk/client/index.js`).
- Caller is responsible for `await client.close()`.

`lib/mcp/pool.ts`:

```ts
export type ConnectedServer = {
  cfg: McpServerConfig;
  client: Client;
  tools: ListedTool[];   // from client.listTools()
};

export async function openAll(cfgs: McpServerConfig[]): Promise<{
  connected: ConnectedServer[];
  failed: { cfg: McpServerConfig; error: string }[];
}>;

export async function closeAll(connected: ConnectedServer[]): Promise<void>;
```

- Uses `Promise.allSettled`: a failing server does not abort the others.
- Each `breakdownTodo` call opens and closes its own pool. v1 does NOT keep persistent connections; this trades latency for simplicity and avoids zombie subprocess management. If latency becomes a problem, the pool gains a TTL-based cache without changing call sites.

`lib/mcp/adapter.ts`:

```ts
export function toAnthropicTools(servers: ConnectedServer[]): BetaTool[];
```

- For each MCP tool, returns a `betaTool({ name, description, input_schema, run })` where `run(input)` calls `mcp.callTool({ name, arguments: input })` on the originating client and stringifies the text content blocks.
- Tool names are prefixed `<serverName>__<toolName>` to avoid collisions across servers; the adapter remembers the mapping when dispatching.

## 9. AI Breakdown Flow

`lib/ai/breakdown.ts`:

```ts
export async function breakdown(todoId: string): Promise<BreakdownResult>
```

Steps:

1. Read `todos.json`, find the todo. If not found → return `{ ok:false, error:'not_found' }`.
2. Read `mcp-config.json`, get configured servers.
3. `openAll(servers)` → `{ connected, failed }`.
4. Build tools list:
   - `mcpTools = toAnthropicTools(connected)`
   - `recordSubTasksTool` — local `betaTool` with schema `{ subTasks: { title: string }[] }`. Its `run` returns `"ok"`; the side effect (writing back to the todo) is captured by closure into a local variable `captured: SubTaskDraft[] | null`.
5. Call `anthropic.beta.messages.toolRunner({ model: 'claude-sonnet-4-6', max_tokens: 2048, max_iterations: 10, messages: [{role:'user', content: BREAKDOWN_USER_PROMPT(todo.title)}], system: BREAKDOWN_SYSTEM_PROMPT, tools: [...mcpTools, recordSubTasksTool] })`.
6. After the runner resolves:
   - If `captured` is null → `{ ok:false, error:'no_sub_tasks_recorded' }`.
   - Else: assign new `id`s, mark `completed:false`, append to `todo.subTasks`, bump `updatedAt`, persist.
7. `closeAll(connected)` in a `finally`.
8. Return `{ ok:true, subTasksAdded: captured.length, failedServers: failed.map(f => f.cfg.name) }`.

**Prompts** (`lib/ai/prompts.ts`):

- `BREAKDOWN_SYSTEM_PROMPT`: instructs the model that it MUST call `record_sub_tasks` exactly once with the final list of 3–7 actionable sub-tasks, and that MCP tools are optional research aids.
- `BREAKDOWN_USER_PROMPT(title)`: `"Break this task into actionable sub-tasks: ${title}"`.

**Model selection:** `claude-sonnet-4-6` (latest Sonnet at time of writing). Configurable via env var `BREAKDOWN_MODEL`.

## 10. UI Components

`app/page.tsx` — Server Component:

- Reads todos via `lib/store/todos.ts`.
- Renders `<AddTodoForm />` then `<TodoList items={todos} />`.

`app/components/TodoItem.tsx` — Client Component:

- Checkbox bound to `toggleTodo` server action.
- Title display.
- "분해" button: calls `breakdownTodo`, shows pending spinner, toasts result.
- Expandable sub-task list: each sub-task has a checkbox bound to `toggleSubTask`.
- Delete button bound to `deleteTodo` (with `confirm()` dialog).

`app/components/AddTodoForm.tsx` — Client Component:

- `useActionState(addTodo, initialState)` for inline validation errors.
- Single text input + submit button. Submits via form action.

`app/settings/page.tsx` — Server Component:

- Lists registered MCP servers with name, command, args.
- "Test" button per server invokes `testMcpServer` action.
- `<McpServerForm />` to add a new server.

`app/components/McpServerForm.tsx` — Client Component:

- Fields: name, command, args (textarea, one per line), env (key=value lines, optional).
- Submits to `addMcpServer` action.

**Styling:** Tailwind CSS (Next.js default starter). Minimal — focus on functionality.

## 11. Configuration & Environment

`.env.example`:

```
ANTHROPIC_API_KEY=
BREAKDOWN_MODEL=claude-sonnet-4-6
```

- If `ANTHROPIC_API_KEY` is missing at request time, `breakdownTodo` returns `{ ok:false, error:'missing_api_key' }`. UI greys out the "분해" button when a small server-rendered flag indicates no key.

## 12. Error Handling Summary

| Failure | Behavior |
|---|---|
| Missing API key | "분해" disabled, tooltip explains; action returns structured error if called |
| MCP server fails to start | That server skipped; others proceed; UI toast lists failed names |
| MCP `callTool` throws mid-loop | `toolRunner` propagates; we catch, mark breakdown failed for this todo |
| Tool input schema mismatch | SDK throws; same as above |
| JSON file missing or corrupt | `readJson` returns the default (empty), logs a warning; next write rebuilds the file |
| Concurrent writes | In-process mutex serializes; atomic rename prevents torn files |

All Server Actions wrap calls in try/catch and return `{ ok, error }` rather than throwing across the RSC boundary.

## 13. Testing Strategy

**Unit (Vitest):**

- `lib/store/atomic-json.ts` — read/write/round-trip in a temp dir; concurrent writes converge.
- `lib/store/todos.ts` — CRUD on a temp file; subTask updates.
- `lib/mcp/adapter.ts` — pure transform from `ListedTool[]` to `BetaTool[]`; name prefixing and collision handling.
- `lib/ai/breakdown.ts` — Anthropic client mocked; verify (a) tools assembled correctly, (b) `record_sub_tasks` output is persisted, (c) MCP failures don't abort.

**Integration (Vitest):**

- `tests/fixtures/echo-mcp-server.ts` is a tiny stdio MCP server exposing one `echo` tool.
- Spin it up via `pool.openAll`, ensure `listTools` returns `echo`, ensure adapter wires it to Anthropic shape.
- A second test runs the full `breakdown()` with a mocked Anthropic that scripts a `tool_use` of `echo` followed by `record_sub_tasks`.

**E2E (optional, deferred):** Playwright happy-path: add → toggle → delete. Skip breakdown (covered by integration).

## 14. Dependencies

```json
{
  "dependencies": {
    "next": "^16",
    "react": "^19",
    "react-dom": "^19",
    "@anthropic-ai/sdk": "^0.x (latest with betaTool/toolRunner helpers)",
    "@modelcontextprotocol/sdk": "^1.x",
    "zod": "^3"
  },
  "devDependencies": {
    "typescript": "^5",
    "@types/node": "^22",
    "@types/react": "^19",
    "tailwindcss": "^4",
    "vitest": "^2",
    "@testing-library/react": "^16",
    "happy-dom": "^15"
  }
}
```

(Exact versions resolved at install time. Anthropic SDK `betaTool`/`toolRunner` helpers are required — fall back to manual tool loop if not yet available in the installed version.)

## 15. Open Questions / Future Work

- **HTTP MCP transport** — when added, `McpServerConfig` becomes a discriminated union on `transport` (`'stdio' | 'http'`), and `lib/mcp/client.ts` gains a `connectHttp` branch. Storage format stays compatible because existing records already carry `transport: 'stdio'`.
- **Streaming breakdown UX** — once basic flow is solid, swap the action for a Route Handler returning SSE so sub-tasks appear incrementally.
- **Sub-task drag/reorder** — not in v1.
- **Filtering / search** — not in v1.
- **Persistent MCP connections** — only if latency complaints appear.
