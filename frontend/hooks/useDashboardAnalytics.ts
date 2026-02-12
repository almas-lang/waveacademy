'use client';

import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import { DashboardAnalytics } from '@/types/admin';

export const dashboardKeys = {
  analytics: ['admin', 'dashboard', 'analytics'] as const,
};

export function useDashboardAnalytics() {
  return useQuery({
    queryKey: dashboardKeys.analytics,
    queryFn: async () => {
      const response = await adminApi.getDashboardAnalytics();
      return response.data as DashboardAnalytics;
    },
  });
}
