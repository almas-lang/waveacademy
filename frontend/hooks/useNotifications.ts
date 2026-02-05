import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface Notification {
  id: string;
  userId: string;
  type: 'NEW_LESSON' | 'NEW_SESSION' | 'ENROLLMENT' | 'SYSTEM';
  title: string;
  message: string;
  data?: {
    programId?: string;
    lessonId?: string;
    lessonTitle?: string;
    sessionId?: string;
  };
  isRead: boolean;
  createdAt: string;
}

interface NotificationsResponse {
  notifications: Notification[];
  unreadCount: number;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Fetch notifications for current user
export function useNotifications(options?: { page?: number; limit?: number; unreadOnly?: boolean }) {
  const { page = 1, limit = 20, unreadOnly = false } = options || {};

  return useQuery<NotificationsResponse>({
    queryKey: ['notifications', { page, limit, unreadOnly }],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(unreadOnly ? { unreadOnly: 'true' } : {})
      });
      const response = await api.get(`/notifications?${params}`);
      return response.data;
    }
  });
}

// Fetch unread count only (for badge)
export function useUnreadCount() {
  return useQuery<{ unreadCount: number }>({
    queryKey: ['notifications', 'unread-count'],
    queryFn: async () => {
      const response = await api.get('/notifications/unread-count');
      return response.data;
    },
    refetchInterval: 60000, // Refetch every minute
    staleTime: 30000 // Consider stale after 30 seconds
  });
}

// Mark a notification as read
export function useMarkAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const response = await api.patch(`/notifications/${notificationId}/read`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });
}

// Mark all notifications as read
export function useMarkAllAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await api.patch('/notifications/read-all');
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });
}

// Delete a notification
export function useDeleteNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const response = await api.delete(`/notifications/${notificationId}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });
}

// Admin: Send notification to users
export function useSendNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      userIds: string[];
      type: string;
      title: string;
      message: string;
      data?: Record<string, unknown>;
    }) => {
      const response = await api.post('/admin/notifications/send', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-notifications'] });
    }
  });
}

// Admin: Send notification to all learners in a program
export function useSendProgramNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      programId: string;
      type: string;
      title: string;
      message: string;
      data?: Record<string, unknown>;
    }) => {
      const response = await api.post('/admin/notifications/send-to-program', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-notifications'] });
    }
  });
}
