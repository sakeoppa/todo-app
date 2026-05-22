'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError('비밀번호는 6자 이상이어야 해요');
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({ email, password });
    setLoading(false);

    if (error) {
      setError('회원가입 실패: ' + error.message);
      return;
    }

    // 이메일 확인이 꺼져 있으면 바로 세션 생성됨
    if (data.session) {
      router.push('/');
      router.refresh();
    } else {
      setDone(true);
    }
  }

  if (done) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center">
        <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-sm ring-1 ring-gray-100 dark:bg-gray-900 dark:ring-gray-800">
          <p className="mb-2 text-3xl">📧</p>
          <h1 className="mb-1 text-lg font-semibold">이메일을 확인하세요</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {email} 으로 인증 메일을 보냈어요.<br />
            메일의 링크를 클릭하면 가입 완료됩니다.
          </p>
          <Link href="/login" className="mt-4 inline-block text-sm text-blue-600 hover:underline">
            로그인하러 가기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100 dark:bg-gray-900 dark:ring-gray-800">
        <h1 className="mb-1 text-xl font-semibold">회원가입</h1>
        <p className="mb-5 text-sm text-gray-500 dark:text-gray-400">새 계정을 만들어 시작하세요</p>

        <form onSubmit={handleSignup} className="space-y-3">
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
            placeholder="비밀번호 (6자 이상)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg bg-gray-100 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-400 dark:bg-gray-800 dark:text-white"
          />

          {error && <p className="text-xs text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? '가입 중…' : '회원가입'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
          이미 계정이 있으세요?{' '}
          <Link href="/login" className="text-blue-600 hover:underline">로그인</Link>
        </p>
      </div>
    </div>
  );
}
