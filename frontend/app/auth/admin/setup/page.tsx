'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, GraduationCap, Shield, Mail, Lock, User, AlertTriangle, Check } from 'lucide-react';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { useFormValidation } from '@/lib/useFormValidation';
import toast from 'react-hot-toast';

export default function AdminSetupPage() {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);

  const { fields, setValue, setTouched, setError: setFieldError, validateAll } = useFormValidation({
    name: {},
    email: {
      required: 'Email address is required',
      email: 'Please enter a valid email address',
    },
    password: {
      required: 'Password is required',
      minLength: { value: 8, message: 'Password must be at least 8 characters' },
    },
    confirmPassword: {
      required: 'Please confirm your password',
    },
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [adminExists, setAdminExists] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Password strength
  const passwordChecks = {
    length: fields.password.value.length >= 8,
    hasNumber: /\d/.test(fields.password.value),
    hasLetter: /[a-zA-Z]/.test(fields.password.value),
  };
  const passwordStrength = Object.values(passwordChecks).filter(Boolean).length;

  useEffect(() => {
    checkAdminExists();
  }, []);

  const checkAdminExists = async () => {
    try {
      const response = await authApi.checkAdminExists();
      if (response.data.adminExists) {
        setAdminExists(true);
      }
    } catch (error) {
      console.error('Failed to check admin status:', error);
    } finally {
      setIsChecking(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!validateAll()) {
      return;
    }

    if (fields.password.value !== fields.confirmPassword.value) {
      setFieldError('confirmPassword', 'Passwords do not match');
      return;
    }

    setIsLoading(true);

    try {
      const response = await authApi.setupAdmin(
        fields.email.value,
        fields.password.value,
        fields.confirmPassword.value,
        fields.name.value
      );

      if (response.success) {
        login(response.data.user);
        toast.success('Admin account created successfully!');
        router.push('/admin');
      }
    } catch (error: any) {
      const message = error.response?.data?.error?.message || 'Failed to create admin account';
      setFormError(message);
    } finally {
      setIsLoading(false);
    }
  };

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (adminExists) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="max-w-md w-full text-center animate-fade-in">
          <div className="bg-white rounded-2xl shadow-soft border border-slate-200/80 p-8">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-scale-in">
              <Shield className="w-8 h-8 text-amber-600" />
            </div>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">Admin Already Exists</h2>
            <p className="text-slate-600 mb-6">
              An admin account has already been set up. Please login with your credentials.
            </p>
            <button
              onClick={() => router.push('/auth/login')}
              className="w-full bg-primary-600 hover:bg-primary-700 active:bg-primary-800 text-white font-medium py-3 px-4 rounded-xl
                       active:scale-[0.98] transition-all duration-150"
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-600 via-primary-500 to-primary-700 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-20 right-20 w-72 h-72 bg-accent-500/20 rounded-full blur-3xl" />
          <div className="absolute bottom-20 left-20 w-96 h-96 bg-primary-400/30 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 flex flex-col justify-center px-12 lg:px-16">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-14 h-14 bg-accent-500 rounded-xl flex items-center justify-center shadow-lg">
              <GraduationCap className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">XperienceWave</h1>
              <p className="text-primary-100 text-sm">Learning Management System</p>
            </div>
          </div>

          <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6 leading-tight">
            Welcome to<br />
            <span className="text-accent-400">Admin Setup</span>
          </h2>

          <p className="text-primary-100 text-lg max-w-md leading-relaxed">
            Create your administrator account to start managing your learning platform.
          </p>
        </div>
      </div>

      {/* Right side - Setup form */}
      <div className="flex-1 flex items-center justify-center bg-slate-50 px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-md w-full">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center gap-2.5 mb-2">
              <div className="w-10 h-10 bg-accent-500 rounded-lg flex items-center justify-center">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-primary-600">XperienceWave</span>
            </div>
            <p className="text-slate-500 text-sm">Create your admin account</p>
          </div>

          {/* Desktop header */}
          <div className="hidden lg:block mb-8">
            <h2 className="text-2xl font-bold text-slate-900">Create Admin Account</h2>
            <p className="mt-2 text-slate-500">Set up your administrator credentials</p>
          </div>

          {/* Setup Form */}
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

              {/* Name (optional) */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Name <span className="text-slate-400">(optional)</span>
                </label>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
                    <User className="w-4 h-4 text-slate-400" />
                  </div>
                  <input
                    id="name"
                    type="text"
                    value={fields.name.value}
                    onChange={(e) => setValue('name', e.target.value)}
                    className="w-full pl-10 pr-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl
                             placeholder:text-slate-400 text-slate-900
                             focus:outline-none focus:bg-white focus:border-primary-400 focus:ring-2 focus:ring-primary-100
                             transition-all duration-150"
                    placeholder="Admin"
                  />
                </div>
              </div>

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
                    className={`w-full pl-10 pr-4 py-3 text-sm bg-slate-50 border rounded-xl
                             placeholder:text-slate-400 text-slate-900
                             focus:outline-none focus:bg-white focus:ring-2
                             transition-all duration-150
                             ${fields.email.error && fields.email.touched
                               ? 'border-red-400 focus:border-red-500 focus:ring-red-100'
                               : 'border-slate-200 focus:border-primary-400 focus:ring-primary-100'
                             }`}
                    placeholder="admin@example.com"
                  />
                </div>
                {fields.email.error && fields.email.touched && (
                  <p className="mt-1.5 text-sm text-red-600 animate-slide-down" role="alert">
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
                    className={`w-full pl-10 pr-12 py-3 text-sm bg-slate-50 border rounded-xl
                             placeholder:text-slate-400 text-slate-900
                             focus:outline-none focus:bg-white focus:ring-2
                             transition-all duration-150
                             ${fields.password.error && fields.password.touched
                               ? 'border-red-400 focus:border-red-500 focus:ring-red-100'
                               : 'border-slate-200 focus:border-primary-400 focus:ring-primary-100'
                             }`}
                    placeholder="Min. 8 characters"
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
                {fields.password.error && fields.password.touched && (
                  <p className="mt-1.5 text-sm text-red-600 animate-slide-down" role="alert">
                    {fields.password.error}
                  </p>
                )}
                {/* Password strength indicator */}
                {fields.password.value && (
                  <div className="mt-2 space-y-2 animate-slide-down">
                    <div className="flex gap-1">
                      {[1, 2, 3].map((level) => (
                        <div
                          key={level}
                          className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                            passwordStrength >= level
                              ? passwordStrength === 1 ? 'bg-red-400'
                              : passwordStrength === 2 ? 'bg-yellow-400'
                              : 'bg-green-400'
                              : 'bg-slate-200'
                          }`}
                        />
                      ))}
                    </div>
                    <div className="flex flex-col gap-1 text-xs">
                      <span className={`flex items-center gap-1.5 transition-colors ${passwordChecks.length ? 'text-green-600' : 'text-slate-400'}`}>
                        <Check className={`w-3 h-3 ${passwordChecks.length ? 'opacity-100' : 'opacity-40'}`} />
                        At least 8 characters
                      </span>
                      <span className={`flex items-center gap-1.5 transition-colors ${passwordChecks.hasLetter ? 'text-green-600' : 'text-slate-400'}`}>
                        <Check className={`w-3 h-3 ${passwordChecks.hasLetter ? 'opacity-100' : 'opacity-40'}`} />
                        Contains a letter
                      </span>
                      <span className={`flex items-center gap-1.5 transition-colors ${passwordChecks.hasNumber ? 'text-green-600' : 'text-slate-400'}`}>
                        <Check className={`w-3 h-3 ${passwordChecks.hasNumber ? 'opacity-100' : 'opacity-40'}`} />
                        Contains a number
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Confirm Password
                </label>
                <div className={`relative ${fields.confirmPassword.error && fields.confirmPassword.touched ? 'animate-shake' : ''}`}>
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
                    <Lock className={`w-4 h-4 transition-colors ${fields.confirmPassword.error && fields.confirmPassword.touched ? 'text-red-400' : 'text-slate-400'}`} />
                  </div>
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={fields.confirmPassword.value}
                    onChange={(e) => setValue('confirmPassword', e.target.value)}
                    onBlur={() => setTouched('confirmPassword')}
                    aria-invalid={fields.confirmPassword.error && fields.confirmPassword.touched ? 'true' : undefined}
                    className={`w-full pl-10 pr-12 py-3 text-sm bg-slate-50 border rounded-xl
                             placeholder:text-slate-400 text-slate-900
                             focus:outline-none focus:bg-white focus:ring-2
                             transition-all duration-150
                             ${fields.confirmPassword.error && fields.confirmPassword.touched
                               ? 'border-red-400 focus:border-red-500 focus:ring-red-100'
                               : fields.confirmPassword.value && fields.confirmPassword.value === fields.password.value
                                 ? 'border-green-400 focus:border-green-500 focus:ring-green-100'
                                 : 'border-slate-200 focus:border-primary-400 focus:ring-primary-100'
                             }`}
                    placeholder="Re-enter password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors active:scale-95"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {fields.confirmPassword.error && fields.confirmPassword.touched && (
                  <p className="mt-1.5 text-sm text-red-600 animate-slide-down" role="alert">
                    {fields.confirmPassword.error}
                  </p>
                )}
                {fields.confirmPassword.value && fields.confirmPassword.value === fields.password.value && !fields.confirmPassword.error && (
                  <p className="mt-1.5 text-sm text-green-600 flex items-center gap-1.5 animate-slide-down">
                    <Check className="w-3.5 h-3.5" />
                    Passwords match
                  </p>
                )}
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
                    Creating Account...
                  </span>
                ) : (
                  'Create Admin Account'
                )}
              </button>
            </form>
          </div>

          {/* Login link */}
          <p className="mt-6 text-center text-sm text-slate-500">
            Already have an account?{' '}
            <button
              onClick={() => router.push('/auth/login')}
              className="text-primary-600 hover:text-primary-700 font-medium transition-colors"
            >
              Sign in
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
