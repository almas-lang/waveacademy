import { renderHook, waitFor, act } from '@testing-library/react';
import toast from 'react-hot-toast';
import { createWrapper } from '../test-utils';
import {
  learnerKeys,
  useLearners,
  useLearner,
  useCreateLearner,
  useUpdateLearner,
  useUpdateLearnerStatus,
  useEnrollLearner,
  useUnenrollLearner,
  useLogoutLearnerAllDevices,
} from '@/hooks/useLearners';

// Mock the API module
jest.mock('@/lib/api', () => ({
  adminApi: {
    getLearners: jest.fn(),
    getLearner: jest.fn(),
    createLearner: jest.fn(),
    updateLearner: jest.fn(),
    updateLearnerStatus: jest.fn(),
    enrollLearner: jest.fn(),
    unenrollLearner: jest.fn(),
    logoutLearnerAllDevices: jest.fn(),
  },
}));

import { adminApi } from '@/lib/api';

const mockAdminApi = adminApi as jest.Mocked<typeof adminApi>;

const mockLearner = {
  id: 'l1',
  name: 'Test Learner',
  email: 'test@example.com',
  status: 'ACTIVE' as const,
  enrolledPrograms: [],
  createdAt: '2025-01-01',
};

describe('useLearners hooks', () => {
  // ── Query keys ──

  describe('learnerKeys', () => {
    it('has correct "all" key', () => {
      expect(learnerKeys.all).toEqual(['admin', 'learners']);
    });

    it('builds list key with filters', () => {
      expect(learnerKeys.list({ status: 'ACTIVE' as any, page: 1 })).toEqual([
        'admin', 'learners', 'list', { status: 'ACTIVE', page: 1 },
      ]);
    });

    it('builds detail key with id', () => {
      expect(learnerKeys.detail('l1')).toEqual([
        'admin', 'learners', 'detail', 'l1',
      ]);
    });
  });

  // ── useLearners ──

  describe('useLearners', () => {
    it('fetches learners with filters', async () => {
      mockAdminApi.getLearners.mockResolvedValueOnce({
        data: {
          learners: [mockLearner],
          pagination: { total: 1, page: 1, limit: 20, totalPages: 1 },
        },
      });

      const { result } = renderHook(() => useLearners({ page: 1 }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockAdminApi.getLearners).toHaveBeenCalledWith({ page: 1 });
      expect(result.current.data?.learners).toHaveLength(1);
      expect(result.current.data?.pagination.total).toBe(1);
    });
  });

  // ── useLearner ──

  describe('useLearner', () => {
    it('fetches a single learner by id', async () => {
      mockAdminApi.getLearner.mockResolvedValueOnce({
        data: {
          learner: mockLearner,
          programProgress: [],
          recentProgress: [],
        },
      });

      const { result } = renderHook(() => useLearner('l1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockAdminApi.getLearner).toHaveBeenCalledWith('l1');
      expect(result.current.data?.learner).toEqual(mockLearner);
    });

    it('is disabled when id is empty string', () => {
      const { result } = renderHook(() => useLearner(''), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe('idle');
    });
  });

  // ── useCreateLearner ──

  describe('useCreateLearner', () => {
    it('calls createLearner API', async () => {
      mockAdminApi.createLearner.mockResolvedValueOnce({ data: { learner: mockLearner } });

      const { result } = renderHook(() => useCreateLearner(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ email: 'test@example.com', name: 'Test' });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockAdminApi.createLearner).toHaveBeenCalledWith({
        email: 'test@example.com',
        name: 'Test',
      });
    });

    it('shows success toast on success', async () => {
      mockAdminApi.createLearner.mockResolvedValueOnce({ data: {} });

      const { result } = renderHook(() => useCreateLearner(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ email: 'a@b.com', name: 'A' });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(toast.success).toHaveBeenCalledWith('Learner created successfully. Setup email sent.');
    });

    it('shows error toast on failure', async () => {
      mockAdminApi.createLearner.mockRejectedValueOnce({
        response: { data: { error: { message: 'Email exists' } } },
      });

      const { result } = renderHook(() => useCreateLearner(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ email: 'dup@test.com', name: 'Dup' });
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(toast.error).toHaveBeenCalledWith('Email exists');
    });
  });

  // ── useUpdateLearner ──

  describe('useUpdateLearner', () => {
    it('calls updateLearner API with id and data', async () => {
      mockAdminApi.updateLearner.mockResolvedValueOnce({ data: {} });

      const { result } = renderHook(() => useUpdateLearner(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ id: 'l1', data: { name: 'Updated' } });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockAdminApi.updateLearner).toHaveBeenCalledWith('l1', { name: 'Updated' });
    });

    it('shows success toast', async () => {
      mockAdminApi.updateLearner.mockResolvedValueOnce({ data: {} });

      const { result } = renderHook(() => useUpdateLearner(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ id: 'l1', data: { name: 'Updated' } });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(toast.success).toHaveBeenCalledWith('Learner updated successfully');
    });
  });

  // ── useUpdateLearnerStatus ──

  describe('useUpdateLearnerStatus', () => {
    it('calls updateLearnerStatus API', async () => {
      mockAdminApi.updateLearnerStatus.mockResolvedValueOnce({ data: {} });

      const { result } = renderHook(() => useUpdateLearnerStatus(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ id: 'l1', status: 'INACTIVE' });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockAdminApi.updateLearnerStatus).toHaveBeenCalledWith('l1', 'INACTIVE');
    });

    it('shows success toast', async () => {
      mockAdminApi.updateLearnerStatus.mockResolvedValueOnce({ data: {} });

      const { result } = renderHook(() => useUpdateLearnerStatus(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ id: 'l1', status: 'INACTIVE' });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(toast.success).toHaveBeenCalledWith('Learner status updated');
    });
  });

  // ── useEnrollLearner ──

  describe('useEnrollLearner', () => {
    it('calls enrollLearner API', async () => {
      mockAdminApi.enrollLearner.mockResolvedValueOnce({ data: {} });

      const { result } = renderHook(() => useEnrollLearner(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ learnerId: 'l1', programId: 'p1' });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockAdminApi.enrollLearner).toHaveBeenCalledWith('l1', 'p1');
    });

    it('shows success toast', async () => {
      mockAdminApi.enrollLearner.mockResolvedValueOnce({ data: {} });

      const { result } = renderHook(() => useEnrollLearner(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ learnerId: 'l1', programId: 'p1' });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(toast.success).toHaveBeenCalledWith('Learner enrolled in program');
    });
  });

  // ── useUnenrollLearner ──

  describe('useUnenrollLearner', () => {
    it('calls unenrollLearner API', async () => {
      mockAdminApi.unenrollLearner.mockResolvedValueOnce({ data: {} });

      const { result } = renderHook(() => useUnenrollLearner(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ learnerId: 'l1', programId: 'p1' });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockAdminApi.unenrollLearner).toHaveBeenCalledWith('l1', 'p1');
    });

    it('shows success toast', async () => {
      mockAdminApi.unenrollLearner.mockResolvedValueOnce({ data: {} });

      const { result } = renderHook(() => useUnenrollLearner(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ learnerId: 'l1', programId: 'p1' });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(toast.success).toHaveBeenCalledWith('Learner removed from program');
    });
  });

  // ── useLogoutLearnerAllDevices ──

  describe('useLogoutLearnerAllDevices', () => {
    it('calls logoutLearnerAllDevices API', async () => {
      mockAdminApi.logoutLearnerAllDevices.mockResolvedValueOnce({ message: 'Done' });

      const { result } = renderHook(() => useLogoutLearnerAllDevices(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate('l1');
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockAdminApi.logoutLearnerAllDevices).toHaveBeenCalledWith('l1');
    });

    it('shows response.message in success toast', async () => {
      mockAdminApi.logoutLearnerAllDevices.mockResolvedValueOnce({ message: 'Logged out 3 sessions' });

      const { result } = renderHook(() => useLogoutLearnerAllDevices(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate('l1');
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(toast.success).toHaveBeenCalledWith('Logged out 3 sessions');
    });

    it('shows error toast on failure', async () => {
      mockAdminApi.logoutLearnerAllDevices.mockRejectedValueOnce({
        response: { data: { error: { message: 'Server error' } } },
      });

      const { result } = renderHook(() => useLogoutLearnerAllDevices(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate('l1');
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(toast.error).toHaveBeenCalledWith('Server error');
    });
  });
});
