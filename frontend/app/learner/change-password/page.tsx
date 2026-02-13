'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, KeyRound, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { LearnerHeader } from '@/components/learner';
import { useSidebar } from '@/lib/sidebar-context';
import { Button, Input } from '@/components/ui';
import { authApi } from '@/lib/api';
import toast from 'react-hot-toast';

export default function ChangePasswordPage() {
  const router = useRouter();
  const { openSidebar } = useSidebar();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = () => {
    const errors: Record<string, string> = {};
    if (!currentPassword) errors.currentPassword = 'Current password is required';
    if (!newPassword) errors.newPassword = 'New password is required';
    if (!confirmPassword) errors.confirmPassword = 'Please confirm your new password';
    if (newPassword && confirmPassword && newPassword !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await authApi.changePassword(currentPassword, newPassword, confirmPassword);
      toast.success('Password changed successfully');
      router.push('/learner/profile');
    } catch (err: any) {
      const message = err.response?.data?.error?.message || 'Failed to change password. Please try again.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <LearnerHeader
        title="Change Password"
        subtitle="Update your account password"
        onMenuClick={openSidebar}
      />

      <div className="flex-1 p-6 lg:p-8">
        <div className="max-w-lg mx-auto">
          {/* Back link */}
          <button
            onClick={() => router.push('/learner/profile')}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Profile
          </button>

          <div className="bg-white rounded-xl border border-slate-200/80 shadow-soft overflow-hidden">
            {/* Security badge header */}
            <div className="bg-gradient-to-r from-primary-50 via-primary-50/50 to-emerald-50 px-6 py-5 border-b border-slate-100">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center border border-primary-100">
                  <ShieldCheck className="w-6 h-6 text-primary-600" />
                </div>
                <div>
                  <h2 className="font-semibold text-slate-900">Change Password</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Keep your account secure with a strong password
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6">
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  label="Current Password"
                  type={showCurrent ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => { setCurrentPassword(e.target.value); setFieldErrors((p) => ({ ...p, currentPassword: '' })); }}
                  error={fieldErrors.currentPassword}
                  placeholder="Enter your current password"
                  rightIcon={
                    <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="text-slate-400 hover:text-slate-600" tabIndex={-1}>
                      {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  }
                />

                <div className="border-t border-dashed border-slate-200 my-1" />

                <Input
                  label="New Password"
                  type={showNew ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => { setNewPassword(e.target.value); setFieldErrors((p) => ({ ...p, newPassword: '' })); }}
                  error={fieldErrors.newPassword}
                  placeholder="Enter your new password"
                  rightIcon={
                    <button type="button" onClick={() => setShowNew(!showNew)} className="text-slate-400 hover:text-slate-600" tabIndex={-1}>
                      {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  }
                />

                <Input
                  label="Confirm New Password"
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); setFieldErrors((p) => ({ ...p, confirmPassword: '' })); }}
                  error={fieldErrors.confirmPassword}
                  placeholder="Confirm your new password"
                  rightIcon={
                    <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="text-slate-400 hover:text-slate-600" tabIndex={-1}>
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  }
                />

                <div className="flex items-center gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push('/learner/profile')}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    isLoading={isSubmitting}
                    disabled={isSubmitting}
                  >
                    Update Password
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
