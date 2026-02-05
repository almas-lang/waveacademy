'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import { Session, SessionFilters, CreateSessionData } from '@/types/admin';
import toast from 'react-hot-toast';

// Query keys
export const sessionKeys = {
  all: ['admin', 'sessions'] as const,
  list: (filters?: SessionFilters) => [...sessionKeys.all, 'list', filters] as const,
  today: () => [...sessionKeys.all, 'today'] as const,
  detail: (id: string) => [...sessionKeys.all, 'detail', id] as const,
};

// Fetch sessions with filters
export function useSessions(filters?: SessionFilters) {
  return useQuery({
    queryKey: sessionKeys.list(filters),
    queryFn: async () => {
      const response = await adminApi.getSessions(filters);
      return response.data.sessions as Session[];
    },
  });
}

// Fetch today's sessions for dashboard
export function useTodaySessions() {
  return useQuery({
    queryKey: sessionKeys.today(),
    queryFn: async () => {
      const response = await adminApi.getTodaySessions();
      return response.data.sessions as Session[];
    },
  });
}

// Fetch single session
export function useSession(id: string) {
  return useQuery({
    queryKey: sessionKeys.detail(id),
    queryFn: async () => {
      const response = await adminApi.getSession(id);
      return response.data.session as Session;
    },
    enabled: !!id,
  });
}

// Create session mutation
export function useCreateSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateSessionData) => adminApi.createSession(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sessionKeys.all });
      toast.success('Session created successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to create session');
    },
  });
}

// Update session mutation
export function useUpdateSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateSessionData> }) =>
      adminApi.updateSession(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: sessionKeys.all });
      queryClient.invalidateQueries({ queryKey: sessionKeys.detail(id) });
      toast.success('Session updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to update session');
    },
  });
}

// Delete session mutation
export function useDeleteSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => adminApi.deleteSession(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sessionKeys.all });
      toast.success('Session deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to delete session');
    },
  });
}
