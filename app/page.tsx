import { todoStore } from '@/lib/store/todos';
import { hasApiKey } from './actions';
import { AddTodoForm } from './components/AddTodoForm';
import { TodoList } from './components/TodoList';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const [todos, apiKeyAvailable] = await Promise.all([todoStore.list(), hasApiKey()]);
  return (
    <main>
      <AddTodoForm />
      {!apiKeyAvailable && (
        <p className="mb-4 rounded border border-yellow-400 bg-yellow-50 p-3 text-sm text-yellow-900 dark:bg-yellow-950 dark:text-yellow-100">
          ANTHROPIC_API_KEY가 설정되지 않아 &ldquo;분해&rdquo; 기능이 비활성화됩니다. <code>.env.local</code>에 키를 추가하세요.
        </p>
      )}
      <TodoList items={todos} canBreakdown={apiKeyAvailable} />
    </main>
  );
}
