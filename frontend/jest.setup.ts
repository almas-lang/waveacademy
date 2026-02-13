import '@testing-library/jest-dom';

// Global mock: next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    refresh: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    prefetch: jest.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  redirect: jest.fn(),
}));

// Global mock: react-hot-toast
jest.mock('react-hot-toast', () => {
  const toast = jest.fn() as jest.Mock & {
    success: jest.Mock;
    error: jest.Mock;
    loading: jest.Mock;
    dismiss: jest.Mock;
  };
  toast.success = jest.fn();
  toast.error = jest.fn();
  toast.loading = jest.fn();
  toast.dismiss = jest.fn();
  return { __esModule: true, default: toast };
});

beforeEach(() => {
  jest.clearAllMocks();
});
