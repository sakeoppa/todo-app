'use client';

import { useState, useEffect } from 'react';

const STORAGE_KEY = 'apikey-banner-dismissed';

export function ApiKeyBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) setVisible(true);
  }, []);

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, '1');
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 rounded-full border border-yellow-300 bg-yellow-50 px-4 py-2 text-xs text-yellow-800 shadow-md dark:border-yellow-700 dark:bg-yellow-900/60 dark:text-yellow-200">
      <span>
        AI 분해 기능을 쓰려면 <code className="font-mono">.env.local</code>에{' '}
        <code className="font-mono">ANTHROPIC_API_KEY</code>를 추가하세요.
      </span>
      <button
        onClick={dismiss}
        className="ml-1 text-yellow-600 hover:text-yellow-900 dark:text-yellow-400 dark:hover:text-yellow-100"
        aria-label="닫기"
      >
        ✕
      </button>
    </div>
  );
}
