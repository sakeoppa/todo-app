'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { SubTask } from '@/lib/store/types';
import { mutate } from './mutate';

export function SubTaskList({ todoId, subTasks, collapsible }: {
  todoId: string;
  subTasks: SubTask[];
  collapsible?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  if (subTasks.length === 0) return null;

  const doneCount = subTasks.filter((s) => s.completed).length;
  const isOpen = collapsible ? open : true;

  return (
    <div className="mt-1.5 pl-5">
      {collapsible && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center text-gray-300 hover:text-gray-500 dark:hover:text-gray-400"
        >
          <svg
            width="12" height="12" viewBox="0 0 10 10" fill="none"
            className={`transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
          >
            <path d="M2 3.5l3 3 3-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      )}
      {isOpen && (
        <ul className="mt-1 space-y-1">
          {subTasks.map((s) => (
            <li key={s.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={s.completed}
                disabled={pending}
                onChange={() => start(async () => { await mutate('toggleSub', { todoId, subTaskId: s.id }); router.refresh(); })}
                className="shrink-0"
              />
              <span className={`flex-1 ${s.completed ? 'text-gray-400 line-through' : ''}`}>
                {s.title}
              </span>
              <button
                type="button"
                disabled={pending}
                onClick={() => start(async () => { await mutate('removeSub', { todoId, subTaskId: s.id }); router.refresh(); })}
                className="text-xs text-gray-400 hover:text-red-500 dark:hover:text-red-400"
                title="삭제"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
