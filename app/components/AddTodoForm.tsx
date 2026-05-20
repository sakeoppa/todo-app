'use client';

import { useActionState, useRef, useEffect } from 'react';
import { addTodo, type AddTodoState } from '@/app/actions';

const initial: AddTodoState = {};

export function AddTodoForm() {
  const [state, formAction, pending] = useActionState(addTodo, initial);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!pending && !state.error) formRef.current?.reset();
  }, [pending, state]);

  return (
    <form ref={formRef} action={formAction} className="mb-6 flex gap-2">
      <input
        name="title"
        placeholder="새 할 일"
        required
        maxLength={200}
        className="flex-1 rounded border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
      >
        {pending ? '추가 중…' : '추가'}
      </button>
      {state.error && <p className="basis-full text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
