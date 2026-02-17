'use client';

import { useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { learnerApi } from '@/lib/api';
import {
  LearnerHome,
  LearnerProgram,
  LearnerLesson,
  LearnerProfile,
  UpcomingSession,
  DiscoverProgram,
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
  discover: (params?: Record<string, string | number | undefined>) => [...learnerKeys.all, 'discover', params] as const,
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

// Fetch programs the learner is NOT enrolled in
export function useLearnerDiscover(params: { page?: number; limit?: number; search?: string } = {}) {
  return useQuery({
    queryKey: learnerKeys.discover(params),
    queryFn: async () => {
      const response = await learnerApi.getDiscover(params);
      return {
        programs: response.data.programs as DiscoverProgram[],
        pagination: response.data.pagination as { total: number; page: number; limit: number; totalPages: number },
      };
    },
  });
}

// Update lesson progress (watch position) — throttled to at most once per 30s
export function useUpdateLessonProgress() {
  const lastSentRef = useRef<number>(0);
  const pendingRef = useRef<{ lessonId: string; watchPositionSeconds: number } | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const mutation = useMutation({
    mutationFn: ({ lessonId, watchPositionSeconds }: { lessonId: string; watchPositionSeconds: number }) =>
      learnerApi.updateProgress(lessonId, watchPositionSeconds),
    onSuccess: () => {
      lastSentRef.current = Date.now();
    },
    onError: (error: AxiosError) => {
      console.error('Failed to update progress:', error.message);
    },
  });

  const throttledMutate = useCallback(
    (data: { lessonId: string; watchPositionSeconds: number }) => {
      pendingRef.current = data;
      const elapsed = Date.now() - lastSentRef.current;

      if (elapsed >= 30000) {
        // Enough time passed — send immediately
        mutation.mutate(data);
        pendingRef.current = null;
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = null;
      } else if (!timerRef.current) {
        // Schedule a send for when the throttle window expires
        timerRef.current = setTimeout(() => {
          if (pendingRef.current) {
            mutation.mutate(pendingRef.current);
            pendingRef.current = null;
          }
          timerRef.current = null;
        }, 30000 - elapsed);
      }
    },
    [mutation]
  );

  const flush = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (pendingRef.current) {
      mutation.mutate(pendingRef.current);
      pendingRef.current = null;
    }
  }, [mutation]);

  return { ...mutation, mutate: throttledMutate, flush };
}

// Self-enroll in a public program (creates FREE enrollment)
export function useSelfEnroll() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (programId: string) => learnerApi.selfEnroll(programId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: learnerKeys.home() });
    },
    onError: (error: AxiosError<{ error?: { message?: string } }>) => {
      toast.error(error.response?.data?.error?.message || 'Failed to enroll');
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
    onError: (error: AxiosError<{ error?: { message?: string } }>) => {
      toast.error(error.response?.data?.error?.message || 'Failed to mark lesson as complete');
    },
  });
}
