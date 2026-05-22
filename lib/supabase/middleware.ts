// 요청마다 로그인 세션을 갱신하고, 로그인 안 한 사용자를 /login 으로 보냄
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();

  // 로그인 안 했고, 인증 페이지/API가 아니면 → 로그인 페이지로
  const path = request.nextUrl.pathname;
  const isAuthPage =
    path.startsWith('/login') ||
    path.startsWith('/signup') ||
    path.startsWith('/auth');
  const isApi = path.startsWith('/api');

  if (!user && !isAuthPage && !isApi) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
