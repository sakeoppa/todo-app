import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import './globals.css';
import { MobileFab } from './components/MobileFab';
import { LogoutButton } from './components/LogoutButton';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: '할 일',
  description: '할 일 관리 앱',
  icons: { icon: '/favicon.svg', apple: '/icons/icon-192.png' },
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: '할 일' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `(function(){var t=localStorage.getItem('theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark')}})()` }} />
      </head>
      <body>
        <div className="mx-auto max-w-5xl p-6">
          <header className="mb-6 flex items-center justify-between">
            <Link href="/" className="text-xl font-semibold">To do</Link>
            {user && (
              <div className="flex items-center gap-3">
                <Link href="/settings" className="text-sm text-blue-600 hover:underline">설정</Link>
                <LogoutButton />
              </div>
            )}
          </header>
          {children}
        </div>
        {user && <MobileFab />}
      </body>
    </html>
  );
}
