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
