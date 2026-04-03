import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'Concurrent Banking System',
  description: 'MERN concurrent banking transaction system with optimistic concurrency control',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50">
        <nav className="bg-blue-900 text-white px-6 py-4 shadow-lg">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <Link href="/" className="text-xl font-bold tracking-tight">
              Concurrent Banking System
            </Link>
            <div className="flex gap-4 text-sm">
              <Link href="/" className="hover:text-blue-200 transition">Dashboard</Link>
            </div>
          </div>
        </nav>
        <main className="max-w-7xl mx-auto px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
