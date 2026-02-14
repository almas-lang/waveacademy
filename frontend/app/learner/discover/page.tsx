'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Compass, BookOpen, ArrowRight } from 'lucide-react';
import { LearnerHeader } from '@/components/learner';
import { useSidebar } from '@/lib/sidebar-context';
import { Badge, PageLoading } from '@/components/ui';
import { useLearnerDiscover } from '@/hooks/useLearnerData';

export default function DiscoverPage() {
  const { openSidebar } = useSidebar();
  const { data: programs, isLoading } = useLearnerDiscover();

  return (
    <>
      <LearnerHeader
        title="Discover Programs"
        subtitle="Explore new programs to enroll in"
        onMenuClick={openSidebar}
      />

      <div className="flex-1 p-6 lg:p-8">
        {isLoading ? (
          <PageLoading />
        ) : !programs || programs.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-soft">
            <div className="text-center py-20">
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-5">
                <Compass className="w-10 h-10 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No new programs available</h3>
              <p className="text-slate-500">You&apos;re enrolled in all available programs!</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {programs.map((program) => (
              <div
                key={program.id}
                className="bg-white rounded-xl border border-slate-200/80 shadow-soft overflow-hidden hover:shadow-md transition-shadow group"
              >
                {/* Thumbnail */}
                <div className="relative h-40 bg-gradient-to-br from-primary-100 to-primary-200">
                  {program.thumbnailUrl ? (
                    <Image
                      src={program.thumbnailUrl}
                      alt={program.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <BookOpen className="w-12 h-12 text-primary-400" />
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-5">
                  <h3 className="font-semibold text-slate-900 text-lg mb-2 group-hover:text-primary-700 transition-colors">
                    {program.name}
                  </h3>
                  {program.description && (
                    <p className="text-sm text-slate-500 line-clamp-2 mb-4">{program.description}</p>
                  )}

                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm text-slate-500">
                      {program.lessonCount} {program.lessonCount === 1 ? 'lesson' : 'lessons'}
                    </span>
                    {program.price && Number(program.price) > 0 ? (
                      <Badge variant="info" size="sm">
                        {program.currency === 'INR' ? '\u20B9' : '$'}{program.price}
                      </Badge>
                    ) : (
                      <Badge variant="success" size="sm">Free</Badge>
                    )}
                  </div>

                  {program.slug ? (
                    <Link
                      href={`/auth/register?program=${program.slug}`}
                      className="flex items-center justify-center gap-2 w-full py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors text-sm"
                    >
                      Start Free
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  ) : (
                    <span className="flex items-center justify-center gap-2 w-full py-2.5 bg-slate-100 text-slate-400 font-medium rounded-lg text-sm cursor-not-allowed">
                      Coming Soon
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
