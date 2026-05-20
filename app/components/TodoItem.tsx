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
      const detail = 'detail' in result && result.detail ? ` — ${result.detail}` : '';
      setBreakdownMessage(`분해 실패: ${result.error}${detail}`);
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
