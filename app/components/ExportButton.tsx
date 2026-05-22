'use client';

import { useState } from 'react';
import { todosToMarkdown } from '@/lib/markdown';
import type { Todo } from '@/lib/store/types';

export function ExportButton() {
  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    setExporting(true);
    try {
      const res = await fetch('/api/todos');
      const { todos } = await res.json() as { todos: Todo[] };
      const md = todosToMarkdown(todos);
      const filename = `todos-${new Date().toISOString().slice(0, 10)}.md`;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const api = (window as any).electronAPI;
      if (api?.exportMarkdown) {
        await api.exportMarkdown(md, filename);
      } else {
        const blob = new Blob([md], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = filename; a.click();
        URL.revokeObjectURL(url);
      }
    } finally {
      setExporting(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={exporting}
      title="전체 할 일을 마크다운으로 내보내기"
      className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 disabled:opacity-40 dark:hover:bg-gray-800 dark:hover:text-gray-300"
    >
      <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
        <path d="M6.5 1v7M4 6l2.5 2.5L9 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M1.5 10h10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
      {exporting ? '…' : 'MD 내보내기'}
    </button>
  );
}
