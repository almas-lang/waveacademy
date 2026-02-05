'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { LearnerSidebar } from '@/components/learner';
import { PageLoading } from '@/components/ui/LoadingSpinner';

export default function LearnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, user } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
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

      // Check authentication
      if (!state.isAuthenticated) {
        router.push('/auth/login');
        return;
      }

      // Check if user is learner
      if (state.user?.role !== 'LEARNER') {
        router.push('/admin');
        return;
      }

      setIsChecking(false);
    }, 100);

    return () => clearTimeout(timer);
  }, [isHydrated, router]);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  if (isChecking) {
    return <PageLoading />;
  }

  return (
    <div className="flex h-screen bg-surface overflow-hidden">
      <LearnerSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
