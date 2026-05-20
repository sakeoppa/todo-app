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
