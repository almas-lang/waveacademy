import { renderHook, waitFor, act } from '@testing-library/react';
import toast from 'react-hot-toast';
import { createWrapper } from '../test-utils';
import {
  programKeys,
  useProgramsPaginated,
  usePrograms,
  useProgram,
  useCreateProgram,
  useUpdateProgram,
  useDeleteProgram,
  useTogglePublish,
  useCreateTopic,
  useCreateLesson,
  useDeleteLesson,
  useReorderContent,
} from '@/hooks/usePrograms';

// Mock the API module
jest.mock('@/lib/api', () => ({
  adminApi: {
    getPrograms: jest.fn(),
    getProgram: jest.fn(),
    createProgram: jest.fn(),
    updateProgram: jest.fn(),
    deleteProgram: jest.fn(),
    togglePublish: jest.fn(),
    createTopic: jest.fn(),
    createLesson: jest.fn(),
    deleteLesson: jest.fn(),
    reorderContent: jest.fn(),
  },
}));

import { adminApi } from '@/lib/api';

const mockAdminApi = adminApi as jest.Mocked<typeof adminApi>;

const mockProgram = {
  id: 'p1',
  name: 'Test Program',
  isPublished: false,
  learnerCount: 0,
  lessonCount: 5,
  totalDurationHours: 2,
  createdAt: '2025-01-01',
};

