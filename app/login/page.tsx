'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // 저장된 이메일 있으면 불러오기
  useEffect(() => {
    const saved = localStorage.getItem('savedEmail');
    if (saved) {
      setEmail(saved);
      setRemember(true);
    }
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError('로그인 실패: 이메일 또는 비밀번호를 확인하세요');
      return;
    }

    // 이메일 저장 / 삭제
    if (remember) {
      localStorage.setItem('savedEmail', email);
    } else {
      localStorage.removeItem('savedEmail');
    }

    router.push('/');
    router.refresh();
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100 dark:bg-gray-900 dark:ring-gray-800">
        <h1 className="mb-1 text-xl font-semibold">로그인</h1>
        <p className="mb-5 text-sm text-gray-500 dark:text-gray-400">할 일을 관리하려면 로그인하세요</p>

        <form onSubmit={handleLogin} className="space-y-3">
          <input
            type="email"
            required
            placeholder="이메일"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg bg-gray-100 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-400 dark:bg-gray-800 dark:text-white"
          />
          <input
            type="password"
            required
            placeholder="비밀번호"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg bg-gray-100 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-400 dark:bg-gray-800 dark:text-white"
          />

          <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="h-4 w-4 accent-blue-600"
            />
            이메일 저장
          </label>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? '로그인 중…' : '로그인'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
          계정이 없으세요?{' '}
          <Link href="/signup" className="text-blue-600 hover:underline">회원가입</Link>
        </p>
      </div>
    </div>
  );
}
