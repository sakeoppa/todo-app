import Link from 'next/link';
import { preferencesStore } from '@/lib/store/preferences';
import { AiSection } from '@/app/components/AiSection';
import { ThemeToggle } from '@/app/components/ThemeToggle';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const prefs = await preferencesStore.get();
  return (
    <main className="space-y-8">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-gray-100"
      >
        ← 돌아가기
      </Link>

      <ThemeToggle />

      <hr className="border-gray-100 dark:border-gray-800" />

      <AiSection
        prefs={{
          aiProvider: prefs.aiProvider,
          anthropicApiKey: prefs.anthropicApiKey,
          ollamaUrl: prefs.ollamaUrl,
          ollamaModel: prefs.ollamaModel,
        }}
      />
    </main>
  );
}
