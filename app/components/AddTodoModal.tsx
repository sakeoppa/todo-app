'use client';

import { useTransition, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import { mutate } from './mutate';
import type { Quadrant, RepeatType } from '@/lib/store/types';

const QUADRANT_LABELS: Record<Quadrant, { label: string; color: string }> = {
  'important-urgent':         { label: '중요 + 긴급',   color: 'text-red-600 dark:text-red-400' },
  'important-not-urgent':     { label: '중요 + 여유',   color: 'text-blue-600 dark:text-blue-400' },
  'not-important-urgent':     { label: '긴급 + 덜중요', color: 'text-yellow-600 dark:text-yellow-500' },
  'not-important-not-urgent': { label: '여유 + 덜중요', color: 'text-gray-500 dark:text-gray-400' },
};

const REPEAT_OPTIONS: { key: RepeatType; label: string }[] = [
  { key: 'none',    label: '없음' },
  { key: 'daily',   label: '매일' },
  { key: 'weekly',  label: '매주' },
  { key: 'monthly', label: '매월' },
];

interface Props {
  quadrant: Quadrant;
  onClose: () => void;
}

export function AddTodoModal({ quadrant, onClose }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [repeat, setRepeat] = useState<RepeatType>('none');
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => { titleRef.current?.focus(); }, []);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setError(null);
    startTransition(async () => {
      try {
        await mutate('add', {
          title: fd.get('title'),
          quadrant,
          memo: fd.get('memo') ?? undefined,
          dueDate: fd.get('dueDate') ?? null,
          repeat,
        });
        router.refresh();
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'failed');
      }
    });
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const q = QUADRANT_LABELS[quadrant];

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/25 p-4 pt-[8vh] backdrop-blur-sm sm:items-center sm:pt-4"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-[88vw] max-w-[280px] rounded-2xl bg-white shadow-xl ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-700">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">새 할 일</p>
            <p className={`text-xs ${q.color}`}>{q.label}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-4 pb-3 space-y-2">
          <input type="hidden" name="quadrant" value={quadrant} />
          <input type="hidden" name="repeat" value={repeat} />

          {/* 제목 */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">제목 *</label>
            <input
              ref={titleRef}
              name="title"
              required
              maxLength={200}
              placeholder="할 일을 입력하세요"
              className="w-full rounded-lg bg-gray-100 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400 dark:bg-gray-800 dark:text-white"
            />
          </div>

          {/* 메모 */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">메모</label>
            <textarea
              name="memo"
              maxLength={1000}
              rows={1}
              placeholder="추가 메모 (선택)"
              className="w-full resize-none rounded-lg bg-gray-100 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400 dark:bg-gray-800 dark:text-white"
            />
          </div>

          {/* 마감일 */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">마감일</label>
            <div className="overflow-hidden rounded-lg bg-gray-100 focus-within:ring-2 focus-within:ring-blue-400 dark:bg-gray-800">
              <input
                name="dueDate"
                type="date"
                className="date-input block w-full appearance-none bg-transparent px-3 py-2 text-sm outline-none dark:text-white dark:[color-scheme:dark]"
              />
            </div>
          </div>

          {/* 반복 */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-400">반복</label>
            <div className="flex gap-1.5">
              {REPEAT_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setRepeat(opt.key)}
                  className={`flex-1 rounded-lg py-1.5 text-xs transition-colors ${
                    repeat === opt.key
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          {/* 버튼 */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-gray-200 py-2 text-sm text-gray-500 transition hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={pending}
              className="flex-1 rounded-lg bg-blue-600 py-2 text-sm text-white transition hover:bg-blue-700 disabled:opacity-50"
            >
              {pending ? '…' : '추가하기'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
