import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useEffect, useState } from 'react';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'LEARNER';
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  _hasHydrated: boolean;
  login: (user: User) => void;
  logout: () => void;
  setHasHydrated: (state: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      _hasHydrated: false,

      login: (user: User) => {
        set({ user, isAuthenticated: true });
      },

      logout: () => {
        set({ user: null, isAuthenticated: false });
      },

      setHasHydrated: (state: boolean) => {
        set({ _hasHydrated: state });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);

// Hook to wait for hydration — uses Zustand subscribe (no polling)
export const useAuthHydration = () => {
  const [isReady, setIsReady] = useState(() => useAuthStore.getState()._hasHydrated);

  useEffect(() => {
    if (isReady) return;

    const unsub = useAuthStore.subscribe((state) => {
      if (state._hasHydrated) {
        setIsReady(true);
        unsub();
      }
    });

    // Check once more in case it hydrated between render and effect
    if (useAuthStore.getState()._hasHydrated) {
      setIsReady(true);
      unsub();
    }

    return unsub;
  }, [isReady]);

  return isReady;
};

// Hook to check if user is admin
export const useIsAdmin = () => {
  const user = useAuthStore((state) => state.user);
  return user?.role === 'ADMIN';
};

// Hook to check if user is learner
export const useIsLearner = () => {
  const user = useAuthStore((state) => state.user);
  return user?.role === 'LEARNER';
};
