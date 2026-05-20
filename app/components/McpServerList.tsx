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
      {servers.map((s) => {
        const result = results[s.id];
        return (
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
            {result && (
              <p className={`mt-2 text-xs ${result.ok ? 'text-green-700 dark:text-green-300' : 'text-red-600'}`}>
                {result.ok
                  ? `OK — tools: ${result.tools.join(', ') || '(none)'}`
                  : `실패: ${result.error}`}
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
