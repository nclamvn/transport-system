'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { getUser, clearAuth, isAuthenticated, isReviewer } from '@/lib/auth';

export default function ReviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<{ name: string; roles: string[] } | null>(null);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
    if (!isReviewer()) {
      router.push('/login?error=unauthorized');
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

  const getRoleLabel = () => {
    if (user.roles.includes('ADMIN')) return 'Quản trị viên';
    if (user.roles.includes('DISPATCHER')) return 'Điều độ';
    if (user.roles.includes('HR')) return 'Kế toán';
    return '';
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div>
              <h1 className="font-semibold text-slate-900">Hệ Thống Vận Tải</h1>
              <p className="text-xs text-slate-500">{user.name} - {getRoleLabel()}</p>
            </div>
            <nav className="hidden md:flex items-center gap-1">
              <Link
                href="/dashboard"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  pathname === '/dashboard'
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Tổng quan
              </Link>
              <Link
                href="/review/trips"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  pathname.startsWith('/review')
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Duyệt chuyến
              </Link>
              {(user.roles.includes('ADMIN') || user.roles.includes('HR')) && (
                <Link
                  href="/hr/salary/periods"
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    pathname.startsWith('/hr/salary')
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Bảng lương
                </Link>
              )}
            </nav>
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
      <main className="max-w-7xl mx-auto">
        {children}
      </main>
    </div>
  );
}
