'use client';

import { useState } from 'react';
import { User, Mail, Phone, Calendar, BookOpen, CheckCircle, Hash, Award, TrendingUp } from 'lucide-react';
import { LearnerHeader } from '@/components/learner';
import { Badge, PageLoading } from '@/components/ui';
import { useLearnerProfile, useLearnerHome } from '@/hooks/useLearnerData';
import { format } from 'date-fns';

export default function LearnerProfilePage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { data: profile, isLoading: profileLoading } = useLearnerProfile();
  const { data: homeData, isLoading: homeLoading } = useLearnerHome();

  const isLoading = profileLoading || homeLoading;

  if (isLoading) {
    return (
      <>
        <LearnerHeader title="Profile" onMenuClick={() => setSidebarOpen(true)} />
        <PageLoading />
      </>
    );
  }

  // Calculate overall progress
  const totalLessons = homeData?.enrolledPrograms?.reduce((sum, p) => sum + p.totalLessons, 0) || 0;
  const completedLessons = homeData?.enrolledPrograms?.reduce((sum, p) => sum + p.completedLessons, 0) || 0;
  const overallProgress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
  const completedPrograms = homeData?.enrolledPrograms?.filter(p => p.progressPercentage === 100).length || 0;

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <>
      <LearnerHeader
        title="Profile"
        subtitle="Manage your account and track progress"
        onMenuClick={() => setSidebarOpen(true)}
      />

      <div className="flex-1 p-6 lg:p-8">
        <div className="max-w-3xl mx-auto">
          {/* Profile Header Card */}
          <div className="bg-gradient-to-br from-primary-600 via-primary-500 to-primary-700 rounded-2xl p-6 lg:p-8 mb-6 relative overflow-hidden">
            {/* Background pattern */}
            <div className="absolute inset-0 opacity-20">
              <div className="absolute top-0 right-0 w-48 h-48 bg-accent-500 rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-primary-300 rounded-full blur-2xl" />
            </div>

            <div className="relative flex flex-col sm:flex-row items-center gap-6">
              {/* Avatar */}
              <div className="w-24 h-24 bg-accent-500 rounded-2xl flex items-center justify-center shadow-lg">
                <span className="text-3xl font-bold text-white">
                  {profile?.name ? getInitials(profile.name) : 'U'}
                </span>
              </div>

              <div className="text-center sm:text-left">
                <h2 className="text-2xl font-bold text-white mb-1">
                  {profile?.name || 'Learner'}
                </h2>
                <p className="text-primary-100 text-sm mb-3">{profile?.email}</p>
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <Badge variant="info" size="sm">
                    <Award className="w-3 h-3 mr-1" />
                    Student
                  </Badge>
                  {completedPrograms > 0 && (
                    <Badge variant="success" size="sm">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      {completedPrograms} Completed
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Profile Info */}
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-soft p-6">
              <h3 className="font-semibold text-slate-900 mb-4">Personal Information</h3>

              <div className="space-y-3">
                <div className="flex items-center gap-3.5 p-3.5 bg-slate-50 rounded-lg">
                  <div className="w-10 h-10 bg-slate-200 rounded-lg flex items-center justify-center">
                    <Mail className="w-5 h-5 text-slate-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-medium">Email</p>
                    <p className="font-medium text-slate-900">{profile?.email}</p>
                  </div>
                </div>

                {profile?.mobile && (
                  <div className="flex items-center gap-3.5 p-3.5 bg-slate-50 rounded-lg">
                    <div className="w-10 h-10 bg-slate-200 rounded-lg flex items-center justify-center">
                      <Phone className="w-5 h-5 text-slate-600" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 font-medium">Mobile</p>
                      <p className="font-medium text-slate-900">{profile.mobile}</p>
                    </div>
                  </div>
                )}

                {profile?.registrationNumber && (
                  <div className="flex items-center gap-3.5 p-3.5 bg-slate-50 rounded-lg">
                    <div className="w-10 h-10 bg-slate-200 rounded-lg flex items-center justify-center">
                      <Hash className="w-5 h-5 text-slate-600" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 font-medium">Registration Number</p>
                      <p className="font-medium text-slate-900">{profile.registrationNumber}</p>
                    </div>
                  </div>
                )}

                {profile?.createdAt && (
                  <div className="flex items-center gap-3.5 p-3.5 bg-slate-50 rounded-lg">
                    <div className="w-10 h-10 bg-slate-200 rounded-lg flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-slate-600" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 font-medium">Member Since</p>
                      <p className="font-medium text-slate-900">
                        {format(new Date(profile.createdAt), 'MMMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Stats Card */}
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-soft p-6">
              <h3 className="font-semibold text-slate-900 mb-4">Learning Progress</h3>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="p-4 bg-accent-50 rounded-xl text-center border border-accent-100">
                  <BookOpen className="w-7 h-7 text-accent-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-slate-900">
                    {homeData?.enrolledPrograms?.length || 0}
                  </p>
                  <p className="text-xs text-slate-500 font-medium">Programs</p>
                </div>

                <div className="p-4 bg-emerald-50 rounded-xl text-center border border-emerald-100">
                  <CheckCircle className="w-7 h-7 text-emerald-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-slate-900">
                    {completedLessons}
                  </p>
                  <p className="text-xs text-slate-500 font-medium">Lessons Done</p>
                </div>
              </div>

              {/* Overall Progress */}
              {totalLessons > 0 && (
                <div className="p-4 bg-slate-50 rounded-xl">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-slate-500" />
                      <span className="text-sm font-medium text-slate-700">Overall Progress</span>
                    </div>
                    <span className="text-lg font-bold text-slate-900">{overallProgress}%</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500 ease-out"
                      style={{
                        width: `${overallProgress}%`,
                        backgroundColor: overallProgress === 100 ? '#10b981' : '#FF6B57',
                      }}
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    {completedLessons} of {totalLessons} total lessons completed
                  </p>
                </div>
              )}

              {totalLessons === 0 && (
                <div className="text-center py-6 text-slate-500">
                  <p className="text-sm">Start learning to track your progress!</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
