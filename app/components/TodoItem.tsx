'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { Todo } from '@/lib/store/types';
import type { BreakdownResult } from '@/lib/ai/breakdown';
import { SubTaskList } from './SubTaskList';
import { todoToMarkdown } from '@/lib/markdown';
import { mutate } from './mutate';

function DueBadge({ dueDate, completed }: { dueDate: string; completed: boolean }) {
  const due = new Date(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  const diff = Math.round((due.getTime() - today.getTime()) / 86400000);

  let label = '';
  if (diff < 0) label = `${Math.abs(diff)}일 초과`;
  else if (diff === 0) label = '오늘';
  else if (diff === 1) label = '내일';
  else label = `D-${diff}`;

  const color =
    completed ? 'bg-gray-100 text-gray-400 dark:bg-gray-800' :
    diff < 0   ? 'bg-red-50 text-red-500 dark:bg-red-900/30 dark:text-red-400' :
    diff <= 2  ? 'bg-orange-50 text-orange-500 dark:bg-orange-900/30 dark:text-orange-400' :
                 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400';

  return (
    <span className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] ${color}`}>
      <svg width="8" height="8" viewBox="0 0 10 10" fill="none"><rect x="1" y="2" width="8" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.2"/><path d="M3 1v2M7 1v2M1 5h8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
      {label}
    </span>
  );
}

export function TodoItem({ todo, canBreakdown, collapsibleSubTasks }: { todo: Todo; canBreakdown: boolean; collapsibleSubTasks?: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [breakdownPending, setBreakdownPending] = useState(false);
  const [breakdownMessage, setBreakdownMessage] = useState<string | null>(null);
  const [showAddSub, setShowAddSub] = useState(false);
  const [subTitle, setSubTitle] = useState('');
  const [addSubPending, startAddSub] = useTransition();
  const [copied, setCopied] = useState(false);

  async function onCopyMd() {
    const text = todoToMarkdown(todo);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // HTTP fallback (mobile)
      const el = document.createElement('textarea');
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function onBreakdown() {
    setBreakdownPending(true);
    setBreakdownMessage(null);
    try {
      const result = await mutate<BreakdownResult>('breakdown', { id: todo.id });
      if (result.ok) {
        setBreakdownMessage(`${result.subTasksAdded}개 추가됨`);
        router.refresh();
      } else {
        const detail = 'detail' in result && result.detail ? ` — ${result.detail}` : '';
        setBreakdownMessage(`분해 실패: ${result.error}${detail}`);
      }
    } catch (err) {
      setBreakdownMessage(`분해 실패: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setBreakdownPending(false);
    }
  }

  function onAddSubSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!subTitle.trim()) return;
    startAddSub(async () => {
      await mutate('addSub', { todoId: todo.id, title: subTitle });
      setSubTitle('');
      setShowAddSub(false);
      router.refresh();
    });
  }

  return (
    <div className="group rounded-lg px-3 py-2 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/60">
      <div className="flex items-center gap-2.5">
        <input
          type="checkbox"
          checked={todo.completed}
          disabled={pending}
          onChange={() => start(async () => { await mutate('toggle', { id: todo.id }); router.refresh(); })}
          className="h-4 w-4 shrink-0 accent-blue-600"
        />
        <div className="flex-1 min-w-0">
          <span className={`text-sm ${todo.completed ? 'text-gray-400 line-through' : ''}`}>
            {todo.title}
          </span>
          {/* 메모 */}
          {todo.memo && (
            <p className="mt-0.5 truncate text-xs text-gray-400">{todo.memo}</p>
          )}
          {/* 마감일 / 반복 뱃지 */}
          {(todo.dueDate || (todo.repeat && todo.repeat !== 'none')) && (
            <div className="mt-1 flex flex-wrap gap-1">
              {todo.dueDate && (
                <DueBadge dueDate={todo.dueDate} completed={todo.completed} />
              )}
              {todo.repeat && todo.repeat !== 'none' && (
                <span className="inline-flex items-center gap-0.5 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] text-blue-500 dark:bg-blue-900/30 dark:text-blue-400">
                  <svg width="8" height="8" viewBox="0 0 10 10" fill="none"><path d="M1 5a4 4 0 104-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M5 1L3 3l2 2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  {{ daily: '매일', weekly: '매주', monthly: '매월' }[todo.repeat]}
                </span>
              )}
            </div>
          )}
        </div>

        {/* 모바일: 항상 표시 / 데스크탑: hover 시 표시 */}
        <div className="flex items-center gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
          <button
            type="button"
            onClick={onCopyMd}
            title="마크다운으로 복사"
            className="rounded px-1.5 py-0.5 text-xs text-gray-400 hover:bg-gray-200 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-200"
          >
            {copied ? '✓' : 'MD'}
          </button>
          <button
            type="button"
            onClick={() => setShowAddSub((v) => !v)}
            title="하위 항목 추가"
            className="rounded px-1.5 py-0.5 text-xs text-gray-400 hover:bg-gray-200 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-200"
          >
            + 세분화
          </button>
          {canBreakdown && (
            <button
              type="button"
              disabled={breakdownPending}
              onClick={onBreakdown}
              title="AI로 자동 분해"
              className="rounded px-1.5 py-0.5 text-xs text-purple-400 hover:bg-purple-50 hover:text-purple-600 disabled:opacity-40 dark:hover:bg-purple-900/30"
            >
              {breakdownPending ? '…' : '✦ AI'}
            </button>
          )}
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              if (!confirm('삭제하시겠습니까?')) return;
              start(async () => { await mutate('delete', { id: todo.id }); router.refresh(); });
            }}
            className="rounded px-1.5 py-0.5 text-xs text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
          >
            ×
          </button>
        </div>
      </div>

      {showAddSub && (
        <form onSubmit={onAddSubSubmit} className="mt-2 flex gap-2 pl-6">
          <input
            autoFocus
            value={subTitle}
            onChange={(e) => setSubTitle(e.target.value)}
            placeholder="하위 항목 입력..."
            maxLength={200}
            className="flex-1 rounded-lg bg-gray-100 px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-blue-400 dark:bg-gray-800"
          />
          <button
            type="submit"
            disabled={addSubPending || !subTitle.trim()}
            className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs text-white disabled:opacity-50"
          >
            {addSubPending ? '…' : '추가'}
          </button>
          <button
            type="button"
            onClick={() => { setShowAddSub(false); setSubTitle(''); }}
            className="rounded-lg px-2 py-1.5 text-xs text-gray-400 hover:text-gray-600"
          >
            취소
          </button>
        </form>
      )}

      {breakdownMessage && (
        <p className="mt-1 pl-6 text-xs text-gray-400">{breakdownMessage}</p>
      )}
      <SubTaskList todoId={todo.id} subTasks={todo.subTasks} collapsible={collapsibleSubTasks} />
    </div>
  );
}
