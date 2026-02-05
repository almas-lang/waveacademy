'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Mail,
  Phone,
  Calendar,
  BookOpen,
  UserCheck,
  UserX,
  Key,
  Plus,
  Pencil,
  X,
  Trash2,
  Monitor,
  LogOut,
} from 'lucide-react';
import { AdminHeader } from '@/components/admin';
import { Button, Badge, PageLoading, Modal, Select, getStatusVariant, formatStatus } from '@/components/ui';
import { useLearner, usePrograms, useUpdateLearnerStatus, useResetLearnerPassword, useEnrollLearner, useUpdateLearner, useUnenrollLearner, useLearnerSessions, useLogoutLearnerAllDevices } from '@/hooks';
import { format } from 'date-fns';

export default function LearnerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const learnerId = params.id as string;

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [selectedProgramId, setSelectedProgramId] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', email: '', mobile: '', registrationNumber: '' });
  const [unenrollConfirm, setUnenrollConfirm] = useState<{ programId: string; programName: string } | null>(null);

  const { data, isLoading, refetch } = useLearner(learnerId);
  const { data: programs } = usePrograms();
  const { data: sessions, refetch: refetchSessions } = useLearnerSessions(learnerId);
  const updateStatus = useUpdateLearnerStatus();
  const resetPassword = useResetLearnerPassword();
  const enrollLearner = useEnrollLearner();
  const updateLearner = useUpdateLearner();
  const unenrollLearner = useUnenrollLearner();
  const logoutAllDevices = useLogoutLearnerAllDevices();

  if (isLoading) {
    return (
      <>
        <AdminHeader title="Learner Details" onMenuClick={() => setSidebarOpen(true)} />
        <PageLoading />
      </>
    );
  }

  if (!data) {
    return (
      <>
        <AdminHeader title="Learner Details" onMenuClick={() => setSidebarOpen(true)} />
        <div className="flex-1 p-6 lg:p-8">
          <div className="text-center py-12">
            <p className="text-slate-500">Learner not found</p>
            <Link href="/admin/learners">
              <Button variant="primary" className="mt-4">
                Back to Learners
              </Button>
            </Link>
          </div>
        </div>
      </>
    );
  }

  const { learner, programProgress, recentProgress } = data;

  const handleStatusChange = async (newStatus: 'ACTIVE' | 'INACTIVE') => {
    await updateStatus.mutateAsync({ id: learner.id, status: newStatus });
    refetch();
  };

  const handleResetPassword = async () => {
    await resetPassword.mutateAsync(learner.id);
  };

  const handleEnroll = async () => {
    if (!selectedProgramId) return;
    await enrollLearner.mutateAsync({ learnerId: learner.id, programId: selectedProgramId });
    setShowEnrollModal(false);
    setSelectedProgramId('');
    refetch();
  };

  const handleStartEdit = () => {
    setEditForm({
      name: learner.name,
      email: learner.email,
      mobile: learner.mobile || '',
      registrationNumber: learner.registrationNumber || '',
    });
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    await updateLearner.mutateAsync({
      id: learner.id,
      data: {
        name: editForm.name,
        mobile: editForm.mobile || undefined,
        registrationNumber: editForm.registrationNumber || undefined,
      },
    });
    setIsEditing(false);
    refetch();
  };

  const handleUnenroll = async () => {
    if (!unenrollConfirm) return;
    await unenrollLearner.mutateAsync({ learnerId: learner.id, programId: unenrollConfirm.programId });
    setUnenrollConfirm(null);
    refetch();
  };

  // Get available programs (not already enrolled)
  const enrolledProgramIds = programProgress?.map(p => p.programId) || [];
  const availablePrograms = programs?.filter(
    p => p.isPublished && !enrolledProgramIds.includes(p.id)
  ) || [];

  return (
    <>
      <AdminHeader title="Learner Details" onMenuClick={() => setSidebarOpen(true)} />

      <div className="flex-1 p-6 lg:p-8">
        {/* Back Button */}
        <Link
          href="/admin/learners"
          className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6 font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Learners
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Learner Info Card */}
          <div className="lg:col-span-1">
            <div className="card">
              {/* Header with Edit Button */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-900">Profile</h3>
                {!isEditing && (
                  <button
                    onClick={handleStartEdit}
                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                )}
              </div>

              {isEditing ? (
                /* Edit Mode */
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500/10 focus:border-slate-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={editForm.email}
                      disabled
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 text-slate-500 cursor-not-allowed"
                    />
                    <p className="text-xs text-slate-400 mt-1">Email cannot be changed</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Mobile</label>
                    <input
                      type="tel"
                      value={editForm.mobile}
                      onChange={(e) => setEditForm({ ...editForm, mobile: e.target.value })}
                      placeholder="Enter mobile number"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500/10 focus:border-slate-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Registration Number</label>
                    <input
                      type="text"
                      value={editForm.registrationNumber}
                      onChange={(e) => setEditForm({ ...editForm, registrationNumber: e.target.value })}
                      placeholder="Enter registration number"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500/10 focus:border-slate-500"
                    />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => setIsEditing(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      className="flex-1"
                      onClick={handleSaveEdit}
                      isLoading={updateLearner.isPending}
                    >
                      Save Changes
                    </Button>
                  </div>
                </div>
              ) : (
                /* View Mode */
                <>
                  {/* Avatar */}
                  <div className="flex flex-col items-center mb-6">
                    <div className="w-20 h-20 bg-slate-900 rounded-full flex items-center justify-center mb-4">
                      <span className="text-2xl font-bold text-white">
                        {learner.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <h2 className="text-xl font-semibold text-slate-900">{learner.name}</h2>
                    <Badge variant={getStatusVariant(learner.status)} className="mt-2" dot>
                      {formatStatus(learner.status)}
                    </Badge>
                  </div>

                  {/* Contact Info */}
                  <div className="space-y-3 mb-6">
                    <div className="flex items-center gap-3 text-slate-600">
                      <Mail className="w-4 h-4 text-slate-400" />
                      <span className="text-sm">{learner.email}</span>
                    </div>
                    <div className="flex items-center gap-3 text-slate-600">
                      <Phone className="w-4 h-4 text-slate-400" />
                      <span className="text-sm">{learner.mobile || '—'}</span>
                    </div>
                    <div className="flex items-center gap-3 text-slate-600">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      <span className="text-sm">
                        Joined {format(new Date(learner.createdAt), 'MMM d, yyyy')}
                      </span>
                    </div>
                    {learner.registrationNumber && (
                      <div className="flex items-center gap-3 text-slate-600">
                        <span className="text-sm text-slate-400">Reg #:</span>
                        <span className="text-sm">{learner.registrationNumber}</span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="space-y-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      leftIcon={<Key className="w-4 h-4" />}
                      onClick={handleResetPassword}
                      isLoading={resetPassword.isPending}
                    >
                      Send Password Reset
                    </Button>
                    {learner.status === 'ACTIVE' ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-red-600 border-red-200 hover:bg-red-50"
                        leftIcon={<UserX className="w-4 h-4" />}
                        onClick={() => handleStatusChange('INACTIVE')}
                        isLoading={updateStatus.isPending}
                      >
                        Deactivate Account
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-green-600 border-green-200 hover:bg-green-50"
                        leftIcon={<UserCheck className="w-4 h-4" />}
                        onClick={() => handleStatusChange('ACTIVE')}
                        isLoading={updateStatus.isPending}
                      >
                        Activate Account
                      </Button>
                    )}
                  </div>

                  {/* Active Sessions */}
                  <div className="pt-4 mt-4 border-t border-slate-100">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Monitor className="w-4 h-4 text-slate-400" />
                        <span className="text-sm font-medium text-slate-700">Active Sessions</span>
                      </div>
                      <Badge variant={sessions && sessions.length > 0 ? 'info' : 'neutral'} size="sm">
                        {sessions?.length || 0} device{(sessions?.length || 0) !== 1 ? 's' : ''}
                      </Badge>
                    </div>
                    {sessions && sessions.length > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full mt-2 text-red-600 border-red-200 hover:bg-red-50"
                        leftIcon={<LogOut className="w-4 h-4" />}
                        onClick={async () => {
                          await logoutAllDevices.mutateAsync(learner.id);
                          refetchSessions();
                        }}
                        isLoading={logoutAllDevices.isPending}
                      >
                        Logout All Devices
                      </Button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Progress Section */}
          <div className="lg:col-span-2 space-y-6">
            {/* Program Progress */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900">Program Progress</h3>
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<Plus className="w-4 h-4" />}
                  onClick={() => setShowEnrollModal(true)}
                  disabled={availablePrograms.length === 0}
                  title={availablePrograms.length === 0 ? 'No more programs available' : 'Add to a program'}
                >
                  Add Program
                </Button>
              </div>

              {programProgress && programProgress.length > 0 ? (
                <div className="space-y-4">
                  {programProgress.map((progress) => (
                    <div key={progress.programId} className="border border-slate-200 rounded-lg p-4 group">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <BookOpen className="w-4 h-4 text-accent-500" />
                          <span className="font-medium text-slate-900">{progress.programName}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium text-accent-600">
                            {progress.percentage}%
                          </span>
                          <button
                            onClick={() => setUnenrollConfirm({ programId: progress.programId, programName: progress.programName })}
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                            title="Remove from program"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2">
                        <div
                          className="bg-accent-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${progress.percentage}%` }}
                        />
                      </div>
                      <p className="text-sm text-slate-500 mt-2">
                        {progress.completedLessons} of {progress.totalLessons} lessons completed
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <BookOpen className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                  <p>Not enrolled in any programs</p>
                  <p className="text-sm text-slate-400 mt-1">
                    {availablePrograms.length > 0
                      ? 'Click "Add Program" above to enroll this learner'
                      : 'No published programs available'}
                  </p>
                </div>
              )}
            </div>

            {/* Recent Activity */}
            <div className="card">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Recent Activity</h3>

              {recentProgress && recentProgress.length > 0 ? (
                <div className="space-y-3">
                  {recentProgress.map((activity, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0"
                    >
                      <div>
                        <p className="font-medium text-slate-900">{activity.lessonTitle}</p>
                        <p className="text-sm text-slate-500">
                          {format(new Date(activity.lastAccessed), 'MMM d, yyyy h:mm a')}
                        </p>
                      </div>
                      <Badge
                        variant={activity.status === 'COMPLETED' ? 'success' : 'warning'}
                        size="sm"
                      >
                        {activity.status === 'COMPLETED' ? 'Completed' : 'In Progress'}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <p>No activity yet</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Enroll Modal */}
      <Modal
        isOpen={showEnrollModal}
        onClose={() => setShowEnrollModal(false)}
        title="Enroll in Program"
        size="sm"
      >
        <Select
          label="Select Program"
          options={[
            { value: '', label: 'Choose a program...' },
            ...availablePrograms.map(p => ({ value: p.id, label: p.name })),
          ]}
          value={selectedProgramId}
          onChange={(e) => setSelectedProgramId(e.target.value)}
        />
        <Modal.Footer>
          <Button variant="outline" onClick={() => setShowEnrollModal(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleEnroll}
            disabled={!selectedProgramId}
            isLoading={enrollLearner.isPending}
          >
            Enroll
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Unenroll Confirmation Modal */}
      <Modal
        isOpen={!!unenrollConfirm}
        onClose={() => setUnenrollConfirm(null)}
        title="Remove from Program"
        size="sm"
      >
        <div className="text-center py-4">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Trash2 className="w-6 h-6 text-red-600" />
          </div>
          <p className="text-slate-600">
            Are you sure you want to remove <strong>{learner.name}</strong> from{' '}
            <strong>{unenrollConfirm?.programName}</strong>?
          </p>
          <p className="text-sm text-slate-500 mt-2">
            This will delete all their progress in this program.
          </p>
        </div>
        <Modal.Footer>
          <Button variant="outline" onClick={() => setUnenrollConfirm(null)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleUnenroll}
            isLoading={unenrollLearner.isPending}
          >
            Remove
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
