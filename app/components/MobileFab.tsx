'use client';

import { useState } from 'react';
import { AddTodoModal } from './AddTodoModal';

export function MobileFab() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="할 일 추가"
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg shadow-blue-600/30 transition-transform active:scale-95 sm:hidden"
      >
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <path d="M11 4v14M4 11h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </button>
      {open && <AddTodoModal quadrant="important-urgent" onClose={() => setOpen(false)} />}
    </>
  );
}
