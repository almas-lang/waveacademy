'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  FileText,
  Play,
  Clock,
  BookOpen,
} from 'lucide-react';
import { LearnerHeader } from '@/components/learner';
import { Button, Badge, PageLoading } from '@/components/ui';
import { useLearnerLesson, useUpdateLessonProgress, useCompleteLesson } from '@/hooks/useLearnerData';

export default function LessonViewerPage() {
  const params = useParams();
  const router = useRouter();
  const lessonId = params.id as string;
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { data, isLoading } = useLearnerLesson(lessonId);
  const updateProgress = useUpdateLessonProgress();
  const completeLesson = useCompleteLesson();

  // Video progress tracking
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedPositionRef = useRef<number>(0);

  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []);

  const handleVideoTimeUpdate = (currentTime: number, duration: number) => {
    // Save progress every 10 seconds
    if (Math.floor(currentTime) - lastSavedPositionRef.current >= 10) {
      lastSavedPositionRef.current = Math.floor(currentTime);
      updateProgress.mutate({
        lessonId,
        watchPositionSeconds: Math.floor(currentTime),
      });
    }

    // Auto-complete when 90% watched
    if (currentTime / duration >= 0.9 && data?.progress?.status !== 'COMPLETED') {
      completeLesson.mutate(lessonId);
    }
  };

  const handleMarkComplete = () => {
    completeLesson.mutate(lessonId);
  };

  if (isLoading) {
    return (
      <>
        <LearnerHeader title="Lesson" onMenuClick={() => setSidebarOpen(true)} />
        <PageLoading />
      </>
    );
  }

  if (!data) {
    return (
      <>
        <LearnerHeader title="Lesson" onMenuClick={() => setSidebarOpen(true)} />
        <div className="flex-1 p-6 lg:p-8">
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-soft">
            <div className="text-center py-20">
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-5">
                <BookOpen className="w-10 h-10 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Lesson not found</h3>
              <p className="text-slate-500 mb-6">This lesson doesn't exist or you don't have access</p>
              <Link href="/learner/programs">
                <Button variant="primary">Back to Programs</Button>
              </Link>
            </div>
          </div>
        </div>
      </>
    );
  }

  const { lesson, program, progress, navigation } = data;
  const isCompleted = progress?.status === 'COMPLETED';

  return (
    <>
      <LearnerHeader
        title={lesson.title}
        subtitle={program.name}
        onMenuClick={() => setSidebarOpen(true)}
      />

      <div className="flex-1">
        {/* Navigation Bar */}
        <div className="bg-white border-b border-slate-200/80 px-4 py-3 shadow-sm">
          <div className="flex items-center justify-between max-w-6xl mx-auto">
            <Link
              href={`/learner/programs/${program.id}`}
              className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline font-medium">{program.name}</span>
              <span className="sm:hidden font-medium">Back</span>
            </Link>

            <div className="flex items-center gap-2">
              {navigation.previousLesson && (
                <Link href={`/learner/lessons/${navigation.previousLesson.id}`}>
                  <Button variant="ghost" size="sm" leftIcon={<ChevronLeft className="w-4 h-4" />}>
                    <span className="hidden sm:inline">Previous</span>
                  </Button>
                </Link>
              )}
              {navigation.nextLesson && (
                <Link href={`/learner/lessons/${navigation.nextLesson.id}`}>
                  <Button variant="secondary" size="sm" rightIcon={<ChevronRight className="w-4 h-4" />}>
                    <span className="hidden sm:inline">Next</span>
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-6xl mx-auto p-6 lg:p-8">
          {/* Lesson Header */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 mb-3">{lesson.title}</h1>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="neutral" size="sm">
                  {lesson.type === 'VIDEO' && <Play className="w-3 h-3 mr-1" />}
                  {lesson.type === 'PDF' && <FileText className="w-3 h-3 mr-1" />}
                  {lesson.type}
                </Badge>
                {lesson.durationSeconds && (
                  <span className="flex items-center gap-1.5 text-sm text-slate-500">
                    <Clock className="w-4 h-4 text-slate-400" />
                    {Math.round(lesson.durationSeconds / 60)} min
                  </span>
                )}
                {isCompleted && (
                  <Badge variant="success" size="sm">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Completed
                  </Badge>
                )}
              </div>
            </div>

            {!isCompleted && (
              <Button
                variant="primary"
                size="sm"
                onClick={handleMarkComplete}
                isLoading={completeLesson.isPending}
                leftIcon={<CheckCircle className="w-4 h-4" />}
              >
                Mark Complete
              </Button>
            )}
          </div>

          {/* Lesson Content */}
          {lesson.type === 'VIDEO' && lesson.contentUrl && (
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-soft overflow-hidden mb-6">
              <div style={{ position: 'relative', paddingTop: '56.25%' }}>
                <iframe
                  src={progress?.watchPositionSeconds
                    ? `${lesson.contentUrl}${lesson.contentUrl.includes('?') ? '&' : '?'}t=${progress.watchPositionSeconds}&autoplay=false&preload=true`
                    : `${lesson.contentUrl}${lesson.contentUrl.includes('?') ? '&' : '?'}autoplay=false&preload=true`
                  }
                  loading="lazy"
                  style={{
                    border: 'none',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    height: '100%',
                    width: '100%',
                  }}
                  allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </div>
          )}

          {/* PDF / Text Content */}
          {lesson.type === 'PDF' && lesson.contentUrl && (
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-soft overflow-hidden mb-6">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-accent-50 rounded-lg flex items-center justify-center">
                    <FileText className="w-5 h-5 text-accent-500" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">PDF Document</p>
                    <p className="text-sm text-slate-500">View the document below</p>
                  </div>
                </div>
                <iframe
                  src={`${lesson.contentUrl}#toolbar=0&navpanes=0&scrollbar=1`}
                  className="w-full h-[700px] rounded-lg border border-slate-200"
                  sandbox="allow-same-origin allow-scripts"
                />
              </div>
            </div>
          )}

          {lesson.type === 'TEXT' && (
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-soft overflow-hidden mb-6">
              <div className="p-6 lg:p-8">
                {lesson.contentText ? (
                  <div
                    className="prose prose-slate max-w-none prose-headings:text-slate-900 prose-p:text-slate-600 prose-a:text-accent-500 prose-strong:text-slate-900"
                    dangerouslySetInnerHTML={{ __html: lesson.contentText }}
                  />
                ) : (
                  <div className="text-center py-12">
                    <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <FileText className="w-6 h-6 text-slate-400" />
                    </div>
                    <p className="text-slate-500">No content available</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Attachments (view only) */}
          {lesson.attachments && lesson.attachments.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-soft overflow-hidden mb-6">
              <div className="px-6 py-4 border-b border-slate-100">
                <h3 className="font-semibold text-slate-900">Attachments</h3>
                <p className="text-sm text-slate-500 mt-0.5">{lesson.attachments.length} files</p>
              </div>
              <div className="p-4">
                <div className="space-y-2">
                  {lesson.attachments.map((attachment) => (
                    <div
                      key={attachment.id}
                      className="flex items-center gap-3.5 p-3.5 bg-slate-50 rounded-lg border border-transparent"
                    >
                      <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border border-slate-200">
                        <FileText className="w-5 h-5 text-slate-500" />
                      </div>
                      <span className="flex-1 font-medium text-slate-700">
                        {attachment.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Navigation Footer */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-slate-200">
            {navigation.previousLesson ? (
              <Link href={`/learner/lessons/${navigation.previousLesson.id}`} className="w-full sm:w-auto">
                <Button variant="secondary" className="w-full sm:w-auto" leftIcon={<ChevronLeft className="w-4 h-4" />}>
                  <span className="truncate max-w-[200px]">Previous: {navigation.previousLesson.title}</span>
                </Button>
              </Link>
            ) : (
              <div className="hidden sm:block" />
            )}

            {navigation.nextLesson ? (
              <Link href={`/learner/lessons/${navigation.nextLesson.id}`} className="w-full sm:w-auto">
                <Button variant="primary" className="w-full sm:w-auto" rightIcon={<ChevronRight className="w-4 h-4" />}>
                  <span className="truncate max-w-[200px]">Next: {navigation.nextLesson.title}</span>
                </Button>
              </Link>
            ) : (
              <Link href={`/learner/programs/${program.id}`} className="w-full sm:w-auto">
                <Button variant="primary" className="w-full sm:w-auto">
                  Back to Program
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
