'use server';

import { preferencesStore } from '@/lib/store/preferences';

export async function hasApiKey(): Promise<boolean> {
  const prefs = await preferencesStore.get();
  if (prefs.aiProvider === 'ollama') return Boolean(prefs.ollamaModel);
  return Boolean(prefs.anthropicApiKey) || Boolean(process.env.ANTHROPIC_API_KEY);
}
