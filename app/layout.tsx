import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'Todo + MCP',
  description: 'Local-first todo app with MCP-powered AI breakdown',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <div className="mx-auto max-w-2xl p-6">
          <header className="mb-6 flex items-center justify-between">
            <Link href="/" className="text-xl font-semibold">Todos</Link>
            <Link href="/settings" className="text-sm text-blue-600 hover:underline">Settings</Link>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
