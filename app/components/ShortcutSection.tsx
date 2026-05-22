'use client';

import { useState, useEffect } from 'react';
import { settingsMutate } from './settingsMutate';

function toDisplay(shortcut: string): string {
  return shortcut
    .split('+')
    .map((k) => {
      if (k === 'CommandOrControl') return '⌘';
      if (k === 'Shift') return '⇧';
      if (k === 'Alt') return '⌥';
      if (k === 'Space') return 'Space';
      return k;
    })
    .join(' ');
}

function captureShortcut(e: KeyboardEvent): string | null {
  const mods: string[] = [];
  if (e.metaKey || e.ctrlKey) mods.push('CommandOrControl');
  if (e.shiftKey) mods.push('Shift');
  if (e.altKey) mods.push('Alt');

  const skip = ['Meta', 'Control', 'Shift', 'Alt'];
  if (skip.includes(e.key)) return null;
  if (mods.length === 0) return null;

  let key = e.key;
  if (key === ' ') key = 'Space';
  else if (key.length === 1) key = key.toUpperCase();
  else if (key === 'ArrowUp') key = 'Up';
  else if (key === 'ArrowDown') key = 'Down';
  else if (key === 'ArrowLeft') key = 'Left';
  else if (key === 'ArrowRight') key = 'Right';

  return [...mods, key].join('+');
}

export function ShortcutSection({ initialShortcut }: { initialShortcut: string }) {
  const [shortcut, setShortcut] = useState(initialShortcut);
  const [recording, setRecording] = useState(false);
  const [draft, setDraft] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  useEffect(() => {
    if (!recording) return;
    const handler = (e: KeyboardEvent) => {
      e.preventDefault();
      if (e.key === 'Escape') { setRecording(false); setDraft(null); return; }
      const result = captureShortcut(e);
      if (result) setDraft(result);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [recording]);

  async function handleSave() {
    if (!draft) return;
    setStatus('saving');
    try {
      await settingsMutate('updateShortcut', { shortcut: draft });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (window as any).electronAPI?.updateShortcut(draft);
      setShortcut(draft);
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 2000);
    } catch {
      setStatus('error');
    }
    setRecording(false);
    setDraft(null);
  }

  return (
    <section className="space-y-2">
      <div>
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">글로벌 단축키 (Quick Add)</h2>
        <p className="mt-0.5 text-xs text-gray-500">어느 앱에서든 눌러서 빠르게 할 일 추가</p>
      </div>

      <div className="flex items-center gap-2">
        <div
          className={`flex-1 rounded-lg px-3 py-2.5 font-mono text-sm tracking-wide transition-colors ${
            recording
              ? 'bg-blue-50 ring-2 ring-blue-400 dark:bg-blue-900/20 dark:ring-blue-500'
              : 'bg-gray-100 dark:bg-gray-800'
          } ${recording ? 'text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-200'}`}
        >
          {recording
            ? (draft ? toDisplay(draft) : '단축키를 눌러주세요…')
            : toDisplay(shortcut)}
        </div>

        {recording ? (
          <>
            <button
              onClick={handleSave}
              disabled={!draft || status === 'saving'}
              className="rounded-lg bg-blue-600 px-3 py-2.5 text-sm text-white transition hover:bg-blue-700 disabled:opacity-40"
            >
              {status === 'saving' ? '…' : '저장'}
            </button>
            <button
              onClick={() => { setRecording(false); setDraft(null); }}
              className="rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-500 transition hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
            >
              취소
            </button>
          </>
        ) : (
          <button
            onClick={() => { setRecording(true); setDraft(null); }}
            className="rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-500 transition hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
          >
            변경
          </button>
        )}
      </div>

      {status === 'saved' && <p className="text-xs text-green-500">저장됐어요. 앱을 다시 열면 적용돼요.</p>}
      {status === 'error' && <p className="text-xs text-red-500">저장 실패</p>}
      {recording && <p className="text-xs text-gray-400">ESC를 누르면 취소돼요</p>}
    </section>
  );
}
