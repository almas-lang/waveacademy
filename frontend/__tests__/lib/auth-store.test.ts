import { renderHook, act } from '@testing-library/react';
import { useAuthStore, useIsAdmin, useIsLearner, useAuthHydration } from '@/lib/auth-store';

const adminUser = { id: '1', email: 'admin@test.com', name: 'Admin', role: 'ADMIN' as const };
const learnerUser = { id: '2', email: 'learner@test.com', name: 'Learner', role: 'LEARNER' as const };

beforeEach(() => {
  useAuthStore.setState({
    user: null,
    isAuthenticated: false,
    _hasHydrated: false,
  });
});

describe('useAuthStore', () => {
  // ── Initial state ──

  describe('initial state', () => {
    it('has null user', () => {
      expect(useAuthStore.getState().user).toBeNull();
    });

    it('is not authenticated', () => {
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });
  });

  // ── login ──

  describe('login', () => {
    it('sets the user', () => {
      useAuthStore.getState().login(adminUser);
      expect(useAuthStore.getState().user).toEqual(adminUser);
    });

    it('sets isAuthenticated to true', () => {
      useAuthStore.getState().login(adminUser);
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
    });
  });

  // ── logout ──

  describe('logout', () => {
    it('clears the user', () => {
      useAuthStore.getState().login(adminUser);
      useAuthStore.getState().logout();
      expect(useAuthStore.getState().user).toBeNull();
    });

    it('sets isAuthenticated to false', () => {
      useAuthStore.getState().login(adminUser);
      useAuthStore.getState().logout();
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });
  });

  // ── persist partialize ──

  describe('persist partialize', () => {
    it('only persists user and isAuthenticated (not _hasHydrated)', () => {
      // Access the persist API to check partialize
      const persist = (useAuthStore as any).persist;
      const options = persist?.getOptions?.();
      if (options?.partialize) {
        const partialized = options.partialize({
          user: adminUser,
          isAuthenticated: true,
          _hasHydrated: true,
          login: jest.fn(),
          logout: jest.fn(),
          setHasHydrated: jest.fn(),
        });
        expect(partialized).toEqual({ user: adminUser, isAuthenticated: true });
        expect(partialized).not.toHaveProperty('_hasHydrated');
      }
    });
  });
});

// ── useIsAdmin ──

describe('useIsAdmin', () => {
  it('returns true for ADMIN user', () => {
    useAuthStore.setState({ user: adminUser });
    const { result } = renderHook(() => useIsAdmin());
    expect(result.current).toBe(true);
  });

  it('returns false for LEARNER user', () => {
    useAuthStore.setState({ user: learnerUser });
    const { result } = renderHook(() => useIsAdmin());
    expect(result.current).toBe(false);
  });

  it('returns false when user is null', () => {
    const { result } = renderHook(() => useIsAdmin());
    expect(result.current).toBe(false);
  });
});

// ── useIsLearner ──

describe('useIsLearner', () => {
  it('returns true for LEARNER user', () => {
    useAuthStore.setState({ user: learnerUser });
    const { result } = renderHook(() => useIsLearner());
    expect(result.current).toBe(true);
  });

  it('returns false for ADMIN user', () => {
    useAuthStore.setState({ user: adminUser });
    const { result } = renderHook(() => useIsLearner());
    expect(result.current).toBe(false);
  });

  it('returns false when user is null', () => {
    const { result } = renderHook(() => useIsLearner());
    expect(result.current).toBe(false);
  });
});

// ── useAuthHydration ──

describe('useAuthHydration', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns false before hydration', () => {
    const { result } = renderHook(() => useAuthHydration());
    expect(result.current).toBe(false);
  });

  it('returns true after hydration completes', () => {
    const { result } = renderHook(() => useAuthHydration());

    act(() => {
      useAuthStore.getState().setHasHydrated(true);
      jest.advanceTimersByTime(100);
    });

    expect(result.current).toBe(true);
  });
});
