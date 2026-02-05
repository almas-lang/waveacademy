'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';

export default function HomePage() {
  const router = useRouter();
  const [isHydrated, setIsHydrated] = useState(false);

  // Wait for client-side hydration
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    // Wait for client-side mount
    if (!isHydrated) return;

    // Give zustand a moment to hydrate from localStorage
    const timer = setTimeout(() => {
      const state = useAuthStore.getState();

      if (!state.isAuthenticated) {
        router.push('/auth/login');
      } else if (state.user?.role === 'ADMIN') {
        router.push('/admin');
      } else {
        router.push('/learner');
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [isHydrated, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading...</p>
      </div>
    </div>
  );
}
