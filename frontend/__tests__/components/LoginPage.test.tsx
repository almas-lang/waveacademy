import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Mock next/navigation
const pushMock = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

// Mock next/link
jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
});

// Mock auth API
const loginMock = jest.fn();
const checkAdminMock = jest.fn().mockResolvedValue({ data: { adminExists: true } });
const meMock = jest.fn().mockResolvedValue({ success: true, data: { user: {} } });
jest.mock('@/lib/api', () => ({
  authApi: {
    login: (...args: unknown[]) => loginMock(...args),
    checkAdminExists: () => checkAdminMock(),
    loginForce: jest.fn(),
    me: () => meMock(),
  },
}));

// Mock auth store
const loginStoreMock = jest.fn();
jest.mock('@/lib/auth-store', () => ({
  useAuthStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({ login: loginStoreMock, user: null, isAuthenticated: false }),
}));

// Mock toast
jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn() },
}));

import LoginPage from '@/app/auth/login/page';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('LoginPage', () => {
  it('renders email and password fields', () => {
    render(<LoginPage />);
    expect(screen.getByPlaceholderText('you@example.com')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
  });

  it('renders submit button', () => {
    render(<LoginPage />);
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('shows validation error when submitting empty form', async () => {
    render(<LoginPage />);
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/email.*required/i)).toBeInTheDocument();
    });
    expect(loginMock).not.toHaveBeenCalled();
  });

  it('calls login API with email and password', async () => {
    loginMock.mockResolvedValueOnce({
      success: true,
      data: { user: { id: '1', email: 'admin@test.com', name: 'Admin', role: 'ADMIN' } },
    });

    render(<LoginPage />);

    fireEvent.change(screen.getByPlaceholderText('you@example.com'), { target: { value: 'admin@test.com' } });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'Password1!' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(loginMock).toHaveBeenCalledWith('admin@test.com', 'Password1!');
    });
  });

  it('redirects admin to /admin after successful login', async () => {
    loginMock.mockResolvedValueOnce({
      success: true,
      data: { user: { id: '1', email: 'admin@test.com', name: 'Admin', role: 'ADMIN' } },
    });

    render(<LoginPage />);

    fireEvent.change(screen.getByPlaceholderText('you@example.com'), { target: { value: 'admin@test.com' } });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'Password1!' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith('/admin');
    });
  });

  it('redirects learner to /learner after successful login', async () => {
    loginMock.mockResolvedValueOnce({
      success: true,
      data: { user: { id: '2', email: 'learner@test.com', name: 'Learner', role: 'LEARNER' } },
    });

    render(<LoginPage />);

    fireEvent.change(screen.getByPlaceholderText('you@example.com'), { target: { value: 'learner@test.com' } });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'Password1!' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith('/learner');
    });
  });

  it('shows error message on invalid credentials', async () => {
    loginMock.mockRejectedValueOnce({
      response: { data: { error: { code: 'INVALID_CREDENTIALS', message: 'Invalid credentials' } } },
    });

    render(<LoginPage />);

    fireEvent.change(screen.getByPlaceholderText('you@example.com'), { target: { value: 'admin@test.com' } });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'wrongpassword' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument();
    });
  });
});
