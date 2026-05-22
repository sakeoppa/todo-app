import { createClient } from '@/lib/supabase/server';

export type Preferences = {
  aiProvider: 'anthropic' | 'ollama';
  anthropicApiKey: string;
  ollamaUrl: string;
  ollamaModel: string;
};

const DEFAULTS: Preferences = {
  aiProvider: 'anthropic',
  anthropicApiKey: '',
  ollamaUrl: 'http://localhost:11434',
  ollamaModel: '',
};

type Row = {
  ai_provider: string;
  anthropic_api_key: string | null;
  ollama_url: string | null;
  ollama_model: string | null;
};

function rowToPrefs(r: Row): Preferences {
  return {
    aiProvider: r.ai_provider === 'ollama' ? 'ollama' : 'anthropic',
    anthropicApiKey: r.anthropic_api_key ?? '',
    ollamaUrl: r.ollama_url ?? 'http://localhost:11434',
    ollamaModel: r.ollama_model ?? '',
  };
}

export const preferencesStore = {
  async get(): Promise<Preferences> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return DEFAULTS;

    const { data } = await supabase
      .from('preferences')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    return data ? rowToPrefs(data as Row) : DEFAULTS;
  },

  async update(patch: Partial<Preferences>): Promise<Preferences> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('로그인이 필요합니다');

    const dbPatch: Record<string, unknown> = {};
    if (patch.aiProvider !== undefined) dbPatch.ai_provider = patch.aiProvider;
    if (patch.anthropicApiKey !== undefined) dbPatch.anthropic_api_key = patch.anthropicApiKey || null;
    if (patch.ollamaUrl !== undefined) dbPatch.ollama_url = patch.ollamaUrl;
    if (patch.ollamaModel !== undefined) dbPatch.ollama_model = patch.ollamaModel;

    const { data, error } = await supabase
      .from('preferences')
      .upsert({ user_id: user.id, ...dbPatch }, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) throw error;
    return rowToPrefs(data as Row);
  },
};
