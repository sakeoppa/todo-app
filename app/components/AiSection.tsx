'use client';

import { useState } from 'react';
import { settingsMutate } from './settingsMutate';
import type { Preferences } from '@/lib/store/preferences';

interface Props {
  prefs: Pick<Preferences, 'aiProvider' | 'ollamaUrl' | 'ollamaModel' | 'anthropicApiKey'>;
}

export function AiSection({ prefs }: Props) {
  const [provider, setProvider] = useState(prefs.aiProvider);
  const [apiKey, setApiKey] = useState(prefs.anthropicApiKey ?? '');
  const [keySaved, setKeySaved] = useState(false);
  const [keySaving, setKeySaving] = useState(false);
  const [url, setUrl] = useState(prefs.ollamaUrl || 'http://localhost:11434');
  const [model, setModel] = useState(prefs.ollamaModel || '');
  const [models, setModels] = useState<string[]>([]);
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function saveApiKey() {
    setKeySaving(true);
    try {
      await settingsMutate('updateAnthropicKey', { key: apiKey });
      setKeySaved(true);
      setTimeout(() => setKeySaved(false), 2000);
    } finally {
      setKeySaving(false);
    }
  }

  async function fetchModels() {
    setFetching(true);
    setFetchError('');
    try {
      const res = await fetch(`${url}/api/tags`);
      if (!res.ok) throw new Error(`${res.status}`);
      const data = (await res.json()) as { models?: { name: string }[] };
      const list = (data.models ?? []).map((m) => m.name);
      if (!list.length) throw new Error('설치된 모델 없음');
      setModels(list);
      if (!model || !list.includes(model)) setModel(list[0]);
      setFetchError('');
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : '연결 실패');
      setModels([]);
    } finally {
      setFetching(false);
    }
  }

  async function save() {
    setSaving(true);
    try {
      await settingsMutate('updateAi', { provider, ollamaUrl: url, ollamaModel: model });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">AI 분해 설정</h2>
        <p className="mt-0.5 text-xs text-gray-500">할 일 자동 분해에 사용할 AI 제공자를 선택하세요</p>
      </div>

      {/* Provider 선택 */}
      <div className="flex gap-2">
        {/* Anthropic */}
        <button
          type="button"
          onClick={() => setProvider('anthropic')}
          className={`flex-1 rounded-xl border-2 p-3 text-left transition-colors ${
            provider === 'anthropic'
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
              : 'border-gray-200 hover:border-gray-300 dark:border-gray-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="text-base">☁️</span>
            <span className="text-sm font-medium text-gray-900 dark:text-white">Anthropic</span>
            {apiKey
              ? <span className="ml-auto text-[10px] text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full dark:bg-green-900/30">API 키 있음</span>
              : <span className="ml-auto text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full dark:bg-gray-800">API 키 없음</span>
            }
          </div>
          <p className="mt-1 text-[11px] text-gray-500">Claude 모델 사용, API 키 필요</p>
        </button>

        {/* Ollama */}
        <button
          type="button"
          onClick={() => setProvider('ollama')}
          className={`flex-1 rounded-xl border-2 p-3 text-left transition-colors ${
            provider === 'ollama'
              ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
              : 'border-gray-200 hover:border-gray-300 dark:border-gray-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="text-base">🦙</span>
            <span className="text-sm font-medium text-gray-900 dark:text-white">Ollama</span>
            <span className="ml-auto text-[10px] text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded-full dark:bg-purple-900/30">무료 · 로컬</span>
          </div>
          <p className="mt-1 text-[11px] text-gray-500">인터넷 없이 로컬 LLM 사용</p>
        </button>
      </div>

      {/* Anthropic 키 입력 */}
      {provider === 'anthropic' && (
        <div className="space-y-2 rounded-xl bg-gray-50 p-4 dark:bg-gray-800/50">
          <label className="block text-xs font-medium text-gray-500">Anthropic API 키</label>
          <div className="flex gap-2">
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-ant-..."
              className="flex-1 rounded-lg bg-white px-3 py-2 font-mono text-sm outline-none ring-1 ring-gray-200 focus:ring-2 focus:ring-blue-400 dark:bg-gray-900 dark:ring-gray-700 dark:text-white"
            />
            <button
              type="button"
              onClick={saveApiKey}
              disabled={keySaving}
              className="rounded-lg bg-blue-600 px-3 py-2 text-xs text-white transition hover:bg-blue-700 disabled:opacity-50"
            >
              {keySaving ? '…' : '저장'}
            </button>
          </div>
          {keySaved && <p className="text-xs text-green-600">저장됐어요</p>}
          <p className="text-[11px] text-gray-400">
            키는 <a href="https://console.anthropic.com" target="_blank" rel="noreferrer" className="underline">console.anthropic.com</a>에서 발급받을 수 있어요
          </p>
        </div>
      )}

      {/* Ollama 세부 설정 */}
      {provider === 'ollama' && (
        <div className="space-y-3 rounded-xl bg-gray-50 p-4 dark:bg-gray-800/50">
          {/* URL */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Ollama 서버 URL</label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full rounded-lg bg-white px-3 py-2 font-mono text-sm outline-none ring-1 ring-gray-200 focus:ring-2 focus:ring-purple-400 dark:bg-gray-900 dark:ring-gray-700 dark:text-white"
            />
          </div>

          {/* 모델 선택 */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">모델</label>
            <div className="flex gap-2">
              {models.length > 0 ? (
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="flex-1 rounded-lg bg-white px-3 py-2 text-sm outline-none ring-1 ring-gray-200 focus:ring-2 focus:ring-purple-400 dark:bg-gray-900 dark:ring-gray-700 dark:text-white"
                >
                  {models.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="예: qwen2.5:7b"
                  className="flex-1 rounded-lg bg-white px-3 py-2 font-mono text-sm outline-none ring-1 ring-gray-200 focus:ring-2 focus:ring-purple-400 dark:bg-gray-900 dark:ring-gray-700 dark:text-white"
                />
              )}
              <button
                type="button"
                onClick={fetchModels}
                disabled={fetching}
                className="rounded-lg bg-purple-600 px-3 py-2 text-xs text-white transition hover:bg-purple-700 disabled:opacity-50"
              >
                {fetching ? '…' : '모델 조회'}
              </button>
            </div>
            {fetchError && <p className="mt-1 text-xs text-red-500">{fetchError}</p>}
            {models.length > 0 && <p className="mt-1 text-xs text-green-600">{models.length}개 모델 발견</p>}
          </div>

          {/* 설치 안내 */}
          {fetchError && (
            <div className="rounded-lg bg-yellow-50 px-3 py-2 text-xs text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400">
              Ollama가 실행 중이지 않아요.{' '}
              <code className="font-mono">brew install ollama</code> 후{' '}
              <code className="font-mono">ollama serve</code> 를 실행하세요.{' '}
              <br className="mt-1"/>
              추천 모델: <code className="font-mono">ollama pull qwen2.5:7b</code>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={saving || (provider === 'ollama' && !model)}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white transition hover:bg-blue-700 disabled:opacity-40"
        >
          {saving ? '저장 중…' : '저장'}
        </button>
        {saved && <span className="text-xs text-green-600">저장됐어요</span>}
        {provider === 'ollama' && !model && (
          <span className="text-xs text-gray-400">모델을 선택해야 저장할 수 있어요</span>
        )}
      </div>
    </section>
  );
}
