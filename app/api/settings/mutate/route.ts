import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { preferencesStore } from '@/lib/store/preferences';
import { createClient } from '@/lib/supabase/server';

function bad(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status });
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  let body: { action?: string; [k: string]: unknown };
  try {
    body = await req.json();
  } catch {
    return bad('invalid json');
  }

  try {
    switch (body.action) {
      case 'updateAi': {
        const provider = body.provider === 'ollama' ? 'ollama' : 'anthropic';
        const ollamaUrl = typeof body.ollamaUrl === 'string' ? body.ollamaUrl : '';
        const ollamaModel = typeof body.ollamaModel === 'string' ? body.ollamaModel : '';
        await preferencesStore.update({ aiProvider: provider, ollamaUrl, ollamaModel });
        revalidatePath('/settings');
        return NextResponse.json({ ok: true });
      }

      case 'updateAnthropicKey': {
        const key = typeof body.key === 'string' ? body.key.trim() : '';
        await preferencesStore.update({ anthropicApiKey: key });
        revalidatePath('/settings');
        return NextResponse.json({ ok: true });
      }

      default:
        return bad(`unknown action: ${body.action}`);
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'server error' },
      { status: 500 },
    );
  }
}
