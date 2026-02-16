'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import { Learner, LearnerDetail, LearnerFilters, CreateLearnerData, PaginationInfo } from '@/types/admin';
import toast from 'react-hot-toast';

// Query keys
export const learnerKeys = {
  all: ['admin', 'learners'] as const,
  list: (filters: LearnerFilters) => [...learnerKeys.all, 'list', filters] as const,
  detail: (id: string) => [...learnerKeys.all, 'detail', id] as const,
};

// Fetch learners with filters and pagination
export function useLearners(filters: LearnerFilters = {}) {
  return useQuery({
    queryKey: learnerKeys.list(filters),
    queryFn: async () => {
      const response = await adminApi.getLearners(filters);
      return {
        learners: response.data.learners as Learner[],
        pagination: response.data.pagination as PaginationInfo,
      };
    },
  });
}

// Fetch single learner with progress
export function useLearner(id: string) {
  return useQuery({
    queryKey: learnerKeys.detail(id),
    queryFn: async () => {
      const response = await adminApi.getLearner(id);
      return {
        learner: response.data.learner as Learner,
        programProgress: response.data.programProgress,
        recentProgress: response.data.recentProgress,
      } as LearnerDetail;
    },
    enabled: !!id,
  });
}

// Create learner mutation
export function useCreateLearner() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateLearnerData) => adminApi.createLearner(data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: learnerKeys.all });
      toast.success('Learner created successfully. Setup email sent.');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to create learner');
    },
  });
}

// Update learner mutation
export function useUpdateLearner() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateLearnerData> }) =>
      adminApi.updateLearner(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: learnerKeys.all });
      queryClient.invalidateQueries({ queryKey: learnerKeys.detail(id) });
      toast.success('Learner updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to update learner');
    },
  });
}

// Update learner status
export function useUpdateLearnerStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'ACTIVE' | 'INACTIVE' }) =>
      adminApi.updateLearnerStatus(id, status),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: learnerKeys.all });
      queryClient.invalidateQueries({ queryKey: learnerKeys.detail(id) });
      toast.success('Learner status updated');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to update status');
    },
  });
}

// Delete learner
export function useDeleteLearner() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => adminApi.deleteLearner(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: learnerKeys.all });
      toast.success('Learner deleted permanently');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to delete learner');
    },
  });
}

// Reset learner password
export function useResetLearnerPassword() {
  return useMutation({
    mutationFn: (id: string) => adminApi.resetLearnerPassword(id),
    onSuccess: () => {
      toast.success('Password reset email sent');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to send reset email');
    },
  });
}

// Enroll learner in program
export function useEnrollLearner() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ learnerId, programId }: { learnerId: string; programId: string }) =>
      adminApi.enrollLearner(learnerId, programId),
    onSuccess: (_, { learnerId, programId }) => {
      queryClient.invalidateQueries({ queryKey: learnerKeys.detail(learnerId) });
      queryClient.invalidateQueries({ queryKey: learnerKeys.all });
      queryClient.invalidateQueries({ queryKey: ['admin', 'programs', 'detail', programId] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'programs', programId, 'learners'] });
      toast.success('Learner enrolled in program');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to enroll learner');
    },
  });
}

// Unenroll learner from program
export function useUnenrollLearner() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ learnerId, programId }: { learnerId: string; programId: string }) =>
      adminApi.unenrollLearner(learnerId, programId),
    onSuccess: (_, { learnerId, programId }) => {
      queryClient.invalidateQueries({ queryKey: learnerKeys.detail(learnerId) });
      queryClient.invalidateQueries({ queryKey: learnerKeys.all });
      queryClient.invalidateQueries({ queryKey: ['admin', 'programs', 'detail', programId] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'programs', programId, 'learners'] });
      toast.success('Learner removed from program');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to remove learner');
    },
  });
}

// Get learners for a specific program
export function useProgramLearners(programId: string) {
  return useQuery({
    queryKey: ['admin', 'programs', programId, 'learners'],
    queryFn: async () => {
      const response = await adminApi.getProgramLearners(programId);
      return response.data?.learners || response.learners || [];
    },
    enabled: !!programId,
  });
}

// Get active sessions for a learner
export function useLearnerSessions(learnerId: string) {
  return useQuery({
    queryKey: ['admin', 'learners', learnerId, 'sessions'],
    queryFn: async () => {
      const response = await adminApi.getLearnerSessions(learnerId);
      return response.data?.sessions || [];
    },
    enabled: !!learnerId,
  });
}

// Logout learner from all devices
export function useLogoutLearnerAllDevices() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (learnerId: string) => adminApi.logoutLearnerAllDevices(learnerId),
    onSuccess: (response, learnerId) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'learners', learnerId, 'sessions'] });
      toast.success(response.message || 'Logged out from all devices');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to logout');
    },
  });
}
