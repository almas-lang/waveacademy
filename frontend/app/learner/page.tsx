'use client';

import Link from 'next/link';
import Image from 'next/image';
import { BookOpen, Calendar, Clock, Play, ArrowRight, CheckCircle, Sparkles, Flame, GraduationCap, Timer, Zap } from 'lucide-react';
import { LearnerHeader } from '@/components/learner';
import { Button, Badge } from '@/components/ui';
import { useLearnerHome } from '@/hooks/useLearnerData';
import { format } from 'date-fns';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function getSessionCountdown(startTime: string): string | null {
  const now = new Date();
  const start = new Date(startTime);
  const diffMs = start.getTime() - now.getTime();
  if (diffMs <= 0) return null;

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `in ${days}d`;
  }
  if (hours > 0) return `in ${hours}h ${minutes}m`;
  return `in ${minutes}m`;
}

function ProgressRing({ percentage, size = 64 }: { percentage: number; size?: number }) {
  const strokeWidth = 5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.15)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#FF6B57"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <span className="absolute text-sm font-bold text-white">{percentage}%</span>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex-1 p-6 lg:p-8">
      {/* Banner skeleton */}
      <div className="bg-gradient-to-br from-primary-600 to-primary-700 rounded-2xl p-6 lg:p-8 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <div className="h-4 w-28 bg-white/20 rounded animate-pulse mb-3" />
            <div className="h-8 w-52 bg-white/20 rounded animate-pulse mb-2" />
            <div className="h-4 w-72 bg-white/10 rounded animate-pulse" />
          </div>
          <div className="flex gap-4">
            <div className="w-24 h-20 bg-white/10 rounded-xl animate-pulse" />
            <div className="w-16 h-16 bg-white/10 rounded-full animate-pulse" />
          </div>
        </div>
      </div>

      {/* Stats row skeleton */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white rounded-xl border border-slate-200/80 shadow-soft p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-100 rounded-lg animate-pulse" />
              <div>
                <div className="h-3 w-16 bg-slate-100 rounded animate-pulse mb-2" />
                <div className="h-6 w-10 bg-slate-100 rounded animate-pulse" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Continue card skeleton */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-soft p-5 mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-100 rounded-xl animate-pulse" />
          <div className="flex-1">
            <div className="h-4 w-40 bg-slate-100 rounded animate-pulse mb-2" />
            <div className="h-3 w-28 bg-slate-50 rounded animate-pulse" />
          </div>
          <div className="h-9 w-28 bg-slate-100 rounded-lg animate-pulse" />
        </div>
      </div>

      {/* Programs skeleton */}
      <div className="mb-8">
        <div className="h-6 w-32 bg-slate-100 rounded animate-pulse mb-5" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-xl border border-slate-200/80 shadow-soft overflow-hidden">
              <div className="h-36 bg-slate-100 animate-pulse" />
              <div className="p-5">
                <div className="h-5 w-40 bg-slate-100 rounded animate-pulse mb-3" />
                <div className="h-2 w-full bg-slate-100 rounded-full animate-pulse mb-4" />
                <div className="h-9 w-full bg-slate-100 rounded-lg animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom row skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2].map(i => (
          <div key={i} className="bg-white rounded-xl border border-slate-200/80 shadow-soft overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <div className="h-5 w-36 bg-slate-100 rounded animate-pulse mb-1.5" />
              <div className="h-3 w-48 bg-slate-50 rounded animate-pulse" />
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

export default function LearnerHomePage() {
  const { data, isLoading } = useLearnerHome();

  if (isLoading) {
    return (
      <>
        <LearnerHeader title="Home" />
        <DashboardSkeleton />
      </>
    );
  }

  const welcomeName = data?.user?.name?.split(' ')[0] || 'Learner';
  const totalProgress = data?.enrolledPrograms?.length
    ? Math.round(
        data.enrolledPrograms.reduce((acc: number, p: { progressPercentage: number }) => acc + p.progressPercentage, 0) /
          data.enrolledPrograms.length
      )
    : 0;

  const continueLearning = data?.continueLearning;
  const stats = data?.learningStats;
  const nextSession = data?.upcomingSessions?.[0];
  const sessionCountdown = nextSession ? getSessionCountdown(nextSession.startTime) : null;
  const hasPrograms = data?.enrolledPrograms && data.enrolledPrograms.length > 0;

  return (
    <>
      <LearnerHeader
        title="Home"
        subtitle="Your learning dashboard"
      />

      <div className="flex-1 p-6 lg:p-8">
        {/* Welcome Banner */}
        <div className="relative overflow-hidden bg-gradient-to-br from-primary-600 via-primary-500 to-primary-700 rounded-2xl p-6 lg:p-8 mb-6 animate-fade-in">
          {/* Background pattern */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-0 right-0 w-64 h-64 bg-accent-500 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary-300 rounded-full blur-3xl" />
          </div>

          <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-5 h-5 text-accent-400" />
                <span className="text-accent-300 text-sm font-medium">{getGreeting()}</span>
              </div>
              <h2 className="text-2xl lg:text-3xl font-bold text-white mb-2">
                Hello, {welcomeName}!
              </h2>
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-primary-100 text-sm lg:text-base">
                  {hasPrograms
                    ? "Continue your learning journey. You're making great progress!"
                    : 'Welcome to your learning dashboard.'}
                </p>
                {/* Streak badge */}
                {stats && stats.activeDaysThisWeek > 0 && (
                  <span className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-sm text-white text-xs font-medium px-2.5 py-1 rounded-full border border-white/10">
                    <Flame className="w-3.5 h-3.5 text-orange-300" />
                    Active {stats.activeDaysThisWeek} day{stats.activeDaysThisWeek !== 1 ? 's' : ''} this week
                  </span>
                )}
                {/* Session countdown badge */}
                {sessionCountdown && nextSession && (
                  <span className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-sm text-white text-xs font-medium px-2.5 py-1 rounded-full border border-white/10">
                    <Timer className="w-3.5 h-3.5 text-emerald-300" />
                    Session {sessionCountdown}
                  </span>
                )}
              </div>
            </div>

            {/* Quick Stats */}
            {hasPrograms && (
              <div className="flex gap-4 lg:gap-6 items-center">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl px-5 py-4 border border-white/10">
                  <p className="text-primary-200 text-xs font-medium mb-1">Programs</p>
                  <p className="text-2xl font-bold text-white">{data?.enrolledPrograms?.length || 0}</p>
                </div>
                <ProgressRing percentage={totalProgress} />
              </div>
            )}
          </div>
        </div>

        {/* Learning Stats Row */}
        {hasPrograms && stats && (
          <div className="grid grid-cols-3 gap-4 mb-6 animate-slide-up opacity-0 [animation-fill-mode:forwards]">
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-soft p-4 hover:shadow-elevated transition-shadow">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-emerald-500" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">Lessons Done</p>
                  <p className="text-xl font-bold text-slate-900">{stats.lessonsCompleted}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200/80 shadow-soft p-4 hover:shadow-elevated transition-shadow">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">Hours Watched</p>
                  <p className="text-xl font-bold text-slate-900">{stats.hoursLearned}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200/80 shadow-soft p-4 hover:shadow-elevated transition-shadow">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center">
                  <Flame className="w-5 h-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">Day Streak</p>
                  <p className="text-xl font-bold text-slate-900">{stats.currentStreak}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Continue Where You Left Off */}
        {continueLearning && (
          <Link
            href={`/learner/lessons/${continueLearning.lessonId}?type=VIDEO`}
            className="block mb-8 animate-slide-up opacity-0 [animation-fill-mode:forwards] [animation-delay:50ms]"
          >
            <div className="group bg-white rounded-xl border border-slate-200/80 shadow-soft hover:shadow-elevated hover:border-slate-300 transition-all p-5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-accent-50 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-accent-500 transition-colors">
                  <Play className="w-5 h-5 text-accent-500 group-hover:text-white transition-colors ml-0.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-accent-500 mb-0.5">Continue where you left off</p>
                  <p className="font-semibold text-slate-900 truncate group-hover:text-accent-600 transition-colors">
                    {continueLearning.lessonTitle}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">{continueLearning.programName}</p>
                </div>
                <Button variant="primary" size="sm" rightIcon={<ArrowRight className="w-4 h-4" />}>
                  Resume
                </Button>
              </div>
              {continueLearning.totalDuration && continueLearning.totalDuration > 0 && (
                <div className="mt-3 ml-16">
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-full bg-accent-500 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.round((continueLearning.watchPosition / continueLearning.totalDuration) * 100))}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </Link>
        )}

        {/* My Programs */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">My Programs</h3>
              {hasPrograms && (
                <p className="text-sm text-slate-500">Your enrolled courses</p>
              )}
            </div>
            {hasPrograms && (
              <Link href="/learner/programs">
                <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="w-4 h-4" />}>
                  View All
                </Button>
              </Link>
            )}
          </div>

          {hasPrograms ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {data.enrolledPrograms.map((program, index) => (
                <Link
                  key={program.id}
                  href={program.nextLessonId
                    ? `/learner/lessons/${program.nextLessonId}`
                    : `/learner/programs/${program.id}`}
                  className="group bg-white rounded-xl border border-slate-200/80 shadow-soft overflow-hidden hover:shadow-elevated hover:border-slate-300 transition-all duration-200 animate-slide-up opacity-0 [animation-fill-mode:forwards]"
                  style={{ animationDelay: `${100 + index * 75}ms` }}
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
                          className="h-full rounded-full transition-all duration-1000 ease-out"
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
            /* Enhanced empty state */
            <div className="bg-gradient-to-br from-slate-50 to-white rounded-2xl border border-slate-200/80 shadow-soft text-center py-20 px-8 animate-fade-in">
              <div className="w-20 h-20 bg-gradient-to-br from-primary-100 to-primary-50 rounded-2xl flex items-center justify-center mx-auto mb-6 rotate-3">
                <GraduationCap className="w-10 h-10 text-primary-500" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Your learning journey starts here</h3>
              <p className="text-slate-500 max-w-sm mx-auto mb-6">
                You&apos;re all set up! Once your administrator enrolls you in a program,
                your courses will appear right here.
              </p>
              <div className="flex items-center justify-center gap-6 text-sm text-slate-400">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  <span>Video lessons</span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  <span>Track progress</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>Live sessions</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upcoming Sessions */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-soft overflow-hidden animate-slide-up opacity-0 [animation-fill-mode:forwards] [animation-delay:100ms]">
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
                            <span>&middot;</span>
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
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-soft overflow-hidden animate-slide-up opacity-0 [animation-fill-mode:forwards] [animation-delay:200ms]">
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
