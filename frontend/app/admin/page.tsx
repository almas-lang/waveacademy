'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { BookOpen, Users, Calendar, Clock, Video, ArrowRight, Plus } from 'lucide-react';
import { AdminHeader, StatsCard } from '@/components/admin';
import { Button, Badge, PageLoading } from '@/components/ui';
import { usePrograms, useLearners, useTodaySessions } from '@/hooks';
import { format } from 'date-fns';

export default function AdminDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { data: programs, isLoading: programsLoading } = usePrograms();
  const { data: learnersData, isLoading: learnersLoading } = useLearners({ limit: 1 });
  const { data: todaySessions, isLoading: sessionsLoading } = useTodaySessions();

  const isLoading = programsLoading || learnersLoading || sessionsLoading;

  if (isLoading) {
    return (
      <>
        <AdminHeader title="Dashboard" onMenuClick={() => setSidebarOpen(true)} />
        <PageLoading />
      </>
    );
  }

  const totalPrograms = programs?.length || 0;
  const publishedPrograms = programs?.filter(p => p.isPublished).length || 0;
  const totalLearners = learnersData?.pagination.total || 0;
  const todaySessionsCount = todaySessions?.length || 0;

  return (
    <>
      <AdminHeader
        title="Dashboard"
        subtitle="Welcome back! Here's what's happening today."
        onMenuClick={() => setSidebarOpen(true)}
      />

      <div className="flex-1 p-6 lg:p-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-8">
          <StatsCard
            title="Total Programs"
            value={totalPrograms}
            icon={<BookOpen className="w-5 h-5" />}
            description="Courses created"
            href="/admin/programs"
          />
          <StatsCard
            title="Published"
            value={publishedPrograms}
            icon={<BookOpen className="w-5 h-5" />}
            variant="accent"
            description="Live programs"
            href="/admin/programs?status=published"
          />
          <StatsCard
            title="Total Learners"
            value={totalLearners}
            icon={<Users className="w-5 h-5" />}
            description="Enrolled students"
            href="/admin/learners"
          />
          <StatsCard
            title="Today's Sessions"
            value={todaySessionsCount}
            icon={<Calendar className="w-5 h-5" />}
            description="Scheduled meetings"
            href="/admin/sessions"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          {/* Today's Sessions */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-soft overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Today's Sessions</h2>
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
                      style={{ animationDelay: `${index * 50}ms` }}
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
                        +{todaySessions.length - 3} more sessions →
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

          {/* Recent Programs */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-soft overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Recent Programs</h2>
                <p className="text-xs text-slate-500 mt-0.5">Your latest courses</p>
              </div>
              <Link href="/admin/programs">
                <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="w-4 h-4" />}>
                  View All
                </Button>
              </Link>
            </div>

            <div className="p-4">
              {programs && programs.length > 0 ? (
                <div className="space-y-3">
                  {programs.slice(0, 3).map((program, index) => (
                    <Link
                      key={program.id}
                      href={`/admin/programs/${program.id}`}
                      className="flex items-center justify-between p-3.5 bg-slate-50/80 rounded-lg border border-slate-100 hover:bg-slate-50 hover:border-slate-200 transition-all group"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <div className="flex items-center gap-3.5">
                        {program.thumbnailUrl ? (
                          <Image
                            src={program.thumbnailUrl}
                            alt={program.name}
                            width={40}
                            height={40}
                            className="w-10 h-10 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-slate-200 rounded-lg flex items-center justify-center">
                            <BookOpen className="w-4 h-4 text-slate-500" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-slate-900 text-sm group-hover:text-accent-600 transition-colors">
                            {program.name}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {program.lessonCount} lessons • {program.learnerCount} learners
                          </p>
                        </div>
                      </div>
                      <Badge variant={program.isPublished ? 'success' : 'neutral'} dot>
                        {program.isPublished ? 'Published' : 'Draft'}
                      </Badge>
                    </Link>
                  ))}
                  {programs.length > 3 && (
                    <Link href="/admin/programs" className="block">
                      <div className="text-center py-2.5 text-sm font-medium text-slate-500 hover:text-accent-500 transition-colors">
                        +{programs.length - 3} more programs →
                      </div>
                    </Link>
                  )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <BookOpen className="w-6 h-6 text-slate-400" />
                  </div>
                  <p className="text-slate-600 font-medium mb-1">No programs yet</p>
                  <p className="text-sm text-slate-400 mb-4">Create your first course</p>
                  <Link href="/admin/programs">
                    <Button variant="primary" size="sm" leftIcon={<Plus className="w-4 h-4" />}>
                      Create Program
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </>
  );
}
