'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Menu, LogOut, User, Search } from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import NotificationDropdown from './NotificationDropdown';

interface LearnerHeaderProps {
  title: string;
  subtitle?: string;
  onMenuClick?: () => void;
}

export default function LearnerHeader({ title, subtitle, onMenuClick }: LearnerHeaderProps) {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleLogout = () => {
    logout();
    router.push('/auth/login');
  };

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
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-slate-200/80">
        <div className="flex items-center justify-between h-16 px-4 lg:px-6">
          {/* Left: Menu button (mobile) + Title */}
          <div className="flex items-center gap-4">
            <button
              onClick={onMenuClick}
              aria-label="Open navigation menu"
              className="lg:hidden p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-slate-300"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-lg font-semibold text-slate-900 tracking-tight">
                {title}
              </h1>
              {subtitle && (
                <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
              )}
            </div>
          </div>

          {/* Center: Search (desktop only) */}
          <div className="hidden lg:flex flex-1 max-w-md mx-8">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search courses, lessons..."
                className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg
                         placeholder:text-slate-400 text-slate-700
                         focus:outline-none focus:bg-white focus:border-slate-300 focus:ring-2 focus:ring-slate-500/10
                         transition-all duration-150"
              />
            </div>
          </div>

          {/* Right: Notifications + User info + Logout */}
          <div className="flex items-center gap-2">
            {/* Notifications */}
            <NotificationDropdown />

            {/* Divider */}
            <div className="hidden sm:block w-px h-6 bg-slate-200 mx-2" />

            {/* User info */}
            <div className="hidden sm:flex items-center gap-3">
              <div className="w-8 h-8 bg-accent-500 rounded-lg flex items-center justify-center shadow-sm">
                <span className="text-white text-xs font-semibold">
                  {user?.name ? getInitials(user.name) : 'LR'}
                </span>
              </div>
              <div className="hidden md:block">
                <p className="text-sm font-medium text-slate-900 leading-tight">
                  {user?.name || 'Learner'}
                </p>
                <p className="text-xs text-slate-500">Student</p>
              </div>
            </div>

            {/* Logout button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowLogoutConfirm(true)}
              className="ml-1 text-slate-600 hover:text-slate-900"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline ml-2">Logout</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Logout confirmation modal */}
      <Modal
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
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
            onClick={() => setShowLogoutConfirm(false)}
          >
            Cancel
          </Button>
          <Button variant="primary" onClick={handleLogout}>
            Sign out
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
