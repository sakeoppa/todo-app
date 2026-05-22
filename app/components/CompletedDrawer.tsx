'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { Todo, Quadrant } from '@/lib/store/types';
import { TodoItem } from './TodoItem';
import { mutate } from './mutate';

const QUADRANT_META: Record<Quadrant, { label: string; dot: string }> = {
  'important-urgent':         { label: '중요 + 긴급',   dot: 'bg-red-400' },
  'important-not-urgent':     { label: '중요 + 여유',   dot: 'bg-blue-400' },
  'not-important-urgent':     { label: '긴급 + 덜중요', dot: 'bg-yellow-400' },
  'not-important-not-urgent': { label: '여유 + 덜중요', dot: 'bg-gray-400' },
};

const QUADRANT_ORDER: Quadrant[] = [
  'important-urgent',
  'important-not-urgent',
  'not-important-urgent',
  'not-important-not-urgent',
];

export function CompletedDrawer({ todos, canBreakdown }: { todos: Todo[]; canBreakdown: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  if (todos.length === 0) return null;

  const grouped = QUADRANT_ORDER
    .map((q) => ({ quadrant: q, items: todos.filter((t) => t.quadrant === q) }))
    .filter(({ items }) => items.length > 0);

  function handleDeleteAll() {
    if (!confirm(`완료된 항목 ${todos.length}개를 모두 삭제할까요?`)) return;
    start(async () => { await mutate('deleteCompleted'); router.refresh(); });
  }

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 rounded-xl border border-gray-100 bg-white px-4 py-2.5 text-left transition-colors hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900/60 dark:hover:bg-gray-800/60"
      >
        <svg
          width="13" height="13" viewBox="0 0 14 14" fill="none"
          className={`shrink-0 text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        >
          <path d="M2 5l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span className="flex-1 text-xs font-medium text-gray-400">완료된 항목 보기</span>
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-400 dark:bg-gray-800">
          총 {todos.length}개
        </span>
      </button>

      {open && (
        <div className="mt-1.5 overflow-hidden rounded-xl border border-gray-100 bg-white dark:border-gray-800 dark:bg-gray-900/60">
          <div className="flex items-center justify-between border-b border-gray-50 px-4 py-2 dark:border-gray-800">
            <span className="text-[11px] text-gray-400">분면별로 묶어서 보여요</span>
            <button
              type="button"
              disabled={pending}
              onClick={handleDeleteAll}
              className="text-[11px] text-gray-400 transition-colors hover:text-red-500 disabled:opacity-40"
            >
              {pending ? '삭제 중…' : '전체 삭제'}
            </button>
          </div>

          <div className="grid grid-cols-1 gap-2 p-2 min-[600px]:grid-cols-2">
            {grouped.map(({ quadrant, items }) => {
              const meta = QUADRANT_META[quadrant];
              return (
                <div key={quadrant} className="rounded-lg border border-gray-50 bg-gray-50/50 px-2 py-2 dark:border-gray-800 dark:bg-gray-800/20">
                  <div className="mb-1.5 flex items-center gap-1.5 px-1">
                    <span className={`h-1.5 w-1.5 rounded-full ${meta.dot} opacity-50`} />
                    <span className="text-[10px] font-medium text-gray-400">{meta.label}</span>
                    <span className="text-[10px] text-gray-300 dark:text-gray-600">{items.length}개</span>
                  </div>
                  <div className="opacity-60">
                    {items.map((todo) => (
                      <TodoItem key={todo.id} todo={todo} canBreakdown={canBreakdown} collapsibleSubTasks />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
