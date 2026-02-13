'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import DOMPurify from 'dompurify';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
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
  Image,
  Film,
  FileSpreadsheet,
  File,
} from 'lucide-react';
import { LearnerHeader } from '@/components/learner';
import { useSidebar } from '@/lib/sidebar-context';
import { Button, Badge } from '@/components/ui';
import { useLearnerLesson, useCompleteLesson, useUpdateLessonProgress, learnerKeys } from '@/hooks/useLearnerData';
import { useQueryClient } from '@tanstack/react-query';

function getFileIcon(name: string) {
  const ext = name.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'pdf':
      return <FileText className="w-5 h-5 text-red-500" />;
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
    case 'webp':
      return <Image className="w-5 h-5 text-blue-500" />;
    case 'mp4':
    case 'mov':
    case 'avi':
      return <Film className="w-5 h-5 text-purple-500" />;
    case 'xls':
    case 'xlsx':
    case 'csv':
      return <FileSpreadsheet className="w-5 h-5 text-emerald-500" />;
    case 'doc':
    case 'docx':
      return <FileText className="w-5 h-5 text-blue-600" />;
    case 'ppt':
    case 'pptx':
      return <FileText className="w-5 h-5 text-orange-500" />;
    default:
      return <File className="w-5 h-5 text-slate-400" />;
  }
}

