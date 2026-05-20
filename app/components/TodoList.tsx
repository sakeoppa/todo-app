import type { Todo } from '@/lib/store/types';
import { TodoItem } from './TodoItem';

export function TodoList({ items, canBreakdown }: { items: Todo[]; canBreakdown: boolean }) {
  if (items.length === 0) {
    return <p className="text-gray-500">할 일이 없습니다. 위 입력창에서 추가하세요.</p>;
  }
  return (
    <ul className="space-y-2">
      {items.map((t) => (
        <li key={t.id}>
          <TodoItem todo={t} canBreakdown={canBreakdown} />
        </li>
      ))}
    </ul>
  );
}
