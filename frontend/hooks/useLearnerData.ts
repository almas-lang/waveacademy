'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { learnerApi } from '@/lib/api';
import {
  LearnerHome,
  LearnerProgram,
  LearnerLesson,
  LearnerProfile,
  UpcomingSession,
} from '@/types/learner';
import toast from 'react-hot-toast';

// Query keys
export const learnerKeys = {
  all: ['learner'] as const,
  home: () => [...learnerKeys.all, 'home'] as const,
  program: (id: string) => [...learnerKeys.all, 'program', id] as const,
  lesson: (id: string) => [...learnerKeys.all, 'lesson', id] as const,
  sessions: () => [...learnerKeys.all, 'sessions'] as const,
  sessionsCalendar: (month: number, year: number) =>
    [...learnerKeys.all, 'sessions', 'calendar', month, year] as const,
  profile: () => [...learnerKeys.all, 'profile'] as const,
};

// Fetch learner home/dashboard data
export function useLearnerHome() {
  return useQuery({
    queryKey: learnerKeys.home(),
    queryFn: async () => {
      const response = await learnerApi.getHome();
      return response.data as LearnerHome;
    },
  });
}

// Fetch program with content for learner
export function useLearnerProgram(id: string) {
  return useQuery({
    queryKey: learnerKeys.program(id),
    queryFn: async () => {
      const response = await learnerApi.getProgram(id);
      return response.data as LearnerProgram;
    },
    enabled: !!id,
  });
}

// Fetch lesson content
export function useLearnerLesson(id: string) {
  return useQuery({
    queryKey: learnerKeys.lesson(id),
    queryFn: async () => {
      const response = await learnerApi.getLesson(id);
      return response.data as LearnerLesson;
    },
    enabled: !!id,
  });
}

// Fetch upcoming sessions
export function useLearnerSessions() {
  return useQuery({
    queryKey: learnerKeys.sessions(),
    queryFn: async () => {
      const response = await learnerApi.getSessions();
      return response.data.sessions as UpcomingSession[];
    },
  });
}

// Fetch sessions for calendar
export function useLearnerSessionsCalendar(month: number, year: number) {
  return useQuery({
    queryKey: learnerKeys.sessionsCalendar(month, year),
    queryFn: async () => {
      const response = await learnerApi.getSessionsCalendar(month, year);
      return response.data.sessions as UpcomingSession[];
    },
  });
}

// Fetch learner profile
export function useLearnerProfile() {
  return useQuery({
    queryKey: learnerKeys.profile(),
    queryFn: async () => {
      const response = await learnerApi.getProfile();
      return response.data as LearnerProfile;
    },
  });
}

// Update lesson progress (watch position)
export function useUpdateLessonProgress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ lessonId, watchPositionSeconds }: { lessonId: string; watchPositionSeconds: number }) =>
      learnerApi.updateProgress(lessonId, watchPositionSeconds),
    onSuccess: (_, { lessonId }) => {
      // Don't invalidate to avoid refetching during video playback
      // The progress is saved server-side
    },
    onError: (error: any) => {
      console.error('Failed to update progress:', error);
    },
  });
}

// Mark lesson as complete
export function useCompleteLesson() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (lessonId: string) => learnerApi.completeLesson(lessonId),
    onSuccess: (_, lessonId) => {
      queryClient.invalidateQueries({ queryKey: learnerKeys.home() });
      queryClient.invalidateQueries({ queryKey: learnerKeys.lesson(lessonId) });
      // Invalidate all program queries since progress changed
      queryClient.invalidateQueries({ queryKey: [...learnerKeys.all, 'program'] });
      // Invalidate profile so stats (lessons done, completed programs) update
      queryClient.invalidateQueries({ queryKey: learnerKeys.profile() });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to mark lesson as complete');
    },
  });
}
