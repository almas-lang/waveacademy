'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { BookOpen, Calendar, Clock, Play, ArrowRight, CheckCircle, Sparkles, TrendingUp } from 'lucide-react';
import { LearnerHeader } from '@/components/learner';
import { Button, Badge, PageLoading } from '@/components/ui';
import { useLearnerHome } from '@/hooks/useLearnerData';
import { format } from 'date-fns';

export default function LearnerHomePage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { data, isLoading } = useLearnerHome();

  if (isLoading) {
    return (
      <>
        <LearnerHeader title="Home" onMenuClick={() => setSidebarOpen(true)} />
        <PageLoading />
      </>
    );
  }

  const welcomeName = data?.user?.name?.split(' ')[0] || 'Learner';
  const totalProgress = data?.enrolledPrograms?.length
    ? Math.round(
        data.enrolledPrograms.reduce((acc, p) => acc + p.progressPercentage, 0) /
          data.enrolledPrograms.length
      )
    : 0;

  return (
    <>
      <LearnerHeader
        title="Home"
        subtitle="Welcome to your learning dashboard"
        onMenuClick={() => setSidebarOpen(true)}
      />

      <div className="flex-1 p-6 lg:p-8">
        {/* Welcome Banner */}
        <div className="relative overflow-hidden bg-gradient-to-br from-primary-600 via-primary-500 to-primary-700 rounded-2xl p-6 lg:p-8 mb-8">
          {/* Background pattern */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-0 right-0 w-64 h-64 bg-accent-500 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary-300 rounded-full blur-3xl" />
          </div>

          <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-5 h-5 text-accent-400" />
                <span className="text-accent-300 text-sm font-medium">Welcome back</span>
              </div>
              <h2 className="text-2xl lg:text-3xl font-bold text-white mb-2">
                Hello, {welcomeName}!
              </h2>
              <p className="text-primary-100 text-sm lg:text-base max-w-md">
                Continue your learning journey. You're making great progress!
              </p>
            </div>

            {/* Quick Stats */}
            <div className="flex gap-4 lg:gap-6">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl px-5 py-4 border border-white/10">
                <p className="text-primary-200 text-xs font-medium mb-1">Programs</p>
                <p className="text-2xl font-bold text-white">{data?.enrolledPrograms?.length || 0}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl px-5 py-4 border border-white/10">
                <p className="text-primary-200 text-xs font-medium mb-1">Avg. Progress</p>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-bold text-white">{totalProgress}%</p>
                  <TrendingUp className="w-4 h-4 text-accent-300" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* My Programs */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">My Programs</h3>
              <p className="text-sm text-slate-500">Continue where you left off</p>
            </div>
            <Link href="/learner/programs">
              <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="w-4 h-4" />}>
                View All
              </Button>
            </Link>
          </div>

          {data?.enrolledPrograms && data.enrolledPrograms.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {data.enrolledPrograms.map((program) => (
                <Link
                  key={program.id}
                  href={`/learner/programs/${program.id}`}
                  className="group bg-white rounded-xl border border-slate-200/80 shadow-soft overflow-hidden hover:shadow-elevated hover:border-slate-300 transition-all duration-200"
                >
                  {/* Thumbnail */}
                  <div className="relative">
                    {program.thumbnailUrl ? (
                      <Image
                        src={program.thumbnailUrl}
                        alt={program.name}
                        width={400}
                        height={144}
                        className="w-full h-36 object-cover"
                      />
                    ) : (
                      <div className="w-full h-36 bg-gradient-to-br from-slate-100 to-slate-50 flex items-center justify-center">
                        <BookOpen className="w-12 h-12 text-slate-300" />
                      </div>
                    )}
                    {/* Progress overlay */}
                    {program.progressPercentage === 100 && (
                      <div className="absolute top-3 right-3">
                        <Badge variant="success" size="sm">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Completed
                        </Badge>
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-5">
                    <h4 className="font-semibold text-slate-900 mb-2 group-hover:text-accent-600 transition-colors">
                      {program.name}
                    </h4>

                    {/* Progress */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-slate-500">
                          {program.completedLessons} / {program.totalLessons} lessons
                        </span>
                        <span className="font-semibold text-slate-900">{program.progressPercentage}%</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500 ease-out"
                          style={{
                            width: `${program.progressPercentage}%`,
                            backgroundColor: program.progressPercentage === 100 ? '#10b981' : '#FF6B57',
                          }}
                        />
                      </div>
                    </div>

                    <Button
                      variant={program.progressPercentage === 0 ? 'primary' : 'secondary'}
                      size="sm"
                      className="w-full"
                      rightIcon={<Play className="w-4 h-4" />}
                    >
                      {program.progressPercentage === 0
                        ? 'Start Learning'
                        : program.progressPercentage === 100
                        ? 'Review'
                        : 'Continue'}
                    </Button>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-soft text-center py-16">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <BookOpen className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-slate-600 font-medium mb-1">No programs yet</p>
              <p className="text-sm text-slate-400">Contact your administrator to get enrolled</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upcoming Sessions */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-soft overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div>
                <h3 className="font-semibold text-slate-900">Upcoming Sessions</h3>
                <p className="text-xs text-slate-500 mt-0.5">Live classes and meetings</p>
              </div>
              <Link href="/learner/sessions">
                <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="w-4 h-4" />}>
                  View All
                </Button>
              </Link>
            </div>

            <div className="p-4">
              {data?.upcomingSessions && data.upcomingSessions.length > 0 ? (
                <div className="space-y-3">
                  {data.upcomingSessions.slice(0, 3).map((session) => (
                    <div
                      key={session.id}
                      className="flex items-center justify-between p-3.5 bg-slate-50/80 rounded-lg border border-slate-100"
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="w-10 h-10 bg-accent-50 rounded-lg flex items-center justify-center">
                          <Calendar className="w-5 h-5 text-accent-500" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900 text-sm">{session.name}</p>
                          <p className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                            <span>{format(new Date(session.startTime), 'EEE, MMM d')}</span>
                            <span>•</span>
                            <span>{format(new Date(session.startTime), 'h:mm a')}</span>
                          </p>
                        </div>
                      </div>
                      {session.meetLink && (
                        <a href={session.meetLink} target="_blank" rel="noopener noreferrer">
                          <Button variant="primary" size="sm">
                            Join
                          </Button>
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Calendar className="w-6 h-6 text-slate-400" />
                  </div>
                  <p className="text-slate-600 font-medium mb-1">No upcoming sessions</p>
                  <p className="text-sm text-slate-400">Check back later for new sessions</p>
                </div>
              )}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-soft overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div>
                <h3 className="font-semibold text-slate-900">Recent Activity</h3>
                <p className="text-xs text-slate-500 mt-0.5">Your learning history</p>
              </div>
            </div>

            <div className="p-4">
              {data?.recentProgress && data.recentProgress.length > 0 ? (
                <div className="space-y-2">
                  {data.recentProgress.slice(0, 5).map((activity, index) => (
                    <Link
                      key={index}
                      href={`/learner/lessons/${activity.lessonId}`}
                      className="flex items-center gap-3.5 p-3 rounded-lg hover:bg-slate-50 transition-colors group"
                    >
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          activity.status === 'COMPLETED'
                            ? 'bg-emerald-50 text-emerald-600'
                            : 'bg-accent-50 text-accent-500'
                        }`}
                      >
                        {activity.status === 'COMPLETED' ? (
                          <CheckCircle className="w-4 h-4" />
                        ) : (
                          <Play className="w-4 h-4" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 text-sm truncate group-hover:text-accent-600 transition-colors">
                          {activity.lessonTitle}
                        </p>
                        <p className="text-xs text-slate-500 truncate">{activity.programName}</p>
                      </div>
                      <Badge
                        variant={activity.status === 'COMPLETED' ? 'success' : 'warning'}
                        size="sm"
                      >
                        {activity.status === 'COMPLETED' ? 'Done' : 'In Progress'}
                      </Badge>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Play className="w-6 h-6 text-slate-400" />
                  </div>
                  <p className="text-slate-600 font-medium mb-1">No recent activity</p>
                  <p className="text-sm text-slate-400">Start a lesson to track your progress</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
