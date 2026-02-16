'use client';

import Link from 'next/link';
import { BookOpen, Users, Calendar, Clock, Video, ArrowRight, Plus, UserPlus, Zap, IndianRupee } from 'lucide-react';
import { AdminHeader, StatsCard, EnrollmentChart, DailyActiveUsersChart, ProgramPerformance, RecentActivity, RevenueChart } from '@/components/admin';
import { Button } from '@/components/ui';
import { useDashboardAnalytics, useTodaySessions } from '@/hooks';
import { useAuthStore } from '@/lib/auth-store';
import { useSidebar } from '@/lib/sidebar-context';
import { format } from 'date-fns';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function DashboardSkeleton() {
  return (
    <div className="flex-1 p-6 lg:p-8">
      {/* Quick actions skeleton */}
      <div className="flex gap-3 mb-6">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-9 w-36 bg-slate-100 rounded-lg animate-pulse" />
        ))}
      </div>

      {/* Stats skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 lg:gap-5 mb-6">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-soft">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="h-4 w-24 bg-slate-100 rounded animate-pulse mb-2" />
                <div className="h-8 w-16 bg-slate-100 rounded animate-pulse" />
              </div>
              <div className="w-11 h-11 bg-slate-100 rounded-xl animate-pulse" />
            </div>
            <div className="h-4 w-32 bg-slate-100 rounded animate-pulse" />
          </div>
        ))}
      </div>

      {/* Today's sessions skeleton */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-soft overflow-hidden mb-8">
        <div className="px-4 py-2.5 border-b border-slate-100">
          <div className="h-4 w-32 bg-slate-100 rounded animate-pulse" />
        </div>
        <div className="px-4 py-2.5 flex gap-2.5">
          {[1, 2, 3].map(j => (
            <div key={j} className="h-11 w-52 bg-slate-50 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>

      {/* Charts row skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 mb-8">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white rounded-xl border border-slate-200/80 shadow-soft overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <div className="h-5 w-36 bg-slate-100 rounded animate-pulse mb-1.5" />
              <div className="h-3 w-48 bg-slate-50 rounded animate-pulse" />
            </div>
            <div className="p-4">
              <div className="h-[240px] bg-slate-50 rounded-lg animate-pulse" />
            </div>
          </div>
        ))}
      </div>

      {/* Bottom row skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        {[1, 2].map(i => (
          <div key={i} className="bg-white rounded-xl border border-slate-200/80 shadow-soft overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <div className="h-5 w-32 bg-slate-100 rounded animate-pulse mb-1.5" />
              <div className="h-3 w-44 bg-slate-50 rounded animate-pulse" />
            </div>
            <div className="p-4 space-y-3">
              {[1, 2, 3].map(j => (
                <div key={j} className="h-14 bg-slate-50 rounded-lg animate-pulse" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { openSidebar } = useSidebar();
  const user = useAuthStore((state) => state.user);

  const { data: analytics, isLoading: analyticsLoading } = useDashboardAnalytics();
  const { data: todaySessions, isLoading: sessionsLoading } = useTodaySessions();

  const isLoading = analyticsLoading || sessionsLoading;
  const firstName = user?.name?.split(' ')[0] || 'Admin';

  if (isLoading) {
    return (
      <>
        <AdminHeader title="Dashboard" subtitle={`${getGreeting()}, ${firstName}!`} onMenuClick={openSidebar} />
        <DashboardSkeleton />
      </>
    );
  }

  const stats = analytics?.stats;
  const trends = analytics?.trends;

  return (
    <>
      <AdminHeader
        title="Dashboard"
        subtitle={`${getGreeting()}, ${firstName}!`}
        onMenuClick={openSidebar}
      />

      <div className="flex-1 p-6 lg:p-8">
        {/* Quick Actions */}
        <div className="flex flex-wrap gap-3 mb-6">
          <Link href="/admin/programs?action=create">
            <Button variant="outline" size="sm" leftIcon={<Plus className="w-4 h-4" />}>
              Create Program
            </Button>
          </Link>
          <Link href="/admin/learners?action=create">
            <Button variant="outline" size="sm" leftIcon={<UserPlus className="w-4 h-4" />}>
              Add Learner
            </Button>
          </Link>
          <Link href="/admin/sessions?action=create">
            <Button variant="outline" size="sm" leftIcon={<Calendar className="w-4 h-4" />}>
              Schedule Session
            </Button>
          </Link>
        </div>

        {/* Stats Row — all 5 in one line */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 lg:gap-5 mb-6">
          <StatsCard
            title="Total Programs"
            value={stats?.totalPrograms ?? 0}
            icon={<BookOpen className="w-5 h-5" />}
            iconColor="teal"
            trend={trends?.programs}
            trendLabel="vs last month"
            href="/admin/programs"
            animationDelay={0}
          />
          <StatsCard
            title="Active Learners"
            value={stats?.activeLearners ?? 0}
            icon={<Zap className="w-5 h-5" />}
            iconColor="coral"
            trend={trends?.activeLearners}
            trendLabel="vs last week"
            animationDelay={75}
          />
          <StatsCard
            title="Total Learners"
            value={stats?.totalLearners ?? 0}
            icon={<Users className="w-5 h-5" />}
            iconColor="blue"
            trend={trends?.learners}
            trendLabel="vs last month"
            href="/admin/learners"
            animationDelay={150}
          />
          <StatsCard
            title="Today's Sessions"
            value={stats?.todaySessions ?? 0}
            icon={<Calendar className="w-5 h-5" />}
            iconColor="purple"
            trend={trends?.todaySessions}
            trendLabel="vs yesterday"
            href="/admin/sessions"
            animationDelay={225}
          />
          <StatsCard
            title="Revenue"
            value={stats?.totalRevenue ?? 0}
            prefix="₹"
            icon={<IndianRupee className="w-5 h-5" />}
            iconColor="teal"
            trend={trends?.revenue}
            trendLabel="vs last month"
            animationDelay={300}
          />
        </div>

        {/* Today's Sessions — full width */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-soft overflow-hidden animate-slide-up opacity-0 [animation-fill-mode:forwards] [animation-delay:100ms] mb-8">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-900">Today&apos;s Sessions</h2>
            <Link href="/admin/sessions">
              <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                All
              </Button>
            </Link>
          </div>

          <div className="px-4 py-2.5">
            {todaySessions && todaySessions.length > 0 ? (
              <div className="flex flex-wrap gap-2.5">
                {todaySessions.slice(0, 8).map((session) => (
                  <div
                    key={session.id}
                    className="flex items-center gap-2.5 px-3 py-2 bg-slate-50/80 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors"
                  >
                    <div className="w-7 h-7 bg-slate-900 rounded-md flex items-center justify-center shrink-0">
                      <Video className="w-3.5 h-3.5 text-white" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900 text-sm truncate">{session.name}</p>
                      <p className="text-xs text-slate-500 flex items-center gap-1">
                        <Clock className="w-3 h-3 shrink-0" />
                        {format(new Date(session.startTime), 'h:mm a')}
                        {session.endTime && ` – ${format(new Date(session.endTime), 'h:mm a')}`}
                      </p>
                    </div>
                    {session.meetLink && (
                      <a href={session.meetLink} target="_blank" rel="noopener noreferrer" className="shrink-0">
                        <Button variant="primary" size="sm">Join</Button>
                      </a>
                    )}
                  </div>
                ))}
                {todaySessions.length > 8 && (
                  <Link href="/admin/sessions" className="flex items-center px-3 py-2 text-xs font-medium text-slate-500 hover:text-accent-500 transition-colors">
                    +{todaySessions.length - 8} more
                  </Link>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-3 py-2 text-sm text-slate-500">
                <Calendar className="w-4 h-4 text-slate-400" />
                No sessions today
              </div>
            )}
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 mb-8">
          <EnrollmentChart data={analytics?.enrollmentChart ?? []} />
          <RevenueChart data={analytics?.revenueChart ?? { daily: [], weekly: [], monthly: [] }} />
          <DailyActiveUsersChart data={analytics?.dailyActiveUsers ?? []} />
        </div>

        {/* Bottom Row: Performance + Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 mb-8">
          <ProgramPerformance
            programs={analytics?.programPerformance ?? []}
            overallCompletionRate={stats?.overallCompletionRate ?? 0}
          />
          <RecentActivity activities={analytics?.recentActivity ?? []} />
        </div>
      </div>
    </>
  );
}
