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
