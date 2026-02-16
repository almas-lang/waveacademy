'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { GraduationCap, Mail, ArrowLeft, CheckCircle, AlertTriangle } from 'lucide-react';
import { authApi } from '@/lib/api';
import { useFormValidation } from '@/lib/useFormValidation';
import toast from 'react-hot-toast';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const { fields, setValue, setTouched, validateAll } = useFormValidation({
    email: {
      required: 'Email address is required',
      email: 'Please enter a valid email address',
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!validateAll()) {
      return;
    }

    setIsLoading(true);

    try {
      await authApi.forgotPassword(fields.email.value);
      setIsSubmitted(true);
    } catch (error: any) {
      const errorCode = error.response?.data?.error?.code;
      const message = error.response?.data?.error?.message || 'Something went wrong';

      if (errorCode === 'USER_NOT_FOUND') {
        setFormError('No account found with this email address.');
      } else {
        setFormError(message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="max-w-md w-full animate-fade-in">
          <div className="bg-white rounded-2xl shadow-soft border border-slate-200/80 p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-scale-in">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">Check Your Email</h2>
            <p className="text-slate-600 mb-6">
              If an account exists with <strong>{fields.email.value}</strong>, you'll receive a password reset link shortly.
            </p>
            <div className="space-y-3">
              <button
                onClick={() => setIsSubmitted(false)}
                className="w-full py-3 px-4 border border-slate-200 text-slate-700 font-medium rounded-xl
                         hover:bg-slate-50 active:bg-slate-100 active:scale-[0.98]
                         transition-all duration-150"
              >
                Try Different Email
              </button>
              <Link
                href="/auth/login"
                className="block w-full py-3 px-4 bg-primary-600 text-white font-medium rounded-xl
                         hover:bg-primary-700 active:bg-primary-800 active:scale-[0.98]
                         transition-all duration-150 text-center"
              >
                Back to Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2.5 mb-2">
            <div className="w-10 h-10 bg-accent-500 rounded-lg flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-primary-600">Wave Academy</span>
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-soft border border-slate-200/80 p-8">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-slate-900">Forgot Password?</h2>
            <p className="mt-1 text-sm text-slate-500">
              Enter your email and we'll send you a reset link
            </p>
          </div>

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

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">
                Email address
              </label>
              <div className={`relative ${fields.email.error && fields.email.touched ? 'animate-shake' : ''}`}>
                <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
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

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-accent-500 hover:bg-accent-600 active:bg-accent-700 text-white font-medium py-3 px-4 rounded-xl
                       shadow-sm hover:shadow-md active:shadow-sm active:scale-[0.98]
                       transition-all duration-150 ease-out
                       disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100
                       focus:outline-none focus:ring-2 focus:ring-accent-300 focus:ring-offset-2"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Sending...
                </span>
              ) : (
                'Send Reset Link'
              )}
            </button>
          </form>
        </div>

        {/* Back to login */}
        <Link
          href="/auth/login"
          className="flex items-center justify-center gap-2 mt-6 text-sm text-slate-500 hover:text-slate-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Login
        </Link>
      </div>
    </div>
  );
}
