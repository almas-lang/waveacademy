'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { BookOpen, Clock, CheckCircle, Play, GraduationCap } from 'lucide-react';
import { LearnerHeader } from '@/components/learner';
import { useSidebar } from '@/lib/sidebar-context';
import { Button, Badge, PageLoading, EmptyState } from '@/components/ui';
import { useLearnerHome } from '@/hooks/useLearnerData';

export default function LearnerProgramsPage() {
  const { openSidebar } = useSidebar();
  const { data, isLoading } = useLearnerHome();

  if (isLoading) {
    return (
      <>
        <LearnerHeader title="My Programs" onMenuClick={openSidebar} />
        <PageLoading />
      </>
    );
  }

  const programs = data?.enrolledPrograms || [];
  const completedCount = programs.filter(p => p.progressPercentage === 100).length;

  return (
    <>
      <LearnerHeader
        title="My Programs"
        subtitle={`${programs.length} programs enrolled • ${completedCount} completed`}
        onMenuClick={openSidebar}
      />

      <div className="flex-1 p-6 lg:p-8">
        {programs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {programs.map((program) => (
              <Link
                key={program.id}
                href={program.nextLessonId
                  ? `/learner/lessons/${program.nextLessonId}?program=${encodeURIComponent(program.name)}`
                  : `/learner/programs/${program.id}`}
                className="group bg-white rounded-xl border border-slate-200/80 shadow-soft overflow-hidden hover:shadow-elevated hover:border-slate-300 transition-all duration-200"
              >
                {/* Thumbnail */}
                <div className="relative">
                  {program.thumbnailUrl ? (
                    <Image
                      src={program.thumbnailUrl}
                      alt={program.name}
                      width={400}
                      height={176}
                      className="w-full h-44 object-cover"
                    />
                  ) : (
                    <div className="w-full h-44 bg-gradient-to-br from-primary-600 to-primary-700 flex items-center justify-center">
                      <BookOpen className="w-16 h-16 text-white/20" />
                    </div>
                  )}

                  {/* Progress Badge */}
                  {program.progressPercentage === 100 && (
                    <div className="absolute top-3 right-3">
                      <Badge variant="success" size="sm">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Completed
                      </Badge>
                    </div>
                  )}

                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/20 transition-colors flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100">
                      <Play className="w-5 h-5 text-slate-900 ml-0.5" />
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="p-5">
                  <h3 className="font-semibold text-slate-900 mb-2 group-hover:text-accent-600 transition-colors">
                    {program.name}
                  </h3>
                  {program.nextLessonTitle && program.progressPercentage > 0 && program.progressPercentage < 100 && (
                    <p className="text-sm text-accent-500 truncate -mt-1 mb-2">↳ Currently on: {program.nextLessonTitle}</p>
                  )}

                  {program.description && (
                    <p className="text-sm text-slate-500 mb-3 line-clamp-2">
                      {program.description}
                    </p>
                  )}

                  {/* Stats */}
                  <div className="flex items-center gap-4 text-sm text-slate-500 mb-4">
                    <span className="flex items-center gap-1.5">
                      <BookOpen className="w-4 h-4 text-slate-400" />
                      {program.totalLessons} lessons
                    </span>
                    {program.lastAccessedAt && (
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-slate-400" />
                        Recently viewed
                      </span>
                    )}
                  </div>

                  {/* Progress */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-slate-500">
                        {program.completedLessons}/{program.totalLessons} lessons completed
                      </span>
                      <span className="font-semibold text-slate-900">
                        {program.progressPercentage}%
                      </span>
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
                  >
                    {program.progressPercentage === 0
                      ? 'Start Learning'
                      : program.progressPercentage === 100
                        ? 'Review Course'
                        : 'Continue Learning'}
                  </Button>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-soft">
            <div className="text-center py-20">
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-5">
                <GraduationCap className="w-10 h-10 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No programs yet</h3>
              <p className="text-slate-500 max-w-sm mx-auto">
                You are not enrolled in any programs. Contact your administrator to get enrolled in courses.
              </p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
