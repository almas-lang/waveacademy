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

// Hook to wait for hydration - checks both zustand state and localStorage directly
export const useAuthHydration = () => {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Small delay to ensure zustand has time to hydrate
    // This is more reliable than depending on _hasHydrated state
    const checkHydration = () => {
      const hasHydrated = useAuthStore.getState()._hasHydrated;
      if (hasHydrated) {
        setIsReady(true);
      } else {
        // Check again after a short delay
        setTimeout(checkHydration, 50);
      }
    };

    // Start checking immediately
    checkHydration();
  }, []);

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
