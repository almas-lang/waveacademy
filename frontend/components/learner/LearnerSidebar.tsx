'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  BookOpen,
  Calendar,
  User,
  X,
  ChevronsLeft,
  ChevronsRight,
  GraduationCap,
} from 'lucide-react';
import clsx from 'clsx';

interface LearnerSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

const navItems = [
  { href: '/learner', icon: Home, label: 'Home' },
  { href: '/learner/programs', icon: BookOpen, label: 'My Programs' },
  { href: '/learner/sessions', icon: Calendar, label: 'Sessions' },
  { href: '/learner/profile', icon: User, label: 'Profile' },
];

const COLLAPSED_KEY = 'learner-sidebar-collapsed';

export default function LearnerSidebar({ isOpen, onClose }: LearnerSidebarProps) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Load collapsed state from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(COLLAPSED_KEY);
    if (stored === 'true') {
      setIsCollapsed(true);
    }
  }, []);

  // Save collapsed state to localStorage
  const toggleCollapsed = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem(COLLAPSED_KEY, String(newState));
  };

  const isActive = (href: string) => {
    if (href === '/learner') {
      return pathname === '/learner';
    }
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-primary-900/60 backdrop-blur-sm z-40 lg:hidden animate-fade-in"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={clsx(
          'fixed lg:relative inset-y-0 left-0 z-50',
          'bg-primary-500',
          'transform transition-all duration-300 ease-out lg:transform-none',
          'flex flex-col flex-shrink-0',
          'h-screen',
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
          isCollapsed ? 'w-20' : 'w-64'
        )}
      >
        {/* Header with Logo and Collapse Toggle */}
        <div className={clsx(
          'flex items-center h-16 border-b border-primary-400/30 flex-shrink-0',
          isCollapsed ? 'justify-center px-2' : 'justify-between px-5'
        )}>
          <Link href="/learner" className="flex items-center gap-2.5 group">
            <div className="relative flex-shrink-0">
              <div className="w-9 h-9 bg-accent-500 rounded-lg flex items-center justify-center shadow-sm">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
            </div>
            {!isCollapsed && (
              <div className="flex flex-col">
                <span className="font-semibold text-white text-sm leading-tight">
                  XperienceWave
                </span>
                <span className="text-[10px] text-primary-100 font-medium tracking-wide uppercase">
                  Learning Portal
                </span>
              </div>
            )}
          </Link>

          {/* Collapse Toggle - Desktop */}
          {!isCollapsed && (
            <button
              onClick={toggleCollapsed}
              aria-label="Collapse sidebar"
              className="hidden lg:flex p-1.5 text-white hover:text-white hover:bg-primary-600 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-white/50"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>
          )}

          {/* Close button - Mobile */}
          {!isCollapsed && (
            <button
              onClick={onClose}
              aria-label="Close sidebar"
              className="lg:hidden p-1.5 text-white hover:text-white hover:bg-primary-600 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-white/50"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Expand button when collapsed */}
        {isCollapsed && (
          <div className="hidden lg:flex justify-center py-3 border-b border-primary-400/30 flex-shrink-0">
            <button
              onClick={toggleCollapsed}
              aria-label="Expand sidebar"
              className="p-2 text-white hover:text-white hover:bg-primary-600 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-white/50"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Navigation */}
        <nav className="px-3 py-5 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                title={isCollapsed ? item.label : undefined}
                aria-current={active ? 'page' : undefined}
                className={clsx(
                  'flex items-center rounded-lg',
                  'text-sm font-medium transition-all duration-150',
                  'focus:outline-none focus:ring-2 focus:ring-white/50',
                  isCollapsed ? 'justify-center p-3' : 'gap-3 px-3 py-2.5',
                  active
                    ? 'bg-accent-500 text-white shadow-sm'
                    : 'text-white hover:bg-primary-600 hover:text-white'
                )}
              >
                <Icon className={clsx('w-5 h-5 flex-shrink-0', active ? 'text-white' : 'text-white/80')} />
                {!isCollapsed && (
                  <>
                    <span>{item.label}</span>
                    {active && (
                      <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white" />
                    )}
                  </>
                )}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
