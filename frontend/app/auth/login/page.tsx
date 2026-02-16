'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, GraduationCap, Shield, AlertTriangle, Monitor, Mail, Lock } from 'lucide-react';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { useFormValidation } from '@/lib/useFormValidation';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);

  const { fields, setValue, setTouched, setError, validateAll } = useFormValidation({
    email: {
      required: 'Email address is required',
      email: 'Please enter a valid email address',
    },
    password: {
      required: 'Password is required',
      minLength: { value: 6, message: 'Password must be at least 6 characters' },
    },
  });

  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [noAdminExists, setNoAdminExists] = useState(false);
  const [showMaxSessionsModal, setShowMaxSessionsModal] = useState(false);
  const [isLoggingOutAll, setIsLoggingOutAll] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    checkAdminExists();
  }, []);

  const checkAdminExists = async () => {
    try {
      const response = await authApi.checkAdminExists();
      if (!response.data.adminExists) {
        setNoAdminExists(true);
      }
    } catch (error) {
      // Silently fail - don't block login
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!validateAll()) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await authApi.login(fields.email.value, fields.password.value);

      if (response.success) {
        login(response.data.user);
        toast.success('Welcome back!');

        // Redirect based on role
        if (response.data.user.role === 'ADMIN') {
          router.push('/admin');
        } else {
          router.push('/learner');
        }
      }
    } catch (error: any) {
      const errorCode = error.response?.data?.error?.code;
      const message = error.response?.data?.error?.message || 'Login failed';

      if (errorCode === 'MAX_SESSIONS_REACHED') {
        setShowMaxSessionsModal(true);
      } else if (errorCode === 'INVALID_CREDENTIALS') {
        setFormError('Invalid email or password. Please try again.');
        setError('password', ' '); // Trigger error state on password field
      } else {
        setFormError(message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogoutAllDevices = async () => {
    setIsLoggingOutAll(true);

    try {
      const response = await authApi.loginForce(fields.email.value, fields.password.value);

      if (response.success) {
        login(response.data.user);
        toast.success('Logged out from other devices. Welcome back!');
        setShowMaxSessionsModal(false);

        if (response.data.user.role === 'ADMIN') {
          router.push('/admin');
        } else {
          router.push('/learner');
        }
      }
    } catch (error: any) {
      const message = error.response?.data?.error?.message || 'Failed to logout other devices';
      toast.error(message);
    } finally {
      setIsLoggingOutAll(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-600 via-primary-500 to-primary-700 relative overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0">
          <div className="absolute top-20 right-20 w-72 h-72 bg-accent-500/20 rounded-full blur-3xl" />
          <div className="absolute bottom-20 left-20 w-96 h-96 bg-primary-400/30 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-white/5 rounded-full blur-2xl" />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center px-12 lg:px-16">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-14 h-14 bg-accent-500 rounded-xl flex items-center justify-center shadow-lg">
              <GraduationCap className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Wave Academy</h1>
              <p className="text-primary-100 text-sm">Powered by Xperience Wave</p>
            </div>
          </div>

          <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6 leading-tight">
            Elevate Your<br />
            <span className="text-accent-400">Learning Journey</span>
          </h2>

          <p className="text-primary-100 text-lg max-w-md leading-relaxed">
            Access your programs, track your progress, and achieve your learning goals with our comprehensive platform.
          </p>

          {/* Stats */}
          <div className="flex gap-8 mt-12">
            <div>
              <p className="text-3xl font-bold text-white">500+</p>
              <p className="text-primary-200 text-sm">Active Learners</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-white">50+</p>
              <p className="text-primary-200 text-sm">Programs</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-white">98%</p>
              <p className="text-primary-200 text-sm">Satisfaction</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Login form */}
      <div className="flex-1 flex items-center justify-center bg-slate-50 px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-md w-full">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center gap-2.5 mb-2">
              <div className="w-10 h-10 bg-accent-500 rounded-lg flex items-center justify-center">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-primary-600">Wave Academy</span>
            </div>
            <p className="text-slate-500 text-sm">Sign in to continue learning</p>
          </div>

          {/* Desktop header */}
          <div className="hidden lg:block mb-8">
            <h2 className="text-2xl font-bold text-slate-900">Welcome back</h2>
            <p className="mt-2 text-slate-500">Sign in to your account to continue</p>
          </div>

          {/* Login Form */}
          <div className="bg-white rounded-2xl shadow-soft border border-slate-200/80 p-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Form-level error */}
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl animate-shake">
                  <p className="text-sm text-red-600 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    {formError}
                  </p>
                </div>
              )}

              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Email address
                </label>
                <div className={`relative ${fields.email.error && fields.email.touched ? 'animate-shake' : ''}`}>
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
                    <Mail className={`w-4 h-4 transition-colors ${fields.email.error && fields.email.touched ? 'text-red-400' : 'text-slate-400'}`} />
                  </div>
                  <input
                    id="email"
                    type="email"
                    value={fields.email.value}
                    onChange={(e) => setValue('email', e.target.value)}
                    onBlur={() => setTouched('email')}
                    aria-invalid={fields.email.error && fields.email.touched ? 'true' : undefined}
                    aria-describedby={fields.email.error && fields.email.touched ? 'email-error' : undefined}
                    className={`w-full pl-10 pr-4 py-3 text-sm bg-slate-50 border rounded-xl
                             placeholder:text-slate-400 text-slate-900
                             focus:outline-none focus:bg-white focus:ring-2
                             transition-all duration-150
                             ${fields.email.error && fields.email.touched
                               ? 'border-red-400 focus:border-red-500 focus:ring-red-100'
                               : 'border-slate-200 focus:border-primary-400 focus:ring-primary-100'
                             }`}
                    placeholder="you@example.com"
                  />
                </div>
                {fields.email.error && fields.email.touched && (
                  <p id="email-error" className="mt-1.5 text-sm text-red-600 animate-slide-down" role="alert">
                    {fields.email.error}
                  </p>
                )}
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Password
                </label>
                <div className={`relative ${fields.password.error && fields.password.touched ? 'animate-shake' : ''}`}>
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
                    <Lock className={`w-4 h-4 transition-colors ${fields.password.error && fields.password.touched ? 'text-red-400' : 'text-slate-400'}`} />
                  </div>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={fields.password.value}
                    onChange={(e) => setValue('password', e.target.value)}
                    onBlur={() => setTouched('password')}
                    aria-invalid={fields.password.error && fields.password.touched ? 'true' : undefined}
                    aria-describedby={fields.password.error && fields.password.touched ? 'password-error' : undefined}
                    className={`w-full pl-10 pr-12 py-3 text-sm bg-slate-50 border rounded-xl
                             placeholder:text-slate-400 text-slate-900
                             focus:outline-none focus:bg-white focus:ring-2
                             transition-all duration-150
                             ${fields.password.error && fields.password.touched
                               ? 'border-red-400 focus:border-red-500 focus:ring-red-100'
                               : 'border-slate-200 focus:border-primary-400 focus:ring-primary-100'
                             }`}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors active:scale-95"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {fields.password.error && fields.password.touched && fields.password.error !== ' ' && (
                  <p id="password-error" className="mt-1.5 text-sm text-red-600 animate-slide-down" role="alert">
                    {fields.password.error}
                  </p>
                )}
              </div>

              {/* Forgot password link */}
              <div className="flex justify-end">
                <Link
                  href="/auth/forgot-password"
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                >
                  Forgot password?
                </Link>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-accent-500 hover:bg-accent-600 active:bg-accent-700 text-white font-medium py-3 px-4 rounded-xl
                         shadow-sm hover:shadow-md active:shadow-sm active:scale-[0.98]
                         transition-all duration-150 ease-out
                         disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-sm disabled:active:scale-100
                         focus:outline-none focus:ring-2 focus:ring-accent-300 focus:ring-offset-2"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Signing in...
                  </span>
                ) : (
                  'Sign In'
                )}
              </button>
            </form>
          </div>

          {/* Admin Setup Notice */}
          {noAdminExists && (
            <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-800">No admin account exists</p>
                  <p className="text-xs text-amber-600 mt-1">
                    Set up your administrator account to get started.
                  </p>
                  <Link
                    href="/auth/admin/setup"
                    className="inline-block mt-2 text-sm font-medium text-amber-700 hover:text-amber-800 underline"
                  >
                    Create Admin Account
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Footer */}
          <p className="mt-6 text-center text-sm text-slate-500">
            Having trouble? Contact{' '}
            <a href="mailto:support@xperiencewave.com" className="text-primary-600 hover:text-primary-700 font-medium">
              support@xperiencewave.com
            </a>
          </p>
        </div>
      </div>

      {/* Max Sessions Modal */}
      {showMaxSessionsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
                <Monitor className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Device Limit Reached</h3>
                <p className="text-sm text-slate-500">Maximum 2 devices allowed</p>
              </div>
            </div>

            <p className="text-slate-600 mb-6">
              You're already logged in on 2 devices. Would you like to logout from all other devices and continue here?
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowMaxSessionsModal(false)}
                className="flex-1 py-2.5 px-4 border border-slate-200 text-slate-700 font-medium rounded-xl hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleLogoutAllDevices}
                disabled={isLoggingOutAll}
                className="flex-1 py-2.5 px-4 bg-accent-500 text-white font-medium rounded-xl hover:bg-accent-600 transition-colors disabled:opacity-50"
              >
                {isLoggingOutAll ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Logging out...
                  </span>
                ) : (
                  'Logout All & Continue'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
