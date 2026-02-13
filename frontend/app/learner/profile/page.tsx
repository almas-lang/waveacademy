'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Mail, Phone, Calendar, BookOpen, CheckCircle,
  Hash, Award, KeyRound, LogOut, ChevronRight, Info, Trophy,
} from 'lucide-react';
import { LearnerHeader } from '@/components/learner';
import { useSidebar } from '@/lib/sidebar-context';
import { Badge, Button, Modal, PageLoading } from '@/components/ui';
import { useLearnerProfile } from '@/hooks/useLearnerData';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { format } from 'date-fns';

// Circular progress ring for the hero card
function ProgressRing({ progress, size = 80, strokeWidth = 6 }: { progress: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;
  const isComplete = progress === 100;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.2)"
          strokeWidth={strokeWidth}
        />
        {/* Progress arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={isComplete ? '#34d399' : 'white'}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-bold text-white">{progress}%</span>
      </div>
    </div>
  );
}

// Color palette for enrolled programs left borders
const programColors = [
  { border: 'border-l-primary-400', bg: 'bg-primary-50', icon: 'text-primary-500' },
  { border: 'border-l-accent-400', bg: 'bg-accent-50', icon: 'text-accent-500' },
  { border: 'border-l-amber-400', bg: 'bg-amber-50', icon: 'text-amber-500' },
  { border: 'border-l-emerald-400', bg: 'bg-emerald-50', icon: 'text-emerald-500' },
];

export default function LearnerProfilePage() {
  const router = useRouter();
  const { openSidebar } = useSidebar();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const { data: profile, isLoading } = useLearnerProfile();
  const logout = useAuthStore((s) => s.logout);

  if (isLoading) {
    return (
      <>
        <LearnerHeader title="Profile" onMenuClick={openSidebar} />
        <PageLoading />
      </>
    );
  }

  const totalLessons = profile?.totalLessonsCount || 0;
  const completedLessons = profile?.completedLessonsCount || 0;
  const overallProgress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
  const completedPrograms = profile?.completedProgramsCount || 0;

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await authApi.logout();
    } catch {
      // Continue with client-side logout even if server call fails
    }
    logout();
    router.push('/auth/login');
  };

  return (
    <>
      <LearnerHeader
        title="Profile"
        subtitle="Manage your account and track progress"
        onMenuClick={openSidebar}
      />

      <div className="flex-1 p-6 lg:p-8">
        <div className="max-w-3xl mx-auto">
          {/* Profile Header Card — with progress ring */}
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

              <div className="flex-1 text-center sm:text-left">
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

              {/* Progress Ring — right side */}
              {totalLessons > 0 && (
                <div className="flex flex-col items-center gap-1.5">
                  <ProgressRing progress={overallProgress} />
                  <span className="text-xs text-primary-200 font-medium">
                    {completedLessons}/{totalLessons} lessons
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Three stat cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-soft p-4 text-center">
              <div className="w-10 h-10 bg-accent-50 rounded-xl flex items-center justify-center mx-auto mb-2.5 border border-accent-100">
                <BookOpen className="w-5 h-5 text-accent-500" />
              </div>
              <p className="text-2xl font-bold text-slate-900">
                {profile?.enrolledProgramsCount || 0}
              </p>
              <p className="text-xs text-slate-500 font-medium mt-0.5">Programs</p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200/80 shadow-soft p-4 text-center">
              <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center mx-auto mb-2.5 border border-emerald-100">
                <CheckCircle className="w-5 h-5 text-emerald-500" />
              </div>
              <p className="text-2xl font-bold text-slate-900">
                {completedLessons}
              </p>
              <p className="text-xs text-slate-500 font-medium mt-0.5">Lessons Completed</p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200/80 shadow-soft p-4 text-center">
              <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center mx-auto mb-2.5 border border-amber-100">
                <Trophy className="w-5 h-5 text-amber-500" />
              </div>
              <p className="text-2xl font-bold text-slate-900">
                {completedPrograms}
              </p>
              <p className="text-xs text-slate-500 font-medium mt-0.5">Completed</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Profile Info */}
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-soft p-6">
              <h3 className="font-semibold text-slate-900 mb-4">Personal Information</h3>

              <div className="space-y-3">
                <div className="flex items-center gap-3.5 p-3.5 bg-slate-50 rounded-lg">
                  <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center">
                    <Mail className="w-5 h-5 text-primary-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-medium">Email</p>
                    <p className="font-medium text-slate-900">{profile?.email}</p>
                  </div>
                </div>

                {profile?.mobile && (
                  <div className="flex items-center gap-3.5 p-3.5 bg-slate-50 rounded-lg">
                    <div className="w-10 h-10 bg-accent-50 rounded-lg flex items-center justify-center">
                      <Phone className="w-5 h-5 text-accent-600" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 font-medium">Mobile</p>
                      <p className="font-medium text-slate-900">{profile.mobile}</p>
                    </div>
                  </div>
                )}

                {profile?.registrationNumber && (
                  <div className="flex items-center gap-3.5 p-3.5 bg-slate-50 rounded-lg">
                    <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center">
                      <Hash className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 font-medium">Registration Number</p>
                      <p className="font-medium text-slate-900">{profile.registrationNumber}</p>
                    </div>
                  </div>
                )}

                {profile?.createdAt && (
                  <div className="flex items-center gap-3.5 p-3.5 bg-slate-50 rounded-lg">
                    <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-emerald-600" />
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

            {/* Enrolled Programs — with colored left borders */}
            {profile?.enrolledPrograms && profile.enrolledPrograms.length > 0 ? (
              <div className="bg-white rounded-xl border border-slate-200/80 shadow-soft p-6">
                <h3 className="font-semibold text-slate-900 mb-4">Enrolled Programs</h3>
                <div className="space-y-2.5">
                  {profile.enrolledPrograms.map((name, i) => {
                    const color = programColors[i % programColors.length];
                    return (
                      <div
                        key={i}
                        className={`flex items-center gap-3 p-3.5 bg-slate-50 rounded-lg border-l-[3px] ${color.border}`}
                      >
                        <div className={`w-8 h-8 ${color.bg} rounded-lg flex items-center justify-center`}>
                          <BookOpen className={`w-4 h-4 ${color.icon}`} />
                        </div>
                        <span className="font-medium text-slate-900 text-sm">{name}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-slate-200/80 shadow-soft p-6 flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mb-3">
                  <BookOpen className="w-6 h-6 text-slate-400" />
                </div>
                <p className="text-sm font-medium text-slate-600">No programs yet</p>
                <p className="text-xs text-slate-400 mt-1">Contact your admin to get enrolled</p>
              </div>
            )}
          </div>

          {/* Quick Actions — taller cards with bolder treatment */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
            <button
              onClick={() => router.push('/learner/change-password')}
              className="bg-white rounded-xl border border-slate-200/80 shadow-soft p-5 flex items-center gap-4 hover:border-primary-300 hover:shadow-md transition-all group text-left"
            >
              <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center group-hover:bg-primary-100 transition-colors">
                <KeyRound className="w-6 h-6 text-primary-600" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-slate-900 text-sm">Change Password</p>
                <p className="text-xs text-slate-500 mt-0.5">Update your account password</p>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-primary-500 transition-colors" />
            </button>

            <button
              onClick={() => setShowLogoutModal(true)}
              className="bg-white rounded-xl border border-slate-200/80 shadow-soft p-5 flex items-center gap-4 hover:border-red-300 hover:shadow-md transition-all group text-left"
            >
              <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center group-hover:bg-red-50 transition-colors">
                <LogOut className="w-6 h-6 text-slate-500 group-hover:text-red-500 transition-colors" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-slate-900 group-hover:text-red-600 text-sm transition-colors">Sign Out</p>
                <p className="text-xs text-slate-500 mt-0.5">Sign out of your account</p>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-red-400 transition-colors" />
            </button>
          </div>

          {/* Read-only info note */}
          <div className="flex items-start gap-2.5 mt-6 p-3.5 bg-slate-50 rounded-lg border border-slate-200/60">
            <Info className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-slate-500 leading-relaxed">
              Profile information is managed by your administrator. Contact your admin if any details need to be updated.
            </p>
          </div>
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      <Modal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        title="Sign out"
        size="sm"
      >
        <div className="text-center py-4">
          <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <LogOut className="w-6 h-6 text-slate-600" />
          </div>
          <p className="text-slate-600 mb-1">
            Are you sure you want to sign out?
          </p>
          <p className="text-sm text-slate-400">
            You can always sign back in to continue learning.
          </p>
        </div>
        <Modal.Footer>
          <Button
            variant="outline"
            onClick={() => setShowLogoutModal(false)}
            disabled={loggingOut}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleLogout}
            isLoading={loggingOut}
          >
            Sign out
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
