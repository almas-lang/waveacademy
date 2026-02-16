'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, GraduationCap, User, Mail, Phone, Lock, BookOpen } from 'lucide-react';
import { authApi, publicApi } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import toast from 'react-hot-toast';

interface ProgramInfo {
  id: string;
  name: string;
  description?: string;
  thumbnailUrl?: string;
  price?: string | number | null;
  currency?: string;
  totalLessons: number;
  freeLessons: number;
}

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const programSlug = searchParams.get('program');
  const login = useAuthStore((state) => state.login);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [program, setProgram] = useState<ProgramInfo | null>(null);
  const [loadingProgram, setLoadingProgram] = useState(!!programSlug);

  // Fetch program info if slug is provided
  useEffect(() => {
    if (programSlug) {
      setLoadingProgram(true);
      publicApi.getProgram(programSlug)
        .then((res) => {
          setProgram(res.data.program);
        })
        .catch(() => {
          toast.error('Program not found');
        })
        .finally(() => setLoadingProgram(false));
    }
  }, [programSlug]);

  const validate = (): string | null => {
    if (!name.trim()) return 'Name is required';
    if (!email.trim()) return 'Email is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Please enter a valid email';
    if (phone && !/^\d{10}$/.test(phone)) return 'Phone must be 10 digits';
    if (!password) return 'Password is required';
    if (password.length < 8) return 'Password must be at least 8 characters';
    if (!/[A-Z]/.test(password)) return 'Password must contain an uppercase letter';
    if (!/[a-z]/.test(password)) return 'Password must contain a lowercase letter';
    if (!/[0-9]/.test(password)) return 'Password must contain a number';
    if (!/[^A-Za-z0-9]/.test(password)) return 'Password must contain a special character';
    if (password !== confirmPassword) return 'Passwords do not match';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const error = validate();
    if (error) {
      setFormError(error);
      return;
    }

    setIsLoading(true);
    try {
      const response = await authApi.register({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone || undefined,
        password,
        confirmPassword,
        programSlug: programSlug || undefined,
      });

      // Set auth store
      login(response.data.user);

      toast.success('Account created successfully!');

      // Redirect to program page or learner home
      if (response.data.programId) {
        router.push(`/learner/programs/${response.data.programId}`);
      } else {
        router.push('/learner');
      }
    } catch (error: any) {
      const errData = error.response?.data?.error;
      if (errData?.code === 'EMAIL_EXISTS') {
        setFormError('An account with this email already exists.');
      } else {
        setFormError(errData?.message || 'Registration failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-accent-50 flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-5/12 bg-gradient-to-br from-accent-600 to-accent-800 p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -top-20 -left-20 w-96 h-96 rounded-full bg-white/20" />
          <div className="absolute -bottom-32 -right-32 w-[500px] h-[500px] rounded-full bg-white/10" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
              <GraduationCap className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">Wave Academy</h1>
          </div>
          <h2 className="text-3xl font-bold text-white leading-tight mb-4">
            Start your learning journey
          </h2>
          <p className="text-accent-100 text-lg leading-relaxed">
            Create your free account and get instant access to preview lessons. Upgrade anytime to unlock the full program.
          </p>
        </div>
        {program && (
          <div className="relative z-10 bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <div className="flex items-center gap-3 mb-3">
              <BookOpen className="w-5 h-5 text-white" />
              <span className="text-white/80 text-sm font-medium">You&apos;re signing up for</span>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">{program.name}</h3>
            <div className="flex items-center gap-4 text-accent-100 text-sm">
              <span>{program.totalLessons} lessons</span>
              <span>{program.freeLessons} free to preview</span>
              {program.price && Number(program.price) > 0 && (
                <span className="bg-white/20 px-2 py-0.5 rounded-full font-medium">
                  Full program: {program.currency === 'INR' ? '\u20B9' : '$'}{program.price}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-accent-600 rounded-xl flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">Wave Academy</h1>
          </div>

          <h2 className="text-2xl font-bold text-slate-900 mb-2">Create your account</h2>
          <p className="text-slate-500 mb-8">
            {program
              ? `Sign up to start learning ${program.name}`
              : 'Get started with Wave Academy'
            }
          </p>

          {loadingProgram && (
            <div className="mb-6 p-4 bg-slate-50 rounded-lg border border-slate-200 animate-pulse">
              <div className="h-4 bg-slate-200 rounded w-2/3" />
            </div>
          )}

          {formError && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{formError}</p>
              {formError.includes('already exists') && (
                <Link href="/auth/login" className="text-sm text-red-700 underline font-medium mt-1 inline-block">
                  Go to login
                </Link>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your full name"
                  className="input pl-10"
                  required
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="input pl-10"
                  required
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Phone <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="10-digit mobile number"
                  className="input pl-10"
                  maxLength={10}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 8 chars, uppercase, number, special"
                  className="input pl-10 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your password"
                  className="input pl-10"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-accent-600 hover:bg-accent-700 text-white font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating account...
                </span>
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-accent-600 hover:text-accent-700 font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
