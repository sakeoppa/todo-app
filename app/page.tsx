import { todoStore } from '@/lib/store/todos';
import { hasApiKey } from './actions';
import { TodoGrid } from './components/TodoGrid';
import { ApiKeyBanner } from './components/ApiKeyBanner';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const [todos, apiKeyAvailable] = await Promise.all([todoStore.list(), hasApiKey()]);

  return (
    <main>
      {!apiKeyAvailable && <ApiKeyBanner />}
      <TodoGrid todos={todos} canBreakdown={apiKeyAvailable} />
    </main>
  );
}