describe('usePrograms hooks', () => {
  // ── Query keys ──

  describe('programKeys', () => {
    it('has correct "all" key', () => {
      expect(programKeys.all).toEqual(['admin', 'programs']);
    });

    it('builds list key with filters', () => {
      expect(programKeys.list({ page: 1, limit: 20 })).toEqual([
        'admin', 'programs', 'list', { page: 1, limit: 20 },
      ]);
    });

    it('builds listAll key', () => {
      expect(programKeys.listAll()).toEqual([
        'admin', 'programs', 'list', 'all',
      ]);
    });

    it('builds detail key with id', () => {
      expect(programKeys.detail('p1')).toEqual([
        'admin', 'programs', 'detail', 'p1',
      ]);
    });
  });

  // ── useProgramsPaginated ──

  describe('useProgramsPaginated', () => {
    it('fetches programs with page and limit', async () => {
      mockAdminApi.getPrograms.mockResolvedValueOnce({
        data: {
          programs: [mockProgram],
          pagination: { total: 1, page: 1, limit: 20, totalPages: 1 },
        },
      });

      const { result } = renderHook(
        () => useProgramsPaginated({ page: 1, limit: 20 }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockAdminApi.getPrograms).toHaveBeenCalledWith({ page: 1, limit: 20 });
      expect(result.current.data?.programs).toHaveLength(1);
      expect(result.current.data?.pagination?.total).toBe(1);
    });
  });

  // ── usePrograms ──

  describe('usePrograms', () => {
    it('fetches all programs with all: true', async () => {
      mockAdminApi.getPrograms.mockResolvedValueOnce({
        data: { programs: [mockProgram] },
      });

      const { result } = renderHook(() => usePrograms(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockAdminApi.getPrograms).toHaveBeenCalledWith({ all: true });
      expect(result.current.data).toHaveLength(1);
    });
  });

  // ── useProgram ──

  describe('useProgram', () => {
    it('fetches a single program by id', async () => {
      mockAdminApi.getProgram.mockResolvedValueOnce({
        data: { program: mockProgram, content: [] },
      });

      const { result } = renderHook(() => useProgram('p1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockAdminApi.getProgram).toHaveBeenCalledWith('p1');
    });

    it('is disabled when id is empty string', () => {
      const { result } = renderHook(() => useProgram(''), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe('idle');
    });
  });

  // ── useCreateProgram ──

  describe('useCreateProgram', () => {
    it('calls createProgram API', async () => {
      mockAdminApi.createProgram.mockResolvedValueOnce({ data: {} });

      const { result } = renderHook(() => useCreateProgram(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ name: 'New Program' });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockAdminApi.createProgram).toHaveBeenCalledWith({ name: 'New Program' });
    });

    it('shows success toast', async () => {
      mockAdminApi.createProgram.mockResolvedValueOnce({ data: {} });

      const { result } = renderHook(() => useCreateProgram(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ name: 'New Program' });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(toast.success).toHaveBeenCalledWith('Program created successfully');
    });

    it('shows error toast on failure', async () => {
      mockAdminApi.createProgram.mockRejectedValueOnce({
        response: { data: { error: { message: 'Name taken' } } },
      });

      const { result } = renderHook(() => useCreateProgram(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ name: 'Dup' });
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(toast.error).toHaveBeenCalledWith('Name taken');
    });
  });

  // ── useUpdateProgram ──

  describe('useUpdateProgram', () => {
    it('calls updateProgram API with id and data', async () => {
      mockAdminApi.updateProgram.mockResolvedValueOnce({ data: {} });

      const { result } = renderHook(() => useUpdateProgram(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ id: 'p1', data: { name: 'Updated' } });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockAdminApi.updateProgram).toHaveBeenCalledWith('p1', { name: 'Updated' });
    });

    it('shows success toast', async () => {
      mockAdminApi.updateProgram.mockResolvedValueOnce({ data: {} });

      const { result } = renderHook(() => useUpdateProgram(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ id: 'p1', data: { name: 'Updated' } });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(toast.success).toHaveBeenCalledWith('Program updated successfully');
    });
  });

  // ── useDeleteProgram ──

  describe('useDeleteProgram', () => {
    it('calls deleteProgram API', async () => {
      mockAdminApi.deleteProgram.mockResolvedValueOnce({ data: {} });

      const { result } = renderHook(() => useDeleteProgram(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate('p1');
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockAdminApi.deleteProgram).toHaveBeenCalledWith('p1');
    });

    it('shows success toast', async () => {
      mockAdminApi.deleteProgram.mockResolvedValueOnce({ data: {} });

      const { result } = renderHook(() => useDeleteProgram(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate('p1');
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(toast.success).toHaveBeenCalledWith('Program deleted successfully');
    });
  });

  // ── useTogglePublish ──

  describe('useTogglePublish', () => {
    it('calls togglePublish API', async () => {
      mockAdminApi.togglePublish.mockResolvedValueOnce({ data: {} });

      const { result } = renderHook(() => useTogglePublish(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ id: 'p1', isPublished: true });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockAdminApi.togglePublish).toHaveBeenCalledWith('p1', true);
    });

    it('shows success toast', async () => {
      mockAdminApi.togglePublish.mockResolvedValueOnce({ data: {} });

      const { result } = renderHook(() => useTogglePublish(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ id: 'p1', isPublished: true });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(toast.success).toHaveBeenCalledWith('Program status updated');
    });
  });

  // ── useCreateTopic ──

  describe('useCreateTopic', () => {
    it('calls createTopic API', async () => {
      mockAdminApi.createTopic.mockResolvedValueOnce({ data: {} });

      const { result } = renderHook(() => useCreateTopic(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ programId: 'p1', name: 'New Topic' });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockAdminApi.createTopic).toHaveBeenCalledWith({ programId: 'p1', name: 'New Topic' });
    });

    it('shows success toast', async () => {
      mockAdminApi.createTopic.mockResolvedValueOnce({ data: {} });

      const { result } = renderHook(() => useCreateTopic(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ programId: 'p1', name: 'New Topic' });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(toast.success).toHaveBeenCalledWith('Topic created successfully');
    });
  });

  // ── useCreateLesson ──

  describe('useCreateLesson', () => {
    it('calls createLesson API', async () => {
      mockAdminApi.createLesson.mockResolvedValueOnce({ data: {} });

      const { result } = renderHook(() => useCreateLesson(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ programId: 'p1', title: 'Lesson 1', type: 'VIDEO' });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockAdminApi.createLesson).toHaveBeenCalledWith({
        programId: 'p1', title: 'Lesson 1', type: 'VIDEO',
      });
    });

    it('shows success toast', async () => {
      mockAdminApi.createLesson.mockResolvedValueOnce({ data: {} });

      const { result } = renderHook(() => useCreateLesson(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ programId: 'p1', title: 'Lesson 1', type: 'VIDEO' });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(toast.success).toHaveBeenCalledWith('Lesson created successfully');
    });
  });

  // ── useDeleteLesson ──

  describe('useDeleteLesson', () => {
    it('calls deleteLesson API', async () => {
      mockAdminApi.deleteLesson.mockResolvedValueOnce({ data: {} });

      const { result } = renderHook(() => useDeleteLesson(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ id: 'les1', programId: 'p1' });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockAdminApi.deleteLesson).toHaveBeenCalledWith('les1');
    });

    it('shows success toast', async () => {
      mockAdminApi.deleteLesson.mockResolvedValueOnce({ data: {} });

      const { result } = renderHook(() => useDeleteLesson(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ id: 'les1', programId: 'p1' });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(toast.success).toHaveBeenCalledWith('Lesson deleted successfully');
    });
  });

  // ── useReorderContent ──

  describe('useReorderContent', () => {
    it('calls reorderContent API', async () => {
      mockAdminApi.reorderContent.mockResolvedValueOnce({ data: {} });

      const items = [{ id: 't1', type: 'topic' as const, orderIndex: 0 }];
      const { result } = renderHook(() => useReorderContent(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ programId: 'p1', items });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockAdminApi.reorderContent).toHaveBeenCalledWith('p1', { items });
    });

    it('does NOT show success toast (silent)', async () => {
      mockAdminApi.reorderContent.mockResolvedValueOnce({ data: {} });

      const { result } = renderHook(() => useReorderContent(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ programId: 'p1', items: [] });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(toast.success).not.toHaveBeenCalled();
    });

    it('shows error toast on failure', async () => {
      mockAdminApi.reorderContent.mockRejectedValueOnce({
        response: { data: { error: { message: 'Reorder failed' } } },
      });

      const { result } = renderHook(() => useReorderContent(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ programId: 'p1', items: [] });
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(toast.error).toHaveBeenCalledWith('Reorder failed');
    });
  });
});
