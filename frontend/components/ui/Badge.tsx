'use client';

import clsx from 'clsx';
import { ReactNode } from 'react';

interface BadgeProps {
  variant?: 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'accent';
  size?: 'sm' | 'md';
  children: ReactNode;
  className?: string;
  dot?: boolean;
}

const variants = {
  success: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20',
  warning: 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20',
  error: 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20',
  info: 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20',
  neutral: 'bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-500/10',
  accent: 'bg-accent-50 text-accent-700 ring-1 ring-inset ring-accent-500/20',
};

const dotColors = {
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  error: 'bg-red-500',
  info: 'bg-blue-500',
  neutral: 'bg-slate-400',
  accent: 'bg-accent-500',
};

const sizes = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm',
};

export default function Badge({
  variant = 'neutral',
  size = 'sm',
  children,
  className,
  dot = false,
}: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 font-medium rounded-full',
        variants[variant],
        sizes[size],
        className
      )}
    >
      {dot && (
        <span className={clsx('w-1.5 h-1.5 rounded-full', dotColors[variant])} />
      )}
      {children}
    </span>
  );
}

// Helper function to get badge variant from status
export function getStatusVariant(status: string): BadgeProps['variant'] {
  switch (status) {
    case 'ACTIVE':
      return 'success';
    case 'INACTIVE':
      return 'error';
    case 'PENDING_SETUP':
      return 'warning';
    case 'published':
      return 'success';
    case 'draft':
      return 'neutral';
    default:
      return 'neutral';
  }
}

// Helper function to format status display
export function formatStatus(status: string): string {
  return status
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (l) => l.toUpperCase());
}
