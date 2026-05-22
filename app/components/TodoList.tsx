import type { Todo } from '@/lib/store/types';
import { TodoItem } from './TodoItem';

export function TodoList({
  items,
  canBreakdown,
  emptyMessage = '할 일이 없습니다.',
}: {
  items: Todo[];
  canBreakdown: boolean;
  emptyMessage?: string;
}) {
  if (items.length === 0) {
    return <p className="text-sm text-gray-400 italic">{emptyMessage}</p>;
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
