'use client';

import { UserPlus, CheckCircle, Activity } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ActivityItem } from '@/types/admin';

interface RecentActivityProps {
  activities: ActivityItem[];
}

export default function RecentActivity({ activities }: RecentActivityProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200/80 shadow-soft overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100">
        <h2 className="text-base font-semibold text-slate-900">Recent Activity</h2>
        <p className="text-xs text-slate-500 mt-0.5">Latest enrollments and completions</p>
      </div>

      <div className="p-4">
        {activities.length > 0 ? (
          <div className="space-y-1">
            {activities.map((activity, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-slate-50/80 transition-colors"
              >
                {activity.type === 'enrollment' ? (
                  <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <UserPlus className="w-3.5 h-3.5 text-blue-600" />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-700 leading-snug">{activity.message}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-10">
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Activity className="w-5 h-5 text-slate-400" />
            </div>
            <p className="text-slate-600 font-medium text-sm mb-1">No recent activity</p>
            <p className="text-xs text-slate-400">Activity will appear as learners engage</p>
          </div>
        )}
      </div>
    </div>
  );
}
