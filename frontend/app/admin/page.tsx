'use client';

import Link from 'next/link';
import { BookOpen, Users, Calendar, Clock, Video, ArrowRight, Plus, UserPlus, Zap } from 'lucide-react';
import { AdminHeader, StatsCard, EnrollmentChart, DailyActiveUsersChart, ProgramPerformance, RecentActivity } from '@/components/admin';
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-8">
        {[1, 2, 3, 4].map(i => (
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

      {/* Charts skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 mb-8">
        {[1, 2].map(i => (
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        {[1, 2, 3].map(i => (
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
          <Link href="/admin/programs">
            <Button variant="outline" size="sm" leftIcon={<Plus className="w-4 h-4" />}>
              Create Program
            </Button>
          </Link>
          <Link href="/admin/learners">
            <Button variant="outline" size="sm" leftIcon={<UserPlus className="w-4 h-4" />}>
              Add Learner
            </Button>
          </Link>
          <Link href="/admin/sessions">
            <Button variant="outline" size="sm" leftIcon={<Calendar className="w-4 h-4" />}>
              Schedule Session
            </Button>
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-8">
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
        </div>

        {/* Row 2: Enrollment Chart + DAU Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 mb-8">
          <EnrollmentChart data={analytics?.enrollmentChart ?? []} />
          <DailyActiveUsersChart data={analytics?.dailyActiveUsers ?? []} />
        </div>

        {/* Row 3: Today's Sessions + Program Performance + Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 mb-8">
          {/* Today's Sessions */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-soft overflow-hidden animate-slide-up opacity-0 [animation-fill-mode:forwards] [animation-delay:100ms]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Today&apos;s Sessions</h2>
                <p className="text-xs text-slate-500 mt-0.5">Live classes and meetings</p>
              </div>
              <Link href="/admin/sessions">
                <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="w-4 h-4" />}>
                  View All
                </Button>
              </Link>
            </div>

            <div className="p-4">
              {todaySessions && todaySessions.length > 0 ? (
                <div className="space-y-3">
                  {todaySessions.slice(0, 3).map((session, index) => (
                    <div
                      key={session.id}
                      className="flex items-center justify-between p-3.5 bg-slate-50/80 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="w-10 h-10 bg-slate-900 rounded-lg flex items-center justify-center shadow-sm">
                          <Video className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900 text-sm">{session.name}</p>
                          <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                            <Clock className="w-3 h-3" />
                            {format(new Date(session.startTime), 'h:mm a')}
                            {session.endTime && ` – ${format(new Date(session.endTime), 'h:mm a')}`}
                          </p>
                        </div>
                      </div>
                      {session.meetLink && (
                        <a
                          href={session.meetLink}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button variant="primary" size="sm">
                            Join
                          </Button>
                        </a>
                      )}
                    </div>
                  ))}
                  {todaySessions.length > 3 && (
                    <Link href="/admin/sessions" className="block">
                      <div className="text-center py-2.5 text-sm font-medium text-slate-500 hover:text-accent-500 transition-colors">
                        +{todaySessions.length - 3} more sessions
                      </div>
                    </Link>
                  )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Calendar className="w-6 h-6 text-slate-400" />
                  </div>
                  <p className="text-slate-600 font-medium mb-1">No sessions today</p>
                  <p className="text-sm text-slate-400">Schedule a session to get started</p>
                </div>
              )}
            </div>
          </div>

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