function LessonSkeleton({ type }: { type?: string }) {
  const isVideo = type === 'VIDEO';
  const isPdf = type === 'PDF';
  return (
    <div className="flex-1">
      {/* Nav bar skeleton */}
      <div className="bg-white border-b border-slate-200/80 px-4 lg:px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="h-4 w-28 bg-slate-100 rounded animate-pulse" />
          <div className="hidden md:block h-3 w-20 bg-slate-100 rounded animate-pulse" />
          <div className="flex gap-2">
            <div className="h-7 w-16 bg-slate-100 rounded-lg animate-pulse" />
            <div className="h-7 w-16 bg-slate-100 rounded-lg animate-pulse" />
          </div>
        </div>
      </div>

      {/* Content area skeleton */}
      <div className={isVideo ? "px-4 lg:px-6 py-6 bg-slate-50" : "max-w-6xl mx-auto px-4 lg:px-6 py-6"}>
        <div className="bg-slate-200 rounded-xl overflow-hidden" style={{ paddingTop: isVideo ? '56.25%' : '60%', position: 'relative' }}>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-14 h-14 rounded-full bg-white/60 flex items-center justify-center animate-pulse shadow-sm">
              {isPdf ? (
                <FileText className="w-6 h-6 text-slate-400" />
              ) : isVideo ? (
                <Play className="w-6 h-6 text-slate-400 ml-0.5" />
              ) : (
                <BookOpen className="w-6 h-6 text-slate-400" />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Title area */}
      <div className="max-w-6xl mx-auto px-4 lg:px-6 pt-4 pb-8">
        <div className="h-5 w-56 bg-slate-100 rounded animate-pulse mb-3" />
        <div className="flex gap-2">
          <div className="h-5 w-16 bg-slate-100 rounded-full animate-pulse" />
          <div className="h-5 w-20 bg-slate-100 rounded-full animate-pulse" />
        </div>
      </div>
    </div>
  );
}

export default function LessonViewerPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const lessonId = params.id as string;
  const lessonType = searchParams.get('type') || undefined;
  const programNameHint = searchParams.get('program') || '';
  const { openSidebar } = useSidebar();
  const [showCompletionCelebration, setShowCompletionCelebration] = useState(false);

  // Scroll to top when navigating to a lesson
  useEffect(() => {
    setTimeout(() => window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior }), 0);
  }, [lessonId]);

  const { data, isLoading } = useLearnerLesson(lessonId);
  const completeLesson = useCompleteLesson();
  const updateProgress = useUpdateLessonProgress();
  const queryClient = useQueryClient();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Track video progress via Bunny's player.js library
  useEffect(() => {
    if (!data || data.lesson.type !== 'VIDEO' || !data.lesson.contentUrl) return;
    const iframe = iframeRef.current;
    if (!iframe) return;

    let destroyed = false;

    const init = () => {
      if (destroyed) return;
      const w = window as any;
      if (!w.playerjs) {
        console.error('[VideoProgress] playerjs failed to load');
        return;
      }
      const player = new w.playerjs.Player(iframe);
      player.on('ready', () => {
        if (destroyed) return;
        console.log('[VideoProgress] Player ready, subscribing to timeupdate');
        player.on('timeupdate', (value: { seconds: number; duration: number }) => {
          if (!destroyed) {
            updateProgress.mutate({
              lessonId,
              watchPositionSeconds: Math.floor(value.seconds),
            });
          }
        });
      });
    };

    if ((window as any).playerjs) {
      init();
    } else {
      const script = document.createElement('script');
      script.src = 'https://assets.mediadelivery.net/playerjs/playerjs-latest.min.js';
      script.onload = init;
      script.onerror = () => console.error('[VideoProgress] Failed to load playerjs script');
      document.head.appendChild(script);
    }

    return () => {
      destroyed = true;
    };
  }, [data, lessonId, updateProgress]);

  // Flush pending progress and invalidate home cache when navigating away
  useEffect(() => {
    return () => {
      updateProgress.flush();
      queryClient.invalidateQueries({ queryKey: learnerKeys.home() });
    };
  }, [updateProgress, queryClient]);

  const handleMarkComplete = () => {
    completeLesson.mutate(lessonId, {
      onSuccess: () => {
        setShowCompletionCelebration(true);
      },
    });
  };

  if (isLoading) {
    return (
      <>
        <LearnerHeader title="loading..." onMenuClick={openSidebar} />
        <LessonSkeleton type={lessonType} />
      </>
    );
  }

  if (!data) {
    return (
      <>
        <LearnerHeader title="loading..." onMenuClick={openSidebar} />
        <div className="flex-1 p-6 lg:p-8">
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-soft">
            <div className="text-center py-20">
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-5">
                <BookOpen className="w-10 h-10 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Lesson not found</h3>
              <p className="text-slate-500 mb-6">This lesson doesn&apos;t exist or you don&apos;t have access</p>
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
  const isCompleted = progress?.status === 'COMPLETED' || showCompletionCelebration;
  const progressPercent = navigation.totalLessons
    ? Math.round(((navigation.currentIndex ?? 0) / navigation.totalLessons) * 100)
    : 0;

  return (
    <>
      <LearnerHeader
        title={program.name}
        onMenuClick={openSidebar}
      />

      <div className="flex-1">
        {/* Navigation Bar */}
        <div className="bg-white border-b border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between px-4 lg:px-6 py-3">
            {/* Left: Back link */}
            <Link
              href={`/learner/programs/${program.id}`}
              className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors min-w-0"
            >
              <ArrowLeft className="w-4 h-4 flex-shrink-0" />
              <span className="hidden sm:inline font-medium truncate max-w-[200px]">{lesson.title}</span>
              <span className="sm:hidden font-medium">Back</span>
            </Link>

            {/* Center: Progress indicator */}
            {navigation.totalLessons && (
              <span className="hidden md:block text-sm text-slate-500 font-medium">
                Lesson {navigation.currentIndex} of {navigation.totalLessons}
              </span>
            )}

            {/* Right: Prev/Next */}
            <div className="flex items-center gap-2">
              {navigation.previousLesson && (
                <Link href={`/learner/lessons/${navigation.previousLesson.id}?program=${encodeURIComponent(program.name)}`}>
                  <Button variant="ghost" size="sm" leftIcon={<ChevronLeft className="w-4 h-4" />}>
                    <span className="hidden sm:inline">Previous</span>
                  </Button>
                </Link>
              )}
              {navigation.nextLesson && (
                <Link href={`/learner/lessons/${navigation.nextLesson.id}?program=${encodeURIComponent(program.name)}`}>
                  <Button variant="secondary" size="sm" rightIcon={<ChevronRight className="w-4 h-4" />}>
                    <span className="hidden sm:inline">Next</span>
                  </Button>
                </Link>
              )}
            </div>
          </div>

          {/* Progress bar */}
          {navigation.totalLessons && (
            <div className="h-0.5 bg-slate-100">
              <div
                className="h-full bg-accent-500 transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          )}
        </div>

        {/* VIDEO: Full-width theater layout */}
        {lesson.type === 'VIDEO' && lesson.contentUrl && (
          <>
            <div className="px-4 lg:px-6 py-6 bg-slate-50">
              <div className="bg-slate-900 rounded-xl shadow-lg overflow-hidden">
                <div style={{ position: 'relative', paddingTop: '56.25%' }}>
                  <iframe
                    ref={iframeRef}
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
            </div>

            {/* Compact lesson info below video */}
            <div className="max-w-6xl mx-auto px-4 lg:px-6 pt-4">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-xl font-bold text-slate-900">{lesson.title}</h1>
                <div className="flex items-center gap-2">
                  <Badge variant="neutral" size="sm">
                    <Play className="w-3 h-3 mr-1" />
                    VIDEO
                  </Badge>
                  {lesson.durationSeconds && (
                    <span className="flex items-center gap-1.5 text-sm text-slate-500">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {Math.round(lesson.durationSeconds / 60)} min
                    </span>
                  )}
                  {isCompleted && !showCompletionCelebration && (
                    <Badge variant="success" size="sm">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Completed
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {/* PDF / TEXT: Standard header above content */}
        {lesson.type !== 'VIDEO' && (
          <div className="max-w-6xl mx-auto px-4 lg:px-6 pt-6">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-slate-900 mb-3">{lesson.title}</h1>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="neutral" size="sm">
                  {lesson.type === 'PDF' && <FileText className="w-3 h-3 mr-1" />}
                  {lesson.type}
                </Badge>
                {lesson.durationSeconds && (
                  <span className="flex items-center gap-1.5 text-sm text-slate-500">
                    <Clock className="w-4 h-4 text-slate-400" />
                    {Math.round(lesson.durationSeconds / 60)} min
                  </span>
                )}
                {isCompleted && !showCompletionCelebration && (
                  <Badge variant="success" size="sm">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Completed
                  </Badge>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Content area */}
        <div className="max-w-6xl mx-auto px-4 lg:px-6 pb-8">
          {/* PDF Content */}
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
                />
              </div>
            </div>
          )}

          {/* Text Content */}
          {lesson.type === 'TEXT' && (
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-soft overflow-hidden mb-6">
              <div className="p-6 lg:p-8">
                {lesson.contentText ? (
                  <div
                    className="prose prose-slate max-w-none prose-headings:text-slate-900 prose-p:text-slate-600 prose-a:text-accent-500 prose-strong:text-slate-900"
                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(lesson.contentText) }}
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
                <p className="text-sm text-slate-500 mt-0.5">
                  {lesson.attachments.length} {lesson.attachments.length === 1 ? 'file' : 'files'} &middot; View only
                </p>
              </div>
              <div className="p-3">
                <div className="grid gap-2">
                  {lesson.attachments.map((attachment) => {
                    const ext = attachment.name.split('.').pop()?.toLowerCase() || '';
                    return (
                      <div
                        key={attachment.id}
                        className="flex items-center gap-3 p-3 rounded-lg bg-slate-50/80 hover:bg-slate-100/80 transition-colors"
                      >
                        <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center border border-slate-200/80 flex-shrink-0">
                          {getFileIcon(attachment.name)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-slate-700 truncate">{attachment.name}</p>
                          <p className="text-xs text-slate-400 uppercase">{ext}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Action Area */}
          <div className="mt-8 pt-6 border-t border-slate-200">
            {showCompletionCelebration ? (
              /* Celebration state */
              <div className="text-center py-6 animate-fade-in">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-scale-in">
                  <CheckCircle className="w-8 h-8 text-emerald-500" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-1">Lesson Complete!</h3>
                <p className="text-slate-500 mb-6">Great job — keep up the momentum!</p>
                {navigation.nextLesson ? (
                  <Link href={`/learner/lessons/${navigation.nextLesson.id}?program=${encodeURIComponent(program.name)}`}>
                    <Button variant="primary" rightIcon={<ChevronRight className="w-4 h-4" />}>
                      Continue to Next Lesson
                    </Button>
                  </Link>
                ) : (
                  <Link href={`/learner/programs/${program.id}`}>
                    <Button variant="primary">
                      Back to Program
                    </Button>
                  </Link>
                )}
              </div>
            ) : isCompleted ? (
              /* Already completed state */
              <div className="text-center py-4">
                <div className="flex items-center justify-center gap-2 text-emerald-600 mb-4">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-medium">Lesson Complete</span>
                </div>
                {navigation.nextLesson ? (
                  <Link href={`/learner/lessons/${navigation.nextLesson.id}?program=${encodeURIComponent(program.name)}`}>
                    <Button variant="primary" rightIcon={<ChevronRight className="w-4 h-4" />}>
                      Continue to Next Lesson
                    </Button>
                  </Link>
                ) : (
                  <Link href={`/learner/programs/${program.id}`}>
                    <Button variant="primary">
                      Back to Program
                    </Button>
                  </Link>
                )}
              </div>
            ) : (
              /* Not completed — prompt to mark complete */
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <span className="text-slate-500 text-sm">Finished this lesson?</span>
                <Button
                  variant="primary"
                  onClick={handleMarkComplete}
                  isLoading={completeLesson.isPending}
                  leftIcon={<CheckCircle className="w-4 h-4" />}
                >
                  Mark as Complete
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes scale-in {
          from { transform: scale(0.5); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        :global(.animate-fade-in) {
          animation: fade-in 0.4s ease-out;
        }
        :global(.animate-scale-in) {
          animation: scale-in 0.3s ease-out 0.1s both;
        }
      `}</style>
    </>
  );
}
