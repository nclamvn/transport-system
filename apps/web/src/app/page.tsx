'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Check if logged in
    const token = localStorage.getItem('token');
    if (token) {
      router.push('/driver/trips');
    } else {
      router.push('/login');
    }
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="spinner border-primary-500 border-t-transparent"></div>
    </div>
  );
}
