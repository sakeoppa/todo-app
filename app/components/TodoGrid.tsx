'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import type { Todo, Quadrant } from '@/lib/store/types';
import { QuadrantPanel } from './QuadrantPanel';
import { ExportButton } from './ExportButton';
import { CompletedDrawer } from './CompletedDrawer';

type SortKey = 'newest' | 'oldest' | 'name' | 'incomplete';

const SORT_OPTIONS: { key: SortKey; label: string; desc: string }[] = [
  { key: 'newest',     label: '최신순',      desc: '나중에 추가한 순' },
  { key: 'oldest',     label: '오래된순',    desc: '먼저 추가한 순' },
  { key: 'name',       label: '이름순',      desc: '가나다 순' },
  { key: 'incomplete', label: '미완료 먼저', desc: '아직 안 한 일 위로' },
];

const QUADRANTS: {
  id: Quadrant;
  label: string;
  sublabel: string;
  dot: string;
  headerClass: string;
}[] = [
  { id: 'important-urgent',         label: '중요 + 긴급',   sublabel: '지금 당장!', dot: 'bg-red-500',    headerClass: 'text-red-700 dark:text-red-400' },
  { id: 'important-not-urgent',     label: '중요 + 여유',   sublabel: '계획하기',   dot: 'bg-blue-500',   headerClass: 'text-blue-700 dark:text-blue-400' },
  { id: 'not-important-urgent',     label: '긴급 + 덜중요', sublabel: '위임하기',   dot: 'bg-yellow-400', headerClass: 'text-yellow-700 dark:text-yellow-400' },
  { id: 'not-important-not-urgent', label: '여유 + 덜중요', sublabel: '나중에',     dot: 'bg-gray-400',   headerClass: 'text-gray-500 dark:text-gray-400' },
];

function sortTodos(todos: Todo[], key: SortKey): Todo[] {
  return [...todos].sort((a, b) => {
    switch (key) {
      case 'newest':
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case 'oldest':
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      case 'name':
        return a.title.localeCompare(b.title, 'ko');
      case 'incomplete':
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
  });
}

function SortIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M2 4h10M4 7h6M6 10h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

export function TodoGrid({ todos, canBreakdown }: { todos: Todo[]; canBreakdown: boolean }) {
  const [sort, setSort] = useState<SortKey>('newest');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const sortedTodos = useMemo(() => sortTodos(todos, sort), [todos, sort]);
  const activeTodos = useMemo(() => sortedTodos.filter((t) => !t.completed), [sortedTodos]);
  const completedTodos = useMemo(() => sortedTodos.filter((t) => t.completed), [sortedTodos]);
  const currentLabel = SORT_OPTIONS.find((o) => o.key === sort)!.label;

  return (
    <>
      <div className="mb-3 flex items-center justify-end gap-1">
        <ExportButton />
        <div ref={ref} className="relative">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs transition-colors ${
              open
                ? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200'
                : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300'
            }`}
          >
            <SortIcon />
            <span>{currentLabel}</span>
          </button>

          {open && (
            <div className="absolute right-0 top-full z-20 mt-1.5 w-44 rounded-xl border border-gray-100 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-900">
              {SORT_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => { setSort(opt.key); setOpen(false); }}
                  className={`flex w-full items-center justify-between px-3 py-2 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 ${
                    sort === opt.key ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  <div>
                    <div className="text-xs font-medium">{opt.label}</div>
                    <div className="text-[10px] text-gray-400">{opt.desc}</div>
                  </div>
                  {sort === opt.key && (
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 min-[600px]:grid-cols-2 [&>*]:transition-all [&>*]:duration-300">
        {QUADRANTS.map((q) => {
          const items = activeTodos.filter((t) => t.quadrant === q.id);
          return (
            <QuadrantPanel
              key={q.id}
              quadrant={q.id}
              label={q.label}
              sublabel={q.sublabel}
              dot={q.dot}
              headerClass={q.headerClass}
              items={items}
              canBreakdown={canBreakdown}
            />
          );
        })}
      </div>

      <CompletedDrawer todos={completedTodos} canBreakdown={canBreakdown} />
    </>
  );
}
