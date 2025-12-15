'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { getUser, clearAuth, isAuthenticated } from '@/lib/auth';

export default function DriverLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<{ name: string } | null>(null);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
    setUser(getUser());
  }, [router]);

  const handleLogout = () => {
    clearAuth();
    router.push('/login');
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner border-primary-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="font-semibold text-slate-900">Hệ Thống Vận Tải</h1>
            <p className="text-xs text-slate-500">{user.name} - Tài xế</p>
          </div>
          <button
            onClick={handleLogout}
            className="text-sm text-slate-600 hover:text-slate-900"
          >
            Đăng xuất
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>

      {/* Bottom navigation */}
      <nav className="bg-white border-t border-slate-200 sticky bottom-0 safe-area-pb">
        <div className="flex">
          <Link
            href="/driver/trips"
            className={`flex-1 py-3 text-center text-sm font-medium ${
              pathname === '/driver/trips'
                ? 'text-primary-500 border-t-2 border-primary-500 -mt-[2px]'
                : 'text-slate-600'
            }`}
          >
            <svg className="w-6 h-6 mx-auto mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Chuyến
          </Link>
          <Link
            href="/driver/trips/new"
            className={`flex-1 py-3 text-center text-sm font-medium ${
              pathname === '/driver/trips/new'
                ? 'text-primary-500 border-t-2 border-primary-500 -mt-[2px]'
                : 'text-slate-600'
            }`}
          >
            <svg className="w-6 h-6 mx-auto mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Tạo mới
          </Link>
        </div>
      </nav>
    </div>
  );
}
