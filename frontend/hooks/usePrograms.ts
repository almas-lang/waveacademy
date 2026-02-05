'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import { Program, ProgramDetail, CreateProgramData, CreateTopicData, CreateSubtopicData, CreateLessonData } from '@/types/admin';
import toast from 'react-hot-toast';

// Query keys
export const programKeys = {
  all: ['admin', 'programs'] as const,
  list: (filters?: { page?: number; limit?: number }) => [...programKeys.all, 'list', filters] as const,
  listAll: () => [...programKeys.all, 'list', 'all'] as const,
  detail: (id: string) => [...programKeys.all, 'detail', id] as const,
};

interface ProgramFilters {
  page?: number;
  limit?: number;
}

// Fetch programs with pagination (for tables)
export function useProgramsPaginated(filters: ProgramFilters = { page: 1, limit: 20 }) {
  return useQuery({
    queryKey: programKeys.list(filters),
    queryFn: async () => {
      const response = await adminApi.getPrograms(filters);
      return {
        programs: response.data.programs as Program[],
        pagination: response.data.pagination as {
          total: number;
          page: number;
          limit: number;
          totalPages: number;
        } | null,
      };
    },
  });
}

// Fetch all programs (for dropdowns)
export function usePrograms() {
  return useQuery({
    queryKey: programKeys.listAll(),
    queryFn: async () => {
      const response = await adminApi.getPrograms({ all: true });
      return response.data.programs as Program[];
    },
  });
}

// Fetch single program with content tree
export function useProgram(id: string) {
  return useQuery({
    queryKey: programKeys.detail(id),
    queryFn: async () => {
      const response = await adminApi.getProgram(id);
      return response.data as ProgramDetail;
    },
    enabled: !!id,
  });
}

// Create program mutation
export function useCreateProgram() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateProgramData) => adminApi.createProgram(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: programKeys.list() });
      toast.success('Program created successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to create program');
    },
  });
}

// Update program mutation
export function useUpdateProgram() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateProgramData> }) =>
      adminApi.updateProgram(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: programKeys.list() });
      queryClient.invalidateQueries({ queryKey: programKeys.detail(id) });
      toast.success('Program updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to update program');
    },
  });
}

// Delete program mutation
export function useDeleteProgram() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => adminApi.deleteProgram(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: programKeys.list() });
      toast.success('Program deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to delete program');
    },
  });
}

// Toggle publish status
export function useTogglePublish() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, isPublished }: { id: string; isPublished: boolean }) =>
      adminApi.togglePublish(id, isPublished),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: programKeys.list() });
      queryClient.invalidateQueries({ queryKey: programKeys.detail(id) });
      toast.success('Program status updated');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to update status');
    },
  });
}

// Topic mutations
export function useCreateTopic() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTopicData) => adminApi.createTopic(data),
    onSuccess: (_, { programId }) => {
      queryClient.invalidateQueries({ queryKey: programKeys.detail(programId) });
      toast.success('Topic created successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to create topic');
    },
  });
}

export function useUpdateTopic() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data, programId }: { id: string; data: { name?: string; orderIndex?: number }; programId: string }) =>
      adminApi.updateTopic(id, data),
    onSuccess: (_, { programId }) => {
      queryClient.invalidateQueries({ queryKey: programKeys.detail(programId) });
      toast.success('Topic updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to update topic');
    },
  });
}

export function useDeleteTopic() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, programId }: { id: string; programId: string }) =>
      adminApi.deleteTopic(id),
    onSuccess: (_, { programId }) => {
      queryClient.invalidateQueries({ queryKey: programKeys.detail(programId) });
      toast.success('Topic deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to delete topic');
    },
  });
}

// Subtopic mutations
export function useCreateSubtopic() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ data, programId }: { data: CreateSubtopicData; programId: string }) =>
      adminApi.createSubtopic(data),
    onSuccess: (_, { programId }) => {
      queryClient.invalidateQueries({ queryKey: programKeys.detail(programId) });
      toast.success('Subtopic created successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to create subtopic');
    },
  });
}

// Lesson mutations
export function useCreateLesson() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateLessonData) => adminApi.createLesson(data),
    onSuccess: (_, { programId }) => {
      queryClient.invalidateQueries({ queryKey: programKeys.detail(programId) });
      toast.success('Lesson created successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to create lesson');
    },
  });
}

export function useUpdateLesson() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data, programId }: { id: string; data: Partial<CreateLessonData>; programId: string }) =>
      adminApi.updateLesson(id, data),
    onSuccess: (_, { programId }) => {
      queryClient.invalidateQueries({ queryKey: programKeys.detail(programId) });
      toast.success('Lesson updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to update lesson');
    },
  });
}

export function useDeleteLesson() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, programId }: { id: string; programId: string }) =>
      adminApi.deleteLesson(id),
    onSuccess: (_, { programId }) => {
      queryClient.invalidateQueries({ queryKey: programKeys.detail(programId) });
      toast.success('Lesson deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to delete lesson');
    },
  });
}

// Reorder content mutation
export function useReorderContent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ programId, items }: {
      programId: string;
      items: Array<{
        id: string;
        type: 'topic' | 'subtopic' | 'lesson';
        orderIndex: number;
        parentId?: string | null;
        parentType?: 'program' | 'topic' | 'subtopic' | null;
      }>;
    }) => adminApi.reorderContent(programId, { items }),
    onSuccess: (_, { programId }) => {
      queryClient.invalidateQueries({ queryKey: programKeys.detail(programId) });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to reorder content');
    },
  });
}

// Update subtopic mutation
export function useUpdateSubtopic() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data, programId }: { id: string; data: { name?: string; orderIndex?: number; topicId?: string }; programId: string }) =>
      adminApi.updateSubtopic(id, data),
    onSuccess: (_, { programId }) => {
      queryClient.invalidateQueries({ queryKey: programKeys.detail(programId) });
      toast.success('Subtopic updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to update subtopic');
    },
  });
}

// Delete subtopic mutation
export function useDeleteSubtopic() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, programId }: { id: string; programId: string }) =>
      adminApi.deleteSubtopic(id),
    onSuccess: (_, { programId }) => {
      queryClient.invalidateQueries({ queryKey: programKeys.detail(programId) });
      toast.success('Subtopic deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to delete subtopic');
    },
  });
}
