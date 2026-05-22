'use client';

import { useTransition, useRef, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Todo, Quadrant } from '@/lib/store/types';
import { TodoList } from './TodoList';
import { AddTodoModal } from './AddTodoModal';
import { mutate } from './mutate';

interface Props {
  quadrant: Quadrant;
  label: string;
  sublabel: string;
  dot: string;
  headerClass: string;
  items: Todo[];
  canBreakdown: boolean;
}

export function QuadrantPanel({ quadrant, label, sublabel, dot, headerClass, items, canBreakdown }: Props) {
  const router = useRouter();
  const [showInput, setShowInput] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showInput) inputRef.current?.focus();
  }, [showInput]);

  function handleInlineSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        await mutate('add', { title: fd.get('title'), quadrant });
        router.refresh();
        setShowInput(false);
      } catch {
        // 무시
      }
    });
  }

  return (
    <div className="flex min-h-52 flex-col rounded-xl bg-white shadow-sm ring-1 ring-gray-100 dark:bg-gray-900 dark:ring-gray-800">
      {/* 헤더 */}
      <div className="flex items-center gap-2 px-4 py-3">
        <span className={`h-2.5 w-2.5 rounded-full ${dot}`} />
        <span className={`text-sm font-semibold ${headerClass}`}>{label}</span>
        <span className="text-xs text-gray-400">{sublabel}</span>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-gray-400">{items.length}</span>
          <button
            type="button"
            onClick={() => setShowModal(true)}
            title="할 일 추가"
            className="flex h-5 w-5 items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      </div>

      {showModal && <AddTodoModal quadrant={quadrant} onClose={() => setShowModal(false)} />}

      {/* 할 일 목록 */}
      <div className="flex-1 px-2">
        <TodoList items={items} canBreakdown={canBreakdown} emptyMessage="" />
      </div>

      {/* 인라인 추가 */}
      <div className="px-3 pb-3">
        {showInput ? (
          <form onSubmit={handleInlineSubmit} className="flex gap-2">
            <input type="hidden" name="quadrant" value={quadrant} />
            <input
              ref={inputRef}
              name="title"
              required
              maxLength={200}
              placeholder="할 일 입력..."
              className="flex-1 rounded-lg bg-gray-100 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400 dark:bg-gray-800"
            />
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-blue-600 px-3 py-2 text-xs text-white disabled:opacity-50"
            >
              {pending ? '…' : '추가'}
            </button>
            <button
              type="button"
              onClick={() => setShowInput(false)}
              className="rounded-lg px-2 py-2 text-xs text-gray-400 hover:text-gray-600"
            >
              취소
            </button>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setShowInput(true)}
            className="flex w-full items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-gray-400 transition hover:bg-gray-50 hover:text-gray-600 dark:hover:bg-gray-800"
          >
            <span className="text-base leading-none">+</span> 여기에 추가
          </button>
        )}
      </div>
    </div>
  );
}
