'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowLeft,
  BookOpen,
  Play,
  FileText,
  File,
  ChevronDown,
  ChevronRight,
  CheckCircle,
  Clock,
  Target,
} from 'lucide-react';
import { LearnerHeader } from '@/components/learner';
import { Button, Badge, PageLoading } from '@/components/ui';
import { useLearnerProgram } from '@/hooks/useLearnerData';
import { LearnerContentItem } from '@/types/learner';
import clsx from 'clsx';

export default function LearnerProgramDetailPage() {
  const params = useParams();
  const programId = params.id as string;
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const { data, isLoading } = useLearnerProgram(programId);

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  const getLessonIcon = (type?: string) => {
    switch (type) {
      case 'VIDEO':
        return <Play className="w-4 h-4" />;
      case 'PDF':
        return <FileText className="w-4 h-4" />;
      case 'TEXT':
        return <File className="w-4 h-4" />;
      default:
        return <File className="w-4 h-4" />;
    }
  };

  const getProgressStatus = (lessonId: string) => {
    return data?.progress?.[lessonId]?.status || 'NOT_STARTED';
  };

  // Recursively count all lessons within a content item
  const countNestedLessons = (item: LearnerContentItem): number => {
    if (item.type === 'lesson') return 1;
    if (!item.children) return 0;
    return item.children.reduce((sum, child) => sum + countNestedLessons(child), 0);
  };

  const renderContentItem = (item: LearnerContentItem, depth: number = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.has(item.id);

    if (item.type === 'lesson') {
      const status = getProgressStatus(item.id);
      const isCompleted = status === 'COMPLETED';
      const isInProgress = status === 'IN_PROGRESS';

      return (
        <Link
          key={item.id}
          href={`/learner/lessons/${item.id}`}
          className={clsx(
            'flex items-center justify-between py-3.5 px-4 rounded-lg transition-all group',
            isCompleted
              ? 'bg-emerald-50 hover:bg-emerald-100 border border-emerald-100'
              : 'hover:bg-slate-50 border border-transparent hover:border-slate-200'
          )}
          style={{ marginLeft: depth * 20 }}
        >
          <div className="flex items-center gap-3.5">
            <div className={clsx(
              'w-10 h-10 rounded-lg flex items-center justify-center transition-colors',
              isCompleted ? 'bg-emerald-500 text-white' :
              isInProgress ? 'bg-accent-500 text-white' :
              'bg-primary-50 text-primary-600 group-hover:bg-primary-700 group-hover:text-white'
            )}>
              {isCompleted ? <CheckCircle className="w-5 h-5" /> : getLessonIcon(item.lessonType)}
            </div>
            <div>
              <p className={clsx(
                'font-medium transition-colors',
                isCompleted ? 'text-emerald-700' : 'text-slate-900 group-hover:text-slate-700'
              )}>
                {item.title}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="neutral" size="sm">{item.lessonType}</Badge>
                {item.durationSeconds && (
                  <span className="flex items-center gap-1 text-xs text-slate-500">
                    <Clock className="w-3 h-3" />
                    {Math.round(item.durationSeconds / 60)} min
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isCompleted && (
              <Badge variant="success" size="sm">Completed</Badge>
            )}
            {isInProgress && (
              <Badge variant="warning" size="sm">In Progress</Badge>
            )}
            <ChevronRight className="w-4 h-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </Link>
      );
    }

    // Topic or Subtopic
    const lessonCount = countNestedLessons(item);

    return (
      <div key={item.id} style={{ marginLeft: depth * 20 }}>
        <button
          onClick={() => hasChildren && toggleExpand(item.id)}
          className={clsx(
            'flex items-center gap-3 w-full py-3 px-4 rounded-lg transition-colors text-left',
            hasChildren && isExpanded ? 'bg-primary-50' : hasChildren ? 'hover:bg-slate-50' : 'bg-slate-50/50',
            !hasChildren && 'cursor-default'
          )}
        >
          <div className={clsx(
            'w-8 h-8 rounded-lg flex items-center justify-center transition-colors',
            hasChildren && isExpanded ? 'bg-primary-700 text-white' : 'bg-primary-100 text-primary-600'
          )}>
            {hasChildren ? (
              isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )
            ) : (
              <BookOpen className="w-4 h-4" />
            )}
          </div>
          <div className="flex-1">
            <span className={clsx(
              'font-semibold',
              item.type === 'topic' ? 'text-slate-900' : 'text-slate-700'
            )}>
              {item.name}
            </span>
            <span className="text-xs text-slate-400 ml-2">
              {lessonCount} {lessonCount === 1 ? 'lesson' : 'lessons'}
            </span>
          </div>
        </button>

        {isExpanded && hasChildren && (
          <div className="mt-2 space-y-2 pl-4 border-l-2 border-primary-200 ml-4">
            {item.children!.map((child) => renderContentItem(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <>
        <LearnerHeader title="Program" onMenuClick={() => setSidebarOpen(true)} />
        <PageLoading />
      </>
    );
  }

  if (!data) {
    return (
      <>
        <LearnerHeader title="Program" onMenuClick={() => setSidebarOpen(true)} />
        <div className="flex-1 p-6 lg:p-8">
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-soft">
            <div className="text-center py-20">
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-5">
                <BookOpen className="w-10 h-10 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Program not found</h3>
              <p className="text-slate-500 mb-6">This program doesn't exist or you don't have access</p>
              <Link href="/learner/programs">
                <Button variant="primary">Back to Programs</Button>
              </Link>
            </div>
          </div>
        </div>
      </>
    );
  }

  const { program, content, progress } = data;

  // Calculate progress
  const countLessons = (items: LearnerContentItem[]): { total: number; completed: number } => {
    return items.reduce(
      (acc, item) => {
        if (item.type === 'lesson') {
          acc.total += 1;
          if (progress?.[item.id]?.status === 'COMPLETED') {
            acc.completed += 1;
          }
        }
        if (item.children) {
          const childCounts = countLessons(item.children);
          acc.total += childCounts.total;
          acc.completed += childCounts.completed;
        }
        return acc;
      },
      { total: 0, completed: 0 }
    );
  };

  const lessonCounts = countLessons(content.filter(item => item.type !== 'lesson'));
  const progressPercentage = lessonCounts.total > 0
    ? Math.round((lessonCounts.completed / lessonCounts.total) * 100)
    : 0;

  return (
    <>
      <LearnerHeader
        title={program.name}
        subtitle={`${lessonCounts.total} lessons • ${progressPercentage}% complete`}
        onMenuClick={() => setSidebarOpen(true)}
      />

      <div className="flex-1 p-6 lg:p-8">
        {/* Back Button */}
        <Link
          href="/learner/programs"
          className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Programs
        </Link>

        {/* Program Header Card */}
        <div className="relative overflow-hidden bg-gradient-to-br from-primary-600 via-primary-500 to-primary-700 rounded-2xl p-6 lg:p-8 mb-6">
          {/* Background pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-64 h-64 bg-accent-500 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary-400 rounded-full blur-3xl" />
          </div>

          <div className="relative flex flex-col lg:flex-row gap-6">
            {/* Thumbnail */}
            {program.thumbnailUrl ? (
              <Image
                src={program.thumbnailUrl}
                alt={program.name}
                width={288}
                height={176}
                className="w-full lg:w-72 h-44 object-cover rounded-xl shadow-lg"
              />
            ) : (
              <div className="w-full lg:w-72 h-44 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/10">
                <BookOpen className="w-16 h-16 text-white/40" />
              </div>
            )}

            {/* Info */}
            <div className="flex-1">
              <h1 className="text-2xl lg:text-3xl font-bold text-white mb-3">{program.name}</h1>
              {program.description && (
                <p className="text-primary-200 mb-5 line-clamp-2">{program.description}</p>
              )}

              {/* Progress */}
              <div className="mb-5">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-primary-300">
                    {lessonCounts.completed} / {lessonCounts.total} lessons completed
                  </span>
                  <span className="font-bold text-white">{progressPercentage}%</span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500 ease-out"
                    style={{
                      width: `${progressPercentage}%`,
                      backgroundColor: progressPercentage === 100 ? '#10b981' : '#FF6B57'
                    }}
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                {progressPercentage === 100 ? (
                  <Badge variant="success" size="sm">
                    <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
                    Program Completed
                  </Badge>
                ) : progressPercentage > 0 ? (
                  <Badge variant="info" size="sm">
                    <Target className="w-3.5 h-3.5 mr-1.5" />
                    In Progress
                  </Badge>
                ) : (
                  <Badge variant="neutral" size="sm">
                    Ready to Start
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Content Tree */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-soft overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-lg font-semibold text-slate-900">Course Content</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              {lessonCounts.total} lessons • {lessonCounts.completed} completed
            </p>
          </div>

          <div className="p-4">
            {content.length > 0 ? (
              <div className="space-y-2">
                {content.filter(item => item.type !== 'lesson').map((item) => renderContentItem(item))}
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <BookOpen className="w-8 h-8 text-slate-400" />
                </div>
                <p className="text-slate-600 font-medium mb-1">No content available</p>
                <p className="text-sm text-slate-400">Check back later for course materials</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
